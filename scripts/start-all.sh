#!/bin/bash

echo "🚀 Starting WhatsApp Chat App - Full Stack"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if concurrently is available
if ! command_exists concurrently; then
    echo "📦 Installing concurrently..."
    npm install -g concurrently
fi

# Start database services
echo "📦 Starting database services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if services are healthy
echo "🏥 Checking service health..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Database services are running"
else
    echo "⚠️  Database services may not be fully ready yet"
fi

# Build the backend
echo "🔨 Building backend..."
npm run build --workspace=backend

# Start both backend and web concurrently
echo "🚀 Starting backend and web applications..."
concurrently \
  --names "BACKEND,WEB" \
  --prefix-colors "blue,green" \
  "npm run dev --workspace=backend" \
  "npm run dev --workspace=web"