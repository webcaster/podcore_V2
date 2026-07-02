@echo off
setlocal enabledelayedexpansion
title PodCore - Startup

:: Lese Version aus package.json
for /f "tokens=2 delims=:, " %%v in ('findstr "\"version\"" package.json') do (
    set RAW_VERSION=%%v
)
set APP_VERSION=%RAW_VERSION:"=%

echo ===================================================
echo PodCore v%APP_VERSION% - Podcast Management System
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

:: Build server if dist\index.js doesn't exist
if not exist "server\dist\index.js" (
    echo [INFO] Kompiliere Server TypeScript...
    cd server
    call npx tsc
    cd ..
    echo [INFO] Server kompiliert.
)

:: WICHTIG: dist\public immer mit aktuellem Frontend-Build synchronisieren
:: Verhindert, dass veraltete Builds ausgeliefert werden
echo [INFO] Synchronisiere Frontend-Build...
if exist "server\dist\public" rmdir /s /q "server\dist\public"
xcopy /e /i /q "server\public" "server\dist\public" >nul
echo [INFO] Frontend-Build synchronisiert.

echo.
echo [INFO] Starte PodCore Server v%APP_VERSION%...
echo [INFO] Das System ist unter http://localhost:3001 erreichbar.
echo [INFO] Druecken Sie STRG+C, um den Server zu beenden.
echo.

:: Start the server
cd server
node dist/index.js
