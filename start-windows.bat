@echo off
setlocal enabledelayedexpansion
title PodCore - Startup
chcp 65001 >nul 2>&1

cd /d "%~dp0"

for /f "tokens=2 delims=:, " %%v in ('findstr "\"version\"" package.json') do set RAW_VERSION=%%v
set APP_VERSION=%RAW_VERSION:"=%
if not defined PORT set PORT=3001

echo ===================================================
echo PodCore v%APP_VERSION% - Podcast Management System
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js ist nicht installiert.
    echo Installieren Sie Node.js 18 oder neuer und fuehren Sie install.bat aus.
    pause
    exit /b 1
)

for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] PodCore benoetigt Node.js 18 oder neuer.
    pause
    exit /b 1
)

if not exist "server\node_modules" goto :not_installed
if not exist "server\dist\index.js" goto :not_installed
if not exist "server\dist\public" goto :not_installed

echo [INFO] Starte PodCore Server v%APP_VERSION% ...
echo [INFO] Lokal: http://localhost:%PORT%
echo [INFO] Druecken Sie STRG+C, um den Server zu beenden.
echo.

node server\dist\index.js
pause
exit /b %errorlevel%

:not_installed
echo [ERROR] PodCore ist noch nicht vollstaendig installiert oder gebaut.
echo Fuehren Sie im PodCore-Verzeichnis aus: install.bat
pause
exit /b 1
