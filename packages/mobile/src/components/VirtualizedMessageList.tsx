import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MessageBubble from './MessageBubble';
import { Message } from '../types';

interface VirtualizedMessageListProps {
  messages: Message[];
  userId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');
const isTablet = Dimensions.get('window').width >= 768;

const ITEM_HEIGHT = isTablet ? 100 : 80;
const INITIAL_NUM_TO_RENDER = isTablet ? 15 : 10;
const MAX_TO_RENDER_PER_BATCH = isTablet ? 10 : 5;
const WINDOW_SIZE = isTablet ? 10 : 5;

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  userId,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onRefresh,
  refreshing = false,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  const shouldShowAvatar = useCallback((message: Message, index: number): boolean => {
    if (message.senderId === userId) return false;
    
    const nextMessage = messages[index + 1];
    return !nextMessage || nextMessage.senderId !== message.senderId;
  }, [messages, userId]);

  const shouldShowTimestamp = useCallback((index: number): boolean => {
    const message = messages[index];
    const prevMessage = messages[index - 1];
    
    if (!prevMessage) return true;
    
    const timeDiff = new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }, [messages]);

  const renderMessage = useCallback(({ item: message, index }: { item: Message; index: number }) => {
    return (
      <View style={styles.messageContainer}>
        <MessageBubble
          message={message}
          isOwn={message.senderId === userId}
          showTimestamp={shouldShowTimestamp(index)}
          showAvatar={shouldShowAvatar(message, index)}
        />
      </View>
    );
  }, [userId, shouldShowAvatar, shouldShowTimestamp]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMore && onLoadMore) {
      setIsLoadingMore(true);
      onLoadMore();
      
      // Reset loading state after a delay
      setTimeout(() => setIsLoadingMore(false), 1000);
    }
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#25D366" />
        <Text style={styles.loadingText}>Loading more messages...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
    </View>
  ), []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (messages.length === 0) {
    return renderEmpty();
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
        windowSize={WINDOW_SIZE}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#25D366']}
              tintColor="#25D366"
            />
          ) : undefined
        }
        style={styles.flatList}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        updateCellsBatchingPeriod={50}
        legacyImplementation={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: isTablet ? 16 : 8,
  },
  messageContainer: {
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 4 : 2,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isTablet ? 20 : 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: isTablet ? 14 : 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 32,
  },
  emptyTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: isTablet ? 12 : 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: isTablet ? 24 : 20,
  },
});

export default VirtualizedMessageList;