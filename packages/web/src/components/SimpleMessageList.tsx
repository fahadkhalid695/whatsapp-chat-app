import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import MessageBubble from './MessageBubble';
import { Message } from '../types';

export interface SimpleMessageListProps {
  messages: Message[];
  height: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const SimpleMessageList: React.FC<SimpleMessageListProps> = ({
  messages,
  height,
  onLoadMore,
  hasMore,
  isLoading
}) => {
  return (
    <Box
      sx={{
        height,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1
      }}
    >
      {isLoading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {messages.length === 0 && !isLoading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <Typography variant="body2" color="text.secondary">
            No messages yet
          </Typography>
        </Box>
      )}
      
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          showAvatar={true}
          showTimestamp={true}
        />
      ))}
      
      {hasMore && onLoadMore && (
        <Box display="flex" justifyContent="center" p={2}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={onLoadMore}
          >
            Load more messages
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SimpleMessageList;