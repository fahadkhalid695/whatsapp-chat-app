import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { socketService } from './socket';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface DeviceSession {
  id: string;
  userId: string;
  deviceId: string;
  platform: 'web' | 'mobile';
  userAgent?: string;
  appVersion?: string;
  isActive: boolean;
  lastActivity: Date;
  lastSync?: Date;
  createdAt: Date;
}

export interface SyncData {
  conversations: any[];
  syncTimestamp: Date;
  hasMore: boolean;
}

export interface ConversationSyncData {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  admins?: string[];
  lastActivity: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: any[];
  unreadCount: number;
}

class SyncService {
  private deviceId: string | null = null;
  private lastSyncTimestamp?: Date;

  constructor() {
    this.initializeDeviceId();
    this.setupSyncEventHandlers();
  }

  private async initializeDeviceId(): Promise<void> {
    this.deviceId = await this.getOrCreateDeviceId();
  }

  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      const uniqueId = await DeviceInfo.getUniqueId();
      deviceId = `mobile-${Platform.OS}-${uniqueId}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private setupSyncEventHandlers(): void {
    // Listen for sync events from socket
    socketService.on('profile-sync', (data: any) => {
      this.handleProfileSync(data);
    });

    socketService.on('read-receipts-sync', (data: any) => {
      this.handleReadReceiptsSync(data);
    });

    socketService.on('offline-message-delivery', (data: any) => {
      this.handleOfflineMessageDelivery(data);
    });

    socketService.on('contact-profile-updated', (data: any) => {
      this.handleContactProfileUpdate(data);
    });
  }

  /**
   * Register this device session
   */
  async registerDevice(): Promise<void> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const deviceInfo = {
        deviceId: this.deviceId!,
        platform: 'mobile' as const,
        userAgent: await DeviceInfo.getUserAgent(),
        appVersion: DeviceInfo.getVersion(),
      };

      const response = await api.post('/sync/device-session', deviceInfo);
      
      // Emit device registration to socket for real-time sync
      socketService.emit('register-device', deviceInfo);

      console.log('Device registered successfully:', response.data);
    } catch (error) {
      console.error('Failed to register device:', error);
    }
  }

  /**
   * Sync conversation history
   */
  async syncConversationHistory(lastSyncTimestamp?: Date): Promise<SyncData> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.post('/sync/conversations', {
        deviceId: this.deviceId,
        lastSyncTimestamp: lastSyncTimestamp || this.lastSyncTimestamp,
      });

      this.lastSyncTimestamp = new Date(response.data.syncTimestamp);
      return response.data;
    } catch (error) {
      console.error('Failed to sync conversation history:', error);
      throw error;
    }
  }

  /**
   * Sync read receipts across devices
   */
  async syncReadReceipts(messageIds: string[]): Promise<void> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      await api.post('/sync/read-receipts', {
        messageIds,
        deviceId: this.deviceId,
      });
    } catch (error) {
      console.error('Failed to sync read receipts:', error);
    }
  }

  /**
   * Sync profile updates across devices
   */
  async syncProfileUpdate(updates: {
    displayName?: string;
    profilePicture?: string;
    status?: string;
  }): Promise<void> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      await api.post('/sync/profile', {
        updates,
        deviceId: this.deviceId,
      });
    } catch (error) {
      console.error('Failed to sync profile update:', error);
    }
  }

  /**
   * Get active device sessions
   */
  async getDeviceSessions(): Promise<DeviceSession[]> {
    try {
      const response = await api.get('/sync/device-sessions');
      return response.data.sessions;
    } catch (error) {
      console.error('Failed to get device sessions:', error);
      return [];
    }
  }

  /**
   * Deactivate a device session
   */
  async deactivateDevice(deviceId: string): Promise<void> {
    try {
      await api.delete(`/sync/device-session/${deviceId}`);
    } catch (error) {
      console.error('Failed to deactivate device:', error);
    }
  }

  /**
   * Get queued message count
   */
  async getQueuedMessageCount(): Promise<number> {
    try {
      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const response = await api.get(`/sync/queue-count/${this.deviceId}`);
      return response.data.queuedMessageCount;
    } catch (error) {
      console.error('Failed to get queued message count:', error);
      return 0;
    }
  }

  /**
   * Handle profile sync from other devices
   */
  private handleProfileSync(data: any): void {
    // Update local user profile
    // In React Native, we can use DeviceEventEmitter or a custom event system
    console.log('Profile sync received:', data);
  }

  /**
   * Handle read receipts sync from other devices
   */
  private handleReadReceiptsSync(data: any): void {
    // Update local message read status
    console.log('Read receipts sync received:', data);
  }

  /**
   * Handle offline message delivery
   */
  private handleOfflineMessageDelivery(data: any): void {
    // Process offline message
    console.log('Offline message received:', data);
  }

  /**
   * Handle contact profile updates
   */
  private handleContactProfileUpdate(data: any): void {
    // Update contact profile in local state
    console.log('Contact profile updated:', data);
  }

  /**
   * Get device ID
   */
  async getDeviceId(): Promise<string> {
    if (!this.deviceId) {
      await this.initializeDeviceId();
    }
    return this.deviceId!;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTimestamp(): Date | undefined {
    return this.lastSyncTimestamp;
  }

  /**
   * Set last sync timestamp
   */
  setLastSyncTimestamp(timestamp: Date): void {
    this.lastSyncTimestamp = timestamp;
  }
}

export const syncService = new SyncService();