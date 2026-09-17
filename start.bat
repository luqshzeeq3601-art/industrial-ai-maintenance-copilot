@echo off
title Launching Industrial AI Multi-Agent Maintenance Copilot...
echo ================================================================
echo   INDUSTRIAL AI MULTI-AGENT MAINTENANCE COPILOT
echo   LangGraph + Ollama Qwen2.5 + FAISS Hybrid + React 19
echo ================================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: 1. Check / Start Ollama
echo [1/3] Checking Ollama service...
curl.exe -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Ollama server in background...
    start /b "" ollama serve >nul 2>&1
    timeout /t 3 /nobreak >nul
) else (
    echo Ollama service is already running.
)

:: 2. Launch FastAPI Backend
echo [2/3] Launching FastAPI Multi-Agent Backend on port 8000...
start "Copilot Backend (FastAPI)" cmd /k "cd /d ""%PROJECT_DIR%"" && .\.venv\Scripts\uvicorn.exe backend.app.main:app --port 8000"

:: 3. Launch React Frontend
echo [3/3] Launching React Dashboard on port 3000...
start "Copilot Frontend (React)" cmd /k "cd /d ""%PROJECT_DIR%frontend"" && npm run dev"

:: Wait for servers to warm up
echo.
echo Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

:: Open Browser
echo Opening Industrial Copilot in your browser...
start http://localhost:3000

echo.
echo ================================================================
echo   System running!
echo   - Backend API:  http://localhost:8000/docs
echo   - Frontend UI:  http://localhost:3000
echo ================================================================
pause
