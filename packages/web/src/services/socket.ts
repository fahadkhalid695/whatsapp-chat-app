import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: any;
  type: string;
  timestamp: string;
  deliveredTo: string[];
  readBy: string[];
}

interface TypingEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private eventListeners: Map<string, Function[]> = new Map();
  private messageQueue: any[] = [];
  private isOnline = navigator.onLine;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.connectionStatus = 'connecting';
    const SOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
    });

    this.setupEventListeners();
    this.setupNetworkListeners();
    this.startHeartbeat();
  }

  private setupNetworkListeners() {
    // Handle network status changes
    window.addEventListener('online', () => {
      console.log('Network back online, reconnecting socket...');
      this.isOnline = true;
      if (!this.socket?.connected) {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network offline, socket will queue messages');
      this.isOnline = false;
      this.connectionStatus = 'disconnected';
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      
      // Subscribe to presence updates
      this.socket?.emit('subscribe-presence');
      
      // Mark user as online
      this.socket?.emit('user-online');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    // Message events
    this.socket.on('new-message', (message: Message) => {
      console.log('Received new message:', message);
      useChatStore.getState().addMessage(message);
    });

    this.socket.on('message-sent', (data: { tempId?: string; message: Message }) => {
      console.log('Message sent confirmation:', data);
      if (data.tempId) {
        useChatStore.getState().replaceTemporaryMessage(data.tempId, data.message);
      }
    });

    this.socket.on('message-error', (data: { error: string; tempId?: string }) => {
      console.error('Message error:', data);
      if (data.tempId) {
        useChatStore.getState().markMessageFailed(data.tempId, data.error);
      }
    });

    this.socket.on('message-delivered', (data: { messageId: string; userId: string; timestamp: string }) => {
      console.log('Message delivered:', data);
      useChatStore.getState().updateMessageStatus(data.messageId, 'delivered', data.userId);
    });

    this.socket.on('messages-read', (data: { messageIds: string[]; readBy: string; conversationId: string; timestamp: string }) => {
      console.log('Messages read:', data);
      data.messageIds.forEach(messageId => {
        useChatStore.getState().updateMessageStatus(messageId, 'read', data.readBy);
      });
    });

    this.socket.on('message-deleted', (data: { messageId: string; conversationId: string; deletedBy: string; timestamp: string }) => {
      console.log('Message deleted:', data);
      useChatStore.getState().markMessageDeleted(data.messageId);
    });

    this.socket.on('message-edited', (data: { messageId: string; content: any; conversationId: string; editedAt: Date; timestamp: string }) => {
      console.log('Message edited:', data);
      useChatStore.getState().updateMessageContent(data.messageId, data.content, data.editedAt);
    });

    // Typing events
    this.socket.on('user-typing', (data: { userId: string; conversationId: string; isTyping: boolean; timestamp: string }) => {
      console.log('User typing status:', data);
      if (data.isTyping) {
        useChatStore.getState().addTypingUser(data.conversationId, data.userId);
      } else {
        useChatStore.getState().removeTypingUser(data.conversationId, data.userId);
      }
    });

    this.socket.on('typing-users', (data: { conversationId: string; typingUsers: string[]; timestamp: string }) => {
      console.log('Typing users update:', data);
      useChatStore.getState().setTypingUsers(data.conversationId, data.typingUsers);
    });

    // Presence events
    this.socket.on('user-online', (data: { userId: string; timestamp: string }) => {
      console.log('User online:', data);
      useChatStore.getState().updateUserPresence(data.userId, true);
    });

    this.socket.on('user-offline', (data: { userId: string; lastSeen: string }) => {
      console.log('User offline:', data);
      useChatStore.getState().updateUserPresence(data.userId, false, new Date(data.lastSeen));
    });

    this.socket.on('presence-status', (data: { presence: Record<string, { isOnline: boolean; lastSeen: string }>; timestamp: string }) => {
      console.log('Presence status update:', data);
      Object.entries(data.presence).forEach(([userId, status]) => {
        useChatStore.getState().updateUserPresence(userId, status.isOnline, new Date(status.lastSeen));
      });
    });

    // Heartbeat
    this.socket.on('heartbeat-ack', (data: { timestamp: string }) => {
      console.log('Heartbeat acknowledged:', data.timestamp);
    });

    // Error handling
    this.socket.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
    });

    // Conversation events
    this.socket.on('joined-conversation', (data: { conversationId: string }) => {
      console.log('Joined conversation:', data.conversationId);
    });

    this.socket.on('left-conversation', (data: { conversationId: string }) => {
      console.log('Left conversation:', data.conversationId);
    });
  }

  private handleReconnect() {
    if (this.reconnectTimer) return; // Already attempting to reconnect

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
      
      console.log(`Attempting to reconnect in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('join-conversation', conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('leave-conversation', conversationId);
    }
  }

  sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'deliveredTo' | 'readBy'>) {
    if (this.socket) {
      this.socket.emit('send-message', message);
    }
  }

  startTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing-start', conversationId);
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing-stop', conversationId);
    }
  }

  markAsRead(messageIds: string[]) {
    if (this.socket) {
      this.socket.emit('mark-read', messageIds);
    }
  }

  // Add methods for sync service compatibility
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();