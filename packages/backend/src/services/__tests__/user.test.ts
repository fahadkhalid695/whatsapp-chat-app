import { UserService } from '../user';
import { db, DatabaseHelper } from '../../database/connection';
import { UserEntity, ContactEntity } from '../../types';

// Mock the database connection
jest.mock('../../database/connection');

const mockDb = db as jest.Mocked<typeof db>;
const mockDatabaseHelper = DatabaseHelper as jest.Mocked<typeof DatabaseHelper>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserProfile', () => {
    it('should create a new user profile successfully', async () => {
      const mockUserEntity: UserEntity = {
        id: 'user-123',
        phone_number: '+1234567890',
        display_name: 'John Doe',
        profile_picture: 'https://example.com/avatar.jpg',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseHelper.findByField.mockResolvedValue([]);
      mockDatabaseHelper.insert.mockResolvedValue(mockUserEntity);

      const result = await UserService.createUserProfile(
        '+1234567890',
        'John Doe',
        'https://example.com/avatar.jpg'
      );

      expect(result).toEqual({
        id: 'user-123',
        phoneNumber: '+1234567890',
        displayName: 'John Doe',
        profilePicture: 'https://example.com/avatar.jpg',
        status: 'Available',
        lastSeen: mockUserEntity.last_seen,
        isOnline: false,
        createdAt: mockUserEntity.created_at,
        updatedAt: mockUserEntity.updated_at,
      });

      expect(mockDatabaseHelper.findByField).toHaveBeenCalledWith(
        'users',
        'phone_number',
        '+1234567890'
      );
      expect(mockDatabaseHelper.insert).toHaveBeenCalledWith('users', {
        phone_number: '+1234567890',
        display_name: 'John Doe',
        profile_picture: 'https://example.com/avatar.jpg',
        status: 'Available',
        is_online: false,
      });
    });

    it('should throw error if user already exists', async () => {
      const existingUser: UserEntity = {
        id: 'existing-user',
        phone_number: '+1234567890',
        display_name: 'Existing User',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseHelper.findByField.mockResolvedValue([existingUser]);

      await expect(
        UserService.createUserProfile('+1234567890', 'John Doe')
      ).rejects.toThrow('User with this phone number already exists');
    });

    it('should throw validation error for invalid phone number', async () => {
      await expect(
        UserService.createUserProfile('invalid-phone', 'John Doe')
      ).rejects.toThrow('Validation failed: Invalid phone number format');
    });

    it('should throw validation error for invalid display name', async () => {
      await expect(
        UserService.createUserProfile('+1234567890', '')
      ).rejects.toThrow('Validation failed: Display name must be between 1 and 100 characters');
      
      // Ensure database methods are not called when validation fails
      expect(mockDatabaseHelper.findByField).not.toHaveBeenCalled();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const existingUser: UserEntity = {
        id: 'user-123',
        phone_number: '+1234567890',
        display_name: 'John Doe',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedUser: UserEntity = {
        ...existingUser,
        display_name: 'Jane Doe',
        status: 'Busy',
      };

      mockDatabaseHelper.findById.mockResolvedValue(existingUser);
      mockDatabaseHelper.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateUserProfile('user-123', {
        displayName: 'Jane Doe',
        status: 'Busy',
      });

      expect(result.displayName).toBe('Jane Doe');
      expect(result.status).toBe('Busy');
      expect(mockDatabaseHelper.update).toHaveBeenCalledWith('users', 'user-123', {
        display_name: 'Jane Doe',
        status: 'Busy',
      });
    });

    it('should throw error if user not found', async () => {
      mockDatabaseHelper.findById.mockResolvedValue(null);

      await expect(
        UserService.updateUserProfile('non-existent', { displayName: 'New Name' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('searchUsers', () => {
    it('should search users by display name', async () => {
      const mockUsers: UserEntity[] = [
        {
          id: 'user-1',
          phone_number: '+1234567890',
          display_name: 'John Doe',
          status: 'Available',
          last_seen: new Date(),
          is_online: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'user-2',
          phone_number: '+0987654321',
          display_name: 'John Smith',
          status: 'Available',
          last_seen: new Date(),
          is_online: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.query.mockResolvedValue({ rows: mockUsers } as any);

      const result = await UserService.searchUsers('John', 'current-user-id');

      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('John Doe');
      expect(result[1].displayName).toBe('John Smith');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(display_name) LIKE LOWER($1)'),
        ['%John%', '%John%', 'current-user-id']
      );
    });
  });

  describe('syncContacts', () => {
    it('should sync contacts and identify app users', async () => {
      const appUser: UserEntity = {
        id: 'app-user-123',
        phone_number: '+1234567890',
        display_name: 'App User',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const contactEntity: ContactEntity = {
        id: 'contact-123',
        user_id: 'current-user',
        contact_user_id: 'app-user-123',
        name: 'John Doe',
        phone_number: '+1234567890',
        is_app_user: true,
        is_blocked: false,
        added_at: new Date(),
      };

      // Mock getUserByPhoneNumber to return app user
      mockDatabaseHelper.findByField.mockResolvedValueOnce([appUser]);
      
      // Mock existing contact check
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      
      // Mock contact creation
      mockDatabaseHelper.insert.mockResolvedValue(contactEntity);

      const contacts = [{ name: 'John Doe', phoneNumber: '+1234567890' }];
      const result = await UserService.syncContacts('current-user', contacts);

      expect(result).toHaveLength(1);
      expect(result[0].isAppUser).toBe(true);
      expect(result[0].contactUserId).toBe('app-user-123');
    });

    it('should skip invalid phone numbers', async () => {
      const contacts = [
        { name: 'Valid Contact', phoneNumber: '+1234567890' },
        { name: 'Invalid Contact', phoneNumber: 'invalid-phone' },
      ];

      const appUser: UserEntity = {
        id: 'app-user-123',
        phone_number: '+1234567890',
        display_name: 'App User',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const contactEntity: ContactEntity = {
        id: 'contact-123',
        user_id: 'current-user',
        contact_user_id: 'app-user-123',
        name: 'Valid Contact',
        phone_number: '+1234567890',
        is_app_user: true,
        is_blocked: false,
        added_at: new Date(),
      };

      mockDatabaseHelper.findByField.mockResolvedValueOnce([appUser]);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDatabaseHelper.insert.mockResolvedValue(contactEntity);

      const result = await UserService.syncContacts('current-user', contacts);

      expect(result).toHaveLength(1); // Only valid contact should be processed
      expect(result[0].phoneNumber).toBe('+1234567890');
    });
  });

  describe('blockUser', () => {
    it('should block a user successfully', async () => {
      const targetUser: UserEntity = {
        id: 'target-user',
        phone_number: '+1234567890',
        display_name: 'Target User',
        status: 'Available',
        last_seen: new Date(),
        is_online: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseHelper.findById.mockResolvedValue(targetUser);
      mockDb.query
        .mockResolvedValueOnce({ rowCount: 1 } as any) // UPDATE query
        .mockResolvedValueOnce({ rows: [{ exists: true }] } as any); // EXISTS check

      await UserService.blockUser('current-user', 'target-user');

      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('UPDATE contacts'),
        ['current-user', 'target-user']
      );
    });

    it('should throw error if target user not found', async () => {
      mockDatabaseHelper.findById.mockResolvedValue(null);

      await expect(
        UserService.blockUser('current-user', 'non-existent')
      ).rejects.toThrow('Target user not found');
    });
  });

  describe('updateUserPresence', () => {
    it('should update user presence successfully', async () => {
      const updatedUser: UserEntity = {
        id: 'user-123',
        phone_number: '+1234567890',
        display_name: 'John Doe',
        status: 'Available',
        last_seen: new Date(),
        is_online: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDatabaseHelper.update.mockResolvedValue(updatedUser);

      await UserService.updateUserPresence('user-123', true);

      expect(mockDatabaseHelper.update).toHaveBeenCalledWith('users', 'user-123', {
        is_online: true,
        last_seen: expect.any(Date),
      });
    });
  });

  describe('getUsersPresence', () => {
    it('should get presence for multiple users', async () => {
      const presenceData = [
        { id: 'user-1', is_online: true, last_seen: new Date() },
        { id: 'user-2', is_online: false, last_seen: new Date() },
      ];

      mockDb.query.mockResolvedValue({ rows: presenceData } as any);

      const result = await UserService.getUsersPresence(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].isOnline).toBe(true);
      expect(result[1].userId).toBe('user-2');
      expect(result[1].isOnline).toBe(false);
    });

    it('should return empty array for empty user IDs', async () => {
      const result = await UserService.getUsersPresence([]);
      expect(result).toEqual([]);
    });
  });
});