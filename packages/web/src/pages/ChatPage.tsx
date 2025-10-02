import React, { useState, useRef, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useChatStore, Message, Contact } from '../store/chatStore';
import MediaUpload from '../components/MediaUpload';
import EmojiPicker from '../components/EmojiPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import MessageSearch from '../components/MessageSearch';

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
      });
      setNewMessage('');
      
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
        });
      });
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
      });
    }
    setShowVoiceRecorder(false);
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
              <MenuItem onClick={() => { setMenuAnchor(null); setMessageSearchOpen(true); }}>
                Search Messages
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); /* Profile logic */ }}>
                Profile
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); /* Settings logic */ }}>
                Settings
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
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
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
              sx={{ bgcolor: '#f5f5f5', color: 'black' }}
            >
              <Toolbar>
                <Avatar
                  src={activeConversation.contact.avatar}
                  sx={{ width: 40, height: 40, mr: 2 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {activeConversation.contact.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeConversation.isTyping 
                      ? 'typing...' 
                      : activeConversation.contact.isOnline 
                        ? 'Online' 
                        : 'Last seen recently'
                    }
                  </Typography>
                </Box>
                <IconButton>
                  <VideoCall />
                </IconButton>
                <IconButton>
                  <Call />
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
                overflow: 'auto',
                p: 2,
                background: 'linear-gradient(to bottom, #e5ddd5 0%, #e5ddd5 100%)',
                backgroundImage: `
                  radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 2px, transparent 2px),
                  radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 2px, transparent 2px)
                `,
                backgroundSize: '20px 20px',
              }}
            >
              {activeConversation.messages.map((message) => (
                <Fade in={true} key={message.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'me' ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        p: 1.5,
                        borderRadius: message.sender === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        bgcolor: message.sender === 'me' ? '#dcf8c6' : 'white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative',
                      }}
                    >
                      <Box sx={{ mb: 0.5 }}>
                        {renderMessageContent(message)}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'right', fontSize: '0.7rem' }}
                      >
                        {formatTime(message.timestamp)}
                        {message.sender === 'me' && (
                          <span style={{ marginLeft: 4 }}>
                            {message.status === 'sent' && '✓'}
                            {message.status === 'delivered' && '✓✓'}
                            {message.status === 'read' && (
                              <span style={{ color: '#25D366' }}>✓✓</span>
                            )}
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                borderTop: '1px solid #e0e0e0',
              }}
            >
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
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
                    onClick={newMessage.trim() ? handleSendMessage : () => setShowVoiceRecorder(true)}
                    sx={{
                      bgcolor: '#25D366',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#128C7E',
                      },
                    }}
                  >
                    {newMessage.trim() ? <Send /> : <Mic />}
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
    </Box>
  );
};

export default ChatPage;