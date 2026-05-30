@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-pos.ps1"
if errorlevel 1 (
  echo.
  echo The app could not start. Read the message above, then press any key.
  pause >nul
)
