import { Router, Request, Response } from 'express';
import { UserService } from '../services/user';
import { authenticateToken, validateRequest } from '../middleware/auth';
import {
  updateUserProfileSchema,
  searchUsersSchema,
  syncContactsSchema,
  blockUserSchema,
  getUsersPresenceSchema,
  uuidParamSchema,
} from '../validation/user';
import {
  UpdateUserProfileRequest,
  SearchUsersRequest,
  SyncContactsRequest,
  BlockUserRequest,
} from '../types';

const router = Router();

/**
 * GET /users/me
 * Get current user profile
 */
router.get('/me',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const user = await UserService.getUserProfile(req.user.userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User profile not found',
          code: 'USER_001',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * PUT /users/me
 * Update current user profile
 */
router.put('/me',
  authenticateToken,
  validateRequest(updateUserProfileSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const updates: UpdateUserProfileRequest = req.body;
      
      const updatedUser = await UserService.updateUserProfile(req.user.userId, updates);

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update user profile error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user profile';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('Validation failed')) {
        statusCode = 400;
        errorCode = 'USER_002';
      } else if (errorMessage.includes('User not found')) {
        statusCode = 404;
        errorCode = 'USER_001';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * GET /users/:id
 * Get user profile by ID
 */
router.get('/:id',
  authenticateToken,
  validateRequest(uuidParamSchema, 'params'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { id } = req.params;
      
      // Check if user is blocked
      const isBlocked = await UserService.isUserBlocked(req.user.userId, id);
      if (isBlocked) {
        res.status(403).json({
          success: false,
          error: 'User is blocked',
          code: 'USER_003',
        });
        return;
      }

      const user = await UserService.getUserProfile(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_001',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /users/search
 * Search users by name or phone number
 */
router.post('/search',
  authenticateToken,
  validateRequest(searchUsersSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { query }: SearchUsersRequest = req.body;
      
      const users = await UserService.searchUsers(query, req.user.userId);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Search users error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to search users',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /users/contacts/sync
 * Sync contacts and identify app users
 */
router.post('/contacts/sync',
  authenticateToken,
  validateRequest(syncContactsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { contacts }: SyncContactsRequest = req.body;
      
      const syncedContacts = await UserService.syncContacts(req.user.userId, contacts);

      res.status(200).json({
        success: true,
        data: syncedContacts,
      });
    } catch (error) {
      console.error('Sync contacts error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to sync contacts',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /users/contacts
 * Get user's contacts
 */
router.get('/contacts',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const contacts = await UserService.getUserContacts(req.user.userId);

      res.status(200).json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      console.error('Get contacts error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get contacts',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /users/block
 * Block a user
 */
router.post('/block',
  authenticateToken,
  validateRequest(blockUserSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { targetUserId }: BlockUserRequest = req.body;
      
      // Prevent users from blocking themselves
      if (targetUserId === req.user.userId) {
        res.status(400).json({
          success: false,
          error: 'Cannot block yourself',
          code: 'USER_004',
        });
        return;
      }

      await UserService.blockUser(req.user.userId, targetUserId);

      res.status(200).json({
        success: true,
        message: 'User blocked successfully',
      });
    } catch (error) {
      console.error('Block user error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to block user';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('Target user not found')) {
        statusCode = 404;
        errorCode = 'USER_001';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * POST /users/unblock
 * Unblock a user
 */
router.post('/unblock',
  authenticateToken,
  validateRequest(blockUserSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { targetUserId }: BlockUserRequest = req.body;

      await UserService.unblockUser(req.user.userId, targetUserId);

      res.status(200).json({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (error) {
      console.error('Unblock user error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to unblock user';
      let statusCode = 500;
      let errorCode = 'SERVER_ERROR';

      if (errorMessage.includes('Contact not found')) {
        statusCode = 404;
        errorCode = 'USER_005';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
      });
    }
  }
);

/**
 * PUT /users/presence
 * Update user presence (online/offline)
 */
router.put('/presence',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { isOnline } = req.body;

      if (typeof isOnline !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isOnline must be a boolean value',
          code: 'USER_002',
        });
        return;
      }

      await UserService.updateUserPresence(req.user.userId, isOnline);

      res.status(200).json({
        success: true,
        message: 'Presence updated successfully',
      });
    } catch (error) {
      console.error('Update presence error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update presence',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /users/presence
 * Get presence status for multiple users
 */
router.post('/presence',
  authenticateToken,
  validateRequest(getUsersPresenceSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_004',
        });
        return;
      }

      const { userIds } = req.body;
      
      const presenceData = await UserService.getUsersPresence(userIds);

      res.status(200).json({
        success: true,
        data: presenceData,
      });
    } catch (error) {
      console.error('Get users presence error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get users presence',
        code: 'SERVER_ERROR',
      });
    }
  }
);

export default router;