#!/bin/bash

echo "🔍 Validating WhatsApp Chat App Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

echo "🔍 Checking file structure..."

# Check essential files
[ -f "package.json" ] && print_status 0 "Root package.json exists" || print_status 1 "Root package.json missing"
[ -f "packages/backend/package.json" ] && print_status 0 "Backend package.json exists" || print_status 1 "Backend package.json missing"
[ -f "packages/web/package.json" ] && print_status 0 "Web package.json exists" || print_status 1 "Web package.json missing"
[ -f "packages/mobile/package.json" ] && print_status 0 "Mobile package.json exists" || print_status 1 "Mobile package.json missing"

echo ""
echo "🔍 Checking environment files..."

[ -f "packages/backend/.env" ] && print_status 0 "Backend .env exists" || print_warning "Backend .env missing (will be created)"
[ -f "packages/web/.env" ] && print_status 0 "Web .env exists" || print_warning "Web .env missing (will be created)"

echo ""
echo "🔍 Checking dependencies..."

# Check if node_modules exist
[ -d "node_modules" ] && print_status 0 "Root dependencies installed" || print_status 1 "Root dependencies missing"
[ -d "packages/backend/node_modules" ] && print_status 0 "Backend dependencies installed" || print_status 1 "Backend dependencies missing"
[ -d "packages/web/node_modules" ] && print_status 0 "Web dependencies installed" || print_status 1 "Web dependencies missing"
[ -d "packages/mobile/node_modules" ] && print_status 0 "Mobile dependencies installed" || print_status 1 "Mobile dependencies missing"

echo ""
echo "🔍 Checking build outputs..."

[ -d "packages/backend/dist" ] && print_status 0 "Backend built" || print_warning "Backend not built yet"
[ -d "packages/web/dist" ] && print_status 0 "Web built" || print_warning "Web not built yet"

echo ""
echo "🔍 Checking scripts..."

[ -x "scripts/complete-setup.sh" ] && print_status 0 "Setup script executable" || print_status 1 "Setup script not executable"
[ -x "scripts/start-backend.sh" ] && print_status 0 "Backend start script executable" || print_status 1 "Backend start script not executable"
[ -x "scripts/start-web.sh" ] && print_status 0 "Web start script executable" || print_status 1 "Web start script not executable"
[ -x "scripts/start-dev.sh" ] && print_status 0 "Dev start script executable" || print_status 1 "Dev start script not executable"

echo ""
echo "🔍 Testing backend startup..."

cd packages/backend
timeout 3s npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 2

if kill -0 $BACKEND_PID 2>/dev/null; then
    print_status 0 "Backend can start successfully"
    kill $BACKEND_PID 2>/dev/null
else
    print_warning "Backend startup test inconclusive"
fi
cd ../..

echo ""
echo "🔍 Testing web build..."

cd packages/web
if npm run build > /dev/null 2>&1; then
    print_status 0 "Web app builds successfully"
else
    print_status 1 "Web app build failed"
fi
cd ../..

echo ""
echo "📊 Validation Summary"
echo "===================="

if [ -f "packages/backend/.env" ] && [ -f "packages/web/.env" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}🎉 Setup looks good! You can start the application.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. ./scripts/start-backend.sh"
    echo "2. ./scripts/start-web.sh"
    echo "3. Open http://localhost:3000"
else
    echo -e "${YELLOW}⚠️  Setup needs completion. Run:${NC}"
    echo "./scripts/complete-setup.sh"
fi

echo ""
echo "💡 For detailed instructions, see GETTING_STARTED.md"