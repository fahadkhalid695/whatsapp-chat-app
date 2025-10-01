import { Router, Request, Response } from 'express';
import { MessageService } from '../services/message';
import { authenticateToken } from '../middleware/auth';
import {
  sendMessageSchema,
  editMessageSchema,
  markAsReadSchema,
  getMessagesQuerySchema,
  searchMessagesQuerySchema,
  getMediaMessagesQuerySchema,
  messageIdParamSchema,
  conversationIdParamSchema,
  validateMessageRequest,
  validateMessageParams,
  validateMessageQuery,
} from '../validation/message';
import {
  SendMessageRequest,
  MessageContent,
} from '../types';

const router = Router();

/**
 * POST /messages
 * Send a new message to a conversation
 */
router.post('/',
  authenticateToken,
  validateMessageRequest(sendMessageSchema),
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

      const { conversationId, content, type, replyTo }: SendMessageRequest = req.body;
      
      const message = await MessageService.sendMessage(
        req.user.userId,
        conversationId,
        content,
        type,
        replyTo
      );

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Send message error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not a participant')) {
        statusCode = 403;
        errorCode = 'MSG_001';
      } else if (errorMessage.includes('Reply target message not found')) {
        statusCode = 400;
        errorCode = 'MSG_002';
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
 * GET /conversations/:conversationId/messages
 * Get messages for a specific conversation with pagination
 */
router.get('/conversations/:conversationId/messages',
  authenticateToken,
  validateMessageParams(conversationIdParamSchema),
  validateMessageQuery(getMessagesQuerySchema),
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

      const { conversationId } = req.params;
      const { limit, offset, before } = req.query as any;
      
      const result = await MessageService.getMessages(
        conversationId,
        req.user.userId,
        limit,
        offset,
        before ? new Date(before) : undefined
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: (offset || 0) + (limit || 50) < result.total,
        },
      });
    } catch (error) {
      console.error('Get messages error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get messages';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not a participant')) {
        statusCode = 403;
        errorCode = 'MSG_001';
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
 * GET /messages/:id
 * Get a specific message by ID
 */
router.get('/:id',
  authenticateToken,
  validateMessageParams(messageIdParamSchema),
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
      
      const message = await MessageService.getMessageById(id, req.user.userId);
      
      if (!message) {
        res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'MSG_003',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Get message error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get message',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * PUT /messages/:id
 * Edit a message (text messages only)
 */
router.put('/:id',
  authenticateToken,
  validateMessageParams(messageIdParamSchema),
  validateMessageRequest(editMessageSchema),
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
      const { content }: { content: MessageContent } = req.body;
      
      const message = await MessageService.editMessage(id, req.user.userId, content);

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Edit message error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit message';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found') || 
          errorMessage.includes('not authorized') ||
          errorMessage.includes('cannot be edited')) {
        statusCode = 404;
        errorCode = 'MSG_004';
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
 * DELETE /messages/:id
 * Delete a message (soft delete)
 */
router.delete('/:id',
  authenticateToken,
  validateMessageParams(messageIdParamSchema),
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
      
      await MessageService.deleteMessage(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      console.error('Delete message error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not found') || errorMessage.includes('not authorized')) {
        statusCode = 404;
        errorCode = 'MSG_005';
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
 * POST /messages/read
 * Mark messages as read
 */
router.post('/read',
  authenticateToken,
  validateMessageRequest(markAsReadSchema),
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

      const { messageIds }: { messageIds: string[] } = req.body;
      
      await MessageService.markMessagesAsRead(messageIds, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark messages as read',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /messages/search
 * Search messages across conversations
 */
router.get('/search',
  authenticateToken,
  validateMessageQuery(searchMessagesQuerySchema),
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

      const { q, conversationId, mediaType, limit, offset } = req.query as any;
      
      const result = await MessageService.searchMessages(
        req.user.userId,
        q,
        conversationId,
        mediaType,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: (offset || 0) + (limit || 50) < result.total,
        },
        query: q,
      });
    } catch (error) {
      console.error('Search messages error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to search messages',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /conversations/:conversationId/messages/search
 * Search messages within a specific conversation
 */
router.get('/conversations/:conversationId/messages/search',
  authenticateToken,
  validateMessageParams(conversationIdParamSchema),
  validateMessageQuery(searchMessagesQuerySchema),
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

      const { conversationId } = req.params;
      const { q, mediaType, limit, offset } = req.query as any;
      
      const result = await MessageService.searchInConversation(
        conversationId,
        req.user.userId,
        q,
        mediaType,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: (offset || 0) + (limit || 50) < result.total,
        },
        query: q,
        conversationId,
      });
    } catch (error) {
      console.error('Search conversation messages error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to search messages';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('not a participant')) {
        statusCode = 403;
        errorCode = 'MSG_001';
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
 * GET /messages/media
 * Get media messages across conversations
 */
router.get('/media',
  authenticateToken,
  validateMessageQuery(getMediaMessagesQuerySchema),
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

      const { conversationId, mediaTypes, limit, offset } = req.query as any;
      
      const result = await MessageService.getMediaMessages(
        req.user.userId,
        conversationId,
        mediaTypes,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: (offset || 0) + (limit || 50) < result.total,
        },
        filters: {
          conversationId,
          mediaTypes,
        },
      });
    } catch (error) {
      console.error('Get media messages error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get media messages',
        code: 'SERVER_ERROR',
      });
    }
  }
);

export default router;