import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { redisClient } from '../redis';
import { MessageService } from '../../services/message';
import { ConversationService } from '../../services/conversation';
import { SyncService } from '../../services/sync';
import { OfflineQueueService } from '../../services/offlineQueue';
import { SendMessageRequest } from '../../types';

export function messageHandlers(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  connectedUsers: Map<string, Set<string>>
) {
  // Join conversation room
  socket.on('join-conversation', async (conversationId: string) => {
    try {
      // Verify user is participant in conversation
      const conversation = await ConversationService.getConversationById(conversationId, socket.userId);
      
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      // Join the conversation room
      socket.join(`conversation:${conversationId}`);
      
      // Send any queued messages for this user
      const queuedMessages = await redisClient.getQueuedMessages(socket.userId);
      if (queuedMessages.length > 0) {
        const conversationMessages = queuedMessages.filter(msg => msg.conversationId === conversationId);
        conversationMessages.forEach(message => {
          socket.emit('new-message', message);
        });
      }

      socket.emit('joined-conversation', { conversationId });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    socket.emit('left-conversation', { conversationId });
  });

  // Send message
  socket.on('send-message', async (data: SendMessageRequest) => {
    try {
      // Validate the message data
      if (!data.conversationId || !data.content || !data.type) {
        socket.emit('message-error', { 
          error: 'Invalid message data',
          tempId: data.tempId 
        });
        return;
      }

      // Verify user is participant in conversation
      const conversation = await ConversationService.getConversationById(data.conversationId, socket.userId);
      
      if (!conversation) {
        socket.emit('message-error', { 
          error: 'Conversation not found or access denied',
          tempId: data.tempId 
        });
        return;
      }

      // Create the message
      const message = await MessageService.sendMessage(
        socket.userId,
        data.conversationId,
        data.content,
        data.type,
        data.replyTo
      );

      // Emit to all participants in the conversation
      io.to(`conversation:${data.conversationId}`).emit('new-message', message);

      // Track delivery for online users and queue for offline users
      const participants = conversation.participants.filter(p => p !== socket.userId);
      
      for (const participantId of participants) {
        const participantSockets = connectedUsers.get(participantId);
        
        if (participantSockets && participantSockets.size > 0) {
          // User is online - track delivery
          await redisClient.trackMessageDelivery(message.id, participantId);
          
          // Emit delivery confirmation to sender
          socket.emit('message-delivered', {
            messageId: message.id,
            userId: participantId,
            timestamp: new Date().toISOString(),
          });
        } else {
          // User is offline - queue message
          await redisClient.queueMessage(participantId, message);
        }
      }

      // Confirm message sent to sender
      socket.emit('message-sent', {
        tempId: data.tempId,
        message,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { 
        error: 'Failed to send message',
        tempId: data.tempId 
      });
    }
  });

  // Mark messages as read
  socket.on('mark-read', async (data: { messageIds: string[]; conversationId: string; deviceId?: string }) => {
    try {
      if (!data.messageIds || !Array.isArray(data.messageIds) || data.messageIds.length === 0) {
        return;
      }

      // Mark messages as read in database and sync across devices
      await SyncService.syncReadReceipts(socket.userId, data.messageIds, data.deviceId);

      // Track read status in Redis
      for (const messageId of data.messageIds) {
        await redisClient.trackMessageRead(messageId, socket.userId);
      }

      // Get the messages to find their senders
      const messages = await MessageService.getMessagesByIds(data.messageIds);
      
      // Notify senders about read receipts
      const senderIds = [...new Set(messages.map(msg => msg.senderId))];
      
      for (const senderId of senderIds) {
        if (senderId !== socket.userId) {
          const senderSockets = connectedUsers.get(senderId);
          if (senderSockets && senderSockets.size > 0) {
            senderSockets.forEach(socketId => {
              io.to(socketId).emit('messages-read', {
                messageIds: data.messageIds.filter(id => 
                  messages.find(msg => msg.id === id && msg.senderId === senderId)
                ),
                readBy: socket.userId,
                conversationId: data.conversationId,
                timestamp: new Date().toISOString(),
              });
            });
          }
        }
      }

    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // Delete message
  socket.on('delete-message', async (data: { messageId: string; conversationId: string }) => {
    try {
      // Verify user owns the message or is admin
      const message = await MessageService.getMessageById(data.messageId, socket.userId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      if (message.senderId !== socket.userId) {
        // Check if user is admin of group conversation
        const conversation = await ConversationService.getConversationById(data.conversationId, socket.userId);
        if (!conversation || conversation.type !== 'group' || !conversation.admins?.includes(socket.userId)) {
          socket.emit('error', { message: 'Not authorized to delete this message' });
          return;
        }
      }

      // Delete the message
      await MessageService.deleteMessage(data.messageId, socket.userId);

      // Notify all participants
      io.to(`conversation:${data.conversationId}`).emit('message-deleted', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        deletedBy: socket.userId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Edit message
  socket.on('edit-message', async (data: { messageId: string; content: any; conversationId: string }) => {
    try {
      // Verify user owns the message
      const message = await MessageService.getMessageById(data.messageId, socket.userId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      if (message.senderId !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to edit this message' });
        return;
      }

      // Edit the message
      const updatedMessage = await MessageService.editMessageContent(data.messageId, data.content);

      // Notify all participants
      io.to(`conversation:${data.conversationId}`).emit('message-edited', {
        messageId: data.messageId,
        content: data.content,
        conversationId: data.conversationId,
        editedAt: updatedMessage.editedAt,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Request message delivery status
  socket.on('get-message-status', async (data: { messageId: string }) => {
    try {
      const status = await redisClient.getMessageDeliveryStatus(data.messageId);
      
      socket.emit('message-status', {
        messageId: data.messageId,
        delivered: status.delivered,
        read: status.read,
      });

    } catch (error) {
      console.error('Error getting message status:', error);
      socket.emit('error', { message: 'Failed to get message status' });
    }
  });
}

// Extend the SendMessageRequest interface to include tempId for client-side tracking
declare module '../../types' {
  interface SendMessageRequest {
    tempId?: string;
  }
}