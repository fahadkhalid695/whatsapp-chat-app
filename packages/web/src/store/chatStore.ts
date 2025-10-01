import { create } from 'zustand';
import { ChatState, Conversation, Message, Contact } from '../types';

interface ChatStore extends ChatState {
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  contacts: [],
  isLoading: false,

  setConversations: (conversations: Conversation[]) => set({ conversations }),
  
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
}));