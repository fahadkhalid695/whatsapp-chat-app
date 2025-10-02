#!/bin/bash

echo "🚀 Starting WhatsApp Chat App Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start database services
echo "📦 Starting database services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🏥 Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    echo "✅ Database services are healthy"
else
    echo "⚠️  Database services may not be fully ready yet"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Start the backend: ./scripts/start-backend.sh"
echo "2. Start the web app: ./scripts/start-web.sh"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📊 Service URLs:"
echo "  - Web App: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - Database: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "💡 Tips:"
echo "  - The backend will start even if database/redis are not available"
echo "  - Some features may be limited without database connection"
echo "  - Use 'docker-compose up -d' to start database services"