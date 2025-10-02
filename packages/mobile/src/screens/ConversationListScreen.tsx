import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList, Conversation } from '../types';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

type ConversationListNavigationProp = StackNavigationProp<RootStackParamList>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const ConversationListScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<ConversationListNavigationProp>();
  const { conversations, isLoading, loadConversations } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    // For direct conversations, show the other participant's name
    // This is a simplified version - in a real app, you'd fetch participant details
    return 'Direct Chat';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const { content, type, senderId } = conversation.lastMessage;
    const isOwnMessage = senderId === user?.id;
    const prefix = isOwnMessage ? 'You: ' : '';

    switch (type) {
      case 'text':
        return `${prefix}${content.text || ''}`;
      case 'image':
        return `${prefix}📷 Photo`;
      case 'video':
        return `${prefix}🎥 Video`;
      case 'audio':
        return `${prefix}🎵 Audio`;
      case 'document':
        return `${prefix}📄 Document`;
      default:
        return `${prefix}Message`;
    }
  };

  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      conversationName: getConversationName(conversation),
    });
  }, [navigation]);

  // Memoize conversation names to prevent unnecessary re-renders
  const conversationNames = useMemo(() => {
    const names: { [key: string]: string } = {};
    conversations.forEach(conv => {
      names[conv.id] = getConversationName(conv);
    });
    return names;
  }, [conversations]);

  // Optimize item extraction for FlatList
  const keyExtractor = useCallback((item: Conversation) => item.id, []);
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Fixed item height
    offset: 80 * index,
    index,
  }), []);

  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => {
    const hasUnreadMessages = false; // This would be calculated based on read status
    const conversationName = conversationNames[item.id];
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isTablet && styles.conversationItemTablet
        ]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
        delayPressIn={50} // Faster touch response
      >
        <View style={styles.avatarContainer}>
          {item.type === 'group' ? (
            <View style={[styles.groupAvatar, isTablet && styles.avatarTablet]}>
              <Icon name="group" size={isTablet ? 28 : 24} color="#666" />
            </View>
          ) : (
            <View style={[styles.userAvatar, isTablet && styles.avatarTablet]}>
              <Icon name="person" size={isTablet ? 28 : 24} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[
                styles.conversationName,
                isTablet && styles.conversationNameTablet
              ]} 
              numberOfLines={1}
            >
              {conversationName}
            </Text>
            <Text style={[
              styles.conversationTime,
              isTablet && styles.conversationTimeTablet
            ]}>
              {formatTime(item.lastActivity)}
            </Text>
          </View>

          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                hasUnreadMessages && styles.unreadMessage,
                isTablet && styles.lastMessageTablet,
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview(item)}
            </Text>
            {hasUnreadMessages && (
              <View style={[styles.unreadBadge, isTablet && styles.unreadBadgeTablet]}>
                <Text style={[styles.unreadCount, isTablet && styles.unreadCountTablet]}>1</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [conversationNames, handleConversationPress, isTablet]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No conversations yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start a new conversation to begin chatting
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('GroupCreation')}
          >
            <Icon name="group-add" size={24} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={24} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#25D366']}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // Performance optimization
        maxToRenderPerBatch={10} // Render fewer items per batch
        windowSize={10} // Smaller window size for better performance
        initialNumToRender={15} // Render more items initially for smooth scrolling
        updateCellsBatchingPeriod={50} // Batch updates for better performance
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : 16,
    paddingVertical: isTablet ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#25D366',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: isTablet ? 12 : 8,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    minHeight: 80, // Fixed height for performance
  },
  conversationItemTablet: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 90,
  },
  avatarContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTablet: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  conversationNameTablet: {
    fontSize: 18,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationTimeTablet: {
    fontSize: 14,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  lastMessageTablet: {
    fontSize: 16,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeTablet: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unreadCountTablet: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 60 : 40,
  },
  emptyStateText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: isTablet ? 16 : 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: isTablet ? 24 : 20,
  },
});

export default ConversationListScreen;