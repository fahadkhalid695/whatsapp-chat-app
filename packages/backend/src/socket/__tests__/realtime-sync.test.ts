import { Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { SocketServer } from '../index';

describe('Real-time Synchronization', () => {
  let httpServer: HTTPServer;
  let socketServerInstance: SocketServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let token1: string;
  let token2: string;

  beforeAll((done) => {
    httpServer = new HTTPServer();
    socketServerInstance = new SocketServer(httpServer);
    
    // Create test tokens
    token1 = jwt.sign({ userId: 'user1', phoneNumber: '+1234567890' }, config.jwt.secret);
    token2 = jwt.sign({ userId: 'user2', phoneNumber: '+1234567891' }, config.jwt.secret);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any)?.port;
      
      // Create client connections
      clientSocket1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 },
        transports: ['websocket'],
      });
      
      clientSocket2 = Client(`http://localhost:${port}`, {
        auth: { token: token2 },
        transports: ['websocket'],
      });
      
      let connectedCount = 0;
      const checkConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          done();
        }
      };
      
      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });
  });

  afterAll(() => {
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    httpServer.close();
  });

  describe('Message Synchronization', () => {
    it('should deliver messages in real-time', (done) => {
      const conversationId = 'test-conversation-1';
      const testMessage = {
        conversationId,
        content: { text: 'Hello, World!' },
        type: 'text',
      };

      // Both clients join the conversation
      clientSocket1.emit('join-conversation', conversationId);
      clientSocket2.emit('join-conversation', conversationId);

      // Client 2 listens for new messages
      clientSocket2.on('new-message', (message) => {
        expect(message.content.text).toBe('Hello, World!');
        expect(message.senderId).toBe('user1');
        expect(message.conversationId).toBe(conversationId);
        done();
      });

      // Client 1 sends a message
      setTimeout(() => {
        clientSocket1.emit('send-message', testMessage);
      }, 100);
    });

    it('should track message delivery status', (done) => {
      const conversationId = 'test-conversation-2';
      const testMessage = {
        conversationId,
        content: { text: 'Delivery test' },
        type: 'text',
        tempId: 'temp-123',
      };

      clientSocket1.emit('join-conversation', conversationId);
      clientSocket2.emit('join-conversation', conversationId);

      // Client 1 listens for delivery confirmation
      clientSocket1.on('message-delivered', (data) => {
        expect(data.userId).toBe('user2');
        expect(data.messageId).toBeDefined();
        done();
      });

      // Client 1 sends message
      clientSocket1.emit('send-message', testMessage);
    });

    it('should sync read receipts', (done) => {
      const conversationId = 'test-conversation-3';
      const messageIds = ['msg-1', 'msg-2'];

      clientSocket1.emit('join-conversation', conversationId);
      clientSocket2.emit('join-conversation', conversationId);

      // Client 1 listens for read receipts
      clientSocket1.on('messages-read', (data) => {
        expect(data.messageIds).toEqual(messageIds);
        expect(data.readBy).toBe('user2');
        expect(data.conversationId).toBe(conversationId);
        done();
      });

      // Client 2 marks messages as read
      setTimeout(() => {
        clientSocket2.emit('mark-read', { messageIds, conversationId });
      }, 100);
    });
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing status', (done) => {
      const conversationId = 'test-conversation-4';

      clientSocket1.emit('join-conversation', conversationId);
      clientSocket2.emit('join-conversation', conversationId);

      // Client 2 listens for typing indicators
      clientSocket2.on('user-typing', (data) => {
        expect(data.userId).toBe('user1');
        expect(data.conversationId).toBe(conversationId);
        expect(data.isTyping).toBe(true);
        done();
      });

      // Client 1 starts typing
      setTimeout(() => {
        clientSocket1.emit('typing-start', { conversationId });
      }, 100);
    });

    it('should stop typing indicators', (done) => {
      const conversationId = 'test-conversation-5';

      clientSocket1.emit('join-conversation', conversationId);
      clientSocket2.emit('join-conversation', conversationId);

      let typingStartReceived = false;

      clientSocket2.on('user-typing', (data) => {
        if (!typingStartReceived && data.isTyping) {
          typingStartReceived = true;
          // Stop typing after receiving start
          setTimeout(() => {
            clientSocket1.emit('typing-stop', { conversationId });
          }, 50);
        } else if (typingStartReceived && !data.isTyping) {
          expect(data.userId).toBe('user1');
          expect(data.conversationId).toBe(conversationId);
          done();
        }
      });

      // Start typing
      clientSocket1.emit('typing-start', { conversationId });
    });
  });

  describe('Presence Status', () => {
    it('should track user online status', (done) => {
      // Client 2 listens for presence updates
      clientSocket2.on('user-online', (data) => {
        expect(data.userId).toBe('user1');
        expect(data.timestamp).toBeDefined();
        done();
      });

      // Client 1 goes online
      clientSocket1.emit('user-online');
    });

    it('should get presence status for multiple users', (done) => {
      clientSocket1.on('presence-status', (data) => {
        expect(data.presence).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });

      // Request presence for user2
      clientSocket1.emit('get-presence', { userIds: ['user2'] });
    });
  });

  describe('Connection Management', () => {
    it('should handle reconnection', (done) => {
      const originalSocket = clientSocket1;
      
      // Disconnect
      originalSocket.disconnect();
      
      // Reconnect
      const newSocket = Client(`http://localhost:${(httpServer.address() as any)?.port}`, {
        auth: { token: token1 },
        transports: ['websocket'],
      });
      
      newSocket.on('connect', () => {
        expect(newSocket.connected).toBe(true);
        newSocket.disconnect();
        done();
      });
    });

    it('should handle heartbeat', (done) => {
      clientSocket1.on('heartbeat-ack', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket1.emit('heartbeat');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation access', (done) => {
      clientSocket1.on('error', (data) => {
        expect(data.message).toContain('Conversation not found');
        done();
      });

      // Try to join non-existent conversation
      clientSocket1.emit('join-conversation', 'invalid-conversation-id');
    });

    it('should handle message send errors', (done) => {
      clientSocket1.on('message-error', (data) => {
        expect(data.error).toBeDefined();
        expect(data.tempId).toBe('temp-error-test');
        done();
      });

      // Send invalid message
      clientSocket1.emit('send-message', {
        conversationId: '', // Invalid conversation ID
        content: {},
        type: 'text',
        tempId: 'temp-error-test',
      });
    });
  });
});