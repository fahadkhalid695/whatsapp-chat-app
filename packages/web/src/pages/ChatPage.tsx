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
  Fab,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MoreVert,
  Search,
  Group,
  Person,
  Add,
  Info,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import ConversationList from '../components/ConversationList';
import MessageView from '../components/MessageView';
import MessageInput from '../components/MessageInput';
import GroupCreationDialog from '../components/GroupCreationDialog';
import GroupSettingsDialog from '../components/GroupSettingsDialog';
import { MessageContent, MessageType, Conversation, Message, Contact } from '../types';

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
    typingUsers,
    userPresence,
  } = useChatStore();

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [chatMenuAnchor, setChatMenuAnchor] = useState<null | HTMLElement>(null);
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Load conversations and contacts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load conversations
        const conversationsResponse = await apiService.get('/conversations');
        if (conversationsResponse.success) {
          setConversations(conversationsResponse.data);
        }

        // Load contacts
        const contactsResponse = await apiService.get('/users/contacts');
        if (contactsResponse.success) {
          setContacts(contactsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        
        // Fallback to mock data for development
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
            admins: [user?.id || ''],
            lastActivity: new Date(Date.now() - 3600000),
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

        const mockContacts: Contact[] = [
          {
            id: '1',
            userId: user?.id || '',
            contactUserId: 'user2',
            name: 'John Doe',
            phoneNumber: '+1234567890',
            isAppUser: true,
            isBlocked: false,
            addedAt: new Date(),
          },
          {
            id: '2',
            userId: user?.id || '',
            contactUserId: 'user3',
            name: 'Jane Smith',
            phoneNumber: '+1234567891',
            isAppUser: true,
            isBlocked: false,
            addedAt: new Date(),
          },
        ];

        setConversations(mockConversations);
        setContacts(mockContacts);
      }
    };

    if (user) {
      loadData();
    }
  }, [setConversations, user]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  const handleConversationSelect = (conversationId: string) => {
    // Leave previous conversation
    if (activeConversationId) {
      socketService.leaveConversation(activeConversationId);
    }
    
    setActiveConversation(conversationId);
    socketService.joinConversation(conversationId);
    
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleSendMessage = (content: MessageContent, type: MessageType) => {
    if (!activeConversationId || !user) return;

    const tempId = `temp_${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: user.id,
      content,
      type,
      timestamp: new Date(),
      deliveredTo: [],
      readBy: [],
      isDeleted: false,
    };

    // Add temporary message to UI
    addMessage(newMessage);
    
    // Send via socket with temp ID for tracking
    socketService.sendMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content,
      type,
      isDeleted: false,
    }, tempId);
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

  const handleChatMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setChatMenuAnchor(event.currentTarget);
  };

  const handleChatMenuClose = () => {
    setChatMenuAnchor(null);
  };

  const handleCreateGroup = async (name: string, participants: string[]) => {
    try {
      const response = await apiService.post('/conversations', {
        type: 'group',
        name,
        participants,
      });

      if (response.success) {
        // Add new conversation to the list
        setConversations(prev => [response.data, ...prev]);
        setActiveConversation(response.data.id);
        socketService.joinConversation(response.data.id);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  };

  const handleUpdateGroupName = async (name: string) => {
    if (!activeConversationId) return;

    try {
      const response = await apiService.put(`/conversations/${activeConversationId}`, {
        name,
      });

      if (response.success) {
        // Update conversation in the list
        setConversations(prev =>
          prev.map(conv =>
            conv.id === activeConversationId
              ? { ...conv, name, updatedAt: new Date() }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Failed to update group name:', error);
      throw error;
    }
  };

  const handleAddParticipants = async (participantIds: string[]) => {
    if (!activeConversationId) return;

    try {
      await apiService.post(`/conversations/${activeConversationId}/participants`, {
        participantIds,
      });

      // Update conversation participants
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, participants: [...conv.participants, ...participantIds] }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to add participants:', error);
      throw error;
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!activeConversationId) return;

    try {
      await apiService.delete(`/conversations/${activeConversationId}/participants`, {
        participantIds: [participantId],
      });

      // Update conversation participants
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversationId
            ? { 
                ...conv, 
                participants: conv.participants.filter(id => id !== participantId),
                admins: conv.admins?.filter(id => id !== participantId)
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw error;
    }
  };

  const handlePromoteToAdmin = async (participantId: string) => {
    if (!activeConversationId) return;

    try {
      await apiService.put(`/conversations/${activeConversationId}/admin`, {
        targetUserId: participantId,
        makeAdmin: true,
      });

      // Update conversation admins
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversationId
            ? { 
                ...conv, 
                admins: [...(conv.admins || []), participantId]
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to promote to admin:', error);
      throw error;
    }
  };

  const handleDemoteFromAdmin = async (participantId: string) => {
    if (!activeConversationId) return;

    try {
      await apiService.put(`/conversations/${activeConversationId}/admin`, {
        targetUserId: participantId,
        makeAdmin: false,
      });

      // Update conversation admins
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversationId
            ? { 
                ...conv, 
                admins: conv.admins?.filter(id => id !== participantId) || []
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to demote from admin:', error);
      throw error;
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConversationId) return;

    try {
      await apiService.delete(`/conversations/${activeConversationId}/leave`);

      // Remove conversation from list
      setConversations(prev => prev.filter(conv => conv.id !== activeConversationId));
      setActiveConversation(null);
      socketService.leaveConversation(activeConversationId);
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw error;
    }
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

  const getPresenceText = (conversation: Conversation): string => {
    if (conversation.type === 'group') {
      return `${conversation.participants.length} participants`;
    }
    
    const otherParticipantId = conversation.participants.find(id => id !== user?.id);
    if (!otherParticipantId) return 'Unknown';
    
    const presence = userPresence[otherParticipantId];
    if (!presence) return 'Unknown';
    
    if (presence.isOnline) {
      return 'Online';
    } else if (presence.lastSeen) {
      const now = new Date();
      const lastSeen = new Date(presence.lastSeen);
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Last seen just now';
      if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Last seen ${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Last seen ${diffDays}d ago`;
    }
    
    return 'Last seen recently';
  };

  const getTypingText = (): string => {
    if (!activeConversationId) return '';
    
    const typing = typingUsers[activeConversationId] || [];
    if (typing.length === 0) return '';
    
    if (typing.length === 1) return 'typing...';
    if (typing.length === 2) return 'typing...';
    return `${typing.length} people typing...`;
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
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        <ConversationList
          conversations={conversations}
          onSelectConversation={handleConversationSelect}
          activeConversationId={activeConversationId}
        />
        
        {/* Floating action button for new group */}
        <Fab
          color="primary"
          size="medium"
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
          }}
          onClick={() => setShowGroupCreation(true)}
        >
          <Add />
        </Fab>
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
                      : getPresenceText(activeConversation)
                    }
                  </Typography>
                </Box>
                <IconButton>
                  <Search />
                </IconButton>
                <IconButton onClick={handleChatMenuOpen}>
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

      {/* Chat menu */}
      <Menu
        anchorEl={chatMenuAnchor}
        open={Boolean(chatMenuAnchor)}
        onClose={handleChatMenuClose}
      >
        {activeConversation?.type === 'group' && (
          <MenuItem
            onClick={() => {
              setShowGroupSettings(true);
              handleChatMenuClose();
            }}
          >
            <Info sx={{ mr: 1 }} />
            Group Info
          </MenuItem>
        )}
        <MenuItem onClick={handleChatMenuClose}>Search Messages</MenuItem>
        <MenuItem onClick={handleChatMenuClose}>Clear Chat</MenuItem>
      </Menu>

      {/* Group creation dialog */}
      <GroupCreationDialog
        open={showGroupCreation}
        onClose={() => setShowGroupCreation(false)}
        contacts={contacts}
        onCreateGroup={handleCreateGroup}
      />

      {/* Group settings dialog */}
      <GroupSettingsDialog
        open={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        conversation={activeConversation}
        contacts={contacts}
        onUpdateGroupName={handleUpdateGroupName}
        onAddParticipants={handleAddParticipants}
        onRemoveParticipant={handleRemoveParticipant}
        onPromoteToAdmin={handlePromoteToAdmin}
        onDemoteFromAdmin={handleDemoteFromAdmin}
        onLeaveGroup={handleLeaveGroup}
      />
    </Box>
  );
};

export default ChatPage;