import { db, DatabaseHelper } from '../database/connection';
import { 
  DeviceSession,
  SyncData,
  ConversationSyncData,
  MessageSyncData
} from '../types';
import { socketServer } from '../socket';

/**
 * Service for handling cross-platform data synchronization
 */
export class SyncService {
  /**
   * Sync conversation history when user logs in on a new device
   */
  static async syncConversationHistory(
    userId: string, 
    deviceId: string, 
    lastSyncTimestamp?: Date
  ): Promise<SyncData> {
    try {
      // Get user's conversations
      const conversationsQuery = `
        SELECT c.*, 
               ARRAY_AGG(cp.user_id) as participant_ids,
               ARRAY_AGG(CASE WHEN cp.is_admin THEN cp.user_id ELSE NULL END) as admin_ids
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.user_id = $1
        ${lastSyncTimestamp ? 'AND (c.updated_at > $2 OR c.last_activity > $2)' : ''}
        GROUP BY c.id
        ORDER BY c.last_activity DESC
      `;

      const params = lastSyncTimestamp ? [userId, lastSyncTimestamp] : [userId];
      const conversationsResult = await db.query(conversationsQuery, params);

      const conversations: ConversationSyncData[] = [];

      for (const row of conversationsResult.rows) {
        // Get recent messages for each conversation
        const messagesQuery = `
          SELECT m.*, 
                 ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered') as delivered_to,
                 ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read') as read_by
          FROM messages m
          LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
          LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
          WHERE m.conversation_id = $1 
          ${lastSyncTimestamp ? 'AND m.timestamp > $2' : ''}
          AND m.is_deleted = false
          GROUP BY m.id
          ORDER BY m.timestamp DESC
          LIMIT 50
        `;

        const messageParams = lastSyncTimestamp ? [row.id, lastSyncTimestamp] : [row.id];
        const messagesResult = await db.query(messagesQuery, messageParams);

        const messages: MessageSyncData[] = messagesResult.rows.map(msgRow => ({
          id: msgRow.id,
          conversationId: msgRow.conversation_id,
          senderId: msgRow.sender_id,
          content: msgRow.content,
          type: msgRow.type,
          timestamp: msgRow.timestamp,
          deliveredTo: msgRow.delivered_to || [],
          readBy: msgRow.read_by || [],
          isDeleted: msgRow.is_deleted,
          replyTo: msgRow.reply_to,
          editedAt: msgRow.edited_at,
        }));

        conversations.push({
          id: row.id,
          type: row.type,
          name: row.name,
          participants: row.participant_ids.filter(Boolean),
          admins: row.admin_ids.filter(Boolean),
          lastActivity: row.last_activity,
          isArchived: row.is_archived,
          isMuted: false, // This would come from user preferences
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          messages,
          unreadCount: await this.getUnreadMessageCount(userId, row.id),
        });
      }

      // Update device session sync timestamp
      await this.updateDeviceLastSync(userId, deviceId);

      return {
        conversations,
        syncTimestamp: new Date(),
        hasMore: conversations.length === 50, // Indicate if there are more conversations
      };
    } catch (error) {
      console.error('Error syncing conversation history:', error);
      throw new Error('Failed to sync conversation history');
    }
  }

  /**
   * Get unread message count for a conversation
   */
  private static async getUnreadMessageCount(userId: string, conversationId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        WHERE m.conversation_id = $1 
        AND m.sender_id != $2
        AND m.is_deleted = false
        AND NOT EXISTS (
          SELECT 1 FROM message_status ms 
          WHERE ms.message_id = m.id 
          AND ms.user_id = $2 
          AND ms.status = 'read'
        )
      `;

      const result = await db.query(query, [conversationId, userId]);
      return parseInt(result.rows[0].unread_count) || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  /**
   * Sync read receipts across all user devices
   */
  static async syncReadReceipts(
    userId: string, 
    messageIds: string[], 
    excludeDeviceId?: string
  ): Promise<void> {
    try {
      // Mark messages as read in database
      for (const messageId of messageIds) {
        await db.query(
          `INSERT INTO message_status (message_id, user_id, status, timestamp)
           VALUES ($1, $2, 'read', NOW())
           ON CONFLICT (message_id, user_id, status) DO NOTHING`,
          [messageId, userId]
        );
      }

      // Get user's active device sessions
      const activeSessions = await this.getActiveDeviceSessions(userId);

      // Emit read receipt sync to all user's devices except the originating one
      const readReceiptData = {
        messageIds,
        readBy: userId,
        timestamp: new Date(),
      };

      activeSessions.forEach(session => {
        if (session.deviceId !== excludeDeviceId) {
          socketServer?.emitToUser(userId, 'read-receipts-sync', readReceiptData);
        }
      });

      // Also emit to other conversation participants
      const conversationIds = await this.getConversationIdsForMessages(messageIds);
      for (const conversationId of conversationIds) {
        const participants = await this.getConversationParticipants(conversationId);
        participants.forEach(participantId => {
          if (participantId !== userId) {
            socketServer?.emitToUser(participantId, 'message-read', {
              messageIds,
              readBy: userId,
              conversationId,
              timestamp: new Date(),
            });
          }
        });
      }
    } catch (error) {
      console.error('Error syncing read receipts:', error);
      throw new Error('Failed to sync read receipts');
    }
  }

  /**
   * Sync profile updates across devices
   */
  static async syncProfileUpdate(
    userId: string, 
    profileUpdates: { displayName?: string; profilePicture?: string; status?: string },
    excludeDeviceId?: string
  ): Promise<void> {
    try {
      // Get user's active device sessions
      const activeSessions = await this.getActiveDeviceSessions(userId);

      // Emit profile update to all user's devices except the originating one
      const profileSyncData = {
        userId,
        updates: profileUpdates,
        timestamp: new Date(),
      };

      activeSessions.forEach(session => {
        if (session.deviceId !== excludeDeviceId) {
          socketServer?.emitToUser(userId, 'profile-sync', profileSyncData);
        }
      });

      // Also notify contacts about profile changes (for display name and profile picture)
      if (profileUpdates.displayName || profileUpdates.profilePicture) {
        const contactsQuery = `
          SELECT DISTINCT user_id 
          FROM contacts 
          WHERE contact_user_id = $1 AND is_blocked = false
        `;
        
        const contactsResult = await db.query(contactsQuery, [userId]);
        
        contactsResult.rows.forEach(row => {
          socketServer?.emitToUser(row.user_id, 'contact-profile-updated', {
            contactUserId: userId,
            updates: {
              displayName: profileUpdates.displayName,
              profilePicture: profileUpdates.profilePicture,
            },
            timestamp: new Date(),
          });
        });
      }
    } catch (error) {
      console.error('Error syncing profile update:', error);
      throw new Error('Failed to sync profile update');
    }
  }

  /**
   * Register a new device session
   */
  static async registerDeviceSession(
    userId: string, 
    deviceId: string, 
    deviceInfo: {
      platform: 'web' | 'mobile';
      userAgent?: string;
      appVersion?: string;
    }
  ): Promise<DeviceSession> {
    try {
      const sessionData = {
        user_id: userId,
        device_id: deviceId,
        platform: deviceInfo.platform,
        user_agent: deviceInfo.userAgent,
        app_version: deviceInfo.appVersion,
        is_active: true,
        last_activity: new Date(),
        created_at: new Date(),
      };

      const session = await DatabaseHelper.insert<any>('device_sessions', sessionData);

      return {
        id: session.id,
        userId: session.user_id,
        deviceId: session.device_id,
        platform: session.platform,
        userAgent: session.user_agent,
        appVersion: session.app_version,
        isActive: session.is_active,
        lastActivity: session.last_activity,
        createdAt: session.created_at,
      };
    } catch (error) {
      console.error('Error registering device session:', error);
      throw new Error('Failed to register device session');
    }
  }

  /**
   * Update device session activity
   */
  static async updateDeviceActivity(userId: string, deviceId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE device_sessions 
         SET last_activity = NOW(), is_active = true 
         WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );
    } catch (error) {
      console.error('Error updating device activity:', error);
    }
  }

  /**
   * Deactivate device session
   */
  static async deactivateDeviceSession(userId: string, deviceId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE device_sessions 
         SET is_active = false, last_activity = NOW() 
         WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );
    } catch (error) {
      console.error('Error deactivating device session:', error);
    }
  }

  /**
   * Get active device sessions for a user
   */
  static async getActiveDeviceSessions(userId: string): Promise<DeviceSession[]> {
    try {
      const result = await db.query(
        `SELECT * FROM device_sessions 
         WHERE user_id = $1 AND is_active = true 
         AND last_activity > NOW() - INTERVAL '7 days'
         ORDER BY last_activity DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        deviceId: row.device_id,
        platform: row.platform,
        userAgent: row.user_agent,
        appVersion: row.app_version,
        isActive: row.is_active,
        lastActivity: row.last_activity,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting active device sessions:', error);
      return [];
    }
  }

  /**
   * Update device last sync timestamp
   */
  private static async updateDeviceLastSync(userId: string, deviceId: string): Promise<void> {
    try {
      await db.query(
        `UPDATE device_sessions 
         SET last_sync = NOW() 
         WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );
    } catch (error) {
      console.error('Error updating device last sync:', error);
    }
  }

  /**
   * Get conversation IDs for given message IDs
   */
  private static async getConversationIdsForMessages(messageIds: string[]): Promise<string[]> {
    try {
      if (messageIds.length === 0) return [];

      const placeholders = messageIds.map((_, index) => `$${index + 1}`).join(', ');
      const query = `SELECT DISTINCT conversation_id FROM messages WHERE id IN (${placeholders})`;
      
      const result = await db.query(query, messageIds);
      return result.rows.map(row => row.conversation_id);
    } catch (error) {
      console.error('Error getting conversation IDs for messages:', error);
      return [];
    }
  }

  /**
   * Get conversation participants
   */
  private static async getConversationParticipants(conversationId: string): Promise<string[]> {
    try {
      const result = await db.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
      );
      
      return result.rows.map(row => row.user_id);
    } catch (error) {
      console.error('Error getting conversation participants:', error);
      return [];
    }
  }
}