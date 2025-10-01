import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Message } from '../types';
import { useAuthStore } from '../store/authStore';

interface MessageBubbleProps {
  message: Message;
  showTimestamp?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onMediaPress?: (message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showTimestamp = false,
  onPress,
  onLongPress,
  onMediaPress,
}) => {
  const { user } = useAuthStore();
  const isOwnMessage = message.senderId === user?.id;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageStatusIcon = () => {
    if (!isOwnMessage) return null;

    if (message.readBy.length > 0) {
      return <Icon name="done-all" size={16} color="#4FC3F7" />;
    } else if (message.deliveredTo.length > 0) {
      return <Icon name="done-all" size={16} color="#999" />;
    } else {
      return <Icon name="done" size={16} color="#999" />;
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}>
            {message.content.text}
          </Text>
        );

      case 'image':
        return (
          <View style={styles.mediaContainer}>
            {message.content.mediaUrl && (
              <TouchableOpacity
                onPress={() => onMediaPress?.(message)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: message.content.mediaUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {message.content.text && (
              <Text style={[
                styles.messageText,
                styles.mediaCaption,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}>
                {message.content.text}
              </Text>
            )}
          </View>
        );

      case 'video':
        return (
          <View style={styles.mediaContainer}>
            <TouchableOpacity
              onPress={() => onMediaPress?.(message)}
              activeOpacity={0.8}
            >
              <View style={styles.videoPlaceholder}>
                {message.content.thumbnailUrl ? (
                  <Image
                    source={{ uri: message.content.thumbnailUrl }}
                    style={styles.videoThumbnail}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.playButton}>
                  <Icon name="play-circle-filled" size={48} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            {message.content.text && (
              <Text style={[
                styles.messageText,
                styles.mediaCaption,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}>
                {message.content.text}
              </Text>
            )}
          </View>
        );

      case 'document':
        return (
          <View style={styles.documentContainer}>
            <Icon name="description" size={24} color="#666" />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>
                {message.content.fileName || 'Document'}
              </Text>
              {message.content.fileSize && (
                <Text style={styles.documentSize}>
                  {(message.content.fileSize / 1024).toFixed(1)} KB
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return (
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}>
            Unsupported message type
          </Text>
        );
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
    ]}>
      <TouchableOpacity
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {renderMessageContent()}
        
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
          ]}>
            {formatTime(message.timestamp)}
          </Text>
          {getMessageStatusIcon()}
        </View>
      </TouchableOpacity>

      {showTimestamp && (
        <Text style={styles.timestampText}>
          {new Date(message.timestamp).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownMessageBubble: {
    backgroundColor: '#DCF8C6',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 4,
  },
  ownMessageTime: {
    color: '#666',
  },
  otherMessageTime: {
    color: '#999',
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginVertical: 8,
  },
  mediaContainer: {
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  mediaCaption: {
    marginTop: 4,
  },
  videoPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  videoThumbnail: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    width: 48,
    height: 48,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  documentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default MessageBubble;