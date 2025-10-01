import { db, DatabaseHelper } from '../database/connection';
import { User, UserEntity, Contact, ContactEntity, UpdateUserProfileRequest } from '../types';
import { ModelTransformer, ModelValidator } from '../models';

export class UserService {
  /**
   * Create a new user profile
   */
  static async createUserProfile(
    phoneNumber: string,
    displayName: string,
    profilePicture?: string
  ): Promise<User> {
    // Validate input
    const userToValidate: Partial<User> = {
      phoneNumber,
      displayName,
    };
    
    if (profilePicture !== undefined) {
      userToValidate.profilePicture = profilePicture;
    }
    
    const validationErrors = ModelValidator.validateUser(userToValidate);

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await DatabaseHelper.findByField<UserEntity>(
      'users',
      'phone_number',
      phoneNumber
    );

    if (existingUser.length > 0) {
      throw new Error('User with this phone number already exists');
    }

    try {
      const insertData: Partial<UserEntity> = {
        phone_number: phoneNumber,
        display_name: displayName,
        status: 'Available',
        is_online: false,
      };
      
      if (profilePicture !== undefined) {
        insertData.profile_picture = profilePicture;
      }
      
      const userEntity = await DatabaseHelper.insert<UserEntity>('users', insertData);

      return ModelTransformer.userEntityToUser(userEntity);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileRequest
  ): Promise<User> {
    // Validate input
    const validationErrors = ModelValidator.validateUser(updates);

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await DatabaseHelper.findById<UserEntity>('users', userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    try {
      const updateData: Partial<UserEntity> = {};
      
      if (updates.displayName !== undefined) {
        updateData.display_name = updates.displayName;
      }
      
      if (updates.profilePicture !== undefined) {
        updateData.profile_picture = updates.profilePicture;
      }
      
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }

      const updatedUserEntity = await DatabaseHelper.update<UserEntity>(
        'users',
        userId,
        updateData
      );

      if (!updatedUserEntity) {
        throw new Error('Failed to update user profile');
      }

      return ModelTransformer.userEntityToUser(updatedUserEntity);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userEntity = await DatabaseHelper.findById<UserEntity>('users', userId);
      
      if (!userEntity) {
        return null;
      }

      return ModelTransformer.userEntityToUser(userEntity);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Get user profile by phone number
   */
  static async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const users = await DatabaseHelper.findByField<UserEntity>(
        'users',
        'phone_number',
        phoneNumber
      );

      if (users.length === 0) {
        return null;
      }

      return ModelTransformer.userEntityToUser(users[0]);
    } catch (error) {
      console.error('Error getting user by phone number:', error);
      throw new Error('Failed to get user by phone number');
    }
  }

  /**
   * Search users by name or phone number
   */
  static async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    try {
      // Search by display name or phone number (excluding current user)
      const searchQuery = `
        SELECT * FROM users 
        WHERE (
          LOWER(display_name) LIKE LOWER($1) 
          OR phone_number LIKE $2
        ) 
        AND id != $3
        ORDER BY display_name
        LIMIT 50
      `;

      const searchPattern = `%${query}%`;
      const result = await db.query<UserEntity>(searchQuery, [
        searchPattern,
        searchPattern,
        currentUserId,
      ]);

      return result.rows.map(userEntity => 
        ModelTransformer.userEntityToUser(userEntity)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Sync contacts and identify app users
   */
  static async syncContacts(
    userId: string,
    contacts: Array<{ name: string; phoneNumber: string }>
  ): Promise<Contact[]> {
    try {
      const syncedContacts: Contact[] = [];

      for (const contact of contacts) {
        // Validate phone number format
        if (!ModelValidator.isValidPhoneNumber(contact.phoneNumber)) {
          continue; // Skip invalid phone numbers
        }

        // Check if contact is an app user
        const appUser = await this.getUserByPhoneNumber(contact.phoneNumber);
        const isAppUser = appUser !== null;
        const contactUserId = appUser?.id;

        // Check if contact already exists
        const existingContactQuery = `
          SELECT * FROM contacts 
          WHERE user_id = $1 AND phone_number = $2
        `;
        
        const existingResult = await db.query<ContactEntity>(existingContactQuery, [
          userId,
          contact.phoneNumber,
        ]);

        let contactEntity: ContactEntity;

        if (existingResult.rows.length > 0) {
          // Update existing contact
          const updateData: Partial<ContactEntity> = {
            name: contact.name,
            is_app_user: isAppUser,
          };
          
          if (contactUserId !== undefined) {
            updateData.contact_user_id = contactUserId;
          }

          const updatedContact = await DatabaseHelper.update<ContactEntity>(
            'contacts',
            existingResult.rows[0].id,
            updateData
          );

          if (!updatedContact) {
            continue;
          }

          contactEntity = updatedContact;
        } else {
          // Create new contact
          const insertData: Partial<ContactEntity> = {
            user_id: userId,
            name: contact.name,
            phone_number: contact.phoneNumber,
            is_app_user: isAppUser,
            is_blocked: false,
          };
          
          if (contactUserId !== undefined) {
            insertData.contact_user_id = contactUserId;
          }
          
          contactEntity = await DatabaseHelper.insert<ContactEntity>('contacts', insertData);
        }

        syncedContacts.push(ModelTransformer.contactEntityToContact(contactEntity));
      }

      return syncedContacts;
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw new Error('Failed to sync contacts');
    }
  }

  /**
   * Get user's contacts
   */
  static async getUserContacts(userId: string): Promise<Contact[]> {
    try {
      const contacts = await DatabaseHelper.findByField<ContactEntity>(
        'contacts',
        'user_id',
        userId
      );

      return contacts.map(contactEntity => 
        ModelTransformer.contactEntityToContact(contactEntity)
      );
    } catch (error) {
      console.error('Error getting user contacts:', error);
      throw new Error('Failed to get user contacts');
    }
  }

  /**
   * Block a user
   */
  static async blockUser(userId: string, targetUserId: string): Promise<void> {
    try {
      // Check if target user exists
      const targetUser = await DatabaseHelper.findById<UserEntity>('users', targetUserId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      // Update contact to blocked status
      const updateQuery = `
        UPDATE contacts 
        SET is_blocked = true 
        WHERE user_id = $1 AND contact_user_id = $2
      `;

      await db.query(updateQuery, [userId, targetUserId]);

      // If no contact exists, create one as blocked
      const contactExists = await db.query(
        'SELECT 1 FROM contacts WHERE user_id = $1 AND contact_user_id = $2',
        [userId, targetUserId]
      );

      if (contactExists.rows.length === 0) {
        const insertData: Partial<ContactEntity> = {
          user_id: userId,
          contact_user_id: targetUserId,
          name: targetUser.display_name,
          phone_number: targetUser.phone_number,
          is_app_user: true,
          is_blocked: true,
        };
        
        await DatabaseHelper.insert<ContactEntity>('contacts', insertData);
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      
      // Re-throw specific errors
      if (error instanceof Error && error.message === 'Target user not found') {
        throw error;
      }
      
      throw new Error('Failed to block user');
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string, targetUserId: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE contacts 
        SET is_blocked = false 
        WHERE user_id = $1 AND contact_user_id = $2
      `;

      const result = await db.query(updateQuery, [userId, targetUserId]);

      if (result.rowCount === 0) {
        throw new Error('Contact not found or not blocked');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }

  /**
   * Check if user is blocked
   */
  static async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const query = `
        SELECT is_blocked FROM contacts 
        WHERE user_id = $1 AND contact_user_id = $2
      `;

      const result = await db.query<{ is_blocked: boolean }>(query, [userId, targetUserId]);

      return result.rows.length > 0 && result.rows[0].is_blocked;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  /**
   * Update user presence (online/offline status)
   */
  static async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    try {
      const updateData: Partial<UserEntity> = {
        is_online: isOnline,
        last_seen: new Date(),
      };

      await DatabaseHelper.update<UserEntity>('users', userId, updateData);
    } catch (error) {
      console.error('Error updating user presence:', error);
      throw new Error('Failed to update user presence');
    }
  }

  /**
   * Get presence status for multiple users
   */
  static async getUsersPresence(userIds: string[]): Promise<Array<{ userId: string; isOnline: boolean; lastSeen: Date }>> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');
      const query = `
        SELECT id, is_online, last_seen 
        FROM users 
        WHERE id IN (${placeholders})
      `;

      const result = await db.query<{ id: string; is_online: boolean; last_seen: Date }>(
        query,
        userIds
      );

      return result.rows.map(row => ({
        userId: row.id,
        isOnline: row.is_online,
        lastSeen: row.last_seen,
      }));
    } catch (error) {
      console.error('Error getting users presence:', error);
      throw new Error('Failed to get users presence');
    }
  }
}