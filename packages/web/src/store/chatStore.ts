import { create } from 'zustand';
import { apiClient } from '../services/api';
import { socketService } from '../services/socket';

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  fileName?: string;
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: string;
  editedAt?: Date;
  isForwarded?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  status?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  messages: Message[];
  isTyping: boolean;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  isLoading: boolean;
}

interface ChatActions {
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  markAsRead: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setSearchQuery: (query: string) => void;
  updateContactStatus: (contactId: string, isOnline: boolean) => void;
  initializeConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: any, type?: string, replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, content: any) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  createConversation: (type: 'direct' | 'group', participants: string[], name?: string) => Promise<string>;
  searchMessages: (query: string) => Promise<{ messages: Message[]; conversations: Conversation[] }>;
}

type ChatStore = ChatState & ChatActions;

// Mock data
const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    avatar: 'https://i.pravatar.cc/150?img=2',
    phoneNumber: '+1234567890',
    lastMessage: 'Hey! How are you doing?',
    timestamp: '2:30 PM',
    unreadCount: 2,
    isOnline: true,
    status: 'Available for chat',
  },
  {
    id: '2',
    name: 'Bob Smith',
    avatar: 'https://i.pravatar.cc/150?img=3',
    phoneNumber: '+1234567891',
    lastMessage: 'Can we meet tomorrow?',
    timestamp: '1:15 PM',
    unreadCount: 0,
    isOnline: false,
    status: 'Busy',
  },
  {
    id: '3',
    name: 'Carol Davis',
    avatar: 'https://i.pravatar.cc/150?img=4',
    phoneNumber: '+1234567892',
    lastMessage: 'Thanks for your help!',
    timestamp: '11:45 AM',
    unreadCount: 1,
    isOnline: true,
    status: 'Hey there! I am using WhatsApp.',
  },
  {
    id: '4',
    name: 'David Wilson',
    avatar: 'https://i.pravatar.cc/150?img=5',
    phoneNumber: '+1234567893',
    lastMessage: 'See you later 👋',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
    status: 'At work',
  },
  {
    id: '5',
    name: 'Emma Brown',
    avatar: 'https://i.pravatar.cc/150?img=6',
    phoneNumber: '+1234567894',
    lastMessage: 'Great job on the presentation!',
    timestamp: 'Yesterday',
    unreadCount: 3,
    isOnline: true,
    status: 'Available',
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      text: 'Hey! How are you doing?',
      sender: 'other',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read',
    },
    {
      id: '2',
      text: 'I\'m doing great! Thanks for asking 😊',
      sender: 'me',
      timestamp: new Date(Date.now() - 3500000),
      status: 'read',
      reactions: [
        { emoji: '👍', users: ['alice'] },
        { emoji: '❤️', users: ['alice', 'me'] },
      ],
    },
    {
      id: '3',
      text: 'Check out this amazing sunset!',
      sender: 'other',
      timestamp: new Date(Date.now() - 3400000),
      status: 'read',
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    },
    {
      id: '4',
      text: 'Wow, that\'s beautiful! 🌅',
      sender: 'me',
      timestamp: new Date(Date.now() - 3300000),
      status: 'delivered',
      replyTo: '3',
    },
    {
      id: '5',
      text: 'Here\'s a quick voice message about our plans',
      sender: 'me',
      timestamp: new Date(Date.now() - 3200000),
      status: 'read',
      type: 'audio',
      mediaUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
    },
    {
      id: '6',
      text: 'Just working on some projects. How about you?',
      sender: 'me',
      timestamp: new Date(Date.now() - 3100000),
      status: 'delivered',
    },
  ],
  '2': [
    {
      id: '5',
      text: 'Can we meet tomorrow?',
      sender: 'other',
      timestamp: new Date(Date.now() - 7200000),
      status: 'read',
    },
    {
      id: '6',
      text: 'Sure! What time works for you?',
      sender: 'me',
      timestamp: new Date(Date.now() - 7100000),
      status: 'read',
    },
  ],
  '3': [
    {
      id: '7',
      text: 'Thanks for your help with the project!',
      sender: 'other',
      timestamp: new Date(Date.now() - 10800000),
      status: 'read',
    },
    {
      id: '8',
      text: 'You\'re welcome! Happy to help anytime 🙂',
      sender: 'me',
      timestamp: new Date(Date.now() - 10700000),
      status: 'read',
    },
    {
      id: '9',
      text: 'Here\'s the presentation we discussed',
      sender: 'me',
      timestamp: new Date(Date.now() - 10600000),
      status: 'read',
      type: 'document',
      fileName: 'Project_Presentation.pdf',
      mediaUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO8',
    },
    {
      id: '10',
      text: 'Perfect! I\'ll review it tonight',
      sender: 'other',
      timestamp: new Date(Date.now() - 10500000),
      status: 'read',
      reactions: [
        { emoji: '👍', users: ['carol'] },
      ],
    },
  ],
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  searchQuery: '',
  isLoading: false,

  setActiveConversation: async (id) => {
    set({ activeConversationId: id });
    if (id) {
      // Load messages for this conversation
      await get().loadMessages(id);
      // Mark messages as read
      get().markAsRead(id);
      // Join conversation room for real-time updates
      socketService.joinConversation(id);
    }
  },

  addMessage: (conversationId, messageData) => {
    const newMessage: Message = {
      ...messageData,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
            }
          : conv
      ),
    }));

    // Update last message in contact
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              contact: {
                ...conv.contact,
                lastMessage: newMessage.text,
                timestamp: new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }),
              },
            }
          : conv
      ),
    }));
  },

  markAsRead: async (conversationId) => {
    const conversation = get().conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const unreadMessageIds = conversation.messages
      .filter(msg => msg.sender !== 'me' && msg.status !== 'read')
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      try {
        await apiClient.markAsRead(conversationId, unreadMessageIds);
        socketService.markAsRead(conversationId, unreadMessageIds);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }

    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              contact: {
                ...conv.contact,
                unreadCount: 0,
              },
              messages: conv.messages.map(msg => 
                msg.sender !== 'me' ? { ...msg, status: 'read' } : msg
              ),
            }
          : conv
      ),
    }));
  },

  setTyping: (conversationId, isTyping) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, isTyping }
          : conv
      ),
    }));
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  updateContactStatus: (contactId, isOnline) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.contact.id === contactId
          ? {
              ...conv,
              contact: {
                ...conv.contact,
                isOnline,
              },
            }
          : conv
      ),
    }));
  },

  initializeConversations: async () => {
    set({ isLoading: true });
    
    try {
      // Try to load real conversations from API
      const apiConversations = await apiClient.getConversations();
      
      // Convert API format to frontend format
      const conversations: Conversation[] = apiConversations.map((apiConv: any) => ({
        id: apiConv.id,
        contact: {
          id: apiConv.participants[0], // Simplified for direct chats
          name: apiConv.name || 'Unknown',
          avatar: '',
          phoneNumber: '',
          lastMessage: apiConv.lastMessage?.content?.text || '',
          timestamp: new Date(apiConv.lastActivity).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          unreadCount: 0,
          isOnline: false,
        },
        messages: [],
        isTyping: false,
      }));

      set({ 
        conversations, 
        activeConversationId: conversations[0]?.id || null,
        isLoading: false 
      });

    } catch (error) {
      console.warn('Failed to load conversations from API, using mock data:', error);
      
      // Fallback to mock data
      const conversations: Conversation[] = mockContacts.map((contact) => ({
        id: contact.id,
        contact,
        messages: mockMessages[contact.id] || [],
        isTyping: false,
      }));

      set({ 
        conversations, 
        activeConversationId: conversations[0]?.id || null,
        isLoading: false 
      });
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const { messages } = await apiClient.getMessages(conversationId);
      
      // Convert API messages to frontend format
      const frontendMessages: Message[] = messages.map((apiMsg: any) => ({
        id: apiMsg.id,
        text: apiMsg.content.text || '',
        sender: apiMsg.senderId === 'current-user-id' ? 'me' : 'other', // This should use actual user ID
        timestamp: new Date(apiMsg.timestamp),
        status: 'read',
        type: apiMsg.type,
        mediaUrl: apiMsg.content.mediaUrl,
        fileName: apiMsg.content.fileName,
        replyTo: apiMsg.replyTo,
        editedAt: apiMsg.editedAt ? new Date(apiMsg.editedAt) : undefined,
      }));

      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: frontendMessages }
            : conv
        ),
      }));

    } catch (error) {
      console.error('Failed to load messages:', error);
      // Keep existing messages if API fails
    }
  },

  sendMessage: async (conversationId, content, type = 'text', replyTo) => {
    try {
      // Send via API
      const message = await apiClient.sendMessage(conversationId, content, type, replyTo);
      
      // Also send via socket for real-time delivery
      socketService.sendMessage(conversationId, content, type, replyTo);
      
      // Add to local state immediately for optimistic updates
      get().addMessage(conversationId, {
        text: content.text || '',
        sender: 'me',
        status: 'sent',
        type: type as any,
        mediaUrl: content.mediaUrl,
        fileName: content.fileName,
        replyTo,
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      // Still add to local state for offline support
      get().addMessage(conversationId, {
        text: content.text || '',
        sender: 'me',
        status: 'sent',
        type: type as any,
        mediaUrl: content.mediaUrl,
        fileName: content.fileName,
        replyTo,
      });
    }
  },

  editMessage: async (messageId, content) => {
    try {
      await apiClient.editMessage(messageId, content);
      socketService.editMessage(messageId, content);
      
      // Update local state
      set((state) => ({
        conversations: state.conversations.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, text: content.text || msg.text, editedAt: new Date() }
              : msg
          ),
        })),
      }));

    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await apiClient.deleteMessage(messageId);
      socketService.deleteMessage(messageId);
      
      // Remove from local state
      set((state) => ({
        conversations: state.conversations.map((conv) => ({
          ...conv,
          messages: conv.messages.filter((msg) => msg.id !== messageId),
        })),
      }));

    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  },

  createConversation: async (type, participants, name) => {
    try {
      const conversation = await apiClient.createConversation(type, participants, name);
      
      // Add to local state
      const newConversation: Conversation = {
        id: conversation.id,
        contact: {
          id: participants[0],
          name: name || 'New Conversation',
          avatar: '',
          phoneNumber: '',
          lastMessage: '',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          unreadCount: 0,
          isOnline: false,
        },
        messages: [],
        isTyping: false,
      };

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));

      return conversation.id;

    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },

  searchMessages: async (query) => {
    try {
      return await apiClient.searchMessages(query);
    } catch (error) {
      console.error('Failed to search messages:', error);
      return { messages: [], conversations: [] };
    }
  },
}));