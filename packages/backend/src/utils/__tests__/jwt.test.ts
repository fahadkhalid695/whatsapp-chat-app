import { JWTUtils } from '../jwt';
import { config } from '../../config';

describe('JWTUtils', () => {
  const mockUserId = 'test-user-id';
  const mockPhoneNumber = '+1234567890';

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = JWTUtils.generateTokens(mockUserId, mockPhoneNumber);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = JWTUtils.generateTokens(mockUserId, mockPhoneNumber);
      const payload = JWTUtils.verifyAccessToken(tokens.accessToken);
      
      expect(payload.userId).toBe(mockUserId);
      expect(payload.phoneNumber).toBe(mockPhoneNumber);
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw error for empty token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('');
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = JWTUtils.generateTokens(mockUserId, mockPhoneNumber);
      const payload = JWTUtils.verifyRefreshToken(tokens.refreshToken);
      
      expect(payload.userId).toBe(mockUserId);
      expect(payload.phoneNumber).toBe(mockPhoneNumber);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken('invalid-token');
      }).toThrow('Invalid or expired refresh token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', () => {
      const tokens = JWTUtils.generateTokens(mockUserId, mockPhoneNumber);
      const newAccessToken = JWTUtils.refreshAccessToken(tokens.refreshToken);
      
      expect(typeof newAccessToken).toBe('string');
      expect(newAccessToken).not.toBe(tokens.accessToken);
      
      // Verify the new token
      const payload = JWTUtils.verifyAccessToken(newAccessToken);
      expect(payload.userId).toBe(mockUserId);
      expect(payload.phoneNumber).toBe(mockPhoneNumber);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.refreshAccessToken('invalid-token');
      }).toThrow('Invalid refresh token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(JWTUtils.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader('Basic token')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader('')).toBeNull();
    });

    it('should return null for undefined header', () => {
      expect(JWTUtils.extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should handle Bearer without token', () => {
      expect(JWTUtils.extractTokenFromHeader('Bearer ')).toBe('');
    });
  });
});