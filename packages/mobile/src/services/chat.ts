import { Conversation, Message } from '../types';
import { apiClient } from './api';

class ChatService {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/conversations');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get conversations');
    }
    
    return response.data.data;
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
      params: { limit, offset },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get messages');
    }
    
    return response.data.data;
  }

  async sendMessage(conversationId: string, content: string, type = 'text'): Promise<Message> {
    const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
      content: { text: content },
      type,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send message');
    }
    
    return response.data.data;
  }

  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    await apiClient.post('/messages/read', { messageIds });
  }

  async createConversation(participantIds: string[], type: 'direct' | 'group' = 'direct', name?: string): Promise<Conversation> {
    const requestData: any = {
      participants: participantIds,
      type,
    };
    
    if (name) {
      requestData.name = name;
    }
    
    const response = await apiClient.post('/conversations', requestData);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create conversation');
    }
    
    return response.data.data;
  }

  async searchMessages(query: string): Promise<Message[]> {
    const response = await apiClient.get('/messages/search', {
      params: { q: query },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search messages');
    }
    
    return response.data.data;
  }
}

export const chatService = new ChatService();