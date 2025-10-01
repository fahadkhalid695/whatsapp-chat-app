import { ModelTransformer, ModelValidator } from '../index';
import { User, UserEntity, Message, MessageEntity } from '../../types';

describe('Model Transformer', () => {
  describe('User Transformation', () => {
    it('should transform UserEntity to User', () => {
      const userEntity: UserEntity = {
        id: '123',
        phone_number: '+1234567890',
        display_name: 'John Doe',
        profile_picture: 'https://example.com/avatar.jpg',
        status: 'Available',
        last_seen: new Date('2023-01-01T12:00:00Z'),
        is_online: true,
        created_at: new Date('2023-01-01T10:00:00Z'),
        updated_at: new Date('2023-01-01T11:00:00Z'),
      };

      const user = ModelTransformer.userEntityToUser(userEntity);

      expect(user).toEqual({
        id: '123',
        phoneNumber: '+1234567890',
        displayName: 'John Doe',
        profilePicture: 'https://example.com/avatar.jpg',
        status: 'Available',
        lastSeen: new Date('2023-01-01T12:00:00Z'),
        isOnline: true,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T11:00:00Z'),
      });
    });

    it('should transform User to UserEntity', () => {
      const user: Partial<User> = {
        id: '123',
        phoneNumber: '+1234567890',
        displayName: 'John Doe',
        profilePicture: 'https://example.com/avatar.jpg',
        status: 'Available',
        lastSeen: new Date('2023-01-01T12:00:00Z'),
        isOnline: true,
      };

      const userEntity = ModelTransformer.userToUserEntity(user);

      expect(userEntity).toEqual({
        id: '123',
        phone_number: '+1234567890',
        display_name: 'John Doe',
        profile_picture: 'https://example.com/avatar.jpg',
        status: 'Available',
        last_seen: new Date('2023-01-01T12:00:00Z'),
        is_online: true,
        created_at: undefined,
        updated_at: undefined,
      });
    });
  });

  describe('Message Transformation', () => {
    it('should transform MessageEntity to Message', () => {
      const messageEntity: MessageEntity = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        sender_id: 'user-123',
        content: { text: 'Hello world' },
        type: 'text',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        is_deleted: false,
        reply_to: undefined,
        edited_at: undefined,
      };

      const message = ModelTransformer.messageEntityToMessage(
        messageEntity,
        ['user-456'],
        ['user-456']
      );

      expect(message).toEqual({
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: { text: 'Hello world' },
        type: 'text',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        deliveredTo: ['user-456'],
        readBy: ['user-456'],
        isDeleted: false,
        replyTo: undefined,
        editedAt: undefined,
      });
    });
  });
});

describe('Model Validator', () => {
  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      expect(ModelValidator.isValidPhoneNumber('+1234567890')).toBe(true);
      expect(ModelValidator.isValidPhoneNumber('+44123456789')).toBe(true);
      expect(ModelValidator.isValidPhoneNumber('+86123456789012')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(ModelValidator.isValidPhoneNumber('1234567890')).toBe(false); // Missing +
      expect(ModelValidator.isValidPhoneNumber('+0123456789')).toBe(false); // Starts with 0
      expect(ModelValidator.isValidPhoneNumber('+123')).toBe(false); // Too short
      expect(ModelValidator.isValidPhoneNumber('+123456789012345678')).toBe(false); // Too long
      expect(ModelValidator.isValidPhoneNumber('')).toBe(false); // Empty
      expect(ModelValidator.isValidPhoneNumber('+12345abc67890')).toBe(false); // Contains letters
    });
  });

  describe('Display Name Validation', () => {
    it('should validate correct display names', () => {
      expect(ModelValidator.isValidDisplayName('John')).toBe(true);
      expect(ModelValidator.isValidDisplayName('John Doe')).toBe(true);
      expect(ModelValidator.isValidDisplayName('A')).toBe(true);
      expect(ModelValidator.isValidDisplayName('A'.repeat(100))).toBe(true);
    });

    it('should reject invalid display names', () => {
      expect(ModelValidator.isValidDisplayName('')).toBe(false); // Empty
      expect(ModelValidator.isValidDisplayName('A'.repeat(101))).toBe(false); // Too long
    });
  });

  describe('Message Content Validation', () => {
    it('should validate text message content', () => {
      expect(ModelValidator.isValidMessageContent({ text: 'Hello' }, 'text')).toBe(true);
      expect(ModelValidator.isValidMessageContent({ text: '' }, 'text')).toBe(false);
      expect(ModelValidator.isValidMessageContent({}, 'text')).toBe(false);
    });

    it('should validate media message content', () => {
      expect(ModelValidator.isValidMessageContent({ mediaId: 'media-123' }, 'image')).toBe(true);
      expect(ModelValidator.isValidMessageContent({ mediaUrl: 'https://example.com/image.jpg' }, 'image')).toBe(true);
      expect(ModelValidator.isValidMessageContent({}, 'image')).toBe(false);
    });

    it('should reject invalid content', () => {
      expect(ModelValidator.isValidMessageContent(null, 'text')).toBe(false);
      expect(ModelValidator.isValidMessageContent('string', 'text')).toBe(false);
      expect(ModelValidator.isValidMessageContent({ invalid: 'content' }, 'text')).toBe(false);
    });
  });

  describe('User Validation', () => {
    it('should validate correct user data', () => {
      const user: Partial<User> = {
        phoneNumber: '+1234567890',
        displayName: 'John Doe',
      };

      const errors = ModelValidator.validateUser(user);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid user data', () => {
      const user: Partial<User> = {
        phoneNumber: 'invalid-phone',
        displayName: '',
      };

      const errors = ModelValidator.validateUser(user);
      expect(errors).toContain('Invalid phone number format');
      expect(errors).toContain('Display name must be between 1 and 100 characters');
    });
  });

  describe('Message Validation', () => {
    it('should validate correct message data', () => {
      const message: Partial<Message> = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: { text: 'Hello world' },
        type: 'text',
      };

      const errors = ModelValidator.validateMessage(message);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid message data', () => {
      const message: Partial<Message> = {
        content: { text: 'Hello world' },
        type: 'invalid' as any,
      };

      const errors = ModelValidator.validateMessage(message);
      expect(errors).toContain('Message must have a conversation ID');
      expect(errors).toContain('Message must have a sender ID');
      expect(errors).toContain('Invalid message type');
    });
  });
});