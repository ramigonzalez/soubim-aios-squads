@echo off
REM DecisionLog Development Server Script
REM Runs both frontend and backend servers in parallel (Windows)

setlocal enabledelayedexpansion

echo.
echo =========================================================
echo   DecisionLog Development Environment
echo =========================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.11+ and try again
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and try again
    pause
    exit /b 1
)

echo.
echo =========================================================
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo =========================================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Start Backend
echo Starting Backend (FastAPI)...
cd /d "%SCRIPT_DIR%decision-log-backend"

REM Check if venv exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if requirements are installed
if not exist "venv\Lib\site-packages\fastapi" (
    echo Installing backend dependencies...
    pip install -q -r requirements.txt
)

REM Start backend in a new window
start "DecisionLog Backend" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo Backend started in new window
echo.

REM Start Frontend
echo Starting Frontend (Vite + React)...
cd /d "%SCRIPT_DIR%decision-log-frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install -q
)

REM Start frontend in a new window
start "DecisionLog Frontend" cmd /k npm run dev
echo Frontend started in new window
echo.

echo =========================================================
echo   Both servers are starting!
echo =========================================================
echo.
echo Open your browser:
echo    * Frontend: http://localhost:5173
echo    * API Docs: http://localhost:8000/docs
echo.
echo To stop the servers, close the terminal windows.
echo.
pause
