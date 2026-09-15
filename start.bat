@echo off
echo Starting File Transfer Agent...
echo.

echo [1/2] Starting Local Agent (Node.js)...
start "File Transfer Agent" cmd /k "cd /d "%~dp0agent" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (React + Vite)...
start "File Transfer Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================
echo File Transfer Agent Started!
echo ========================================
echo.
echo Local Agent:  ws://127.0.0.1:3456
echo Frontend:     http://localhost:5173
echo HTTP API:     http://127.0.0.1:3457
echo.
echo Check the agent console for the authentication token.
echo ========================================
echo.
pause