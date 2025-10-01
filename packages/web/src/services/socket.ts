import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { Message } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.handleReconnect();
    });

    this.socket.on('new-message', (message: Message) => {
      useChatStore.getState().addMessage(message);
    });

    this.socket.on('message-delivered', (messageId: string) => {
      useChatStore.getState().updateMessage(messageId, { 
        deliveredTo: ['delivered'] 
      });
    });

    this.socket.on('message-read', (messageId: string, readBy: string) => {
      const currentMessage = Object.values(useChatStore.getState().messages)
        .flat()
        .find(msg => msg.id === messageId);
      
      if (currentMessage) {
        useChatStore.getState().updateMessage(messageId, {
          readBy: [...currentMessage.readBy, readBy]
        });
      }
    });

    this.socket.on('user-typing', (userId: string, conversationId: string) => {
      // Handle typing indicators
      console.log(`User ${userId} is typing in conversation ${conversationId}`);
    });

    this.socket.on('user-online', (userId: string) => {
      console.log(`User ${userId} is online`);
    });

    this.socket.on('user-offline', (userId: string) => {
      console.log(`User ${userId} is offline`);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 1000 * this.reconnectAttempts);
    }
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
}

export const socketService = new SocketService();