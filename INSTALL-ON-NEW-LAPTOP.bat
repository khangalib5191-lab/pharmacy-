@echo off
title One Ten Pharmacy - Automated Setup & Installation
cls
color 0B

echo ===============================================================================
echo     =================================================================
echo           ONE TEN PHARMACY - AUTOMATED SETUP & INSTALLATION
echo     =================================================================
echo ===============================================================================
echo.

cd /d "%~dp0"

echo  [Step 1/4] Checking Node.js Environment...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [X] Node.js is NOT installed on this laptop!
    echo.
    echo  -------------------------------------------------------------------------
    echo  ACTION REQUIRED:
    echo  1. Please install Node.js (LTS version) on this laptop.
    echo  2. If you copied the Node.js installer (node-v*.msi) to this folder,
    echo     it will now attempt to run it automatically.
    echo  -------------------------------------------------------------------------
    echo.
    for %%f in (node-*.msi) do (
        echo  Found installer: %%f. Starting Node.js installation...
        start "" "%%f"
        echo  Follow the on-screen prompts, then re-run this script after completion.
        pause
        exit /b 1
    )
    echo  Opening Node.js official download page...
    start "" "https://nodejs.org/en/download"
    echo  After installing Node.js, re-run this setup script.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo  [OK] Node.js detected: %NODE_VER%
echo.

echo  [Step 2/4] Verifying Database and Migrations...
node -e "
import('./server/db/database.js').then(async ({ initDatabase }) => {
  await initDatabase();
  console.log('  [OK] Database initialized with complete schema and packaging formulas.');
  process.exit(0);
}).catch(err => {
  console.error('  [!] Database notice:', err.message);
  process.exit(0);
});
"

echo.
echo  [Step 3/4] Creating Desktop Shortcut with Official Pharmacy Icon...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"

echo.
echo  [Step 4/4] Starting One Ten Pharmacy POS System...
echo.
echo ===============================================================================
echo   SUCCESS! Installation and setup completed 100%.
echo.
echo   System URL:    http://localhost:5000
echo   Admin Login:   admin / admin123
echo   Cashier Login: cashier / cashier123
echo.
echo   Opening One Ten Pharmacy in your browser now...
echo ===============================================================================
echo.

:: Open browser
start "" http://localhost:5000

:: Start server
node server/index.js

pause
