#!/bin/bash

echo "🚀 Starting WhatsApp Chat Backend"

# Check if we're in the right directory
if [ ! -f "packages/backend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Start the backend with proper error handling
echo "📡 Starting backend server..."

cd packages/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
fi

# Start the backend
npm run dev