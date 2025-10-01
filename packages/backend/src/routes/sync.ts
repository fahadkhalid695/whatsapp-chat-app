import { Router } from 'express';
import { SyncService } from '../services/sync';
import { OfflineQueueService } from '../services/offlineQueue';
import { authMiddleware } from '../middleware/auth';
import { 
  SyncConversationHistoryRequest,
  RegisterDeviceSessionRequest,
  SyncReadReceiptsRequest,
  SyncProfileUpdateRequest
} from '../types';

const router = Router();

// Apply authentication middleware to all sync routes
router.use(authMiddleware);

/**
 * Register a new device session
 */
router.post('/device-session', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { deviceId, platform, userAgent, appVersion }: RegisterDeviceSessionRequest = req.body;

    if (!deviceId || !platform) {
      return res.status(400).json({
        error: 'Device ID and platform are required'
      });
    }

    const session = await SyncService.registerDeviceSession(userId, deviceId, {
      platform,
      userAgent,
      appVersion,
    });

    // Deliver any queued messages for this device
    await OfflineQueueService.deliverQueuedMessages(userId, deviceId);

    res.json({
      session,
      queuedMessageCount: await OfflineQueueService.getQueuedMessageCount(userId, deviceId),
    });
  } catch (error) {
    console.error('Error registering device session:', error);
    res.status(500).json({
      error: 'Failed to register device session'
    });
  }
});

/**
 * Sync conversation history
 */
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { deviceId, lastSyncTimestamp }: SyncConversationHistoryRequest = req.body;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Device ID is required'
      });
    }

    const syncData = await SyncService.syncConversationHistory(
      userId,
      deviceId,
      lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined
    );

    // Update device activity
    await SyncService.updateDeviceActivity(userId, deviceId);

    res.json(syncData);
  } catch (error) {
    console.error('Error syncing conversation history:', error);
    res.status(500).json({
      error: 'Failed to sync conversation history'
    });
  }
});

/**
 * Sync read receipts across devices
 */
router.post('/read-receipts', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { messageIds, deviceId }: SyncReadReceiptsRequest = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        error: 'Message IDs array is required'
      });
    }

    await SyncService.syncReadReceipts(userId, messageIds, deviceId);

    res.json({
      success: true,
      message: 'Read receipts synced successfully'
    });
  } catch (error) {
    console.error('Error syncing read receipts:', error);
    res.status(500).json({
      error: 'Failed to sync read receipts'
    });
  }
});

/**
 * Sync profile updates across devices
 */
router.post('/profile', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { updates, deviceId }: SyncProfileUpdateRequest = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Profile updates are required'
      });
    }

    await SyncService.syncProfileUpdate(userId, updates, deviceId);

    res.json({
      success: true,
      message: 'Profile updates synced successfully'
    });
  } catch (error) {
    console.error('Error syncing profile updates:', error);
    res.status(500).json({
      error: 'Failed to sync profile updates'
    });
  }
});

/**
 * Get active device sessions
 */
router.get('/device-sessions', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const sessions = await SyncService.getActiveDeviceSessions(userId);

    res.json({
      sessions
    });
  } catch (error) {
    console.error('Error getting device sessions:', error);
    res.status(500).json({
      error: 'Failed to get device sessions'
    });
  }
});

/**
 * Deactivate a device session
 */
router.delete('/device-session/:deviceId', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { deviceId } = req.params;

    await SyncService.deactivateDeviceSession(userId, deviceId);

    res.json({
      success: true,
      message: 'Device session deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating device session:', error);
    res.status(500).json({
      error: 'Failed to deactivate device session'
    });
  }
});

/**
 * Get queued message count
 */
router.get('/queue-count/:deviceId?', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { deviceId } = req.params;

    const count = await OfflineQueueService.getQueuedMessageCount(userId, deviceId);

    res.json({
      queuedMessageCount: count
    });
  } catch (error) {
    console.error('Error getting queued message count:', error);
    res.status(500).json({
      error: 'Failed to get queued message count'
    });
  }
});

export default router;