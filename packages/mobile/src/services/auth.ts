import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { apiClient } from './api';

interface LoginResponse {
  verificationId: string;
}

interface VerifyPhoneResponse {
  token: string;
  refreshToken: string;
  user: User;
}

class AuthService {
  async login(phoneNumber: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', { phoneNumber });
    return response.data;
  }

  async verifyPhone(verificationId: string, code: string): Promise<VerifyPhoneResponse> {
    const response = await apiClient.post('/auth/verify', {
      verificationId,
      code,
    });
    return response.data;
  }

  async setupProfile(displayName: string, profilePicture?: string): Promise<User> {
    const response = await apiClient.post('/auth/profile', {
      displayName,
      profilePicture,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
    });

    const newToken = response.data.token;
    await AsyncStorage.setItem('auth_token', newToken);
    return newToken;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }
}

export const authService = new AuthService();