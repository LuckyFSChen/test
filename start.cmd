@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js, or open index.html directly.
 pause
 exit /b 1
)
start "" http://127.0.0.1:6666
node server.js
pause

