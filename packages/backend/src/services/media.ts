import AWS from 'aws-sdk';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// import mime from 'mime-types'; // Not used directly
import { config } from '../config';
import { db } from '../database/connection';
import {
  MediaFile,
  MediaUploadRequest,
  MediaUploadResponse,
  // ThumbnailGenerationOptions, // Not used directly
  MediaValidationConfig,
} from '../types';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export class MediaService {
  private s3?: AWS.S3;

  constructor() {
    if (config.media.storage.type === 's3') {
      const s3Config: any = {
        region: config.media.storage.s3.region,
        s3ForcePathStyle: !!config.media.storage.s3.endpoint, // Required for MinIO and other S3-compatible services
      };

      if (config.media.storage.s3.accessKeyId) {
        s3Config.accessKeyId = config.media.storage.s3.accessKeyId;
      }

      if (config.media.storage.s3.secretAccessKey) {
        s3Config.secretAccessKey = config.media.storage.s3.secretAccessKey;
      }

      if (config.media.storage.s3.endpoint) {
        s3Config.endpoint = config.media.storage.s3.endpoint;
      }

      this.s3 = new AWS.S3(s3Config);
    }
  }

  /**
   * Upload a media file with validation and thumbnail generation
   */
  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    const { file, userId } = request;

    // Validate file
    this.validateFile(file);

    // Generate unique file ID and paths
    const mediaId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${mediaId}${fileExtension}`;
    const mediaType = this.getMediaType(file.mimetype);

    let mediaUrl: string;
    let thumbnailUrl: string | undefined;
    let storagePath: string;
    let thumbnailPath: string | undefined;

    if (config.media.storage.type === 's3') {
      // Upload to S3
      storagePath = `${userId}/${fileName}`;
      mediaUrl = await this.uploadToS3(file, fileName, userId);
      
      // Generate and upload thumbnail if applicable
      if (mediaType === 'image' || mediaType === 'video') {
        const thumbnailFileName = `thumb_${fileName}`;
        const thumbnailBuffer = await this.generateThumbnail(file, mediaType);
        thumbnailUrl = await this.uploadBufferToS3(thumbnailBuffer, thumbnailFileName, 'image/jpeg', userId);
        thumbnailPath = `${userId}/${thumbnailFileName}`;
      }
    } else {
      // Upload to local storage
      storagePath = `${userId}/${fileName}`;
      mediaUrl = await this.uploadToLocal(file, fileName, userId);
      
      // Generate and save thumbnail if applicable
      if (mediaType === 'image' || mediaType === 'video') {
        const thumbnailFileName = `thumb_${fileName.replace(fileExtension, '.jpg')}`;
        const thumbnailBuffer = await this.generateThumbnail(file, mediaType);
        thumbnailUrl = await this.saveBufferToLocal(thumbnailBuffer, thumbnailFileName, userId);
        thumbnailPath = `${userId}/${thumbnailFileName}`;
      }
    }

    // Save media file record to database
    await db.query(
      `INSERT INTO media_files (
        id, user_id, original_name, file_name, mime_type, file_size,
        storage_type, storage_path, thumbnail_path, media_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        mediaId,
        userId,
        file.originalname,
        fileName,
        file.mimetype,
        file.size,
        config.media.storage.type,
        storagePath,
        thumbnailPath,
        mediaType,
      ]
    );

    const response: MediaUploadResponse = {
      mediaId,
      url: mediaUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    if (thumbnailUrl) {
      response.thumbnailUrl = thumbnailUrl;
    }

    return response;
  }

  /**
   * Get media URL (for streaming or download)
   */
  async getMediaUrl(mediaId: string, userId: string): Promise<string> {
    // Verify media file exists and belongs to user
    const mediaResult = await db.query(
      'SELECT storage_path, storage_type FROM media_files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [mediaId, userId]
    );

    if (mediaResult.rows.length === 0) {
      throw new Error('Media file not found or access denied');
    }

    const { storage_path, storage_type } = mediaResult.rows[0];

    if (storage_type === 's3') {
      // Generate signed URL for S3
      return this.s3!.getSignedUrl('getObject', {
        Bucket: config.media.storage.s3.bucket,
        Key: storage_path,
        Expires: 3600, // 1 hour
      });
    } else {
      // Return local file URL
      return `/api/media/${userId}/${path.basename(storage_path)}`;
    }
  }

  /**
   * Delete media file
   */
  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    return db.transaction(async (client) => {
      // Get media file info and verify ownership
      const mediaResult = await client.query(
        'SELECT storage_path, thumbnail_path, storage_type FROM media_files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [mediaId, userId]
      );

      if (mediaResult.rows.length === 0) {
        throw new Error('Media file not found or access denied');
      }

      const { storage_path, thumbnail_path, storage_type } = mediaResult.rows[0];

      // Mark as deleted in database
      await client.query(
        'UPDATE media_files SET is_deleted = true WHERE id = $1',
        [mediaId]
      );

      // Delete from storage
      if (storage_type === 's3') {
        // Delete from S3
        await this.s3!.deleteObject({
          Bucket: config.media.storage.s3.bucket,
          Key: storage_path,
        }).promise();

        // Delete thumbnail if exists
        if (thumbnail_path) {
          try {
            await this.s3!.deleteObject({
              Bucket: config.media.storage.s3.bucket,
              Key: thumbnail_path,
            }).promise();
          } catch (error) {
            // Thumbnail might not exist, ignore error
          }
        }
      } else {
        // Delete from local storage
        const filePath = path.join(config.media.storage.localPath, storage_path);
        
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // File might not exist, ignore error
        }

        if (thumbnail_path) {
          const thumbnailFilePath = path.join(config.media.storage.localPath, thumbnail_path);
          try {
            await fs.unlink(thumbnailFilePath);
          } catch (error) {
            // Thumbnail might not exist, ignore error
          }
        }
      }
    });
  }

  /**
   * Stream media file for local storage
   */
  async streamMedia(mediaId: string, userId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    if (config.media.storage.type !== 'local') {
      throw new Error('Streaming is only available for local storage');
    }

    // Get media file info from database
    const mediaResult = await db.query(
      'SELECT storage_path, mime_type FROM media_files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [mediaId, userId]
    );

    if (mediaResult.rows.length === 0) {
      throw new Error('Media file not found or access denied');
    }

    const { storage_path, mime_type } = mediaResult.rows[0];
    const filePath = path.join(config.media.storage.localPath, storage_path);
    
    const fs = require('fs');
    const stream = fs.createReadStream(filePath);
    
    return { stream, mimeType: mime_type };
  }

  /**
   * Get media file information
   */
  async getMediaInfo(mediaId: string, userId: string): Promise<MediaFile> {
    const mediaResult = await db.query(
      `SELECT id, original_name, file_name, mime_type, file_size, 
              storage_type, storage_path, thumbnail_path, media_type, 
              created_at
       FROM media_files 
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [mediaId, userId]
    );

    if (mediaResult.rows.length === 0) {
      throw new Error('Media file not found or access denied');
    }

    const row = mediaResult.rows[0];
    
    // Generate URLs based on storage type
    let url: string;
    let thumbnailUrl: string | undefined;

    if (row.storage_type === 's3') {
      url = this.s3!.getSignedUrl('getObject', {
        Bucket: config.media.storage.s3.bucket,
        Key: row.storage_path,
        Expires: 3600,
      });

      if (row.thumbnail_path) {
        thumbnailUrl = this.s3!.getSignedUrl('getObject', {
          Bucket: config.media.storage.s3.bucket,
          Key: row.thumbnail_path,
          Expires: 3600,
        });
      }
    } else {
      url = `/api/media/${userId}/${path.basename(row.storage_path)}`;
      if (row.thumbnail_path) {
        thumbnailUrl = `/api/media/${userId}/${path.basename(row.thumbnail_path)}`;
      }
    }

    const mediaFile: MediaFile = {
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: parseInt(row.file_size),
      url,
      userId,
      createdAt: row.created_at,
    };

    if (thumbnailUrl) {
      mediaFile.thumbnailUrl = thumbnailUrl;
    }

    return mediaFile;
  }

  /**
   * Get user's media files with pagination
   */
  async getUserMedia(
    userId: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ media: MediaFile[]; total: number }> {
    let whereClause = 'WHERE user_id = $1 AND is_deleted = false';
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (mediaType) {
      whereClause += ` AND media_type = $${paramIndex}`;
      queryParams.push(mediaType);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM media_files ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get media files
    const mediaResult = await db.query(
      `SELECT id, original_name, file_name, mime_type, file_size, 
              storage_type, storage_path, thumbnail_path, media_type, 
              created_at
       FROM media_files 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const media = mediaResult.rows.map(row => {
      let url: string;
      let thumbnailUrl: string | undefined;

      if (row.storage_type === 's3') {
        url = this.s3!.getSignedUrl('getObject', {
          Bucket: config.media.storage.s3.bucket,
          Key: row.storage_path,
          Expires: 3600,
        });

        if (row.thumbnail_path) {
          thumbnailUrl = this.s3!.getSignedUrl('getObject', {
            Bucket: config.media.storage.s3.bucket,
            Key: row.thumbnail_path,
            Expires: 3600,
          });
        }
      } else {
        url = `/api/media/${userId}/${path.basename(row.storage_path)}`;
        if (row.thumbnail_path) {
          thumbnailUrl = `/api/media/${userId}/${path.basename(row.thumbnail_path)}`;
        }
      }

      const mediaFile: MediaFile = {
        id: row.id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        size: parseInt(row.file_size),
        url,
        userId,
        createdAt: row.created_at,
      };

      if (thumbnailUrl) {
        mediaFile.thumbnailUrl = thumbnailUrl;
      }

      return mediaFile;
    });

    return { media, total };
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    const mediaType = this.getMediaType(file.mimetype);
    const validationConfig = this.getValidationConfig(mediaType);

    // Check file size
    if (file.size > validationConfig.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${validationConfig.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!validationConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!validationConfig.allowedExtensions.includes(fileExtension)) {
      throw new Error(`File extension ${fileExtension} is not allowed`);
    }
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Get validation configuration for media type
   */
  private getValidationConfig(mediaType: 'image' | 'video' | 'audio' | 'document'): MediaValidationConfig {
    const mediaConfig = config.media.validation[mediaType];
    return {
      maxFileSize: mediaConfig.maxFileSize,
      allowedMimeTypes: mediaConfig.allowedMimeTypes,
      allowedExtensions: mediaConfig.allowedExtensions,
    };
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(file: Express.Multer.File, fileName: string, userId: string): Promise<string> {
    const key = `${userId}/${fileName}`;
    
    const uploadResult = await this.s3!.upload({
      Bucket: config.media.storage.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    }).promise();

    return uploadResult.Location;
  }

  /**
   * Upload buffer to S3
   */
  private async uploadBufferToS3(buffer: Buffer, fileName: string, mimeType: string, userId: string): Promise<string> {
    const key = `${userId}/${fileName}`;
    
    const uploadResult = await this.s3!.upload({
      Bucket: config.media.storage.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private',
    }).promise();

    return uploadResult.Location;
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(file: Express.Multer.File, fileName: string, userId: string): Promise<string> {
    const userDir = path.join(config.media.storage.localPath, userId);
    const filePath = path.join(userDir, fileName);

    // Ensure directory exists
    await fs.mkdir(userDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, file.buffer);

    return `/api/media/${userId}/${fileName}`;
  }

  /**
   * Save buffer to local storage
   */
  private async saveBufferToLocal(buffer: Buffer, fileName: string, userId: string): Promise<string> {
    const userDir = path.join(config.media.storage.localPath, userId);
    const filePath = path.join(userDir, fileName);

    // Ensure directory exists
    await fs.mkdir(userDir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return `/api/media/${userId}/${fileName}`;
  }

  /**
   * Generate thumbnail for image or video
   */
  private async generateThumbnail(file: Express.Multer.File, mediaType: 'image' | 'video'): Promise<Buffer> {
    if (mediaType === 'image') {
      return this.generateImageThumbnail(file.buffer);
    } else if (mediaType === 'video') {
      return this.generateVideoThumbnail(file.buffer);
    }
    
    throw new Error(`Thumbnail generation not supported for media type: ${mediaType}`);
  }

  /**
   * Generate thumbnail for image
   */
  private async generateImageThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    const { width, height, quality } = config.media.thumbnail.image;
    
    return sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
  }

  /**
   * Generate thumbnail for video
   */
  private async generateVideoThumbnail(videoBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { width, height, timeOffset } = config.media.thumbnail.video;
      const tempVideoPath = path.join('/tmp', `video_${uuidv4()}.mp4`);
      const tempThumbnailPath = path.join('/tmp', `thumb_${uuidv4()}.jpg`);

      // Write video buffer to temporary file
      fs.writeFile(tempVideoPath, videoBuffer)
        .then(() => {
          ffmpeg(tempVideoPath)
            .screenshots({
              timestamps: [timeOffset],
              filename: path.basename(tempThumbnailPath),
              folder: path.dirname(tempThumbnailPath),
              size: `${width}x${height}`,
            })
            .on('end', async () => {
              try {
                const thumbnailBuffer = await fs.readFile(tempThumbnailPath);
                
                // Clean up temporary files
                await fs.unlink(tempVideoPath).catch(() => {});
                await fs.unlink(tempThumbnailPath).catch(() => {});
                
                resolve(thumbnailBuffer);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', async (error) => {
              // Clean up temporary files
              await fs.unlink(tempVideoPath).catch(() => {});
              await fs.unlink(tempThumbnailPath).catch(() => {});
              
              reject(error);
            });
        })
        .catch(reject);
    });
  }
}

export const mediaService = new MediaService();