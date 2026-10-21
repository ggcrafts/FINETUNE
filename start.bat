@echo off
setlocal
title FineTune - local server
cd /d "%~dp0"

echo.
echo   FineTune  /  Observe. Create. Refine.
echo   ------------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js was not found on this computer.
  echo   Install the LTS version from https://nodejs.org and run start.bat again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite" (
  echo   First run: installing dependencies. This takes about a minute...
) else (
  echo   Checking dependencies...
)
echo.
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo   npm install failed. Check your internet connection and try again.
  pause
  exit /b 1
)

echo   Starting local server at http://localhost:5173
echo   The browser opens automatically. Close this window to stop the server.
echo.
call npm run dev

pause
