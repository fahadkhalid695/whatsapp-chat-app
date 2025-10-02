import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// API Response types matching backend
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePicture?: string;
  status: string;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  admins?: string[];
  lastMessage?: Message;
  lastActivity: Date;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: {
    text?: string;
    mediaId?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    thumbnailUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  timestamp: Date;
  deliveredTo: string[];
  readBy: string[];
  isDeleted: boolean;
  replyTo?: string;
  editedAt?: Date;
}

class ApiClient {
  private client: AxiosInstance;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and handle loading
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and retry logic
    this.client.interceptors.response.use(
      (response) => {
        this.reconnectAttempts = 0; // Reset on successful request
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = useAuthStore.getState().token;
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors with retry logic
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            
            console.log(`Network error, retrying in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(originalRequest);
          }
        }

        // Handle server errors
        if (error.response?.status >= 500) {
          console.error('Server error:', error.response.data);
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken } = response.data.data;
      useAuthStore.getState().setToken(accessToken);
    } catch (error) {
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  // Enhanced API methods with better error handling
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.get(url, config);
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'GET', url);
      throw error;
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.post(url, data, config);
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'POST', url);
      throw error;
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.put(url, data, config);
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'PUT', url);
      throw error;
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.delete(url, config);
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'DELETE', url);
      throw error;
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'PATCH', url);
      throw error;
    }
  }

  // File upload with progress tracking
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response.data.data || response.data;
    } catch (error) {
      this.handleApiError(error, 'UPLOAD', url);
      throw error;
    }
  }

  private handleApiError(error: any, method: string, url: string) {
    const errorInfo = {
      method,
      url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      timestamp: new Date().toISOString(),
    };

    console.error('API Error:', errorInfo);

    // You could send this to an error tracking service like Sentry
    // this.sendToErrorTracking(errorInfo);
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get connection status
  getConnectionStatus(): 'online' | 'offline' | 'reconnecting' {
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return navigator.onLine ? 'online' : 'offline';
  }

  // Authentication API methods
  async login(phoneNumber: string): Promise<{ verificationId: string }> {
    return this.post('/auth/login', { phoneNumber });
  }

  async verifyCode(phoneNumber: string, code: string): Promise<{ user: User; token: string }> {
    return this.post('/auth/verify', { phoneNumber, code });
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.post('/auth/refresh');
  }

  // User API methods
  async getProfile(): Promise<User> {
    return this.get('/users/profile');
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.put('/users/profile', updates);
  }

  async getContacts(): Promise<User[]> {
    return this.get('/users/contacts');
  }

  async syncContacts(contacts: { name: string; phoneNumber: string }[]): Promise<User[]> {
    return this.post('/users/sync-contacts', { contacts });
  }

  // Conversation API methods
  async getConversations(): Promise<Conversation[]> {
    return this.get('/conversations');
  }

  async createConversation(type: 'direct' | 'group', participants: string[], name?: string): Promise<Conversation> {
    return this.post('/conversations', { type, participants, name });
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.get(`/conversations/${id}`);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    return this.put(`/conversations/${id}`, updates);
  }

  async deleteConversation(id: string): Promise<void> {
    return this.delete(`/conversations/${id}`);
  }

  // Message API methods
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<{ messages: Message[]; hasMore: boolean }> {
    return this.get(`/messages/${conversationId}?page=${page}&limit=${limit}`);
  }

  async sendMessage(conversationId: string, content: any, type: string = 'text', replyTo?: string): Promise<Message> {
    return this.post('/messages', { conversationId, content, type, replyTo });
  }

  async editMessage(messageId: string, content: any): Promise<Message> {
    return this.put(`/messages/${messageId}`, { content });
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.delete(`/messages/${messageId}`);
  }

  async markAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    return this.post(`/messages/read`, { conversationId, messageIds });
  }

  // Media API methods
  async uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<{ mediaId: string; url: string; thumbnailUrl?: string }> {
    return this.uploadFile('/media/upload', file, onProgress);
  }

  async getMediaUrl(mediaId: string): Promise<{ url: string; thumbnailUrl?: string }> {
    return this.get(`/media/${mediaId}`);
  }

  // Search API methods
  async searchMessages(query: string, conversationId?: string): Promise<{ messages: Message[]; conversations: Conversation[] }> {
    const params = new URLSearchParams({ query });
    if (conversationId) params.append('conversationId', conversationId);
    return this.get(`/messages/search?${params}`);
  }

  // Notification API methods
  async updateNotificationSettings(settings: any): Promise<void> {
    return this.put('/notifications/settings', settings);
  }

  async getNotificationSettings(): Promise<any> {
    return this.get('/notifications/settings');
  }
}

export const apiClient = new ApiClient();
export default apiClient;