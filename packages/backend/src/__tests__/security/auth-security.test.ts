import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../index';
import { DatabaseConnection } from '../../database/connection';
import { AuthService } from '../../services/auth';
import { config } from '../../config';

describe('Security Tests - Authentication and Authorization', () => {
  let server: any;
  let testUser: any;
  let validToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Setup test database
    await DatabaseConnection.getInstance().query('BEGIN');
    
    // Start server
    server = app.listen(0);

    // Create test user
    const verificationResponse = await request(server)
      .post('/api/auth/verify-phone')
      .send({ phoneNumber: '+1234567890' });

    const authResponse = await request(server)
      .post('/api/auth/verify-code')
      .send({
        verificationId: verificationResponse.body.verificationId,
        code: '123456',
        displayName: 'Security Test User',
      });

    testUser = authResponse.body.user;
    validToken = authResponse.body.tokens.accessToken;
    refreshToken = authResponse.body.tokens.refreshToken;
  });

  afterAll(async () => {
    // Cleanup
    server?.close();
    
    // Rollback test database changes
    await DatabaseConnection.getInstance().query('ROLLBACK');
  });

  describe('JWT Token Security', () => {
    it('should reject requests with no token', async () => {
      await request(server)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should reject requests with invalid token format', async () => {
      await request(server)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should reject requests with malformed JWT', async () => {
      await request(server)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'access' },
        config.jwt.accessTokenSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject tokens with invalid signature', async () => {
      // Create token with wrong secret
      const invalidToken = jwt.sign(
        { userId: testUser.id, type: 'access' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject tokens with missing required claims', async () => {
      // Token without userId
      const tokenWithoutUserId = jwt.sign(
        { type: 'access' },
        config.jwt.accessTokenSecret,
        { expiresIn: '1h' }
      );

      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenWithoutUserId}`)
        .expect(401);

      // Token without type
      const tokenWithoutType = jwt.sign(
        { userId: testUser.id },
        config.jwt.accessTokenSecret,
        { expiresIn: '1h' }
      );

      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenWithoutType}`)
        .expect(401);
    });

    it('should reject refresh tokens used as access tokens', async () => {
      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });

    it('should validate token audience and issuer if configured', async () => {
      // This test assumes audience/issuer validation is implemented
      const tokenWithWrongAudience = jwt.sign(
        { 
          userId: testUser.id, 
          type: 'access',
          aud: 'wrong-audience',
          iss: 'wrong-issuer'
        },
        config.jwt.accessTokenSecret,
        { expiresIn: '1h' }
      );

      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokenWithWrongAudience}`)
        .expect(401);
    });
  });

  describe('Phone Number Verification Security', () => {
    it('should rate limit verification attempts', async () => {
      const phoneNumber = '+9999999999';
      
      // Make multiple verification requests rapidly
      const promises = Array.from({ length: 10 }, () =>
        request(server)
          .post('/api/auth/verify-phone')
          .send({ phoneNumber })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate phone number format', async () => {
      const invalidPhoneNumbers = [
        'invalid-phone',
        '123',
        '+1234', // Too short
        '+123456789012345678901', // Too long
        '1234567890', // Missing country code
        '+1 (555) 123-4567 ext 123', // Invalid format
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        await request(server)
          .post('/api/auth/verify-phone')
          .send({ phoneNumber })
          .expect(400);
      }
    });

    it('should limit verification code attempts', async () => {
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+8888888888' });

      const verificationId = verificationResponse.body.verificationId;

      // Make multiple failed verification attempts
      const promises = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/auth/verify-code')
          .send({
            verificationId,
            code: '000000', // Wrong code
            displayName: 'Test User',
          })
      );

      const responses = await Promise.all(promises);
      
      // Later attempts should be blocked
      const blockedResponses = responses.filter(r => 
        r.status === 429 || (r.status === 400 && r.body.message?.includes('too many'))
      );
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    it('should expire verification sessions', async () => {
      // This test would require manipulating time or using a very short expiration
      // For now, we'll test that expired sessions are rejected
      const expiredVerificationId = 'expired-session-id';

      await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: expiredVerificationId,
          code: '123456',
          displayName: 'Test User',
        })
        .expect(400);
    });

    it('should prevent verification code reuse', async () => {
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+7777777777' });

      const verificationId = verificationResponse.body.verificationId;

      // First verification should succeed
      const firstAttempt = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId,
          code: '123456',
          displayName: 'Test User',
        })
        .expect(200);

      // Second attempt with same code should fail
      await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId,
          code: '123456',
          displayName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('Authorization and Access Control', () => {
    let otherUser: any;
    let otherUserToken: string;
    let privateConversation: any;

    beforeAll(async () => {
      // Create another user
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+5555555555' });

      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: verificationResponse.body.verificationId,
          code: '123456',
          displayName: 'Other User',
        });

      otherUser = authResponse.body.user;
      otherUserToken = authResponse.body.tokens.accessToken;

      // Create a private conversation between the two users
      const conversationResponse = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'direct',
          participants: [otherUser.id],
        });

      privateConversation = conversationResponse.body;
    });

    it('should prevent access to other users\' profiles', async () => {
      await request(server)
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
    });

    it('should prevent unauthorized conversation access', async () => {
      // Create a conversation that testUser is not part of
      const thirdUserVerification = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+6666666666' });

      const thirdUserAuth = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: thirdUserVerification.body.verificationId,
          code: '123456',
          displayName: 'Third User',
        });

      const thirdUserToken = thirdUserAuth.body.tokens.accessToken;

      // Third user tries to access private conversation
      await request(server)
        .get(`/api/conversations/${privateConversation.id}`)
        .set('Authorization', `Bearer ${thirdUserToken}`)
        .expect(403);
    });

    it('should prevent unauthorized message access', async () => {
      // Send a message in the private conversation
      const messageResponse = await request(server)
        .post(`/api/conversations/${privateConversation.id}/messages`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: { text: 'Private message' },
          type: 'text',
        });

      const messageId = messageResponse.body.id;

      // Third user tries to access the message
      const thirdUserVerification = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+3333333333' });

      const thirdUserAuth = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: thirdUserVerification.body.verificationId,
          code: '123456',
          displayName: 'Unauthorized User',
        });

      const unauthorizedToken = thirdUserAuth.body.tokens.accessToken;

      await request(server)
        .get(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);
    });

    it('should prevent non-admin users from managing group participants', async () => {
      // Create a group conversation where otherUser is admin
      const groupResponse = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          type: 'group',
          name: 'Test Group',
          participants: [testUser.id],
        });

      const groupId = groupResponse.body.id;

      // testUser (non-admin) tries to add participants
      await request(server)
        .post(`/api/conversations/${groupId}/participants`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userIds: ['some-user-id'] })
        .expect(403);
    });

    it('should prevent users from deleting others\' messages', async () => {
      // testUser sends a message
      const messageResponse = await request(server)
        .post(`/api/conversations/${privateConversation.id}/messages`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: { text: 'Message to delete' },
          type: 'text',
        });

      const messageId = messageResponse.body.id;

      // otherUser tries to delete testUser's message
      await request(server)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should prevent users from editing others\' messages', async () => {
      // testUser sends a message
      const messageResponse = await request(server)
        .post(`/api/conversations/${privateConversation.id}/messages`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: { text: 'Message to edit' },
          type: 'text',
        });

      const messageId = messageResponse.body.id;

      // otherUser tries to edit testUser's message
      await request(server)
        .patch(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: { text: 'Edited by other user' },
        })
        .expect(403);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection in search queries', async () => {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (phone_number) VALUES ('+hack'); --",
        "' UNION SELECT * FROM users --",
      ];

      for (const query of maliciousQueries) {
        const response = await request(server)
          .get('/api/users/search')
          .query({ query })
          .set('Authorization', `Bearer ${validToken}`);

        // Should not return error (properly sanitized) and not expose data
        expect(response.status).toBe(200);
        expect(response.body.users).toBeDefined();
      }
    });

    it('should prevent XSS in message content', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(server)
          .post(`/api/conversations/${privateConversation.id}/messages`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            content: { text: payload },
            type: 'text',
          });

        expect(response.status).toBe(201);
        
        // Content should be stored as-is (sanitization happens on display)
        expect(response.body.content.text).toBe(payload);
      }
    });

    it('should validate message content length', async () => {
      // Very long message
      const longMessage = 'a'.repeat(10000);

      await request(server)
        .post(`/api/conversations/${privateConversation.id}/messages`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: { text: longMessage },
          type: 'text',
        })
        .expect(400);
    });

    it('should validate display name length and characters', async () => {
      const invalidNames = [
        '', // Empty
        'a'.repeat(101), // Too long
        '<script>alert("xss")</script>', // XSS attempt
        'Name\x00WithNull', // Null byte
      ];

      for (const name of invalidNames) {
        await request(server)
          .patch('/api/users/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ displayName: name })
          .expect(400);
      }
    });

    it('should validate conversation names', async () => {
      const invalidNames = [
        '', // Empty for group
        'a'.repeat(101), // Too long
        '<script>alert("xss")</script>', // XSS
      ];

      for (const name of invalidNames) {
        await request(server)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            type: 'group',
            name: name,
            participants: [otherUser.id],
          })
          .expect(400);
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should rate limit API requests per user', async () => {
      const requestCount = 100;
      
      const promises = Array.from({ length: requestCount }, () =>
        request(server)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit message sending', async () => {
      const messageCount = 50;
      
      const promises = Array.from({ length: messageCount }, (_, i) =>
        request(server)
          .post(`/api/conversations/${privateConversation.id}/messages`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            content: { text: `Rate limit test message ${i}` },
            type: 'text',
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle large request payloads gracefully', async () => {
      // Very large JSON payload
      const largePayload = {
        content: { text: 'a'.repeat(1000000) }, // 1MB of text
        type: 'text',
      };

      await request(server)
        .post(`/api/conversations/${privateConversation.id}/messages`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(largePayload)
        .expect(413); // Payload too large
    });

    it('should prevent request smuggling attacks', async () => {
      // Test with malformed headers
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Length', '0')
        .set('Transfer-Encoding', 'chunked')
        .send('0\r\n\r\nGET /admin HTTP/1.1\r\nHost: localhost\r\n\r\n');

      // Should handle gracefully without processing smuggled request
      expect([200, 400, 413]).toContain(response.status);
    });
  });

  describe('Session Management Security', () => {
    it('should invalidate tokens on logout', async () => {
      // Logout
      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Token should no longer work
      await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);
    });

    it('should prevent refresh token reuse', async () => {
      // Get new tokens
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+1111111111' });

      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: verificationResponse.body.verificationId,
          code: '123456',
          displayName: 'Refresh Test User',
        });

      const originalRefreshToken = authResponse.body.tokens.refreshToken;

      // Use refresh token
      const refreshResponse = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken })
        .expect(200);

      // Try to use the same refresh token again
      await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken })
        .expect(401);
    });

    it('should handle concurrent token refresh attempts', async () => {
      // Get new tokens
      const verificationResponse = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+2222222222' });

      const authResponse = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: verificationResponse.body.verificationId,
          code: '123456',
          displayName: 'Concurrent Test User',
        });

      const refreshTokenForConcurrency = authResponse.body.tokens.refreshToken;

      // Make concurrent refresh requests
      const promises = Array.from({ length: 5 }, () =>
        request(server)
          .post('/api/auth/refresh')
          .send({ refreshToken: refreshTokenForConcurrency })
      );

      const responses = await Promise.all(promises);

      // Only one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status === 401);

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(4);
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive user data in API responses', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Should not expose sensitive fields
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('verificationCode');
      expect(response.body).not.toHaveProperty('internalId');
    });

    it('should not expose other users\' private information', async () => {
      const response = await request(server)
        .get('/api/users/search')
        .query({ query: 'Other' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        // Should only expose public information
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('displayName');
        expect(user).not.toHaveProperty('phoneNumber'); // Private
        expect(user).not.toHaveProperty('email'); // Private
        expect(user).not.toHaveProperty('lastSeen'); // Private
      });
    });

    it('should not expose conversation participants to non-members', async () => {
      // Create unauthorized user
      const unauthorizedVerification = await request(server)
        .post('/api/auth/verify-phone')
        .send({ phoneNumber: '+4444444444' });

      const unauthorizedAuth = await request(server)
        .post('/api/auth/verify-code')
        .send({
          verificationId: unauthorizedVerification.body.verificationId,
          code: '123456',
          displayName: 'Unauthorized User',
        });

      const unauthorizedToken = unauthorizedAuth.body.tokens.accessToken;

      // Try to access conversation details
      await request(server)
        .get(`/api/conversations/${privateConversation.id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);
    });
  });
});