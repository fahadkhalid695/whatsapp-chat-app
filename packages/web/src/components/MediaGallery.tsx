import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Avatar,
  Chip,
  Fade,
  Zoom,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Close,
  ArrowBack,
  ArrowForward,
  Download,
  Share,
  Delete,
  ZoomIn,
  ZoomOut,
  PlayArrow,
  Pause,
  VolumeUp,
} from '@mui/icons-material';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
  timestamp: Date;
  sender?: string;
  senderAvatar?: string;
}

interface MediaGalleryProps {
  open: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex?: number;
  onDownload?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  open,
  onClose,
  mediaItems,
  initialIndex = 0,
  onDownload,
  onShare,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const currentItem = mediaItems[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setIsPlaying(false);
    }
  }, [open]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(1);
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoom(1);
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        setZoom(prev => Math.min(prev + 0.25, 3));
        break;
      case '-':
        setZoom(prev => Math.max(prev - 0.25, 0.5));
        break;
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, currentIndex]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMediaContent = () => {
    if (!currentItem) return null;

    switch (currentItem.type) {
      case 'image':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              cursor: zoom > 1 ? 'grab' : 'zoom-in',
            }}
            onClick={() => setShowControls(!showControls)}
          >
            <img
              src={currentItem.url}
              alt={currentItem.caption || 'Media'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>
        );

      case 'video':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <video
              src={currentItem.url}
              controls
              autoPlay={isPlaying}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </Box>
        );

      case 'audio':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              gap: 4,
            }}
          >
            <Box
              sx={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isPlaying ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            >
              <VolumeUp sx={{ fontSize: 80, color: 'white' }} />
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Audio Message
              </Typography>
              <audio
                src={currentItem.url}
                controls
                autoPlay={isPlaying}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ width: '300px' }}
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (!open || !currentItem) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
        onMouseMove={() => setShowControls(true)}
      >
        {/* Header */}
        <Fade in={showControls} timeout={300}>
          <Paper
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              bgcolor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {currentItem.senderAvatar && (
                  <Avatar src={currentItem.senderAvatar} sx={{ width: 32, height: 32 }}>
                    {currentItem.sender?.charAt(0)}
                  </Avatar>
                )}
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {currentItem.sender || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {formatTimestamp(currentItem.timestamp)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${currentIndex + 1} of ${mediaItems.length}`}
                size="small"
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
              
              {currentItem.type === 'image' && (
                <>
                  <Tooltip title="Zoom In">
                    <IconButton
                      onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                      sx={{ color: 'white' }}
                      disabled={zoom >= 3}
                    >
                      <ZoomIn />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Zoom Out">
                    <IconButton
                      onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                      sx={{ color: 'white' }}
                      disabled={zoom <= 0.5}
                    >
                      <ZoomOut />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {onDownload && (
                <Tooltip title="Download">
                  <IconButton
                    onClick={() => onDownload(currentItem)}
                    sx={{ color: 'white' }}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
              )}

              {onShare && (
                <Tooltip title="Share">
                  <IconButton
                    onClick={() => onShare(currentItem)}
                    sx={{ color: 'white' }}
                  >
                    <Share />
                  </IconButton>
                </Tooltip>
              )}

              {onDelete && (
                <Tooltip title="Delete">
                  <IconButton
                    onClick={() => onDelete(currentItem)}
                    sx={{ color: 'error.light' }}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Paper>
        </Fade>

        {/* Media Content */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {renderMediaContent()}

          {/* Navigation Arrows */}
          {mediaItems.length > 1 && (
            <>
              <Fade in={showControls && currentIndex > 0} timeout={300}>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ArrowBack />
                </IconButton>
              </Fade>

              <Fade in={showControls && currentIndex < mediaItems.length - 1} timeout={300}>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ArrowForward />
                </IconButton>
              </Fade>
            </>
          )}
        </Box>

        {/* Caption */}
        {currentItem.caption && (
          <Fade in={showControls} timeout={300}>
            <Paper
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                p: 2,
              }}
            >
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                {currentItem.caption}
              </Typography>
            </Paper>
          </Fade>
        )}

        {/* Thumbnail Strip */}
        {mediaItems.length > 1 && (
          <Fade in={showControls} timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                bottom: currentItem.caption ? 80 : 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                p: 1,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 2,
                maxWidth: '80%',
                overflow: 'auto',
              }}
            >
              {mediaItems.map((item, index) => (
                <Box
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: index === currentIndex ? '2px solid #25D366' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        bgcolor: 'rgba(37, 211, 102, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.type === 'video' ? <PlayArrow /> : <VolumeUp />}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Fade>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaGallery;