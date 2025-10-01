import { create } from 'zustand';
import { Contact } from '../types';
import { contactService, ContactSearchResult } from '../services/contact';

interface ContactState {
  contacts: Contact[];
  searchResults: ContactSearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  error: string | null;
  searchQuery: string;
  
  // Actions
  loadContacts: () => Promise<void>;
  syncContacts: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  blockContact: (userId: string) => Promise<void>;
  unblockContact: (userId: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  isSyncing: false,
  error: null,
  searchQuery: '',

  loadContacts: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const contacts = await contactService.getContacts();
      set({ contacts, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load contacts';
      set({ error: errorMessage, isLoading: false });
    }
  },

  syncContacts: async () => {
    set({ isSyncing: true, error: null });
    
    try {
      const syncedContacts = await contactService.importAndSyncContacts();
      set({ contacts: syncedContacts, isSyncing: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync contacts';
      set({ error: errorMessage, isSyncing: false });
    }
  },

  searchUsers: async (query: string) => {
    set({ isSearching: true, searchQuery: query, error: null });
    
    try {
      const searchResults = await contactService.searchUsers(query);
      set({ searchResults, isSearching: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search users';
      set({ error: errorMessage, isSearching: false, searchResults: [] });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchQuery: '', isSearching: false });
  },

  blockContact: async (userId: string) => {
    try {
      await contactService.blockUser(userId);
      
      // Update local state
      const { contacts } = get();
      const updatedContacts = contacts.map(contact => 
        contact.contactUserId === userId 
          ? { ...contact, isBlocked: true }
          : contact
      );
      
      set({ contacts: updatedContacts });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to block user';
      set({ error: errorMessage });
    }
  },

  unblockContact: async (userId: string) => {
    try {
      await contactService.unblockUser(userId);
      
      // Update local state
      const { contacts } = get();
      const updatedContacts = contacts.map(contact => 
        contact.contactUserId === userId 
          ? { ...contact, isBlocked: false }
          : contact
      );
      
      set({ contacts: updatedContacts });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unblock user';
      set({ error: errorMessage });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));