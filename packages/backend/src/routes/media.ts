import express from 'express';
import multer from 'multer';
import { mediaService } from '../services/media';
import { authenticateToken } from '../middleware/auth';
import { config } from '../config';
import {
  validateMediaParams,
  validateFileUpload,
  validateMultipleFileUpload,
  mediaIdParamSchema,
  mediaStreamParamSchema,
} from '../validation/media';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.media.validation.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME type validation (detailed validation happens in service)
    const allowedMimeTypes = [
      ...config.media.validation.image.allowedMimeTypes,
      ...config.media.validation.video.allowedMimeTypes,
      ...config.media.validation.audio.allowedMimeTypes,
      ...config.media.validation.document.allowedMimeTypes,
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

/**
 * Upload media file
 * POST /api/media/upload
 */
router.post('/upload', authenticateToken, upload.single('file'), validateFileUpload, async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'No file provided',
        code: 'MEDIA_001',
      });
      return;
    }

    const userId = req.user!.userId;
    const uploadResponse = await mediaService.uploadMedia({
      file: req.file,
      userId,
    });

    res.status(201).json({
      success: true,
      data: uploadResponse,
    });
  } catch (error) {
    console.error('Media upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('File size exceeds') || 
          error.message.includes('File type') || 
          error.message.includes('File extension')) {
        res.status(400).json({
          error: error.message,
          code: 'MEDIA_002',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Failed to upload media file',
      code: 'MEDIA_003',
    });
  }
});

/**
 * Get media file URL
 * GET /api/media/:mediaId/url
 */
router.get('/:mediaId/url', authenticateToken, validateMediaParams(mediaIdParamSchema), async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user!.userId;

    const mediaUrl = await mediaService.getMediaUrl(mediaId, userId);

    res.json({
      success: true,
      data: {
        url: mediaUrl,
      },
    });
  } catch (error) {
    console.error('Get media URL error:', error);
    res.status(500).json({
      error: 'Failed to get media URL',
      code: 'MEDIA_004',
    });
  }
});

/**
 * Stream media file (for local storage only)
 * GET /api/media/:userId/:mediaId
 */
router.get('/:userId/:mediaId', validateMediaParams(mediaStreamParamSchema), async (req, res): Promise<void> => {
  try {
    const { userId, mediaId } = req.params;

    if (config.media.storage.type !== 'local') {
      res.status(404).json({
        error: 'Media streaming not available',
        code: 'MEDIA_005',
      });
      return;
    }

    const { stream, mimeType } = await mediaService.streamMedia(mediaId, userId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    stream.pipe(res);
  } catch (error) {
    console.error('Media streaming error:', error);
    res.status(404).json({
      error: 'Media file not found',
      code: 'MEDIA_006',
    });
  }
});

/**
 * Delete media file
 * DELETE /api/media/:mediaId
 */
router.delete('/:mediaId', authenticateToken, validateMediaParams(mediaIdParamSchema), async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user!.userId;

    await mediaService.deleteMedia(mediaId, userId);

    res.json({
      success: true,
      message: 'Media file deleted successfully',
    });
  } catch (error) {
    console.error('Media deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete media file',
      code: 'MEDIA_007',
    });
  }
});

/**
 * Upload multiple files
 * POST /api/media/upload/multiple
 */
router.post('/upload/multiple', authenticateToken, upload.array('files', 10), validateMultipleFileUpload, async (req, res): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        error: 'No files provided',
        code: 'MEDIA_008',
      });
      return;
    }

    const userId = req.user!.userId;
    const uploadPromises = req.files.map(file => 
      mediaService.uploadMedia({ file, userId })
    );

    const uploadResults = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      data: uploadResults,
    });
  } catch (error) {
    console.error('Multiple media upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('File size exceeds') || 
          error.message.includes('File type') || 
          error.message.includes('File extension')) {
        res.status(400).json({
          error: error.message,
          code: 'MEDIA_009',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Failed to upload media files',
      code: 'MEDIA_010',
    });
  }
});

/**
 * Get media file information
 * GET /api/media/:mediaId/info
 */
router.get('/:mediaId/info', authenticateToken, validateMediaParams(mediaIdParamSchema), async (req, res): Promise<void> => {
  try {
    const { mediaId } = req.params;
    const userId = req.user!.userId;

    const mediaInfo = await mediaService.getMediaInfo(mediaId, userId);

    res.json({
      success: true,
      data: mediaInfo,
    });
  } catch (error) {
    console.error('Get media info error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: error.message,
        code: 'MEDIA_011',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to get media information',
      code: 'MEDIA_012',
    });
  }
});

/**
 * Get user's media files
 * GET /api/media/list
 */
router.get('/list', authenticateToken, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { type, limit = 50, offset = 0 } = req.query;

    const mediaType = type as 'image' | 'video' | 'audio' | 'document' | undefined;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        error: 'Invalid limit parameter. Must be between 1 and 100',
        code: 'MEDIA_013',
      });
      return;
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        error: 'Invalid offset parameter. Must be 0 or greater',
        code: 'MEDIA_014',
      });
      return;
    }

    if (mediaType && !['image', 'video', 'audio', 'document'].includes(mediaType)) {
      res.status(400).json({
        error: 'Invalid media type. Must be one of: image, video, audio, document',
        code: 'MEDIA_015',
      });
      return;
    }

    const result = await mediaService.getUserMedia(userId, mediaType, limitNum, offsetNum);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get user media error:', error);
    res.status(500).json({
      error: 'Failed to get user media files',
      code: 'MEDIA_016',
    });
  }
});

export default router;