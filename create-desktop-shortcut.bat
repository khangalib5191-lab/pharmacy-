@echo off
title One Ten Pharmacy - Create Desktop Shortcut
cls

echo ===============================================================================
echo      Creating One Ten Pharmacy POS Desktop Icon and Shortcut...
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"

echo.
echo ===============================================================================
echo  Done! Double-click 'One Ten Pharmacy POS' on your Desktop to open the system.
echo ===============================================================================
echo.
pause
