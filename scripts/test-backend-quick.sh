#!/bin/bash

echo "🧪 Quick Backend Test (5 seconds)"

cd packages/backend

# Start the backend for 5 seconds and capture output
timeout 5s npm run dev 2>&1 | grep -E "(✅|⚠️|❌|🚀|Error|Failed)" | head -10

echo ""
echo "✅ Quick test completed"
echo "💡 Look for ✅ (success) and ⚠️ (warnings) - errors should be minimal"