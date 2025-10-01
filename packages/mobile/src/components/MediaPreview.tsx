import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaPreviewProps {
  visible: boolean;
  mediaUri: string;
  mediaType: 'image' | 'video' | 'document';
  fileName?: string;
  fileSize?: number;
  onClose: () => void;
  onSend: (caption?: string) => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  visible,
  mediaUri,
  mediaType,
  fileName,
  fileSize,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await onSend(caption.trim() || undefined);
      setCaption('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return (
          <Image
            source={{ uri: mediaUri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        );
      case 'video':
        return (
          <Video
            source={{ uri: mediaUri }}
            style={styles.videoPreview}
            controls
            resizeMode="contain"
            paused
          />
        );
      case 'document':
        return (
          <View style={styles.documentPreview}>
            <Icon name="description" size={64} color="#666" />
            <Text style={styles.documentName} numberOfLines={2}>
              {fileName || 'Document'}
            </Text>
            {fileSize && (
              <Text style={styles.documentSize}>
                {formatFileSize(fileSize)}
              </Text>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mediaType === 'image' ? 'Photo' : 
             mediaType === 'video' ? 'Video' : 'Document'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Media Content */}
        <ScrollView 
          style={styles.mediaContainer}
          contentContainerStyle={styles.mediaContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderMediaContent()}
        </ScrollView>

        {/* Caption Input and Send Button */}
        <View style={styles.inputContainer}>
          <View style={styles.captionInputContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              isLoading && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={isLoading}
          >
            <Icon 
              name={isLoading ? "hourglass-empty" : "send"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44, // Status bar height
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  mediaContainer: {
    flex: 1,
  },
  mediaContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  imagePreview: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  videoPreview: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  documentPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    margin: 20,
  },
  documentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: screenWidth - 80,
  },
  documentSize: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Safe area bottom
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  captionInputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
  },
  captionInput: {
    color: '#fff',
    fontSize: 16,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#25D366',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
});

export default MediaPreview;