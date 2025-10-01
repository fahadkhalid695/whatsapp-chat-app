import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Close, Send, Description } from '@mui/icons-material';

interface MediaPreviewProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSend: (file: File, caption?: string) => Promise<void>;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  open,
  file,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleSend = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      await onSend(file, caption.trim() || undefined);
      setCaption('');
      onClose();
    } catch (error) {
      console.error('Failed to send media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMediaType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const renderMediaContent = () => {
    if (!file || !previewUrl) return null;

    const mediaType = getMediaType(file);

    switch (mediaType) {
      case 'image':
        return (
          <Box
            component="img"
            src={previewUrl}
            alt="Preview"
            sx={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        );
      case 'video':
        return (
          <Box
            component="video"
            src={previewUrl}
            controls
            sx={{
              maxWidth: '100%',
              maxHeight: '60vh',
              borderRadius: 1,
            }}
          />
        );
      case 'document':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 4,
              bgcolor: 'grey.100',
              borderRadius: 2,
              minWidth: 200,
            }}
          >
            <Description sx={{ fontSize: 64, color: 'grey.600', mb: 2 }} />
            <Typography variant="h6" align="center" gutterBottom>
              {file.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(file.size)}
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          minHeight: '50vh',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">
          {file ? (
            getMediaType(file) === 'image' ? 'Photo' :
            getMediaType(file) === 'video' ? 'Video' : 'Document'
          ) : 'Media Preview'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* Media Content */}
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          p: 3,
        }}
      >
        {renderMediaContent()}
      </DialogContent>

      {/* Caption Input and Actions */}
      <DialogActions
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          p: 2,
          gap: 2,
        }}
      >
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          variant="outlined"
          size="small"
          inputProps={{ maxLength: 1000 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={isLoading || !file}
            startIcon={isLoading ? <CircularProgress size={16} /> : <Send />}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default MediaPreview;