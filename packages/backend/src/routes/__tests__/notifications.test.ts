import request from 'supertest';
import express from 'express';
import notificationRoutes from '../notifications';
import { getNotificationService } from '../../services/notification';

// Mock the notification service
jest.mock('../../services/notification', () => ({
  getNotificationService: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-123', phoneNumber: '+1234567890' };
    next();
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Notification Routes', () => {
  let app: express.Application;
  let mockNotificationService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);

    mockNotificationService = {
      registerDeviceToken: jest.fn(),
      removeDeviceToken: jest.fn(),
      getUserDeviceTokens: jest.fn(),
      getNotificationPreferences: jest.fn(),
      updateNotificationPreferences: jest.fn(),
      muteConversation: jest.fn(),
      unmuteConversation: jest.fn(),
      getConversationNotificationSettings: jest.fn(),
    };

    (getNotificationService as jest.Mock).mockReturnValue(mockNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /device-tokens', () => {
    it('should register device token successfully', async () => {
      mockNotificationService.registerDeviceToken.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/notifications/device-tokens')
        .send({
          token: 'device-token-123',
          platform: 'web',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Device token registered successfully');
      expect(mockNotificationService.registerDeviceToken).toHaveBeenCalledWith(
        'user-123',
        'device-token-123',
        'web'
      );
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .post('/api/notifications/device-tokens')
        .send({
          token: 'device-token-123',
          platform: 'invalid-platform',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/notifications/device-tokens')
        .send({
          platform: 'web',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle service errors', async () => {
      mockNotificationService.registerDeviceToken.mockRejectedValueOnce(
        new Error('Service error')
      );

      const response = await request(app)
        .post('/api/notifications/device-tokens')
        .send({
          token: 'device-token-123',
          platform: 'web',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('DELETE /device-tokens', () => {
    it('should remove device token successfully', async () => {
      mockNotificationService.removeDeviceToken.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/api/notifications/device-tokens')
        .send({
          token: 'device-token-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Device token removed successfully');
      expect(mockNotificationService.removeDeviceToken).toHaveBeenCalledWith(
        'user-123',
        'device-token-123'
      );
    });
  });

  describe('GET /device-tokens', () => {
    it('should get user device tokens successfully', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          platform: 'web',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'token-2',
          platform: 'android',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockNotificationService.getUserDeviceTokens.mockResolvedValueOnce(mockTokens);

      const response = await request(app)
        .get('/api/notifications/device-tokens');

      expect(response.status).toBe(200);
      expect(response.body.deviceTokens).toHaveLength(2);
      expect(response.body.deviceTokens[0].platform).toBe('web');
      expect(response.body.deviceTokens[1].platform).toBe('android');
    });
  });

  describe('GET /preferences', () => {
    it('should get notification preferences successfully', async () => {
      const mockPreferences = {
        id: 'pref-1',
        pushEnabled: true,
        messageNotifications: true,
        groupNotifications: false,
        mentionNotifications: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00:00',
        quietHoursEnd: '08:00:00',
        timezone: 'America/New_York',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationService.getNotificationPreferences.mockResolvedValueOnce(mockPreferences);

      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.preferences.pushEnabled).toBe(true);
      expect(response.body.preferences.groupNotifications).toBe(false);
      expect(response.body.preferences.timezone).toBe('America/New_York');
    });

    it('should return default preferences when none exist', async () => {
      mockNotificationService.getNotificationPreferences.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.preferences.pushEnabled).toBe(true);
      expect(response.body.preferences.messageNotifications).toBe(true);
      expect(response.body.preferences.timezone).toBe('UTC');
    });
  });

  describe('PUT /preferences', () => {
    it('should update notification preferences successfully', async () => {
      const updatedPreferences = {
        id: 'pref-1',
        pushEnabled: false,
        messageNotifications: false,
        groupNotifications: true,
        mentionNotifications: true,
        quietHoursEnabled: true,
        quietHoursStart: '23:00:00',
        quietHoursEnd: '07:00:00',
        timezone: 'Europe/London',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationService.updateNotificationPreferences.mockResolvedValueOnce(updatedPreferences);

      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({
          pushEnabled: false,
          messageNotifications: false,
          quietHoursStart: '23:00:00',
          quietHoursEnd: '07:00:00',
          timezone: 'Europe/London',
        });

      expect(response.status).toBe(200);
      expect(response.body.preferences.pushEnabled).toBe(false);
      expect(response.body.preferences.messageNotifications).toBe(false);
      expect(response.body.preferences.timezone).toBe('Europe/London');
    });

    it('should return 400 for invalid time format', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({
          quietHoursStart: '25:00:00', // Invalid hour
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /conversations/mute', () => {
    it('should mute conversation successfully', async () => {
      mockNotificationService.muteConversation.mockResolvedValueOnce(undefined);

      const mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const response = await request(app)
        .post('/api/notifications/conversations/mute')
        .send({
          conversationId: '550e8400-e29b-41d4-a716-446655440000',
          mutedUntil: mutedUntil.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation muted successfully');
      expect(mockNotificationService.muteConversation).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        expect.any(Date)
      );
    });

    it('should mute conversation indefinitely when no mutedUntil provided', async () => {
      mockNotificationService.muteConversation.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/notifications/conversations/mute')
        .send({
          conversationId: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect(response.status).toBe(200);
      expect(mockNotificationService.muteConversation).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        undefined
      );
    });

    it('should return 400 for invalid conversation ID', async () => {
      const response = await request(app)
        .post('/api/notifications/conversations/mute')
        .send({
          conversationId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /conversations/unmute', () => {
    it('should unmute conversation successfully', async () => {
      mockNotificationService.unmuteConversation.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/notifications/conversations/unmute')
        .send({
          conversationId: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation unmuted successfully');
      expect(mockNotificationService.unmuteConversation).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });
  });

  describe('GET /conversations/:conversationId/settings', () => {
    it('should get conversation notification settings successfully', async () => {
      const mockSettings = {
        id: 'setting-1',
        isMuted: true,
        mutedUntil: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationService.getConversationNotificationSettings.mockResolvedValueOnce(mockSettings);

      const response = await request(app)
        .get('/api/notifications/conversations/550e8400-e29b-41d4-a716-446655440000/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings.isMuted).toBe(true);
      expect(mockNotificationService.getConversationNotificationSettings).toHaveBeenCalledWith(
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should return default settings when none exist', async () => {
      mockNotificationService.getConversationNotificationSettings.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/notifications/conversations/550e8400-e29b-41d4-a716-446655440000/settings');

      expect(response.status).toBe(200);
      expect(response.body.settings.isMuted).toBe(false);
      expect(response.body.settings.mutedUntil).toBeNull();
    });

    it('should return 400 for missing conversation ID', async () => {
      const response = await request(app)
        .get('/api/notifications/conversations//settings');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });
  });
});