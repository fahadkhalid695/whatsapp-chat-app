import { MessageService } from '../message';
import { db } from '../../database/connection';
import { MessageType, MessageContent } from '../../types';

// Mock the database connection
jest.mock('../../database/connection');
const mockDb = db as jest.Mocked<typeof db>;

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    const mockSenderId = 'user-1';
    const mockConversationId = 'conv-1';
    const mockContent: MessageContent = { text: 'Hello world' };
    const mockType: MessageType = 'text';

    it('should send a message successfully', async () => {
      const mockMessageEntity = {
        id: 'msg-1',
        conversation_id: mockConversationId,
        sender_id: mockSenderId,
        content: mockContent,
        type: mockType,
        timestamp: new Date(),
        is_deleted: false,
        reply_to: null,
        edited_at: null,
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ user_id: mockSenderId }] }) // participant check
            .mockResolvedValueOnce({ rows: [mockMessageEntity] }) // insert message
            .mockResolvedValueOnce({ rows: [] }) // update conversation
            .mockResolvedValueOnce({ rows: [{ user_id: 'user-2' }, { user_id: mockSenderId }] }) // get participants
            .mockResolvedValueOnce({ rows: [] }), // insert delivery status
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      const result = await MessageService.sendMessage(
        mockSenderId,
        mockConversationId,
        mockContent,
        mockType
      );

      expect(result).toEqual({
        id: 'msg-1',
        conversationId: mockConversationId,
        senderId: mockSenderId,
        content: mockContent,
        type: mockType,
        timestamp: mockMessageEntity.timestamp,
        deliveredTo: ['user-2'],
        readBy: [],
        isDeleted: false,
        replyTo: null,
        editedAt: null,
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if user is not a participant', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }), // participant check fails
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.sendMessage(mockSenderId, mockConversationId, mockContent, mockType)
      ).rejects.toThrow('User is not a participant in this conversation');
    });

    it('should throw error if reply target message not found', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ user_id: mockSenderId }] }) // participant check
            .mockResolvedValueOnce({ rows: [] }), // reply check fails
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.sendMessage(mockSenderId, mockConversationId, mockContent, mockType, 'invalid-reply-id')
      ).rejects.toThrow('Reply target message not found or deleted');
    });
  });

  describe('getMessages', () => {
    const mockConversationId = 'conv-1';
    const mockUserId = 'user-1';

    it('should get messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: mockConversationId,
          sender_id: mockUserId,
          content: { text: 'Hello' },
          type: 'text',
          timestamp: new Date(),
          is_deleted: false,
          reply_to: null,
          edited_at: null,
          delivered_to: ['user-2'],
          read_by: [],
        },
      ];

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ user_id: mockUserId }] }) // participant check
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockMessages }); // messages query

      const result = await MessageService.getMessages(mockConversationId, mockUserId);

      expect(result.total).toBe(1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-1');
      expect(result.messages[0].content.text).toBe('Hello');
    });

    it('should throw error if user is not a participant', async () => {
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] }); // participant check fails

      await expect(
        MessageService.getMessages(mockConversationId, mockUserId)
      ).rejects.toThrow('User is not a participant in this conversation');
    });
  });

  describe('markMessagesAsRead', () => {
    const mockMessageIds = ['msg-1', 'msg-2'];
    const mockUserId = 'user-1';

    it('should mark messages as read successfully', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ 
              rows: [
                { id: 'msg-1', conversation_id: 'conv-1' },
                { id: 'msg-2', conversation_id: 'conv-1' }
              ] 
            }) // verify messages
            .mockResolvedValueOnce({ rows: [] }), // insert read status
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.markMessagesAsRead(mockMessageIds, mockUserId)
      ).resolves.not.toThrow();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should handle empty message IDs array', async () => {
      await expect(
        MessageService.markMessagesAsRead([], mockUserId)
      ).resolves.not.toThrow();

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    const mockMessageId = 'msg-1';
    const mockUserId = 'user-1';

    it('should delete message successfully', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ 
              rows: [{ 
                id: mockMessageId,
                sender_id: mockUserId,
                is_deleted: false 
              }] 
            }) // verify message
            .mockResolvedValueOnce({ rows: [] }), // soft delete
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.deleteMessage(mockMessageId, mockUserId)
      ).resolves.not.toThrow();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if message not found or not authorized', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }), // verify message fails
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.deleteMessage(mockMessageId, mockUserId)
      ).rejects.toThrow('Message not found or you are not authorized to delete it');
    });
  });

  describe('editMessage', () => {
    const mockMessageId = 'msg-1';
    const mockUserId = 'user-1';
    const mockNewContent: MessageContent = { text: 'Updated message' };

    it('should edit message successfully', async () => {
      const mockUpdatedMessage = {
        id: mockMessageId,
        conversation_id: 'conv-1',
        sender_id: mockUserId,
        content: mockNewContent,
        type: 'text',
        timestamp: new Date(),
        is_deleted: false,
        reply_to: null,
        edited_at: new Date(),
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ 
              rows: [{ 
                id: mockMessageId,
                sender_id: mockUserId,
                type: 'text',
                is_deleted: false 
              }] 
            }) // verify message
            .mockResolvedValueOnce({ rows: [mockUpdatedMessage] }) // update message
            .mockResolvedValueOnce({ 
              rows: [{ delivered_to: ['user-2'], read_by: [] }] 
            }), // get status
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      const result = await MessageService.editMessage(mockMessageId, mockUserId, mockNewContent);

      expect(result.id).toBe(mockMessageId);
      expect(result.content.text).toBe('Updated message');
      expect(result.editedAt).toBeDefined();
    });

    it('should throw error if message cannot be edited', async () => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }), // verify message fails
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await expect(
        MessageService.editMessage(mockMessageId, mockUserId, mockNewContent)
      ).rejects.toThrow('Message not found, you are not authorized to edit it, or it cannot be edited');
    });
  });

  describe('searchMessages', () => {
    const mockUserId = 'user-1';
    const mockQuery = 'hello';

    it('should search messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: mockUserId,
          content: { text: 'Hello world' },
          type: 'text',
          timestamp: new Date(),
          is_deleted: false,
          reply_to: null,
          edited_at: null,
          delivered_to: ['user-2'],
          read_by: [],
        },
      ];

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockMessages }); // search query

      const result = await MessageService.searchMessages(mockUserId, mockQuery);

      expect(result.total).toBe(1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toBe('Hello world');
    });

    it('should search messages in specific conversation', async () => {
      const mockConversationId = 'conv-1';

      mockDb.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // search query

      const result = await MessageService.searchMessages(
        mockUserId, 
        mockQuery, 
        mockConversationId
      );

      expect(result.total).toBe(0);
      expect(result.messages).toHaveLength(0);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.conversation_id = $3'),
        expect.arrayContaining([mockUserId, `%${mockQuery}%`, mockConversationId])
      );
    });
  });

  describe('getMessageById', () => {
    const mockMessageId = 'msg-1';
    const mockUserId = 'user-1';

    it('should get message by ID successfully', async () => {
      const mockMessage = {
        id: mockMessageId,
        conversation_id: 'conv-1',
        sender_id: mockUserId,
        content: { text: 'Hello' },
        type: 'text',
        timestamp: new Date(),
        is_deleted: false,
        reply_to: null,
        edited_at: null,
        delivered_to: ['user-2'],
        read_by: [],
      };

      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [mockMessage] });

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(mockMessageId);
      expect(result!.content.text).toBe('Hello');
    });

    it('should return null if message not found', async () => {
      mockDb.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      const result = await MessageService.getMessageById(mockMessageId, mockUserId);

      expect(result).toBeNull();
    });
  });
});