#!/bin/bash

echo "🌐 Starting WhatsApp Chat Web App"

# Check if we're in the right directory
if [ ! -f "packages/web/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Start the web app
echo "🎨 Starting web development server..."

cd packages/web

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env 2>/dev/null || echo "# Web App Environment Variables
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=WhatsApp Chat
VITE_MAX_FILE_SIZE=10485760" > .env
fi

# Start the web app
npm run dev