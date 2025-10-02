import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  Chip,
  Fade,
  Zoom,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Add,
  EmojiEmotions,
} from '@mui/icons-material';

interface Reaction {
  emoji: string;
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  compact?: boolean;
}

const quickReactions = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉'];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  compact = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);

  const handleAddReaction = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const userAlreadyReacted = existingReaction?.users.some(u => u.id === currentUserId);

    if (userAlreadyReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
    
    setAnchorEl(null);
  };

  const handleReactionDetails = (event: React.MouseEvent<HTMLElement>, reaction: Reaction) => {
    event.stopPropagation();
    setSelectedReaction(reaction);
    setDetailsAnchor(event.currentTarget);
  };

  const getTotalReactions = () => {
    return reactions.reduce((total, reaction) => total + reaction.users.length, 0);
  };

  const getUserReaction = () => {
    return reactions.find(r => r.users.some(u => u.id === currentUserId));
  };

  if (reactions.length === 0 && compact) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
      {/* Existing Reactions */}
      {reactions.map((reaction, index) => {
        const userReacted = reaction.users.some(u => u.id === currentUserId);
        
        return (
          <Zoom in={true} key={reaction.emoji} style={{ transitionDelay: `${index * 50}ms` }}>
            <Chip
              size="small"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: '0.875rem' }}>{reaction.emoji}</span>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {reaction.users.length}
                  </Typography>
                </Box>
              }
              onClick={(e) => handleReactionDetails(e, reaction)}
              onDoubleClick={() => handleAddReaction(reaction.emoji)}
              variant={userReacted ? 'filled' : 'outlined'}
              color={userReacted ? 'primary' : 'default'}
              sx={{
                height: 24,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                },
                ...(userReacted && {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                }),
              }}
            />
          </Zoom>
        );
      })}

      {/* Add Reaction Button */}
      <Tooltip title="Add reaction" placement="top">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 24,
            height: 24,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
              transform: 'scale(1.1)',
            },
          }}
        >
          <Add sx={{ fontSize: '0.875rem' }} />
        </IconButton>
      </Tooltip>

      {/* Quick Reactions Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {quickReactions.map((emoji, index) => (
            <Fade in={true} key={emoji} style={{ transitionDelay: `${index * 30}ms` }}>
              <IconButton
                onClick={() => handleAddReaction(emoji)}
                sx={{
                  fontSize: '1.25rem',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'scale(1.2)',
                  },
                }}
              >
                {emoji}
              </IconButton>
            </Fade>
          ))}
          
          <IconButton
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <EmojiEmotions />
          </IconButton>
        </Box>
      </Popover>

      {/* Reaction Details Popover */}
      <Popover
        open={Boolean(detailsAnchor)}
        anchorEl={detailsAnchor}
        onClose={() => setDetailsAnchor(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: 250,
            maxHeight: 300,
          },
        }}
      >
        {selectedReaction && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
                {selectedReaction.emoji}
              </Typography>
              <Typography variant="subtitle2">
                {selectedReaction.users.length} {selectedReaction.users.length === 1 ? 'person' : 'people'}
              </Typography>
            </Box>
            
            <List dense sx={{ p: 0 }}>
              {selectedReaction.users.map((user) => (
                <ListItem key={user.id} sx={{ px: 0, py: 0.5 }}>
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <Avatar
                      src={user.avatar}
                      sx={{ width: 28, height: 28, fontSize: '0.875rem' }}
                    >
                      {user.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: user.id === currentUserId ? 'medium' : 'normal',
                    }}
                  />
                  {user.id === currentUserId && (
                    <Typography variant="caption" color="primary">
                      You
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default MessageReactions;