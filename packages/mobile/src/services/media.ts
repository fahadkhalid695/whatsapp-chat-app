import { apiClient } from './api';

interface MediaUploadResponse {
  mediaId: string;
  url: string;
  thumbnailUrl?: string;
}

class MediaService {
  async uploadMedia(uri: string, type: 'image' | 'video' | 'document', fileName?: string): Promise<MediaUploadResponse> {
    const formData = new FormData();
    
    formData.append('media', {
      uri,
      type: type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'application/octet-stream',
      name: fileName || `${type}_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'bin'}`,
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