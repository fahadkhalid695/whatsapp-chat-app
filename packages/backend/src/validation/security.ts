import Joi from 'joi';

// Report user validation
export const reportUserSchema = Joi.object({
  reportedUserId: Joi.string().uuid().required(),
  reason: Joi.string().valid('spam', 'harassment', 'inappropriate_content', 'fake_account', 'other').required(),
  description: Joi.string().max(1000).optional(),
  messageId: Joi.string().uuid().optional(),
  conversationId: Joi.string().uuid().optional()
});

// Security settings validation
export const updateSecuritySettingsSchema = Joi.object({
  twoFactorEnabled: Joi.boolean().optional(),
  readReceiptsEnabled: Joi.boolean().optional(),
  lastSeenEnabled: Joi.boolean().optional(),
  profilePhotoVisibility: Joi.string().valid('everyone', 'contacts', 'nobody').optional(),
  statusVisibility: Joi.string().valid('everyone', 'contacts', 'nobody').optional()
});

// Disappearing messages validation
export const setDisappearingMessagesSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  timerDuration: Joi.number().integer().min(0).max(604800).required() // Max 7 days
});

// Account recovery validation
export const generateRecoveryCodeSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required()
});

export const useRecoveryCodeSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
  recoveryCode: Joi.string().length(64).required(), // 32 bytes in hex = 64 characters
  newDisplayName: Joi.string().min(1).max(100).optional()
});

// Block/unblock user validation
export const blockUserSchema = Joi.object({
  targetUserId: Joi.string().uuid().required()
});

// Encryption validation
export const generateKeysSchema = Joi.object({
  password: Joi.string().min(8).required()
});

// Validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    
    next();
  };
};