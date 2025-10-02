import { db } from '../database/connection';
import { socketServer } from '../socket';

/**
 * Service for handling offline message queuing and delivery
 */
export class OfflineQueueService {
  private static retryInterval: NodeJS.Timeout;

  /**
   * Initialize the offline queue service
   */
  static initialize(): void {
    // Only initialize if database is connected
    if (!db.getPoolInfo().isConnected) {
      console.warn('Database not connected. Offline queue service will not be initialized.');
      return;
    }

    // Process retry queue every 30 seconds
    this.retryInterval = setInterval(() => {
      this.processRetryQueue();
    }, 30000);
  }

  /**
   * Queue a message for offline delivery
   */
  static async queueMessage(
    userId: string,
    deviceId: string,
    messageData: any,
    maxAttempts: number = 3
  ): Promise<void> {
    try {
      // Check if database is connected
      if (!db.getPoolInfo().isConnected) {
        console.warn('Database not connected. Cannot queue offline message.');
        return;
      }

      await db.query(
        `INSERT INTO offline_messages (user_id, device_id, message_data, max_attempts, next_retry)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, deviceId, JSON.stringify(messageData), maxAttempts]
      );
    } catch (error) {
      console.error('Error queuing offline message:', error);
    }
  }

  /**
   * Queue messages for all offline devices of a user
   */
  static async queueForOfflineDevices(
    userId: string,
    messageData: any,
    excludeDeviceId?: string
  ): Promise<void> {
    try {
      // Get all device sessions for the user
      const sessionsQuery = `
        SELECT device_id, is_active, last_activity 
        FROM device_sessions 
        WHERE user_id = $1 
        ${excludeDeviceId ? 'AND device_id != $2' : ''}
      `;

      const params = excludeDeviceId ? [userId, excludeDeviceId] : [userId];
      const result = await db.query(sessionsQuery, params);

      const connectedUsers = socketServer?.getConnectedUsers();
      const userSockets = connectedUsers?.get(userId);

      for (const session of result.rows) {
        // Check if device is currently connected via WebSocket
        const isCurrentlyConnected = userSockets && userSockets.size > 0;
        
        // If device is not currently connected or hasn't been active recently, queue the message
        const lastActivity = new Date(session.last_activity);
        const isRecentlyActive = (Date.now() - lastActivity.getTime()) < 5 * 60 * 1000; // 5 minutes

        if (!isCurrentlyConnected || !isRecentlyActive) {
          await this.queueMessage(userId, session.device_id, messageData);
        }
      }
    } catch (error) {
      console.error('Error queuing for offline devices:', error);
    }
  }

  /**
   * Deliver queued messages when a device comes online
   */
  static async deliverQueuedMessages(userId: string, deviceId: string): Promise<void> {
    try {
      // Get all undelivered messages for this device
      const messagesQuery = `
        SELECT * FROM offline_messages 
        WHERE user_id = $1 AND device_id = $2 AND delivered_at IS NULL
        ORDER BY queued_at ASC
      `;

      const result = await db.query(messagesQuery, [userId, deviceId]);

      for (const row of result.rows) {
        try {
          const messageData = JSON.parse(row.message_data);
          
          // Emit the message to the user
          socketServer?.emitToUser(userId, 'offline-message-delivery', messageData);

          // Mark as delivered
          await db.query(
            'UPDATE offline_messages SET delivered_at = NOW() WHERE id = $1',
            [row.id]
          );
        } catch (deliveryError) {
          console.error('Error delivering queued message:', deliveryError);
          
          // Increment attempt count
          await this.incrementAttemptCount(row.id);
        }
      }
    } catch (error) {
      console.error('Error delivering queued messages:', error);
    }
  }

  /**
   * Process retry queue for failed deliveries
   */
  private static async processRetryQueue(): Promise<void> {
    try {
      // Check if database is connected
      if (!db.getPoolInfo().isConnected) {
        return;
      }

      const retryQuery = `
        SELECT * FROM offline_messages 
        WHERE delivered_at IS NULL 
        AND attempts < max_attempts 
        AND next_retry <= NOW()
        ORDER BY queued_at ASC
        LIMIT 100
      `;

      const result = await db.query(retryQuery);

      for (const row of result.rows) {
        try {
          const messageData = JSON.parse(row.message_data);
          
          // Check if user is currently online
          const connectedUsers = socketServer?.getConnectedUsers();
          const userSockets = connectedUsers?.get(row.user_id);
          
          if (userSockets && userSockets.size > 0) {
            // User is online, try to deliver
            socketServer?.emitToUser(row.user_id, 'offline-message-delivery', messageData);
            
            // Mark as delivered
            await db.query(
              'UPDATE offline_messages SET delivered_at = NOW() WHERE id = $1',
              [row.id]
            );
          } else {
            // User still offline, increment attempt and schedule next retry
            await this.incrementAttemptCount(row.id);
          }
        } catch (retryError) {
          console.error('Error in retry delivery:', retryError);
          await this.incrementAttemptCount(row.id);
        }
      }
    } catch (error) {
      console.error('Error processing retry queue:', error);
    }
  }

  /**
   * Increment attempt count and schedule next retry
   */
  private static async incrementAttemptCount(messageId: string): Promise<void> {
    try {
      // Exponential backoff: 1 min, 5 min, 15 min
      const backoffMinutes = [1, 5, 15];
      
      const result = await db.query(
        'SELECT attempts FROM offline_messages WHERE id = $1',
        [messageId]
      );

      if (result.rows.length > 0) {
        const currentAttempts = result.rows[0].attempts;
        const nextRetryMinutes = backoffMinutes[Math.min(currentAttempts, backoffMinutes.length - 1)];

        await db.query(
          `UPDATE offline_messages 
           SET attempts = attempts + 1, 
               next_retry = NOW() + INTERVAL '${nextRetryMinutes} minutes'
           WHERE id = $1`,
          [messageId]
        );
      }
    } catch (error) {
      console.error('Error incrementing attempt count:', error);
    }
  }

  /**
   * Get queued message count for a user
   */
  static async getQueuedMessageCount(userId: string, deviceId?: string): Promise<number> {
    try {
      const query = deviceId 
        ? 'SELECT COUNT(*) as count FROM offline_messages WHERE user_id = $1 AND device_id = $2 AND delivered_at IS NULL'
        : 'SELECT COUNT(*) as count FROM offline_messages WHERE user_id = $1 AND delivered_at IS NULL';

      const params = deviceId ? [userId, deviceId] : [userId];
      const result = await db.query(query, params);

      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting queued message count:', error);
      return 0;
    }
  }

  /**
   * Clear delivered messages older than specified days
   */
  static async cleanupDeliveredMessages(olderThanDays: number = 7): Promise<void> {
    try {
      await db.query(
        `DELETE FROM offline_messages 
         WHERE delivered_at IS NOT NULL 
         AND delivered_at < NOW() - INTERVAL '${olderThanDays} days'`
      );
    } catch (error) {
      console.error('Error cleaning up delivered messages:', error);
    }
  }

  /**
   * Clear failed messages that exceeded max attempts
   */
  static async cleanupFailedMessages(): Promise<void> {
    try {
      await db.query(
        'DELETE FROM offline_messages WHERE attempts >= max_attempts AND delivered_at IS NULL'
      );
    } catch (error) {
      console.error('Error cleaning up failed messages:', error);
    }
  }

  /**
   * Stop the retry interval (for testing or shutdown)
   */
  static stop(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }
}