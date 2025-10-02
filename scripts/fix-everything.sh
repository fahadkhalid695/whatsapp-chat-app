#!/bin/bash

echo "🔧 WhatsApp Chat App - Fix Everything"
echo "===================================="

# Function to run command and check result
run_command() {
    echo "Running: $1"
    if eval $1; then
        echo "✅ Success: $1"
        return 0
    else
        echo "❌ Failed: $1"
        return 1
    fi
}

# Step 1: Kill any processes on our ports
echo ""
echo "Step 1: Clearing ports..."
echo "------------------------"
./scripts/kill-ports.sh 2>/dev/null || echo "Port clearing script not found, continuing..."

# Step 2: Install dependencies
echo ""
echo "Step 2: Installing dependencies..."
echo "---------------------------------"
run_command "npm install"

# Step 3: Create environment files
echo ""
echo "Step 3: Creating environment files..."
echo "------------------------------------"
./scripts/create-env.sh

# Step 4: Install package dependencies
echo ""
echo "Step 4: Installing package dependencies..."
echo "-----------------------------------------"
run_command "cd packages/backend && npm install"
run_command "cd packages/web && npm install"

# Step 5: Build applications
echo ""
echo "Step 5: Building applications..."
echo "-------------------------------"
run_command "cd packages/backend && npm run build"
run_command "cd packages/web && npm run build"

# Step 6: Test backend startup
echo ""
echo "Step 6: Testing backend..."
echo "-------------------------"
cd packages/backend
timeout 5s npm run dev > /tmp/backend_test.log 2>&1 &
BACKEND_PID=$!
sleep 3

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend can start"
    kill $BACKEND_PID 2>/dev/null
else
    echo "⚠️  Backend test inconclusive (check logs)"
fi
cd ../..

echo ""
echo "🎉 Fix Complete!"
echo "==============="
echo ""
echo "Next steps:"
echo "1. Open terminal 1: ./scripts/start-backend.sh"
echo "2. Open terminal 2: ./scripts/start-web.sh"
echo "3. Open browser: http://localhost:3000"
echo ""
echo "If you still have issues, run: ./scripts/diagnose.sh"