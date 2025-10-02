import crypto from 'crypto';
import { db } from '../database/connection';
import {
  UserReport,
  SecuritySettings,
  DisappearingMessageSettings,
  ReportUserRequest,
  UpdateSecuritySettingsRequest,
  SetDisappearingMessagesRequest,
  GenerateRecoveryCodeRequest,
  UseRecoveryCodeRequest,
  EncryptedMessage,
} from '../types';
import { logger } from '../utils/logger';

export class SecurityService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly RECOVERY_CODE_LENGTH = 32;
  private static readonly RECOVERY_CODE_EXPIRY_HOURS = 24;

  /**
   * Generate encryption key pair for a user
   */
  static async generateUserKeyPair(userId: string, password: string): Promise<{ keyId: string; publicKey: string }> {
    try {
      // Generate RSA key pair for end-to-end encryption
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Encrypt private key with user's password
      const key = crypto.scryptSync(password, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
      encryptedPrivateKey += cipher.final('hex');
      encryptedPrivateKey = iv.toString('hex') + ':' + encryptedPrivateKey;

      const keyId = crypto.randomUUID();

      // Store in database
      await db.query(
        `INSERT INTO encryption_keys (user_id, key_id, public_key, private_key_encrypted)
         VALUES ($1, $2, $3, $4)`,
        [userId, keyId, publicKey, encryptedPrivateKey]
      );

      return { keyId, publicKey };
    } catch (error) {
      logger.error('Error generating user key pair:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  /**
   * Get user's public key
   */
  static async getUserPublicKey(userId: string): Promise<string | null> {
    try {
      const result = await db.query(
        'SELECT public_key FROM encryption_keys WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0].public_key : null;
    } catch (error) {
      logger.error('Error getting user public key:', error);
      return null;
    }
  }

  /**
   * Encrypt message content
   */
  static encryptMessage(content: string, recipientPublicKey: string): EncryptedMessage {
    try {
      // Generate symmetric key for this message
      const symmetricKey = crypto.randomBytes(this.KEY_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Encrypt content with symmetric key
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, symmetricKey, iv);
      let encryptedContent = cipher.update(content, 'utf8', 'hex');
      encryptedContent += cipher.final('hex');

      // Encrypt symmetric key with recipient's public key
      const encryptedKey = crypto.publicEncrypt(recipientPublicKey, symmetricKey);
      const keyId = encryptedKey.toString('base64');

      return {
        encryptedContent,
        keyId,
        iv: iv.toString('hex')
      };
    } catch (error) {
      logger.error('Error encrypting message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message content
   */
  static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    userId: string,
    password: string
  ): Promise<string> {
    try {
      // Get user's private key
      const keyResult = await db.query(
        'SELECT private_key_encrypted FROM encryption_keys WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('No encryption key found for user');
      }

      // Decrypt private key
      const encryptedData = keyResult.rows[0].private_key_encrypted;
      const [ivHex, encryptedPrivateKey] = encryptedData.split(':');
      const key = crypto.scryptSync(password, 'salt', 32);
      const decryptIv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, decryptIv);
      let privateKey = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
      privateKey += decipher.final('utf8');

      // Decrypt symmetric key with private key
      const encryptedSymmetricKey = Buffer.from(encryptedMessage.keyId, 'base64');
      const symmetricKey = crypto.privateDecrypt(privateKey, encryptedSymmetricKey);

      // Decrypt content with symmetric key
      const contentIv = Buffer.from(encryptedMessage.iv, 'hex');
      const contentDecipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, symmetricKey, contentIv);
      let decryptedContent = contentDecipher.update(encryptedMessage.encryptedContent, 'hex', 'utf8');
      decryptedContent += contentDecipher.final('utf8');

      return decryptedContent;
    } catch (error) {
      logger.error('Error decrypting message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Report a user
   */
  static async reportUser(reporterId: string, reportData: ReportUserRequest): Promise<UserReport> {
    try {
      // Verify reported user exists
      const userCheck = await db.query('SELECT 1 FROM users WHERE id = $1', [reportData.reportedUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Reported user not found');
      }

      // Verify message exists if provided
      if (reportData.messageId) {
        const messageCheck = await db.query(
          'SELECT 1 FROM messages WHERE id = $1 AND is_deleted = false',
          [reportData.messageId]
        );
        if (messageCheck.rows.length === 0) {
          throw new Error('Reported message not found');
        }
      }

      // Verify conversation exists if provided
      if (reportData.conversationId) {
        const conversationCheck = await db.query(
          'SELECT 1 FROM conversations WHERE id = $1',
          [reportData.conversationId]
        );
        if (conversationCheck.rows.length === 0) {
          throw new Error('Reported conversation not found');
        }
      }

      // Create report
      const result = await db.query(
        `INSERT INTO user_reports (reporter_id, reported_user_id, reason, description, message_id, conversation_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          reporterId,
          reportData.reportedUserId,
          reportData.reason,
          reportData.description || null,
          reportData.messageId || null,
          reportData.conversationId || null
        ]
      );

      const reportEntity = result.rows[0];

      return {
        id: reportEntity.id,
        reporterId: reportEntity.reporter_id,
        reportedUserId: reportEntity.reported_user_id,
        reason: reportEntity.reason,
        description: reportEntity.description,
        messageId: reportEntity.message_id,
        conversationId: reportEntity.conversation_id,
        status: reportEntity.status,
        createdAt: reportEntity.created_at,
        reviewedAt: reportEntity.reviewed_at,
        reviewedBy: reportEntity.reviewed_by
      };
    } catch (error) {
      logger.error('Error reporting user:', error);
      throw error;
    }
  }

  /**
   * Get user's security settings
   */
  static async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    try {
      const result = await db.query(
        'SELECT * FROM security_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default settings if they don't exist
        const defaultSettings = await db.query(
          `INSERT INTO security_settings (user_id) VALUES ($1) RETURNING *`,
          [userId]
        );
        const settings = defaultSettings.rows[0];
        
        return {
          userId: settings.user_id,
          twoFactorEnabled: settings.two_factor_enabled,
          readReceiptsEnabled: settings.read_receipts_enabled,
          lastSeenEnabled: settings.last_seen_enabled,
          profilePhotoVisibility: settings.profile_photo_visibility,
          statusVisibility: settings.status_visibility,
          blockedUsers: settings.blocked_users || [],
          createdAt: settings.created_at,
          updatedAt: settings.updated_at
        };
      }

      const settings = result.rows[0];
      return {
        userId: settings.user_id,
        twoFactorEnabled: settings.two_factor_enabled,
        readReceiptsEnabled: settings.read_receipts_enabled,
        lastSeenEnabled: settings.last_seen_enabled,
        profilePhotoVisibility: settings.profile_photo_visibility,
        statusVisibility: settings.status_visibility,
        blockedUsers: settings.blocked_users || [],
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      };
    } catch (error) {
      logger.error('Error getting security settings:', error);
      throw new Error('Failed to get security settings');
    }
  }

  /**
   * Update user's security settings
   */
  static async updateSecuritySettings(
    userId: string,
    updates: UpdateSecuritySettingsRequest
  ): Promise<SecuritySettings> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.twoFactorEnabled !== undefined) {
        updateFields.push(`two_factor_enabled = $${paramIndex++}`);
        updateValues.push(updates.twoFactorEnabled);
      }

      if (updates.readReceiptsEnabled !== undefined) {
        updateFields.push(`read_receipts_enabled = $${paramIndex++}`);
        updateValues.push(updates.readReceiptsEnabled);
      }

      if (updates.lastSeenEnabled !== undefined) {
        updateFields.push(`last_seen_enabled = $${paramIndex++}`);
        updateValues.push(updates.lastSeenEnabled);
      }

      if (updates.profilePhotoVisibility !== undefined) {
        updateFields.push(`profile_photo_visibility = $${paramIndex++}`);
        updateValues.push(updates.profilePhotoVisibility);
      }

      if (updates.statusVisibility !== undefined) {
        updateFields.push(`status_visibility = $${paramIndex++}`);
        updateValues.push(updates.statusVisibility);
      }

      if (updateFields.length === 0) {
        return this.getSecuritySettings(userId);
      }

      updateValues.push(userId);

      const result = await db.query(
        `UPDATE security_settings 
         SET ${updateFields.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Security settings not found');
      }

      const settings = result.rows[0];
      return {
        userId: settings.user_id,
        twoFactorEnabled: settings.two_factor_enabled,
        readReceiptsEnabled: settings.read_receipts_enabled,
        lastSeenEnabled: settings.last_seen_enabled,
        profilePhotoVisibility: settings.profile_photo_visibility,
        statusVisibility: settings.status_visibility,
        blockedUsers: settings.blocked_users || [],
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      };
    } catch (error) {
      logger.error('Error updating security settings:', error);
      throw new Error('Failed to update security settings');
    }
  }

  /**
   * Set disappearing messages for a conversation
   */
  static async setDisappearingMessages(
    userId: string,
    request: SetDisappearingMessagesRequest
  ): Promise<DisappearingMessageSettings> {
    try {
      // Verify user is a participant in the conversation
      const participantCheck = await db.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [request.conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        throw new Error('User is not a participant in this conversation');
      }

      // Update or insert disappearing messages settings
      const result = await db.query(
        `INSERT INTO disappearing_messages (conversation_id, timer_duration, enabled_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (conversation_id)
         DO UPDATE SET timer_duration = $2, enabled_by = $3, enabled_at = NOW()
         RETURNING *`,
        [request.conversationId, request.timerDuration, userId]
      );

      const settings = result.rows[0];
      return {
        conversationId: settings.conversation_id,
        timerDuration: settings.timer_duration,
        enabledBy: settings.enabled_by,
        enabledAt: settings.enabled_at
      };
    } catch (error) {
      logger.error('Error setting disappearing messages:', error);
      throw new Error('Failed to set disappearing messages');
    }
  }

  /**
   * Get disappearing messages settings for a conversation
   */
  static async getDisappearingMessages(conversationId: string): Promise<DisappearingMessageSettings | null> {
    try {
      const result = await db.query(
        'SELECT * FROM disappearing_messages WHERE conversation_id = $1',
        [conversationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const settings = result.rows[0];
      return {
        conversationId: settings.conversation_id,
        timerDuration: settings.timer_duration,
        enabledBy: settings.enabled_by,
        enabledAt: settings.enabled_at
      };
    } catch (error) {
      logger.error('Error getting disappearing messages settings:', error);
      return null;
    }
  }

  /**
   * Generate account recovery code
   */
  static async generateRecoveryCode(request: GenerateRecoveryCodeRequest): Promise<string> {
    try {
      // Verify user exists
      const userResult = await db.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [request.phoneNumber]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult.rows[0].id;

      // Generate recovery code
      const recoveryCode = crypto.randomBytes(this.RECOVERY_CODE_LENGTH).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.RECOVERY_CODE_EXPIRY_HOURS);

      // Store recovery code
      await db.query(
        `INSERT INTO account_recovery (user_id, recovery_code, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, recoveryCode, expiresAt]
      );

      return recoveryCode;
    } catch (error) {
      logger.error('Error generating recovery code:', error);
      throw new Error('Failed to generate recovery code');
    }
  }

  /**
   * Use recovery code to recover account
   */
  static async useRecoveryCode(request: UseRecoveryCodeRequest): Promise<{ userId: string; success: boolean }> {
    try {
      // Find valid recovery code
      const result = await db.query(
        `SELECT ar.id, ar.user_id, u.phone_number
         FROM account_recovery ar
         JOIN users u ON ar.user_id = u.id
         WHERE u.phone_number = $1 
           AND ar.recovery_code = $2 
           AND ar.expires_at > NOW() 
           AND ar.is_used = false`,
        [request.phoneNumber, request.recoveryCode]
      );

      if (result.rows.length === 0) {
        return { userId: '', success: false };
      }

      const recovery = result.rows[0];

      // Mark recovery code as used
      await db.query(
        'UPDATE account_recovery SET is_used = true, used_at = NOW() WHERE id = $1',
        [recovery.id]
      );

      // Update user profile if new display name provided
      if (request.newDisplayName) {
        await db.query(
          'UPDATE users SET display_name = $1 WHERE id = $2',
          [request.newDisplayName, recovery.user_id]
        );
      }

      return { userId: recovery.user_id, success: true };
    } catch (error) {
      logger.error('Error using recovery code:', error);
      throw new Error('Failed to use recovery code');
    }
  }

  /**
   * Delete expired messages (called by cron job)
   */
  static async deleteExpiredMessages(): Promise<number> {
    try {
      // Check if database is connected
      if (!db.getPoolInfo().isConnected) {
        logger.warn('Database not connected. Skipping expired messages cleanup.');
        return 0;
      }

      await db.query('SELECT delete_expired_messages()');
      
      // Get count of deleted messages
      const countResult = await db.query(
        `SELECT COUNT(*) as count FROM messages 
         WHERE expires_at IS NOT NULL 
           AND expires_at <= NOW() 
           AND is_deleted = true 
           AND content->>'text' = 'This message has disappeared'`
      );

      const deletedCount = parseInt(countResult.rows[0].count);
      logger.info(`Deleted ${deletedCount} expired messages`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting expired messages:', error);
      return 0;
    }
  }

  /**
   * Set message expiration time based on disappearing messages settings
   */
  static async setMessageExpiration(messageId: string, conversationId: string): Promise<void> {
    try {
      const settings = await this.getDisappearingMessages(conversationId);
      
      if (settings && settings.timerDuration > 0) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + settings.timerDuration);

        await db.query(
          'UPDATE messages SET expires_at = $1 WHERE id = $2',
          [expiresAt, messageId]
        );
      }
    } catch (error) {
      logger.error('Error setting message expiration:', error);
      // Don't throw - this is not critical for message sending
    }
  }

  /**
   * Block user (enhanced version with security settings update)
   */
  static async blockUser(userId: string, targetUserId: string): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Add to blocked users array in security settings
        await client.query(
          `UPDATE security_settings 
           SET blocked_users = array_append(blocked_users, $2)
           WHERE user_id = $1 AND NOT ($2 = ANY(blocked_users))`,
          [userId, targetUserId]
        );

        // Update contact to blocked status
        await client.query(
          `UPDATE contacts 
           SET is_blocked = true 
           WHERE user_id = $1 AND contact_user_id = $2`,
          [userId, targetUserId]
        );
      });
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw new Error('Failed to block user');
    }
  }

  /**
   * Unblock user (enhanced version with security settings update)
   */
  static async unblockUser(userId: string, targetUserId: string): Promise<void> {
    try {
      await db.transaction(async (client) => {
        // Remove from blocked users array in security settings
        await client.query(
          `UPDATE security_settings 
           SET blocked_users = array_remove(blocked_users, $2)
           WHERE user_id = $1`,
          [userId, targetUserId]
        );

        // Update contact to unblocked status
        await client.query(
          `UPDATE contacts 
           SET is_blocked = false 
           WHERE user_id = $1 AND contact_user_id = $2`,
          [userId, targetUserId]
        );
      });
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }
}