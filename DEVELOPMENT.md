# DecisionLog Development Guide

This guide explains how to run both the frontend and backend servers simultaneously for local development.

## Prerequisites

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **Python 3.11+** - Download from [python.org](https://www.python.org/)
- **Git** - For version control

### Quick Prerequisites Check

```bash
# Check Node.js
node --version
npm --version

# Check Python
python3 --version
# or on Windows:
python --version
```

## Getting Started

### 1. Initial Setup (One-time)

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd decision-log

# Install dependencies (optional, scripts will auto-install)
npm install
cd decision-log-frontend && npm install
cd ../decision-log-backend && pip install -r requirements.txt
```

### 2. Start Development Environment

Choose **ONE** of the following methods:

---

## Method 1: Shell Script (Mac/Linux) ⭐ Recommended for Mac/Linux

### Quick Start
```bash
./dev.sh
```

### What It Does
- Creates Python virtual environment (if needed)
- Installs backend dependencies
- Installs frontend dependencies
- Starts Backend: `http://localhost:8000`
- Starts Frontend: `http://localhost:5173`
- Shows both servers in the same terminal

### Features
✅ Single command to start everything
✅ Automatic dependency installation
✅ Clean startup messages
✅ Graceful shutdown with Ctrl+C
✅ Kills both servers when you exit

### Troubleshooting
If you get "Permission denied" error:
```bash
chmod +x dev.sh
./dev.sh
```

---

## Method 2: Batch Script (Windows) ⭐ Recommended for Windows

### Quick Start
```bash
dev.bat
```

### What It Does
- Creates Python virtual environment (if needed)
- Installs backend dependencies
- Installs frontend dependencies
- Opens two terminal windows:
  - Backend server (window 1)
  - Frontend dev server (window 2)

### Features
✅ Two separate windows for clear logs
✅ Auto-installs dependencies
✅ Easy to see each server's output
✅ Close windows to stop servers

---

## Method 3: NPM Scripts (All Platforms)

### Quick Start
```bash
npm run dev
```

### Prerequisites for this method:
First, install `concurrently` (one-time):
```bash
npm install
```

### What It Does
- Uses `concurrently` to run both servers
- Shows color-coded output for each server
- Easier to integrate with IDEs

### Individual Commands
```bash
# Start only backend
npm run backend:dev

# Start only frontend
npm run frontend:dev

# Build frontend production bundle
npm run frontend:build

# Run frontend tests
npm run frontend:test

# Run backend tests
npm run backend:test

# Run frontend linting
npm run frontend:lint
```

---

## Accessing the Application

Once servers are running, open:

### 🌐 Frontend (React + Vite)
```
http://localhost:5173
```

### 📚 API Documentation (FastAPI + Swagger)
```
http://localhost:8000/docs
```

### 🔧 API ReDoc
```
http://localhost:8000/redoc
```

---

## Environment Setup

### Frontend Environment Variables
Create `decision-log-frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=DecisionLog
```

### Backend Environment Variables
Create `decision-log-backend/.env`:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/synkra_aios
DATABASE_ECHO=true

# JWT
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
LOG_LEVEL=debug

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

---

## Common Tasks

### Install a New Frontend Package
```bash
cd decision-log-frontend
npm install <package-name>
```

### Install a New Backend Package
```bash
cd decision-log-backend
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows

pip install <package-name>
pip freeze > requirements.txt  # Update requirements file
```

### Format Code (Frontend)
```bash
cd decision-log-frontend
npm run lint -- --fix
```

### Format Code (Backend)
```bash
cd decision-log-backend
source venv/bin/activate
black app tests
ruff check app tests --fix
```

### Run Tests

```bash
# Frontend tests
cd decision-log-frontend
npm test

# Backend tests
cd decision-log-backend
source venv/bin/activate
pytest

# All tests (from root)
npm run test
```

---

## Troubleshooting

### Port Already in Use

If you get "Address already in use" error:

**Find what's using the port:**
```bash
# Mac/Linux - Find port 8000
lsof -i :8000
lsof -i :5173

# Windows - Find port 8000
netstat -ano | findstr :8000
netstat -ano | findstr :5173
```

**Kill the process:**
```bash
# Mac/Linux
kill -9 <PID>

# Windows (in PowerShell as Admin)
Stop-Process -Id <PID> -Force
```

**Or change the ports:**

Frontend (edit `decision-log-frontend/vite.config.ts`):
```typescript
server: {
  port: 5174,  // Change from 5173
}
```

Backend (modify the dev command):
```bash
python -m uvicorn app.main:app --port 8001 --reload
```

### Python Virtual Environment Issues

```bash
# Recreate venv
cd decision-log-backend
rm -rf venv  # Mac/Linux
# or
rmdir /s venv  # Windows

# Create fresh venv
python3 -m venv venv  # Mac/Linux
python -m venv venv   # Windows

# Activate and install
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate.bat  # Windows
pip install -r requirements.txt
```

### Frontend Dependencies Issue

```bash
cd decision-log-frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error (Backend)

Make sure your `.env` file has correct database connection:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

If you don't have PostgreSQL running:
```bash
# Mac with Homebrew
brew services start postgresql

# Or use Docker
docker-compose up -d
```

---

## IDE Integration

### VS Code

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start DecisionLog Dev",
      "type": "shell",
      "command": "./dev.sh",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^.*$",
          "file": 1,
          "location": 2,
          "message": 3
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "^.*Starting.*",
          "endsPattern": "^.*Both servers are running.*"
        }
      }
    }
  ]
}
```

Then run with: `Ctrl+Shift+B` → "Start DecisionLog Dev"

---

## Production Build

### Build Frontend
```bash
npm run frontend:build
# Output: decision-log-frontend/dist/
```

### Build Backend (Docker)
```bash
cd decision-log-backend
docker build -t decision-log-api:latest .
docker run -p 8000:8000 decision-log-api:latest
```

---

## Performance Tips

### Frontend Development
- Use React DevTools browser extension for debugging
- Use Vite's built-in fast refresh for hot module reloading
- Check with Lighthouse for performance metrics

### Backend Development
- Enable `--reload` flag for auto-reload on file changes
- Use FastAPI's `/docs` for interactive API testing
- Monitor logs with: `tail -f <log-file>`

---

## Getting Help

### Check Logs
```bash
# Frontend logs
cd decision-log-frontend && npm run dev

# Backend logs
cd decision-log-backend && python -m uvicorn app.main:app --reload

# See all output in one terminal
./dev.sh
```

### Health Check
```bash
# Frontend
curl http://localhost:5173

# Backend health
curl http://localhost:8000/health

# API root
curl http://localhost:8000
```

---

## Next Steps

1. **Frontend Development:**
   - Read `decision-log-frontend/README.md`
   - Check `docs/developer-handoff.md` for architecture patterns

2. **Backend Development:**
   - Read `decision-log-backend/README.md`
   - Check API docs at `http://localhost:8000/docs`

3. **Story Implementation:**
   - Review `docs/stories/` for current tasks
   - Follow `docs/sprint-planning.md` for timeline

---

**Happy Coding! 🚀**
