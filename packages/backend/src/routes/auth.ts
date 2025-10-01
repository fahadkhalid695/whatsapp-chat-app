import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { authenticateToken, validateRequest } from '../middleware/auth';
import { 
  phoneVerificationSchema, 
  verifyCodeSchema, 
  refreshTokenSchema 
} from '../validation/auth';
import { 
  PhoneVerificationRequest,
  VerifyCodeRequest,
  RefreshTokenRequest 
} from '../types';

const router = Router();

/**
 * POST /auth/verify-phone
 * Initiate phone number verification
 */
router.post('/verify-phone', 
  validateRequest(phoneVerificationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber }: PhoneVerificationRequest = req.body;
      
      const result = await AuthService.initiatePhoneVerification(phoneNumber);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Phone verification error:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Phone verification failed',
        code: 'AUTH_001',
      });
    }
  }
);

/**
 * POST /auth/verify-code
 * Verify code and complete authentication
 */
router.post('/verify-code',
  validateRequest(verifyCodeSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationId, code, displayName, profilePicture }: VerifyCodeRequest = req.body;
      
      const result = await AuthService.verifyCodeAndAuthenticate(
        verificationId,
        code,
        displayName,
        profilePicture
      );
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Code verification error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Code verification failed';
      let statusCode = 400;
      let errorCode = 'AUTH_002';
      
      // Handle specific error cases
      if (errorMessage.includes('expired')) {
        statusCode = 410; // Gone
        errorCode = 'AUTH_002';
      } else if (errorMessage.includes('Invalid verification code')) {
        statusCode = 400;
        errorCode = 'AUTH_002';
      } else if (errorMessage.includes('Too many attempts')) {
        statusCode = 429; // Too Many Requests
        errorCode = 'AUTH_006';
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
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      
      const newAccessToken = await AuthService.refreshAccessToken(refreshToken);
      
      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'AUTH_003',
      });
    }
  }
);

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout',
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
      
      await AuthService.logout(req.user.userId);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user info
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
      
      res.status(200).json({
        success: true,
        data: {
          userId: req.user.userId,
          phoneNumber: req.user.phoneNumber,
        },
      });
    } catch (error) {
      console.error('Get user info error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user info',
        code: 'SERVER_ERROR',
      });
    }
  }
);

export default router;