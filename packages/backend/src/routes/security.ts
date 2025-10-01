import express from 'express';
import { SecurityService } from '../services/security';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  ReportUserRequest,
  UpdateSecuritySettingsRequest,
  SetDisappearingMessagesRequest,
  GenerateRecoveryCodeRequest,
  UseRecoveryCodeRequest,
} from '../types';

const router = express.Router();

/**
 * Report a user
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const reportData: ReportUserRequest = req.body;

    // Validate required fields
    if (!reportData.reportedUserId || !reportData.reason) {
      return res.status(400).json({
        error: 'Missing required fields: reportedUserId, reason'
      });
    }

    // Validate reason
    const validReasons = ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'other'];
    if (!validReasons.includes(reportData.reason)) {
      return res.status(400).json({
        error: 'Invalid reason. Must be one of: ' + validReasons.join(', ')
      });
    }

    // Prevent self-reporting
    if (reportData.reportedUserId === userId) {
      return res.status(400).json({
        error: 'Cannot report yourself'
      });
    }

    const report = await SecurityService.reportUser(userId, reportData);

    return res.status(201).json({
      message: 'User reported successfully',
      report
    });
  } catch (error) {
    logger.error('Error in POST /security/report:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }
    
    return res.status(500).json({ error: 'Failed to report user' });
  }
});

/**
 * Get user's security settings
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const settings = await SecurityService.getSecuritySettings(userId);

    return res.json(settings);
  } catch (error) {
    logger.error('Error in GET /security/settings:', error);
    return res.status(500).json({ error: 'Failed to get security settings' });
  }
});

/**
 * Update user's security settings
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const updates: UpdateSecuritySettingsRequest = req.body;

    // Validate visibility options
    const validVisibility = ['everyone', 'contacts', 'nobody'];
    if (updates.profilePhotoVisibility && !validVisibility.includes(updates.profilePhotoVisibility)) {
      return res.status(400).json({
        error: 'Invalid profilePhotoVisibility. Must be one of: ' + validVisibility.join(', ')
      });
    }

    if (updates.statusVisibility && !validVisibility.includes(updates.statusVisibility)) {
      return res.status(400).json({
        error: 'Invalid statusVisibility. Must be one of: ' + validVisibility.join(', ')
      });
    }

    const settings = await SecurityService.updateSecuritySettings(userId, updates);

    return res.json({
      message: 'Security settings updated successfully',
      settings
    });
  } catch (error) {
    logger.error('Error in PUT /security/settings:', error);
    return res.status(500).json({ error: 'Failed to update security settings' });
  }
});

/**
 * Set disappearing messages for a conversation
 */
router.post('/disappearing-messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const request: SetDisappearingMessagesRequest = req.body;

    // Validate required fields
    if (!request.conversationId || request.timerDuration === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: conversationId, timerDuration'
      });
    }

    // Validate timer duration (0 = disabled, or positive number of seconds)
    if (request.timerDuration < 0) {
      return res.status(400).json({
        error: 'Timer duration must be 0 (disabled) or a positive number of seconds'
      });
    }

    const settings = await SecurityService.setDisappearingMessages(userId, request);

    return res.json({
      message: 'Disappearing messages settings updated successfully',
      settings
    });
  } catch (error) {
    logger.error('Error in POST /security/disappearing-messages:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not a participant')) {
        return res.status(403).json({ error: error.message });
      }
    }
    
    return res.status(500).json({ error: 'Failed to set disappearing messages' });
  }
});

/**
 * Get disappearing messages settings for a conversation
 */
router.get('/disappearing-messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const settings = await SecurityService.getDisappearingMessages(conversationId);

    if (!settings) {
      return res.json({
        conversationId,
        timerDuration: 0,
        enabledBy: null,
        enabledAt: null
      });
    }

    return res.json(settings);
  } catch (error) {
    logger.error('Error in GET /security/disappearing-messages/:conversationId:', error);
    return res.status(500).json({ error: 'Failed to get disappearing messages settings' });
  }
});

/**
 * Generate account recovery code
 */
router.post('/recovery/generate', async (req, res) => {
  try {
    const request: GenerateRecoveryCodeRequest = req.body;

    // Validate required fields
    if (!request.phoneNumber) {
      return res.status(400).json({
        error: 'Missing required field: phoneNumber'
      });
    }

    const recoveryCode = await SecurityService.generateRecoveryCode(request);

    // In a real implementation, you would send this code via SMS
    // For now, we'll return it in the response (NOT recommended for production)
    return res.json({
      message: 'Recovery code generated successfully',
      recoveryCode, // Remove this in production
      expiresIn: '24 hours'
    });
  } catch (error) {
    logger.error('Error in POST /security/recovery/generate:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(500).json({ error: 'Failed to generate recovery code' });
  }
});

/**
 * Use recovery code to recover account
 */
router.post('/recovery/use', async (req, res) => {
  try {
    const request: UseRecoveryCodeRequest = req.body;

    // Validate required fields
    if (!request.phoneNumber || !request.recoveryCode) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, recoveryCode'
      });
    }

    const result = await SecurityService.useRecoveryCode(request);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid or expired recovery code'
      });
    }

    return res.json({
      message: 'Account recovered successfully',
      userId: result.userId
    });
  } catch (error) {
    logger.error('Error in POST /security/recovery/use:', error);
    return res.status(500).json({ error: 'Failed to use recovery code' });
  }
});

/**
 * Block a user
 */
router.post('/block', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        error: 'Missing required field: targetUserId'
      });
    }

    if (targetUserId === userId) {
      return res.status(400).json({
        error: 'Cannot block yourself'
      });
    }

    await SecurityService.blockUser(userId, targetUserId);

    return res.json({
      message: 'User blocked successfully'
    });
  } catch (error) {
    logger.error('Error in POST /security/block:', error);
    return res.status(500).json({ error: 'Failed to block user' });
  }
});

/**
 * Unblock a user
 */
router.post('/unblock', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        error: 'Missing required field: targetUserId'
      });
    }

    await SecurityService.unblockUser(userId, targetUserId);

    return res.json({
      message: 'User unblocked successfully'
    });
  } catch (error) {
    logger.error('Error in POST /security/unblock:', error);
    return res.status(500).json({ error: 'Failed to unblock user' });
  }
});

/**
 * Generate encryption keys for a user
 */
router.post('/encryption/generate-keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Missing required field: password'
      });
    }

    const keyPair = await SecurityService.generateUserKeyPair(userId, password);

    return res.json({
      message: 'Encryption keys generated successfully',
      keyId: keyPair.keyId,
      publicKey: keyPair.publicKey
    });
  } catch (error) {
    logger.error('Error in POST /security/encryption/generate-keys:', error);
    return res.status(500).json({ error: 'Failed to generate encryption keys' });
  }
});

/**
 * Get user's public key
 */
router.get('/encryption/public-key/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const publicKey = await SecurityService.getUserPublicKey(userId);

    if (!publicKey) {
      return res.status(404).json({
        error: 'Public key not found for user'
      });
    }

    return res.json({
      userId,
      publicKey
    });
  } catch (error) {
    logger.error('Error in GET /security/encryption/public-key/:userId:', error);
    return res.status(500).json({ error: 'Failed to get public key' });
  }
});

export default router;