import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MediaPicker from './MediaPicker';
import MediaPreview from './MediaPreview';
import { mediaService } from '../services/media';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onSendMedia?: (mediaId: string, mediaType: 'image' | 'video' | 'document', caption?: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  onStartTyping,
  onStopTyping,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'image' | 'video' | 'document';
    fileName?: string;
    fileSize?: number;
  } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Handle typing indicators
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onStartTyping?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping?.();
    }, 1000);
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    onSendMessage(trimmedMessage);
    setMessage('');
    setIsTyping(false);
    onStopTyping?.();

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleAttachPress = () => {
    Keyboard.dismiss();
    setShowMediaPicker(true);
  };

  const handleMediaSelected = (uri: string, type: 'image' | 'video' | 'document', fileName?: string, fileSize?: number) => {
    setSelectedMedia({ uri, type, fileName, fileSize });
    setShowMediaPicker(false);
    setShowMediaPreview(true);
  };

  const handleMediaSend = async (caption?: string) => {
    if (!selectedMedia || !onSendMedia) return;

    try {
      // Upload media to server
      const uploadResponse = await mediaService.uploadMedia(
        selectedMedia.uri,
        selectedMedia.type,
        selectedMedia.fileName
      );

      // Send media message
      await onSendMedia(uploadResponse.mediaId, selectedMedia.type, caption);

      // Reset state
      setSelectedMedia(null);
      setShowMediaPreview(false);
    } catch (error) {
      console.error('Failed to send media:', error);
      Alert.alert('Error', 'Failed to send media. Please try again.');
    }
  };

  const handleMediaPreviewClose = () => {
    setSelectedMedia(null);
    setShowMediaPreview(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachPress}
          disabled={disabled}
        >
          <Icon name="attach-file" size={24} color="#666" />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="Type a message..."
          value={message}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            message.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim() || disabled}
        >
          <Icon
            name="send"
            size={20}
            color={message.trim() ? '#fff' : '#999'}
          />
        </TouchableOpacity>
      </View>

      {/* Media Picker Modal */}
      <MediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onMediaSelected={handleMediaSelected}
      />

      {/* Media Preview Modal */}
      {selectedMedia && (
        <MediaPreview
          visible={showMediaPreview}
          mediaUri={selectedMedia.uri}
          mediaType={selectedMedia.type}
          fileName={selectedMedia.fileName}
          fileSize={selectedMedia.fileSize}
          onClose={handleMediaPreviewClose}
          onSend={handleMediaSend}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 50,
  },
  attachButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  sendButtonActive: {
    backgroundColor: '#25D366',
  },
  sendButtonInactive: {
    backgroundColor: 'transparent',
  },
});

export default MessageInput;