import { api } from './api';
import {
  SecuritySettings,
  DisappearingMessageSettings,
  UserReport,
  ReportUserRequest,
  UpdateSecuritySettingsRequest,
  SetDisappearingMessagesRequest,
  GenerateRecoveryCodeRequest,
  UseRecoveryCodeRequest,
} from '../types';

export class SecurityService {
  /**
   * Report a user
   */
  static async reportUser(reportData: ReportUserRequest): Promise<UserReport> {
    const response = await api.post('/security/report', reportData);
    return response.data.report;
  }

  /**
   * Get user's security settings
   */
  static async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await api.get('/security/settings');
    return response.data;
  }

  /**
   * Update user's security settings
   */
  static async updateSecuritySettings(updates: UpdateSecuritySettingsRequest): Promise<SecuritySettings> {
    const response = await api.put('/security/settings', updates);
    return response.data.settings;
  }

  /**
   * Set disappearing messages for a conversation
   */
  static async setDisappearingMessages(request: SetDisappearingMessagesRequest): Promise<DisappearingMessageSettings> {
    const response = await api.post('/security/disappearing-messages', request);
    return response.data.settings;
  }

  /**
   * Get disappearing messages settings for a conversation
   */
  static async getDisappearingMessages(conversationId: string): Promise<DisappearingMessageSettings | null> {
    try {
      const response = await api.get(`/security/disappearing-messages/${conversationId}`);
      return response.data.timerDuration > 0 ? response.data : null;
    } catch (error) {
      console.error('Error getting disappearing messages settings:', error);
      return null;
    }
  }

  /**
   * Generate account recovery code
   */
  static async generateRecoveryCode(request: GenerateRecoveryCodeRequest): Promise<{ recoveryCode: string; expiresIn: string }> {
    const response = await api.post('/security/recovery/generate', request);
    return {
      recoveryCode: response.data.recoveryCode,
      expiresIn: response.data.expiresIn,
    };
  }

  /**
   * Use recovery code to recover account
   */
  static async useRecoveryCode(request: UseRecoveryCodeRequest): Promise<{ userId: string; success: boolean }> {
    const response = await api.post('/security/recovery/use', request);
    return {
      userId: response.data.userId,
      success: true,
    };
  }

  /**
   * Block a user
   */
  static async blockUser(targetUserId: string): Promise<void> {
    await api.post('/security/block', { targetUserId });
  }

  /**
   * Unblock a user
   */
  static async unblockUser(targetUserId: string): Promise<void> {
    await api.post('/security/unblock', { targetUserId });
  }

  /**
   * Generate encryption keys for the user
   */
  static async generateEncryptionKeys(password: string): Promise<{ keyId: string; publicKey: string }> {
    const response = await api.post('/security/encryption/generate-keys', { password });
    return {
      keyId: response.data.keyId,
      publicKey: response.data.publicKey,
    };
  }

  /**
   * Get a user's public key
   */
  static async getUserPublicKey(userId: string): Promise<string | null> {
    try {
      const response = await api.get(`/security/encryption/public-key/${userId}`);
      return response.data.publicKey;
    } catch (error) {
      console.error('Error getting user public key:', error);
      return null;
    }
  }

  /**
   * Format disappearing message timer duration for display
   */
  static formatTimerDuration(seconds: number): string {
    if (seconds === 0) return 'Off';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  /**
   * Get timer duration options for disappearing messages
   */
  static getTimerOptions(): Array<{ label: string; value: number }> {
    return [
      { label: 'Off', value: 0 },
      { label: '30 seconds', value: 30 },
      { label: '1 minute', value: 60 },
      { label: '5 minutes', value: 300 },
      { label: '1 hour', value: 3600 },
      { label: '1 day', value: 86400 },
      { label: '1 week', value: 604800 },
    ];
  }

  /**
   * Get report reason options
   */
  static getReportReasons(): Array<{ label: string; value: string }> {
    return [
      { label: 'Spam', value: 'spam' },
      { label: 'Harassment', value: 'harassment' },
      { label: 'Inappropriate Content', value: 'inappropriate_content' },
      { label: 'Fake Account', value: 'fake_account' },
      { label: 'Other', value: 'other' },
    ];
  }

  /**
   * Get visibility options for profile settings
   */
  static getVisibilityOptions(): Array<{ label: string; value: string }> {
    return [
      { label: 'Everyone', value: 'everyone' },
      { label: 'My Contacts', value: 'contacts' },
      { label: 'Nobody', value: 'nobody' },
    ];
  }
}