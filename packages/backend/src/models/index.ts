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
  ConversationParticipant,
  MessageStatus,
} from '../types';

// Transform database entities to API models
export class ModelTransformer {
  static userEntityToUser(entity: UserEntity): User {
    return {
      id: entity.id,
      phoneNumber: entity.phone_number,
      displayName: entity.display_name,
      profilePicture: entity.profile_picture,
      status: entity.status,
      lastSeen: entity.last_seen,
      isOnline: entity.is_online,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  static userToUserEntity(user: Partial<User>): Partial<UserEntity> {
    return {
      id: user.id,
      phone_number: user.phoneNumber,
      display_name: user.displayName,
      profile_picture: user.profilePicture,
      status: user.status,
      last_seen: user.lastSeen,
      is_online: user.isOnline,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  static conversationEntityToConversation(
    entity: ConversationEntity,
    participants: string[] = [],
    admins: string[] = [],
    lastMessage?: Message
  ): Conversation {
    return {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      participants,
      admins,
      lastMessage,
      lastActivity: entity.last_activity,
      isArchived: entity.is_archived,
      isMuted: false, // This would come from participant data
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  static conversationToConversationEntity(conversation: Partial<Conversation>): Partial<ConversationEntity> {
    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      last_activity: conversation.lastActivity,
      is_archived: conversation.isArchived,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    };
  }

  static messageEntityToMessage(
    entity: MessageEntity,
    deliveredTo: string[] = [],
    readBy: string[] = []
  ): Message {
    return {
      id: entity.id,
      conversationId: entity.conversation_id,
      senderId: entity.sender_id,
      content: entity.content,
      type: entity.type,
      timestamp: entity.timestamp,
      deliveredTo,
      readBy,
      isDeleted: entity.is_deleted,
      replyTo: entity.reply_to,
      editedAt: entity.edited_at,
    };
  }

  static messageToMessageEntity(message: Partial<Message>): Partial<MessageEntity> {
    return {
      id: message.id,
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      is_deleted: message.isDeleted,
      reply_to: message.replyTo,
      edited_at: message.editedAt,
    };
  }

  static contactEntityToContact(entity: ContactEntity): Contact {
    return {
      id: entity.id,
      userId: entity.user_id,
      contactUserId: entity.contact_user_id,
      name: entity.name,
      phoneNumber: entity.phone_number,
      isAppUser: entity.is_app_user,
      isBlocked: entity.is_blocked,
      addedAt: entity.added_at,
    };
  }

  static contactToContactEntity(contact: Partial<Contact>): Partial<ContactEntity> {
    return {
      id: contact.id,
      user_id: contact.userId,
      contact_user_id: contact.contactUserId,
      name: contact.name,
      phone_number: contact.phoneNumber,
      is_app_user: contact.isAppUser,
      is_blocked: contact.isBlocked,
      added_at: contact.addedAt,
    };
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

    if (user.displayName && !this.isValidDisplayName(user.displayName)) {
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