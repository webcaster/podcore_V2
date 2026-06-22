@echo off
setlocal enabledelayedexpansion
title PodCore v2.1.3 - Startup

echo ===================================================
echo PodCore v2.1.3 - Podcast Management System
echo ===================================================
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js ist nicht installiert!
    echo Bitte laden Sie Node.js von https://nodejs.org herunter und installieren Sie es.
    pause
    exit /b 1
)

:: Install server dependencies if node_modules doesn't exist
if not exist "server\node_modules" (
    echo [INFO] Installiere Server-Abhaengigkeiten...
    cd server
    call npm install --production
    cd ..
)

echo.
echo [INFO] Starte PodCore Server...
echo [INFO] Das System ist unter http://localhost:3001 erreichbar.
echo [INFO] Druecken Sie STRG+C, um den Server zu beenden.
echo.

:: Start the server
cd server
node dist/index.js
