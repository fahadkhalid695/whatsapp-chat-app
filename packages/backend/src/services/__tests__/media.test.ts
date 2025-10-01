import { MediaService } from '../media';
import { config } from '../../config';
import fs from 'fs/promises';
// import path from 'path'; // Not used in tests

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('sharp');
jest.mock('fluent-ffmpeg');
jest.mock('../../database/connection');
jest.mock('../../config');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

const mockConfig = config as jest.Mocked<typeof config>;
const mockDb = require('../../database/connection').db;

describe('MediaService', () => {
  let mediaService: MediaService;
  const mockUserId = 'user-123';
  const mockMediaId = 'media-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default config mock
    mockConfig.media = {
      storage: {
        type: 'local',
        localPath: './test-uploads',
        s3: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1',
          bucket: 'test-bucket',
          endpoint: undefined,
        },
      },
      validation: {
        maxFileSize: 10485760,
        image: {
          maxFileSize: 5242880,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
          allowedExtensions: ['.jpg', '.jpeg', '.png'],
        },
        video: {
          maxFileSize: 52428800,
          allowedMimeTypes: ['video/mp4'],
          allowedExtensions: ['.mp4'],
        },
        audio: {
          maxFileSize: 10485760,
          allowedMimeTypes: ['audio/mpeg'],
          allowedExtensions: ['.mp3'],
        },
        document: {
          maxFileSize: 10485760,
          allowedMimeTypes: ['application/pdf'],
          allowedExtensions: ['.pdf'],
        },
      },
      thumbnail: {
        image: {
          width: 300,
          height: 300,
          quality: 80,
        },
        video: {
          width: 300,
          height: 300,
          timeOffset: 1,
        },
      },
    };

    mediaService = new MediaService();
  });

  describe('uploadMedia', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024000,
      buffer: Buffer.from('fake-image-data'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    it('should upload image file successfully', async () => {
      // Mock database query
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock sharp for thumbnail generation
      const mockSharp = require('sharp');
      mockSharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
      });

      // Mock file system operations
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      const result = await mediaService.uploadMedia({
        file: mockFile,
        userId: mockUserId,
      });

      expect(result).toMatchObject({
        mediaId: expect.any(String),
        url: expect.stringContaining('/api/media/'),
        thumbnailUrl: expect.stringContaining('/api/media/'),
        fileName: 'test-image.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media_files'),
        expect.arrayContaining([
          expect.any(String), // mediaId
          mockUserId,
          'test-image.jpg',
          expect.any(String), // fileName
          'image/jpeg',
          1024000,
          'local',
          expect.any(String), // storagePath
          expect.any(String), // thumbnailPath
          'image',
        ])
      );
    });

    it('should reject file that exceeds size limit', async () => {
      const oversizedFile = {
        ...mockFile,
        size: 20000000, // 20MB, exceeds 5MB limit for images
      };

      await expect(
        mediaService.uploadMedia({
          file: oversizedFile,
          userId: mockUserId,
        })
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });

    it('should reject unsupported file type', async () => {
      const unsupportedFile = {
        ...mockFile,
        mimetype: 'application/x-executable',
        originalname: 'malware.exe',
      };

      await expect(
        mediaService.uploadMedia({
          file: unsupportedFile,
          userId: mockUserId,
        })
      ).rejects.toThrow('File type application/x-executable is not allowed');
    });

    it('should reject unsupported file extension', async () => {
      const unsupportedFile = {
        ...mockFile,
        originalname: 'test.bmp', // BMP not in allowed extensions
      };

      await expect(
        mediaService.uploadMedia({
          file: unsupportedFile,
          userId: mockUserId,
        })
      ).rejects.toThrow('File extension .bmp is not allowed');
    });
  });

  describe('getMediaUrl', () => {
    it('should return media URL for existing file', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          storage_path: `${mockUserId}/test-file.jpg`,
          storage_type: 'local',
        }],
      });

      const url = await mediaService.getMediaUrl(mockMediaId, mockUserId);

      expect(url).toBe(`/api/media/${mockUserId}/test-file.jpg`);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT storage_path, storage_type FROM media_files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [mockMediaId, mockUserId]
      );
    });

    it('should throw error for non-existent file', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        mediaService.getMediaUrl(mockMediaId, mockUserId)
      ).rejects.toThrow('Media file not found or access denied');
    });
  });

  describe('deleteMedia', () => {
    it('should delete media file successfully', async () => {
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{
                storage_path: `${mockUserId}/test-file.jpg`,
                thumbnail_path: `${mockUserId}/thumb_test-file.jpg`,
                storage_type: 'local',
              }],
            })
            .mockResolvedValueOnce({ rows: [] }), // UPDATE query
        };
        return callback(mockClient);
      });

      // Mock file system operations
      jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await mediaService.deleteMedia(mockMediaId, mockUserId);

      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should throw error for non-existent file', async () => {
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockClient);
      });

      await expect(
        mediaService.deleteMedia(mockMediaId, mockUserId)
      ).rejects.toThrow('Media file not found or access denied');
    });
  });

  describe('getMediaInfo', () => {
    it('should return media file information', async () => {
      const mockMediaData = {
        id: mockMediaId,
        original_name: 'test-image.jpg',
        file_name: 'media-456.jpg',
        mime_type: 'image/jpeg',
        file_size: '1024000',
        storage_type: 'local',
        storage_path: `${mockUserId}/media-456.jpg`,
        thumbnail_path: `${mockUserId}/thumb_media-456.jpg`,
        media_type: 'image',
        created_at: new Date('2023-01-01T00:00:00Z'),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockMediaData],
      });

      const result = await mediaService.getMediaInfo(mockMediaId, mockUserId);

      expect(result).toMatchObject({
        id: mockMediaId,
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: expect.stringContaining('/api/media/'),
        thumbnailUrl: expect.stringContaining('/api/media/'),
        userId: mockUserId,
        createdAt: mockMediaData.created_at,
      });
    });

    it('should throw error for non-existent file', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        mediaService.getMediaInfo(mockMediaId, mockUserId)
      ).rejects.toThrow('Media file not found or access denied');
    });
  });

  describe('getUserMedia', () => {
    it('should return user media files with pagination', async () => {
      const mockMediaFiles = [
        {
          id: 'media-1',
          original_name: 'image1.jpg',
          file_name: 'media-1.jpg',
          mime_type: 'image/jpeg',
          file_size: '1024000',
          storage_type: 'local',
          storage_path: `${mockUserId}/media-1.jpg`,
          thumbnail_path: `${mockUserId}/thumb_media-1.jpg`,
          media_type: 'image',
          created_at: new Date('2023-01-01T00:00:00Z'),
        },
        {
          id: 'media-2',
          original_name: 'video1.mp4',
          file_name: 'media-2.mp4',
          mime_type: 'video/mp4',
          file_size: '5120000',
          storage_type: 'local',
          storage_path: `${mockUserId}/media-2.mp4`,
          thumbnail_path: `${mockUserId}/thumb_media-2.jpg`,
          media_type: 'video',
          created_at: new Date('2023-01-02T00:00:00Z'),
        },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockMediaFiles }); // Data query

      const result = await mediaService.getUserMedia(mockUserId, undefined, 10, 0);

      expect(result.total).toBe(2);
      expect(result.media).toHaveLength(2);
      expect(result.media[0]).toMatchObject({
        id: 'media-1',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
      });
    });

    it('should filter by media type', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await mediaService.getUserMedia(mockUserId, 'image', 10, 0);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND is_deleted = false AND media_type = $2'),
        [mockUserId, 'image']
      );
    });
  });

  describe('file validation', () => {
    it('should validate image files correctly', () => {
      const imageFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1000000, // 1MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      };

      expect(() => {
        (mediaService as any).validateFile(imageFile);
      }).not.toThrow();
    });

    it('should validate video files correctly', () => {
      const videoFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 10000000, // 10MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      };

      expect(() => {
        (mediaService as any).validateFile(videoFile);
      }).not.toThrow();
    });

    it('should get correct media type from MIME type', () => {
      expect((mediaService as any).getMediaType('image/jpeg')).toBe('image');
      expect((mediaService as any).getMediaType('video/mp4')).toBe('video');
      expect((mediaService as any).getMediaType('audio/mpeg')).toBe('audio');
      expect((mediaService as any).getMediaType('application/pdf')).toBe('document');
    });
  });
});