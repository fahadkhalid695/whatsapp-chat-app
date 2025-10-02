import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { DatabaseConnection } from '../../database/connection';
import { AuthService } from '../../services/auth';
import { MessageService } from '../../services/message';
import { ConversationService } from '../../services/conversation';
import { SocketServer } from '../../socket';
import { config } from '../../config';

describe('Message Flow Integration Tests', () => {
  let httpServer: HTTPServer;
  let socketServer: SocketServer;
  let clientSocket1: ClientSocketType;
  let clientSocket2: ClientSocketType;
  let testUser1: any;
  let testUser2: any;
  let testConversation: any;
  let authToken1: string;
  let authToken2: string;

  beforeAll(async () => {
    // Setup test database
    await DatabaseConnection.getInstance().query('BEGIN');
    
    // Create test users
    testUser1 = await AuthService.createTestUser('+1234567890', 'Test User 1');
    testUser2 = await AuthService.createTestUser('+0987654321', 'Test User 2');
    
    // Generate auth tokens
    authToken1 = AuthService.generateAccessToken(testUser1.id);
    authToken2 = AuthService.generateAccessToken(testUser2.id);
    
    // Create test conversation
    testConversation = await ConversationService.createConversation(testUser1.id, {
      type: 'direct',
      participants: [testUser2.id],
    });

    // Setup socket server
    httpServer = new HTTPServer();
    socketServer = new SocketServer(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, resolve);
    });

    const port = (httpServer.address() as any).port;

    // Connect clients
    clientSocket1 = ClientSocket(`http://localhost:${port}`, {
      auth: { token: authToken1 },
      transports: ['websocket'],
    });

    clientSocket2 = ClientSocket(`http://localhost:${port}`, {
      auth: { token: authToken2 },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => clientSocket1.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket2.on('connect', resolve)),
    ]);
  });

  afterAll(async () => {
    // Cleanup
    clientSocket1?.disconnect();
    clientSocket2?.disconnect();
    socketServer?.close();
    httpServer?.close();
    
    // Rollback test database changes
    await DatabaseConnection.getInstance().query('ROLLBACK');
  });

  beforeEach(() => {
    // Clear event listeners
    clientSocket1.removeAllListeners();
    clientSocket2.removeAllListeners();
  });

  describe('Real-time Message Delivery', () => {
    it('should deliver messages in real-time between users', (done) => {
      const testMessage = {
        conversationId: testConversation.id,
        content: { text: 'Hello from integration test!' },
        type: 'text',
      };

      // Both clients join the conversation
      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      // Client 2 listens for new messages
      clientSocket2.on('new-message', (message) => {
        expect(message).toMatchObject({
          conversationId: testConversation.id,
          senderId: testUser1.id,
          content: { text: 'Hello from integration test!' },
          type: 'text',
        });
        expect(message.id).toBeDefined();
        expect(message.timestamp).toBeDefined();
        done();
      });

      // Client 1 sends a message
      setTimeout(() => {
        clientSocket1.emit('send-message', testMessage);
      }, 100);
    });

    it('should track message delivery status', (done) => {
      const testMessage = {
        conversationId: testConversation.id,
        content: { text: 'Delivery test message' },
        type: 'text',
      };

      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      let messageId: string;

      // Client 1 listens for delivery confirmation
      clientSocket1.on('message-delivered', (data) => {
        expect(data.messageId).toBe(messageId);
        expect(data.deliveredTo).toContain(testUser2.id);
        done();
      });

      // Client 2 receives message and triggers delivery
      clientSocket2.on('new-message', (message) => {
        messageId = message.id;
        // Delivery is automatically tracked when message is received
      });

      // Client 1 sends message
      clientSocket1.emit('send-message', testMessage);
    });

    it('should sync read receipts across devices', (done) => {
      const testMessage = {
        conversationId: testConversation.id,
        content: { text: 'Read receipt test' },
        type: 'text',
      };

      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      let messageId: string;

      // Client 1 listens for read receipts
      clientSocket1.on('message-read', (data) => {
        expect(data.messageId).toBe(messageId);
        expect(data.readBy).toBe(testUser2.id);
        done();
      });

      // Client 2 receives message and marks as read
      clientSocket2.on('new-message', (message) => {
        messageId = message.id;
        // Mark message as read
        setTimeout(() => {
          clientSocket2.emit('mark-read', {
            messageIds: [messageId],
            conversationId: testConversation.id,
          });
        }, 50);
      });

      // Client 1 sends message
      clientSocket1.emit('send-message', testMessage);
    });
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing indicators', (done) => {
      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      // Client 2 listens for typing indicators
      clientSocket2.on('user-typing', (data) => {
        expect(data.userId).toBe(testUser1.id);
        expect(data.conversationId).toBe(testConversation.id);
        expect(data.isTyping).toBe(true);
        done();
      });

      // Client 1 starts typing
      setTimeout(() => {
        clientSocket1.emit('typing-start', { conversationId: testConversation.id });
      }, 100);
    });

    it('should stop typing indicators', (done) => {
      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      let typingStartReceived = false;

      clientSocket2.on('user-typing', (data) => {
        if (!typingStartReceived && data.isTyping) {
          typingStartReceived = true;
          // Stop typing after receiving start
          setTimeout(() => {
            clientSocket1.emit('typing-stop', { conversationId: testConversation.id });
          }, 50);
        } else if (typingStartReceived && !data.isTyping) {
          expect(data.userId).toBe(testUser1.id);
          done();
        }
      });

      // Start typing
      clientSocket1.emit('typing-start', { conversationId: testConversation.id });
    });
  });

  describe('Presence Status', () => {
    it('should track user online status', (done) => {
      // Client 2 listens for presence updates
      clientSocket2.on('user-online', (data) => {
        expect(data.userId).toBe(testUser1.id);
        done();
      });

      // Client 1 goes online (already connected, but emit explicit online status)
      clientSocket1.emit('user-online');
    });

    it('should track user offline status', (done) => {
      // Client 2 listens for presence updates
      clientSocket2.on('user-offline', (data) => {
        expect(data.userId).toBe(testUser1.id);
        done();
      });

      // Client 1 goes offline
      clientSocket1.disconnect();
    });
  });

  describe('Message Persistence', () => {
    it('should persist messages to database', async () => {
      const testMessage = {
        conversationId: testConversation.id,
        content: { text: 'Persistence test message' },
        type: 'text',
      };

      // Send message via socket
      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket1.emit('send-message', testMessage);

      // Wait for message to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify message was saved to database
      const messages = await MessageService.getMessages(testConversation.id, testUser1.id);
      
      expect(messages.messages).toHaveLength(1);
      expect(messages.messages[0]).toMatchObject({
        conversationId: testConversation.id,
        senderId: testUser1.id,
        content: { text: 'Persistence test message' },
        type: 'text',
      });
    });

    it('should handle offline message queuing', async () => {
      const testMessage = {
        conversationId: testConversation.id,
        content: { text: 'Offline queue test' },
        type: 'text',
      };

      // Disconnect client 2
      clientSocket2.disconnect();

      // Client 1 sends message while client 2 is offline
      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket1.emit('send-message', testMessage);

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reconnect client 2
      clientSocket2 = ClientSocket(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: { token: authToken2 },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => clientSocket2.on('connect', resolve));

      // Client 2 should receive queued messages
      return new Promise<void>((resolve) => {
        clientSocket2.on('new-message', (message) => {
          expect(message.content.text).toBe('Offline queue test');
          resolve();
        });

        // Join conversation to trigger message sync
        clientSocket2.emit('join-conversation', testConversation.id);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation ID', (done) => {
      clientSocket1.on('error', (error) => {
        expect(error.code).toBe('CONVERSATION_NOT_FOUND');
        done();
      });

      clientSocket1.emit('send-message', {
        conversationId: 'invalid-conversation-id',
        content: { text: 'This should fail' },
        type: 'text',
      });
    });

    it('should handle unauthorized conversation access', (done) => {
      // Create a conversation that testUser1 is not part of
      ConversationService.createConversation(testUser2.id, {
        type: 'direct',
        participants: ['some-other-user-id'],
      }).then((unauthorizedConversation) => {
        clientSocket1.on('error', (error) => {
          expect(error.code).toBe('UNAUTHORIZED');
          done();
        });

        clientSocket1.emit('send-message', {
          conversationId: unauthorizedConversation.id,
          content: { text: 'This should fail' },
          type: 'text',
        });
      });
    });

    it('should handle malformed message content', (done) => {
      clientSocket1.on('error', (error) => {
        expect(error.code).toBe('INVALID_MESSAGE_CONTENT');
        done();
      });

      clientSocket1.emit('send-message', {
        conversationId: testConversation.id,
        content: null, // Invalid content
        type: 'text',
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent messages', async () => {
      const messageCount = 10;
      const messages: any[] = [];

      clientSocket1.emit('join-conversation', testConversation.id);
      clientSocket2.emit('join-conversation', testConversation.id);

      // Client 2 collects all messages
      const messagePromise = new Promise<void>((resolve) => {
        let receivedCount = 0;
        clientSocket2.on('new-message', (message) => {
          messages.push(message);
          receivedCount++;
          if (receivedCount === messageCount) {
            resolve();
          }
        });
      });

      // Client 1 sends multiple messages rapidly
      for (let i = 0; i < messageCount; i++) {
        clientSocket1.emit('send-message', {
          conversationId: testConversation.id,
          content: { text: `Message ${i + 1}` },
          type: 'text',
        });
      }

      await messagePromise;

      expect(messages).toHaveLength(messageCount);
      
      // Verify messages are in correct order
      for (let i = 0; i < messageCount; i++) {
        expect(messages[i].content.text).toBe(`Message ${i + 1}`);
      }
    });

    it('should handle multiple users in group conversation', async () => {
      // Create additional test users
      const testUser3 = await AuthService.createTestUser('+1111111111', 'Test User 3');
      const testUser4 = await AuthService.createTestUser('+2222222222', 'Test User 4');
      
      const authToken3 = AuthService.generateAccessToken(testUser3.id);
      const authToken4 = AuthService.generateAccessToken(testUser4.id);

      // Create group conversation
      const groupConversation = await ConversationService.createConversation(testUser1.id, {
        type: 'group',
        name: 'Test Group',
        participants: [testUser2.id, testUser3.id, testUser4.id],
      });

      // Connect additional clients
      const clientSocket3 = ClientSocket(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: { token: authToken3 },
        transports: ['websocket'],
      });

      const clientSocket4 = ClientSocket(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: { token: authToken4 },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise<void>((resolve) => clientSocket3.on('connect', resolve)),
        new Promise<void>((resolve) => clientSocket4.on('connect', resolve)),
      ]);

      // All clients join the group
      [clientSocket1, clientSocket2, clientSocket3, clientSocket4].forEach(client => {
        client.emit('join-conversation', groupConversation.id);
      });

      const testMessage = {
        conversationId: groupConversation.id,
        content: { text: 'Group message test' },
        type: 'text',
      };

      // Track message delivery to all participants
      const deliveryPromises = [
        new Promise<void>((resolve) => clientSocket2.on('new-message', resolve)),
        new Promise<void>((resolve) => clientSocket3.on('new-message', resolve)),
        new Promise<void>((resolve) => clientSocket4.on('new-message', resolve)),
      ];

      // Client 1 sends message
      clientSocket1.emit('send-message', testMessage);

      // Wait for all deliveries
      await Promise.all(deliveryPromises);

      // Cleanup
      clientSocket3.disconnect();
      clientSocket4.disconnect();
    });
  });
});