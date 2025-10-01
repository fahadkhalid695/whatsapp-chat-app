import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'whatsapp_chat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // SMS service configuration (for phone verification)
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
  },

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  },

  // Push notification configuration
  notification: {
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '10', 10),
    batchDelayMs: parseInt(process.env.NOTIFICATION_BATCH_DELAY_MS || '5000', 10),
    maxRetryAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || '30000', 10),
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },

  // Media storage configuration
  media: {
    storage: {
      type: process.env.MEDIA_STORAGE_TYPE || 'local', // 'local' or 's3'
      localPath: process.env.MEDIA_LOCAL_PATH || './uploads',
      s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET_NAME || 'whatsapp-chat-media',
        endpoint: process.env.S3_ENDPOINT, // For S3-compatible services
      },
    },
    validation: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
      image: {
        maxFileSize: parseInt(process.env.MAX_IMAGE_SIZE || '5242880', 10), // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      },
      video: {
        maxFileSize: parseInt(process.env.MAX_VIDEO_SIZE || '52428800', 10), // 50MB
        allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
        allowedExtensions: ['.mp4', '.mov', '.webm'],
      },
      audio: {
        maxFileSize: parseInt(process.env.MAX_AUDIO_SIZE || '10485760', 10), // 10MB
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
        allowedExtensions: ['.mp3', '.wav', '.ogg', '.webm'],
      },
      document: {
        maxFileSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760', 10), // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
      },
    },
    thumbnail: {
      image: {
        width: parseInt(process.env.THUMBNAIL_WIDTH || '300', 10),
        height: parseInt(process.env.THUMBNAIL_HEIGHT || '300', 10),
        quality: parseInt(process.env.THUMBNAIL_QUALITY || '80', 10),
      },
      video: {
        width: parseInt(process.env.VIDEO_THUMBNAIL_WIDTH || '300', 10),
        height: parseInt(process.env.VIDEO_THUMBNAIL_HEIGHT || '300', 10),
        timeOffset: parseInt(process.env.VIDEO_THUMBNAIL_TIME || '1', 10), // seconds
      },
    },
  },
};

export default config;