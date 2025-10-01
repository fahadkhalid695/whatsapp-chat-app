import { NotificationService } from '../notification';

// Mock database connection
jest.mock('../../database/connection', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  messaging: () => ({
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('../../config', () => ({
  config: {
    firebase: {
      projectId: 'test-project',
      privateKeyId: 'test-key-id',
      privateKey: 'test-private-key',
      clientEmail: 'test@test.com',
      clientId: 'test-client-id',
      authUri: 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: 'https://oauth2.googleapis.com/token',
      authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
      clientX509CertUrl: 'https://test.com/cert',
    },
    notification: {
      batchSize: 10,
      batchDelayMs: 5000,
      maxRetryAttempts: 3,
      retryDelayMs: 30000,
    },
  },
}));

describe('NotificationService', () => {
  let mockDb: any;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Get the mocked db
    const { db } = require('../../database/connection');
    mockDb = db;
    mockDb.query.mockClear();

    notificationService = new NotificationService();
  });

  afterEach(() => {
    notificationService.shutdown();
    jest.clearAllMocks();
  });

  describe('Device Token Management', () => {
    it('should register device token successfully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await notificationService.registerDeviceToken('user-1', 'token-123', 'web');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO device_tokens'),
        ['user-1', 'token-123', 'web']
      );
    });

    it('should remove device token successfully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await notificationService.removeDeviceToken('user-1', 'token-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE device_tokens SET is_active = false WHERE user_id = $1 AND token = $2',
        ['user-1', 'token-123']
      );
    });

    it('should get user device tokens', async () => {
      const mockTokens = [
        {
          id: 'token-id-1',
          user_id: 'user-1',
          token: 'token-123',
          platform: 'web',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockTokens });

      const tokens = await notificationService.getUserDeviceTokens('user-1');

      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBe('token-123');
      expect(tokens[0].platform).toBe('web');
    });
  });

  describe('Notification Preferences', () => {
    it('should get notification preferences', async () => {
      const mockPreferences = {
        id: 'pref-1',
        user_id: 'user-1',
        push_enabled: true,
        message_notifications: true,
        group_notifications: true,
        mention_notifications: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const preferences = await notificationService.getNotificationPreferences('user-1');

      expect(preferences).toBeTruthy();
      expect(preferences!.pushEnabled).toBe(true);
      expect(preferences!.messageNotifications).toBe(true);
    });

    it('should return null when no preferences exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const preferences = await notificationService.getNotificationPreferences('user-1');

      expect(preferences).toBeNull();
    });

    it('should update notification preferences', async () => {
      const mockUpdatedPreferences = {
        id: 'pref-1',
        user_id: 'user-1',
        push_enabled: false,
        message_notifications: false,
        group_notifications: true,
        mention_notifications: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedPreferences] });

      const preferences = await notificationService.updateNotificationPreferences('user-1', {
        pushEnabled: false,
        messageNotifications: false,
        quietHoursEnabled: true,
      });

      expect(preferences.pushEnabled).toBe(false);
      expect(preferences.messageNotifications).toBe(false);
      expect(preferences.quietHoursEnabled).toBe(true);
    });
  });

  describe('Conversation Notification Settings', () => {
    it('should mute conversation', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await notificationService.muteConversation('user-1', 'conv-1', mutedUntil);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_notification_settings'),
        ['user-1', 'conv-1', mutedUntil]
      );
    });

    it('should unmute conversation', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await notificationService.unmuteConversation('user-1', 'conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_notification_settings'),
        ['user-1', 'conv-1']
      );
    });

    it('should get conversation notification settings', async () => {
      const mockSettings = {
        id: 'setting-1',
        user_id: 'user-1',
        conversation_id: 'conv-1',
        is_muted: true,
        muted_until: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const settings = await notificationService.getConversationNotificationSettings('user-1', 'conv-1');

      expect(settings).toBeTruthy();
      expect(settings!.isMuted).toBe(true);
    });
  });

  describe('Notification Queueing', () => {
    it('should queue notification when user should receive it', async () => {
      // Mock preferences check
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{
          push_enabled: true,
          message_notifications: true,
          group_notifications: true,
          mention_notifications: true,
          quiet_hours_enabled: false,
          timezone: 'UTC',
        }]
      });

      // Mock conversation settings check
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock queue insertion
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const notificationData = {
        type: 'message' as const,
        conversationId: 'conv-1',
        messageId: 'msg-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        messageContent: 'Hello there!',
        isGroup: false,
      };

      await notificationService.queueNotification('user-1', notificationData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_queue'),
        expect.arrayContaining(['user-1', 'message'])
      );
    });

    it('should not queue notification when push is disabled', async () => {
      // Mock preferences check - push disabled
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{
          push_enabled: false,
          message_notifications: true,
          group_notifications: true,
          mention_notifications: true,
          quiet_hours_enabled: false,
          timezone: 'UTC',
        }]
      });

      const notificationData = {
        type: 'message' as const,
        conversationId: 'conv-1',
        messageId: 'msg-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        messageContent: 'Hello there!',
        isGroup: false,
      };

      await notificationService.queueNotification('user-1', notificationData);

      // Should only call query once for preferences check, not for conversation settings or queueing
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should not queue notification during quiet hours', async () => {
      // Mock preferences check - quiet hours enabled
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{
          push_enabled: true,
          message_notifications: true,
          group_notifications: true,
          mention_notifications: true,
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          timezone: 'UTC',
        }]
      });

      // Mock current time to be in quiet hours
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T23:00:00Z'); // 11 PM UTC
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const notificationData = {
        type: 'message' as const,
        conversationId: 'conv-1',
        messageId: 'msg-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        messageContent: 'Hello there!',
        isGroup: false,
      };

      await notificationService.queueNotification('user-1', notificationData);

      // Should call query twice: once for preferences check, once for conversation settings check, but not for queueing
      expect(mockDb.query).toHaveBeenCalledTimes(2);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Notification Content Generation', () => {
    it('should generate correct content for direct message', () => {
      const notificationData = {
        type: 'message' as const,
        conversationId: 'conv-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        messageContent: 'Hello there!',
        isGroup: false,
      };

      const service = notificationService as any;
      const { title, body } = service.generateNotificationContent(notificationData);

      expect(title).toBe('John Doe');
      expect(body).toBe('Hello there!');
    });

    it('should generate correct content for group message', () => {
      const notificationData = {
        type: 'message' as const,
        conversationId: 'conv-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        conversationName: 'Team Chat',
        messageContent: 'Hello everyone!',
        isGroup: true,
      };

      const service = notificationService as any;
      const { title, body } = service.generateNotificationContent(notificationData);

      expect(title).toBe('Team Chat');
      expect(body).toBe('John Doe: Hello everyone!');
    });

    it('should generate correct content for mention', () => {
      const notificationData = {
        type: 'mention' as const,
        conversationId: 'conv-1',
        senderId: 'user-2',
        senderName: 'John Doe',
        conversationName: 'Team Chat',
        messageContent: '@alice can you help?',
        isGroup: true,
      };

      const service = notificationService as any;
      const { title, body } = service.generateNotificationContent(notificationData);

      expect(title).toBe('Team Chat');
      expect(body).toBe('John Doe mentioned you: @alice can you help?');
    });
  });

  describe('Quiet Hours Logic', () => {
    it('should correctly identify quiet hours - same day', () => {
      const service = notificationService as any;
      
      // Quiet hours: 22:00 to 23:59 (same day)
      expect(service.isInQuietHours('22:30:00', '22:00:00', '23:59:00')).toBe(true);
      expect(service.isInQuietHours('21:30:00', '22:00:00', '23:59:00')).toBe(false);
      expect(service.isInQuietHours('00:30:00', '22:00:00', '23:59:00')).toBe(false);
    });

    it('should correctly identify quiet hours - overnight', () => {
      const service = notificationService as any;
      
      // Quiet hours: 22:00 to 08:00 (overnight)
      expect(service.isInQuietHours('23:00:00', '22:00:00', '08:00:00')).toBe(true);
      expect(service.isInQuietHours('02:00:00', '22:00:00', '08:00:00')).toBe(true);
      expect(service.isInQuietHours('07:30:00', '22:00:00', '08:00:00')).toBe(true);
      expect(service.isInQuietHours('10:00:00', '22:00:00', '08:00:00')).toBe(false);
      expect(service.isInQuietHours('21:00:00', '22:00:00', '08:00:00')).toBe(false);
    });
  });
});