@echo off
setlocal enabledelayedexpansion
title PodCore - Installer
chcp 65001 >nul 2>&1

cd /d "%~dp0"

for /f "tokens=2 delims=:, " %%v in ('findstr "\"version\"" package.json') do set RAW_VERSION=%%v
set APP_VERSION=%RAW_VERSION:"=%

echo ===================================================
echo PodCore v%APP_VERSION% - Installer
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js ist nicht installiert.
    echo Bitte installieren Sie Node.js 18 oder neuer: https://nodejs.org
    pause
    exit /b 1
)

for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
for /f %%v in ('node -v') do set NODE_VERSION=%%v
echo [INFO] Node.js %NODE_VERSION% gefunden.
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] PodCore benoetigt Node.js 18 oder neuer.
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm wurde nicht gefunden. Versuche die Aktivierung ueber Corepack ...
    where corepack >nul 2>&1
    if not errorlevel 1 (
        call corepack enable >nul 2>&1
        call corepack prepare pnpm@10 --activate >nul 2>&1
    )
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pnpm konnte nicht aktiviert werden.
    echo Fuehren Sie diese Befehle aus und starten Sie den Installer erneut:
    echo   corepack enable
    echo   corepack prepare pnpm@10 --activate
    echo Alternativ: npm install -g pnpm@10
    pause
    exit /b 1
)

for /f %%v in ('pnpm --version') do set PNPM_VERSION=%%v
echo [INFO] pnpm %PNPM_VERSION% gefunden.
echo.

echo [1/4] Installiere Root-Abhaengigkeiten ...
call pnpm install --frozen-lockfile
if errorlevel 1 goto :install_error

echo [2/4] Installiere Client-Abhaengigkeiten ...
call pnpm --dir client install --frozen-lockfile
if errorlevel 1 goto :install_error

echo [3/4] Installiere Server-Abhaengigkeiten ...
call pnpm --dir server install --frozen-lockfile
if errorlevel 1 goto :install_error

echo [4/4] Erstelle Produktions-Build ...
call pnpm run build
if errorlevel 1 goto :install_error

echo.
echo ===================================================
echo Installation abgeschlossen.
echo Starten Sie PodCore mit: start-windows.bat
echo Lokal: http://localhost:3001
echo ===================================================
echo.
pause
exit /b 0

:install_error
echo.
echo [ERROR] Die Installation wurde wegen eines Fehlers abgebrochen.
echo Pruefen Sie die Ausgabe oberhalb und starten Sie install.bat erneut.
pause
exit /b 1
