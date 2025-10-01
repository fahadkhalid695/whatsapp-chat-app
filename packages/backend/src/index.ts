import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
  });
});

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`🚀 WhatsApp Chat Backend running on http://${HOST}:${PORT}`);
  console.log(`📱 Environment: ${config.server.nodeEnv}`);
  console.log(`🔐 JWT Secret configured: ${!!config.jwt.secret}`);
  console.log(`📧 SMS Provider: ${config.sms.provider}`);
});

export default app;