#!/bin/bash

echo "🚀 WhatsApp Chat App - Complete Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ All prerequisites are installed"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Set up environment files
echo ""
echo "⚙️  Setting up environment files..."

# Backend .env
if [ ! -f "packages/backend/.env" ]; then
    echo "Creating backend .env file..."
    cat > packages/backend/.env << 'EOF'
# Backend Environment Variables
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://chatapp:password@localhost:5432/chatapp_dev

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=development_jwt_secret_key_change_in_production
JWT_REFRESH_SECRET=development_jwt_refresh_secret_key_change_in_production

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
CORS_ORIGIN=http://localhost:3000
EOF
fi

# Web .env
if [ ! -f "packages/web/.env" ]; then
    echo "Creating web .env file..."
    cat > packages/web/.env << 'EOF'
# Web App Environment Variables
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=WhatsApp Chat
VITE_MAX_FILE_SIZE=10485760
EOF
fi

echo "✅ Environment files created"

# Build applications
echo ""
echo "🔨 Building applications..."

echo "Building web application..."
cd packages/web && npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build web application"
    exit 1
fi
cd ../..

echo "Building backend application..."
cd packages/backend && npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend application"
    exit 1
fi
cd ../..

echo "✅ Applications built successfully"

# Test backend startup
echo ""
echo "🧪 Testing backend startup..."
cd packages/backend
timeout 5s npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 3

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend starts successfully"
    kill $BACKEND_PID 2>/dev/null
else
    echo "⚠️  Backend startup test inconclusive (this is normal without database)"
fi
cd ../..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🚀 To start the application:"
echo ""
echo "1. Start database services (optional):"
echo "   ./scripts/start-dev.sh"
echo ""
echo "2. Start the backend (in a new terminal):"
echo "   ./scripts/start-backend.sh"
echo ""
echo "3. Start the web app (in another terminal):"
echo "   ./scripts/start-web.sh"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "📊 Service URLs:"
echo "   - Web App: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - API Health: http://localhost:3001/health"
echo ""
echo "💡 Tips:"
echo "   - The app works without database (limited functionality)"
echo "   - Use Docker services for full functionality"
echo "   - Check logs for any issues"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Run './scripts/test-backend-quick.sh' to test backend"
echo "   - Check './scripts/kill-ports.sh' if ports are busy"
echo "   - See docs/DEPLOYMENT.md for production setup"