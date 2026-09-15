#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AGENT_DIR="$SCRIPT_DIR/agent"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "Starting File Transfer Agent..."
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $AGENT_PID $FRONTEND_PID 2>/dev/null || true
    wait $AGENT_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$AGENT_DIR/node_modules" ]; then
    echo "Installing agent dependencies..."
    cd "$AGENT_DIR" && npm install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$FRONTEND_DIR" && npm install
fi

echo "[1/2] Starting Local Agent (Node.js)..."
cd "$AGENT_DIR"
npm run dev &
AGENT_PID=$!

# Wait for agent to start
sleep 3

echo "[2/2] Starting Frontend (React + Vite)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "File Transfer Agent Started!"
echo "========================================"
echo ""
echo "Local Agent:  ws://127.0.0.1:3456"
echo "Frontend:     http://localhost:5173"
echo "HTTP API:     http://127.0.0.1:3457"
echo ""
echo "Check the agent console for the authentication token."
echo "========================================"
echo ""

# Wait for both processes
wait $AGENT_PID $FRONTEND_PID