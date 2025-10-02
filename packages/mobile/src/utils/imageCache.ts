import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

interface CacheEntry {
  url: string;
  localPath: string;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

class MobileImageCache {
  private cacheDir: string;
  private maxSize = 100 * 1024 * 1024; // 100MB
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private cacheIndex = new Map<string, CacheEntry>();
  private initialized = false;

  constructor() {
    this.cacheDir = `${RNFS.CachesDirectoryPath}/images`;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create cache directory if it doesn't exist
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // Load cache index from AsyncStorage
      const indexData = await AsyncStorage.getItem('imageCache_index');
      if (indexData) {
        const entries = JSON.parse(indexData) as CacheEntry[];
        for (const entry of entries) {
          this.cacheIndex.set(entry.url, entry);
        }
      }

      // Clean up expired entries
      await this.cleanupExpired();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  async get(url: string): Promise<string | null> {
    await this.initialize();

    const entry = this.cacheIndex.get(url);
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      await this.delete(url);
      return null;
    }

    // Check if file still exists
    const exists = await RNFS.exists(entry.localPath);
    if (!exists) {
      await this.delete(url);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    await this.saveIndex();

    return Platform.OS === 'android' ? `file://${entry.localPath}` : entry.localPath;
  }

  async set(url: string, imageData: string): Promise<string | null> {
    await this.initialize();

    try {
      const fileName = this.generateFileName(url);
      const localPath = `${this.cacheDir}/${fileName}`;

      // Download and save the image
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download failed with status ${downloadResult.statusCode}`);
      }

      const stat = await RNFS.stat(localPath);
      const fileSize = stat.size;

      // Check if we need to make space
      await this.ensureSpace(fileSize);

      const entry: CacheEntry = {
        url,
        localPath,
        timestamp: Date.now(),
        size: fileSize,
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      this.cacheIndex.set(url, entry);
      await this.saveIndex();

      return Platform.OS === 'android' ? `file://${localPath}` : localPath;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return null;
    }
  }

  async delete(url: string): Promise<boolean> {
    const entry = this.cacheIndex.get(url);
    if (!entry) {
      return false;
    }

    try {
      const exists = await RNFS.exists(entry.localPath);
      if (exists) {
        await RNFS.unlink(entry.localPath);
      }
      
      this.cacheIndex.delete(url);
      await this.saveIndex();
      return true;
    } catch (error) {
      console.error('Failed to delete cached image:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.cacheDir);
      if (exists) {
        await RNFS.unlink(this.cacheDir);
        await RNFS.mkdir(this.cacheDir);
      }
      
      this.cacheIndex.clear();
      await AsyncStorage.removeItem('imageCache_index');
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  private generateFileName(url: string): string {
    // Create a hash-like filename from URL
    const hash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
    return `${Math.abs(hash)}.${extension}`;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = Array.from(this.cacheIndex.values())
      .reduce((total, entry) => total + entry.size, 0);

    if (currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // Sort entries by access frequency and last accessed time
    const entries = Array.from(this.cacheIndex.entries()).sort(([, a], [, b]) => {
      const scoreA = a.accessCount / Math.max(1, (Date.now() - a.lastAccessed) / 1000);
      const scoreB = b.accessCount / Math.max(1, (Date.now() - b.lastAccessed) / 1000);
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    for (const [url] of entries) {
      const entry = this.cacheIndex.get(url);
      if (entry) {
        await this.delete(url);
        freedSpace += entry.size;
        
        if (freedSpace >= requiredSize) {
          break;
        }
      }
    }
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredUrls: string[] = [];

    for (const [url, entry] of this.cacheIndex.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        expiredUrls.push(url);
      }
    }

    for (const url of expiredUrls) {
      await this.delete(url);
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      const entries = Array.from(this.cacheIndex.values());
      await AsyncStorage.setItem('imageCache_index', JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  async getStats() {
    await this.initialize();
    
    const size = Array.from(this.cacheIndex.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    return {
      size,
      count: this.cacheIndex.size,
      maxSize: this.maxSize,
    };
  }
}

export const mobileImageCache = new MobileImageCache();

export const loadImageWithCache = async (url: string): Promise<string> => {
  // Try to get from cache first
  const cachedPath = await mobileImageCache.get(url);
  if (cachedPath) {
    return cachedPath;
  }

  // Cache the image and return the local path
  const localPath = await mobileImageCache.set(url, url);
  return localPath || url; // Fallback to original URL if caching fails
};