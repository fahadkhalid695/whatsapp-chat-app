import React, { useState, useRef } from 'react';
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
  const [message, setMessage] = useState('');
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<null | HTMLElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage({ text: message.trim() }, 'text');
      setMessage('');
    }
  };

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

  const handleFileUpload = async (file: File, type: MessageType) => {
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real app, you would upload the file to your media service
      // For now, we'll create a mock URL
      const mockUrl = URL.createObjectURL(file);
      
      const content: MessageContent = {
        mediaUrl: mockUrl,
        fileName: file.name,
        fileSize: file.size,
        mediaType: type === 'document' ? 'document' : 
                  type === 'image' ? 'image' : 
                  type === 'video' ? 'video' : 'audio',
      };

      // If it's an image, create a thumbnail
      if (type === 'image') {
        content.thumbnailUrl = mockUrl;
      }

      onSendMessage(content, type);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      handleAttachClose();
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
      handleFileUpload(file, 'image');
    }
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'video');
    }
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'document');
    }
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
        onChange={(e) => setMessage(e.target.value)}
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
    </Box>
  );
};

export default MessageInput;