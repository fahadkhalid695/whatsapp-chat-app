import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Toolbar,
  Fade,
} from '@mui/material';
import {
  Close,
  ArrowBackIos,
  ArrowForwardIos,
  Download,
  Share,
  Delete,
} from '@mui/icons-material';
import { Message } from '../types';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  message: Message;
}

interface MediaGalleryProps {
  open: boolean;
  mediaItems: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  open,
  mediaItems,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (showControls) {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [showControls]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
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
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const currentItem = mediaItems[currentIndex];

  if (!currentItem) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'black',
          color: 'white',
        },
      }}
      onKeyDown={handleKeyDown}
    >
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header Controls */}
        <Fade in={showControls}>
          <Toolbar
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={onClose} sx={{ color: 'white', mr: 2 }}>
                <Close />
              </IconButton>
              <Box>
                <Typography variant="subtitle1">
                  {currentItem.message.senderId === 'currentUser' ? 'You' : 'Contact Name'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.300' }}>
                  {formatDate(currentItem.message.timestamp)}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2">
              {currentIndex + 1} of {mediaItems.length}
            </Typography>
          </Toolbar>
        </Fade>

        {/* Media Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={toggleControls}
        >
          {currentItem.type === 'image' ? (
            <Box
              component="img"
              src={currentItem.uri}
              alt="Media"
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <Box
              component="video"
              src={currentItem.uri}
              controls={showControls}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}

          {/* Navigation Arrows */}
          {showControls && mediaItems.length > 1 && (
            <>
              {currentIndex > 0 && (
                <Fade in={showControls}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevious();
                    }}
                    sx={{
                      position: 'absolute',
                      left: 16,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                      },
                    }}
                  >
                    <ArrowBackIos />
                  </IconButton>
                </Fade>
              )}
              {currentIndex < mediaItems.length - 1 && (
                <Fade in={showControls}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    sx={{
                      position: 'absolute',
                      right: 16,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                      },
                    }}
                  >
                    <ArrowForwardIos />
                  </IconButton>
                </Fade>
              )}
            </>
          )}
        </Box>

        {/* Bottom Controls */}
        <Fade in={showControls}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2,
            }}
          >
            <IconButton sx={{ color: 'white', mx: 1 }}>
              <Share />
            </IconButton>
            <IconButton sx={{ color: 'white', mx: 1 }}>
              <Download />
            </IconButton>
            <IconButton sx={{ color: 'white', mx: 1 }}>
              <Delete />
            </IconButton>
          </Box>
        </Fade>
      </DialogContent>
    </Dialog>
  );
};

export default MediaGallery;