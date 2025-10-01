import { ConversationService } from '../conversation';
import { db } from '../../database/connection';
import { QueryResult, QueryResultRow } from 'pg';
import {
  CreateConversationRequest,
  Conversation,
  ConversationEntity,
} from '../../types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockUuidv4 = require('uuid').v4;

// Mock the database connection
jest.mock('../../database/connection');
const mockDb = db as jest.Mocked<typeof db>;

// Helper function to create mock query results
const createMockQueryResult = <T extends QueryResultRow = any>(rows: T[], rowCount?: number): QueryResult<T> => ({
  rows,
  command: 'SELECT',
  rowCount: rowCount ?? rows.length,
  oid: 0,
  fields: [],
});

describe('ConversationService', () => {
  const mockUserId1 = 'user-1-uuid';
  const mockUserId2 = 'user-2-uuid';
  const mockUserId3 = 'user-3-uuid';
  const mockConversationId = 'conversation-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Set up uuid mock to return a specific value for conversation creation
    mockUuidv4.mockReturnValue(mockConversationId);
  });

  describe('createConversation', () => {
    it('should create a direct conversation successfully', async () => {
      const request: CreateConversationRequest = {
        type: 'direct',
        participants: [mockUserId2],
      };

      const mockConversationEntity: ConversationEntity = {
        id: mockConversationId,
        type: 'direct',
        last_activity: new Date(),
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 1 exists
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 2 exists
        .mockResolvedValueOnce(createMockQueryResult([])); // No existing direct conversation

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce(createMockQueryResult([mockConversationEntity])) // Insert conversation
            .mockResolvedValue(createMockQueryResult([])), // Insert participants
        };
        return callback(mockClient as any);
      });

      const result = await ConversationService.createConversation(mockUserId1, request);

      expect(result).toMatchObject({
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId1, mockUserId2],
        admins: [],
      });
    });

    it('should create a group conversation successfully', async () => {
      const request: CreateConversationRequest = {
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId2, mockUserId3],
      };

      const mockConversationEntity: ConversationEntity = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        last_activity: new Date(),
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 1 exists
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 2 exists
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])); // User 3 exists

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce(createMockQueryResult([mockConversationEntity])) // Insert conversation
            .mockResolvedValue(createMockQueryResult([])), // Insert participants
        };
        return callback(mockClient as any);
      });

      const result = await ConversationService.createConversation(mockUserId1, request);

      expect(result).toMatchObject({
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2, mockUserId3],
        admins: [mockUserId1],
      });
    });

    it('should throw error for direct conversation with wrong number of participants', async () => {
      const request: CreateConversationRequest = {
        type: 'direct',
        participants: [mockUserId2, mockUserId3], // Too many participants
      };

      await expect(
        ConversationService.createConversation(mockUserId1, request)
      ).rejects.toThrow('Direct conversations must have exactly 2 participants');
    });

    it('should throw error for group conversation without name', async () => {
      const request: CreateConversationRequest = {
        type: 'group',
        participants: [mockUserId2],
      };

      await expect(
        ConversationService.createConversation(mockUserId1, request)
      ).rejects.toThrow('Group conversations must have a name');
    });

    it('should throw error if participant does not exist', async () => {
      const request: CreateConversationRequest = {
        type: 'direct',
        participants: [mockUserId2],
      };

      // Mock user 1 exists but user 2 doesn't
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 1 exists
        .mockResolvedValueOnce(createMockQueryResult([])); // User 2 doesn't exist

      await expect(
        ConversationService.createConversation(mockUserId1, request)
      ).rejects.toThrow(`User with ID ${mockUserId2} not found`);
    });
  });

  describe('getUserConversations', () => {
    it('should get user conversations with pagination', async () => {
      const mockConversationEntity: ConversationEntity = {
        id: mockConversationId,
        type: 'direct',
        last_activity: new Date(),
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ total: '1' }])) // Count query
        .mockResolvedValueOnce(createMockQueryResult([mockConversationEntity])) // Conversations query
        .mockResolvedValueOnce(createMockQueryResult([ // Participants query
          { user_id: mockUserId1, is_admin: false, is_muted: false },
          { user_id: mockUserId2, is_admin: false, is_muted: false },
        ]));

      const result = await ConversationService.getUserConversations(mockUserId1, {
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0]).toMatchObject({
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId1, mockUserId2],
      });
    });

    it('should exclude archived conversations by default', async () => {
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ total: '0' }])) // Count query
        .mockResolvedValueOnce(createMockQueryResult([])); // Conversations query

      const result = await ConversationService.getUserConversations(mockUserId1);

      expect(result.total).toBe(0);
      expect(result.conversations).toHaveLength(0);

      // Verify the query excludes archived conversations
      const countCall = mockDb.query.mock.calls[0];
      expect(countCall[0]).toContain('NOT c.is_archived');
    });
  });

  describe('getConversationById', () => {
    it('should get conversation by ID for participant', async () => {
      const mockConversationEntity: ConversationEntity = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        last_activity: new Date(),
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: mockUserId1 }])) // Participant check
        .mockResolvedValueOnce(createMockQueryResult([mockConversationEntity])) // Get conversation
        .mockResolvedValueOnce(createMockQueryResult([ // Get participants
          { user_id: mockUserId1, is_admin: true, is_muted: false },
          { user_id: mockUserId2, is_admin: false, is_muted: false },
        ]));

      const result = await ConversationService.getConversationById(mockConversationId, mockUserId1);

      expect(result).toMatchObject({
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2],
        admins: [mockUserId1],
        isMuted: false,
      });
    });

    it('should throw error if user is not a participant', async () => {
      // Mock user is not a participant
      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        ConversationService.getConversationById(mockConversationId, mockUserId1)
      ).rejects.toThrow('User is not a participant in this conversation');
    });

    it('should return null if conversation does not exist', async () => {
      // Mock user is participant but conversation doesn't exist
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: mockUserId1 }])) // Participant check
        .mockResolvedValueOnce(createMockQueryResult([])); // Conversation doesn't exist

      const result = await ConversationService.getConversationById(mockConversationId, mockUserId1);

      expect(result).toBeNull();
    });
  });

  describe('addParticipants', () => {
    it('should add participants to group conversation', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2],
        admins: [mockUserId1],
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock ConversationService.getConversationById
      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ exists: true }])) // User 3 exists
        .mockResolvedValueOnce(createMockQueryResult([])); // User 3 not already participant

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce(createMockQueryResult([])) // Insert participant
            .mockResolvedValueOnce(createMockQueryResult([])), // Update last activity
        };
        return callback(mockClient as any);
      });

      await expect(
        ConversationService.addParticipants(mockConversationId, mockUserId1, [mockUserId3])
      ).resolves.not.toThrow();

      getConversationSpy.mockRestore();
    });

    it('should throw error if user is not admin', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2],
        admins: [mockUserId2], // User 1 is not admin
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      // Mock database calls for user existence check and participant check
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ id: mockUserId3 }])) // User 3 exists
        .mockResolvedValueOnce(createMockQueryResult([])); // User 3 not already participant

      await expect(
        ConversationService.addParticipants(mockConversationId, mockUserId1, [mockUserId3])
      ).rejects.toThrow('Only group admins can add participants');

      getConversationSpy.mockRestore();
    });

    it('should throw error for direct conversations', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId1, mockUserId2],
        admins: [],
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      await expect(
        ConversationService.addParticipants(mockConversationId, mockUserId1, [mockUserId3])
      ).rejects.toThrow('Can only add participants to group conversations');

      getConversationSpy.mockRestore();
    });
  });

  describe('archiveConversation', () => {
    it('should archive conversation for participant', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId1, mockUserId2],
        admins: [],
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([])); // Update query

      await expect(
        ConversationService.archiveConversation(mockConversationId, mockUserId1, true)
      ).resolves.not.toThrow();

      getConversationSpy.mockRestore();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations SET is_archived = $1'),
        [true, mockConversationId]
      );
    });
  });

  describe('muteConversation', () => {
    it('should mute conversation for participant', async () => {
      // Mock user is participant
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: mockUserId1 }])) // Participant check
        .mockResolvedValueOnce(createMockQueryResult([])); // Update query

      await expect(
        ConversationService.muteConversation(mockConversationId, mockUserId1, true)
      ).resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversation_participants SET is_muted = $1'),
        [true, mockConversationId, mockUserId1]
      );
    });

    it('should throw error if user is not participant', async () => {
      // Mock user is not participant
      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        ConversationService.muteConversation(mockConversationId, mockUserId1, true)
      ).rejects.toThrow('User is not a participant in this conversation');
    });
  });

  describe('leaveConversation', () => {
    it('should allow leaving group conversation', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2, mockUserId3],
        admins: [mockUserId2], // User 1 is not admin, so they can leave
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the getConversationById method to return our mock conversation
      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([])); // Delete participant

      await expect(
        ConversationService.leaveConversation(mockConversationId, mockUserId1)
      ).resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conversation_participants'),
        [mockConversationId, mockUserId1]
      );

      getConversationSpy.mockRestore();
    });

    it('should throw error for direct conversations', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId1, mockUserId2],
        admins: [],
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      await expect(
        ConversationService.leaveConversation(mockConversationId, mockUserId1)
      ).rejects.toThrow('Cannot leave direct conversations');

      getConversationSpy.mockRestore();
    });

    it('should throw error if only admin tries to leave', async () => {
      const mockConversation: Conversation = {
        id: mockConversationId,
        type: 'group',
        name: 'Test Group',
        participants: [mockUserId1, mockUserId2],
        admins: [mockUserId1], // User 1 is the only admin
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const getConversationSpy = jest.spyOn(ConversationService, 'getConversationById')
        .mockResolvedValueOnce(mockConversation);

      await expect(
        ConversationService.leaveConversation(mockConversationId, mockUserId1)
      ).rejects.toThrow('Cannot leave group as the only admin. Promote another user to admin first.');

      getConversationSpy.mockRestore();
    });
  });
});