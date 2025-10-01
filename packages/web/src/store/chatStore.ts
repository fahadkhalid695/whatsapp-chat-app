import { create } from 'zustand';
import { ChatState, Conversation, Message, Contact } from '../types';

interface ChatStore extends ChatState {
  setConversations: (conversations: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateMessageStatus: (messageId: string, status: 'delivered' | 'read', userId: string) => void;
  replaceTemporaryMessage: (tempId: string, message: Message) => void;
  markMessageFailed: (tempId: string, error: string) => void;
  markMessageDeleted: (messageId: string) => void;
  updateMessageContent: (messageId: string, content: any, editedAt: Date) => void;
  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  updateUserPresence: (userId: string, isOnline: boolean, lastSeen?: Date) => void;
  typingUsers: Record<string, string[]>;
  userPresence: Record<string, { isOnline: boolean; lastSeen?: Date }>;
  temporaryMessages: Record<string, Message & { tempId: string; status: 'sending' | 'failed'; error?: string }>;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  contacts: [],
  isLoading: false,
  typingUsers: {},
  userPresence: {},
  temporaryMessages: {},

  setConversations: (conversations: Conversation[] | ((prev: Conversation[]) => Conversation[])) => 
    set((state) => ({
      conversations: typeof conversations === 'function' ? conversations(state.conversations) : conversations
    })),
  
  addConversation: (conversation: Conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),
  
  updateConversation: (id: string, updates: Partial<Conversation>) => set((state) => ({
    conversations: state.conversations.map(conv => 
      conv.id === id ? { ...conv, ...updates } : conv
    )
  })),
  
  setActiveConversation: (activeConversationId: string | null) => set({ activeConversationId }),
  
  setMessages: (conversationId: string, messages: Message[]) => set((state) => ({
    messages: { ...state.messages, [conversationId]: messages }
  })),
  
  addMessage: (message: Message) => set((state) => {
    const conversationMessages = state.messages[message.conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [message.conversationId]: [...conversationMessages, message]
      }
    };
  }),
  
  updateMessage: (messageId: string, updates: Partial<Message>) => set((state) => {
    const newMessages = { ...state.messages };
    Object.keys(newMessages).forEach(conversationId => {
      newMessages[conversationId] = newMessages[conversationId].map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
    });
    return { messages: newMessages };
  }),
  
  setContacts: (contacts: Contact[]) => set({ contacts }),
  
  setLoading: (isLoading: boolean) => set({ isLoading }),

  updateMessageStatus: (messageId: string, status: 'delivered' | 'read', userId: string) => set((state) => {
    const newMessages = { ...state.messages };
    Object.keys(newMessages).forEach(conversationId => {
      newMessages[conversationId] = newMessages[conversationId].map(message =>
        message.id === messageId
          ? {
              ...message,
              [status === 'delivered' ? 'deliveredTo' : 'readBy']: [
                ...message[status === 'delivered' ? 'deliveredTo' : 'readBy'],
                userId,
              ],
            }
          : message
      );
    });
    return { messages: newMessages };
  }),

  replaceTemporaryMessage: (tempId: string, message: Message) => set((state) => {
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
  }),

  markMessageFailed: (tempId: string, error: string) => set((state) => ({
    temporaryMessages: {
      ...state.temporaryMessages,
      [tempId]: {
        ...state.temporaryMessages[tempId],
        status: 'failed',
        error,
      },
    },
  })),

  markMessageDeleted: (messageId: string) => set((state) => {
    const newMessages = { ...state.messages };
    
    Object.keys(newMessages).forEach(conversationId => {
      newMessages[conversationId] = newMessages[conversationId].map(message =>
        message.id === messageId
          ? { ...message, isDeleted: true }
          : message
      );
    });

    return { messages: newMessages };
  }),

  updateMessageContent: (messageId: string, content: any, editedAt: Date) => set((state) => {
    const newMessages = { ...state.messages };
    
    Object.keys(newMessages).forEach(conversationId => {
      newMessages[conversationId] = newMessages[conversationId].map(message =>
        message.id === messageId
          ? { ...message, content, editedAt }
          : message
      );
    });

    return { messages: newMessages };
  }),

  setTypingUsers: (conversationId: string, userIds: string[]) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: userIds,
    },
  })),

  addTypingUser: (conversationId: string, userId: string) => set((state) => {
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
  }),

  removeTypingUser: (conversationId: string, userId: string) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: (state.typingUsers[conversationId] || []).filter(id => id !== userId),
    },
  })),

  updateUserPresence: (userId: string, isOnline: boolean, lastSeen?: Date) => set((state) => ({
    userPresence: {
      ...state.userPresence,
      [userId]: { isOnline, lastSeen },
    },
  })),
}));