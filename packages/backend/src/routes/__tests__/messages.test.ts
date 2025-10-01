import request from 'supertest';
import express from 'express';
import messageRoutes from '../messages';
import { MessageService } from '../../services/message';
import { authenticateToken } from '../../middleware/auth';
import { MessageType } from '../../types';

// Mock dependencies
jest.mock('../../services/message');
jest.mock('../../middleware/auth');

const mockMessageService = MessageService as jest.Mocked<typeof MessageService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

// Mock user for authenticated requests
const mockUser = {
  userId: 'user-1',
  phoneNumber: '+1234567890',
};

describe('Message Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to always pass
    mockAuthenticateToken.mockImplementation((req: any, _res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/messages', () => {
    const validMessageData = {
      conversationId: 'conv-1',
      content: { text: 'Hello world' },
      type: 'text',
    };

    it('should send message successfully', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: { text: 'Hello world' },
        type: 'text' as MessageType,
        timestamp: new Date(),
        deliveredTo: ['user-2'],
        readBy: [],
        isDeleted: false,
      };

      mockMessageService.sendMessage.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/messages')
        .send(validMessageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMessage);
      expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
        { text: 'Hello world' },
        'text',
        undefined
      );
    });

    it('should send message with reply successfully', async () => {
      const messageDataWithReply = {
        ...validMessageData,
        replyTo: 'msg-original',
      };

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: { text: 'Hello world' },
        type: 'text' as MessageType,
        timestamp: new Date(),
        deliveredTo: ['user-2'],
        readBy: [],
        isDeleted: false,
        replyTo: 'msg-original',
      };

      mockMessageService.sendMessage.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/messages')
        .send(messageDataWithReply)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
        { text: 'Hello world' },
        'text',
        'msg-original'
      );
    });

    it('should return 400 for invalid message data', async () => {
      const invalidData = {
        conversationId: 'invalid-uuid',
        content: {},
        type: 'invalid-type',
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 403 if user is not a participant', async () => {
      mockMessageService.sendMessage.mockRejectedValue(
        new Error('User is not a participant in this conversation')
      );

      const response = await request(app)
        .post('/api/messages')
        .send(validMessageData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MSG_001');
    });
  });

  describe('GET /api/messages/conversations/:conversationId/messages', () => {
    it('should get messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: { text: 'Hello' },
          type: 'text' as MessageType,
          timestamp: new Date(),
          deliveredTo: [],
          readBy: [],
          isDeleted: false,
        },
      ];

      mockMessageService.getMessages.mockResolvedValue({
        messages: mockMessages,
        total: 1,
      });

      const response = await request(app)
        .get('/api/messages/conversations/conv-1/messages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMessages);
      expect(response.body.pagination.total).toBe(1);
      expect(mockMessageService.getMessages).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        50,
        0,
        undefined
      );
    });

    it('should get messages with pagination', async () => {
      mockMessageService.getMessages.mockResolvedValue({
        messages: [],
        total: 0,
      });

      await request(app)
        .get('/api/messages/conversations/conv-1/messages?limit=20&offset=10')
        .expect(200);

      expect(mockMessageService.getMessages).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        20,
        10,
        undefined
      );
    });

    it('should get messages with before timestamp', async () => {
      const beforeDate = new Date('2024-01-01T00:00:00Z');
      
      mockMessageService.getMessages.mockResolvedValue({
        messages: [],
        total: 0,
      });

      await request(app)
        .get(`/api/messages/conversations/conv-1/messages?before=${beforeDate.toISOString()}`)
        .expect(200);

      expect(mockMessageService.getMessages).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        50,
        0,
        beforeDate
      );
    });

    it('should return 403 if user is not a participant', async () => {
      mockMessageService.getMessages.mockRejectedValue(
        new Error('User is not a participant in this conversation')
      );

      const response = await request(app)
        .get('/api/messages/conversations/conv-1/messages')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MSG_001');
    });
  });

  describe('GET /api/messages/:id', () => {
    it('should get message by ID successfully', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: { text: 'Hello' },
        type: 'text' as MessageType,
        timestamp: new Date(),
        deliveredTo: [],
        readBy: [],
        isDeleted: false,
      };

      mockMessageService.getMessageById.mockResolvedValue(mockMessage);

      const response = await request(app)
        .get('/api/messages/msg-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMessage);
      expect(mockMessageService.getMessageById).toHaveBeenCalledWith('msg-1', 'user-1');
    });

    it('should return 404 if message not found', async () => {
      mockMessageService.getMessageById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/messages/msg-1')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MSG_003');
    });
  });

  describe('PUT /api/messages/:id', () => {
    const validEditData = {
      content: { text: 'Updated message' },
    };

    it('should edit message successfully', async () => {
      const mockUpdatedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: { text: 'Updated message' },
        type: 'text' as MessageType,
        timestamp: new Date(),
        deliveredTo: [],
        readBy: [],
        isDeleted: false,
        editedAt: new Date(),
      };

      mockMessageService.editMessage.mockResolvedValue(mockUpdatedMessage);

      const response = await request(app)
        .put('/api/messages/msg-1')
        .send(validEditData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedMessage);
      expect(mockMessageService.editMessage).toHaveBeenCalledWith(
        'msg-1',
        'user-1',
        { text: 'Updated message' }
      );
    });

    it('should return 400 for invalid edit data', async () => {
      const invalidData = {
        content: { text: '' }, // Empty text
      };

      const response = await request(app)
        .put('/api/messages/msg-1')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 if message cannot be edited', async () => {
      mockMessageService.editMessage.mockRejectedValue(
        new Error('Message not found, you are not authorized to edit it, or it cannot be edited')
      );

      const response = await request(app)
        .put('/api/messages/msg-1')
        .send(validEditData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MSG_004');
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should delete message successfully', async () => {
      mockMessageService.deleteMessage.mockResolvedValue();

      const response = await request(app)
        .delete('/api/messages/msg-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message deleted successfully');
      expect(mockMessageService.deleteMessage).toHaveBeenCalledWith('msg-1', 'user-1');
    });

    it('should return 404 if message not found or not authorized', async () => {
      mockMessageService.deleteMessage.mockRejectedValue(
        new Error('Message not found or you are not authorized to delete it')
      );

      const response = await request(app)
        .delete('/api/messages/msg-1')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MSG_005');
    });
  });

  describe('POST /api/messages/read', () => {
    it('should mark messages as read successfully', async () => {
      const messageIds = ['msg-1', 'msg-2'];
      mockMessageService.markMessagesAsRead.mockResolvedValue();

      const response = await request(app)
        .post('/api/messages/read')
        .send({ messageIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Messages marked as read');
      expect(mockMessageService.markMessagesAsRead).toHaveBeenCalledWith(messageIds, 'user-1');
    });

    it('should return 400 for invalid message IDs', async () => {
      const response = await request(app)
        .post('/api/messages/read')
        .send({ messageIds: [] }) // Empty array
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/messages/search', () => {
    it('should search messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: { text: 'Hello world' },
          type: 'text' as MessageType,
          timestamp: new Date(),
          deliveredTo: [],
          readBy: [],
          isDeleted: false,
        },
      ];

      mockMessageService.searchMessages.mockResolvedValue({
        messages: mockMessages,
        total: 1,
      });

      const response = await request(app)
        .get('/api/messages/search?q=hello')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMessages);
      expect(response.body.query).toBe('hello');
      expect(mockMessageService.searchMessages).toHaveBeenCalledWith(
        'user-1',
        'hello',
        undefined,
        50,
        0
      );
    });

    it('should search messages in specific conversation', async () => {
      mockMessageService.searchMessages.mockResolvedValue({
        messages: [],
        total: 0,
      });

      await request(app)
        .get('/api/messages/search?q=hello&conversationId=conv-1')
        .expect(200);

      expect(mockMessageService.searchMessages).toHaveBeenCalledWith(
        'user-1',
        'hello',
        'conv-1',
        50,
        0
      );
    });

    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/messages/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });
});