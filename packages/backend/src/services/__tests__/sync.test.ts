import { SyncService } from '../sync';
import { db } from '../../database/connection';
import { redisClient } from '../../socket/redis';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../../socket/redis');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedis = redisClient as jest.Mocked<typeof redisClient>;

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUserData', () => {
    it('should sync user data across devices', async () => {
      const userId = 'user-123';
      const deviceId = 'device-456';
      const lastSyncTimestamp = new Date('2023-01-01T00:00:00Z');

      const mockSyncData = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-2',
          content: { text: 'New message' },
          type: 'text',
          timestamp: new Date('2023-01-01T01:00:00Z'),
          is_deleted: false,
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ last_sync: lastSyncTimestamp }] }) // Get last sync
        .mockResolvedValueOnce({ rows: mockSyncData }) // Get new messages
        .mockResolvedValueOnce({ rows: [] }) // Get conversation updates
        .mockResolvedValueOnce({ rows: [] }); // Update sync timestamp

      const result = await SyncService.syncUserData(userId, deviceId, lastSyncTimestamp);

      expect(result).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: 'msg-1',
            content: { text: 'New message' },
          }),
        ]),
        conversations: [],
        lastSyncTimestamp: expect.any(Date),
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE device_sessions'),
        [userId, deviceId]
      );
    });

    it('should handle first-time sync', async () => {
      const userId = 'user-123';
      const deviceId = 'new-device';

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No previous sync
        .mockResolvedValueOnce({ rows: [] }) // Get all messages
        .mockResolvedValueOnce({ rows: [] }) // Get all conversations
        .mockResolvedValueOnce({ rows: [] }); // Create sync record

      const result = await SyncService.syncUserData(userId, deviceId);

      expect(result).toMatchObject({
        messages: [],
        conversations: [],
        lastSyncTimestamp: expect.any(Date),
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO device_sessions'),
        expect.arrayContaining([userId, deviceId])
      );
    });

    it('should sync read receipts', async () => {
      const userId = 'user-123';
      const deviceId = 'device-456';
      const lastSyncTimestamp = new Date('2023-01-01T00:00:00Z');

      const mockReadReceipts = [
        {
          message_id: 'msg-1',
          user_id: 'user-2',
          status: 'read',
          timestamp: new Date('2023-01-01T01:00:00Z'),
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ last_sync: lastSyncTimestamp }] })
        .mockResolvedValueOnce({ rows: [] }) // Messages
        .mockResolvedValueOnce({ rows: [] }) // Conversations
        .mockResolvedValueOnce({ rows: mockReadReceipts }) // Read receipts
        .mockResolvedValueOnce({ rows: [] }); // Update sync

      const result = await SyncService.syncUserData(userId, deviceId, lastSyncTimestamp);

      expect(result).toMatchObject({
        readReceipts: expect.arrayContaining([
          expect.objectContaining({
            messageId: 'msg-1',
            userId: 'user-2',
            status: 'read',
          }),
        ]),
      });
    });
  });

  describe('queueOfflineMessage', () => {
    it('should queue message for offline user', async () => {
      const userId = 'user-123';
      const messageData = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: { text: 'Offline message' },
        type: 'text',
        timestamp: new Date(),
      };

      mockRedis.lpush = jest.fn().mockResolvedValue(1);
      mockRedis.expire = jest.fn().mockResolvedValue(1);

      await SyncService.queueOfflineMessage(userId, messageData);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        `offline_messages:${userId}`,
        JSON.stringify(messageData)
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `offline_messages:${userId}`,
        7 * 24 * 60 * 60 // 7 days
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const messageData = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: { text: 'Offline message' },
        type: 'text',
        timestamp: new Date(),
      };

      mockRedis.lpush = jest.fn().mockRejectedValue(new Error('Redis error'));

      // Should not throw error
      await expect(SyncService.queueOfflineMessage(userId, messageData)).resolves.not.toThrow();
    });
  });

  describe('getOfflineMessages', () => {
    it('should retrieve and clear offline messages', async () => {
      const userId = 'user-123';
      const queuedMessages = [
        JSON.stringify({
          id: 'msg-1',
          conversationId: 'conv-1',
          content: { text: 'Message 1' },
        }),
        JSON.stringify({
          id: 'msg-2',
          conversationId: 'conv-1',
          content: { text: 'Message 2' },
        }),
      ];

      mockRedis.lrange = jest.fn().mockResolvedValue(queuedMessages);
      mockRedis.del = jest.fn().mockResolvedValue(1);

      const result = await SyncService.getOfflineMessages(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'msg-1',
        content: { text: 'Message 1' },
      });
      expect(result[1]).toMatchObject({
        id: 'msg-2',
        content: { text: 'Message 2' },
      });

      expect(mockRedis.lrange).toHaveBeenCalledWith(`offline_messages:${userId}`, 0, -1);
      expect(mockRedis.del).toHaveBeenCalledWith(`offline_messages:${userId}`);
    });

    it('should handle empty queue', async () => {
      const userId = 'user-123';

      mockRedis.lrange = jest.fn().mockResolvedValue([]);
      mockRedis.del = jest.fn().mockResolvedValue(0);

      const result = await SyncService.getOfflineMessages(userId);

      expect(result).toEqual([]);
    });

    it('should handle malformed messages in queue', async () => {
      const userId = 'user-123';
      const queuedMessages = [
        JSON.stringify({ id: 'msg-1', content: { text: 'Valid message' } }),
        'invalid-json',
        JSON.stringify({ id: 'msg-2', content: { text: 'Another valid message' } }),
      ];

      mockRedis.lrange = jest.fn().mockResolvedValue(queuedMessages);
      mockRedis.del = jest.fn().mockResolvedValue(1);

      const result = await SyncService.getOfflineMessages(userId);

      // Should only return valid messages
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });
  });

  describe('syncConversationState', () => {
    it('should sync conversation read states', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-1';
      const lastReadMessageId = 'msg-5';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await SyncService.syncConversationState(userId, conversationId, {
        lastReadMessageId,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_read_state'),
        [userId, conversationId, lastReadMessageId]
      );
    });

    it('should sync conversation mute state', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-1';
      const isMuted = true;
      const mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await SyncService.syncConversationState(userId, conversationId, {
        isMuted,
        mutedUntil,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversation_participants'),
        expect.arrayContaining([isMuted, mutedUntil, conversationId, userId])
      );
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve message conflicts using timestamp', async () => {
      const conflicts = [
        {
          type: 'message_edit',
          messageId: 'msg-1',
          localVersion: {
            content: { text: 'Local edit' },
            editedAt: new Date('2023-01-01T01:00:00Z'),
          },
          serverVersion: {
            content: { text: 'Server edit' },
            editedAt: new Date('2023-01-01T02:00:00Z'),
          },
        },
      ];

      const result = await SyncService.resolveConflicts(conflicts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        messageId: 'msg-1',
        resolution: 'use_server',
        resolvedContent: { text: 'Server edit' },
      });
    });

    it('should resolve conversation state conflicts', async () => {
      const conflicts = [
        {
          type: 'conversation_state',
          conversationId: 'conv-1',
          localVersion: {
            lastReadMessageId: 'msg-3',
            timestamp: new Date('2023-01-01T01:00:00Z'),
          },
          serverVersion: {
            lastReadMessageId: 'msg-5',
            timestamp: new Date('2023-01-01T02:00:00Z'),
          },
        },
      ];

      const result = await SyncService.resolveConflicts(conflicts);

      expect(result[0]).toMatchObject({
        conversationId: 'conv-1',
        resolution: 'use_server',
        resolvedState: {
          lastReadMessageId: 'msg-5',
        },
      });
    });

    it('should handle unknown conflict types', async () => {
      const conflicts = [
        {
          type: 'unknown_type',
          data: { some: 'data' },
        },
      ];

      const result = await SyncService.resolveConflicts(conflicts);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        resolution: 'skip',
        reason: 'Unknown conflict type',
      });
    });
  });

  describe('getDeviceSessions', () => {
    it('should get active device sessions for user', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          user_id: userId,
          device_id: 'device-1',
          device_type: 'web',
          last_sync: new Date('2023-01-01T01:00:00Z'),
          is_active: true,
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
        {
          id: 'session-2',
          user_id: userId,
          device_id: 'device-2',
          device_type: 'mobile',
          last_sync: new Date('2023-01-01T02:00:00Z'),
          is_active: true,
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockSessions });

      const result = await SyncService.getDeviceSessions(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'session-1',
        deviceId: 'device-1',
        deviceType: 'web',
        isActive: true,
      });
      expect(result[1]).toMatchObject({
        id: 'session-2',
        deviceId: 'device-2',
        deviceType: 'mobile',
        isActive: true,
      });
    });

    it('should filter inactive sessions', async () => {
      const userId = 'user-123';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await SyncService.getDeviceSessions(userId, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND is_active = true'),
        [userId]
      );
    });
  });

  describe('invalidateDeviceSession', () => {
    it('should invalidate specific device session', async () => {
      const userId = 'user-123';
      const deviceId = 'device-456';

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await SyncService.invalidateDeviceSession(userId, deviceId);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE device_sessions SET is_active = false WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
      );
    });

    it('should throw error if session not found', async () => {
      const userId = 'user-123';
      const deviceId = 'nonexistent-device';

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        SyncService.invalidateDeviceSession(userId, deviceId)
      ).rejects.toThrow('Device session not found');
    });
  });

  describe('cleanupOldSessions', () => {
    it('should cleanup sessions older than specified days', async () => {
      const daysOld = 30;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 5 });

      const result = await SyncService.cleanupOldSessions(daysOld);

      expect(result.cleanedCount).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM device_sessions'),
        expect.arrayContaining([expect.any(Date)])
      );
    });

    it('should use default cleanup period', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 3 });

      await SyncService.cleanupOldSessions();

      // Should use default 90 days
      const call = mockDb.query.mock.calls[0];
      const cutoffDate = call[1][0] as Date;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 90);
      
      // Allow for small time difference in test execution
      expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
    });
  });
});