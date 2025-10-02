import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import * as ReactWindow from 'react-window';
const List = ReactWindow.FixedSizeList;
import { Box, Typography, CircularProgress } from '@mui/material';
import MessageBubble from './MessageBubble';
import { Message } from '../types';
import { useAuthStore } from '../store/authStore';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

interface VirtualizedMessageListProps {
  messages: Message[];
  height: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

interface MessageItemData {
  messages: Message[];
  userId: string;
  shouldShowAvatar: (message: Message, index: number) => boolean;
  shouldShowTimestamp: (message: Message, index: number) => boolean;
}

const ITEM_HEIGHT = 80; // Approximate height per message
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area
const LOAD_MORE_THRESHOLD = 200; // Pixels from top to trigger load more

const MessageItem = React.memo<ListChildComponentProps<MessageItemData>>(({
  index,
  style,
  data,
}) => {
  const { messages, userId, shouldShowAvatar, shouldShowTimestamp } = data;
  const message = messages[index];

  if (!message) return null;

  return (
    <div style={style}>
      <MessageBubble
        message={message}
        isOwn={message.senderId === userId}
        showTimestamp={shouldShowTimestamp(index)}
        showAvatar={shouldShowAvatar(message, index)}
      />
    </div>
  );
}, areEqual);

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  height,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onScrollToMessage,
}) => {
  const { user } = useAuthStore();
  const { isMobile } = useResponsiveLayout();
  const { startRenderMeasurement, endRenderMeasurement } = usePerformanceMonitor();
  
  const listRef = useRef<List>(null);
  const prevMessagesLength = useRef(messages.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  const shouldShowAvatar = useCallback((message: Message, index: number): boolean => {
    if (message.senderId === user?.id) return false;
    
    const nextMessage = messages[index + 1];
    return !nextMessage || nextMessage.senderId !== message.senderId;
  }, [messages, user?.id]);

  const shouldShowTimestamp = useCallback((index: number): boolean => {
    const message = messages[index];
    const prevMessage = messages[index - 1];
    
    if (!prevMessage) return true;
    
    const timeDiff = new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }, [messages]);

  const itemData = useMemo<MessageItemData>(() => ({
    messages,
    userId: user?.id || '',
    shouldShowAvatar,
    shouldShowTimestamp,
  }), [messages, user?.id, shouldShowAvatar, shouldShowTimestamp]);

  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    // Load more messages when scrolled near the top
    if (scrollOffset <= LOAD_MORE_THRESHOLD && hasMore && !isLoading && !isLoadingMore && onLoadMore) {
      setIsLoadingMore(true);
      onLoadMore();
      
      // Reset loading state after a delay
      setTimeout(() => setIsLoadingMore(false), 1000);
    }
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  // Handle scroll to specific message
  useEffect(() => {
    if (onScrollToMessage && scrollToIndex !== null && listRef.current) {
      listRef.current.scrollToItem(scrollToIndex, 'center');
      setScrollToIndex(null);
    }
  }, [scrollToIndex, onScrollToMessage]);

  // Performance monitoring
  useEffect(() => {
    startRenderMeasurement();
    return () => endRenderMeasurement();
  }, [messages.length, startRenderMeasurement, endRenderMeasurement]);

  if (messages.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height={height}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No messages yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Send a message to start the conversation
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      {isLoadingMore && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            p: 1,
            boxShadow: 1,
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
      
      <List
        ref={listRef}
        height={height}
        itemCount={messages.length}
        itemSize={ITEM_HEIGHT}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={OVERSCAN_COUNT}
        style={{
          backgroundColor: 'transparent',
          // Optimize scrolling performance
          willChange: 'transform',
        }}
        // Performance optimizations
        useIsScrolling={true}
        initialScrollOffset={messages.length > 0 ? (messages.length - 1) * ITEM_HEIGHT : 0}
      >
        {MessageItem}
      </List>
    </Box>
  );
};

export default VirtualizedMessageList;