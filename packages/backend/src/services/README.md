# Services

This directory contains the business logic services for the WhatsApp Chat App backend.

## Media Service

The Media Service handles file uploads, storage, and retrieval for the chat application. It supports both local storage and S3-compatible cloud storage.

### Features

- **File Upload**: Supports images, videos, audio files, and documents
- **File Validation**: Validates file types, sizes, and extensions
- **Thumbnail Generation**: Automatically generates thumbnails for images and videos
- **Storage Options**: Local filesystem or S3-compatible cloud storage
- **Database Tracking**: Tracks all uploaded files in the database
- **Secure Access**: User-based access control for media files

### Supported File Types

#### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- Max size: 5MB (configurable)

#### Videos
- MP4 (.mp4)
- QuickTime (.mov)
- WebM (.webm)
- Max size: 50MB (configurable)

#### Audio
- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- WebM Audio (.webm)
- Max size: 10MB (configurable)

#### Documents
- PDF (.pdf)
- Word Documents (.doc, .docx)
- Text Files (.txt)
- Max size: 10MB (configurable)

### Configuration

Configure media handling through environment variables:

```bash
# Storage type: 'local' or 's3'
MEDIA_STORAGE_TYPE=local

# Local storage path
MEDIA_LOCAL_PATH=./uploads

# S3 configuration (if using S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_ENDPOINT=https://s3.amazonaws.com  # Optional for S3-compatible services

# File size limits (bytes)
MAX_IMAGE_SIZE=5242880    # 5MB
MAX_VIDEO_SIZE=52428800   # 50MB
MAX_AUDIO_SIZE=10485760   # 10MB
MAX_DOCUMENT_SIZE=10485760 # 10MB

# Thumbnail settings
THUMBNAIL_WIDTH=300
THUMBNAIL_HEIGHT=300
THUMBNAIL_QUALITY=80
VIDEO_THUMBNAIL_WIDTH=300
VIDEO_THUMBNAIL_HEIGHT=300
VIDEO_THUMBNAIL_TIME=1    # Seconds into video for thumbnail
```

### API Endpoints

#### Upload Single File
```
POST /api/media/upload
Content-Type: multipart/form-data

Body: file (form field)
```

#### Upload Multiple Files
```
POST /api/media/upload/multiple
Content-Type: multipart/form-data

Body: files[] (form field array)
```

#### Get Media URL
```
GET /api/media/:mediaId/url
```

#### Get Media Information
```
GET /api/media/:mediaId/info
```

#### List User Media
```
GET /api/media/list?type=image&limit=50&offset=0
```

#### Delete Media
```
DELETE /api/media/:mediaId
```

#### Stream Media (Local Storage Only)
```
GET /api/media/:userId/:mediaId
```

### Usage Example

```typescript
import { mediaService } from '../services/media';

// Upload a file
const uploadResponse = await mediaService.uploadMedia({
  file: req.file, // Multer file object
  userId: 'user-123'
});

// Get media information
const mediaInfo = await mediaService.getMediaInfo('media-456', 'user-123');

// Delete media
await mediaService.deleteMedia('media-456', 'user-123');
```

### Database Schema

The media service uses a `media_files` table to track uploaded files:

```sql
CREATE TABLE media_files (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  original_name VARCHAR(255),
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  storage_type VARCHAR(20),
  storage_path TEXT,
  thumbnail_path TEXT,
  media_type VARCHAR(20),
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Security Considerations

- All media access is user-scoped (users can only access their own files)
- File type validation prevents malicious uploads
- File size limits prevent abuse
- S3 signed URLs provide temporary access to cloud-stored files
- Local files are served through authenticated endpoints

### Dependencies

- `aws-sdk`: S3 integration
- `sharp`: Image processing and thumbnail generation
- `fluent-ffmpeg`: Video thumbnail generation
- `multer`: File upload handling
- `mime-types`: MIME type detection