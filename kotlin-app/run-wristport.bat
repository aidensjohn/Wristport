@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo   wristport — Kotlin JVM + Java Real Tizen SDB Launcher
echo ============================================================

cd /d "%~dp0"

where java >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Java 17+ is required on PATH.
  echo         Install Eclipse Temurin / Microsoft OpenJDK 17+ and retry.
  pause
  exit /b 1
)

set "GRADLE_BIN="
where gradle >nul 2>nul
if not errorlevel 1 (
  set "GRADLE_BIN=gradle"
) else (
  set "LOCAL_GRADLE=%~dp0.gradle-tool\gradle-8.10.2\bin\gradle.bat"
  if not exist "!LOCAL_GRADLE!" (
    echo [1/2] Downloading Gradle 8.10.2 once into .gradle-tool\...
    powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path '.gradle-tool' | Out-Null; Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-8.10.2-bin.zip' -OutFile '.gradle-tool\gradle.zip'; Expand-Archive -Path '.gradle-tool\gradle.zip' -DestinationPath '.gradle-tool' -Force; Remove-Item '.gradle-tool\gradle.zip'"
    if errorlevel 1 (
      echo [ERROR] Could not bootstrap Gradle automatically.
      pause
      exit /b 1
    )
  )
  set "GRADLE_BIN=!LOCAL_GRADLE!"
)

echo [2/2] Building and launching wristport (Kotlin JVM + Java)...
call "!GRADLE_BIN!" run --no-daemon --console=plain
if errorlevel 1 (
  echo [ERROR] wristport failed to start. See errors above.
  pause
  exit /b 1
)
