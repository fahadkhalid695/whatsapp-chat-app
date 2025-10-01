import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Done,
  DoneAll,
  PlayArrow,
  GetApp,
  Image as ImageIcon,
} from '@mui/icons-material';
import { Message } from '../types';
import { useAuthStore } from '../store/authStore';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp: boolean;
  showAvatar: boolean;
  onMediaClick?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showTimestamp,
  showAvatar,
  onMediaClick,
}) => {
  const { user } = useAuthStore();

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDeliveryStatus = () => {
    if (!isOwn) return null;
    
    if (message.readBy.length > 0) {
      return <DoneAll sx={{ fontSize: 16, color: 'primary.main' }} />;
    } else if (message.deliveredTo.length > 0) {
      return <DoneAll sx={{ fontSize: 16, color: 'text.secondary' }} />;
    } else {
      return <Done sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  };

  const renderMediaContent = () => {
    const { content } = message;
    
    if (message.type === 'image') {
      return (
        <Box>
          {content.mediaUrl ? (
            <img
              src={content.mediaUrl}
              alt="Shared image"
              style={{
                maxWidth: '300px',
                maxHeight: '300px',
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                display: 'block',
                cursor: 'pointer',
              }}
              onClick={() => onMediaClick?.(message)}
            />
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 200,
                height: 150,
                backgroundColor: 'grey.200',
                borderRadius: 1,
              }}
            >
              <ImageIcon sx={{ fontSize: 48, color: 'grey.500' }} />
            </Box>
          )}
          {content.text && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {content.text}
            </Typography>
          )}
        </Box>
      );
    }
    
    if (message.type === 'video') {
      return (
        <Box>
          <Box
            position="relative"
            sx={{
              width: 300,
              height: 200,
              backgroundColor: 'grey.900',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onMediaClick?.(message)}
          >
            {content.thumbnailUrl ? (
              <img
                src={content.thumbnailUrl}
                alt="Video thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            ) : null}
            <IconButton
              sx={{
                position: 'absolute',
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.7)',
                },
              }}
            >
              <PlayArrow sx={{ fontSize: 32 }} />
            </IconButton>
          </Box>
          {content.text && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {content.text}
            </Typography>
          )}
        </Box>
      );
    }
    
    if (message.type === 'document') {
      return (
        <Box
          display="flex"
          alignItems="center"
          sx={{
            p: 2,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            minWidth: 200,
          }}
        >
          <Box flexGrow={1}>
            <Typography variant="body2" fontWeight="medium">
              {content.fileName || 'Document'}
            </Typography>
            {content.fileSize && (
              <Typography variant="caption" color="text.secondary">
                {(content.fileSize / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>
          <IconButton size="small">
            <GetApp />
          </IconButton>
        </Box>
      );
    }
    
    if (message.type === 'audio') {
      return (
        <Box
          display="flex"
          alignItems="center"
          sx={{
            p: 2,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            minWidth: 200,
          }}
        >
          <IconButton size="small">
            <PlayArrow />
          </IconButton>
          <Box
            sx={{
              flexGrow: 1,
              height: 4,
              backgroundColor: 'grey.300',
              borderRadius: 2,
              mx: 2,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            0:30
          </Typography>
        </Box>
      );
    }
    
    return null;
  };

  return (
    <Box
      display="flex"
      justifyContent={isOwn ? 'flex-end' : 'flex-start'}
      mb={1}
      sx={{ px: 1 }}
    >
      {!isOwn && showAvatar && (
        <Avatar sx={{ width: 32, height: 32, mr: 1, alignSelf: 'flex-end' }}>
          {message.senderId.slice(-2).toUpperCase()}
        </Avatar>
      )}
      
      <Box maxWidth="70%">
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            backgroundColor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            borderBottomRightRadius: isOwn ? 4 : 16,
            borderBottomLeftRadius: isOwn ? 16 : 4,
          }}
        >
          {message.type === 'text' ? (
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {message.content.text}
            </Typography>
          ) : (
            renderMediaContent()
          )}
          
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            mt={0.5}
            gap={0.5}
          >
            {showTimestamp && (
              <Typography
                variant="caption"
                sx={{
                  color: isOwn ? 'primary.contrastText' : 'text.secondary',
                  opacity: 0.7,
                }}
              >
                {formatTime(message.timestamp)}
              </Typography>
            )}
            {getDeliveryStatus()}
          </Box>
        </Paper>
        
        {message.editedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1, fontStyle: 'italic' }}
          >
            edited
          </Typography>
        )}
      </Box>
      
      {isOwn && showAvatar && (
        <Avatar sx={{ width: 32, height: 32, ml: 1, alignSelf: 'flex-end' }}>
          {user?.displayName?.[0]?.toUpperCase() || 'U'}
        </Avatar>
      )}
    </Box>
  );
};

export default MessageBubble;