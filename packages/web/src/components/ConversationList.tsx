import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Badge,
  Divider,
} from '@mui/material';
import { Group, Person } from '@mui/icons-material';
import { Conversation, Message } from '../types';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  activeConversationId: string | null;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelectConversation,
  activeConversationId,
}) => {
  const { user } = useAuthStore();
  const { messages } = useChatStore();

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUnreadCount = (conversationId: string): number => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.filter(
      (msg: Message) => !msg.readBy.includes(user?.id || '') && msg.senderId !== user?.id
    ).length;
  };

  const getLastMessagePreview = (message: Message | undefined): string => {
    if (!message) return 'No messages yet';
    
    if (message.type === 'text') {
      return message.content.text || '';
    } else if (message.type === 'image') {
      return '📷 Photo';
    } else if (message.type === 'video') {
      return '🎥 Video';
    } else if (message.type === 'audio') {
      return '🎵 Audio';
    } else if (message.type === 'document') {
      return `📄 ${message.content.fileName || 'Document'}`;
    }
    
    return 'Message';
  };

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    // For direct conversations, show the other participant's name
    const otherParticipantId = conversation.participants.find(id => id !== user?.id);
    // In a real app, you'd fetch the user details from contacts or users store
    return `User ${otherParticipantId?.slice(-4)}`;
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return <Group />;
    }
    return <Person />;
  };

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
      {conversations.map((conversation, index) => {
        const unreadCount = getUnreadCount(conversation.id);
        const isActive = conversation.id === activeConversationId;
        
        return (
          <React.Fragment key={conversation.id}>
            <ListItem
              button
              onClick={() => onSelectConversation(conversation.id)}
              sx={{
                backgroundColor: isActive ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                py: 1.5,
              }}
            >
              <ListItemAvatar>
                <Badge
                  badgeContent={unreadCount}
                  color="primary"
                  invisible={unreadCount === 0}
                >
                  <Avatar>
                    {getConversationAvatar(conversation)}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography
                      variant="subtitle1"
                      fontWeight={unreadCount > 0 ? 'bold' : 'normal'}
                      noWrap
                    >
                      {getConversationName(conversation)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {formatTime(conversation.lastActivity)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    fontWeight={unreadCount > 0 ? 'medium' : 'normal'}
                  >
                    {getLastMessagePreview(conversation.lastMessage)}
                  </Typography>
                }
              />
            </ListItem>
            
            {index < conversations.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        );
      })}
      
      {conversations.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={4}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No conversations yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a new chat to begin messaging
          </Typography>
        </Box>
      )}
    </List>
  );
};

export default ConversationList;