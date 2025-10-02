interface CacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 50 * 1024 * 1024; // 50MB
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private currentSize = 0;

  async get(url: string): Promise<string | null> {
    const entry = this.cache.get(url);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(url);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return URL.createObjectURL(entry.blob);
  }

  async set(url: string, blob: Blob): Promise<void> {
    // Check if we need to make space
    const blobSize = blob.size;
    if (this.currentSize + blobSize > this.maxSize) {
      this.evictLeastUsed(blobSize);
    }

    const entry: CacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(url, entry);
    this.currentSize += blobSize;
  }

  delete(url: string): boolean {
    const entry = this.cache.get(url);
    if (entry) {
      this.currentSize -= entry.blob.size;
      return this.cache.delete(url);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  private evictLeastUsed(requiredSpace: number): void {
    // Sort entries by access frequency and last accessed time
    const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
      const scoreA = a.accessCount / Math.max(1, (Date.now() - a.lastAccessed) / 1000);
      const scoreB = b.accessCount / Math.max(1, (Date.now() - b.lastAccessed) / 1000);
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    for (const [url, entry] of entries) {
      this.delete(url);
      freedSpace += entry.blob.size;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }

  getStats() {
    return {
      size: this.currentSize,
      count: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

export const imageCache = new ImageCache();

export const loadImageWithCache = async (url: string): Promise<string> => {
  // Try to get from cache first
  const cachedUrl = await imageCache.get(url);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Fetch and cache the image
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    await imageCache.set(url, blob);
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to load image:', error);
    throw error;
  }
};