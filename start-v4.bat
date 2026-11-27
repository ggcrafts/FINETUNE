@echo off
setlocal
title FineTune v4 - specialist portfolio
cd /d "%~dp0"
echo.
echo   FineTune v4  /  Specialist portfolio (hero + reel, cases, skills knob, index, lab)
echo   ----------------------------------------------------------------------------------
echo   Content: public\v4\content.json   Media: public\v3\ (shared library)
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js was not found. Install the LTS version from https://nodejs.org and run again.
  pause
  exit /b 1
)
if not exist "node_modules\vite" call npm install --no-audit --no-fund
echo   Opening http://localhost:5173/v4/index.html  (close this window to stop)
echo.
call npx vite --open /v4/index.html
pause
