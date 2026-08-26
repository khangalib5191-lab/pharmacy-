$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "PharmaConnect POS.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "E:\pharmacy\launch-app.bat"
$Shortcut.WorkingDirectory = "E:\pharmacy"
$Shortcut.Description = "Launch PharmaConnect Pharmacy POS & Stock Management System"
$Shortcut.IconLocation = "shell32.dll,266"
$Shortcut.Save()
Write-Output "✅ Desktop Shortcut successfully created at: $ShortcutPath"
