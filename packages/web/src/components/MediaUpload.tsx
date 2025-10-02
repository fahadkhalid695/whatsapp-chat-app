import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Grid,
  Card,
  CardMedia,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  PhotoCamera,
  VideoCall,
  AttachFile,
  Send,
  Delete,
} from '@mui/icons-material';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'document';
}

interface MediaUploadProps {
  open: boolean;
  onClose: () => void;
  onSend: (files: MediaFile[], caption: string) => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ open, onClose, onSend }) => {
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach((file) => {
      const mediaFile: MediaFile = {
        id: Date.now().toString() + Math.random(),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'document',
      };
      
      setSelectedFiles(prev => [...prev, mediaFile]);
    });
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleSend = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onSend(selectedFiles, caption);
    
    // Cleanup
    selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setSelectedFiles([]);
    setCaption('');
    setUploading(false);
    onClose();
  };

  const handleClose = () => {
    selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setSelectedFiles([]);
    setCaption('');
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Share Media</Typography>
        <IconButton onClick={handleClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {selectedFiles.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              border: '2px dashed #e0e0e0',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoCamera sx={{ fontSize: 48, color: '#25D366', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Select files to share
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Choose photos, videos, or documents from your device
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Photos & Videos
              </Button>
              <Button
                variant="outlined"
                startIcon={<AttachFile />}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Documents
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {selectedFiles.map((file) => (
                <Grid item xs={12} sm={6} md={4} key={file.id}>
                  <Card sx={{ position: 'relative' }}>
                    {file.type === 'image' && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={file.preview}
                        alt={file.file.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    {file.type === 'video' && (
                      <CardMedia
                        component="video"
                        height="200"
                        src={file.preview}
                        controls
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    {file.type === 'document' && (
                      <Box
                        sx={{
                          height: 200,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#f5f5f5',
                        }}
                      >
                        <AttachFile sx={{ fontSize: 48, color: '#666' }} />
                        <Typography variant="body2" textAlign="center" sx={{ mt: 1, px: 1 }}>
                          {file.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.file.size)}
                        </Typography>
                      </Box>
                    )}
                    
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                      size="small"
                      onClick={() => removeFile(file.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mb: 2 }}
            >
              Add More Files
            </Button>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Uploading files...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={handleSend}
          disabled={selectedFiles.length === 0 || uploading}
          sx={{
            background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
          }}
        >
          Send {selectedFiles.length > 0 && `(${selectedFiles.length})`}
        </Button>
      </DialogActions>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Dialog>
  );
};

export default MediaUpload;