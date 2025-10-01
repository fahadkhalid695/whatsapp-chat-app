import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */

export const phoneVerificationSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890)',
      'any.required': 'Phone number is required',
    }),
});

export const verifyCodeSchema = Joi.object({
  verificationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid verification ID format',
      'any.required': 'Verification ID is required',
    }),
  
  code: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Verification code must be 6 digits',
      'any.required': 'Verification code is required',
    }),
  
  displayName: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
      'any.required': 'Display name is required',
    }),
  
  profilePicture: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Profile picture must be a valid URL',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

export const updateProfileSchema = Joi.object({
  displayName: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Display name cannot be empty',
      'string.max': 'Display name cannot exceed 100 characters',
    }),
  
  profilePicture: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Profile picture must be a valid URL',
    }),
  
  status: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Status cannot exceed 200 characters',
    }),
});