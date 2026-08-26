@echo off
title Create PharmaConnect Desktop Shortcut
cls

echo ===============================================================================
echo      Creating PharmaConnect Desktop Icon & Shortcut...
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $desktop = [System.Environment]::GetFolderPath('Desktop'); ^
   $shortcutPath = Join-Path $desktop 'PharmaConnect POS.lnk'; ^
   $targetPath = 'E:\pharmacy\launch-app.bat'; ^
   $shortcut = $ws.CreateShortcut($shortcutPath); ^
   $shortcut.TargetPath = $targetPath; ^
   $shortcut.WorkingDirectory = 'E:\pharmacy'; ^
   $shortcut.Description = 'Launch PharmaConnect Pharmacy POS and Stock Management System'; ^
   $shortcut.IconLocation = 'shell32.dll,266'; ^
   $shortcut.Save(); ^
   Write-Host '✅ Desktop Shortcut successfully created at: ' $shortcutPath -ForegroundColor Green"

echo.
echo ===============================================================================
echo  Shortcut created! You can now double-click 'PharmaConnect POS' on your Desktop.
echo ===============================================================================
echo.
pause
