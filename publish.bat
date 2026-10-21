@echo off
setlocal EnableDelayedExpansion
title FineTune - publish to GitHub
cd /d "%~dp0"
set REPO=finetune

echo.
echo   FineTune  /  publish to GitHub Pages
echo   ------------------------------------
echo.

rem --- tools ---------------------------------------------------------------
set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%ProgramFiles%\GitHub CLI;%ProgramFiles%\nodejs"
where node >nul 2>nul || ( echo   Node.js was not found. Install the LTS from https://nodejs.org and run publish.bat again. & pause & exit /b 1 )
where git >nul 2>nul
if errorlevel 1 call :install Git.Git Git
where git >nul 2>nul || ( echo   Git is still missing. Install it from https://git-scm.com and run publish.bat again. & pause & exit /b 1 )
where gh >nul 2>nul
if errorlevel 1 call :install GitHub.cli "GitHub CLI"
set HAVEGH=1
where gh >nul 2>nul || set HAVEGH=0

rem --- 1. build check (same build GitHub will run) -----------------------
echo   [1/4] Checking that the site builds...
if not exist "node_modules\vite" call npm install --no-audit --no-fund
set "BASE_PATH=/%REPO%/"
call npm run build
if errorlevel 1 (
  echo.
  echo   The build failed - nothing was uploaded. Send the messages above to Claude.
  pause & exit /b 1
)
set "BASE_PATH="

rem --- 2. local repository ------------------------------------------------
echo   [2/4] Preparing the repository...
if not exist ".github\workflows" mkdir ".github\workflows"
copy /y "deploy\github-pages.yml" ".github\workflows\deploy.yml" >nul
if not exist ".git" git init -b main >nul

if "%HAVEGH%"=="1" goto :withgh
goto :nogh

rem ==========================================================================
:withgh
gh auth status >nul 2>nul
if errorlevel 1 (
  echo   Sign in to GitHub: a browser window opens - paste the code shown here.
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 ( pause & exit /b 1 )
)
gh auth setup-git >nul 2>nul
for /f "delims=" %%u in ('gh api user -q .login') do set GHUSER=%%u
call :commit

echo   [3/4] Uploading to github.com/!GHUSER!/%REPO% ...
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  gh repo view "!GHUSER!/%REPO%" >nul 2>nul
  if errorlevel 1 (
    gh repo create %REPO% --public --source . --remote origin --description "FineTune - portfolio of Luiz Gustavo Czaika"
  ) else (
    git remote add origin "https://github.com/!GHUSER!/%REPO%.git"
  )
)
git push -u origin main
if errorlevel 1 ( pause & exit /b 1 )

echo   [4/4] Turning on GitHub Pages...
gh api -X POST "repos/!GHUSER!/%REPO%/pages" -f build_type=workflow >nul 2>nul
gh api -X PUT "repos/!GHUSER!/%REPO%/pages" -f build_type=workflow >nul 2>nul
timeout /t 3 >nul
gh workflow run deploy.yml >nul 2>nul
goto :done

rem ==========================================================================
:nogh
echo.
echo   GitHub CLI is not available - using the browser instead.
set /p GHUSER=   Your GitHub username: 
call :commit
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo   A page opens to create the repository "%REPO%". Keep it PUBLIC, do not add a README,
  echo   click "Create repository", then come back here.
  start "" "https://github.com/new?name=%REPO%&visibility=public&description=FineTune%%20portfolio"
  pause
  git remote add origin "https://github.com/!GHUSER!/%REPO%.git"
)
echo   [3/4] Uploading (sign in to GitHub if a window asks)...
git push -u origin main
if errorlevel 1 ( pause & exit /b 1 )

echo   [4/4] Publishing the built site to the gh-pages branch...
type nul > dist\.nojekyll
pushd dist
if exist ".git" rmdir /s /q ".git"
git init -b gh-pages >nul
git add -A
git -c user.name="!GHUSER!" -c user.email="!GHUSER!@users.noreply.github.com" commit -m "Deploy" >nul
git push -f "https://github.com/!GHUSER!/%REPO%.git" gh-pages
popd
echo.
echo   Last step: on the page that opens, under "Build and deployment" choose
echo   Source = "Deploy from a branch", Branch = "gh-pages" / root, and Save.
start "" "https://github.com/!GHUSER!/%REPO%/settings/pages"
goto :done

rem ==========================================================================
:done
echo.
echo   Done. In about 1-2 minutes the site is live at:
echo.
echo       https://!GHUSER!.github.io/%REPO%/
echo.
echo   Build progress: https://github.com/!GHUSER!/%REPO%/actions
start "" "https://github.com/!GHUSER!/%REPO%/actions"
echo.
pause
exit /b 0

:commit
git config user.name >nul 2>nul || git config user.name "!GHUSER!"
git config user.email >nul 2>nul || git config user.email "!GHUSER!@users.noreply.github.com"
git add -A
git commit -m "FineTune portfolio update" >nul 2>nul
git branch -M main
exit /b 0

:install
where winget >nul 2>nul
if errorlevel 1 exit /b 1
echo   %~2 is not installed. Installing it with winget (official package).
echo   Windows will ask for permission - click "Yes".
winget install --id %1 -e --source winget --accept-package-agreements --accept-source-agreements
exit /b 0
