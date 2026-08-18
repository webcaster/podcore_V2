@echo off
setlocal
set "TASK_NAME=PodCore-Automatisches-Backup"
set "SCRIPT=%~dp0run-automatic-backup-windows.bat"
echo Erstellt eine taegliche PodCore-Sicherung um 20:00 Uhr.
schtasks /Create /TN "%TASK_NAME%" /TR "\"%SCRIPT%\"" /SC DAILY /ST 20:00 /F
if errorlevel 1 (
  echo Die Aufgabenplanung konnte nicht eingerichtet werden. Starte diese Datei gegebenenfalls als Administrator.
  exit /b 1
)
echo Die geplante Sicherung wurde eingerichtet: %TASK_NAME%
