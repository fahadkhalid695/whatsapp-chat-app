import { create } from 'zustand';
import { Conversation, Message, ChatState } from '../types';
import { chatService } from '../services/chat';

interface ChatStore extends ChatState {
  loadConversations: (refresh?: boolean) => Promise<void>;
  loadMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'delivered' | 'read') => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  markMessagesAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversation: null,
  isLoading: false,
  typingUsers: {},

  loadConversations: async (refresh = false) => {
    if (!refresh && get().conversations.length > 0) return;
    
    set({ isLoading: true });
    try {
      const conversations = await chatService.getConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      console.error('Load conversations error:', error);
      set({ isLoading: false });
    }
  },

  loadMessages: async (conversationId: string, refresh = false) => {
    const currentMessages = get().messages[conversationId] || [];
    if (!refresh && currentMessages.length > 0) return;

    set({ isLoading: true });
    try {
      const messages = await chatService.getMessages(conversationId);
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: messages,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Load messages error:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, content: string, type = 'text') => {
    try {
      const message = await chatService.sendMessage(conversationId, content, type);
      
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: [
            ...(state.messages[conversationId] || []),
            message,
          ],
        },
      }));

      // Update conversation's last message
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: message, lastActivity: new Date() }
            : conv
        ),
      }));
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversation: conversationId });
  },

  addMessage: (message: Message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [
          ...(state.messages[message.conversationId] || []),
          message,
        ],
      },
    }));

    // Update conversation's last message
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === message.conversationId
          ? { ...conv, lastMessage: message, lastActivity: new Date() }
          : conv
      ),
    }));
  },

  updateMessageStatus: (messageId: string, status: 'delivered' | 'read') => {
    set(state => {
      const newMessages = { ...state.messages };
      
      Object.keys(newMessages).forEach(conversationId => {
        newMessages[conversationId] = newMessages[conversationId].map(message =>
          message.id === messageId
            ? {
                ...message,
                [status === 'delivered' ? 'deliveredTo' : 'readBy']: [
                  ...message[status === 'delivered' ? 'deliveredTo' : 'readBy'],
                  'current-user-id', // This should be the actual user ID
                ],
              }
            : message
        );
      });

      return { messages: newMessages };
    });
  },

  setTypingUsers: (conversationId: string, userIds: string[]) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: userIds,
      },
    }));
  },

  markMessagesAsRead: async (conversationId: string, messageIds: string[]) => {
    try {
      await chatService.markMessagesAsRead(messageIds);
      
      set(state => {
        const updatedMessages = state.messages[conversationId]?.map(message =>
          messageIds.includes(message.id)
            ? {
                ...message,
                readBy: [...message.readBy, 'current-user-id'], // This should be the actual user ID
              }
            : message
        ) || [];

        return {
          messages: {
            ...state.messages,
            [conversationId]: updatedMessages,
          },
        };
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  },
}));