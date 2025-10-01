import request from 'supertest';
import express from 'express';
import authRoutes from '../auth';
import { AuthService } from '../../services/auth';
import { SMSService } from '../../services/sms';

// Mock dependencies
jest.mock('../../services/auth');
jest.mock('../../services/sms');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockSMSService = SMSService as jest.Mocked<typeof SMSService>;

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/verify-phone', () => {
    it('should initiate phone verification successfully', async () => {
      const mockResponse = {
        verificationId: 'test-verification-id',
        message: 'Verification code sent successfully',
      };

      mockAuthService.initiatePhoneVerification.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/verify-phone')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockAuthService.initiatePhoneVerification).toHaveBeenCalledWith('+1234567890');
    });

    it('should return 400 for invalid phone number', async () => {
      const response = await request(app)
        .post('/auth/verify-phone')
        .send({ phoneNumber: 'invalid-phone' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number must be in international format');
    });

    it('should return 400 for missing phone number', async () => {
      const response = await request(app)
        .post('/auth/verify-phone')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number is required');
    });

    it('should handle service errors', async () => {
      mockAuthService.initiatePhoneVerification.mockRejectedValue(
        new Error('SMS service unavailable')
      );

      const response = await request(app)
        .post('/auth/verify-phone')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('SMS service unavailable');
    });
  });

  describe('POST /auth/verify-code', () => {
    const validRequest = {
      verificationId: 'test-verification-id',
      code: '123456',
      displayName: 'Test User',
    };

    it('should verify code successfully', async () => {
      const mockResponse = {
        user: {
          id: 'user-id',
          phoneNumber: '+1234567890',
          displayName: 'Test User',
          status: 'Available',
          lastSeen: new Date(),
          isOnline: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      mockAuthService.verifyCodeAndAuthenticate.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/verify-code')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);
    });

    it('should return 400 for invalid verification code format', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          ...validRequest,
          code: '12345', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Verification code must be 6 digits');
    });

    it('should return 400 for missing display name', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          verificationId: 'test-id',
          code: '123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Display name is required');
    });

    it('should handle expired verification code', async () => {
      mockAuthService.verifyCodeAndAuthenticate.mockRejectedValue(
        new Error('Verification code has expired')
      );

      const response = await request(app)
        .post('/auth/verify-code')
        .send(validRequest);

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Verification code has expired');
    });

    it('should handle too many attempts', async () => {
      mockAuthService.verifyCodeAndAuthenticate.mockRejectedValue(
        new Error('Too many verification attempts. Please request a new code.')
      );

      const response = await request(app)
        .post('/auth/verify-code')
        .send(validRequest);

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Too many verification attempts. Please request a new code.');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const newAccessToken = 'new-access-token';
      mockAuthService.refreshAccessToken.mockResolvedValue(newAccessToken);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(newAccessToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Refresh token is required');
    });
  });
});