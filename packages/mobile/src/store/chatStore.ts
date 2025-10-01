import { create } from 'zustand';
import { Conversation, Message, ChatState } from '../types';
import { chatService } from '../services/chat';
import { syncService } from '../services/sync';

interface ChatStore extends ChatState {
  loadConversations: (refresh?: boolean) => Promise<void>;
  loadMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<void>;
  createConversation: (participantIds: string[], type?: 'direct' | 'group', name?: string) => Promise<Conversation>;
  setActiveConversation: (conversationId: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'delivered' | 'read', userId?: string) => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  markMessagesAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  replaceTemporaryMessage: (tempId: string, message: Message) => void;
  markMessageFailed: (tempId: string, error: string) => void;
  markMessageDeleted: (messageId: string) => void;
  updateMessageContent: (messageId: string, content: any, editedAt: Date) => void;
  updateUserPresence: (userId: string, isOnline: boolean, lastSeen?: Date) => void;
  syncConversationHistory: () => Promise<void>;
  userPresence: Record<string, { isOnline: boolean; lastSeen?: Date }>;
  temporaryMessages: Record<string, Message & { tempId: string; status: 'sending' | 'failed'; error?: string }>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversation: null,
  isLoading: false,
  typingUsers: {},
  userPresence: {},
  temporaryMessages: {},

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

  createConversation: async (participantIds: string[], type = 'direct', name?: string) => {
    try {
      const conversation = await chatService.createConversation(participantIds, type, name);
      
      // Add to conversations list
      set(state => ({
        conversations: [conversation, ...state.conversations],
      }));

      return conversation;
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversation: conversationId });
  },

  setConversations: (conversations: Conversation[]) => {
    set({ conversations });
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

  updateMessageStatus: (messageId: string, status: 'delivered' | 'read', userId?: string) => {
    set(state => {
      const newMessages = { ...state.messages };
      
      Object.keys(newMessages).forEach(conversationId => {
        newMessages[conversationId] = newMessages[conversationId].map(message =>
          message.id === messageId
            ? {
                ...message,
                [status === 'delivered' ? 'deliveredTo' : 'readBy']: [
                  ...message[status === 'delivered' ? 'deliveredTo' : 'readBy'],
                  userId || 'current-user-id',
                ],
              }
            : message
        );
      });

      return { messages: newMessages };
    });
  },

  addTypingUser: (conversationId: string, userId: string) => {
    set(state => {
      const currentTypingUsers = state.typingUsers[conversationId] || [];
      if (!currentTypingUsers.includes(userId)) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...currentTypingUsers, userId],
          },
        };
      }
      return state;
    });
  },

  removeTypingUser: (conversationId: string, userId: string) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: (state.typingUsers[conversationId] || []).filter(id => id !== userId),
      },
    }));
  },

  replaceTemporaryMessage: (tempId: string, message: Message) => {
    set(state => {
      const newMessages = { ...state.messages };
      const newTemporaryMessages = { ...state.temporaryMessages };
      
      // Remove from temporary messages
      delete newTemporaryMessages[tempId];
      
      // Add real message
      const conversationMessages = newMessages[message.conversationId] || [];
      const tempMessageIndex = conversationMessages.findIndex(msg => 
        'tempId' in msg && (msg as any).tempId === tempId
      );
      
      if (tempMessageIndex !== -1) {
        // Replace temporary message with real message
        newMessages[message.conversationId] = [
          ...conversationMessages.slice(0, tempMessageIndex),
          message,
          ...conversationMessages.slice(tempMessageIndex + 1),
        ];
      } else {
        // Add message if temp message not found
        newMessages[message.conversationId] = [...conversationMessages, message];
      }

      return { 
        messages: newMessages, 
        temporaryMessages: newTemporaryMessages 
      };
    });
  },

  markMessageFailed: (tempId: string, error: string) => {
    set(state => ({
      temporaryMessages: {
        ...state.temporaryMessages,
        [tempId]: {
          ...state.temporaryMessages[tempId],
          status: 'failed',
          error,
        },
      },
    }));
  },

  markMessageDeleted: (messageId: string) => {
    set(state => {
      const newMessages = { ...state.messages };
      
      Object.keys(newMessages).forEach(conversationId => {
        newMessages[conversationId] = newMessages[conversationId].map(message =>
          message.id === messageId
            ? { ...message, isDeleted: true }
            : message
        );
      });

      return { messages: newMessages };
    });
  },

  updateMessageContent: (messageId: string, content: any, editedAt: Date) => {
    set(state => {
      const newMessages = { ...state.messages };
      
      Object.keys(newMessages).forEach(conversationId => {
        newMessages[conversationId] = newMessages[conversationId].map(message =>
          message.id === messageId
            ? { ...message, content, editedAt }
            : message
        );
      });

      return { messages: newMessages };
    });
  },

  updateUserPresence: (userId: string, isOnline: boolean, lastSeen?: Date) => {
    set(state => ({
      userPresence: {
        ...state.userPresence,
        [userId]: { isOnline, lastSeen },
      },
    }));
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
      
      // Sync read receipts across devices
      await syncService.syncReadReceipts(messageIds);
      
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

  syncConversationHistory: async () => {
    try {
      set({ isLoading: true });
      const syncData = await syncService.syncConversationHistory();
      
      // Update conversations with synced data
      set((state) => ({
        conversations: syncData.conversations.map(conv => ({
          id: conv.id,
          type: conv.type,
          name: conv.name,
          participants: conv.participants,
          admins: conv.admins,
          lastActivity: new Date(conv.lastActivity),
          isArchived: conv.isArchived,
          isMuted: false, // This would come from user preferences
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        })),
        messages: syncData.conversations.reduce((acc, conv) => {
          acc[conv.id] = conv.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
          }));
          return acc;
        }, {} as Record<string, Message[]>),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to sync conversation history:', error);
      set({ isLoading: false });
    }
  },
}));