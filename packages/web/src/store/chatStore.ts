import { create } from 'zustand';

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'file' | 'audio';
  mediaUrl?: string;
  fileName?: string;
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
  initializeConversations: () => void;
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
    },
    {
      id: '3',
      text: 'What are you up to today?',
      sender: 'other',
      timestamp: new Date(Date.now() - 3400000),
      status: 'read',
    },
    {
      id: '4',
      text: 'Just working on some projects. How about you?',
      sender: 'me',
      timestamp: new Date(Date.now() - 3300000),
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
  ],
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  searchQuery: '',
  isLoading: false,

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
      // Mark messages as read when opening conversation
      get().markAsRead(id);
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

  markAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              contact: {
                ...conv.contact,
                unreadCount: 0,
              },
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

  initializeConversations: () => {
    const conversations: Conversation[] = mockContacts.map((contact) => ({
      id: contact.id,
      contact,
      messages: mockMessages[contact.id] || [],
      isTyping: false,
    }));

    set({ conversations, activeConversationId: conversations[0]?.id || null });
  },
}));