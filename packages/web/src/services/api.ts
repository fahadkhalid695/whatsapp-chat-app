import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
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

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;