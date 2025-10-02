import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, AuthTokens } from '../types';

/**
 * JWT token generation and validation utilities
 */
export class JWTUtils {
  /**
   * Generate access and refresh tokens for a user
   */
  static generateTokens(userId: string, phoneNumber: string): AuthTokens {
    const payload: JWTPayload = {
      userId,
      phoneNumber,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: config.jwt.expiresIn,
    } as any);

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret as string, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Generate new access token from refresh token
   */
  static refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    
    const newPayload: JWTPayload = {
      userId: payload.userId,
      phoneNumber: payload.phoneNumber,
    };

    return jwt.sign(newPayload, config.jwt.secret as string, {
      expiresIn: config.jwt.expiresIn,
    } as any);
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}