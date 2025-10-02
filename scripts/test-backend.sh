#!/bin/bash

echo "🧪 Testing Backend Startup"

# Check if we're in the right directory
if [ ! -f "packages/backend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd packages/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env 2>/dev/null || echo "# Backend Environment Variables
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration (optional for testing)
DATABASE_URL=postgresql://chatapp:password@localhost:5432/chatapp_dev

# Redis Configuration (optional for testing)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=test_jwt_secret_key_for_development_only
JWT_REFRESH_SECRET=test_jwt_refresh_secret_key_for_development_only

# Firebase Configuration (optional for development)
FCM_SERVER_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=

# SMS Configuration (optional for development)
SMS_API_KEY=
SMS_PROVIDER=mock

# CORS Configuration
CORS_ORIGIN=http://localhost:3000" > .env
fi

echo "🚀 Starting backend in test mode..."
echo "⏳ Backend will start in 5 seconds. Press Ctrl+C to stop."

# Start the backend and capture output
timeout 10s npm run dev 2>&1 | head -20

echo ""
echo "✅ Backend startup test completed"
echo "💡 If you see error messages above, they are expected when database/redis are not running"
echo "🎯 The important thing is that the server starts and listens on port 3001"