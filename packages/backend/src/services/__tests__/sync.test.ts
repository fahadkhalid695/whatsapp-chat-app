import { SyncService } from '../sync';
import { OfflineQueueService } from '../offlineQueue';

// Mock the database connection
jest.mock('../../database/connection', () => ({
  db: {
    query: jest.fn(),
  },
  DatabaseHelper: {
    insert: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByField: jest.fn(),
  },
}));

// Mock the socket server
jest.mock('../../socket', () => ({
  socketServer: {
    emitToUser: jest.fn(),
    getConnectedUsers: jest.fn(() => new Map()),
  },
}));

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDeviceSession', () => {
    it('should register a new device session', async () => {
      const { DatabaseHelper } = require('../../database/connection');
      const mockSession = {
        id: 'session-id',
        user_id: 'user-id',
        device_id: 'device-id',
        platform: 'web',
        is_active: true,
        last_activity: new Date(),
        created_at: new Date(),
      };

      DatabaseHelper.insert.mockResolvedValue(mockSession);

      const result = await SyncService.registerDeviceSession('user-id', 'device-id', {
        platform: 'web',
        userAgent: 'test-agent',
        appVersion: '1.0.0',
      });

      expect(DatabaseHelper.insert).toHaveBeenCalledWith('device_sessions', {
        user_id: 'user-id',
        device_id: 'device-id',
        platform: 'web',
        user_agent: 'test-agent',
        app_version: '1.0.0',
        is_active: true,
        last_activity: expect.any(Date),
        created_at: expect.any(Date),
      });

      expect(result).toEqual({
        id: 'session-id',
        userId: 'user-id',
        deviceId: 'device-id',
        platform: 'web',
        userAgent: undefined,
        appVersion: undefined,
        isActive: true,
        lastActivity: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });
  });

  describe('syncReadReceipts', () => {
    it('should sync read receipts across devices', async () => {
      const { db } = require('../../database/connection');
      const { socketServer } = require('../../socket');

      db.query
        .mockResolvedValueOnce({ rows: [] }) // message status insert
        .mockResolvedValueOnce({ rows: [{ conversation_id: 'conv-1' }] }) // conversation IDs
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-2' }] }); // participants

      const mockActiveSessions = [
        { deviceId: 'device-1' },
        { deviceId: 'device-2' },
      ];

      jest.spyOn(SyncService, 'getActiveDeviceSessions').mockResolvedValue(mockActiveSessions as any);

      await SyncService.syncReadReceipts('user-1', ['msg-1'], 'device-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_status'),
        ['msg-1', 'user-1']
      );

      expect(socketServer.emitToUser).toHaveBeenCalled();
    });
  });

  describe('syncProfileUpdate', () => {
    it('should sync profile updates across devices', async () => {
      const { db } = require('../../database/connection');
      const { socketServer } = require('../../socket');

      const mockActiveSessions = [
        { deviceId: 'device-1' },
        { deviceId: 'device-2' },
      ];

      jest.spyOn(SyncService, 'getActiveDeviceSessions').mockResolvedValue(mockActiveSessions as any);

      db.query.mockResolvedValue({ rows: [{ user_id: 'contact-1' }] });

      await SyncService.syncProfileUpdate(
        'user-1',
        { displayName: 'New Name', profilePicture: 'new-pic.jpg' },
        'device-1'
      );

      expect(socketServer.emitToUser).toHaveBeenCalledWith('user-1', 'profile-sync', {
        userId: 'user-1',
        updates: { displayName: 'New Name', profilePicture: 'new-pic.jpg' },
        timestamp: expect.any(Date),
      });
    });
  });
});

describe('OfflineQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueMessage', () => {
    it('should queue a message for offline delivery', async () => {
      const { db } = require('../../database/connection');

      db.query.mockResolvedValue({ rows: [] });

      await OfflineQueueService.queueMessage('user-1', 'device-1', { test: 'data' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offline_messages'),
        ['user-1', 'device-1', '{"test":"data"}', 3]
      );
    });
  });

  describe('deliverQueuedMessages', () => {
    it('should deliver queued messages when device comes online', async () => {
      const { db } = require('../../database/connection');
      const { socketServer } = require('../../socket');

      const mockQueuedMessages = [
        {
          id: 'queue-1',
          message_data: '{"type":"message","content":"test"}',
        },
      ];

      db.query
        .mockResolvedValueOnce({ rows: mockQueuedMessages }) // get queued messages
        .mockResolvedValueOnce({ rows: [] }); // mark as delivered

      await OfflineQueueService.deliverQueuedMessages('user-1', 'device-1');

      expect(socketServer.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'offline-message-delivery',
        { type: 'message', content: 'test' }
      );

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE offline_messages SET delivered_at = NOW() WHERE id = $1',
        ['queue-1']
      );
    });
  });
});