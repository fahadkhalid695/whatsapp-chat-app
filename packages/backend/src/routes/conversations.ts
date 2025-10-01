import { Router, Request, Response } from 'express';
import { ConversationService } from '../services/conversation';
import { authenticateToken } from '../middleware/auth';
import {
  createConversationSchema,
  updateConversationSchema,
  addParticipantsSchema,
  removeParticipantsSchema,
  updateAdminStatusSchema,
  archiveConversationSchema,
  muteConversationSchema,
  conversationListQuerySchema,
  conversationIdParamSchema,
  validateConversationRequest,
  validateConversationParams,
  validateConversationQuery,
} from '../validation/conversation';
import {
  CreateConversationRequest,
  UpdateConversationRequest,
  AddParticipantsRequest,
  RemoveParticipantsRequest,
  UpdateAdminStatusRequest,
  ConversationListOptions,
} from '../types';

const router = Router();

/**
 * POST /conversations
 * Create a new conversation (direct or group)
 */
router.post('/',
  authenticateToken,
  validateConversationRequest(createConversationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const request: CreateConversationRequest = req.body;
      
      const conversation = await ConversationService.createConversation(req.user.userId, request);

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('must have exactly 2 participants') ||
          errorMessage.includes('must have at least one participant') ||
          errorMessage.includes('must have a name')) {
        statusCode = 400;
        errorCode = 'CONV_001';
      } else if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'USER_001';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * GET /conversations
 * Get user's conversations with pagination and sorting
 */
router.get('/',
  authenticateToken,
  validateConversationQuery(conversationListQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const options: ConversationListOptions = req.query as any;
      
      const result = await ConversationService.getUserConversations(req.user.userId, options);

      res.status(200).json({
        success: true,
        data: result.conversations,
        pagination: {
          total: result.total,
          limit: options.limit || 20,
          offset: options.offset || 0,
          hasMore: (options.offset || 0) + (options.limit || 20) < result.total,
        },
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get conversations',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /conversations/:id
 * Get a specific conversation by ID
 */
router.get('/:id',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      
      const conversation = await ConversationService.getConversationById(id, req.user.userId);
      
      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
          code: 'CONV_002',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get conversation';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not a participant')) {
        statusCode = 403;
        errorCode = 'CONV_003';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * PUT /conversations/:id
 * Update conversation details (name, etc.)
 */
router.put('/:id',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(updateConversationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const updates: UpdateConversationRequest = req.body;
      
      // Get conversation to verify user is admin (for group chats)
      const conversation = await ConversationService.getConversationById(id, req.user.userId);
      
      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
          code: 'CONV_002',
        });
        return;
      }

      if (conversation.type === 'group' && !conversation.admins?.includes(req.user.userId)) {
        res.status(403).json({
          success: false,
          error: 'Only group admins can update conversation details',
          code: 'CONV_004',
        });
        return;
      }

      // Update conversation (currently only name is supported)
      if (updates.name) {
        await ConversationService.updateConversationName(id, updates.name);
      }

      // Get updated conversation
      const updatedConversation = await ConversationService.getConversationById(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: updatedConversation,
      });
    } catch (error) {
      console.error('Update conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation';
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /conversations/:id/participants
 * Add participants to a group conversation
 */
router.post('/:id/participants',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(addParticipantsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const { participantIds }: AddParticipantsRequest = req.body;
      
      await ConversationService.addParticipants(id, req.user.userId, participantIds);

      res.status(200).json({
        success: true,
        message: 'Participants added successfully',
      });
    } catch (error) {
      console.error('Add participants error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to add participants';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONV_002';
      } else if (errorMessage.includes('Only group admins') ||
                 errorMessage.includes('group conversations')) {
        statusCode = 403;
        errorCode = 'CONV_004';
      } else if (errorMessage.includes('already a participant')) {
        statusCode = 400;
        errorCode = 'CONV_005';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * DELETE /conversations/:id/participants
 * Remove participants from a group conversation
 */
router.delete('/:id/participants',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(removeParticipantsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const { participantIds }: RemoveParticipantsRequest = req.body;
      
      await ConversationService.removeParticipants(id, req.user.userId, participantIds);

      res.status(200).json({
        success: true,
        message: 'Participants removed successfully',
      });
    } catch (error) {
      console.error('Remove participants error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove participants';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONV_002';
      } else if (errorMessage.includes('Only group admins') ||
                 errorMessage.includes('group conversations') ||
                 errorMessage.includes('Cannot remove all group admins')) {
        statusCode = 403;
        errorCode = 'CONV_004';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * PUT /conversations/:id/archive
 * Archive or unarchive a conversation
 */
router.put('/:id/archive',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(archiveConversationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const { archive } = req.body;
      
      await ConversationService.archiveConversation(id, req.user.userId, archive);

      res.status(200).json({
        success: true,
        message: `Conversation ${archive ? 'archived' : 'unarchived'} successfully`,
      });
    } catch (error) {
      console.error('Archive conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive conversation';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found') || errorMessage.includes('not a participant')) {
        statusCode = 404;
        errorCode = 'CONV_002';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * PUT /conversations/:id/mute
 * Mute or unmute a conversation for the current user
 */
router.put('/:id/mute',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(muteConversationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const { mute } = req.body;
      
      await ConversationService.muteConversation(id, req.user.userId, mute);

      res.status(200).json({
        success: true,
        message: `Conversation ${mute ? 'muted' : 'unmuted'} successfully`,
      });
    } catch (error) {
      console.error('Mute conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to mute conversation';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not a participant')) {
        statusCode = 403;
        errorCode = 'CONV_003';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * PUT /conversations/:id/admin
 * Promote or demote a user to/from group admin
 */
router.put('/:id/admin',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  validateConversationRequest(updateAdminStatusSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      const { targetUserId, makeAdmin }: UpdateAdminStatusRequest = req.body;
      
      await ConversationService.updateAdminStatus(id, req.user.userId, targetUserId, makeAdmin);

      res.status(200).json({
        success: true,
        message: `User ${makeAdmin ? 'promoted to' : 'demoted from'} admin successfully`,
      });
    } catch (error) {
      console.error('Update admin status error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update admin status';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'CONV_002';
      } else if (errorMessage.includes('Only group admins') ||
                 errorMessage.includes('group conversations') ||
                 errorMessage.includes('Cannot remove the last group admin')) {
        statusCode = 403;
        errorCode = 'CONV_004';
      } else if (errorMessage.includes('not a participant')) {
        statusCode = 400;
        errorCode = 'CONV_006';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * DELETE /conversations/:id/leave
 * Leave a group conversation
 */
router.delete('/:id/leave',
  authenticateToken,
  validateConversationParams(conversationIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      
      await ConversationService.leaveConversation(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Left conversation successfully',
      });
    } catch (error) {
      console.error('Leave conversation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave conversation';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found') || errorMessage.includes('not a participant')) {
        statusCode = 404;
        errorCode = 'CONV_002';
      } else if (errorMessage.includes('Cannot leave direct conversations') ||
                 errorMessage.includes('Cannot leave group as the only admin')) {
        statusCode = 403;
        errorCode = 'CONV_007';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

export default router;