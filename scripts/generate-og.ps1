Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$width = 1200
$height = 630
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function New-RoundedPath {
  param([int]$X, [int]$Y, [int]$Width, [int]$Height, [int]$Radius)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$blue = [System.Drawing.Color]::FromArgb(0, 74, 173)
$blueDark = [System.Drawing.Color]::FromArgb(0, 57, 134)
$white = [System.Drawing.Color]::White
$ink = [System.Drawing.Color]::FromArgb(24, 34, 52)
$muted = [System.Drawing.Color]::FromArgb(105, 119, 139)
$line = [System.Drawing.Color]::FromArgb(224, 232, 241)
$pale = [System.Drawing.Color]::FromArgb(239, 245, 252)

$gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 0, $width, $height), $blue, $blueDark, 0
)
$graphics.FillRectangle($gradient, 0, 0, $width, $height)
$orbitBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(22, 185, 218, 255))
$graphics.FillEllipse($orbitBrush, 360, -280, 520, 520)
$graphics.FillEllipse($orbitBrush, -250, 430, 520, 520)

$panelShadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 0, 20, 54))
$panelBrush = [System.Drawing.SolidBrush]::new($white)
$panel = New-RoundedPath -X 704 -Y 78 -Width 428 -Height 474 -Radius 20
$shadow = New-RoundedPath -X 714 -Y 88 -Width 428 -Height 474 -Radius 20
$graphics.FillPath($panelShadow, $shadow)
$graphics.FillPath($panelBrush, $panel)

$fontEyebrow = [System.Drawing.Font]::new("Segoe UI", 14, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontTitle = [System.Drawing.Font]::new("Segoe UI", 58, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontBody = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontPanelTitle = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontTableHead = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontTable = [System.Drawing.Font]::new("Segoe UI", 14, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontTableBold = [System.Drawing.Font]::new("Segoe UI", 14, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSmall = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fontUrl = [System.Drawing.Font]::new("Segoe UI", 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$whiteBrush = [System.Drawing.SolidBrush]::new($white)
$inkBrush = [System.Drawing.SolidBrush]::new($ink)
$mutedBrush = [System.Drawing.SolidBrush]::new($muted)
$blueBrush = [System.Drawing.SolidBrush]::new($blue)
$paleBrush = [System.Drawing.SolidBrush]::new($pale)
$linePen = [System.Drawing.Pen]::new($line, 1)
$bluePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(208, 222, 239), 1)

$logo = [System.Drawing.Image]::FromFile((Join-Path $root "public\tor_logo_white.png"))
$graphics.DrawImage(
  $logo,
  [System.Drawing.Rectangle]::new(70, 45, 445, 122),
  [System.Drawing.Rectangle]::new(55, 425, 1090, 315),
  [System.Drawing.GraphicsUnit]::Pixel
)

$graphics.DrawString("DEPARTMENT OF AGRICULTURE  /  CARAGA REGION", $fontEyebrow, $whiteBrush, 78, 220)
$graphics.DrawString("Travel Order", $fontTitle, $whiteBrush, 74, 263)
$graphics.DrawString("Records", $fontTitle, $whiteBrush, 74, 326)
$graphics.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(150, 210, 255)), 80, 407, 72, 5)
$graphics.DrawString("Public register of official travel orders.", $fontBody, $whiteBrush, 78, 435)
$graphics.DrawString("Browse by office and travel date.", $fontBody, $whiteBrush, 78, 466)
$graphics.DrawString("da-records.github.io", $fontUrl, $whiteBrush, 78, 568)

$graphics.DrawString("PUBLIC REGISTER", $fontEyebrow, $blueBrush, 738, 111)
$graphics.DrawString("Travel order records", $fontPanelTitle, $inkBrush, 738, 141)
$graphics.DrawString("Browse published records", $fontSmall, $mutedBrush, 738, 173)
$graphics.DrawLine($linePen, 738, 209, 1098, 209)
$graphics.DrawString("OFFICE", $fontTableHead, $mutedBrush, 738, 229)
$graphics.DrawString("TRAVEL NO.", $fontTableHead, $mutedBrush, 894, 229)
$graphics.DrawString("TRAVEL DATES", $fontTableHead, $mutedBrush, 1002, 229)
$graphics.DrawLine($linePen, 738, 253, 1098, 253)

$rows = @(
  @("Operations", "MMYY-####", "Date range"),
  @("Research", "MMYY-####", "Date range"),
  @("Finance", "MMYY-####", "Date range")
)
$rowY = 273
foreach ($row in $rows) {
  $graphics.DrawString($row[0], $fontTableBold, $inkBrush, 738, $rowY)
  $graphics.DrawString($row[1], $fontTable, $blueBrush, 894, $rowY)
  $graphics.DrawString($row[2], $fontSmall, $mutedBrush, 1002, $rowY)
  $rowY += 53
  $graphics.DrawLine($linePen, 738, $rowY - 10, 1098, $rowY - 10)
}

$pillPath = New-RoundedPath -X 738 -Y 455 -Width 167 -Height 38 -Radius 12
$graphics.FillPath($paleBrush, $pillPath)
$graphics.DrawString("FILTER BY OFFICE", $fontTableHead, $blueBrush, 756, 467)
$graphics.DrawString("Newest travel dates first", $fontSmall, $mutedBrush, 738, 510)

$output = Join-Path $root "public\og.png"
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$logo.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$gradient.Dispose()
$orbitBrush.Dispose()
$panelShadow.Dispose()
$panelBrush.Dispose()
$panel.Dispose()
$shadow.Dispose()
$fontEyebrow.Dispose()
$fontTitle.Dispose()
$fontBody.Dispose()
$fontPanelTitle.Dispose()
$fontTableHead.Dispose()
$fontTable.Dispose()
$fontTableBold.Dispose()
$fontSmall.Dispose()
$fontUrl.Dispose()
$whiteBrush.Dispose()
$inkBrush.Dispose()
$mutedBrush.Dispose()
$blueBrush.Dispose()
$paleBrush.Dispose()
$linePen.Dispose()
$bluePen.Dispose()
$pillPath.Dispose()