param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath
)

$ErrorActionPreference = "Stop"
$stage = $null
$exeName = "electricity_power_monitoring_fe.exe"

function Write-Status { param([string]$Message) Write-Output "[GoGreen] $Message" }

function Test-WritableDirectory {
    param([string]$Path)
    try {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        $probe = Join-Path $Path (".write_test_" + [guid]::NewGuid().ToString("N"))
        [System.IO.File]::WriteAllText($probe, "test")
        Remove-Item -LiteralPath $probe -Force
        return $true
    } catch { return $false }
}

try {
    Write-Status "Starting receiver setup."

    if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
        throw "Receiver ZIP not found: $ZipPath"
    }

    $destinations = @(
        "C:\ProgramData\GoGreen\GoGreen_Receiver",
        "$env:ProgramFiles\GoGreen\GoGreen_Receiver"
    )

    $destination = $null
    foreach ($candidate in $destinations) {
        if (Test-WritableDirectory $candidate) { $destination = $candidate; break }
    }
    if (-not $destination) {
        throw "Cannot install the receiver. Neither ProgramData nor Program Files is writable."
    }

    Write-Status "Receiver destination: $destination"

    $stage = Join-Path $env:TEMP ("GoGreenReceiver_" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    Expand-Archive -LiteralPath $ZipPath -DestinationPath $stage -Force

    # The folder that contains the exe may be the root or one level down.
    $receiverRoot = $null
    if (Test-Path (Join-Path $stage $exeName) -PathType Leaf) {
        $receiverRoot = $stage
    } else {
        $receiverRoot = Get-ChildItem -LiteralPath $stage -Directory -Recurse |
            Where-Object { Test-Path (Join-Path $_.FullName $exeName) -PathType Leaf } |
            Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $receiverRoot) { throw "The ZIP does not contain $exeName." }

    # Clean old version so removed files don't linger, then copy.
    Get-ChildItem -LiteralPath $destination -Force -ErrorAction SilentlyContinue |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Get-ChildItem -LiteralPath $receiverRoot -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
    }

    Remove-Item -LiteralPath $stage -Recurse -Force
    $stage = $null

    if (-not (Test-Path (Join-Path $destination $exeName) -PathType Leaf)) {
        throw "Extraction finished but $exeName is missing in $destination."
    }

    [Environment]::SetEnvironmentVariable("GoGreen_RECEIVER_DIR", $destination, "User")
    $env:GoGreen_RECEIVER_DIR = $destination

    Write-Status "Receiver installation completed successfully."
    exit 0
}
catch {
    Write-Output "[GoGreen] ERROR: $($_.Exception.Message)"
    exit 1
}
finally {
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}