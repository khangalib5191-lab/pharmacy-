@echo off
title PharmaConnect - Pharmacy POS & Management System
cls

echo ===============================================================================
echo     🏥 PHARMACONNECT - PHARMACY POS & STOCK MANAGEMENT SYSTEM
echo ===============================================================================
echo.
echo  [1/2] Initializing Backend Server & Database...
echo  [2/2] Opening PharmaConnect in your browser...
echo.

:: Launch default browser to localhost:5000 after 2 seconds
start "" http://localhost:5000

:: Start the Node server (Express + SQLite + React Frontend)
node server/index.js

pause
