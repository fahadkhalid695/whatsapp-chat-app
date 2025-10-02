import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import authRoutes from './routes/auth';

const app = express();

console.log('🚀 Starting WhatsApp Chat Backend (Minimal Version)...');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Simple health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-chat-backend-minimal',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
  });
});

// API routes - only auth for now
app.use('/api/auth', authRoutes);

// Simple test endpoint
app.get('/api/test', (_req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
  });
});

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
    message: err.message,
  });
});

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`🚀 WhatsApp Chat Backend (Minimal) running on http://${HOST}:${PORT}`);
  console.log(`📱 Environment: ${config.server.nodeEnv}`);
  console.log(`🔐 JWT Secret configured: ${!!config.jwt.secret}`);
  console.log(`📧 SMS Provider: ${config.sms.provider}`);
  console.log('✅ Server started successfully!');
});

export default app;