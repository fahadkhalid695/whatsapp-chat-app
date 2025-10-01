import request from 'supertest';
import express from 'express';
import mediaRoutes from '../media';
import { mediaService } from '../../services/media';
import { authenticateToken } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../services/media');
jest.mock('../../middleware/auth');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockAuthMiddleware = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/media', mediaRoutes);

// Mock user for authentication
const mockUser = {
  userId: 'user-123',
  phoneNumber: '+1234567890',
};

describe('Media Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, _res: any, next: any) => {
      req.user = mockUser;
      next();
    });
  });

  describe('POST /api/media/upload', () => {
    it('should upload file successfully', async () => {
      const mockUploadResponse = {
        mediaId: 'media-123',
        url: '/api/media/user-123/media-123.jpg',
        thumbnailUrl: '/api/media/user-123/thumb_media-123.jpg',
        fileName: 'test-image.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      };

      mockMediaService.uploadMedia.mockResolvedValueOnce(mockUploadResponse);

      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockUploadResponse,
      });

      expect(mockMediaService.uploadMedia).toHaveBeenCalledWith({
        file: expect.objectContaining({
          originalname: 'test-image.jpg',
          buffer: expect.any(Buffer),
        }),
        userId: mockUser.userId,
      });
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'No file provided',
        code: 'MEDIA_001',
      });
    });

    it('should handle upload errors', async () => {
      mockMediaService.uploadMedia.mockRejectedValueOnce(
        new Error('File size exceeds maximum allowed size')
      );

      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake-image-data'), 'test-image.jpg')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'File size exceeds maximum allowed size',
        code: 'MEDIA_002',
      });
    });
  });

  describe('GET /api/media/:mediaId/url', () => {
    it('should return media URL successfully', async () => {
      const mockUrl = '/api/media/user-123/media-123.jpg';
      mockMediaService.getMediaUrl.mockResolvedValueOnce(mockUrl);

      const response = await request(app)
        .get('/api/media/media-123/url')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          url: mockUrl,
        },
      });

      expect(mockMediaService.getMediaUrl).toHaveBeenCalledWith('media-123', mockUser.userId);
    });

    it('should return 400 for invalid media ID', async () => {
      const response = await request(app)
        .get('/api/media/invalid-id/url')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid parameters',
        code: 'MEDIA_VALIDATION_ERROR',
      });
    });

    it('should handle service errors', async () => {
      mockMediaService.getMediaUrl.mockRejectedValueOnce(
        new Error('Media file not found')
      );

      const response = await request(app)
        .get('/api/media/550e8400-e29b-41d4-a716-446655440000/url')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to get media URL',
        code: 'MEDIA_004',
      });
    });
  });

  describe('DELETE /api/media/:mediaId', () => {
    it('should delete media file successfully', async () => {
      mockMediaService.deleteMedia.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/api/media/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Media file deleted successfully',
      });

      expect(mockMediaService.deleteMedia).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        mockUser.userId
      );
    });

    it('should handle deletion errors', async () => {
      mockMediaService.deleteMedia.mockRejectedValueOnce(
        new Error('Media file not found')
      );

      const response = await request(app)
        .delete('/api/media/550e8400-e29b-41d4-a716-446655440000')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to delete media file',
        code: 'MEDIA_007',
      });
    });
  });

  describe('POST /api/media/upload/multiple', () => {
    it('should upload multiple files successfully', async () => {
      const mockUploadResponses = [
        {
          mediaId: 'media-1',
          url: '/api/media/user-123/media-1.jpg',
          fileName: 'image1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        },
        {
          mediaId: 'media-2',
          url: '/api/media/user-123/media-2.jpg',
          fileName: 'image2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
        },
      ];

      mockMediaService.uploadMedia
        .mockResolvedValueOnce(mockUploadResponses[0])
        .mockResolvedValueOnce(mockUploadResponses[1]);

      const response = await request(app)
        .post('/api/media/upload/multiple')
        .attach('files', Buffer.from('fake-image-1'), 'image1.jpg')
        .attach('files', Buffer.from('fake-image-2'), 'image2.jpg')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockUploadResponses,
      });

      expect(mockMediaService.uploadMedia).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when no files are provided', async () => {
      const response = await request(app)
        .post('/api/media/upload/multiple')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'No files provided',
        code: 'MEDIA_008',
      });
    });
  });

  describe('GET /api/media/:mediaId/info', () => {
    it('should return media file information', async () => {
      const mockMediaInfo = {
        id: 'media-123',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: '/api/media/user-123/media-123.jpg',
        thumbnailUrl: '/api/media/user-123/thumb_media-123.jpg',
        userId: mockUser.userId,
        createdAt: new Date('2023-01-01T00:00:00Z'),
      };

      mockMediaService.getMediaInfo.mockResolvedValueOnce(mockMediaInfo);

      const response = await request(app)
        .get('/api/media/550e8400-e29b-41d4-a716-446655440000/info')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMediaInfo,
      });

      expect(mockMediaService.getMediaInfo).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        mockUser.userId
      );
    });

    it('should return 404 for non-existent media', async () => {
      mockMediaService.getMediaInfo.mockRejectedValueOnce(
        new Error('Media file not found or access denied')
      );

      const response = await request(app)
        .get('/api/media/550e8400-e29b-41d4-a716-446655440000/info')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Media file not found or access denied',
        code: 'MEDIA_011',
      });
    });
  });

  describe('GET /api/media/list', () => {
    it('should return user media files', async () => {
      const mockMediaList = {
        media: [
          {
            id: 'media-1',
            originalName: 'image1.jpg',
            mimeType: 'image/jpeg',
            size: 1024000,
            url: '/api/media/user-123/media-1.jpg',
            userId: mockUser.userId,
            createdAt: new Date('2023-01-01T00:00:00Z'),
          },
        ],
        total: 1,
      };

      mockMediaService.getUserMedia.mockResolvedValueOnce(mockMediaList);

      const response = await request(app)
        .get('/api/media/list')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMediaList,
      });

      expect(mockMediaService.getUserMedia).toHaveBeenCalledWith(
        mockUser.userId,
        undefined,
        50,
        0
      );
    });

    it('should handle query parameters', async () => {
      const mockMediaList = { media: [], total: 0 };
      mockMediaService.getUserMedia.mockResolvedValueOnce(mockMediaList);

      await request(app)
        .get('/api/media/list?type=image&limit=10&offset=20')
        .expect(200);

      expect(mockMediaService.getUserMedia).toHaveBeenCalledWith(
        mockUser.userId,
        'image',
        10,
        20
      );
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/media/list?limit=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid limit parameter. Must be between 1 and 100',
        code: 'MEDIA_013',
      });
    });

    it('should validate media type parameter', async () => {
      const response = await request(app)
        .get('/api/media/list?type=invalid')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid media type. Must be one of: image, video, audio, document',
        code: 'MEDIA_015',
      });
    });
  });

  describe('GET /api/media/:userId/:mediaId (streaming)', () => {
    it('should stream media file for local storage', async () => {
      const mockStream = {
        stream: {
          pipe: jest.fn(),
        },
        mimeType: 'image/jpeg',
      };

      mockMediaService.streamMedia.mockResolvedValueOnce(mockStream as any);

      await request(app)
        .get('/api/media/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(mockMediaService.streamMedia).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should return 404 for streaming errors', async () => {
      mockMediaService.streamMedia.mockRejectedValueOnce(
        new Error('Media file not found')
      );

      const response = await request(app)
        .get('/api/media/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440001')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Media file not found',
        code: 'MEDIA_006',
      });
    });
  });
});