#!/bin/bash

echo "🔧 Killing processes on common ports..."

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null
        echo "✅ Port $port is now free"
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill common development ports
kill_port 3000  # Web app
kill_port 3001  # Backend API
kill_port 5432  # PostgreSQL
kill_port 6379  # Redis

echo ""
echo "🎯 All common ports have been cleared"
echo "You can now start the services fresh"