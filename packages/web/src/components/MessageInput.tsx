import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Photo,
  Videocam,
  Description,
  EmojiEmotions,
} from '@mui/icons-material';
import { MessageContent, MessageType } from '../types';
import { socketService } from '../services/socket';
import { useChatStore } from '../store/chatStore';
import MediaPreview from './MediaPreview';

interface MessageInputProps {
  onSendMessage: (content: MessageContent, type: MessageType) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false,
}) => {
  const { activeConversationId } = useChatStore();
  const [message, setMessage] = useState('');
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<null | HTMLElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = () => {
    if (message.trim() && !disabled && !isLoading) {
      // Stop typing indicator
      handleStopTyping();
      
      onSendMessage({ text: message.trim() }, 'text');
      setMessage('');
    }
  };

  const handleStartTyping = useCallback(() => {
    if (!activeConversationId || isTyping) return;
    
    setIsTyping(true);
    socketService.startTyping(activeConversationId);
  }, [activeConversationId, isTyping]);

  const handleStopTyping = useCallback(() => {
    if (!activeConversationId || !isTyping) return;
    
    setIsTyping(false);
    socketService.stopTyping(activeConversationId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [activeConversationId, isTyping]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    if (value.trim()) {
      // Start typing if not already typing
      if (!isTyping) {
        handleStartTyping();
      }
      
      // Reset the typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 3000);
    } else {
      // Stop typing if message is empty
      handleStopTyping();
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && activeConversationId) {
        socketService.stopTyping(activeConversationId);
      }
    };
  }, [isTyping, activeConversationId]);

  // Stop typing when conversation changes
  useEffect(() => {
    if (isTyping) {
      handleStopTyping();
    }
  }, [activeConversationId]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
    setAttachMenuAnchor(event.currentTarget);
  };

  const handleAttachClose = () => {
    setAttachMenuAnchor(null);
  };

  const handleFileUpload = async (file: File, caption?: string) => {
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real app, you would upload the file to your media service
      // For now, we'll create a mock URL
      const mockUrl = URL.createObjectURL(file);
      
      const mediaType = file.type.startsWith('image/') ? 'image' :
                       file.type.startsWith('video/') ? 'video' : 'document';
      
      const messageType: MessageType = mediaType === 'document' ? 'document' : 
                                      mediaType === 'image' ? 'image' : 'video';
      
      const content: MessageContent = {
        text: caption,
        mediaUrl: mockUrl,
        fileName: file.name,
        fileSize: file.size,
        mediaType,
      };

      // If it's an image, create a thumbnail
      if (mediaType === 'image') {
        content.thumbnailUrl = mockUrl;
      }

      onSendMessage(content, messageType);
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = () => {
    imageInputRef.current?.click();
    handleAttachClose();
  };

  const handleVideoSelect = () => {
    videoInputRef.current?.click();
    handleAttachClose();
  };

  const handleDocumentSelect = () => {
    fileInputRef.current?.click();
    handleAttachClose();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleMediaPreviewClose = () => {
    setSelectedFile(null);
    setShowMediaPreview(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleVideoChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
        style={{ display: 'none' }}
        onChange={handleDocumentChange}
      />

      {/* Attachment button */}
      <IconButton
        onClick={handleAttachClick}
        disabled={disabled || isLoading || isUploading}
        sx={{ mb: 0.5 }}
      >
        {isUploading ? (
          <CircularProgress size={24} />
        ) : (
          <AttachFile />
        )}
      </IconButton>

      {/* Attachment menu */}
      <Menu
        anchorEl={attachMenuAnchor}
        open={Boolean(attachMenuAnchor)}
        onClose={handleAttachClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={handleImageSelect}>
          <ListItemIcon>
            <Photo />
          </ListItemIcon>
          <ListItemText>Photo</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleVideoSelect}>
          <ListItemIcon>
            <Videocam />
          </ListItemIcon>
          <ListItemText>Video</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDocumentSelect}>
          <ListItemIcon>
            <Description />
          </ListItemIcon>
          <ListItemText>Document</ListItemText>
        </MenuItem>
      </Menu>

      {/* Message input */}
      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder="Type a message..."
        value={message}
        onChange={(e) => handleMessageChange(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled || isLoading}
        variant="outlined"
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
          },
        }}
      />

      {/* Emoji button (placeholder) */}
      <IconButton
        disabled={disabled || isLoading}
        sx={{ mb: 0.5 }}
      >
        <EmojiEmotions />
      </IconButton>

      {/* Send button */}
      <IconButton
        onClick={handleSendMessage}
        disabled={!message.trim() || disabled || isLoading}
        color="primary"
        sx={{ mb: 0.5 }}
      >
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Send />
        )}
      </IconButton>

      {/* Media Preview Dialog */}
      <MediaPreview
        open={showMediaPreview}
        file={selectedFile}
        onClose={handleMediaPreviewClose}
        onSend={handleFileUpload}
      />
    </Box>
  );
};

export default MessageInput;