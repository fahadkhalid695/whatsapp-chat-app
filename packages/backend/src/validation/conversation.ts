import Joi from 'joi';

// UUID validation pattern
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Create conversation validation
export const createConversationSchema = Joi.object({
  type: Joi.string().valid('direct', 'group').required(),
  name: Joi.string().trim().min(1).max(100).when('type', {
    is: 'group',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  participants: Joi.array()
    .items(Joi.string().pattern(uuidPattern).required())
    .min(1)
    .max(100)
    .required(),
});

// Update conversation validation
export const updateConversationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
});

// Add participants validation
export const addParticipantsSchema = Joi.object({
  participantIds: Joi.array()
    .items(Joi.string().pattern(uuidPattern).required())
    .min(1)
    .max(50)
    .required(),
});

// Remove participants validation
export const removeParticipantsSchema = Joi.object({
  participantIds: Joi.array()
    .items(Joi.string().pattern(uuidPattern).required())
    .min(1)
    .max(50)
    .required(),
});

// Update admin status validation
export const updateAdminStatusSchema = Joi.object({
  targetUserId: Joi.string().pattern(uuidPattern).required(),
  makeAdmin: Joi.boolean().required(),
});

// Archive conversation validation
export const archiveConversationSchema = Joi.object({
  archive: Joi.boolean().required(),
});

// Mute conversation validation
export const muteConversationSchema = Joi.object({
  mute: Joi.boolean().required(),
});

// Conversation list query parameters validation
export const conversationListQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  includeArchived: Joi.boolean().default(false),
  sortBy: Joi.string().valid('last_activity', 'created_at').default('last_activity'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

// UUID parameter validation
export const conversationIdParamSchema = Joi.object({
  id: Joi.string().pattern(uuidPattern).required(),
});

// Validation middleware helper
export const validateConversationRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }
    
    req.body = value;
    next();
  };
};

export const validateConversationParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }
    
    req.params = value;
    next();
  };
};

export const validateConversationQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
        code: 'VALIDATION_ERROR',
      });
    }
    
    req.query = value;
    next();
  };
};