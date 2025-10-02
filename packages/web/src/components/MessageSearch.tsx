import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Search,
  Close,
  Image,
  VideoLibrary,
  AudioFile,
  AttachFile,
} from '@mui/icons-material';
import { useChatStore, Message } from '../store/chatStore';

interface MessageSearchProps {
  open: boolean;
  onClose: () => void;
  onMessageSelect: (conversationId: string, messageId: string) => void;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  open,
  onClose,
  onMessageSelect,
}) => {
  const { conversations } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    message: Message;
    conversationId: string;
    contactName: string;
  }[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'text' | 'image' | 'video' | 'audio' | 'document'>('all');

  useEffect(() => {
    if (searchQuery.trim()) {
      const results: typeof searchResults = [];
      
      conversations.forEach((conversation) => {
        conversation.messages.forEach((message) => {
          const matchesQuery = message.text.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesFilter = selectedFilter === 'all' || 
                               (selectedFilter === 'text' && (!message.type || message.type === 'text')) ||
                               (selectedFilter !== 'text' && message.type === selectedFilter);
          
          if (matchesQuery && matchesFilter) {
            results.push({
              message,
              conversationId: conversation.id,
              contactName: conversation.contact.name,
            });
          }
        });
      });
      
      // Sort by timestamp (newest first)
      results.sort((a, b) => b.message.timestamp.getTime() - a.message.timestamp.getTime());
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedFilter, conversations]);

  const handleMessageClick = (conversationId: string, messageId: string) => {
    onMessageSelect(conversationId, messageId);
    onClose();
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

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'image':
        return <Image fontSize="small" />;
      case 'video':
        return <VideoLibrary fontSize="small" />;
      case 'audio':
        return <AudioFile fontSize="small" />;
      case 'document':
        return <AttachFile fontSize="small" />;
      default:
        return null;
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Search Messages</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="Search in messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Filter Chips */}
        <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: '1px solid #e0e0e0' }}>
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'text', label: 'Text', icon: null },
            { key: 'image', label: 'Images', icon: <Image fontSize="small" /> },
            { key: 'video', label: 'Videos', icon: <VideoLibrary fontSize="small" /> },
            { key: 'audio', label: 'Audio', icon: <AudioFile fontSize="small" /> },
            { key: 'document', label: 'Documents', icon: <AttachFile fontSize="small" /> },
          ].map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              icon={filter.icon}
              onClick={() => setSelectedFilter(filter.key as any)}
              variant={selectedFilter === filter.key ? 'filled' : 'outlined'}
              color={selectedFilter === filter.key ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>

        {/* Search Results */}
        <Box sx={{ height: 'calc(100% - 140px)', overflow: 'auto' }}>
          {searchQuery.trim() === '' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <Search sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Search Messages
              </Typography>
              <Typography variant="body2" textAlign="center">
                Type in the search box to find messages across all conversations
              </Typography>
            </Box>
          ) : searchResults.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary',
              }}
            >
              <Typography variant="h6" gutterBottom>
                No messages found
              </Typography>
              <Typography variant="body2">
                Try different keywords or check your spelling
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {searchResults.map((result, index) => (
                <React.Fragment key={`${result.conversationId}-${result.message.id}`}>
                  <ListItem
                    button
                    onClick={() => handleMessageClick(result.conversationId, result.message.id)}
                    sx={{
                      py: 2,
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                      },
                    }}
                  >
                    <Avatar
                      src={conversations.find(c => c.id === result.conversationId)?.contact.avatar}
                      sx={{ mr: 2 }}
                    >
                      {result.contactName.charAt(0)}
                    </Avatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {result.contactName}
                          </Typography>
                          {getMessageTypeIcon(result.message.type)}
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(result.message.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {highlightText(result.message.text, searchQuery)}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < searchResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default MessageSearch;