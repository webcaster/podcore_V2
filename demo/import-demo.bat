@echo off
:: ============================================================
:: PodCore Demo-Daten Import (Windows)
:: ============================================================
:: Dieses Skript importiert die Demo-Daten in die PodCore-Datenbank.
:: Voraussetzung: sqlite3.exe muss im PATH sein oder im selben Ordner liegen.
:: Download: https://www.sqlite.org/download.html
:: ============================================================

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set SQL_FILE=%SCRIPT_DIR%demo-data.sql
set DB_PATH=%USERPROFILE%\.podcore\podcore.db

echo ==================================================
echo   PodCore Demo-Daten Import
echo ==================================================
echo.
echo   Datenbank: %DB_PATH%
echo   SQL-Datei: %SQL_FILE%
echo.

:: sqlite3 prüfen
where sqlite3 >nul 2>&1
if %errorlevel% neq 0 (
  :: Prüfe ob sqlite3.exe im Skript-Ordner liegt
  if not exist "%SCRIPT_DIR%sqlite3.exe" (
    echo   FEHLER: sqlite3.exe nicht gefunden.
    echo   Bitte herunterladen von: https://www.sqlite.org/download.html
    echo   und in diesen Ordner legen: %SCRIPT_DIR%
    pause
    exit /b 1
  )
  set SQLITE3=%SCRIPT_DIR%sqlite3.exe
) else (
  set SQLITE3=sqlite3
)

:: Datenbank prüfen
if not exist "%DB_PATH%" (
  echo   FEHLER: Datenbank nicht gefunden: %DB_PATH%
  echo   Stelle sicher, dass PodCore mindestens einmal gestartet wurde.
  pause
  exit /b 1
)

:: SQL-Datei prüfen
if not exist "%SQL_FILE%" (
  echo   FEHLER: SQL-Datei nicht gefunden: %SQL_FILE%
  pause
  exit /b 1
)

echo   WARNUNG: Dieses Skript fuegt Demo-Daten in deine Datenbank ein.
echo   Bestehende Daten werden nicht geloescht.
echo.
set /p confirm="  Fortfahren? (j/N): "
if /i not "%confirm%"=="j" (
  echo   Abgebrochen.
  pause
  exit /b 0
)

echo.
echo   [1/3] Erstelle Backup...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DATUM=%%c%%b%%a
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set ZEIT=%%a%%b%%c
set BACKUP_PATH=%DB_PATH:podcore.db=podcore_backup_%DATUM%_%ZEIT%.db%
copy "%DB_PATH%" "%BACKUP_PATH%" >nul
echo         Backup erstellt: %BACKUP_PATH% OK

echo   [2/3] Importiere Demo-Daten...
%SQLITE3% "%DB_PATH%" < "%SQL_FILE%"
if %errorlevel% neq 0 (
  echo   FEHLER beim Import!
  pause
  exit /b 1
)
echo         Import abgeschlossen OK

echo   [3/3] Pruefe Import...
for /f %%i in ('%SQLITE3% "%DB_PATH%" "SELECT COUNT(*) FROM episodes WHERE id LIKE ''demo-%%'';"') do set EP=%%i
for /f %%i in ('%SQLITE3% "%DB_PATH%" "SELECT COUNT(*) FROM sponsors WHERE id LIKE ''demo-%%'';"') do set SP=%%i
for /f %%i in ('%SQLITE3% "%DB_PATH%" "SELECT COUNT(*) FROM ideas WHERE id LIKE ''demo-%%'';"') do set ID=%%i

echo.
echo ==================================================
echo   Import erfolgreich!
echo.
echo   Importierte Datensaetze:
echo     Episoden:  %EP%
echo     Sponsoren: %SP%
echo     Ideen:     %ID%
echo.
echo   Demo-Zugangsdaten:
echo     max.mueller     / demo1234  (Admin)
echo     sarah.schneider / demo1234  (Redakteur)
echo     tom.weber       / demo1234  (Moderator)
echo     lena.braun      / demo1234  (Produktion)
echo.
echo   Starte PodCore neu, damit alle Aenderungen sichtbar sind.
echo ==================================================
pause
