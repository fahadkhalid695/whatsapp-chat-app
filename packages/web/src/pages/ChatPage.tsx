import React, { useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MoreVert,
  Search,
  Group,
  Person,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { socketService } from '../services/socket';
import ConversationList from '../components/ConversationList';
import MessageView from '../components/MessageView';
import MessageInput from '../components/MessageInput';
import { MessageContent, MessageType, Conversation, Message } from '../types';

const DRAWER_WIDTH = 320;

const ChatPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messages,
    setActiveConversation,
    addMessage,
    setConversations,
    isLoading,
  } = useChatStore();

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  // Mock data for development
  useEffect(() => {
    // In a real app, you would fetch conversations from the API
    const mockConversations: Conversation[] = [
      {
        id: '1',
        type: 'direct',
        participants: [user?.id || '', 'user2'],
        lastActivity: new Date(),
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: {
          id: 'msg1',
          conversationId: '1',
          senderId: 'user2',
          content: { text: 'Hey there! How are you doing?' },
          type: 'text',
          timestamp: new Date(),
          deliveredTo: [],
          readBy: [],
          isDeleted: false,
        },
      },
      {
        id: '2',
        type: 'group',
        name: 'Team Chat',
        participants: [user?.id || '', 'user2', 'user3'],
        lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
        isArchived: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: {
          id: 'msg2',
          conversationId: '2',
          senderId: 'user3',
          content: { text: 'Great work on the project!' },
          type: 'text',
          timestamp: new Date(Date.now() - 3600000),
          deliveredTo: [],
          readBy: [],
          isDeleted: false,
        },
      },
    ];

    setConversations(mockConversations);
  }, [setConversations, user?.id]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    socketService.joinConversation(conversationId);
    
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleSendMessage = (content: MessageContent, type: MessageType) => {
    if (!activeConversationId || !user) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversationId: activeConversationId,
      senderId: user.id,
      content,
      type,
      timestamp: new Date(),
      deliveredTo: [],
      readBy: [],
      isDeleted: false,
    };

    addMessage(newMessage);
    socketService.sendMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content,
      type,
      isDeleted: false,
    });
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    socketService.disconnect();
    handleProfileMenuClose();
  };

  const getConversationTitle = (conversation: Conversation | undefined): string => {
    if (!conversation) return 'Chat';
    
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    const otherParticipantId = conversation.participants.find(id => id !== user?.id);
    return `User ${otherParticipantId?.slice(-4)}`;
  };

  const getConversationAvatar = (conversation: Conversation | undefined) => {
    if (!conversation) return <Person />;
    
    if (conversation.type === 'group') {
      return <Group />;
    }
    return <Person />;
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar header */}
      <Box
        sx={{
          p: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center">
          <Avatar
            {...(user?.profilePicture && { src: user.profilePicture })}
            sx={{ width: 40, height: 40, mr: 2 }}
          >
            {user?.displayName?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h6" noWrap>
            {user?.displayName}
          </Typography>
        </Box>
        <IconButton
          color="inherit"
          onClick={handleProfileMenuOpen}
        >
          <MoreVert />
        </IconButton>
      </Box>

      {/* Search bar placeholder */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton disabled>
          <Search />
        </IconButton>
      </Box>

      {/* Conversation list */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <ConversationList
          conversations={conversations}
          onSelectConversation={handleConversationSelect}
          activeConversationId={activeConversationId}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main chat area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Chat header */}
        <AppBar
          position="static"
          color="default"
          elevation={1}
          sx={{ backgroundColor: 'background.paper' }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {activeConversation && (
              <>
                <Avatar sx={{ mr: 2 }}>
                  {getConversationAvatar(activeConversation)}
                </Avatar>
                <Box flexGrow={1}>
                  <Typography variant="h6" noWrap>
                    {getConversationTitle(activeConversation)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeConversation.type === 'group' 
                      ? `${activeConversation.participants.length} participants`
                      : 'Online'
                    }
                  </Typography>
                </Box>
                <IconButton>
                  <Search />
                </IconButton>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* Messages area */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <MessageView
            conversation={activeConversation || null}
            messages={conversationMessages}
            isLoading={isLoading}
          />
        </Box>

        {/* Message input */}
        {activeConversation && (
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!activeConversation}
          />
        )}
      </Box>

      {/* Profile menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfileMenuClose}>Profile</MenuItem>
        <MenuItem onClick={handleProfileMenuClose}>Settings</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatPage;