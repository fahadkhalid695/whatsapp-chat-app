import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';
import { authService } from '../services/auth';

interface AuthStore extends AuthState {
  login: (phoneNumber: string) => Promise<{ verificationId: string }>;
  verifyPhone: (verificationId: string, code: string) => Promise<void>;
  setupProfile: (displayName: string, profilePicture?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phoneNumber: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.login(phoneNumber);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyPhone: async (verificationId: string, code: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.verifyPhone(verificationId, code);
      await AsyncStorage.setItem('auth_token', result.token);
      await AsyncStorage.setItem('refresh_token', result.refreshToken);
      
      set({
        token: result.token,
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Verification error:', error);
      throw error;
    }
  },

  setupProfile: async (displayName: string, profilePicture?: string) => {
    set({ isLoading: true });
    try {
      const user = await authService.setupProfile(displayName, profilePicture);
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Profile setup error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const user = await authService.getCurrentUser();
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Load stored auth error:', error);
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => set({ user }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));