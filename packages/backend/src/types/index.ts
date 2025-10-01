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
  mediaType?: string;
  limit?: number;
  offset?: number;
}

export interface SearchContext {
  conversationName?: string;
  conversationType: 'direct' | 'group';
  senderName: string;
}

export interface MessageWithSearchContext extends Message {
  searchContext?: SearchContext;
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

// Privacy and Security interfaces
export interface EncryptedMessage {
  encryptedContent: string;
  keyId: string;
  iv: string;
}

export interface DisappearingMessageSettings {
  conversationId: string;
  timerDuration: number; // in seconds (0 = disabled)
  enabledBy: string;
  enabledAt: Date;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'fake_account' | 'other';
  description?: string;
  messageId?: string; // If reporting a specific message
  conversationId?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface SecuritySettings {
  userId: string;
  twoFactorEnabled: boolean;
  readReceiptsEnabled: boolean;
  lastSeenEnabled: boolean;
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  statusVisibility: 'everyone' | 'contacts' | 'nobody';
  blockedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountRecovery {
  id: string;
  userId: string;
  recoveryCode: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}

// Request/Response interfaces for security features
export interface ReportUserRequest {
  reportedUserId: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'fake_account' | 'other';
  description?: string;
  messageId?: string;
  conversationId?: string;
}

export interface UpdateSecuritySettingsRequest {
  twoFactorEnabled?: boolean;
  readReceiptsEnabled?: boolean;
  lastSeenEnabled?: boolean;
  profilePhotoVisibility?: 'everyone' | 'contacts' | 'nobody';
  statusVisibility?: 'everyone' | 'contacts' | 'nobody';
}

export interface SetDisappearingMessagesRequest {
  conversationId: string;
  timerDuration: number; // in seconds (0 = disabled)
}

export interface GenerateRecoveryCodeRequest {
  phoneNumber: string;
}

export interface UseRecoveryCodeRequest {
  phoneNumber: string;
  recoveryCode: string;
  newDisplayName?: string;
}

// Cross-platform synchronization interfaces
export interface DeviceSession {
  id: string;
  userId: string;
  deviceId: string;
  platform: 'web' | 'mobile';
  userAgent?: string;
  appVersion?: string;
  isActive: boolean;
  lastActivity: Date;
  lastSync?: Date;
  createdAt: Date;
}

export interface SyncData {
  conversations: ConversationSyncData[];
  syncTimestamp: Date;
  hasMore: boolean;
}

export interface ConversationSyncData extends Omit<Conversation, 'lastMessage'> {
  messages: MessageSyncData[];
  unreadCount: number;
}

export interface MessageSyncData extends Message {
  // Additional sync-specific fields can be added here
}

export interface OfflineMessage {
  id: string;
  userId: string;
  deviceId: string;
  messageData: any;
  queuedAt: Date;
  attempts: number;
  maxAttempts: number;
  nextRetry: Date;
}

// Request/Response interfaces for sync operations
export interface SyncConversationHistoryRequest {
  deviceId: string;
  lastSyncTimestamp?: Date;
}

export interface RegisterDeviceSessionRequest {
  deviceId: string;
  platform: 'web' | 'mobile';
  userAgent?: string;
  appVersion?: string;
}

export interface SyncReadReceiptsRequest {
  messageIds: string[];
  deviceId?: string;
}

export interface SyncProfileUpdateRequest {
  updates: {
    displayName?: string;
    profilePicture?: string;
    status?: string;
  };
  deviceId?: string;
}