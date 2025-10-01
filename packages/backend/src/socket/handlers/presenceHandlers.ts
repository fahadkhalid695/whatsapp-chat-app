import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { redisClient } from '../redis';
import { UserService } from '../../services/user';

export function presenceHandlers(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  connectedUsers: Map<string, Set<string>>
) {
  // Handle user coming online
  socket.on('user-online', async () => {
    try {
      // Update presence in Redis
      await redisClient.setUserOnline(socket.userId);
      
      // Update database
      await UserService.updateUserPresence(socket.userId, true);

      // Get user's contacts to notify them
      const contacts = await UserService.getUserContacts(socket.userId);
      const contactIds = contacts
        .filter(contact => contact.contactUserId && !contact.isBlocked)
        .map(contact => contact.contactUserId!);

      // Notify contacts that user is online
      contactIds.forEach(contactId => {
        const contactSockets = connectedUsers.get(contactId);
        if (contactSockets && contactSockets.size > 0) {
          contactSockets.forEach(socketId => {
            io.to(socketId).emit('user-online', {
              userId: socket.userId,
              timestamp: new Date().toISOString(),
            });
          });
        }
      });

    } catch (error) {
      console.error('Error handling user online:', error);
    }
  });

  // Handle user going offline (handled in disconnect, but can be called explicitly)
  socket.on('user-offline', async () => {
    try {
      await handleUserOffline(socket, io, connectedUsers);
    } catch (error) {
      console.error('Error handling user offline:', error);
    }
  });

  // Get presence status for multiple users
  socket.on('get-presence', async (data: { userIds: string[] }) => {
    try {
      if (!data.userIds || !Array.isArray(data.userIds)) {
        socket.emit('error', { message: 'Invalid user IDs provided' });
        return;
      }

      const presenceData = await redisClient.getMultipleUserPresence(data.userIds);
      
      socket.emit('presence-status', {
        presence: presenceData,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error getting presence:', error);
      socket.emit('error', { message: 'Failed to get presence status' });
    }
  });

  // Subscribe to presence updates when user connects
  socket.on('subscribe-presence', async () => {
    try {
      // Get user's contacts
      const contacts = await UserService.getUserContacts(socket.userId);
      const contactIds = contacts
        .filter(contact => contact.contactUserId && !contact.isBlocked)
        .map(contact => contact.contactUserId!);

      // Get current presence for all contacts
      if (contactIds.length > 0) {
        const presenceData = await redisClient.getMultipleUserPresence(contactIds);
        
        socket.emit('presence-status', {
          presence: presenceData,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error('Error subscribing to presence:', error);
      socket.emit('error', { message: 'Failed to subscribe to presence updates' });
    }
  });

  // Handle heartbeat to maintain presence
  socket.on('heartbeat', async () => {
    try {
      // Update last seen timestamp
      await redisClient.setUserOnline(socket.userId);
      
      // Respond with heartbeat acknowledgment
      socket.emit('heartbeat-ack', {
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error handling heartbeat:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      await handleUserOffline(socket, io, connectedUsers);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
}

async function handleUserOffline(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  connectedUsers: Map<string, Set<string>>
) {
  // Check if user has other active connections
  const userSockets = connectedUsers.get(socket.userId);
  const hasOtherConnections = userSockets && userSockets.size > 1;

  if (!hasOtherConnections) {
    // User is going completely offline
    await redisClient.setUserOffline(socket.userId);
    
    // Update database
    await UserService.updateUserPresence(socket.userId, false);

    // Get user's contacts to notify them
    const contacts = await UserService.getUserContacts(socket.userId);
    const contactIds = contacts
      .filter(contact => contact.contactUserId && !contact.isBlocked)
      .map(contact => contact.contactUserId!);

    // Notify contacts that user is offline
    contactIds.forEach(contactId => {
      const contactSockets = connectedUsers.get(contactId);
      if (contactSockets && contactSockets.size > 0) {
        contactSockets.forEach(socketId => {
          io.to(socketId).emit('user-offline', {
            userId: socket.userId,
            lastSeen: new Date().toISOString(),
          });
        });
      }
    });
  }
}