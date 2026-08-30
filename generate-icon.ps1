Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Dark Teal / Navy circular background
$rect = New-Object System.Drawing.Rectangle 10, 10, 236, 236
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 27, 42))
$g.FillEllipse($bgBrush, $rect)

# 2. Glowing Teal Border Ring
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 20, 184, 166)), 12
$g.DrawEllipse($pen, 16, 16, 224, 224)

# 3. Medical Cross in Bright Emerald
$crossBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
$g.FillRectangle($crossBrush, 108, 55, 40, 146)
$g.FillRectangle($crossBrush, 55, 108, 146, 40)

# 4. White Center Circle Badge
$centerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$g.FillEllipse($centerBrush, 88, 88, 80, 80)
$whitePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 5
$g.DrawEllipse($whitePen, 88, 88, 80, 80)

# 5. Bold "Rx" Pharmacy emblem
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
$font = New-Object System.Drawing.Font('Segoe UI', 32, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('Rx', $font, $whiteBrush, 128, 128, $sf)

$g.Dispose()

# Save as ICO
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$targetPath = 'E:\pharmacy\pharmacy.ico'
$fs = New-Object System.IO.FileStream $targetPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$bmp.Dispose()

Write-Host "✅ Created high-res icon: $targetPath" -ForegroundColor Green
