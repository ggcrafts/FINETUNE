@echo off
setlocal
title FineTune - Portfolio Update
cd /d "%~dp0"
echo.
echo   FineTune  /  Portfolio Update
echo   ------------------------------------------------------------
echo   Editor de conteudo do site v3 (jobs, imagens, videos, textos).
echo   Salva em public\v3\content.json e importa midia para public\v3\media\
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)
if not exist "node_modules\vite" call npm install --no-audit --no-fund
if not exist "node_modules\ffmpeg-static" call npm install --no-audit --no-fund
echo   Abrindo http://localhost:5173/portfolio-update/   (feche esta janela para encerrar)
echo.
call npx vite --open /portfolio-update/
pause
