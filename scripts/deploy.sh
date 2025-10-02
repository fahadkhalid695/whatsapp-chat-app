#!/bin/bash

# Production deployment script
set -e

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"

echo "🚀 Starting deployment to ${ENVIRONMENT}..."

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup database
echo "📦 Creating database backup..."
docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U chatapp chatapp > "${BACKUP_DIR}/database_backup.sql"

# Backup uploaded media (if using local storage)
if [ -d "./uploads" ]; then
    echo "📦 Backing up media files..."
    cp -r ./uploads "${BACKUP_DIR}/"
fi

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f "${COMPOSE_FILE}" pull

# Stop services gracefully
echo "⏹️  Stopping services..."
docker-compose -f "${COMPOSE_FILE}" stop backend web

# Start database and redis first
echo "🔄 Starting database and cache services..."
docker-compose -f "${COMPOSE_FILE}" up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f "${COMPOSE_FILE}" run --rm backend npm run migrate

# Start backend services
echo "🔄 Starting backend services..."
docker-compose -f "${COMPOSE_FILE}" up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 15

# Health check backend
echo "🏥 Checking backend health..."
if ! curl -f http://localhost:3000/health; then
    echo "❌ Backend health check failed!"
    echo "🔄 Rolling back..."
    docker-compose -f "${COMPOSE_FILE}" down
    exit 1
fi

# Start web services
echo "🔄 Starting web services..."
docker-compose -f "${COMPOSE_FILE}" up -d web nginx

# Wait for web to be ready
echo "⏳ Waiting for web services to be ready..."
sleep 10

# Health check web
echo "🏥 Checking web health..."
if ! curl -f http://localhost/health; then
    echo "❌ Web health check failed!"
    echo "🔄 Rolling back..."
    docker-compose -f "${COMPOSE_FILE}" down
    exit 1
fi

# Clean up old images and containers
echo "🧹 Cleaning up..."
docker system prune -f

# Remove old backups (keep last 7 days)
find /opt/backups -type d -mtime +7 -exec rm -rf {} +

echo "✅ Deployment to ${ENVIRONMENT} completed successfully!"
echo "📊 Services status:"
docker-compose -f "${COMPOSE_FILE}" ps