import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Card,
  CardMedia,
  Fade,
  Grow,
  Tooltip,
  Avatar,
  Chip,
} from '@mui/material';
import {
  MoreVert,
  Reply,
  Forward,
  Delete,
  Edit,
  Copy,
  Download,
  PlayArrow,
  Pause,
  VolumeUp,
  Image as ImageIcon,
  VideoLibrary,
  AttachFile,
} from '@mui/icons-material';
import { Message } from '../store/chatStore';
import MessageReactions from './MessageReactions';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderAvatar?: string;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  currentUserId: string;
  isConsecutive?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  senderName,
  senderAvatar,
  onReply,
  onForward,
  onDelete,
  onEdit,
  onReaction,
  onRemoveReaction,
  currentUserId,
  isConsecutive = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setMenuAnchor(null);
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getMessageStatusIcon = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return <span style={{ color: '#00a884' }}>✓✓</span>;
      default:
        return '⏱️';
    }
  };

  const renderMediaContent = () => {
    if (!message.mediaUrl) return null;

    switch (message.type) {
      case 'image':
        return (
          <Card 
            sx={{ 
              maxWidth: 300, 
              mb: message.text ? 1 : 0,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <CardMedia
              component="img"
              image={message.mediaUrl}
              alt="Shared image"
              sx={{ 
                maxHeight: 200, 
                objectFit: 'cover',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            />
          </Card>
        );

      case 'video':
        return (
          <Card 
            sx={{ 
              maxWidth: 300, 
              mb: message.text ? 1 : 0,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <CardMedia
              component="video"
              src={message.mediaUrl}
              controls
              sx={{ maxHeight: 200 }}
            />
          </Card>
        );

      case 'audio':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              minWidth: 200,
              p: 1,
              bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 2,
              mb: message.text ? 1 : 0,
            }}
          >
            <IconButton 
              size="small" 
              onClick={handlePlayAudio}
              sx={{ 
                bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'primary.main',
                color: isOwn ? 'inherit' : 'white',
                '&:hover': {
                  bgcolor: isOwn ? 'rgba(255,255,255,0.3)' : 'primary.dark',
                },
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VolumeUp sx={{ fontSize: '1rem', opacity: 0.7 }} />
                <Typography variant="caption">
                  Voice message
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 3,
                  bgcolor: isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
                  borderRadius: 1.5,
                  mt: 0.5,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: isPlaying ? '60%' : '0%',
                    bgcolor: isOwn ? 'rgba(255,255,255,0.8)' : 'primary.main',
                    borderRadius: 1.5,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
            
            <audio
              ref={audioRef}
              src={message.mediaUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          </Box>
        );

      case 'document':
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 2,
              mb: message.text ? 1 : 0,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              },
            }}
          >
            <AttachFile sx={{ fontSize: '2rem', opacity: 0.7 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {message.fileName || 'Document'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Click to download
              </Typography>
            </Box>
            <IconButton size="small">
              <Download />
            </IconButton>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
          mb: isConsecutive ? 0.5 : 1,
          px: 1,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar for group chats */}
        {showAvatar && !isOwn && (
          <Avatar
            src={senderAvatar}
            sx={{ 
              width: 32, 
              height: 32, 
              mr: 1,
              alignSelf: 'flex-end',
              opacity: isConsecutive ? 0 : 1,
            }}
          >
            {senderName?.charAt(0)}
          </Avatar>
        )}

        <Box sx={{ position: 'relative', maxWidth: '70%' }}>
          {/* Message Actions */}
          <Fade in={isHovered} timeout={200}>
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                [isOwn ? 'left' : 'right']: -40,
                display: 'flex',
                gap: 0.5,
                zIndex: 1,
              }}
            >
              <Tooltip title="Reply">
                <IconButton
                  size="small"
                  onClick={() => onReply?.(message)}
                  sx={{
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Reply fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Fade>

          {/* Message Bubble */}
          <Grow in={true} timeout={400}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: isOwn 
                  ? '18px 18px 4px 18px' 
                  : '18px 18px 18px 4px',
                bgcolor: isOwn ? '#d9fdd3' : 'background.paper',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                },
              }}
            >
              {/* Sender name for group chats */}
              {!isOwn && senderName && !isConsecutive && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 'medium',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  {senderName}
                </Typography>
              )}

              {/* Reply indicator */}
              {message.replyTo && (
                <Box
                  sx={{
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    pl: 1,
                    mb: 1,
                    bgcolor: 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    p: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Replying to message
                  </Typography>
                </Box>
              )}

              {/* Media content */}
              {renderMediaContent()}

              {/* Text content */}
              {message.text && (
                <Typography 
                  variant="body1" 
                  sx={{ 
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    mb: 0.5,
                  }}
                >
                  {message.text}
                </Typography>
              )}

              {/* Message reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <MessageReactions
                  messageId={message.id}
                  reactions={message.reactions}
                  currentUserId={currentUserId}
                  onAddReaction={onReaction || (() => {})}
                  onRemoveReaction={onRemoveReaction || (() => {})}
                  compact
                />
              )}

              {/* Timestamp and status */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                {message.editedAt && (
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                    edited
                  </Typography>
                )}
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.7,
                    fontSize: '0.7rem',
                  }}
                >
                  {formatTime(message.timestamp)}
                </Typography>
                
                {isOwn && (
                  <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    {getMessageStatusIcon()}
                  </Box>
                )}
              </Box>
            </Box>
          </Grow>
        </Box>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <MenuItem onClick={() => { onReply?.(message); setMenuAnchor(null); }}>
            <Reply fontSize="small" sx={{ mr: 1 }} />
            Reply
          </MenuItem>
          
          <MenuItem onClick={() => { onForward?.(message); setMenuAnchor(null); }}>
            <Forward fontSize="small" sx={{ mr: 1 }} />
            Forward
          </MenuItem>
          
          <MenuItem onClick={handleCopy}>
            <Copy fontSize="small" sx={{ mr: 1 }} />
            Copy
          </MenuItem>
          
          {isOwn && (
            <MenuItem onClick={() => { onEdit?.(message.id, message.text); setMenuAnchor(null); }}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
          )}
          
          {isOwn && (
            <MenuItem 
              onClick={() => { onDelete?.(message.id); setMenuAnchor(null); }}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Fade>
  );
};

export default MessageBubble;