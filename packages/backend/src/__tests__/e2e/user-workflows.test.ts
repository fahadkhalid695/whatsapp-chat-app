import request from 'supertest';
import { Server as HTTPServer } from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app } from '../../index';
import { DatabaseConnection } from '../../database/connection';
import { SocketServer } from '../../socket';

describe('End-to-End User Workflows', () => {
  let server: HTTPServer;
  let socketServer: SocketServer;
  let clientSocket: ClientSocketType;
  let testUser1: any;
  let testUser2: any;
  let authToken1: string;
  let authToken2: string;

  beforeAll(async () => {
    // Setup test database
    await DatabaseConnection.getInstance().query('BEGIN');
    
    // Start server
    server = app.listen(0);
    const port = (server.address() as any).port;
    
    // Setup socket server
    socketServer = new SocketServer(server);
  });

  afterAll(async () => {
    // Cleanup
    clientSocket?.disconnect();
    socketServer?.close();
    server?.close();
    
    // Rollback test database changes
    await DatabaseConnection.getInstance().query('ROLLBACK');
  });

  describe('Complete User Registration and Authentication Flow', () => {
    it('should complete full registration workflow', async () => {
      const phoneNumber = '+1234567890';
      const displayName = 'Test User';

      // Step 1: Initiate phone verification
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber })
        .expect(200);

      expect(verificationResponse.body).toHaveProperty('verificationId');
      expect(verificationResponse.body.message).toBe('Verification code sent successfully');

      const { verificationId } = verificationResponse.body;

      // Step 2: Complete verification (using test code)
      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId,
          code: '123456', // Test verification code
          displayName,
        })
        .expect(200);

      expect(authResponse.body).toHaveProperty('user');
      expect(authResponse.body).toHaveProperty('tokens');
      expect(authResponse.body.user.phoneNumber).toBe(phoneNumber);
      expect(authResponse.body.user.displayName).toBe(displayName);

      testUser1 = authResponse.body.user;
      authToken1 = authResponse.body.tokens.accessToken;

      // Step 3: Verify user can access protected routes
      const profileResponse = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(profileResponse.body.id).toBe(testUser1.id);
      expect(profileResponse.body.phoneNumber).toBe(phoneNumber);
    });

    it('should handle token refresh workflow', async () => {
      // Get refresh token from previous test
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+0987654321' })
        .expect(200);

      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: verificationResponse.body.verificationId,
          code: '123456',
          displayName: 'Test User 2',
        })
        .expect(200);

      const refreshToken = authResponse.body.tokens.refreshToken;

      // Use refresh token to get new access token
      const refreshResponse = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body.accessToken).not.toBe(authResponse.body.tokens.accessToken);

      testUser2 = authResponse.body.user;
      authToken2 = refreshResponse.body.accessToken;
    });
  });

  describe('Contact Management Workflow', () => {
    it('should sync contacts and identify app users', async () => {
      const contacts = [
        { name: 'Test User 2', phoneNumber: '+0987654321' }, // This is testUser2
        { name: 'Non-App User', phoneNumber: '+5555555555' },
      ];

      const syncResponse = await request(server)
        .post('/api/users/sync-contacts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ contacts })
        .expect(200);

      expect(syncResponse.body.contacts).toHaveLength(2);
      
      const appUser = syncResponse.body.contacts.find((c: any) => c.isAppUser);
      const nonAppUser = syncResponse.body.contacts.find((c: any) => !c.isAppUser);

      expect(appUser).toBeDefined();
      expect(appUser.phoneNumber).toBe('+0987654321');
      expect(appUser.contactUserId).toBe(testUser2.id);

      expect(nonAppUser).toBeDefined();
      expect(nonAppUser.phoneNumber).toBe('+5555555555');
      expect(nonAppUser.contactUserId).toBeNull();
    });

    it('should search for users', async () => {
      const searchResponse = await request(server)
        .get('/api/users/search')
        .query({ query: 'Test User' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(searchResponse.body.users).toHaveLength(1);
      expect(searchResponse.body.users[0].displayName).toBe('Test User 2');
      expect(searchResponse.body.users[0].id).toBe(testUser2.id);
    });

    it('should block and unblock users', async () => {
      // Block user
      await request(server)
        .post(`/api/users/${testUser2.id}/block`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Verify user is blocked (search should not return blocked user)
      const searchResponse = await request(server)
        .get('/api/users/search')
        .query({ query: 'Test User' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(searchResponse.body.users).toHaveLength(0);

      // Unblock user
      await request(server)
        .post(`/api/users/${testUser2.id}/unblock`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Verify user is unblocked
      const searchAfterUnblock = await request(server)
        .get('/api/users/search')
        .query({ query: 'Test User' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(searchAfterUnblock.body.users).toHaveLength(1);
    });
  });

  describe('Conversation Management Workflow', () => {
    let directConversation: any;
    let groupConversation: any;

    it('should create direct conversation', async () => {
      const createResponse = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          type: 'direct',
          participants: [testUser2.id],
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.type).toBe('direct');
      expect(createResponse.body.participants).toContain(testUser1.id);
      expect(createResponse.body.participants).toContain(testUser2.id);

      directConversation = createResponse.body;
    });

    it('should create group conversation', async () => {
      const createResponse = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          type: 'group',
          name: 'Test Group Chat',
          participants: [testUser2.id],
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.type).toBe('group');
      expect(createResponse.body.name).toBe('Test Group Chat');
      expect(createResponse.body.participants).toContain(testUser1.id);
      expect(createResponse.body.participants).toContain(testUser2.id);
      expect(createResponse.body.admins).toContain(testUser1.id);

      groupConversation = createResponse.body;
    });

    it('should list user conversations', async () => {
      const listResponse = await request(server)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(listResponse.body.conversations).toHaveLength(2);
      expect(listResponse.body.total).toBe(2);

      const direct = listResponse.body.conversations.find((c: any) => c.type === 'direct');
      const group = listResponse.body.conversations.find((c: any) => c.type === 'group');

      expect(direct).toBeDefined();
      expect(group).toBeDefined();
      expect(group.name).toBe('Test Group Chat');
    });

    it('should get conversation details', async () => {
      const detailsResponse = await request(server)
        .get(`/api/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(detailsResponse.body.id).toBe(groupConversation.id);
      expect(detailsResponse.body.name).toBe('Test Group Chat');
      expect(detailsResponse.body.participants).toHaveLength(2);
    });

    it('should archive and unarchive conversation', async () => {
      // Archive conversation
      await request(server)
        .patch(`/api/conversations/${directConversation.id}/archive`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ archived: true })
        .expect(200);

      // Verify conversation is archived (not in default list)
      const listResponse = await request(server)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(listResponse.body.conversations).toHaveLength(1); // Only group conversation

      // Unarchive conversation
      await request(server)
        .patch(`/api/conversations/${directConversation.id}/archive`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ archived: false })
        .expect(200);

      // Verify conversation is back in list
      const listAfterUnarchive = await request(server)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(listAfterUnarchive.body.conversations).toHaveLength(2);
    });
  });

  describe('Messaging Workflow', () => {
    let testMessage: any;

    it('should send and receive messages', async () => {
      // Send message via API
      const sendResponse = await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: { text: 'Hello from E2E test!' },
          type: 'text',
        })
        .expect(201);

      expect(sendResponse.body).toHaveProperty('id');
      expect(sendResponse.body.content.text).toBe('Hello from E2E test!');
      expect(sendResponse.body.senderId).toBe(testUser1.id);

      testMessage = sendResponse.body;

      // Get messages from conversation
      const messagesResponse = await request(server)
        .get(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(messagesResponse.body.messages).toHaveLength(1);
      expect(messagesResponse.body.messages[0].id).toBe(testMessage.id);
    });

    it('should mark messages as read', async () => {
      // Mark message as read
      await request(server)
        .patch('/api/messages/read')
        .set('Authorization', `Bearer ${authToken2}`) // testUser2 marks as read
        .send({ messageIds: [testMessage.id] })
        .expect(200);

      // Verify read status
      const messageResponse = await request(server)
        .get(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(messageResponse.body.readBy).toContain(testUser2.id);
    });

    it('should edit messages', async () => {
      const editResponse = await request(server)
        .patch(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: { text: 'Edited message content' },
        })
        .expect(200);

      expect(editResponse.body.content.text).toBe('Edited message content');
      expect(editResponse.body.editedAt).toBeDefined();
    });

    it('should delete messages', async () => {
      await request(server)
        .delete(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Verify message is deleted
      const messageResponse = await request(server)
        .get(`/api/messages/${testMessage.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(messageResponse.body.isDeleted).toBe(true);
    });

    it('should search messages', async () => {
      // Send a few more messages for search
      await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: { text: 'Searchable message about cats' },
          type: 'text',
        })
        .expect(201);

      await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: { text: 'Another message about dogs' },
          type: 'text',
        })
        .expect(201);

      // Search for messages
      const searchResponse = await request(server)
        .get('/api/messages/search')
        .query({ query: 'cats' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(searchResponse.body.messages).toHaveLength(1);
      expect(searchResponse.body.messages[0].content.text).toContain('cats');

      // Search within specific conversation
      const conversationSearchResponse = await request(server)
        .get('/api/messages/search')
        .query({ 
          query: 'message',
          conversationId: directConversation.id,
        })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(conversationSearchResponse.body.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Integration Workflow', () => {
    beforeAll(async () => {
      // Connect socket client
      const port = (server.address() as any).port;
      clientSocket = ClientSocket(`http://localhost:${port}`, {
        auth: { token: authToken1 },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => clientSocket.on('connect', resolve));
    });

    it('should integrate API and WebSocket messaging', async () => {
      // Join conversation via WebSocket
      clientSocket.emit('join-conversation', directConversation.id);

      // Listen for real-time message
      const messagePromise = new Promise<any>((resolve) => {
        clientSocket.on('new-message', resolve);
      });

      // Send message via API (should trigger WebSocket event)
      await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken2}`) // Different user sends
        .send({
          content: { text: 'API to WebSocket integration test' },
          type: 'text',
        })
        .expect(201);

      // Verify WebSocket received the message
      const receivedMessage = await messagePromise;
      expect(receivedMessage.content.text).toBe('API to WebSocket integration test');
      expect(receivedMessage.senderId).toBe(testUser2.id);
    });

    it('should handle typing indicators in real-time', (done) => {
      clientSocket.emit('join-conversation', directConversation.id);

      // Listen for typing indicator
      clientSocket.on('user-typing', (data) => {
        expect(data.userId).toBe(testUser1.id);
        expect(data.isTyping).toBe(true);
        done();
      });

      // Simulate typing
      setTimeout(() => {
        clientSocket.emit('typing-start', { conversationId: directConversation.id });
      }, 100);
    });

    it('should sync presence status', (done) => {
      clientSocket.on('user-online', (data) => {
        expect(data.userId).toBe(testUser1.id);
        done();
      });

      clientSocket.emit('user-online');
    });
  });

  describe('Media Upload Workflow', () => {
    it('should upload and retrieve media files', async () => {
      // Create a test file buffer
      const testImageBuffer = Buffer.from('fake-image-data');

      // Upload media file
      const uploadResponse = await request(server)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken1}`)
        .attach('file', testImageBuffer, 'test-image.jpg')
        .expect(201);

      expect(uploadResponse.body).toHaveProperty('mediaId');
      expect(uploadResponse.body).toHaveProperty('url');
      expect(uploadResponse.body.fileName).toBe('test-image.jpg');

      const mediaId = uploadResponse.body.mediaId;

      // Send media message
      const messageResponse = await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: {
            mediaId,
            mediaType: 'image',
            mediaUrl: uploadResponse.body.url,
          },
          type: 'image',
        })
        .expect(201);

      expect(messageResponse.body.type).toBe('image');
      expect(messageResponse.body.content.mediaId).toBe(mediaId);

      // Get media info
      const mediaInfoResponse = await request(server)
        .get(`/api/media/${mediaId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(mediaInfoResponse.body.id).toBe(mediaId);
      expect(mediaInfoResponse.body.originalName).toBe('test-image.jpg');
    });
  });

  describe('Group Management Workflow', () => {
    it('should manage group participants', async () => {
      // Create a third user for group management
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+3333333333' })
        .expect(200);

      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: verificationResponse.body.verificationId,
          code: '123456',
          displayName: 'Test User 3',
        })
        .expect(200);

      const testUser3 = authResponse.body.user;

      // Add participant to group
      await request(server)
        .post(`/api/conversations/${groupConversation.id}/participants`)
        .set('Authorization', `Bearer ${authToken1}`) // Admin adds participant
        .send({ userIds: [testUser3.id] })
        .expect(200);

      // Verify participant was added
      const conversationResponse = await request(server)
        .get(`/api/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(conversationResponse.body.participants).toContain(testUser3.id);
      expect(conversationResponse.body.participants).toHaveLength(3);

      // Remove participant from group
      await request(server)
        .delete(`/api/conversations/${groupConversation.id}/participants/${testUser3.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Verify participant was removed
      const updatedConversationResponse = await request(server)
        .get(`/api/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(updatedConversationResponse.body.participants).not.toContain(testUser3.id);
      expect(updatedConversationResponse.body.participants).toHaveLength(2);
    });

    it('should handle group admin management', async () => {
      // Promote user to admin
      await request(server)
        .patch(`/api/conversations/${groupConversation.id}/admins`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ userId: testUser2.id, isAdmin: true })
        .expect(200);

      // Verify user is now admin
      const conversationResponse = await request(server)
        .get(`/api/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(conversationResponse.body.admins).toContain(testUser2.id);

      // Demote user from admin
      await request(server)
        .patch(`/api/conversations/${groupConversation.id}/admins`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ userId: testUser2.id, isAdmin: false })
        .expect(200);

      // Verify user is no longer admin
      const updatedConversationResponse = await request(server)
        .get(`/api/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(updatedConversationResponse.body.admins).not.toContain(testUser2.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unauthorized access attempts', async () => {
      // Try to access conversation without being a participant
      const unauthorizedConversation = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          type: 'direct',
          participants: ['some-other-user-id'],
        });

      // Try to access this conversation with testUser1 (not a participant)
      await request(server)
        .get(`/api/conversations/${unauthorizedConversation.body.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(403);
    });

    it('should handle invalid data gracefully', async () => {
      // Invalid conversation creation
      await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          type: 'invalid-type',
          participants: [],
        })
        .expect(400);

      // Invalid message content
      await request(server)
        .post(`/api/conversations/${directConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: null,
          type: 'text',
        })
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      // Send multiple requests rapidly to trigger rate limiting
      const promises = Array.from({ length: 20 }, () =>
        request(server)
          .get('/api/conversations')
          .set('Authorization', `Bearer ${authToken1}`)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});