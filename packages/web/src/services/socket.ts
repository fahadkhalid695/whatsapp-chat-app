import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Join user's personal room for notifications
      const user = useAuthStore.getState().user;
      if (user) {
        this.socket?.emit('join-user-room', user.id);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      // Auto-reconnect with exponential backoff
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    // Message events
    this.socket.on('new-message', (message) => {
      console.log('📨 New message received:', message);
      const { addMessage } = useChatStore.getState();
      
      // Convert backend message format to frontend format
      const frontendMessage = {
        id: message.id,
        text: message.content.text || '',
        sender: message.senderId === useAuthStore.getState().user?.id ? 'me' : 'other',
        timestamp: new Date(message.timestamp),
        status: 'delivered' as const,
        type: message.type,
        mediaUrl: message.content.mediaUrl,
        fileName: message.content.fileName,
        replyTo: message.replyTo,
      };
      
      addMessage(message.conversationId, frontendMessage);
    });

    this.socket.on('message-status-update', (data) => {
      console.log('📋 Message status update:', data);
      // Update message status in store
      // This would need to be implemented in the chat store
    });

    // Typing events
    this.socket.on('user-typing', (data) => {
      console.log('⌨️ User typing:', data);
      const { setTyping } = useChatStore.getState();
      setTyping(data.conversationId, true);
      
      // Clear typing after 3 seconds
      setTimeout(() => {
        setTyping(data.conversationId, false);
      }, 3000);
    });

    this.socket.on('user-stopped-typing', (data) => {
      console.log('⏹️ User stopped typing:', data);
      const { setTyping } = useChatStore.getState();
      setTyping(data.conversationId, false);
    });

    // Presence events
    this.socket.on('user-online', (data) => {
      console.log('🟢 User online:', data);
      const { updateContactStatus } = useChatStore.getState();
      updateContactStatus(data.userId, true);
    });

    this.socket.on('user-offline', (data) => {
      console.log('🔴 User offline:', data);
      const { updateContactStatus } = useChatStore.getState();
      updateContactStatus(data.userId, false);
    });

    // Conversation events
    this.socket.on('conversation-updated', (conversation) => {
      console.log('💬 Conversation updated:', conversation);
      // Update conversation in store
    });

    this.socket.on('added-to-conversation', (conversation) => {
      console.log('➕ Added to conversation:', conversation);
      // Add new conversation to store
    });

    this.socket.on('removed-from-conversation', (data) => {
      console.log('➖ Removed from conversation:', data);
      // Remove conversation from store
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Message methods
  sendMessage(conversationId: string, content: any, type: string = 'text', replyTo?: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }

    this.socket.emit('send-message', {
      conversationId,
      content,
      type,
      replyTo,
    });
  }

  editMessage(messageId: string, content: any) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('edit-message', {
      messageId,
      content,
    });
  }

  deleteMessage(messageId: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('delete-message', {
      messageId,
    });
  }

  // Typing methods
  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('start-typing', {
      conversationId,
    });
  }

  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('stop-typing', {
      conversationId,
    });
  }

  // Conversation methods
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('join-conversation', {
      conversationId,
    });
  }

  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('leave-conversation', {
      conversationId,
    });
  }

  // Read receipts
  markAsRead(conversationId: string, messageIds: string[]) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('mark-as-read', {
      conversationId,
      messageIds,
    });
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;