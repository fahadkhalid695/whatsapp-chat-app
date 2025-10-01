import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { redisClient } from '../redis';
import { ConversationService } from '../../services/conversation';

export function typingHandlers(
  socket: AuthenticatedSocket,
  _io: SocketIOServer,
  _connectedUsers: Map<string, Set<string>>
) {
  // Handle typing start
  socket.on('typing-start', async (data: { conversationId: string }) => {
    try {
      if (!data.conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Verify user is participant in conversation
      const conversation = await ConversationService.getConversationById(data.conversationId, socket.userId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      // Set typing status in Redis
      await redisClient.setUserTyping(socket.userId, data.conversationId);

      // Notify other participants in the conversation
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: true,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error handling typing start:', error);
      socket.emit('error', { message: 'Failed to update typing status' });
    }
  });

  // Handle typing stop
  socket.on('typing-stop', async (data: { conversationId: string }) => {
    try {
      if (!data.conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Verify user is participant in conversation
      const conversation = await ConversationService.getConversationById(data.conversationId, socket.userId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      // Remove typing status from Redis
      await redisClient.setUserStoppedTyping(socket.userId, data.conversationId);

      // Notify other participants in the conversation
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error handling typing stop:', error);
      socket.emit('error', { message: 'Failed to update typing status' });
    }
  });

  // Get current typing users in a conversation
  socket.on('get-typing-users', async (data: { conversationId: string }) => {
    try {
      if (!data.conversationId) {
        socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Verify user is participant in conversation
      const conversation = await ConversationService.getConversationById(data.conversationId, socket.userId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      // Get typing users from Redis
      const typingUsers = await redisClient.getTypingUsers(data.conversationId);
      
      // Filter out the requesting user
      const otherTypingUsers = typingUsers.filter(userId => userId !== socket.userId);

      socket.emit('typing-users', {
        conversationId: data.conversationId,
        typingUsers: otherTypingUsers,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error getting typing users:', error);
      socket.emit('error', { message: 'Failed to get typing users' });
    }
  });

  // Auto-stop typing when user disconnects or leaves conversation
  socket.on('leave-conversation', async (conversationId: string) => {
    try {
      // Stop typing when leaving conversation
      await redisClient.setUserStoppedTyping(socket.userId, conversationId);
      
      // Notify other participants
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId: socket.userId,
        conversationId: conversationId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error stopping typing on leave conversation:', error);
    }
  });

  // Auto-stop typing when user disconnects
  socket.on('disconnect', async () => {
    try {
      // Get all conversations where user might be typing
      // This is a simplified approach - in production, you might want to track
      // which conversations the user was typing in
      const conversationsResult = await ConversationService.getUserConversations(socket.userId, {});
      
      for (const conversation of conversationsResult.conversations) {
        // Check if user was typing in this conversation
        const typingUsers = await redisClient.getTypingUsers(conversation.id);
        
        if (typingUsers.includes(socket.userId)) {
          // Stop typing
          await redisClient.setUserStoppedTyping(socket.userId, conversation.id);
          
          // Notify other participants
          socket.to(`conversation:${conversation.id}`).emit('user-typing', {
            userId: socket.userId,
            conversationId: conversation.id,
            isTyping: false,
            timestamp: new Date().toISOString(),
          });
        }
      }

    } catch (error) {
      console.error('Error cleaning up typing status on disconnect:', error);
    }
  });
}

// Set up automatic cleanup of expired typing indicators
export function setupTypingCleanup() {
  // Clean up expired typing indicators every 10 seconds
  setInterval(async () => {
    try {
      // This is a simplified cleanup - in production, you might want to use Redis keyspace notifications
      // or a more sophisticated approach to track and clean up expired typing indicators
      
      // For now, we rely on Redis TTL to automatically expire typing indicators
      // In production, you'd want to implement proper keyspace notifications
      console.log('Typing cleanup running (Redis TTL handles expiration automatically)');
      
    } catch (error) {
      console.error('Error in typing cleanup:', error);
    }
  }, 10000); // Run every 10 seconds
}