@echo off
title One Ten Pharmacy - Pharmacy POS & Management System
cls

echo ===============================================================================
echo     ?? ONE TEN PHARMACY - POS & STOCK MANAGEMENT SYSTEM
echo ===============================================================================
echo.
echo  [1/2] Initializing Backend Server & Database...
echo  [2/2] Opening One Ten Pharmacy in your browser...
echo.

cd /d "%~dp0"

:: Launch default browser to localhost:5000
start "" http://localhost:5000

:: Start the Node server (Express + SQLite + React Frontend)
node server/index.js

pause
