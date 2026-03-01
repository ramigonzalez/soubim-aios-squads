#!/bin/bash

# DecisionLog Development Server Script
# Runs both frontend and backend servers in parallel

set -e

echo "🚀 Starting DecisionLog Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python is not installed or not in PATH"
    echo "Please install Python 3.11+ and try again"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js 18+ and try again"
    exit 1
fi

# Cleanup on exit - kill both processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "✅ Servers stopped"
}

trap cleanup EXIT INT TERM

echo "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo "${BLUE}   Backend: http://localhost:8000${NC}"
echo "${BLUE}   API Docs: http://localhost:8000/docs${NC}"
echo "${BLUE}   Frontend: http://localhost:5173${NC}"
echo "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Start PostgreSQL via Docker (if Docker is available)
cd "$SCRIPT_DIR/decision-log-backend"
DB_MODE="sqlite"
if command -v docker &> /dev/null; then
    echo "${GREEN}Starting PostgreSQL (Docker)...${NC}"
    if docker compose up -d db 2>/dev/null; then
        # Wait for PostgreSQL to be ready (max 30s)
        echo -n "   Waiting for PostgreSQL..."
        for i in $(seq 1 30); do
            if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
                echo " ready!"
                DB_MODE="postgres"
                break
            fi
            echo -n "."
            sleep 1
        done
        if [ "$DB_MODE" != "postgres" ]; then
            echo " timeout — will fall back to SQLite"
        fi
    else
        echo "   ⚠️  Docker compose failed — will fall back to SQLite"
    fi
else
    echo "   ℹ️  Docker not found — will use SQLite fallback"
fi
echo ""

# Start Backend
echo "${GREEN}Starting Backend (FastAPI)...${NC}"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv || python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
if [ ! -f "venv/pinfo.json" ] && [ ! -d "venv/lib" ]; then
    echo "Installing backend dependencies..."
    pip install -q -r requirements.txt
fi

# Ensure .env.development exists
if [ ! -f ".env.development" ]; then
    echo "⚠️  .env.development not found, creating development configuration..."
    cp .env.development .env.development 2>/dev/null || echo "Using default .env"
fi

# Start the backend server
export ENV_FILE=".env.development"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
if [ "$DB_MODE" = "postgres" ]; then
    echo "   Database: PostgreSQL (Docker) on localhost:5432"
else
    echo "   Database: SQLite fallback (install Docker for PostgreSQL)"
fi
echo ""

# Start Frontend
echo "${GREEN}Starting Frontend (Vite + React)...${NC}"
cd "$SCRIPT_DIR/decision-log-frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install -q
fi

# Start the frontend dev server
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo "${GREEN}🎉 Both servers are running!${NC}"
echo "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "📱 Open your browser:"
echo "   • Frontend: http://localhost:5173"
echo "   • API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait
