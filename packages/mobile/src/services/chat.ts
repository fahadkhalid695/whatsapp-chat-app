import { Conversation, Message } from '../types';
import { apiClient } from './api';

class ChatService {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/conversations');
    return response.data;
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async sendMessage(conversationId: string, content: string, type = 'text'): Promise<Message> {
    const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
      content: { text: content },
      type,
    });
    return response.data;
  }

  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    await apiClient.post('/messages/read', { messageIds });
  }

  async createConversation(participantIds: string[], type: 'direct' | 'group' = 'direct', name?: string): Promise<Conversation> {
    const response = await apiClient.post('/conversations', {
      participantIds,
      type,
      name,
    });
    return response.data;
  }

  async searchMessages(query: string): Promise<Message[]> {
    const response = await apiClient.get('/messages/search', {
      params: { q: query },
    });
    return response.data;
  }
}

export const chatService = new ChatService();