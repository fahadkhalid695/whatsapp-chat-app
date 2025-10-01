import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList, Message } from '../types';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { mediaService } from '../services/media';
import { socketService } from '../services/socket';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import MediaPicker from '../components/MediaPicker';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { conversationId, conversationName } = route.params;
  
  const {
    conversations,
    messages,
    isLoading,
    typingUsers,
    loadMessages,
    sendMessage,
    setActiveConversation,
    setTypingUsers,
  } = useChatStore();
  
  const { user } = useAuthStore();
  const conversationMessages = messages[conversationId] || [];

  useEffect(() => {
    // Check if this is a group conversation
    const conversation = conversations.find(c => c.id === conversationId);
    const isGroup = conversation?.type === 'group';
    
    navigation.setOptions({
      title: conversationName || 'Chat',
      headerRight: () => (
        isGroup ? (
          <TouchableOpacity
            style={{ paddingHorizontal: 16 }}
            onPress={() => navigation.navigate('GroupSettings', { conversationId })}
          >
            <Icon name="info" size={24} color="#25D366" />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, conversationName, conversationId, conversations]);

  useEffect(() => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);
    
    // Join conversation for real-time updates
    socketService.joinConversation(conversationId);

    return () => {
      setActiveConversation(null);
      // Leave conversation when screen unmounts
      socketService.leaveConversation(conversationId);
    };
  }, [conversationId]);

  const handleSendMessage = async (messageText: string) => {
    try {
      await sendMessage(conversationId, messageText);
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const handleAttachMedia = () => {
    setShowMediaPicker(true);
  };

  const handleMediaSelected = async (uri: string, type: 'image' | 'video', fileName?: string) => {
    try {
      // Upload media first
      const uploadResult = await mediaService.uploadMedia(uri, type, fileName);
      
      // Send message with media
      await sendMessage(conversationId, '', type);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send media');
    }
  };

  const handleStartTyping = () => {
    socketService.startTyping(conversationId);
  };

  const handleStopTyping = () => {
    socketService.stopTyping(conversationId);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const previousMessage = index > 0 ? conversationMessages[index - 1] : null;
    const showTimestamp = !previousMessage || 
      new Date(item.timestamp).getDate() !== new Date(previousMessage.timestamp).getDate();

    return (
      <MessageBubble
        message={item}
        showTimestamp={showTimestamp}
        onPress={() => {
          // Handle message press (e.g., show details)
        }}
        onLongPress={() => {
          // Handle long press (e.g., show options)
          Alert.alert(
            'Message Options',
            'What would you like to do?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Copy', onPress: () => console.log('Copy message') },
              { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete message') },
            ]
          );
        }}
      />
    );
  };

  const renderTypingIndicator = () => {
    const currentTypingUsers = typingUsers[conversationId] || [];
    const otherTypingUsers = currentTypingUsers.filter(userId => userId !== user?.id);
    
    if (otherTypingUsers.length === 0) return null;

    return (
      <View style={styles.typingIndicator}>
        <Text style={styles.typingText}>
          {otherTypingUsers.length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No messages yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start the conversation by sending a message
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            conversationMessages.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when new messages arrive
            if (conversationMessages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          onAttachMedia={handleAttachMedia}
          onStartTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          disabled={isLoading}
        />

        <MediaPicker
          visible={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onMediaSelected={handleMediaSelected}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ChatScreen;