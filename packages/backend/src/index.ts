import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import mediaRoutes from './routes/media';
import notificationRoutes from './routes/notifications';
import securityRoutes from './routes/security';
import syncRoutes from './routes/sync';
import { initializeSocketServer } from './socket';
import { redisClient } from './socket/redis';
import { setupTypingCleanup } from './socket/handlers/typingHandlers';
import { db } from './database/connection';
import { createNotificationService } from './services/notification';
import { CronService } from './services/cron';
import { OfflineQueueService } from './services/offlineQueue';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-chat-backend',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/sync', syncRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
  });
});

// Initialize services
async function startServer() {
  try {
    // Connect to database
    await db.connect();
    
    // Connect to Redis
    await redisClient.connect();
    
    // Initialize notification service
    createNotificationService();
    
    // Initialize Socket.io server
    initializeSocketServer(httpServer);
    
    // Set up typing cleanup
    setupTypingCleanup();
    
    // Start cron jobs
    CronService.startAll();
    
    // Initialize offline queue service
    OfflineQueueService.initialize();
    
    // Start HTTP server
    const PORT = config.server.port;
    const HOST = config.server.host;

    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 WhatsApp Chat Backend running on http://${HOST}:${PORT}`);
      logger.info(`📱 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔐 JWT Secret configured: ${!!config.jwt.secret}`);
      logger.info(`📧 SMS Provider: ${config.sms.provider}`);
      logger.info(`🔌 Socket.io server initialized`);
      logger.info(`📡 Redis connected`);
      logger.info(`🔔 Notification service initialized`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      CronService.stopAll();
      OfflineQueueService.stop();
      const notificationService = require('./services/notification').getNotificationService();
      notificationService.shutdown();
      await redisClient.disconnect();
      await db.close();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      CronService.stopAll();
      OfflineQueueService.stop();
      const notificationService = require('./services/notification').getNotificationService();
      notificationService.shutdown();
      await redisClient.disconnect();
      await db.close();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;