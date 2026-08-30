$ws = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$oneDriveDesktop = Join-Path $env:USERPROFILE 'OneDrive\Desktop'
$appDir = $PSScriptRoot
$targetBat = Join-Path $appDir 'launch-app.bat'
$iconFile = Join-Path $appDir 'pharmacy.ico'

$destinations = @($desktop)
if (Test-Path $oneDriveDesktop) {
    $destinations += $oneDriveDesktop
}

foreach ($d in $destinations) {
    $shortcutPath = Join-Path $d 'One Ten Pharmacy POS.lnk'
    $sc = $ws.CreateShortcut($shortcutPath)
    $sc.TargetPath = $targetBat
    $sc.WorkingDirectory = $appDir
    $sc.Description = 'One Ten Pharmacy POS and Management System'
    $sc.IconLocation = $iconFile
    $sc.Save()
    Write-Host "✅ Created Desktop Shortcut with Icon at: $shortcutPath" -ForegroundColor Green
}
