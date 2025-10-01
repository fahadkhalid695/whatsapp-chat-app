import admin from 'firebase-admin';
import { db } from '../database/connection';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: config.firebase.projectId,
      private_key_id: config.firebase.privateKeyId,
      private_key: config.firebase.privateKey,
      client_email: config.firebase.clientEmail,
      client_id: config.firebase.clientId,
      auth_uri: config.firebase.authUri,
      token_uri: config.firebase.tokenUri,
      auth_provider_x509_cert_url: config.firebase.authProviderX509CertUrl,
      client_x509_cert_url: config.firebase.clientX509CertUrl,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  pushEnabled: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  mentionNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationNotificationSettings {
  id: string;
  userId: string;
  conversationId: string;
  isMuted: boolean;
  mutedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationData {
  type: 'message' | 'mention' | 'group_activity';
  conversationId: string;
  messageId?: string;
  senderId: string;
  senderName: string;
  conversationName?: string;
  messageContent?: string;
  isGroup: boolean;
}

export interface QueuedNotification {
  id: string;
  userId: string;
  type: 'message' | 'mention' | 'group_activity';
  title: string;
  body: string;
  data: NotificationData;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationService {
  private batchProcessor: NodeJS.Timeout | null = null;
  private retryProcessor: NodeJS.Timeout | null = null;

  constructor() {
    this.startBatchProcessor();
    this.startRetryProcessor();
  }

  // Device token management
  async registerDeviceToken(userId: string, token: string, platform: 'web' | 'android' | 'ios'): Promise<void> {
    try {
      await db.query(
        `INSERT INTO device_tokens (user_id, token, platform) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id, token) 
         DO UPDATE SET is_active = true, updated_at = NOW()`,
        [userId, token, platform]
      );
      
      logger.info(`Device token registered for user ${userId} on ${platform}`);
    } catch (error) {
      logger.error('Error registering device token:', error);
      throw error;
    }
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    try {
      await db.query(
        'UPDATE device_tokens SET is_active = false WHERE user_id = $1 AND token = $2',
        [userId, token]
      );
      
      logger.info(`Device token removed for user ${userId}`);
    } catch (error) {
      logger.error('Error removing device token:', error);
      throw error;
    }
  }

  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      const result = await db.query(
        'SELECT * FROM device_tokens WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        token: row.token,
        platform: row.platform,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Error getting user device tokens:', error);
      throw error;
    }
  }

  // Notification preferences management
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        pushEnabled: row.push_enabled,
        messageNotifications: row.message_notifications,
        groupNotifications: row.group_notifications,
        mentionNotifications: row.mention_notifications,
        quietHoursEnabled: row.quiet_hours_enabled,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
        timezone: row.timezone,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (preferences.pushEnabled !== undefined) {
        updateFields.push(`push_enabled = $${paramIndex++}`);
        values.push(preferences.pushEnabled);
      }
      if (preferences.messageNotifications !== undefined) {
        updateFields.push(`message_notifications = $${paramIndex++}`);
        values.push(preferences.messageNotifications);
      }
      if (preferences.groupNotifications !== undefined) {
        updateFields.push(`group_notifications = $${paramIndex++}`);
        values.push(preferences.groupNotifications);
      }
      if (preferences.mentionNotifications !== undefined) {
        updateFields.push(`mention_notifications = $${paramIndex++}`);
        values.push(preferences.mentionNotifications);
      }
      if (preferences.quietHoursEnabled !== undefined) {
        updateFields.push(`quiet_hours_enabled = $${paramIndex++}`);
        values.push(preferences.quietHoursEnabled);
      }
      if (preferences.quietHoursStart !== undefined) {
        updateFields.push(`quiet_hours_start = $${paramIndex++}`);
        values.push(preferences.quietHoursStart);
      }
      if (preferences.quietHoursEnd !== undefined) {
        updateFields.push(`quiet_hours_end = $${paramIndex++}`);
        values.push(preferences.quietHoursEnd);
      }
      if (preferences.timezone !== undefined) {
        updateFields.push(`timezone = $${paramIndex++}`);
        values.push(preferences.timezone);
      }

      values.push(userId);

      const query = `
        INSERT INTO notification_preferences (user_id) VALUES ($${paramIndex})
        ON CONFLICT (user_id) DO UPDATE SET
        ${updateFields.join(', ')},
        updated_at = NOW()
        RETURNING *
      `;

      const result = await db.query(query, values);
      const row = result.rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        pushEnabled: row.push_enabled,
        messageNotifications: row.message_notifications,
        groupNotifications: row.group_notifications,
        mentionNotifications: row.mention_notifications,
        quietHoursEnabled: row.quiet_hours_enabled,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
        timezone: row.timezone,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Conversation notification settings
  async getConversationNotificationSettings(userId: string, conversationId: string): Promise<ConversationNotificationSettings | null> {
    try {
      const result = await db.query(
        'SELECT * FROM conversation_notification_settings WHERE user_id = $1 AND conversation_id = $2',
        [userId, conversationId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        isMuted: row.is_muted,
        mutedUntil: row.muted_until,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Error getting conversation notification settings:', error);
      throw error;
    }
  }

  async muteConversation(userId: string, conversationId: string, mutedUntil?: Date): Promise<void> {
    try {
      await db.query(
        `INSERT INTO conversation_notification_settings (user_id, conversation_id, is_muted, muted_until)
         VALUES ($1, $2, true, $3)
         ON CONFLICT (user_id, conversation_id)
         DO UPDATE SET is_muted = true, muted_until = $3, updated_at = NOW()`,
        [userId, conversationId, mutedUntil]
      );
      
      logger.info(`Conversation ${conversationId} muted for user ${userId}`);
    } catch (error) {
      logger.error('Error muting conversation:', error);
      throw error;
    }
  }

  async unmuteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      await db.query(
        `INSERT INTO conversation_notification_settings (user_id, conversation_id, is_muted)
         VALUES ($1, $2, false)
         ON CONFLICT (user_id, conversation_id)
         DO UPDATE SET is_muted = false, muted_until = NULL, updated_at = NOW()`,
        [userId, conversationId]
      );
      
      logger.info(`Conversation ${conversationId} unmuted for user ${userId}`);
    } catch (error) {
      logger.error('Error unmuting conversation:', error);
      throw error;
    }
  }

  // Check if user should receive notification
  private async shouldSendNotification(userId: string, notificationData: NotificationData): Promise<boolean> {
    try {
      // Get user preferences
      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences || !preferences.pushEnabled) {
        return false;
      }

      // Check notification type preferences
      if (notificationData.type === 'message' && !preferences.messageNotifications) {
        return false;
      }
      if (notificationData.type === 'mention' && !preferences.mentionNotifications) {
        return false;
      }
      if (notificationData.isGroup && !preferences.groupNotifications) {
        return false;
      }

      // Check quiet hours
      if (preferences.quietHoursEnabled) {
        const now = new Date();
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
        const currentTime = userTime.toTimeString().slice(0, 8);
        
        if (this.isInQuietHours(currentTime, preferences.quietHoursStart, preferences.quietHoursEnd)) {
          return false;
        }
      }

      // Check conversation muting
      const conversationSettings = await this.getConversationNotificationSettings(userId, notificationData.conversationId);
      if (conversationSettings?.isMuted) {
        if (!conversationSettings.mutedUntil || conversationSettings.mutedUntil > new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking notification permissions:', error);
      return false;
    }
  }

  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    if (startTime <= endTime) {
      // Same day quiet hours (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Queue notification for sending
  async queueNotification(userId: string, notificationData: NotificationData): Promise<void> {
    try {
      if (!(await this.shouldSendNotification(userId, notificationData))) {
        logger.debug(`Notification skipped for user ${userId} due to preferences`);
        return;
      }

      const { title, body } = this.generateNotificationContent(notificationData);

      await db.query(
        `INSERT INTO notification_queue (user_id, type, title, body, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, notificationData.type, title, body, JSON.stringify(notificationData)]
      );
      
      logger.debug(`Notification queued for user ${userId}`);
    } catch (error) {
      logger.error('Error queueing notification:', error);
      throw error;
    }
  }

  private generateNotificationContent(data: NotificationData): { title: string; body: string } {
    switch (data.type) {
      case 'message':
        return {
          title: data.isGroup ? data.conversationName || 'Group Chat' : data.senderName,
          body: data.isGroup 
            ? `${data.senderName}: ${data.messageContent || 'Sent a message'}`
            : data.messageContent || 'Sent you a message',
        };
      case 'mention':
        return {
          title: data.conversationName || 'Group Chat',
          body: `${data.senderName} mentioned you: ${data.messageContent || 'in a message'}`,
        };
      case 'group_activity':
        return {
          title: data.conversationName || 'Group Chat',
          body: `${data.senderName} ${data.messageContent || 'updated the group'}`,
        };
      default:
        return {
          title: 'New Notification',
          body: 'You have a new notification',
        };
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(userId: string, notificationData: NotificationData): Promise<void> {
    try {
      const deviceTokens = await this.getUserDeviceTokens(userId);
      if (deviceTokens.length === 0) {
        logger.debug(`No device tokens found for user ${userId}`);
        return;
      }

      const { title, body } = this.generateNotificationContent(notificationData);
      const tokens = deviceTokens.map(dt => dt.token);

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type: notificationData.type,
          conversationId: notificationData.conversationId,
          messageId: notificationData.messageId || '',
          senderId: notificationData.senderId,
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            logger.warn(`Failed to send notification to token ${tokens[idx]}: ${resp.error?.message}`);
          }
        });

        // Remove invalid tokens
        await this.removeInvalidTokens(userId, failedTokens);
      }

      logger.info(`Notification sent to ${response.successCount} devices for user ${userId}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  private async removeInvalidTokens(userId: string, tokens: string[]): Promise<void> {
    try {
      if (tokens.length === 0) return;

      await db.query(
        'UPDATE device_tokens SET is_active = false WHERE user_id = $1 AND token = ANY($2)',
        [userId, tokens]
      );
      
      logger.info(`Removed ${tokens.length} invalid tokens for user ${userId}`);
    } catch (error) {
      logger.error('Error removing invalid tokens:', error);
    }
  }

  // Batch processing
  private startBatchProcessor(): void {
    this.batchProcessor = setInterval(async () => {
      await this.processBatchedNotifications();
    }, config.notification.batchDelayMs);
  }

  private async processBatchedNotifications(): Promise<void> {
    try {
      const result = await db.query(
        `SELECT * FROM notification_queue 
         WHERE status = 'pending' AND scheduled_for <= NOW()
         ORDER BY created_at ASC
         LIMIT $1`,
        [config.notification.batchSize]
      );

      if (result.rows.length === 0) {
        return;
      }

      const notifications = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
      }));

      // Group notifications by user for batching
      const userNotifications = new Map<string, typeof notifications>();
      notifications.forEach(notification => {
        if (!userNotifications.has(notification.userId)) {
          userNotifications.set(notification.userId, []);
        }
        userNotifications.get(notification.userId)!.push(notification);
      });

      // Process each user's notifications
      for (const [userId, userNotifs] of userNotifications) {
        await this.sendBatchedNotifications(userId, userNotifs);
      }
    } catch (error) {
      logger.error('Error processing batched notifications:', error);
    }
  }

  private async sendBatchedNotifications(userId: string, notifications: any[]): Promise<void> {
    try {
      const deviceTokens = await this.getUserDeviceTokens(userId);
      if (deviceTokens.length === 0) {
        // Mark as failed - no device tokens
        await this.markNotificationsAsFailed(notifications.map(n => n.id), 'No device tokens');
        return;
      }

      // If multiple notifications, create a summary
      let title: string;
      let body: string;
      
      if (notifications.length === 1) {
        title = notifications[0].title;
        body = notifications[0].body;
      } else {
        title = 'New Messages';
        body = `You have ${notifications.length} new messages`;
      }

      const tokens = deviceTokens.map(dt => dt.token);
      const message = {
        notification: { title, body },
        data: {
          type: 'batch',
          count: notifications.length.toString(),
          notifications: JSON.stringify(notifications.map(n => n.data)),
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.successCount > 0) {
        await this.markNotificationsAsSent(notifications.map(n => n.id));
      }

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        await this.removeInvalidTokens(userId, failedTokens);
        
        // Retry notifications that failed due to network issues
        await this.retryFailedNotifications(notifications.map(n => n.id));
      }

      logger.info(`Batched notification sent to ${response.successCount} devices for user ${userId}`);
    } catch (error) {
      logger.error('Error sending batched notifications:', error);
      await this.retryFailedNotifications(notifications.map(n => n.id));
    }
  }

  private async markNotificationsAsSent(notificationIds: string[]): Promise<void> {
    try {
      await db.query(
        'UPDATE notification_queue SET status = $1, updated_at = NOW() WHERE id = ANY($2)',
        ['sent', notificationIds]
      );
    } catch (error) {
      logger.error('Error marking notifications as sent:', error);
    }
  }

  private async markNotificationsAsFailed(notificationIds: string[], errorMessage: string): Promise<void> {
    try {
      await db.query(
        'UPDATE notification_queue SET status = $1, error_message = $2, updated_at = NOW() WHERE id = ANY($3)',
        ['failed', errorMessage, notificationIds]
      );
    } catch (error) {
      logger.error('Error marking notifications as failed:', error);
    }
  }

  private async retryFailedNotifications(notificationIds: string[]): Promise<void> {
    try {
      await db.query(
        `UPDATE notification_queue 
         SET attempts = attempts + 1, 
             scheduled_for = NOW() + INTERVAL '${config.notification.retryDelayMs} milliseconds',
             status = CASE 
               WHEN attempts + 1 >= max_attempts THEN 'failed'
               ELSE 'pending'
             END,
             updated_at = NOW()
         WHERE id = ANY($1)`,
        [notificationIds]
      );
    } catch (error) {
      logger.error('Error retrying failed notifications:', error);
    }
  }

  // Retry processor for failed notifications
  private startRetryProcessor(): void {
    this.retryProcessor = setInterval(async () => {
      await this.processRetryNotifications();
    }, config.notification.retryDelayMs);
  }

  private async processRetryNotifications(): Promise<void> {
    try {
      const result = await db.query(
        `SELECT * FROM notification_queue 
         WHERE status = 'pending' AND attempts > 0 AND scheduled_for <= NOW()
         ORDER BY created_at ASC
         LIMIT $1`,
        [config.notification.batchSize]
      );

      if (result.rows.length === 0) {
        return;
      }

      // Process retry notifications similar to batch processing
      await this.processBatchedNotifications();
    } catch (error) {
      logger.error('Error processing retry notifications:', error);
    }
  }

  // Cleanup old notifications
  async cleanupOldNotifications(olderThanDays: number = 7): Promise<void> {
    try {
      const result = await db.query(
        `DELETE FROM notification_queue 
         WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
         AND status IN ('sent', 'failed')`,
      );
      
      logger.info(`Cleaned up ${result.rowCount} old notifications`);
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
    }
  }

  // Shutdown gracefully
  shutdown(): void {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }
    if (this.retryProcessor) {
      clearInterval(this.retryProcessor);
      this.retryProcessor = null;
    }
    logger.info('Notification service shutdown complete');
  }
}

// Create singleton instance
let notificationService: NotificationService | null = null;

export const createNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
};

export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    throw new Error('Notification service not initialized. Call createNotificationService first.');
  }
  return notificationService;
};