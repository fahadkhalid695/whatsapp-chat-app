import Joi from 'joi';

// Phone number validation (E.164 format)
const phoneNumberSchema = Joi.string()
  .pattern(/^\+[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g., +1234567890)',
  });

// Display name validation
const displayNameSchema = Joi.string()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.min': 'Display name must be at least 1 character long',
    'string.max': 'Display name must be at most 100 characters long',
  });

// Profile picture URL validation
const profilePictureSchema = Joi.string()
  .uri()
  .optional()
  .allow('')
  .messages({
    'string.uri': 'Profile picture must be a valid URL',
  });

// Status message validation
const statusSchema = Joi.string()
  .max(200)
  .optional()
  .messages({
    'string.max': 'Status message must be at most 200 characters long',
  });

// Update user profile validation
export const updateUserProfileSchema = Joi.object({
  displayName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Display name must be at least 1 character long',
      'string.max': 'Display name must be at most 100 characters long',
    }),
  profilePicture: profilePictureSchema,
  status: statusSchema,
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Search users validation
export const searchUsersSchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query must be at most 100 characters long',
    }),
});

// Sync contacts validation
export const syncContactsSchema = Joi.object({
  contacts: Joi.array()
    .items(
      Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Contact name must be at least 1 character long',
            'string.max': 'Contact name must be at most 100 characters long',
          }),
        phoneNumber: phoneNumberSchema,
      })
    )
    .max(1000)
    .required()
    .messages({
      'array.max': 'Cannot sync more than 1000 contacts at once',
    }),
});

// Block user validation
export const blockUserSchema = Joi.object({
  targetUserId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Target user ID must be a valid UUID',
    }),
});

// Get users presence validation
export const getUsersPresenceSchema = Joi.object({
  userIds: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .required()
        .messages({
          'string.uuid': 'User ID must be a valid UUID',
        })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one user ID must be provided',
      'array.max': 'Cannot check presence for more than 100 users at once',
    }),
});

// UUID parameter validation
export const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'ID must be a valid UUID',
    }),
});