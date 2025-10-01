export interface User {
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

export interface Conversation {
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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: MessageContent;
  type: MessageType;
  timestamp: Date;
  deliveredTo: string[];
  readBy: string[];
  isDeleted: boolean;
  replyTo?: string;
  editedAt?: Date;
}

export interface MessageContent {
  text?: string;
  mediaId?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';

export interface Contact {
  id: string;
  userId: string;
  contactUserId?: string;
  name: string;
  phoneNumber: string;
  isAppUser: boolean;
  isBlocked: boolean;
  addedAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversation: string | null;
  isLoading: boolean;
  typingUsers: { [conversationId: string]: string[] };
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Verification: { phoneNumber: string; verificationId: string };
  ProfileSetup: undefined;
  Main: undefined;
  Chat: { conversationId: string; conversationName?: string };
};

export type MainTabParamList = {
  Conversations: undefined;
  Contacts: undefined;
  Settings: undefined;
};