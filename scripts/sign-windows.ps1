param(
  [string]$Thumbprint = "1180CA1A9509C9E968DED5E4274C89410AC52584",
  [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$app = Join-Path $repo "src-tauri\target\release\medicore.exe"

if (-not (Test-Path $app)) {
  throw "Release executable not found: $app. Run 'npm run tauri build' first."
}
if (-not (Get-ChildItem Cert:\CurrentUser\My\$Thumbprint -ErrorAction SilentlyContinue)) {
  throw "Code-signing certificate $Thumbprint is not in CurrentUser\My."
}

$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter signtool.exe |
  Where-Object { $_.FullName -like "*\x64\signtool.exe" } |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $signtool) {
  throw "signtool.exe was not found in the Windows SDK."
}

function Sign-Artifact([string]$Path) {
  & $signtool sign /fd SHA256 /sha1 $Thumbprint /tr $TimestampUrl /td SHA256 /d "MediCore" /du "https://github.com/vicky10ssm/medicore" $Path
  if ($LASTEXITCODE -ne 0) {
    throw "signtool failed for $Path"
  }
  $signature = Get-AuthenticodeSignature $Path
  if ($signature.Status -ne "Valid") {
    throw "Signature is not valid for $Path`: $($signature.StatusMessage)"
  }
  Write-Host "Signed: $Path"
}

# Sign the application before bundling so the executable embedded inside the
# installers is signed, then preserve it with --no-binary-patching.
Sign-Artifact $app
Push-Location $repo
try {
  npx tauri bundle --no-binary-patching
  if ($LASTEXITCODE -ne 0) {
    throw "tauri bundle failed."
  }
}
finally {
  Pop-Location
}

$nsis = Get-ChildItem (Join-Path $repo "src-tauri\target\release\bundle\nsis\*.exe") |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 -ExpandProperty FullName
$msi = Get-ChildItem (Join-Path $repo "src-tauri\target\release\bundle\msi\*.msi") |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $nsis -or -not $msi) {
  throw "Expected NSIS and MSI bundles were not produced."
}

Sign-Artifact $nsis
Sign-Artifact $msi

Write-Host ""
Write-Host "Signed artifacts:"
Get-AuthenticodeSignature $app, $nsis, $msi |
  Select-Object Status, @{n = "File"; e = { Split-Path $_.Path -Leaf } }, @{n = "Thumbprint"; e = { $_.SignerCertificate.Thumbprint } } |
  Format-Table -AutoSize
