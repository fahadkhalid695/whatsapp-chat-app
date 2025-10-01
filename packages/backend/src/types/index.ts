// Core data model interfaces for WhatsApp Chat App

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
  name?: string; // For group chats
  participants: string[]; // User IDs
  admins?: string[]; // For group chats
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
  replyTo?: string; // Message ID
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
  contactUserId?: string; // If contact is app user
  name: string;
  phoneNumber: string;
  isAppUser: boolean;
  isBlocked: boolean;
  addedAt: Date;
}

// Database entity interfaces (for internal use)
export interface UserEntity {
  id: string;
  phone_number: string;
  display_name: string;
  profile_picture?: string;
  status: string;
  last_seen: Date;
  is_online: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationEntity {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  last_activity: Date;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MessageEntity {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: MessageContent;
  type: MessageType;
  timestamp: Date;
  is_deleted: boolean;
  reply_to?: string;
  edited_at?: Date;
}

export interface ContactEntity {
  id: string;
  user_id: string;
  contact_user_id?: string;
  name: string;
  phone_number: string;
  is_app_user: boolean;
  is_blocked: boolean;
  added_at: Date;
}

// Additional supporting interfaces
export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  isAdmin: boolean;
  isMuted: boolean;
  joinedAt: Date;
}

export interface MessageStatus {
  messageId: string;
  userId: string;
  status: 'delivered' | 'read';
  timestamp: Date;
}

// API request/response interfaces
export interface CreateUserRequest {
  phoneNumber: string;
  displayName: string;
  profilePicture?: string;
}

export interface CreateConversationRequest {
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
}

export interface UpdateConversationRequest {
  name?: string;
}

export interface AddParticipantsRequest {
  participantIds: string[];
}

export interface RemoveParticipantsRequest {
  participantIds: string[];
}

export interface UpdateAdminStatusRequest {
  targetUserId: string;
  makeAdmin: boolean;
}

export interface ConversationListOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: 'last_activity' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface SendMessageRequest {
  conversationId: string;
  content: MessageContent;
  type: MessageType;
  replyTo?: string;
}

export interface EditMessageRequest {
  content: MessageContent;
}

export interface MarkAsReadRequest {
  messageIds: string[];
}

export interface GetMessagesOptions {
  limit?: number;
  offset?: number;
  before?: Date;
}

export interface SearchMessagesOptions {
  query: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateUserProfileRequest {
  displayName?: string;
  profilePicture?: string;
  status?: string;
}

export interface SyncContactsRequest {
  contacts: Array<{
    name: string;
    phoneNumber: string;
  }>;
}

export interface SearchUsersRequest {
  query: string;
}

export interface BlockUserRequest {
  targetUserId: string;
}

export interface PresenceStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Authentication interfaces
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  iat?: number;
  exp?: number;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
}

export interface PhoneVerificationResponse {
  verificationId: string;
  message: string;
}

export interface VerifyCodeRequest {
  verificationId: string;
  code: string;
  displayName: string;
  profilePicture?: string;
}

export interface VerifyCodeResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface VerificationSession {
  id: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

// Media handling interfaces
export interface MediaFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | undefined;
  userId: string;
  createdAt: Date;
}

export interface MediaUploadRequest {
  file: Express.Multer.File;
  userId: string;
}

export interface MediaUploadResponse {
  mediaId: string;
  url: string;
  thumbnailUrl?: string | undefined;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ThumbnailGenerationOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export interface MediaValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}