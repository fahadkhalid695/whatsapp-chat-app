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
import { initializeSocketServer } from './socket';
import { redisClient } from './socket/redis';
import { setupTypingCleanup } from './socket/handlers/typingHandlers';

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
  });
});

// Initialize services
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Initialize Socket.io server
    initializeSocketServer(httpServer);
    
    // Set up typing cleanup
    setupTypingCleanup();
    
    // Start HTTP server
    const PORT = config.server.port;
    const HOST = config.server.host;

    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 WhatsApp Chat Backend running on http://${HOST}:${PORT}`);
      console.log(`📱 Environment: ${config.server.nodeEnv}`);
      console.log(`🔐 JWT Secret configured: ${!!config.jwt.secret}`);
      console.log(`📧 SMS Provider: ${config.sms.provider}`);
      console.log(`🔌 Socket.io server initialized`);
      console.log(`📡 Redis connected`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await redisClient.disconnect();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await redisClient.disconnect();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;