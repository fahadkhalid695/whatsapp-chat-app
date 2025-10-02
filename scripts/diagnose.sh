#!/bin/bash

echo "🔍 WhatsApp Chat App - Diagnostic Tool"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check command
check_command() {
    if command -v $1 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $1 is installed${NC}"
        $1 --version | head -1
        return 0
    else
        echo -e "${RED}❌ $1 is NOT installed${NC}"
        return 1
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1 exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 missing${NC}"
        return 1
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1 exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 missing${NC}"
        return 1
    fi
}

echo "1. Checking Prerequisites..."
echo "----------------------------"
check_command node
check_command npm
check_command docker
check_command docker-compose

echo ""
echo "2. Checking Project Structure..."
echo "--------------------------------"
check_file "package.json"
check_dir "packages"
check_dir "packages/backend"
check_dir "packages/web"
check_file "packages/backend/package.json"
check_file "packages/web/package.json"

echo ""
echo "3. Checking Dependencies..."
echo "---------------------------"
check_dir "node_modules"
check_dir "packages/backend/node_modules"
check_dir "packages/web/node_modules"

echo ""
echo "4. Checking Environment Files..."
echo "--------------------------------"
check_file "packages/backend/.env"
check_file "packages/web/.env"

echo ""
echo "5. Checking Build Output..."
echo "---------------------------"
check_dir "packages/backend/dist"
check_dir "packages/web/dist"

echo ""
echo "6. Checking Ports..."
echo "-------------------"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is in use${NC}"
    echo "Process: $(lsof -Pi :3000 -sTCP:LISTEN | tail -1)"
else
    echo -e "${GREEN}✅ Port 3000 is free${NC}"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 is in use${NC}"
    echo "Process: $(lsof -Pi :3001 -sTCP:LISTEN | tail -1)"
else
    echo -e "${GREEN}✅ Port 3001 is free${NC}"
fi

echo ""
echo "7. Testing Basic Commands..."
echo "----------------------------"

# Test npm in root
if npm list >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Root npm dependencies OK${NC}"
else
    echo -e "${RED}❌ Root npm dependencies have issues${NC}"
fi

# Test backend npm
cd packages/backend 2>/dev/null
if npm list >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend npm dependencies OK${NC}"
else
    echo -e "${RED}❌ Backend npm dependencies have issues${NC}"
fi
cd ../.. 2>/dev/null

# Test web npm
cd packages/web 2>/dev/null
if npm list >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Web npm dependencies OK${NC}"
else
    echo -e "${RED}❌ Web npm dependencies have issues${NC}"
fi
cd ../.. 2>/dev/null

echo ""
echo "8. Recommendations..."
echo "--------------------"

# Check what needs to be done
NEEDS_INSTALL=false
NEEDS_ENV=false
NEEDS_BUILD=false

if [ ! -d "node_modules" ] || [ ! -d "packages/backend/node_modules" ] || [ ! -d "packages/web/node_modules" ]; then
    NEEDS_INSTALL=true
    echo -e "${YELLOW}📦 Run: npm install${NC}"
fi

if [ ! -f "packages/backend/.env" ] || [ ! -f "packages/web/.env" ]; then
    NEEDS_ENV=true
    echo -e "${YELLOW}⚙️  Create environment files${NC}"
fi

if [ ! -d "packages/backend/dist" ] || [ ! -d "packages/web/dist" ]; then
    NEEDS_BUILD=true
    echo -e "${YELLOW}🔨 Build applications${NC}"
fi

if [ "$NEEDS_INSTALL" = false ] && [ "$NEEDS_ENV" = false ] && [ "$NEEDS_BUILD" = false ]; then
    echo -e "${GREEN}🎉 Everything looks good! Try starting the services.${NC}"
fi

echo ""
echo "Next Steps:"
echo "----------"
if [ "$NEEDS_INSTALL" = true ]; then
    echo "1. npm install"
fi
if [ "$NEEDS_ENV" = true ]; then
    echo "2. ./scripts/create-env.sh"
fi
if [ "$NEEDS_BUILD" = true ]; then
    echo "3. npm run build"
fi
echo "4. ./scripts/start-backend.sh"
echo "5. ./scripts/start-web.sh"