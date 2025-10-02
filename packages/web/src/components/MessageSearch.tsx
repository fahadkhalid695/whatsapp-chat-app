import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Divider,
  Paper,
  Fade,
} from '@mui/material';
import {
  Search,
  Close,
  Image,
  VideoLibrary,
  AudioFile,
  AttachFile,
  ArrowForward,
} from '@mui/icons-material';
import { useChatStore, Message } from '../store/chatStore';

interface MessageSearchProps {
  open: boolean;
  onClose: () => void;
  onMessageSelect: (conversationId: string, messageId: string) => void;
}

interface SearchResult {
  message: Message;
  conversationId: string;
  conversationName: string;
  conversationAvatar: string;
  matchedText: string;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  open,
  onClose,
  onMessageSelect,
}) => {
  const { conversations } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'text' | 'media'>('all');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();

    conversations.forEach((conversation) => {
      conversation.messages.forEach((message) => {
        let matches = false;
        let matchedText = '';

        // Text search
        if (selectedFilter === 'all' || selectedFilter === 'text') {
          if (message.text.toLowerCase().includes(query)) {
            matches = true;
            matchedText = message.text;
          }
        }

        // Media search
        if (selectedFilter === 'all' || selectedFilter === 'media') {
          if (message.type && message.type !== 'text') {
            if (message.fileName?.toLowerCase().includes(query) ||
                message.text.toLowerCase().includes(query)) {
              matches = true;
              matchedText = message.fileName || message.text;
            }
          }
        }

        if (matches) {
          results.push({
            message,
            conversationId: conversation.id,
            conversationName: conversation.contact.name,
            conversationAvatar: conversation.contact.avatar,
            matchedText,
          });
        }
      });
    });

    // Sort by timestamp (newest first)
    return results.sort((a, b) => 
      b.message.timestamp.getTime() - a.message.timestamp.getTime()
    );
  }, [searchQuery, selectedFilter, conversations]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </span>
      ) : part
    );
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image fontSize="small" />;
      case 'video': return <VideoLibrary fontSize="small" />;
      case 'audio': return <AudioFile fontSize="small" />;
      default: return <AttachFile fontSize="small" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">
            Search Messages
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="Search in messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery('')}
                >
                  <Close />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />

        {/* Filter Chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label="All"
            variant={selectedFilter === 'all' ? 'filled' : 'outlined'}
            color={selectedFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedFilter('all')}
            size="small"
          />
          <Chip
            label="Text"
            variant={selectedFilter === 'text' ? 'filled' : 'outlined'}
            color={selectedFilter === 'text' ? 'primary' : 'default'}
            onClick={() => setSelectedFilter('text')}
            size="small"
          />
          <Chip
            label="Media"
            variant={selectedFilter === 'media' ? 'filled' : 'outlined'}
            color={selectedFilter === 'media' ? 'primary' : 'default'}
            onClick={() => setSelectedFilter('media')}
            size="small"
          />
        </Box>

        {/* Results */}
        {searchQuery.trim() ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </Typography>

            {searchResults.length > 0 ? (
              <List sx={{ p: 0 }}>
                {searchResults.map((result, index) => (
                  <Fade key={`${result.conversationId}-${result.message.id}`} in={true} timeout={300 + index * 50}>
                    <Paper
                      sx={{
                        mb: 1,
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => {
                        onMessageSelect(result.conversationId, result.message.id);
                        onClose();
                      }}
                    >
                      <ListItem sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar src={result.conversationAvatar}>
                            {result.conversationName.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {result.conversationName}
                              </Typography>
                              {result.message.type && result.message.type !== 'text' && (
                                <Chip
                                  icon={getMediaIcon(result.message.type)}
                                  label={result.message.type}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mb: 0.5,
                                }}
                              >
                                {highlightText(result.matchedText, searchQuery)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimestamp(result.message.timestamp)} • 
                                {result.message.sender === 'me' ? ' You' : ` ${result.conversationName}`}
                              </Typography>
                            </Box>
                          }
                        />
                        
                        <IconButton size="small" sx={{ color: 'primary.main' }}>
                          <ArrowForward />
                        </IconButton>
                      </ListItem>
                    </Paper>
                  </Fade>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No results found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try different keywords or check your spelling
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Search Messages
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find messages, media, and files across all your conversations
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MessageSearch;