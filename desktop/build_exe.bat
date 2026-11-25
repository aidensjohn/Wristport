@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo   wristport Standalone Windows .exe Builder
echo   Vite dist/ + Python Bridge + pywebview + PyInstaller
echo ============================================================

cd /d "%~dp0\.."

set "EXE_NAME=wristport"
if not "%~1"=="" if /i not "%~1"=="--rebuild" set "EXE_NAME=%~1"

set "FORCE_REBUILD=0"
if /i "%~1"=="--rebuild" set "FORCE_REBUILD=1"
if /i "%~2"=="--rebuild" set "FORCE_REBUILD=1"

echo [1/3] Preparing Vite frontend bundle (base: ./)...
if exist "dist\index.html" if "!FORCE_REBUILD!"=="0" (
  echo       Using pre-built dist\ bundle included in kit.
  echo       (Run "desktop\build_exe.bat --rebuild" to recompile from src\.)
) else (
  if not exist "package.json" (
    echo [ERROR] Neither dist\index.html nor package.json was found in %CD%.
    pause
    exit /b 1
  )
  if not exist "node_modules" (
    echo       Installing npm dependencies...
    call npm install
    if errorlevel 1 (
      echo [ERROR] npm install failed. Ensure Node.js 20+ is installed.
      pause
      exit /b 1
    )
  )
  call npm run build
  if errorlevel 1 (
    echo [ERROR] npm run build failed.
    pause
    exit /b 1
  )
)

echo [2/3] Installing Python desktop dependencies...
set "PY_CMD=python"
where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Python 3.10+ not found on PATH. Install Python and retry.
    pause
    exit /b 1
  )
  set "PY_CMD=py -3"
)

%PY_CMD% -m pip install --upgrade -r desktop\requirements.txt
if errorlevel 1 (
  echo [ERROR] pip install failed. Ensure Python 3.10+ and pip are working.
  pause
  exit /b 1
)

echo [3/3] Packaging release\%EXE_NAME%.exe via PyInstaller...
%PY_CMD% -m PyInstaller --noconfirm --clean --onefile --windowed ^
  --paths desktop ^
  --name "%EXE_NAME%" ^
  --distpath release ^
  --add-data "dist;dist" ^
  --add-data "desktop\bridge.py;." ^
  desktop\main.py

if errorlevel 1 (
  echo [ERROR] PyInstaller failed.
  pause
  exit /b 1
)

echo.
echo [SUCCESS] Built standalone executable: %CD%\release\%EXE_NAME%.exe
pause
