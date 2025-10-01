import { db } from '../database/connection';
import { ModelTransformer } from '../models';
import {
  Message,
  MessageEntity,
  MessageContent,
  MessageType,
} from '../types';
import { getNotificationService } from './notification';
import { logger } from '../utils/logger';

export class MessageService {
  /**
   * Send a new message to a conversation
   */
  static async sendMessage(
    senderId: string,
    conversationId: string,
    content: MessageContent,
    type: MessageType,
    replyTo?: string
  ): Promise<Message> {
    return db.transaction(async (client) => {
      // Verify sender is a participant in the conversation
      const participantCheck = await client.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, senderId]
      );

      if (participantCheck.rows.length === 0) {
        throw new Error('User is not a participant in this conversation');
      }

      // If replying to a message, verify it exists in the same conversation
      if (replyTo) {
        const replyCheck = await client.query(
          'SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2 AND is_deleted = false',
          [replyTo, conversationId]
        );

        if (replyCheck.rows.length === 0) {
          throw new Error('Reply target message not found or deleted');
        }
      }

      // Insert the message
      const messageResult = await client.query<MessageEntity>(
        `INSERT INTO messages (conversation_id, sender_id, content, type, reply_to)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [conversationId, senderId, JSON.stringify(content), type, replyTo || null]
      );

      const messageEntity = messageResult.rows[0];

      // Update conversation last activity
      await client.query(
        'UPDATE conversations SET last_activity = NOW() WHERE id = $1',
        [conversationId]
      );

      // Get all participants for delivery status tracking
      const participantsResult = await client.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
      );

      const participants = participantsResult.rows.map(row => row.user_id);

      // Mark as delivered to all participants except sender
      const otherParticipants = participants.filter(id => id !== senderId);
      
      if (otherParticipants.length > 0) {
        const deliveryValues = otherParticipants.map((_, index) => 
          `($1, $${index + 2}, 'delivered')`
        ).join(', ');

        await client.query(
          `INSERT INTO message_status (message_id, user_id, status) VALUES ${deliveryValues}`,
          [messageEntity.id, ...otherParticipants]
        );
      }

      // Transform to API model
      const message = ModelTransformer.messageEntityToMessage(
        messageEntity,
        otherParticipants, // deliveredTo
        [] // readBy (empty initially)
      );

      // Send notifications to other participants (async, don't wait)
      setImmediate(async () => {
        try {
          await MessageService.sendMessageNotifications(
            message,
            senderId,
            conversationId,
            otherParticipants
          );
        } catch (error) {
          logger.error('Error sending message notifications:', error);
        }
      });

      return message;
    });
  }

  /**
   * Get messages for a conversation with pagination
   */
  static async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
    beforeTimestamp?: Date
  ): Promise<{ messages: Message[]; total: number }> {
    // Verify user is a participant
    const participantCheck = await db.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      throw new Error('User is not a participant in this conversation');
    }

    // Build query conditions
    let whereClause = 'WHERE m.conversation_id = $1 AND m.is_deleted = false';
    const queryParams: any[] = [conversationId];
    let paramIndex = 2;

    if (beforeTimestamp) {
      whereClause += ` AND m.timestamp < $${paramIndex}`;
      queryParams.push(beforeTimestamp);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM messages m ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get messages with delivery status
    const messagesResult = await db.query<MessageEntity & {
      delivered_to: string[];
      read_by: string[];
    }>(
      `SELECT 
         m.*,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
           ARRAY[]::uuid[]
         ) as delivered_to,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
           ARRAY[]::uuid[]
         ) as read_by
       FROM messages m
       LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
       LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
       ${whereClause}
       GROUP BY m.id
       ORDER BY m.timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const messages = messagesResult.rows.map(row => 
      ModelTransformer.messageEntityToMessage(
        row,
        row.delivered_to || [],
        row.read_by || []
      )
    );

    return { messages, total };
  }

  /**
   * Mark messages as read by a user
   */
  static async markMessagesAsRead(
    messageIds: string[],
    userId: string
  ): Promise<void> {
    if (messageIds.length === 0) return;

    await db.transaction(async (client) => {
      // Verify all messages exist and user is a participant
      const messagesResult = await client.query(
        `SELECT m.id, m.conversation_id 
         FROM messages m
         JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
         WHERE m.id = ANY($1) AND cp.user_id = $2 AND m.is_deleted = false`,
        [messageIds, userId]
      );

      const validMessageIds = messagesResult.rows.map(row => row.id);
      
      if (validMessageIds.length === 0) {
        return; // No valid messages to mark as read
      }

      // Insert read status (ON CONFLICT DO NOTHING to handle duplicates)
      const readValues = validMessageIds.map((_, index) => 
        `($${index * 2 + 1}, $${index * 2 + 2}, 'read')`
      ).join(', ');

      const readParams = validMessageIds.flatMap(messageId => [messageId, userId]);

      await client.query(
        `INSERT INTO message_status (message_id, user_id, status) 
         VALUES ${readValues}
         ON CONFLICT (message_id, user_id, status) DO NOTHING`,
        readParams
      );
    });
  }

  /**
   * Delete a message (soft delete)
   */
  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<void> {
    await db.transaction(async (client) => {
      // Verify message exists and user is the sender
      const messageResult = await client.query<MessageEntity>(
        'SELECT * FROM messages WHERE id = $1 AND sender_id = $2 AND is_deleted = false',
        [messageId, userId]
      );

      if (messageResult.rows.length === 0) {
        throw new Error('Message not found or you are not authorized to delete it');
      }

      // Soft delete the message
      await client.query(
        'UPDATE messages SET is_deleted = true WHERE id = $1',
        [messageId]
      );
    });
  }

  /**
   * Edit a message
   */
  static async editMessage(
    messageId: string,
    userId: string,
    newContent: MessageContent
  ): Promise<Message> {
    return db.transaction(async (client) => {
      // Verify message exists, user is the sender, and it's a text message
      const messageResult = await client.query<MessageEntity>(
        `SELECT * FROM messages 
         WHERE id = $1 AND sender_id = $2 AND is_deleted = false AND type = 'text'`,
        [messageId, userId]
      );

      if (messageResult.rows.length === 0) {
        throw new Error('Message not found, you are not authorized to edit it, or it cannot be edited');
      }

      // Update the message content
      const updatedResult = await client.query<MessageEntity>(
        `UPDATE messages 
         SET content = $1, edited_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [JSON.stringify(newContent), messageId]
      );

      const messageEntity = updatedResult.rows[0];

      // Get delivery status
      const statusResult = await client.query(
        `SELECT 
           COALESCE(
             ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
             ARRAY[]::uuid[]
           ) as delivered_to,
           COALESCE(
             ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
             ARRAY[]::uuid[]
           ) as read_by
         FROM message_status ms_delivered
         FULL OUTER JOIN message_status ms_read ON ms_delivered.message_id = ms_read.message_id
         WHERE ms_delivered.message_id = $1 OR ms_read.message_id = $1`,
        [messageId]
      );

      const statusRow = statusResult.rows[0] || { delivered_to: [], read_by: [] };

      return ModelTransformer.messageEntityToMessage(
        messageEntity,
        statusRow.delivered_to || [],
        statusRow.read_by || []
      );
    });
  }

  /**
   * Search messages across conversations for a user
   */
  static async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    mediaType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: Message[]; total: number }> {
    // Build search conditions
    let whereClause = `
      WHERE cp.user_id = $1 
      AND m.is_deleted = false
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    // Add text search condition if query is provided
    if (query && query.trim()) {
      whereClause += ` AND (m.content->>'text' ILIKE $${paramIndex} OR m.content->>'fileName' ILIKE $${paramIndex})`;
      queryParams.push(`%${query.trim()}%`);
      paramIndex++;
    }

    // Add media type filter if specified
    if (mediaType) {
      if (mediaType === 'media') {
        // Search for any media type
        whereClause += ` AND m.type IN ('image', 'video', 'audio', 'document')`;
      } else {
        // Search for specific media type
        whereClause += ` AND m.type = $${paramIndex}`;
        queryParams.push(mediaType);
        paramIndex++;
      }
    }

    if (conversationId) {
      whereClause += ` AND m.conversation_id = $${paramIndex}`;
      queryParams.push(conversationId);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get search results
    const searchResult = await db.query<MessageEntity & {
      delivered_to: string[];
      read_by: string[];
    }>(
      `SELECT 
         m.*,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
           ARRAY[]::uuid[]
         ) as delivered_to,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
           ARRAY[]::uuid[]
         ) as read_by
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
       LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
       ${whereClause}
       GROUP BY m.id
       ORDER BY m.timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const messages = searchResult.rows.map(row => 
      ModelTransformer.messageEntityToMessage(
        row,
        row.delivered_to || [],
        row.read_by || []
      )
    );

    return { messages, total };
  }

  /**
   * Search messages within a specific conversation
   */
  static async searchInConversation(
    conversationId: string,
    userId: string,
    query: string,
    mediaType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: Message[]; total: number }> {
    return this.searchMessages(userId, query, conversationId, mediaType, limit, offset);
  }

  /**
   * Get media messages from conversations
   */
  static async getMediaMessages(
    userId: string,
    conversationId?: string,
    mediaTypes?: string[],
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: Message[]; total: number }> {
    // Build search conditions for media only
    let whereClause = `
      WHERE cp.user_id = $1 
      AND m.is_deleted = false
      AND m.type IN ('image', 'video', 'audio', 'document')
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    // Filter by specific media types if provided
    if (mediaTypes && mediaTypes.length > 0) {
      const validTypes = mediaTypes.filter(type => 
        ['image', 'video', 'audio', 'document'].includes(type)
      );
      if (validTypes.length > 0) {
        whereClause = whereClause.replace(
          "m.type IN ('image', 'video', 'audio', 'document')",
          `m.type = ANY($${paramIndex})`
        );
        queryParams.push(validTypes);
        paramIndex++;
      }
    }

    // Add conversation filter if specified
    if (conversationId) {
      whereClause += ` AND m.conversation_id = $${paramIndex}`;
      queryParams.push(conversationId);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get media messages
    const mediaResult = await db.query<MessageEntity & {
      delivered_to: string[];
      read_by: string[];
    }>(
      `SELECT 
         m.*,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
           ARRAY[]::uuid[]
         ) as delivered_to,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
           ARRAY[]::uuid[]
         ) as read_by
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
       LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
       ${whereClause}
       GROUP BY m.id
       ORDER BY m.timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const messages = mediaResult.rows.map(row => 
      ModelTransformer.messageEntityToMessage(
        row,
        row.delivered_to || [],
        row.read_by || []
      )
    );

    return { messages, total };
  }

  /**
   * Get a specific message by ID
   */
  static async getMessageById(
    messageId: string,
    userId: string
  ): Promise<Message | null> {
    const result = await db.query<MessageEntity & {
      delivered_to: string[];
      read_by: string[];
    }>(
      `SELECT 
         m.*,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
           ARRAY[]::uuid[]
         ) as delivered_to,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
           ARRAY[]::uuid[]
         ) as read_by
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
       LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
       WHERE m.id = $1 AND cp.user_id = $2 AND m.is_deleted = false
       GROUP BY m.id`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return ModelTransformer.messageEntityToMessage(
      row,
      row.delivered_to || [],
      row.read_by || []
    );
  }

  /**
   * Get multiple messages by IDs (for socket handlers)
   */
  static async getMessagesByIds(messageIds: string[]): Promise<Message[]> {
    if (messageIds.length === 0) return [];

    const result = await db.query<MessageEntity & {
      delivered_to: string[];
      read_by: string[];
    }>(
      `SELECT 
         m.*,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_delivered.user_id) FILTER (WHERE ms_delivered.status = 'delivered'),
           ARRAY[]::uuid[]
         ) as delivered_to,
         COALESCE(
           ARRAY_AGG(DISTINCT ms_read.user_id) FILTER (WHERE ms_read.status = 'read'),
           ARRAY[]::uuid[]
         ) as read_by
       FROM messages m
       LEFT JOIN message_status ms_delivered ON m.id = ms_delivered.message_id AND ms_delivered.status = 'delivered'
       LEFT JOIN message_status ms_read ON m.id = ms_read.message_id AND ms_read.status = 'read'
       WHERE m.id = ANY($1) AND m.is_deleted = false
       GROUP BY m.id`,
      [messageIds]
    );

    return result.rows.map(row => 
      ModelTransformer.messageEntityToMessage(
        row,
        row.delivered_to || [],
        row.read_by || []
      )
    );
  }

  /**
   * Mark messages as read (alias for socket compatibility)
   */
  static async markAsRead(userId: string, messageIds: string[]): Promise<void> {
    return this.markMessagesAsRead(messageIds, userId);
  }

  /**
   * Edit message content only (for socket compatibility)
   */
  static async editMessageContent(messageId: string, newContent: MessageContent): Promise<Message> {
    // Get the message to find the sender
    const messageResult = await db.query<MessageEntity>(
      'SELECT sender_id FROM messages WHERE id = $1 AND is_deleted = false',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      throw new Error('Message not found');
    }

    const senderId = messageResult.rows[0].sender_id;
    return this.editMessage(messageId, senderId, newContent);
  }

  /**
   * Send push notifications for new messages
   */
  private static async sendMessageNotifications(
    message: Message,
    senderId: string,
    conversationId: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const notificationService = getNotificationService();

      // Get sender and conversation details
      const [senderResult, conversationResult] = await Promise.all([
        db.query('SELECT display_name FROM users WHERE id = $1', [senderId]),
        db.query(
          `SELECT c.type, c.name, 
           COUNT(cp.user_id) as participant_count
           FROM conversations c
           LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
           WHERE c.id = $1
           GROUP BY c.id, c.type, c.name`,
          [conversationId]
        )
      ]);

      if (senderResult.rows.length === 0 || conversationResult.rows.length === 0) {
        logger.warn('Sender or conversation not found for notification');
        return;
      }

      const senderName = senderResult.rows[0].display_name;
      const conversation = conversationResult.rows[0];
      const isGroup = conversation.type === 'group';
      const conversationName = isGroup ? conversation.name : null;

      // Determine message content for notification
      let messageContent: string;
      if (message.type === 'text' && message.content.text) {
        messageContent = message.content.text.length > 100 
          ? message.content.text.substring(0, 100) + '...'
          : message.content.text;
      } else if (message.type === 'image') {
        messageContent = '📷 Photo';
      } else if (message.type === 'video') {
        messageContent = '🎥 Video';
      } else if (message.type === 'audio') {
        messageContent = '🎵 Audio';
      } else if (message.type === 'document') {
        messageContent = `📄 ${message.content.fileName || 'Document'}`;
      } else {
        messageContent = 'Sent a message';
      }

      // Check for mentions in group messages
      const mentionedUsers: string[] = [];
      if (isGroup && message.type === 'text' && message.content.text) {
        // Simple mention detection - look for @username patterns
        // In a real implementation, you'd have a more sophisticated mention system
        const mentionRegex = /@(\w+)/g;
        const mentions = message.content.text.match(mentionRegex);
        if (mentions) {
          // Get user IDs for mentioned usernames (simplified)
          const mentionUsernames = mentions.map(m => m.substring(1));
          const mentionResult = await db.query(
            'SELECT id FROM users WHERE display_name = ANY($1)',
            [mentionUsernames]
          );
          mentionedUsers.push(...mentionResult.rows.map(row => row.id));
        }
      }

      // Send notifications to all recipients
      const notificationPromises = recipientIds.map(async (recipientId) => {
        const isMentioned = mentionedUsers.includes(recipientId);
        
        const notificationData = {
          type: isMentioned ? 'mention' as const : 'message' as const,
          conversationId,
          messageId: message.id,
          senderId,
          senderName,
          conversationName,
          messageContent,
          isGroup,
        };

        await notificationService.queueNotification(recipientId, notificationData);
      });

      await Promise.all(notificationPromises);
      
      logger.debug(`Queued notifications for ${recipientIds.length} recipients`);
    } catch (error) {
      logger.error('Error in sendMessageNotifications:', error);
      // Don't throw - notifications are not critical for message sending
    }
  }
}