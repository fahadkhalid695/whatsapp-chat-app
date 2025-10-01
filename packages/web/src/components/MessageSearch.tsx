import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as DocumentIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { Message, MessageType } from '../types';
import { searchMessages, searchInConversation, getMediaMessages } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface MessageSearchProps {
  conversationId?: string;
  onMessageSelect?: (message: Message) => void;
  onClose?: () => void;
}

interface SearchFilters {
  mediaType?: string;
  conversationId?: string;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  conversationId,
  onMessageSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    conversationId,
  });
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: SearchFilters,
    searchOffset: number = 0,
    append: boolean = false
  ) => {
    if (!searchQuery.trim() && !searchFilters.mediaType) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (searchFilters.mediaType === 'media' || 
          ['image', 'video', 'audio', 'document'].includes(searchFilters.mediaType || '')) {
        // Use media search endpoint
        response = await getMediaMessages({
          conversationId: searchFilters.conversationId,
          mediaTypes: searchFilters.mediaType === 'media' 
            ? undefined 
            : [searchFilters.mediaType as MessageType],
          limit: 20,
          offset: searchOffset,
        });
      } else if (searchFilters.conversationId) {
        // Search within conversation
        response = await searchInConversation(
          searchFilters.conversationId,
          searchQuery,
          searchFilters.mediaType,
          20,
          searchOffset
        );
      } else {
        // Global search
        response = await searchMessages(
          searchQuery,
          searchFilters.conversationId,
          searchFilters.mediaType,
          20,
          searchOffset
        );
      }

      if (response.success) {
        const newResults = append ? [...results, ...response.data] : response.data;
        setResults(newResults);
        setTotal(response.pagination.total);
        setHasMore(response.pagination.hasMore);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [results]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setOffset(0);
      performSearch(query, filters, 0, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, performSearch]);

  const handleLoadMore = () => {
    const newOffset = offset + 20;
    setOffset(newOffset);
    performSearch(query, filters, newOffset, true);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setOffset(0);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value || undefined,
    }));
    setOffset(0);
  };

  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'image':
        return <ImageIcon color="primary" />;
      case 'video':
        return <VideoIcon color="primary" />;
      case 'audio':
        return <AudioIcon color="primary" />;
      case 'document':
        return <DocumentIcon color="primary" />;
      default:
        return <MessageIcon color="primary" />;
    }
  };

  const getMessagePreview = (message: Message) => {
    if (message.type === 'text' && message.content.text) {
      return message.content.text.length > 100
        ? `${message.content.text.substring(0, 100)}...`
        : message.content.text;
    } else if (message.content.fileName) {
      return message.content.fileName;
    } else {
      return `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} message`;
    }
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '0 2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder={conversationId ? "Search in conversation..." : "Search messages..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {onClose && (
            <IconButton onClick={onClose}>
              <ClearIcon />
            </IconButton>
          )}
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.mediaType || ''}
              onChange={(e) => handleFilterChange('mediaType', e.target.value)}
              label="Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="media">Media</MenuItem>
              <MenuItem value="image">Images</MenuItem>
              <MenuItem value="video">Videos</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="document">Documents</MenuItem>
            </Select>
          </FormControl>

          {filters.mediaType && (
            <Chip
              label={`Type: ${filters.mediaType}`}
              onDelete={() => handleFilterChange('mediaType', '')}
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Search Results */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && results.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && results.length === 0 && (query || filters.mediaType) && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No messages found
            </Typography>
          </Box>
        )}

        {!loading && results.length === 0 && !query && !filters.mediaType && (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Enter a search term or select a filter to find messages
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                {total} message{total !== 1 ? 's' : ''} found
              </Typography>
            </Box>

            <List>
              {results.map((message, index) => (
                <React.Fragment key={message.id}>
                  <ListItem
                    button
                    onClick={() => onMessageSelect?.(message)}
                    sx={{ alignItems: 'flex-start' }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getMessageIcon(message.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2" component="div">
                            {highlightText(getMessagePreview(message), query)}
                          </Typography>
                          {(message as any).searchContext && (
                            <Typography variant="caption" color="text.secondary">
                              {(message as any).searchContext.conversationType === 'group' 
                                ? (message as any).searchContext.conversationName 
                                : (message as any).searchContext.senderName}
                              {' • '}
                              {(message as any).searchContext.senderName}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < results.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {hasMore && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default MessageSearch;