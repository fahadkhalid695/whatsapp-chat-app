import { randomUUID } from 'crypto';
import { 
  User, 
  VerificationSession, 
  PhoneVerificationResponse, 
  VerifyCodeResponse 
} from '../types';
import { JWTUtils } from '../utils/jwt';
import { PhoneUtils } from '../utils/phone';
import { SMSService } from './sms';
import { db } from '../database/connection';

/**
 * Authentication service handling user registration and login
 */
export class AuthService {
  private static verificationSessions = new Map<string, VerificationSession>();
  
  // Clean up expired sessions every 5 minutes
  private static _cleanupInterval = setInterval(() => {
    AuthService.cleanupExpiredSessions();
  }, 5 * 60 * 1000);

  /**
   * Initiate phone number verification
   */
  static async initiatePhoneVerification(phoneNumber: string): Promise<PhoneVerificationResponse> {
    // Validate and format phone number
    const formattedPhone = PhoneUtils.formatPhoneNumber(phoneNumber);
    
    // Generate verification code
    const code = PhoneUtils.generateVerificationCode();
    
    // Create verification session
    const verificationId = randomUUID();
    const session: VerificationSession = {
      id: verificationId,
      phoneNumber: formattedPhone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      createdAt: new Date(),
    };
    
    // Store session
    this.verificationSessions.set(verificationId, session);
    
    // Send SMS
    const smsResult = await SMSService.sendVerificationCode(formattedPhone, code);
    
    if (!smsResult.success) {
      // Clean up session if SMS failed
      this.verificationSessions.delete(verificationId);
      throw new Error(`Failed to send verification code: ${smsResult.error}`);
    }
    
    return {
      verificationId,
      message: 'Verification code sent successfully',
    };
  }

  /**
   * Verify code and complete registration/login
   */
  static async verifyCodeAndAuthenticate(
    verificationId: string,
    code: string,
    displayName: string,
    profilePicture?: string
  ): Promise<VerifyCodeResponse> {
    // Get verification session
    const session = this.verificationSessions.get(verificationId);
    
    if (!session) {
      throw new Error('Invalid or expired verification session');
    }
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.verificationSessions.delete(verificationId);
      throw new Error('Verification code has expired');
    }
    
    // Increment attempts
    session.attempts++;
    
    // Check attempt limit
    if (session.attempts > 3) {
      this.verificationSessions.delete(verificationId);
      throw new Error('Too many verification attempts. Please request a new code.');
    }
    
    // Validate code
    if (!PhoneUtils.isValidVerificationCode(code) || session.code !== code) {
      throw new Error('Invalid verification code');
    }
    
    // Clean up session
    this.verificationSessions.delete(verificationId);
    
    // Check if user already exists
    let user = await this.findUserByPhoneNumber(session.phoneNumber);
    
    if (user) {
      // Existing user - login
      user = await this.updateUserLastSeen(user.id);
    } else {
      // New user - register
      user = await this.createUser(session.phoneNumber, displayName, profilePicture);
    }
    
    // Generate tokens
    const tokens = JWTUtils.generateTokens(user.id, user.phoneNumber);
    
    return {
      user,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const newAccessToken = JWTUtils.refreshAccessToken(refreshToken);
      return newAccessToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate tokens - in production, maintain blacklist)
   */
  static async logout(userId: string): Promise<void> {
    // In production, you might want to:
    // 1. Add tokens to a blacklist in Redis
    // 2. Update user's last seen
    // 3. Set user offline status
    
    await this.updateUserLastSeen(userId);
    console.log(`User ${userId} logged out`);
  }

  /**
   * Find user by phone number
   */
  private static async findUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        displayName: row.display_name,
        profilePicture: row.profile_picture,
        status: row.status,
        lastSeen: row.last_seen,
        isOnline: row.is_online,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      throw new Error('Database error');
    }
  }

  /**
   * Create new user
   */
  private static async createUser(
    phoneNumber: string,
    displayName: string,
    profilePicture?: string
  ): Promise<User> {
    const userId = randomUUID();
    
    try {
      const result = await db.query(
        `INSERT INTO users (id, phone_number, display_name, profile_picture, status, is_online, created_at, updated_at, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
         RETURNING *`,
        [userId, phoneNumber, displayName, profilePicture, 'Available', true]
      );
      
      const row = result.rows[0];
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        displayName: row.display_name,
        profilePicture: row.profile_picture,
        status: row.status,
        lastSeen: row.last_seen,
        isOnline: row.is_online,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user's last seen timestamp
   */
  private static async updateUserLastSeen(userId: string): Promise<User> {
    try {
      const result = await db.query(
        `UPDATE users 
         SET last_seen = NOW(), updated_at = NOW(), is_online = true
         WHERE id = $1
         RETURNING *`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        displayName: row.display_name,
        profilePicture: row.profile_picture,
        status: row.status,
        lastSeen: row.last_seen,
        isOnline: row.is_online,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error updating user last seen:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Clean up expired verification sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [id, session] of this.verificationSessions.entries()) {
      if (now > session.expiresAt) {
        this.verificationSessions.delete(id);
      }
    }
  }

  /**
   * Get verification session (for testing)
   */
  static getVerificationSession(verificationId: string): VerificationSession | undefined {
    return this.verificationSessions.get(verificationId);
  }

  /**
   * Clear all verification sessions (for testing)
   */
  static clearVerificationSessions(): void {
    this.verificationSessions.clear();
  }

  /**
   * Stop cleanup interval (for testing)
   */
  static stopCleanupInterval(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
  }
}