import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Media ID parameter schema
export const mediaIdParamSchema = Joi.object({
  mediaId: Joi.string().uuid().required(),
});

// User ID parameter schema (for streaming)
export const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid().required(),
});

// Combined media streaming parameters schema
export const mediaStreamParamSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  mediaId: Joi.string().uuid().required(),
});

// File upload validation (handled by multer, but we can add additional checks)
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    res.status(400).json({
      success: false,
      error: 'No file provided',
      code: 'MEDIA_VALIDATION_001',
    });
    return;
  }

  // Additional file validation can be added here
  // For now, detailed validation is handled in the MediaService
  next();
};

// Multiple file upload validation
export const validateMultipleFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No files provided',
      code: 'MEDIA_VALIDATION_002',
    });
    return;
  }

  if (req.files.length > 10) {
    res.status(400).json({
      success: false,
      error: 'Too many files. Maximum 10 files allowed per upload',
      code: 'MEDIA_VALIDATION_003',
    });
    return;
  }

  next();
};

// Validation middleware functions
export const validateMediaParams = (schema: Joi.ObjectSchema) => {
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
        code: 'MEDIA_VALIDATION_ERROR',
        details: errorDetails,
      });
      return;
    }

    req.params = value;
    next();
  };
};

// Content-Type validation for media streaming
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      res.status(415).json({
        success: false,
        error: `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'MEDIA_VALIDATION_004',
      });
      return;
    }

    next();
  };
};

// File size validation middleware (additional to multer)
export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.file && req.file.size > maxSize) {
      res.status(413).json({
        success: false,
        error: `File size exceeds maximum allowed size of ${maxSize} bytes`,
        code: 'MEDIA_VALIDATION_005',
      });
      return;
    }

    if (req.files && Array.isArray(req.files)) {
      const oversizedFile = req.files.find(file => file.size > maxSize);
      if (oversizedFile) {
        res.status(413).json({
          success: false,
          error: `File "${oversizedFile.originalname}" exceeds maximum allowed size of ${maxSize} bytes`,
          code: 'MEDIA_VALIDATION_006',
        });
        return;
      }
    }

    next();
  };
};

// MIME type validation middleware (additional to multer)
export const validateMimeType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.file && !allowedTypes.includes(req.file.mimetype)) {
      res.status(415).json({
        success: false,
        error: `File type "${req.file.mimetype}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'MEDIA_VALIDATION_007',
      });
      return;
    }

    if (req.files && Array.isArray(req.files)) {
      const invalidFile = req.files.find(file => !allowedTypes.includes(file.mimetype));
      if (invalidFile) {
        res.status(415).json({
          success: false,
          error: `File type "${invalidFile.mimetype}" is not allowed for file "${invalidFile.originalname}". Allowed types: ${allowedTypes.join(', ')}`,
          code: 'MEDIA_VALIDATION_008',
        });
        return;
      }
    }

    next();
  };
};