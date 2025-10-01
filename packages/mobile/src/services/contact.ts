import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import { apiClient } from './api';
import { Contact } from '../types';

export interface ContactSyncRequest {
  name: string;
  phoneNumber: string;
}

export interface ContactSearchResult {
  id: string;
  displayName: string;
  phoneNumber: string;
  profilePicture?: string;
  isOnline: boolean;
}

class ContactService {
  /**
   * Request permission to access contacts
   */
  async requestContactsPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to find friends who are using the app.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS permission is handled by react-native-contacts
        return true;
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Import contacts from device
   */
  async importDeviceContacts(): Promise<ContactSyncRequest[]> {
    try {
      const hasPermission = await this.requestContactsPermission();
      if (!hasPermission) {
        throw new Error('Contacts permission denied');
      }

      const deviceContacts = await Contacts.getAll();
      
      const formattedContacts: ContactSyncRequest[] = [];
      
      for (const contact of deviceContacts) {
        // Skip contacts without phone numbers
        if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
          continue;
        }

        // Use the first phone number
        const phoneNumber = this.formatPhoneNumber(contact.phoneNumbers[0].number);
        
        // Skip invalid phone numbers
        if (!phoneNumber) {
          continue;
        }

        const name = contact.displayName || 
                    `${contact.givenName || ''} ${contact.familyName || ''}`.trim() ||
                    phoneNumber;

        formattedContacts.push({
          name,
          phoneNumber,
        });
      }

      return formattedContacts;
    } catch (error) {
      console.error('Error importing device contacts:', error);
      if (error instanceof Error && error.message !== 'Failed to import contacts from device') {
        throw error;
      }
      throw new Error('Failed to import contacts from device');
    }
  }

  /**
   * Sync contacts with server
   */
  async syncContacts(contacts: ContactSyncRequest[]): Promise<Contact[]> {
    try {
      const response = await apiClient.post('/users/contacts/sync', {
        contacts,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to sync contacts');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error syncing contacts:', error);
      if (error instanceof Error && error.message !== 'Failed to sync contacts with server') {
        throw error;
      }
      throw new Error('Failed to sync contacts with server');
    }
  }

  /**
   * Get user's contacts from server
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const response = await apiClient.get('/users/contacts');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get contacts');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw new Error('Failed to get contacts');
    }
  }

  /**
   * Search users by name or phone number
   */
  async searchUsers(query: string): Promise<ContactSearchResult[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      const response = await apiClient.post('/users/search', {
        query: query.trim(),
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to search users');
      }

      return response.data.data.map((user: any) => ({
        id: user.id,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        isOnline: user.isOnline,
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.post('/users/block', {
        targetUserId: userId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      throw new Error('Failed to block user');
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.post('/users/unblock', {
        targetUserId: userId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }

  /**
   * Import and sync all contacts
   */
  async importAndSyncContacts(): Promise<Contact[]> {
    try {
      // Import contacts from device
      const deviceContacts = await this.importDeviceContacts();
      
      // Sync with server
      const syncedContacts = await this.syncContacts(deviceContacts);
      
      return syncedContacts;
    } catch (error) {
      console.error('Error importing and syncing contacts:', error);
      throw error;
    }
  }

  /**
   * Format phone number to a consistent format
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Must have at least 10 digits
    if (cleaned.length < 10) {
      return null;
    }

    // Add country code if missing (assuming US +1 for now)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('1') && cleaned.length > 10) {
      return `+${cleaned}`;
    }

    return `+${cleaned}`;
  }
}

export const contactService = new ContactService();