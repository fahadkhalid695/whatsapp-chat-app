import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import MessageBubble from './MessageBubble';
import { Conversation, Message } from '../types';
import { useAuthStore } from '../store/authStore';

interface MessageViewProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
}

const MessageView: React.FC<MessageViewProps> = ({
  conversation,
  messages,
  isLoading,
}) => {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <CircularProgress />
      </Box>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'background.default',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        py: 1,
      }}
    >
      {messageGroups.length === 0 ? (
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
        messageGroups.map((group, groupIndex) => (
          <Box key={groupIndex}>
            {/* Date header */}
            <Box
              display="flex"
              justifyContent="center"
              my={2}
            >
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
        ))
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageView;