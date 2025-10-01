import Joi from 'joi';

export const registerDeviceTokenSchema = Joi.object({
  token: Joi.string().required().min(1).max(1000),
  platform: Joi.string().valid('web', 'android', 'ios').required(),
});

export const removeDeviceTokenSchema = Joi.object({
  token: Joi.string().required().min(1).max(1000),
});

export const updateNotificationPreferencesSchema = Joi.object({
  pushEnabled: Joi.boolean().optional(),
  messageNotifications: Joi.boolean().optional(),
  groupNotifications: Joi.boolean().optional(),
  mentionNotifications: Joi.boolean().optional(),
  quietHoursEnabled: Joi.boolean().optional(),
  quietHoursStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  quietHoursEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
  timezone: Joi.string().optional().max(50),
});

export const muteConversationSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  mutedUntil: Joi.date().optional().greater('now'),
});

export const unmuteConversationSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
});

export const sendNotificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string().valid('message', 'mention', 'group_activity').required(),
  conversationId: Joi.string().uuid().required(),
  messageId: Joi.string().uuid().optional(),
  senderId: Joi.string().uuid().required(),
  senderName: Joi.string().required().max(100),
  conversationName: Joi.string().optional().max(100),
  messageContent: Joi.string().optional().max(500),
  isGroup: Joi.boolean().required(),
});