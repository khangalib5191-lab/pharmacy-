Set oWS = WScript.CreateObject("WScript.Shell")
sDesktop = oWS.SpecialFolders("Desktop")
Set oLink = oWS.CreateShortcut(sDesktop & "\PharmaConnect POS.lnk")
oLink.TargetPath = "E:\pharmacy\launch-app.bat"
oLink.WorkingDirectory = "E:\pharmacy"
oLink.Description = "Launch PharmaConnect Pharmacy Management & POS System"
oLink.IconLocation = "shell32.dll,266"
oLink.Save
WScript.Echo "Desktop shortcut created successfully!"
