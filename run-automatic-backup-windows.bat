@echo off
setlocal
cd /d "%~dp0"
call pnpm --dir server exec ts-node scripts/automatic-backup.ts
exit /b %ERRORLEVEL%
