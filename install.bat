@echo off
setlocal enabledelayedexpansion
title PodCore - Installer
chcp 65001 >nul 2>&1

:: Ins Verzeichnis des Skripts wechseln
cd /d "%~dp0"

:: Version aus package.json lesen
for /f "tokens=2 delims=:, " %%v in ('findstr "\"version\"" package.json') do (
    set RAW_VERSION=%%v
)
set APP_VERSION=%RAW_VERSION:"=%

echo ===================================================
echo PodCore v%APP_VERSION% - Installer
echo ===================================================
echo.

:: Node.js pruefen
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js ist nicht installiert!
    echo.
    echo Bitte installieren Sie Node.js (Version 18 oder neuer):
    echo   https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f %%v in ('node -v') do set NODE_VER=%%v
echo [INFO] Node.js %NODE_VER% gefunden.

:: Server-Abhaengigkeiten installieren
echo [INFO] Installiere Server-Abhaengigkeiten...
cd server
call npm install --production --silent
cd ..
echo [INFO] Server-Abhaengigkeiten installiert.

:: TypeScript-Compiler installieren
if not exist "server\node_modules\.bin\tsc.cmd" (
    echo [INFO] Installiere TypeScript-Compiler...
    cd server
    call npm install --save-dev typescript --silent
    cd ..
    echo [INFO] TypeScript-Compiler installiert.
)

:: Server kompilieren
echo [INFO] Kompiliere Server (TypeScript zu JavaScript)...
cd server
call node_modules\.bin\tsc
cd ..
echo [INFO] Server kompiliert.

:: Frontend-Build synchronisieren
if exist "server\public" (
    echo [INFO] Synchronisiere Frontend-Build...
    if exist "server\dist\public" rmdir /s /q "server\dist\public"
    xcopy /e /i /q "server\public" "server\dist\public" >nul
    echo [INFO] Frontend-Build synchronisiert.
) else (
    echo [WARNUNG] server\public nicht gefunden - Frontend-Build fehlt.
)

echo.
echo ===================================================
echo Installation abgeschlossen!
echo.
echo Starten Sie PodCore mit:
echo   start-windows.bat
echo.
echo Das System ist dann unter http://localhost:3001 erreichbar.
echo ===================================================
echo.
pause
