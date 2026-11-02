@echo off
title CIES Fullstack Ecosystem Launcher
echo ========================================================
echo           STARTING CIES FULLSTACK ECOSYSTEM
echo ========================================================
echo.

if not exist "%~dp0model-llm\weights\model.safetensors" (
    if exist "%~dp0model-llm\weights\model.safetensors.part001" (
        echo [*] Reassembling model.safetensors from 31 split parts...
        copy /b "%~dp0model-llm\weights\model.safetensors.part*" "%~dp0model-llm\weights\model.safetensors" >nul
        echo [OK] Model weights assembled successfully.
        echo.
    )
)

echo [1/3] Starting CIESGPT Model Server (Port 8081)...
start "CIESGPT Neural Model (Port 8081)" cmd /k "cd /d %~dp0model-llm && set CIES_MODEL_PORT=8081 && python server.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Go Backend API (Port 8080)...
start "CIES Backend API (Port 8080)" cmd /k "cd /d %~dp0backend && go run ./cmd/server"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend Web Interface (Port 8082)...
start "CIES Frontend Web (Port 8082)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  All services have been started successfully:
echo  - Backend Go API  : http://localhost:8080
echo  - CIESGPT Engine  : http://localhost:8081
echo  - Frontend Web UI : http://localhost:8082
echo ========================================================
echo.
pause
