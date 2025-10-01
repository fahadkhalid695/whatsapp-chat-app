import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  const [showFilters, setShowFilters] = useState(false);

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
      Alert.alert('Error', 'Failed to search messages');
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
    if (hasMore && !loading) {
      const newOffset = offset + 20;
      setOffset(newOffset);
      performSearch(query, filters, newOffset, true);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setOffset(0);
  };

  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'videocam';
      case 'audio':
        return 'audiotrack';
      case 'document':
        return 'insert-drive-file';
      default:
        return 'message';
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

  const renderMessageItem = ({ item: message }: { item: Message }) => (
    <TouchableOpacity
      style={styles.messageItem}
      onPress={() => onMessageSelect?.(message)}
    >
      <View style={styles.messageIcon}>
        <Icon name={getMessageIcon(message.type)} size={24} color="#2196F3" />
      </View>
      <View style={styles.messageContent}>
        <Text style={styles.messageText} numberOfLines={2}>
          {getMessagePreview(message)}
        </Text>
        {(message as any).searchContext && (
          <Text style={styles.contextText} numberOfLines={1}>
            {(message as any).searchContext.conversationType === 'group' 
              ? (message as any).searchContext.conversationName 
              : (message as any).searchContext.senderName}
            {' • '}
            {(message as any).searchContext.senderName}
          </Text>
        )}
        <Text style={styles.timestampText}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={conversationId ? "Search in conversation..." : "Search messages..."}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          >
            <Icon name="filter-list" size={24} color={showFilters ? "#2196F3" : "#666"} />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Message Type:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.mediaType || ''}
              onValueChange={(value) => setFilters(prev => ({ ...prev, mediaType: value || undefined }))}
              style={styles.picker}
            >
              <Picker.Item label="All" value="" />
              <Picker.Item label="Text" value="text" />
              <Picker.Item label="Media" value="media" />
              <Picker.Item label="Images" value="image" />
              <Picker.Item label="Videos" value="video" />
              <Picker.Item label="Audio" value="audio" />
              <Picker.Item label="Documents" value="document" />
            </Picker>
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading && results.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {!loading && results.length === 0 && (query || filters.mediaType) && (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No messages found</Text>
          </View>
        )}

        {!loading && results.length === 0 && !query && !filters.mediaType && (
          <View style={styles.emptyContainer}>
            <Icon name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Enter a search term to find messages</Text>
          </View>
        )}

        {results.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {total} message{total !== 1 ? 's' : ''} found
              </Text>
            </View>
            <FlatList
              data={results}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.1}
              ListFooterComponent={renderFooter}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  closeButton: {
    padding: 8,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  picker: {
    height: 50,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  messageItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default MessageSearch;