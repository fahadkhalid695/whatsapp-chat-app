import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Message content validation schemas
const messageContentSchema = Joi.object({
  text: Joi.string().max(4000).optional(),
  mediaId: Joi.string().uuid().optional(),
  mediaType: Joi.string().valid('image', 'video', 'audio', 'document').optional(),
  mediaUrl: Joi.string().uri().optional(),
  thumbnailUrl: Joi.string().uri().optional(),
  fileName: Joi.string().max(255).optional(),
  fileSize: Joi.number().integer().min(0).max(100 * 1024 * 1024).optional(), // 100MB max
}).custom((value, helpers) => {
  // At least one content field must be present
  if (!value.text && !value.mediaId && !value.mediaUrl) {
    return helpers.error('any.required');
  }
  
  // If mediaType is specified, mediaId or mediaUrl must be present
  if (value.mediaType && !value.mediaId && !value.mediaUrl) {
    return helpers.error('object.with', { peer: 'mediaId or mediaUrl' });
  }
  
  return value;
});

// Send message request schema
export const sendMessageSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  content: messageContentSchema.required(),
  type: Joi.string().valid('text', 'image', 'video', 'audio', 'document', 'system').required(),
  replyTo: Joi.string().uuid().optional(),
});

// Edit message request schema
export const editMessageSchema = Joi.object({
  content: Joi.object({
    text: Joi.string().max(4000).required(),
  }).required(),
});

// Mark messages as read schema
export const markAsReadSchema = Joi.object({
  messageIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
});

// Get messages query parameters schema
export const getMessagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  before: Joi.date().iso().optional(),
});

// Search messages query parameters schema
export const searchMessagesQuerySchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  conversationId: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

// Message ID parameter schema
export const messageIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Conversation ID parameter schema
export const conversationIdParamSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
});

// Validation middleware functions
export const validateMessageRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errorDetails,
      });
      return;
    }

    req.body = value;
    next();
  };
};

export const validateMessageParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        details: errorDetails,
      });
      return;
    }

    req.params = value;
    next();
  };
};

export const validateMessageQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: errorDetails,
      });
      return;
    }

    req.query = value;
    next();
  };
};