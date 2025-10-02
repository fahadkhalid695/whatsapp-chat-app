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
import MediaUpload from '../components/MediaUpload';
import EmojiPicker from '../components/EmojiPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import MessageSearch from '../components/MessageSearch';
import ConnectionStatus from '../components/ConnectionStatus';
import MessageBubble from '../components/MessageBubble';
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
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [mediaUploadOpen, setMediaUploadOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<null | HTMLElement>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
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

  const handleSendMessage = () => {
    if (newMessage.trim() && activeConversationId) {
      addMessage(activeConversationId, {
        text: newMessage,
        sender: 'me',
        status: 'sent',
        replyTo: replyingTo?.id,
      });
      setNewMessage('');
      setReplyingTo(null);
      
      // Simulate response after 2 seconds
      setTimeout(() => {
        const responses = [
          "That's interesting!",
          "I see what you mean 🤔",
          "Thanks for sharing!",
          "Got it! 👍",
          "Sounds good to me",
          "Let me think about that...",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        addMessage(activeConversationId, {
          text: randomResponse,
          sender: 'other',
          status: 'read',
        });
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

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
          elevation={1}
          sx={{ 
            bgcolor: '#25D366',
            color: 'white'
          }}
        >
          <Toolbar>
            <Avatar
              src={user?.profilePicture}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {user?.displayName?.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Chats
            </Typography>
            <IconButton 
              color="inherit"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreVert />
            </IconButton>
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
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#f5f5f5',
              },
            }}
          />
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
                '&.Mui-selected': {
                  bgcolor: '#e8f5e8',
                },
                '&:hover': {
                  bgcolor: '#f5f5f5',
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
                  <Chip
                    label={conversation.contact.unreadCount}
                    size="small"
                    sx={{
                      bgcolor: '#25D366',
                      color: 'white',
                      height: 20,
                      fontSize: '0.75rem',
                      mt: 0.5,
                      display: 'block',
                    }}
                  />
                )}
              </Box>
            </ListItemButton>
          ))}
          
          {/* Floating Action Button for New Group */}
          <IconButton
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              bgcolor: '#25D366',
              color: 'white',
              '&:hover': {
                bgcolor: '#128C7E',
              },
              boxShadow: 3,
            }}
            onClick={() => setGroupCreationOpen(true)}
          >
            <Add />
          </IconButton>
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
                    <ConnectionStatus 
                      socketConnected={true} 
                      onlineStatus={navigator.onLine}
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
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.sender === 'me'}
                        showAvatar={!isConsecutive}
                        senderName={activeConversation.contact.name}
                        senderAvatar={activeConversation.contact.avatar}
                        currentUserId={user?.id || ''}
                        isConsecutive={isConsecutive}
                        onReply={handleReply}
                        onForward={handleForward}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onReaction={handleReaction}
                        onRemoveReaction={handleRemoveReaction}
                      />
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
                <VoiceRecorder
                  onSend={handleVoiceSend}
                  onCancel={() => setShowVoiceRecorder(false)}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <IconButton
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  >
                    <EmojiEmotions />
                  </IconButton>
                  <IconButton
                    onClick={() => setMediaUploadOpen(true)}
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
                        setNewMessage(e.target.value);
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
                    onClick={editingMessage ? () => {
                      // Handle edit save
                      console.log('Saving edit:', editingMessage);
                      setEditingMessage(null);
                    } : (newMessage.trim() ? handleSendMessage : () => setShowVoiceRecorder(true))}
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

      {/* Media Upload Dialog */}
      <MediaUpload
        open={mediaUploadOpen}
        onClose={() => setMediaUploadOpen(false)}
        onSend={handleMediaSend}
      />

      {/* Emoji Picker */}
      <EmojiPicker
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => setEmojiAnchor(null)}
        onEmojiSelect={handleEmojiSelect}
      />

      {/* Message Search */}
      <MessageSearch
        open={messageSearchOpen}
        onClose={() => setMessageSearchOpen(false)}
        onMessageSelect={(conversationId, messageId) => {
          setActiveConversation(conversationId);
          // In a real app, you'd scroll to the specific message
        }}
      />

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