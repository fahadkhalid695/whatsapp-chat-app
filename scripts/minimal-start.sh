#!/bin/bash

echo "🚀 Minimal WhatsApp Chat App Startup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

echo "Step 1: Installing basic dependencies..."
npm install --no-optional --no-audit

echo "Step 2: Creating environment files..."
./scripts/create-env.sh

echo "Step 3: Installing backend dependencies..."
cd packages/backend
npm install --no-optional --no-audit
cd ../..

echo "Step 4: Installing web dependencies..."
cd packages/web
npm install --no-optional --no-audit
cd ../..

echo "Step 5: Building backend..."
cd packages/backend
npm run build
cd ../..

echo "Step 6: Building web..."
cd packages/web
npm run build
cd ../..

echo ""
echo "🎉 Minimal setup complete!"
echo ""
echo "Now run these commands in separate terminals:"
echo ""
echo "Terminal 1:"
echo "cd packages/backend && npm run dev"
echo ""
echo "Terminal 2:"
echo "cd packages/web && npm run dev"
echo ""
echo "Then open: http://localhost:3000"