@echo off
title PharmaConnect LAN Host Server Launcher
cls
echo =======================================================================
echo     🏥 PHARMACONNECT - PHARMACY POS & STOCK MANAGEMENT SYSTEM
echo =======================================================================
echo.
echo  Starting local host backend server and network interface...
echo.

node server/index.js

pause
