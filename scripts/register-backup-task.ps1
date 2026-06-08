# Registers a Windows Task Scheduler job that runs the backup script on a
# weekly or monthly cadence. Run once from an elevated PowerShell:
#
#   powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1 -Frequency Weekly
#   powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1 -Frequency Monthly -Time 01:30
#
# To remove it later:
#   schtasks /Delete /TN "MVBA School System Backup" /F

param(
    [ValidateSet('Weekly', 'Monthly')]
    [string]$Frequency = 'Weekly',

    [string]$Time = '02:00',

    [string]$ProjectPath = (Split-Path -Parent $PSScriptRoot),

    [string]$TaskName = 'MVBA School System Backup'
)

$ErrorActionPreference = 'Stop'

# Locate node.exe
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Error "node.exe not found on PATH. Install Node.js or add it to PATH, then re-run."
    exit 1
}

$scriptPath = Join-Path $ProjectPath 'scripts\backup.mjs'
if (-not (Test-Path $scriptPath)) {
    Write-Error "Could not find $scriptPath. Pass -ProjectPath pointing at the app folder."
    exit 1
}

# schtasks runs the command verbatim, so cd into the project first (for .env and
# the backups/ folder), then run node. Quote everything that may contain spaces.
$command = "cmd /c cd /d `"$ProjectPath`" && `"$node`" scripts\backup.mjs"

Write-Host "Node:    $node"
Write-Host "Project: $ProjectPath"
Write-Host "When:    $Frequency at $Time"
Write-Host ""

$scheduleArgs = @('/Create', '/TN', $TaskName, '/TR', $command, '/ST', $Time, '/F', '/RL', 'HIGHEST')

if ($Frequency -eq 'Weekly') {
    # Every Sunday
    $scheduleArgs += @('/SC', 'WEEKLY', '/D', 'SUN')
} else {
    # First day of every month
    $scheduleArgs += @('/SC', 'MONTHLY', '/D', '1')
}

& schtasks.exe @scheduleArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Registered scheduled task: $TaskName" -ForegroundColor Green
    Write-Host "Run it now to test:  schtasks /Run /TN `"$TaskName`""
} else {
    Write-Error "schtasks failed with exit code $LASTEXITCODE. Try running this from an elevated (Administrator) PowerShell."
    exit 1
}
