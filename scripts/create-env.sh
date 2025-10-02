#!/bin/bash

echo "⚙️  Creating Environment Files"
echo "============================="

# Create backend .env
echo "Creating packages/backend/.env..."
cat > packages/backend/.env << 'EOF'
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration (optional)
DATABASE_URL=postgresql://chatapp:password@localhost:5432/chatapp_dev

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=development_jwt_secret_key_change_in_production_12345678901234567890
JWT_REFRESH_SECRET=development_jwt_refresh_secret_key_change_in_production_12345678901234567890

# Firebase Configuration (optional)
FCM_SERVER_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=

# SMS Configuration (optional)
SMS_API_KEY=
SMS_PROVIDER=mock

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
EOF

echo "✅ Backend .env created"

# Create web .env
echo "Creating packages/web/.env..."
cat > packages/web/.env << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=WhatsApp Chat
VITE_MAX_FILE_SIZE=10485760
EOF

echo "✅ Web .env created"

echo ""
echo "🎉 Environment files created successfully!"
echo "You can now start the services."