import { Server as HTTPServer } from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseConnection } from '../../database/connection';
import { AuthService } from '../../services/auth';
import { ConversationService } from '../../services/conversation';
import { SocketServer } from '../../socket';

describe('Performance Tests - Concurrent Users', () => {
  let server: HTTPServer;
  let socketServer: SocketServer;
  let testUsers: any[] = [];
  let authTokens: string[] = [];
  let testConversation: any;

  beforeAll(async () => {
    // Setup test database
    await DatabaseConnection.getInstance().query('BEGIN');
    
    // Start server
    server = app.listen(0);
    const port = (server.address() as any).port;
    
    // Setup socket server
    socketServer = new SocketServer(server);

    // Create test users
    const userCount = 50;
    for (let i = 0; i < userCount; i++) {
      const phoneNumber = `+1${String(i).padStart(9, '0')}`;
      const displayName = `Test User ${i + 1}`;
      
      const user = await AuthService.createTestUser(phoneNumber, displayName);
      const token = AuthService.generateAccessToken(user.id);
      
      testUsers.push(user);
      authTokens.push(token);
    }

    // Create a group conversation with all users
    testConversation = await ConversationService.createConversation(testUsers[0].id, {
      type: 'group',
      name: 'Performance Test Group',
      participants: testUsers.slice(1, 20).map(u => u.id), // First 20 users
    });
  });

  afterAll(async () => {
    // Cleanup
    socketServer?.close();
    server?.close();
    
    // Rollback test database changes
    await DatabaseConnection.getInstance().query('ROLLBACK');
  });

  describe('Concurrent API Requests', () => {
    it('should handle concurrent user authentication', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        request(server)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authTokens[i]}`)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
      });

      // Should complete within reasonable time (5 seconds for 20 concurrent requests)
      expect(duration).toBeLessThan(5000);
      
      console.log(`Concurrent authentication test: ${concurrentRequests} requests in ${duration}ms`);
      console.log(`Average response time: ${duration / concurrentRequests}ms per request`);
    });

    it('should handle concurrent conversation creation', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        request(server)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${authTokens[i]}`)
          .send({
            type: 'direct',
            participants: [testUsers[(i + 1) % testUsers.length].id],
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.type).toBe('direct');
      });

      expect(duration).toBeLessThan(3000);
      
      console.log(`Concurrent conversation creation: ${concurrentRequests} requests in ${duration}ms`);
    });

    it('should handle concurrent message sending', async () => {
      const concurrentMessages = 30;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentMessages }, (_, i) => 
        request(server)
          .post(`/api/conversations/${testConversation.id}/messages`)
          .set('Authorization', `Bearer ${authTokens[i % 20]}`) // Cycle through first 20 users
          .send({
            content: { text: `Concurrent message ${i + 1}` },
            type: 'text',
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.body.content.text).toBe(`Concurrent message ${i + 1}`);
      });

      expect(duration).toBeLessThan(5000);
      
      console.log(`Concurrent message sending: ${concurrentMessages} messages in ${duration}ms`);
      console.log(`Message throughput: ${(concurrentMessages / duration * 1000).toFixed(2)} messages/second`);
    });

    it('should handle concurrent message retrieval', async () => {
      const concurrentRequests = 25;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        request(server)
          .get(`/api/conversations/${testConversation.id}/messages`)
          .set('Authorization', `Bearer ${authTokens[i % 20]}`)
          .query({ limit: 50, offset: 0 })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('messages');
        expect(Array.isArray(response.body.messages)).toBe(true);
      });

      expect(duration).toBeLessThan(3000);
      
      console.log(`Concurrent message retrieval: ${concurrentRequests} requests in ${duration}ms`);
    });
  });

  describe('Concurrent WebSocket Connections', () => {
    it('should handle multiple simultaneous WebSocket connections', async () => {
      const connectionCount = 20;
      const port = (server.address() as any).port;
      const clients: ClientSocketType[] = [];

      const startTime = Date.now();

      // Create multiple concurrent connections
      const connectionPromises = Array.from({ length: connectionCount }, (_, i) => {
        const client = ClientSocket(`http://localhost:${port}`, {
          auth: { token: authTokens[i] },
          transports: ['websocket'],
        });
        clients.push(client);

        return new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });
      });

      await Promise.all(connectionPromises);
      const connectionTime = Date.now() - startTime;

      // All clients should be connected
      clients.forEach(client => {
        expect(client.connected).toBe(true);
      });

      console.log(`${connectionCount} WebSocket connections established in ${connectionTime}ms`);

      // Test concurrent message broadcasting
      const messagePromises: Promise<any>[] = [];
      
      // All clients join the conversation
      clients.forEach(client => {
        client.emit('join-conversation', testConversation.id);
        
        // Each client (except the first) listens for messages
        if (clients.indexOf(client) > 0) {
          messagePromises.push(new Promise(resolve => {
            client.on('new-message', resolve);
          }));
        }
      });

      const broadcastStartTime = Date.now();

      // First client sends a message
      clients[0].emit('send-message', {
        conversationId: testConversation.id,
        content: { text: 'Broadcast test message' },
        type: 'text',
      });

      // Wait for all other clients to receive the message
      await Promise.all(messagePromises);
      const broadcastTime = Date.now() - broadcastStartTime;

      console.log(`Message broadcast to ${connectionCount - 1} clients in ${broadcastTime}ms`);

      // Cleanup connections
      clients.forEach(client => client.disconnect());
    });

    it('should handle concurrent typing indicators', async () => {
      const clientCount = 15;
      const port = (server.address() as any).port;
      const clients: ClientSocketType[] = [];

      // Connect clients
      const connectionPromises = Array.from({ length: clientCount }, (_, i) => {
        const client = ClientSocket(`http://localhost:${port}`, {
          auth: { token: authTokens[i] },
          transports: ['websocket'],
        });
        clients.push(client);

        return new Promise<void>((resolve) => {
          client.on('connect', () => {
            client.emit('join-conversation', testConversation.id);
            resolve();
          });
        });
      });

      await Promise.all(connectionPromises);

      // Track typing indicators received by the first client
      const typingIndicators: any[] = [];
      clients[0].on('user-typing', (data) => {
        typingIndicators.push(data);
      });

      const startTime = Date.now();

      // All other clients start typing simultaneously
      clients.slice(1).forEach(client => {
        client.emit('typing-start', { conversationId: testConversation.id });
      });

      // Wait for typing indicators to be received
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should receive typing indicators from all other clients
      expect(typingIndicators.length).toBe(clientCount - 1);

      console.log(`${clientCount - 1} typing indicators processed in ${duration}ms`);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });

    it('should handle rapid message sending via WebSocket', async () => {
      const clientCount = 10;
      const messagesPerClient = 5;
      const port = (server.address() as any).port;
      const clients: ClientSocketType[] = [];

      // Connect clients
      const connectionPromises = Array.from({ length: clientCount }, (_, i) => {
        const client = ClientSocket(`http://localhost:${port}`, {
          auth: { token: authTokens[i] },
          transports: ['websocket'],
        });
        clients.push(client);

        return new Promise<void>((resolve) => {
          client.on('connect', () => {
            client.emit('join-conversation', testConversation.id);
            resolve();
          });
        });
      });

      await Promise.all(connectionPromises);

      // Track messages received by the first client
      const receivedMessages: any[] = [];
      clients[0].on('new-message', (message) => {
        receivedMessages.push(message);
      });

      const startTime = Date.now();

      // All clients send multiple messages rapidly
      const sendPromises: Promise<void>[] = [];
      clients.slice(1).forEach((client, clientIndex) => {
        for (let i = 0; i < messagesPerClient; i++) {
          sendPromises.push(new Promise<void>((resolve) => {
            setTimeout(() => {
              client.emit('send-message', {
                conversationId: testConversation.id,
                content: { text: `Rapid message from client ${clientIndex + 1}, message ${i + 1}` },
                type: 'text',
              });
              resolve();
            }, Math.random() * 100); // Random delay up to 100ms
          }));
        }
      });

      await Promise.all(sendPromises);

      // Wait for all messages to be received
      const expectedMessageCount = (clientCount - 1) * messagesPerClient;
      await new Promise<void>((resolve) => {
        const checkMessages = () => {
          if (receivedMessages.length >= expectedMessageCount) {
            resolve();
          } else {
            setTimeout(checkMessages, 100);
          }
        };
        checkMessages();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(receivedMessages.length).toBe(expectedMessageCount);

      console.log(`${expectedMessageCount} rapid messages processed in ${duration}ms`);
      console.log(`WebSocket message throughput: ${(expectedMessageCount / duration * 1000).toFixed(2)} messages/second`);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Database Performance Under Load', () => {
    it('should handle concurrent database queries efficiently', async () => {
      const queryCount = 100;
      const startTime = Date.now();

      // Simulate concurrent database operations
      const promises = Array.from({ length: queryCount }, async (_, i) => {
        const db = DatabaseConnection.getInstance();
        
        // Mix of different query types
        if (i % 3 === 0) {
          // User lookup
          return db.query('SELECT * FROM users WHERE id = $1', [testUsers[i % testUsers.length].id]);
        } else if (i % 3 === 1) {
          // Conversation lookup
          return db.query('SELECT * FROM conversations WHERE id = $1', [testConversation.id]);
        } else {
          // Message count
          return db.query('SELECT COUNT(*) FROM messages WHERE conversation_id = $1', [testConversation.id]);
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All queries should succeed
      results.forEach(result => {
        expect(result.rows).toBeDefined();
      });

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`${queryCount} concurrent database queries in ${duration}ms`);
      console.log(`Database query throughput: ${(queryCount / duration * 1000).toFixed(2)} queries/second`);
    });

    it('should handle concurrent message insertions', async () => {
      const messageCount = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: messageCount }, (_, i) => {
        const senderId = testUsers[i % 20].id; // Cycle through first 20 users
        return DatabaseConnection.getInstance().query(
          `INSERT INTO messages (conversation_id, sender_id, content, type) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            testConversation.id,
            senderId,
            JSON.stringify({ text: `Concurrent DB message ${i + 1}` }),
            'text'
          ]
        );
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All insertions should succeed
      results.forEach(result => {
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toHaveProperty('id');
      });

      expect(duration).toBeLessThan(3000);

      console.log(`${messageCount} concurrent message insertions in ${duration}ms`);
      console.log(`Database insertion throughput: ${(messageCount / duration * 1000).toFixed(2)} insertions/second`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create load with multiple operations
      const operations = [
        // API requests
        ...Array.from({ length: 20 }, (_, i) => 
          request(server)
            .get('/api/conversations')
            .set('Authorization', `Bearer ${authTokens[i % 10]}`)
        ),
        
        // Database queries
        ...Array.from({ length: 30 }, (_, i) => 
          DatabaseConnection.getInstance().query(
            'SELECT * FROM messages WHERE conversation_id = $1 LIMIT 10',
            [testConversation.id]
          )
        ),
      ];

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log('Memory usage:');
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle connection cleanup properly', async () => {
      const connectionCount = 25;
      const port = (server.address() as any).port;
      const clients: ClientSocketType[] = [];

      // Create connections
      const connectionPromises = Array.from({ length: connectionCount }, (_, i) => {
        const client = ClientSocket(`http://localhost:${port}`, {
          auth: { token: authTokens[i % 20] },
          transports: ['websocket'],
        });
        clients.push(client);

        return new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });
      });

      await Promise.all(connectionPromises);

      // All clients should be connected
      expect(clients.filter(c => c.connected)).toHaveLength(connectionCount);

      // Disconnect all clients
      clients.forEach(client => client.disconnect());

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // All clients should be disconnected
      expect(clients.filter(c => c.connected)).toHaveLength(0);

      console.log(`Successfully cleaned up ${connectionCount} WebSocket connections`);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle authentication failures gracefully under load', async () => {
      const requestCount = 20;
      const invalidToken = 'invalid-token-12345';

      const promises = Array.from({ length: requestCount }, () => 
        request(server)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${invalidToken}`)
      );

      const responses = await Promise.all(promises);

      // All requests should fail with 401
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });

      console.log(`Handled ${requestCount} authentication failures gracefully`);
    });

    it('should handle database connection errors under load', async () => {
      // This test would require temporarily breaking database connection
      // For now, we'll test with invalid queries
      const queryCount = 15;

      const promises = Array.from({ length: queryCount }, () => 
        DatabaseConnection.getInstance().query('SELECT * FROM non_existent_table')
          .catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(promises);

      // All queries should fail gracefully
      results.forEach(result => {
        expect(result).toHaveProperty('error');
      });

      console.log(`Handled ${queryCount} database errors gracefully`);
    });
  });
});