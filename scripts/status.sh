#!/bin/bash

echo "📊 WhatsApp Chat App - Status Dashboard"
echo "======================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ $service (port $port) - RUNNING"
        return 0
    else
        echo "❌ $service (port $port) - NOT RUNNING"
        return 1
    fi
}

# Function to check URL
check_url() {
    local url=$1
    local service=$2
    
    if curl -s "$url" >/dev/null 2>&1; then
        echo "✅ $service - ACCESSIBLE"
        return 0
    else
        echo "❌ $service - NOT ACCESSIBLE"
        return 1
    fi
}

echo "🔍 Checking Services..."
echo ""

# Check main services
check_port 3000 "Web App"
check_port 3001 "Backend API"
check_port 5432 "PostgreSQL Database"
check_port 6379 "Redis Cache"

echo ""
echo "🔍 Checking Endpoints..."
echo ""

# Check endpoints
check_url "http://localhost:3000" "Web App Frontend"
check_url "http://localhost:3001/health" "Backend Health Check"

echo ""
echo "📁 Checking Files..."
echo ""

# Check important files
[ -f "packages/backend/.env" ] && echo "✅ Backend .env file exists" || echo "❌ Backend .env file missing"
[ -f "packages/web/.env" ] && echo "✅ Web .env file exists" || echo "❌ Web .env file missing"
[ -d "packages/backend/dist" ] && echo "✅ Backend is built" || echo "⚠️  Backend not built"
[ -d "packages/web/dist" ] && echo "✅ Web is built" || echo "⚠️  Web not built"

echo ""
echo "🐳 Checking Docker Services..."
echo ""

if command -v docker >/dev/null 2>&1; then
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(postgres|redis)" >/dev/null 2>&1; then
        echo "✅ Docker services running:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(postgres|redis)" | sed 's/^/   /'
    else
        echo "❌ No Docker services running"
        echo "   Run: ./scripts/start-dev.sh"
    fi
else
    echo "⚠️  Docker not available"
fi

echo ""
echo "🎯 Quick Actions"
echo "==============="
echo ""

# Suggest actions based on status
if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🚀 Start Backend: ./scripts/start-backend.sh"
fi

if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🌐 Start Web App: ./scripts/start-web.sh"
fi

if ! lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🗄️  Start Database: ./scripts/start-dev.sh"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 && lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🎉 All services running! Open: http://localhost:3000"
fi

echo ""
echo "💡 For setup help: ./scripts/complete-setup.sh"
echo "🔧 For validation: ./scripts/validate-setup.sh"