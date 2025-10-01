// Model utilities and transformers for converting between database entities and API models

import {
  User,
  Conversation,
  Message,
  Contact,
  UserEntity,
  ConversationEntity,
  MessageEntity,
  ContactEntity,
} from '../types';

// Transform database entities to API models
export class ModelTransformer {
  static userEntityToUser(entity: UserEntity): User {
    const user: User = {
      id: entity.id,
      phoneNumber: entity.phone_number,
      displayName: entity.display_name,
      status: entity.status,
      lastSeen: entity.last_seen,
      isOnline: entity.is_online,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
    
    if (entity.profile_picture !== undefined) {
      user.profilePicture = entity.profile_picture;
    }
    
    return user;
  }

  static userToUserEntity(user: Partial<User>): Partial<UserEntity> {
    const entity: Partial<UserEntity> = {};
    
    if (user.id !== undefined) entity.id = user.id;
    if (user.phoneNumber !== undefined) entity.phone_number = user.phoneNumber;
    if (user.displayName !== undefined) entity.display_name = user.displayName;
    if (user.profilePicture !== undefined) entity.profile_picture = user.profilePicture;
    if (user.status !== undefined) entity.status = user.status;
    if (user.lastSeen !== undefined) entity.last_seen = user.lastSeen;
    if (user.isOnline !== undefined) entity.is_online = user.isOnline;
    if (user.createdAt !== undefined) entity.created_at = user.createdAt;
    if (user.updatedAt !== undefined) entity.updated_at = user.updatedAt;
    
    return entity;
  }

  static conversationEntityToConversation(
    entity: ConversationEntity,
    participants: string[] = [],
    admins: string[] = [],
    lastMessage?: Message
  ): Conversation {
    const conversation: Conversation = {
      id: entity.id,
      type: entity.type,
      participants,
      admins,
      lastActivity: entity.last_activity,
      isArchived: entity.is_archived,
      isMuted: false, // This would come from participant data
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
    
    if (entity.name !== undefined) {
      conversation.name = entity.name;
    }
    
    if (lastMessage !== undefined) {
      conversation.lastMessage = lastMessage;
    }
    
    return conversation;
  }

  static conversationToConversationEntity(conversation: Partial<Conversation>): Partial<ConversationEntity> {
    const entity: Partial<ConversationEntity> = {};
    
    if (conversation.id !== undefined) entity.id = conversation.id;
    if (conversation.type !== undefined) entity.type = conversation.type;
    if (conversation.name !== undefined) entity.name = conversation.name;
    if (conversation.lastActivity !== undefined) entity.last_activity = conversation.lastActivity;
    if (conversation.isArchived !== undefined) entity.is_archived = conversation.isArchived;
    if (conversation.createdAt !== undefined) entity.created_at = conversation.createdAt;
    if (conversation.updatedAt !== undefined) entity.updated_at = conversation.updatedAt;
    
    return entity;
  }

  static messageEntityToMessage(
    entity: MessageEntity,
    deliveredTo: string[] = [],
    readBy: string[] = []
  ): Message {
    const message: Message = {
      id: entity.id,
      conversationId: entity.conversation_id,
      senderId: entity.sender_id,
      content: entity.content,
      type: entity.type,
      timestamp: entity.timestamp,
      deliveredTo,
      readBy,
      isDeleted: entity.is_deleted,
    };
    
    if (entity.reply_to !== undefined) {
      message.replyTo = entity.reply_to;
    }
    
    if (entity.edited_at !== undefined) {
      message.editedAt = entity.edited_at;
    }
    
    return message;
  }

  static messageToMessageEntity(message: Partial<Message>): Partial<MessageEntity> {
    const entity: Partial<MessageEntity> = {};
    
    if (message.id !== undefined) entity.id = message.id;
    if (message.conversationId !== undefined) entity.conversation_id = message.conversationId;
    if (message.senderId !== undefined) entity.sender_id = message.senderId;
    if (message.content !== undefined) entity.content = message.content;
    if (message.type !== undefined) entity.type = message.type;
    if (message.timestamp !== undefined) entity.timestamp = message.timestamp;
    if (message.isDeleted !== undefined) entity.is_deleted = message.isDeleted;
    if (message.replyTo !== undefined) entity.reply_to = message.replyTo;
    if (message.editedAt !== undefined) entity.edited_at = message.editedAt;
    
    return entity;
  }

  static contactEntityToContact(entity: ContactEntity): Contact {
    const contact: Contact = {
      id: entity.id,
      userId: entity.user_id,
      name: entity.name,
      phoneNumber: entity.phone_number,
      isAppUser: entity.is_app_user,
      isBlocked: entity.is_blocked,
      addedAt: entity.added_at,
    };
    
    if (entity.contact_user_id !== undefined) {
      contact.contactUserId = entity.contact_user_id;
    }
    
    return contact;
  }

  static contactToContactEntity(contact: Partial<Contact>): Partial<ContactEntity> {
    const entity: Partial<ContactEntity> = {};
    
    if (contact.id !== undefined) entity.id = contact.id;
    if (contact.userId !== undefined) entity.user_id = contact.userId;
    if (contact.contactUserId !== undefined) entity.contact_user_id = contact.contactUserId;
    if (contact.name !== undefined) entity.name = contact.name;
    if (contact.phoneNumber !== undefined) entity.phone_number = contact.phoneNumber;
    if (contact.isAppUser !== undefined) entity.is_app_user = contact.isAppUser;
    if (contact.isBlocked !== undefined) entity.is_blocked = contact.isBlocked;
    if (contact.addedAt !== undefined) entity.added_at = contact.addedAt;
    
    return entity;
  }
}

// Validation utilities
export class ModelValidator {
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  static isValidDisplayName(displayName: string): boolean {
    return displayName.length >= 1 && displayName.length <= 100;
  }

  static isValidConversationType(type: string): type is 'direct' | 'group' {
    return type === 'direct' || type === 'group';
  }

  static isValidMessageType(type: string): type is 'text' | 'image' | 'video' | 'audio' | 'document' | 'system' {
    return ['text', 'image', 'video', 'audio', 'document', 'system'].includes(type);
  }

  static isValidMessageContent(content: any, type: string): boolean {
    if (!content || typeof content !== 'object') {
      return false;
    }

    switch (type) {
      case 'text':
        return typeof content.text === 'string' && content.text.length > 0;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        return typeof content.mediaId === 'string' || typeof content.mediaUrl === 'string';
      case 'system':
        return typeof content.text === 'string';
      default:
        return false;
    }
  }

  static validateUser(user: Partial<User>): string[] {
    const errors: string[] = [];

    if (user.phoneNumber && !this.isValidPhoneNumber(user.phoneNumber)) {
      errors.push('Invalid phone number format');
    }

    if (user.displayName !== undefined && !this.isValidDisplayName(user.displayName)) {
      errors.push('Display name must be between 1 and 100 characters');
    }

    return errors;
  }

  static validateConversation(conversation: Partial<Conversation>): string[] {
    const errors: string[] = [];

    if (conversation.type && !this.isValidConversationType(conversation.type)) {
      errors.push('Invalid conversation type');
    }

    if (conversation.type === 'group' && !conversation.name) {
      errors.push('Group conversations must have a name');
    }

    if (conversation.participants && conversation.participants.length < 2) {
      errors.push('Conversation must have at least 2 participants');
    }

    return errors;
  }

  static validateMessage(message: Partial<Message>): string[] {
    const errors: string[] = [];

    if (!message.conversationId) {
      errors.push('Message must have a conversation ID');
    }

    if (!message.senderId) {
      errors.push('Message must have a sender ID');
    }

    if (!message.type || !this.isValidMessageType(message.type)) {
      errors.push('Invalid message type');
    }

    if (message.content && message.type && !this.isValidMessageContent(message.content, message.type)) {
      errors.push('Invalid message content for the specified type');
    }

    return errors;
  }
}

export default ModelTransformer;