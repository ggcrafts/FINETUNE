@echo off
setlocal
title FineTune v3 - prototype
cd /d "%~dp0"
echo.
echo   FineTune v3  /  Observatory prototype (gate + 3D gallery)
echo   ---------------------------------------------------------
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js was not found. Install the LTS version from https://nodejs.org and run again.
  pause
  exit /b 1
)
if not exist "node_modules\vite" call npm install --no-audit --no-fund
echo   Opening http://localhost:5173/v3/index.html  (close this window to stop)
echo.
call npx vite --open /v3/index.html
pause
