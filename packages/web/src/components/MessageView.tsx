import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MessageBubble from './MessageBubble';
import SimpleMessageList from './SimpleMessageList';
import NetworkAwareLoader from './NetworkAwareLoader';
import { Conversation, Message } from '../types';
import { useAuthStore } from '../store/authStore';
import useNetworkStatus from '../hooks/useNetworkStatus';

interface MessageViewProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

const MessageView: React.FC<MessageViewProps> = ({
  conversation,
  messages,
  isLoading,
  onLoadMore,
  hasMore = false,
  hasError = false,
  onRetry,
}) => {
  const { user } = useAuthStore();
  const { isSlowConnection } = useNetworkStatus();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [containerHeight, setContainerHeight] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use virtual scrolling for large message lists or slow connections
  const useVirtualScrolling = messages.length > 100 || isSlowConnection;

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const shouldShowAvatar = (message: Message, index: number): boolean => {
    if (message.senderId === user?.id) return false;
    
    const nextMessage = messages[index + 1];
    return !nextMessage || nextMessage.senderId !== message.senderId;
  };

  const shouldShowTimestamp = (message: Message, index: number): boolean => {
    const prevMessage = messages[index - 1];
    if (!prevMessage) return true;
    
    const timeDiff = new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (!conversation) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        sx={{ backgroundColor: 'background.default' }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Select a conversation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a conversation from the list to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        backgroundColor: 'background.default',
        backgroundImage: isMobile 
          ? 'none' 
          : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NetworkAwareLoader
        isLoading={isLoading}
        hasError={hasError}
        onRetry={onRetry}
        loadingText="Loading messages..."
        errorText="Failed to load messages"
      >
        {useVirtualScrolling ? (
          <SimpleMessageList
            messages={messages}
            height={containerHeight}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              py: 1,
            }}
          >
            {messages.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No messages yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Send a message to start the conversation
                </Typography>
              </Box>
            ) : (
              <>
                {groupMessagesByDate(messages).map((group, groupIndex) => (
                  <Box key={groupIndex}>
                    {/* Date header */}
                    <Box display="flex" justifyContent="center" my={2}>
                      <Typography
                        variant="caption"
                        sx={{
                          backgroundColor: 'background.paper',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          color: 'text.secondary',
                        }}
                      >
                        {formatDateHeader(group.date)}
                      </Typography>
                    </Box>

                    {/* Messages for this date */}
                    {group.messages.map((message, index) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === user?.id}
                        showTimestamp={shouldShowTimestamp(message, index)}
                        showAvatar={shouldShowAvatar(message, index)}
                      />
                    ))}
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}
      </NetworkAwareLoader>
    </Box>
  );
};

export default MessageView;