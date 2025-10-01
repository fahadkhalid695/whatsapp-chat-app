import { Router, Request, Response } from 'express';
import { getNotificationService } from '../services/notification';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  registerDeviceTokenSchema,
  removeDeviceTokenSchema,
  updateNotificationPreferencesSchema,
  muteConversationSchema,
  unmuteConversationSchema,
} from '../validation/notification';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Register device token for push notifications
router.post('/device-tokens', async (req: Request, res: Response) => {
  try {
    const { error, value } = registerDeviceTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { token, platform } = value;
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    await notificationService.registerDeviceToken(userId, token, platform);

    return res.status(201).json({
      message: 'Device token registered successfully',
    });
  } catch (error) {
    logger.error('Error registering device token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register device token',
    });
  }
});

// Remove device token
router.delete('/device-tokens', async (req: Request, res: Response) => {
  try {
    const { error, value } = removeDeviceTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { token } = value;
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    await notificationService.removeDeviceToken(userId, token);

    return res.json({
      message: 'Device token removed successfully',
    });
  } catch (error) {
    logger.error('Error removing device token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove device token',
    });
  }
});

// Get user device tokens
router.get('/device-tokens', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    const deviceTokens = await notificationService.getUserDeviceTokens(userId);

    return res.json({
      deviceTokens: deviceTokens.map(token => ({
        id: token.id,
        platform: token.platform,
        isActive: token.isActive,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Error getting device tokens:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get device tokens',
    });
  }
});

// Get notification preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    const preferences = await notificationService.getNotificationPreferences(userId);

    if (!preferences) {
      // Return default preferences
      return res.json({
        preferences: {
          pushEnabled: true,
          messageNotifications: true,
          groupNotifications: true,
          mentionNotifications: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00:00',
          quietHoursEnd: '08:00:00',
          timezone: 'UTC',
        },
      });
    }

    return res.json({
      preferences: {
        id: preferences.id,
        pushEnabled: preferences.pushEnabled,
        messageNotifications: preferences.messageNotifications,
        groupNotifications: preferences.groupNotifications,
        mentionNotifications: preferences.mentionNotifications,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting notification preferences:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get notification preferences',
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateNotificationPreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    const preferences = await notificationService.updateNotificationPreferences(userId, value);

    return res.json({
      preferences: {
        id: preferences.id,
        pushEnabled: preferences.pushEnabled,
        messageNotifications: preferences.messageNotifications,
        groupNotifications: preferences.groupNotifications,
        mentionNotifications: preferences.mentionNotifications,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update notification preferences',
    });
  }
});

// Mute conversation
router.post('/conversations/mute', async (req: Request, res: Response) => {
  try {
    const { error, value } = muteConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { conversationId, mutedUntil } = value;
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    await notificationService.muteConversation(userId, conversationId, mutedUntil);

    return res.json({
      message: 'Conversation muted successfully',
    });
  } catch (error) {
    logger.error('Error muting conversation:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mute conversation',
    });
  }
});

// Unmute conversation
router.post('/conversations/unmute', async (req: Request, res: Response) => {
  try {
    const { error, value } = unmuteConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { conversationId } = value;
    const userId = req.user!.userId;

    const notificationService = getNotificationService();
    await notificationService.unmuteConversation(userId, conversationId);

    return res.json({
      message: 'Conversation unmuted successfully',
    });
  } catch (error) {
    logger.error('Error unmuting conversation:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to unmute conversation',
    });
  }
});

// Get conversation notification settings
router.get('/conversations/:conversationId/settings', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Conversation ID is required',
      });
    }

    const notificationService = getNotificationService();
    const settings = await notificationService.getConversationNotificationSettings(userId, conversationId);

    return res.json({
      settings: settings ? {
        id: settings.id,
        isMuted: settings.isMuted,
        mutedUntil: settings.mutedUntil,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      } : {
        isMuted: false,
        mutedUntil: null,
      },
    });
  } catch (error) {
    logger.error('Error getting conversation notification settings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get conversation notification settings',
    });
  }
});

export default router;