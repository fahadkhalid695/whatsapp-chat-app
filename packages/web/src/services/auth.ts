import api from './api';
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
  async login(data: LoginRequest): Promise<{ verificationId: string }> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async verify(data: VerifyRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/verify', data);
    return response.data;
  },

  async setupProfile(data: ProfileSetupRequest): Promise<User> {
    const response = await api.post('/auth/profile', data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};