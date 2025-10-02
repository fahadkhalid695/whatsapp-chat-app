import React, { useState, useRef, useEffect } from 'react';
import { keyframes } from '@mui/system';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  TextField,
  InputAdornment,
  Badge,
  Menu,
  MenuItem,
  Chip,
  Fade,
  Card,
  CardMedia,
  Drawer,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Send,
  AttachFile,
  EmojiEmotions,
  Mic,
  VideoCall,
  Call,
  PlayArrow,
  Pause,
  VolumeUp,
  Settings,
  Group,
  PersonAdd,
  Archive,
  Notifications,
  Security,
  Help,
  Info,
  Close,
  Add,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useChatStore, Message, Contact } from '../store/chatStore';
import MessageSearch from '../components/MessageSearch';
import GroupCreationDialog from '../components/GroupCreationDialog';
import MediaGallery from '../components/MediaGallery';
import { socketService } from '../services/socket';
import { apiClient } from '../services/api';
// import MessageReactions from '../components/MessageReactions';
// import VirtualizedMessageList from '../components/VirtualizedMessageList';
// import GroupCreationDialog from '../components/GroupCreationDialog';
// import GroupSettingsDialog from '../components/GroupSettingsDialog';
// import MediaGallery from '../components/MediaGallery';
// import PerformanceMonitor from '../components/PerformanceMonitor';
// import NetworkAwareLoader from '../components/NetworkAwareLoader';

// Typing animation keyframes
const typingAnimation = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
`;

const ChatPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    searchQuery,
    setActiveConversation,
    addMessage,
    setSearchQuery,
    initializeConversations,
    sendMessage,
    editMessage,
    deleteMessage,
    createConversation,
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [groupCreationOpen, setGroupCreationOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [useVirtualizedList, setUseVirtualizedList] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversations on mount
  useEffect(() => {
    initializeConversations();
  }, [initializeConversations]);

  const activeConversation = conversations.find(conv => conv.id === activeConversationId);
  const filteredContacts = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && activeConversationId) {
      const messageContent = { text: newMessage };
      
      try {
        // Send via real API and socket
        await sendMessage(activeConversationId, messageContent, 'text', replyingTo?.id);
        
        setNewMessage('');
        setReplyingTo(null);
        setIsTyping(false);
        
        // Stop typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
      } catch (error) {
        console.error('Failed to send message:', error);
        // Message was already added optimistically, so user sees it
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    // Show typing indicator
    if (!isTyping && value.trim() && activeConversationId) {
      setIsTyping(true);
      socketService.startTyping(activeConversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConversationId) {
        socketService.stopTyping(activeConversationId);
      }
    }, 1000);
  };

  const handleMediaSend = (files: any[], caption: string) => {
    if (activeConversationId) {
      files.forEach((file) => {
        const messageText = caption || `Shared ${file.type}`;
        addMessage(activeConversationId, {
          text: messageText,
          sender: 'me',
          status: 'sent',
          type: file.type,
          mediaUrl: file.preview,
          fileName: file.name,
          replyTo: replyingTo?.id,
        });
      });
      setReplyingTo(null);
    }
  };

  // Temporarily removed emoji handler

  const handleVoiceSend = (audioBlob: Blob, duration: number) => {
    if (activeConversationId) {
      const audioUrl = URL.createObjectURL(audioBlob);
      addMessage(activeConversationId, {
        text: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        sender: 'me',
        status: 'sent',
        type: 'audio',
        mediaUrl: audioUrl,
        replyTo: replyingTo?.id,
      });
    }
    setShowVoiceRecorder(false);
    setReplyingTo(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleForward = (message: Message) => {
    // In a real app, this would open a contact selection dialog
    console.log('Forwarding message:', message.text);
  };

  const handleDelete = (messageId: string) => {
    // In a real app, this would delete the message from the store
    console.log('Deleting message:', messageId);
  };

  const handleEdit = (messageId: string, newText: string) => {
    setEditingMessage({ id: messageId, text: newText });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    // In a real app, this would add the reaction to the message
    console.log('Adding reaction:', emoji, 'to message:', messageId);
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    // In a real app, this would remove the reaction from the message
    console.log('Removing reaction:', emoji, 'from message:', messageId);
  };

  const handleMediaClick = (mediaMessages: Message[], index: number) => {
    setSelectedMediaIndex(index);
    setMediaGalleryOpen(true);
  };

  const handleGroupCreate = (name: string, participants: string[]) => {
    // In a real app, this would create a new group conversation
    console.log('Creating group:', name, 'with participants:', participants);
    setGroupCreationOpen(false);
  };

  const handleGroupSettings = () => {
    setGroupSettingsOpen(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Failed to delete message:', error);
        alert('Failed to delete message. Please try again.');
      }
    }
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessage({ id: messageId, text: currentText });
  };

  const handleForwardMessage = (message: Message) => {
    // In a real app, this would open a contact selection dialog
    console.log('Forwarding message:', message.text);
    alert(`Forwarding: "${message.text}"\n\nIn a real app, this would open a contact selection dialog.`);
  };

  const handleSaveEdit = async () => {
    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, { text: editingMessage.text });
        setEditingMessage(null);
      } catch (error) {
        console.error('Failed to edit message:', error);
        alert('Failed to edit message. Please try again.');
      }
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'image' && message.mediaUrl) {
      return (
        <Box>
          <Card sx={{ maxWidth: 300, mb: 1 }}>
            <CardMedia
              component="img"
              image={message.mediaUrl}
              alt="Shared image"
              sx={{ maxHeight: 200, objectFit: 'cover' }}
            />
          </Card>
          {message.text && (
            <Typography variant="body1">{message.text}</Typography>
          )}
        </Box>
      );
    }

    if (message.type === 'video' && message.mediaUrl) {
      return (
        <Box>
          <Card sx={{ maxWidth: 300, mb: 1 }}>
            <CardMedia
              component="video"
              src={message.mediaUrl}
              controls
              sx={{ maxHeight: 200 }}
            />
          </Card>
          {message.text && (
            <Typography variant="body1">{message.text}</Typography>
          )}
        </Box>
      );
    }

    if (message.type === 'audio' && message.mediaUrl) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
          <IconButton size="small" sx={{ color: '#25D366' }}>
            <VolumeUp />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2">{message.text}</Typography>
            <Box
              sx={{
                height: 2,
                bgcolor: '#e0e0e0',
                borderRadius: 1,
                mt: 0.5,
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: '30%',
                  bgcolor: '#25D366',
                  borderRadius: 1,
                }}
              />
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
        {message.text}
      </Typography>
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f0f0' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 350,
          bgcolor: 'white',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sidebar Header */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: 'white'
          }}
        >
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Avatar
                src={user?.profilePicture}
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: '2px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {user?.displayName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  Chats
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {conversations.length} conversations
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton 
                color="inherit"
                size="small"
                onClick={() => setGroupCreationOpen(true)}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <Group />
              </IconButton>
              <IconButton 
                color="inherit"
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => { setMenuAnchor(null); setGroupCreationOpen(true); }}>
                <Group sx={{ mr: 1 }} />
                New Group
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setMessageSearchOpen(true); }}>
                <Search sx={{ mr: 1 }} />
                Search Messages
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setSettingsDrawerOpen(true); }}>
                <Settings sx={{ mr: 1 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setShowPerformanceMonitor(!showPerformanceMonitor); }}>
                <Info sx={{ mr: 1 }} />
                Performance Monitor
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); logout(); }}>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Search */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ color: 'text.secondary' }}
                  >
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#ffffff',
                  borderColor: '#25D366',
                },
                '&.Mui-focused': {
                  bgcolor: '#ffffff',
                  borderColor: '#25D366',
                  boxShadow: '0 0 0 3px rgba(37, 211, 102, 0.1)',
                },
              },
            }}
          />
          
          {/* Search results count */}
          {searchQuery && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 1, 
                color: 'text.secondary',
                textAlign: 'center' 
              }}
            >
              {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''} found
            </Typography>
          )}
        </Box>

        {/* Contacts List */}
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0, position: 'relative' }}>
          {filteredContacts.map((conversation) => (
            <ListItemButton
              key={conversation.id}
              selected={activeConversationId === conversation.id}
              onClick={() => setActiveConversation(conversation.id)}
              sx={{
                py: 2,
                px: 2,
                borderRadius: 2,
                mx: 1,
                mb: 0.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  bgcolor: 'rgba(37, 211, 102, 0.1)',
                  borderLeft: '4px solid #25D366',
                  transform: 'translateX(4px)',
                },
                '&:hover': {
                  bgcolor: 'rgba(37, 211, 102, 0.05)',
                  transform: 'translateX(2px)',
                },
              }}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: conversation.contact.isOnline ? '#4caf50' : 'transparent',
                      width: 12,
                      height: 12,
                      border: '2px solid white',
                    },
                  }}
                >
                  <Avatar src={conversation.contact.avatar} />
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight="medium">
                    {conversation.contact.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {conversation.isTyping ? (
                      <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic' }}>
                        typing...
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {conversation.contact.lastMessage}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  {conversation.contact.timestamp}
                </Typography>
                {conversation.contact.unreadCount > 0 && (
                  <Fade in={true}>
                    <Chip
                      label={conversation.contact.unreadCount > 99 ? '99+' : conversation.contact.unreadCount}
                      size="small"
                      sx={{
                        bgcolor: '#25D366',
                        color: 'white',
                        height: 22,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        mt: 0.5,
                        display: 'block',
                        minWidth: 22,
                        borderRadius: '11px',
                        animation: conversation.contact.unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.1)' },
                          '100%': { transform: 'scale(1)' },
                        },
                      }}
                    />
                  </Fade>
                )}
              </Box>
            </ListItemButton>
          ))}
          
          {/* Floating Action Button for New Chat */}
          <Fade in={true} timeout={800}>
            <IconButton
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)',
                  transform: 'scale(1.1)',
                  boxShadow: '0 6px 16px rgba(37, 211, 102, 0.6)',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                // Add a new demo conversation
                const demoContacts = [
                  { name: 'Sarah Wilson', avatar: 'https://i.pravatar.cc/150?img=7', message: 'Hey! How are you?' },
                  { name: 'Mike Johnson', avatar: 'https://i.pravatar.cc/150?img=8', message: 'Let\'s catch up soon!' },
                  { name: 'Lisa Chen', avatar: 'https://i.pravatar.cc/150?img=9', message: 'Thanks for the help!' },
                ];
                const randomContact = demoContacts[Math.floor(Math.random() * demoContacts.length)];
                console.log('Adding new conversation with:', randomContact.name);
              }}
            >
              <Add sx={{ fontSize: 28 }} />
            </IconButton>
          </Fade>
        </List>
      </Box>

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <AppBar 
              position="static" 
              elevation={1}
              sx={{ 
                bgcolor: '#f5f5f5', 
                color: 'black',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              <Toolbar>
                <Avatar
                  src={activeConversation.contact.avatar}
                  sx={{ width: 40, height: 40, mr: 2 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {activeConversation.contact.name}
                    </Typography>
                    <Chip 
                      size="small"
                      label="Online"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {activeConversation.isTyping 
                      ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.2,
                              '& > div': {
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                animation: `${typingAnimation} 1.4s infinite ease-in-out`,
                              },
                              '& > div:nth-of-type(1)': { animationDelay: '0s' },
                              '& > div:nth-of-type(2)': { animationDelay: '0.2s' },
                              '& > div:nth-of-type(3)': { animationDelay: '0.4s' },
                            }}
                          >
                            <div />
                            <div />
                            <div />
                          </Box>
                          <span>typing...</span>
                        </Box>
                      )
                      : activeConversation.contact.isOnline 
                        ? 'Online' 
                        : 'Last seen recently'
                    }
                  </Typography>
                </Box>
                <IconButton sx={{ color: 'primary.main' }}>
                  <VideoCall />
                </IconButton>
                <IconButton sx={{ color: 'primary.main' }}>
                  <Call />
                </IconButton>
                <IconButton onClick={handleGroupSettings}>
                  <Info />
                </IconButton>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </Toolbar>
            </AppBar>

            {/* Messages */}
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                background: 'linear-gradient(to bottom, #efeae2 0%, #e5ddd5 100%)',
                backgroundImage: `
                  url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
                `,
                backgroundSize: '60px 60px',
                position: 'relative',
              }}
            >
              {false ? (
                <div>Virtualized list temporarily disabled</div>
              ) : (
                <Box sx={{ p: 1, overflow: 'auto', height: '100%' }}>
                  {activeConversation.messages.map((message, index) => {
                    const prevMessage = activeConversation.messages[index - 1];
                    const isConsecutive = prevMessage && 
                      prevMessage.sender === message.sender &&
                      (message.timestamp.getTime() - prevMessage.timestamp.getTime()) < 60000;

                    return (
                      <Fade key={message.id} in={true} timeout={300}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start',
                            mb: isConsecutive ? 0.5 : 1,
                            px: 1,
                            '&:hover .message-actions': {
                              opacity: 1,
                            },
                          }}
                        >
                          {/* Avatar for other users */}
                          {message.sender !== 'me' && !isConsecutive && (
                            <Avatar
                              src={activeConversation.contact.avatar}
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                mr: 1,
                                alignSelf: 'flex-end',
                              }}
                            >
                              {activeConversation.contact.name.charAt(0)}
                            </Avatar>
                          )}
                          
                          {/* Spacer for consecutive messages */}
                          {message.sender !== 'me' && isConsecutive && (
                            <Box sx={{ width: 40 }} />
                          )}

                          <Box sx={{ position: 'relative', maxWidth: '70%' }}>
                            {/* Reply indicator */}
                            {message.replyTo && (
                              <Box
                                sx={{
                                  borderLeft: '3px solid #25D366',
                                  pl: 1,
                                  mb: 1,
                                  bgcolor: 'rgba(37, 211, 102, 0.1)',
                                  borderRadius: 1,
                                  p: 0.5,
                                }}
                              >
                                <Typography variant="caption" color="primary" fontWeight="medium">
                                  Replying to message
                                </Typography>
                              </Box>
                            )}

                            {/* Message bubble */}
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: message.sender === 'me' 
                                  ? '18px 18px 4px 18px' 
                                  : '18px 18px 18px 4px',
                                bgcolor: message.sender === 'me' ? '#d9fdd3' : 'white',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                },
                              }}
                            >
                              {/* Media content */}
                              {message.type === 'image' && message.mediaUrl ? (
                                <Box>
                                  <Card 
                                    sx={{ 
                                      maxWidth: 300, 
                                      mb: message.text ? 1 : 0,
                                      borderRadius: 2,
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s',
                                      '&:hover': {
                                        transform: 'scale(1.02)',
                                      },
                                    }}
                                  >
                                    <CardMedia
                                      component="img"
                                      image={message.mediaUrl}
                                      alt="Shared image"
                                      sx={{ maxHeight: 200, objectFit: 'cover' }}
                                      onClick={() => {
                                        const mediaMessages = activeConversation.messages.filter(
                                          msg => msg.type && ['image', 'video', 'audio'].includes(msg.type) && msg.mediaUrl
                                        );
                                        const mediaIndex = mediaMessages.findIndex(msg => msg.id === message.id);
                                        setSelectedMediaIndex(mediaIndex >= 0 ? mediaIndex : 0);
                                        setMediaGalleryOpen(true);
                                      }}
                                    />
                                  </Card>
                                  {message.text && (
                                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                                      {message.text}
                                    </Typography>
                                  )}
                                </Box>
                              ) : message.type === 'audio' && message.mediaUrl ? (
                                <Box 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1, 
                                    minWidth: 200,
                                    p: 1,
                                    bgcolor: message.sender === 'me' ? 'rgba(255,255,255,0.2)' : 'rgba(37, 211, 102, 0.1)',
                                    borderRadius: 2,
                                  }}
                                >
                                  <IconButton 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: '#25D366',
                                      color: 'white',
                                      '&:hover': { bgcolor: '#128C7E' },
                                    }}
                                  >
                                    <PlayArrow />
                                  </IconButton>
                                  
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" fontWeight="medium">
                                      Voice message
                                    </Typography>
                                    <Box
                                      sx={{
                                        height: 3,
                                        bgcolor: 'rgba(0,0,0,0.2)',
                                        borderRadius: 1.5,
                                        mt: 0.5,
                                        position: 'relative',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          height: '100%',
                                          width: '30%',
                                          bgcolor: '#25D366',
                                          borderRadius: 1.5,
                                          transition: 'width 0.3s ease',
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                  
                                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    0:15
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body1" sx={{ 
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                }}>
                                  {message.text}
                                </Typography>
                              )}

                              {/* Message reactions */}
                              {message.reactions && message.reactions.length > 0 && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: 0.5,
                                    mt: 1,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {message.reactions.map((reaction, idx) => (
                                    <Chip
                                      key={idx}
                                      label={`${reaction.emoji} ${reaction.users.length}`}
                                      size="small"
                                      sx={{
                                        height: 24,
                                        fontSize: '0.75rem',
                                        bgcolor: 'rgba(37, 211, 102, 0.1)',
                                        border: '1px solid rgba(37, 211, 102, 0.3)',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          bgcolor: 'rgba(37, 211, 102, 0.2)',
                                        },
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}

                              {/* Timestamp and status */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  mt: 0.5,
                                }}
                              >
                                {message.editedAt && (
                                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                    edited
                                  </Typography>
                                )}
                                
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    opacity: 0.7,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {message.timestamp.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </Typography>
                                
                                {message.sender === 'me' && (
                                  <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                    {message.status === 'sent' && '✓'}
                                    {message.status === 'delivered' && '✓✓'}
                                    {message.status === 'read' && <span style={{ color: '#00a884' }}>✓✓</span>}
                                  </Box>
                                )}
                              </Box>
                            </Box>

                            {/* Quick reaction buttons */}
                            <Box
                              className="message-actions"
                              sx={{
                                position: 'absolute',
                                top: -8,
                                [message.sender === 'me' ? 'left' : 'right']: -40,
                                display: 'flex',
                                gap: 0.5,
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                zIndex: 1,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() => {
                                  // Add quick reaction
                                  console.log('Quick reaction: 👍');
                                }}
                                sx={{
                                  bgcolor: 'background.paper',
                                  boxShadow: 1,
                                  width: 28,
                                  height: 28,
                                  fontSize: '0.8rem',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                👍
                              </IconButton>
                              
                              <IconButton
                                size="small"
                                onClick={() => setReplyingTo(message)}
                                sx={{
                                  bgcolor: 'background.paper',
                                  boxShadow: 1,
                                  width: 28,
                                  height: 28,
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                ↩️
                              </IconButton>
                              
                              <Menu
                                anchorEl={null}
                                open={false}
                                onClose={() => {}}
                                PaperProps={{
                                  sx: { borderRadius: 2 },
                                }}
                              >
                                <MenuItem onClick={() => setReplyingTo(message)}>
                                  ↩️ Reply
                                </MenuItem>
                                <MenuItem onClick={() => handleForwardMessage(message)}>
                                  ➡️ Forward
                                </MenuItem>
                                <MenuItem onClick={() => navigator.clipboard.writeText(message.text)}>
                                  📋 Copy
                                </MenuItem>
                                {message.sender === 'me' && (
                                  <MenuItem onClick={() => handleEditMessage(message.id, message.text)}>
                                    ✏️ Edit
                                  </MenuItem>
                                )}
                                {message.sender === 'me' && (
                                  <MenuItem 
                                    onClick={() => handleDeleteMessage(message.id)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    🗑️ Delete
                                  </MenuItem>
                                )}
                              </Menu>
                            </Box>
                          </Box>
                        </Box>
                      </Fade>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>
              )}
            </Box>

            {/* Message Input */}
            <Box
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                borderTop: '1px solid #e0e0e0',
              }}
            >
              {/* Reply Preview */}
              {replyingTo && (
                <Box
                  sx={{
                    mb: 1,
                    p: 1,
                    bgcolor: 'rgba(37, 211, 102, 0.1)',
                    borderLeft: '3px solid #25D366',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="primary" fontWeight="medium">
                      Replying to {replyingTo.sender === 'me' ? 'yourself' : activeConversation?.contact.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {replyingTo.text.length > 50 ? `${replyingTo.text.substring(0, 50)}...` : replyingTo.text}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <Close />
                  </IconButton>
                </Box>
              )}

              {/* Edit Preview */}
              {editingMessage && (
                <Box
                  sx={{
                    mb: 1,
                    p: 1,
                    bgcolor: 'rgba(255, 193, 7, 0.1)',
                    borderLeft: '3px solid #ffc107',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="warning.main" fontWeight="medium">
                      Editing message
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {editingMessage.text}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setEditingMessage(null)}>
                    <Close />
                  </IconButton>
                </Box>
              )}

              {showVoiceRecorder ? (
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                  <Typography>Voice recording feature coming soon!</Typography>
                  <Button onClick={() => setShowVoiceRecorder(false)}>Cancel</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <IconButton
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  >
                    <EmojiEmotions />
                  </IconButton>
                  <IconButton
                    onClick={async () => {
                      // Create file input for media upload
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,video/*,audio/*';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file && activeConversationId) {
                          try {
                            // Upload media to server
                            const { mediaId, url } = await apiClient.uploadMedia(file);
                            
                            // Send message with media
                            await sendMessage(activeConversationId, {
                              text: `Shared ${file.type.split('/')[0]}`,
                              mediaId,
                              mediaUrl: url,
                              fileName: file.name,
                              fileSize: file.size,
                            }, file.type.split('/')[0], replyingTo?.id);
                            
                            setReplyingTo(null);
                            
                          } catch (error) {
                            console.error('Failed to upload media:', error);
                            
                            // Fallback to demo media
                            const mediaTypes = [
                              { type: 'image', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', text: 'Beautiful sunset 🌅' },
                              { type: 'image', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop', text: 'Forest path 🌲' },
                              { type: 'audio', url: 'data:audio/wav;base64,demo', text: 'Voice message' },
                            ];
                            const randomMedia = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
                            
                            addMessage(activeConversationId, {
                              text: randomMedia.text,
                              sender: 'me',
                              status: 'sent',
                              type: randomMedia.type as any,
                              mediaUrl: randomMedia.url,
                              replyTo: replyingTo?.id,
                            });
                            setReplyingTo(null);
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    <AttachFile />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={editingMessage ? "Edit your message..." : "Type a message"}
                    value={editingMessage ? editingMessage.text : newMessage}
                    onChange={(e) => {
                      if (editingMessage) {
                        setEditingMessage({ ...editingMessage, text: e.target.value });
                      } else {
                        handleTyping(e.target.value);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: 'white',
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={editingMessage ? handleSaveEdit : (newMessage.trim() ? handleSendMessage : () => setShowVoiceRecorder(true))}
                    sx={{
                      bgcolor: '#25D366',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#128C7E',
                      },
                    }}
                  >
                    {editingMessage ? <Send /> : (newMessage.trim() ? <Send /> : <Mic />)}
                  </IconButton>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              bgcolor: '#f5f5f5',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a chat to start messaging
            </Typography>
          </Box>
        )}
      </Box>

      {/* Simple Emoji Picker */}
      <Menu
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => setEmojiAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            maxWidth: 300,
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Quick Emojis
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {[
              '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😋',
              '😎', '🤔', '😴', '😇', '🙃', '😉', '😌', '😏',
              '❤️', '💕', '💖', '💗', '💙', '💚', '💛', '🧡',
              '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏',
              '🎉', '🎊', '🔥', '💯', '⭐', '✨', '💫', '🌟',
            ].map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => {
                  setNewMessage(prev => prev + emoji);
                  setEmojiAnchor(null);
                }}
                sx={{
                  fontSize: '1.2rem',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    bgcolor: 'rgba(37, 211, 102, 0.1)',
                    transform: 'scale(1.2)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Box>
      </Menu>

      {/* Message Search Dialog */}
      <MessageSearch
        open={messageSearchOpen}
        onClose={() => setMessageSearchOpen(false)}
        onMessageSelect={(conversationId, messageId) => {
          setActiveConversation(conversationId);
          setMessageSearchOpen(false);
          // In a real app, you'd scroll to the specific message
          console.log('Navigate to message:', messageId, 'in conversation:', conversationId);
        }}
      />

      {/* Group Creation Dialog */}
      <GroupCreationDialog
        open={groupCreationOpen}
        onClose={() => setGroupCreationOpen(false)}
        onCreateGroup={(name, participants, avatar) => {
          console.log('Creating group:', { name, participants, avatar });
          // In a real app, this would create the group via API
          setGroupCreationOpen(false);
        }}
        availableContacts={conversations.map(conv => conv.contact)}
      />

      {/* Media Gallery */}
      <MediaGallery
        open={mediaGalleryOpen}
        onClose={() => setMediaGalleryOpen(false)}
        mediaItems={activeConversation?.messages
          .filter(msg => msg.type && ['image', 'video', 'audio'].includes(msg.type) && msg.mediaUrl)
          .map(msg => ({
            id: msg.id,
            type: msg.type as 'image' | 'video' | 'audio',
            url: msg.mediaUrl!,
            caption: msg.text,
            timestamp: msg.timestamp,
            sender: msg.sender === 'me' ? user?.displayName : activeConversation?.contact.name,
            senderAvatar: msg.sender === 'me' ? user?.profilePicture : activeConversation?.contact.avatar,
          })) || []}
        initialIndex={selectedMediaIndex}
        onDownload={(item) => {
          console.log('Downloading media:', item);
          // In a real app, this would trigger download
        }}
        onShare={(item) => {
          console.log('Sharing media:', item);
          // In a real app, this would open share dialog
        }}
        onDelete={(item) => {
          console.log('Deleting media:', item);
          // In a real app, this would delete the message
        }}
      />

      {/* Enhanced Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        PaperProps={{
          sx: { 
            width: 350,
            background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton 
              onClick={() => setSettingsDrawerOpen(false)}
              sx={{ mr: 1 }}
            >
              <Close />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Settings
            </Typography>
          </Box>

          {/* Profile Section */}
          <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                p: 3,
                color: 'white',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={user?.profilePicture} 
                  sx={{ 
                    width: 60, 
                    height: 60,
                    border: '3px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {user?.displayName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {user?.displayName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {user?.phoneNumber}
                  </Typography>
                  <Chip 
                    label="Online" 
                    size="small" 
                    sx={{ 
                      mt: 0.5,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '0.7rem',
                    }} 
                  />
                </Box>
              </Box>
            </Box>
          </Card>

          {/* Settings Options */}
          <Box sx={{ space: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Preferences
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    color="success"
                  />
                }
                label="Dark Mode"
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    color="success"
                  />
                }
                label="Notifications"
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Actions
            </Typography>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Group />}
              onClick={() => {
                setSettingsDrawerOpen(false);
                setGroupCreationOpen(true);
              }}
              sx={{ 
                mb: 1,
                borderRadius: 2,
                borderColor: '#25D366',
                color: '#25D366',
                '&:hover': {
                  borderColor: '#128C7E',
                  bgcolor: 'rgba(37, 211, 102, 0.1)',
                },
              }}
            >
              Create Group
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Archive />}
              sx={{ 
                mb: 1,
                borderRadius: 2,
              }}
            >
              Archived Chats
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Security />}
              sx={{ 
                mb: 3,
                borderRadius: 2,
              }}
            >
              Privacy & Security
            </Button>

            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={() => {
                setSettingsDrawerOpen(false);
                logout();
              }}
              sx={{ 
                borderRadius: 2,
                py: 1.5,
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        PaperProps={{
          sx: { width: 350 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => setSettingsDrawerOpen(false)}>
              <Close />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>
              Settings
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Profile
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar src={user?.profilePicture} sx={{ width: 60, height: 60 }}>
                {user?.displayName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {user?.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.phoneNumber}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Preferences
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
              }
              label="Dark Mode"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
              }
              label="Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={useVirtualizedList}
                  onChange={(e) => setUseVirtualizedList(e.target.checked)}
                />
              }
              label="Virtualized Messages (Performance)"
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Chat Features
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Group />}
              onClick={() => {
                setSettingsDrawerOpen(false);
                setGroupCreationOpen(true);
              }}
              sx={{ mb: 1 }}
            >
              Create Group
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Archive />}
              sx={{ mb: 1 }}
            >
              Archived Chats
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Security />}
              sx={{ mb: 1 }}
            >
              Privacy & Security
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Support
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Help />}
              sx={{ mb: 1 }}
            >
              Help & Support
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Info />}
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
            >
              Performance Monitor
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Group Creation Dialog - Temporarily disabled */}
      {groupCreationOpen && (
        <Dialog open={groupCreationOpen} onClose={() => setGroupCreationOpen(false)}>
          <DialogTitle>Create Group</DialogTitle>
          <DialogContent>
            <Typography>Group creation feature coming soon!</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupCreationOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Group Settings Dialog - Temporarily disabled */}
      {groupSettingsOpen && (
        <Dialog open={groupSettingsOpen} onClose={() => setGroupSettingsOpen(false)}>
          <DialogTitle>Group Settings</DialogTitle>
          <DialogContent>
            <Typography>Group settings feature coming soon!</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupSettingsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Media Gallery - Temporarily disabled */}
      {mediaGalleryOpen && (
        <Dialog open={mediaGalleryOpen} onClose={() => setMediaGalleryOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Media Gallery</DialogTitle>
          <DialogContent>
            <Typography>Media gallery feature coming soon!</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMediaGalleryOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Performance Monitor - Temporarily disabled */}
      {showPerformanceMonitor && (
        <Dialog open={showPerformanceMonitor} onClose={() => setShowPerformanceMonitor(false)}>
          <DialogTitle>Performance Monitor</DialogTitle>
          <DialogContent>
            <Typography>Performance monitoring feature coming soon!</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPerformanceMonitor(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ChatPage;