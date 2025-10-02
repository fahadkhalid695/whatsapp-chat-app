import { apiClient } from './api';
import { User } from '../types';

export interface LoginRequest {
  phoneNumber: string;
}

export interface VerifyRequest {
  verificationId: string;
  code: string;
}

export interface ProfileSetupRequest {
  displayName: string;
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  async login(data: LoginRequest): Promise<{ verificationId: string; message: string }> {
    const response = await apiClient.post('/auth/verify-phone', data);
    return response.data;
  },

  async verify(data: VerifyRequest & { displayName: string; profilePicture?: string }): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/verify-code', data);
    return {
      token: response.data.tokens.accessToken,
      refreshToken: response.data.tokens.refreshToken,
      user: response.data.user,
    };
  },

  async setupProfile(data: ProfileSetupRequest): Promise<User> {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return { token: response.data.accessToken };
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};