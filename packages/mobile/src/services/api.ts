import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api' 
  : 'https://your-production-api.com/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const newToken = response.data.token;
              await AsyncStorage.setItem('auth_token', newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
            // You might want to emit an event here to trigger logout in the app
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async patch(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export const apiService = apiClient;

// Message search functions
export const searchMessages = async (
  query?: string,
  conversationId?: string,
  mediaType?: string,
  limit: number = 50,
  offset: number = 0
) => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (conversationId) params.append('conversationId', conversationId);
  if (mediaType) params.append('mediaType', mediaType);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return apiClient.get(`/messages/search?${params.toString()}`);
};

export const searchInConversation = async (
  conversationId: string,
  query?: string,
  mediaType?: string,
  limit: number = 50,
  offset: number = 0
) => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (mediaType) params.append('mediaType', mediaType);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  return apiClient.get(`/conversations/${conversationId}/messages/search?${params.toString()}`);
};

export const getMediaMessages = async (options: {
  conversationId?: string;
  mediaTypes?: string[];
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (options.conversationId) params.append('conversationId', options.conversationId);
  if (options.mediaTypes) {
    options.mediaTypes.forEach(type => params.append('mediaTypes', type));
  }
  params.append('limit', (options.limit || 50).toString());
  params.append('offset', (options.offset || 0).toString());

  return apiClient.get(`/messages/media?${params.toString()}`);
};