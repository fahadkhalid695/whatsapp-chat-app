import { contactService } from '../contact';

// Mock the API client
jest.mock('../api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock react-native-contacts
jest.mock('react-native-contacts', () => ({
  getAll: jest.fn(),
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => ({
  PermissionsAndroid: {
    PERMISSIONS: {
      READ_CONTACTS: 'android.permission.READ_CONTACTS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    request: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

import { apiClient } from '../api';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid } from 'react-native';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockContacts = Contacts as jest.Mocked<typeof Contacts>;
const mockPermissionsAndroid = PermissionsAndroid as jest.Mocked<typeof PermissionsAndroid>;

describe('ContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncContacts', () => {
    it('should sync contacts with server successfully', async () => {
      const mockContacts = [
        { name: 'John Doe', phoneNumber: '+1234567890' },
        { name: 'Jane Smith', phoneNumber: '+0987654321' },
      ];

      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: '1',
              userId: 'user1',
              name: 'John Doe',
              phoneNumber: '+1234567890',
              isAppUser: true,
              isBlocked: false,
              addedAt: new Date(),
            },
          ],
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await contactService.syncContacts(mockContacts);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/contacts/sync', {
        contacts: mockContacts,
      });
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should throw error when sync fails', async () => {
      const mockContacts = [
        { name: 'John Doe', phoneNumber: '+1234567890' },
      ];

      const mockResponse = {
        data: {
          success: false,
          error: 'Sync failed',
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await expect(contactService.syncContacts(mockContacts)).rejects.toThrow('Sync failed');
    });
  });

  describe('getContacts', () => {
    it('should get contacts from server successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: '1',
              userId: 'user1',
              name: 'John Doe',
              phoneNumber: '+1234567890',
              isAppUser: true,
              isBlocked: false,
              addedAt: new Date(),
            },
          ],
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await contactService.getContacts();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/contacts');
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const query = 'John';
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: '1',
              displayName: 'John Doe',
              phoneNumber: '+1234567890',
              isOnline: true,
            },
          ],
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await contactService.searchUsers(query);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/search', {
        query,
      });
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should return empty array for empty query', async () => {
      const result = await contactService.searchUsers('');
      expect(result).toEqual([]);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      const userId = 'user123';
      const mockResponse = {
        data: {
          success: true,
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await contactService.blockUser(userId);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/block', {
        targetUserId: userId,
      });
    });
  });

  describe('unblockUser', () => {
    it('should unblock user successfully', async () => {
      const userId = 'user123';
      const mockResponse = {
        data: {
          success: true,
        },
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      await contactService.unblockUser(userId);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/unblock', {
        targetUserId: userId,
      });
    });
  });

  describe('requestContactsPermission', () => {
    it('should request permission on Android', async () => {
      mockPermissionsAndroid.request.mockResolvedValue('granted');

      const result = await contactService.requestContactsPermission();

      expect(mockPermissionsAndroid.request).toHaveBeenCalledWith(
        'android.permission.READ_CONTACTS',
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it('should return false when permission denied', async () => {
      mockPermissionsAndroid.request.mockResolvedValue('denied');

      const result = await contactService.requestContactsPermission();

      expect(result).toBe(false);
    });
  });

  describe('importDeviceContacts', () => {
    it('should import device contacts successfully', async () => {
      const mockDeviceContacts = [
        {
          displayName: 'John Doe',
          phoneNumbers: [{ number: '1234567890' }],
        },
        {
          displayName: 'Jane Smith',
          phoneNumbers: [{ number: '0987654321' }],
        },
      ];

      mockPermissionsAndroid.request.mockResolvedValue('granted');
      mockContacts.getAll.mockResolvedValue(mockDeviceContacts as any);

      const result = await contactService.importDeviceContacts();

      expect(result).toEqual([
        { name: 'John Doe', phoneNumber: '+11234567890' },
        { name: 'Jane Smith', phoneNumber: '+10987654321' },
      ]);
    });

    it('should throw error when permission denied', async () => {
      mockPermissionsAndroid.request.mockResolvedValue('denied');

      await expect(contactService.importDeviceContacts()).rejects.toThrow('Contacts permission denied');
    });
  });
});