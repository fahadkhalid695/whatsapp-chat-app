import { apiClient } from './api';

interface MediaUploadResponse {
  mediaId: string;
  url: string;
  thumbnailUrl?: string;
}

class MediaService {
  async uploadMedia(uri: string, type: 'image' | 'video' | 'document', fileName?: string): Promise<MediaUploadResponse> {
    const formData = new FormData();
    
    // Determine MIME type based on file type and extension
    let mimeType = 'application/octet-stream';
    let defaultFileName = `${type}_${Date.now()}`;
    
    if (type === 'image') {
      mimeType = 'image/jpeg';
      defaultFileName += '.jpg';
    } else if (type === 'video') {
      mimeType = 'video/mp4';
      defaultFileName += '.mp4';
    } else if (fileName) {
      // Try to determine MIME type from file extension
      const extension = fileName.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'doc':
          mimeType = 'application/msword';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          mimeType = 'text/plain';
          break;
        case 'zip':
          mimeType = 'application/zip';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'mp4':
          mimeType = 'video/mp4';
          break;
        case 'mov':
          mimeType = 'video/quicktime';
          break;
      }
    }
    
    formData.append('media', {
      uri,
      type: mimeType,
      name: fileName || defaultFileName,
    } as any);

    const response = await apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const response = await apiClient.get(`/media/${mediaId}`);
    return response.data.url;
  }

  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/media/${mediaId}`);
  }
}

export const mediaService = new MediaService();