import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload } from '../types';
import { redisClient } from './redis';
import { messageHandlers } from './handlers/messageHandlers';
import { presenceHandlers } from './handlers/presenceHandlers';
import { typingHandlers } from './handlers/typingHandlers';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  phoneNumber: string;
}

import { Socket } from 'socket.io';

export class SocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        
        // Attach user info to socket
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).phoneNumber = decoded.phoneNumber;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      console.log(`User ${authSocket.userId} connected with socket ${socket.id}`);

      // Track connected user
      this.addUserConnection(authSocket.userId, socket.id);

      // Set up event handlers
      messageHandlers(authSocket, this.io, this.connectedUsers);
      presenceHandlers(authSocket, this.io, this.connectedUsers);
      typingHandlers(authSocket, this.io, this.connectedUsers);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${authSocket.userId} disconnected from socket ${socket.id}`);
        this.removeUserConnection(authSocket.userId, socket.id);
      });
    });
  }

  private addUserConnection(userId: string, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);

    // Update user online status in Redis
    redisClient.setUserOnline(userId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      
      // If no more connections for this user, mark as offline
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        redisClient.setUserOffline(userId);
      }
    }
  }

  public getConnectedUsers(): Map<string, Set<string>> {
    return this.connectedUsers;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  // Helper method to emit to specific users
  public emitToUser(userId: string, event: string, data: any) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Helper method to emit to multiple users
  public emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
}

export let socketServer: SocketServer;

export function initializeSocketServer(httpServer: HTTPServer): SocketServer {
  socketServer = new SocketServer(httpServer);
  return socketServer;
}