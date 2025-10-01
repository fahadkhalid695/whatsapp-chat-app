import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { ModelTransformer } from '../models';
import {
  Conversation,
  ConversationEntity,
  CreateConversationRequest,
} from '../types';

export class ConversationService {
  /**
   * Create a new conversation (direct or group)
   */
  static async createConversation(
    creatorId: string,
    request: CreateConversationRequest
  ): Promise<Conversation> {
    const { type, name, participants } = request;

    // Validate participants
    if (participants.length < 1) {
      throw new Error('Conversation must have at least one participant besides creator');
    }

    // For direct conversations, ensure only 2 participants total (creator + 1 other)
    if (type === 'direct' && participants.length !== 1) {
      throw new Error('Direct conversations must have exactly 2 participants');
    }

    // For group conversations, ensure name is provided
    if (type === 'group' && !name?.trim()) {
      throw new Error('Group conversations must have a name');
    }

    // Check if all participants exist
    const allParticipants = [creatorId, ...participants];
    for (const participantId of allParticipants) {
      const userResult = await db.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [participantId]);
      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${participantId} not found`);
      }
    }

    // For direct conversations, check if conversation already exists
    if (type === 'direct') {
      const existingConversation = await this.findDirectConversation(creatorId, participants[0]);
      if (existingConversation) {
        return existingConversation;
      }
    }

    return await db.transaction(async (client) => {
      // Create conversation
      const conversationId = uuidv4();
      const conversationData = {
        id: conversationId,
        type,
        name: type === 'group' ? name : null,
        last_activity: new Date(),
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const conversationResult = await client.query(
        `INSERT INTO conversations (id, type, name, last_activity, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          conversationData.id,
          conversationData.type,
          conversationData.name,
          conversationData.last_activity,
          conversationData.is_archived,
          conversationData.created_at,
          conversationData.updated_at,
        ]
      );

      const conversationEntity = conversationResult.rows[0] as ConversationEntity;

      // Add participants
      const participantInserts = allParticipants.map((participantId) => {
        return client.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, is_admin, is_muted, joined_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            conversationId,
            participantId,
            participantId === creatorId, // Creator is admin for group chats
            false,
            new Date(),
          ]
        );
      });

      await Promise.all(participantInserts);

      // Get admin list (for group chats)
      const admins = type === 'group' ? [creatorId] : [];

      return ModelTransformer.conversationEntityToConversation(
        conversationEntity,
        allParticipants,
        admins
      );
    });
  }

  /**
   * Get conversations for a user with pagination and sorting
   */
  static async getUserConversations(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
      sortBy?: 'last_activity' | 'created_at';
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      includeArchived = false,
      sortBy = 'last_activity',
      sortOrder = 'DESC',
    } = options;

    // Build WHERE clause
    const whereConditions = ['cp.user_id = $1'];
    const queryParams: any[] = [userId];

    if (!includeArchived) {
      whereConditions.push('NOT c.is_archived');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get conversations with pagination
    const conversationsQuery = `
      SELECT DISTINCT c.*
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      ${whereClause}
      ORDER BY c.${sortBy} ${sortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);
    const conversationsResult = await db.query<ConversationEntity>(conversationsQuery, queryParams);

    // Get participants and admins for each conversation
    const conversations: Conversation[] = [];
    for (const conversationEntity of conversationsResult.rows) {
      const participantsResult = await db.query(
        `SELECT user_id, is_admin, is_muted FROM conversation_participants WHERE conversation_id = $1`,
        [conversationEntity.id]
      );

      const participants = participantsResult.rows.map(row => row.user_id);
      const admins = participantsResult.rows
        .filter(row => row.is_admin)
        .map(row => row.user_id);

      // Get user's mute status for this conversation
      const userParticipant = participantsResult.rows.find(row => row.user_id === userId);
      const isMuted = userParticipant?.is_muted || false;

      const conversation = ModelTransformer.conversationEntityToConversation(
        conversationEntity,
        participants,
        admins
      );
      conversation.isMuted = isMuted;

      conversations.push(conversation);
    }

    return { conversations, total };
  }

  /**
   * Get a specific conversation by ID
   */
  static async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    // Check if user is participant
    const isParticipant = await db.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (isParticipant.rows.length === 0) {
      throw new Error('User is not a participant in this conversation');
    }

    const conversationResult = await db.query<ConversationEntity>(
      `SELECT * FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      return null;
    }

    const conversationEntity = conversationResult.rows[0];

    // Get participants and admins
    const participantsResult = await db.query(
      `SELECT user_id, is_admin, is_muted FROM conversation_participants WHERE conversation_id = $1`,
      [conversationId]
    );

    const participants = participantsResult.rows.map(row => row.user_id);
    const admins = participantsResult.rows
      .filter(row => row.is_admin)
      .map(row => row.user_id);

    // Get user's mute status
    const userParticipant = participantsResult.rows.find(row => row.user_id === userId);
    const isMuted = userParticipant?.is_muted || false;

    const conversation = ModelTransformer.conversationEntityToConversation(
      conversationEntity,
      participants,
      admins
    );
    conversation.isMuted = isMuted;

    return conversation;
  }

  /**
   * Add participants to a group conversation
   */
  static async addParticipants(
    conversationId: string,
    adminId: string,
    participantIds: string[]
  ): Promise<void> {
    // Verify conversation exists and user is admin
    const conversation = await this.getConversationById(conversationId, adminId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only add participants to group conversations');
    }

    if (!conversation.admins?.includes(adminId)) {
      throw new Error('Only group admins can add participants');
    }

    // Check if all new participants exist and are not already in the conversation
    for (const participantId of participantIds) {
      const userResult = await db.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [participantId]);
      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${participantId} not found`);
      }

      const alreadyParticipant = await db.query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, participantId]
      );

      if (alreadyParticipant.rows.length > 0) {
        throw new Error(`User ${participantId} is already a participant`);
      }
    }

    // Add participants
    await db.transaction(async (client) => {
      const participantInserts = participantIds.map(participantId => {
        return client.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, is_admin, is_muted, joined_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [conversationId, participantId, false, false, new Date()]
        );
      });

      await Promise.all(participantInserts);

      // Update conversation last activity
      await client.query(
        `UPDATE conversations SET last_activity = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
    });
  }

  /**
   * Remove participants from a group conversation
   */
  static async removeParticipants(
    conversationId: string,
    adminId: string,
    participantIds: string[]
  ): Promise<void> {
    // Verify conversation exists and user is admin
    const conversation = await this.getConversationById(conversationId, adminId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only remove participants from group conversations');
    }

    if (!conversation.admins?.includes(adminId)) {
      throw new Error('Only group admins can remove participants');
    }

    // Prevent removing all admins
    const remainingAdmins = conversation.admins.filter(admin => !participantIds.includes(admin));
    if (remainingAdmins.length === 0) {
      throw new Error('Cannot remove all group admins');
    }

    // Remove participants
    await db.transaction(async (client) => {
      for (const participantId of participantIds) {
        await client.query(
          `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, participantId]
        );
      }

      // Update conversation last activity
      await client.query(
        `UPDATE conversations SET last_activity = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
    });
  }

  /**
   * Archive/unarchive a conversation
   */
  static async archiveConversation(conversationId: string, userId: string, archive: boolean): Promise<void> {
    // Verify user is participant
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or user is not a participant');
    }

    await db.query(
      `UPDATE conversations SET is_archived = $1, updated_at = NOW() WHERE id = $2`,
      [archive, conversationId]
    );
  }

  /**
   * Mute/unmute a conversation for a specific user
   */
  static async muteConversation(conversationId: string, userId: string, mute: boolean): Promise<void> {
    // Verify user is participant
    const isParticipant = await db.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (isParticipant.rows.length === 0) {
      throw new Error('User is not a participant in this conversation');
    }

    await db.query(
      `UPDATE conversation_participants SET is_muted = $1 WHERE conversation_id = $2 AND user_id = $3`,
      [mute, conversationId, userId]
    );
  }

  /**
   * Promote/demote group admin
   */
  static async updateAdminStatus(
    conversationId: string,
    adminId: string,
    targetUserId: string,
    makeAdmin: boolean
  ): Promise<void> {
    // Verify conversation exists and user is admin
    const conversation = await this.getConversationById(conversationId, adminId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Admin management only available for group conversations');
    }

    if (!conversation.admins?.includes(adminId)) {
      throw new Error('Only group admins can manage admin status');
    }

    // Check if target user is participant
    if (!conversation.participants.includes(targetUserId)) {
      throw new Error('Target user is not a participant in this conversation');
    }

    // If demoting admin, ensure at least one admin remains
    if (!makeAdmin && conversation.admins.includes(targetUserId)) {
      const remainingAdmins = conversation.admins.filter(admin => admin !== targetUserId);
      if (remainingAdmins.length === 0) {
        throw new Error('Cannot remove the last group admin');
      }
    }

    await db.query(
      `UPDATE conversation_participants SET is_admin = $1 WHERE conversation_id = $2 AND user_id = $3`,
      [makeAdmin, conversationId, targetUserId]
    );
  }

  /**
   * Leave a conversation
   */
  static async leaveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or user is not a participant');
    }

    if (conversation.type === 'direct') {
      throw new Error('Cannot leave direct conversations');
    }

    // If user is admin, check if other admins exist
    if (conversation.admins?.includes(userId)) {
      const otherAdmins = conversation.admins.filter(admin => admin !== userId);
      if (otherAdmins.length === 0 && conversation.participants.length > 1) {
        throw new Error('Cannot leave group as the only admin. Promote another user to admin first.');
      }
    }

    await db.query(
      `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
  }

  /**
   * Find existing direct conversation between two users
   */
  private static async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
    const result = await db.query<ConversationEntity>(
      `SELECT c.* FROM conversations c
       INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
       INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
       WHERE c.type = 'direct'`,
      [userId1, userId2]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const conversationEntity = result.rows[0];
    const participants = [userId1, userId2];

    return ModelTransformer.conversationEntityToConversation(
      conversationEntity,
      participants,
      []
    );
  }

  /**
   * Update conversation last activity
   */
  static async updateLastActivity(conversationId: string): Promise<void> {
    await db.query(
      `UPDATE conversations SET last_activity = NOW(), updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );
  }

  /**
   * Update conversation name (for group chats)
   */
  static async updateConversationName(conversationId: string, name: string): Promise<void> {
    await db.query(
      `UPDATE conversations SET name = $1, updated_at = NOW() WHERE id = $2`,
      [name, conversationId]
    );
  }
}