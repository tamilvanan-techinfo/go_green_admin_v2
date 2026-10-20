param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath
)

$ErrorActionPreference = "Stop"
$stage = $null

function Write-Status {
    param([string]$Message)
    Write-Output "[GoGreen] $Message"
}

function Get-PythonPath {
    param([string]$Version)

    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue

    if ($launcher) {
        try {
            $result = & $launcher.Source "-$Version" -c "import sys; print(sys.executable)" 2>$null

            if ($LASTEXITCODE -eq 0 -and $result) {
                $path = ($result | Select-Object -Last 1).Trim()

                if (Test-Path -LiteralPath $path -PathType Leaf) {
                    return $path
                }
            }
        } catch {}
    }

    $versionFolder = $Version.Replace(".", "")

    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python$versionFolder\python.exe",
        "$env:ProgramFiles\Python$versionFolder\python.exe",
        "$env:ProgramFiles\Python$versionFolder\python.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            return $path
        }
    }

    $command = Get-Command python.exe -ErrorAction SilentlyContinue

    if ($command) {
        try {
            $actual = & $command.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null

            if ($LASTEXITCODE -eq 0 -and ($actual | Select-Object -Last 1).Trim() -eq $Version) {
                return $command.Source
            }
        } catch {}
    }

    return $null
}

function Run-Python {
    param(
        [string]$Python,
        [string[]]$Arguments
    )

    & $Python @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Python command failed with exit code $LASTEXITCODE."
    }
}

function Test-WritableDirectory {
    param([string]$Path)

    try {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null

        $probe = Join-Path $Path (".write_test_" + [guid]::NewGuid().ToString("N"))
        [System.IO.File]::WriteAllText($probe, "test")
        Remove-Item -LiteralPath $probe -Force

        return $true
    } catch {
        return $false
    }
}

try {
    Write-Status "Starting backend setup."

    if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
        throw "Backend ZIP not found: $ZipPath"
    }

    # Select the installation location automatically.
    $destinations = @(
        "C:\ProgramData\GoGreen\GoGreen_BE",
        "$env:ProgramFiles\GoGreen\GoGreen_BE"
    )

    $destination = $null

    foreach ($candidate in $destinations) {
        if (Test-WritableDirectory $candidate) {
            $destination = $candidate
            break
        }
    }

    if (-not $destination) {
        throw "Cannot install the Go Green backend. Neither ProgramData nor Program Files is writable. Run the installer with the required permissions."
    }

    Write-Status "Backend destination: $destination"

    # Extract ZIP to a temporary staging directory.
    Write-Status "Extracting backend ZIP..."

    $stage = Join-Path $env:TEMP ("GoGreenBackend_" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $stage -Force | Out-Null

    Expand-Archive -LiteralPath $ZipPath -DestinationPath $stage -Force

    $backendRoot = $null

    if (
        (Test-Path (Join-Path $stage "electricity_monitoring_be") -PathType Container) -and
        (Test-Path (Join-Path $stage "local_folder") -PathType Container)
    ) {
        $backendRoot = $stage
    } else {
        $backendRoot = Get-ChildItem -LiteralPath $stage -Directory -Recurse |
            Where-Object {
                (Test-Path (Join-Path $_.FullName "electricity_monitoring_be") -PathType Container) -and
                (Test-Path (Join-Path $_.FullName "local_folder") -PathType Container)
            } |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $backendRoot) {
        throw "The ZIP does not contain the expected backend folders."
    }

    Get-ChildItem -LiteralPath $backendRoot -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
    }

    Remove-Item -LiteralPath $stage -Recurse -Force
    $stage = $null

    $requirements = Join-Path $destination "requirements.txt"

    if (-not (Test-Path -LiteralPath $requirements -PathType Leaf)) {
        throw "requirements.txt is missing from the backend root."
    }

    # Find Python 3.12 or 3.10.
    Write-Status "Checking for Python 3.12 or Python 3.10..."

    $python = Get-PythonPath "3.12"

    if (-not $python) {
        $python = Get-PythonPath "3.10"
    }

    # Install Python 3.12 automatically if neither is available.
    if (-not $python) {
        Write-Status "Supported Python version not found. Downloading Python 3.12.10..."

        $installer = Join-Path $env:TEMP "python-3.12.10-amd64.exe"
        $downloadUrl = "https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe"

        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installer

        Write-Status "Installing Python 3.12..."

        $process = Start-Process `
            -FilePath $installer `
            -Wait `
            -PassThru `
            -WindowStyle Hidden `
            -ArgumentList @(
                "/quiet",
                "InstallAllUsers=0",
                "PrependPath=1",
                "Include_launcher=1",
                "Include_pip=1",
                "Include_test=0"
            )

        if ($process.ExitCode -ne 0) {
            throw "Python installation failed with exit code $($process.ExitCode)."
        }

        $python = Get-PythonPath "3.12"

        if (-not $python) {
            throw "Python 3.12 was installed but could not be located."
        }
    }

    Write-Status "Using Python: $python"

    # Always create a venv; no user prompt.
    $venvPath = Join-Path $destination "venv"

    Write-Status "Creating Python virtual environment..."

    if (Test-Path -LiteralPath $venvPath) {
        Remove-Item -LiteralPath $venvPath -Recurse -Force
    }

    Run-Python $python @("-m", "venv", $venvPath)

    $selectedPython = Join-Path $venvPath "Scripts\python.exe"

    if (-not (Test-Path -LiteralPath $selectedPython -PathType Leaf)) {
        throw "Virtual environment creation failed."
    }

    Write-Status "Upgrading pip..."

    Run-Python $selectedPython @(
        "-m", "pip", "install",
        "--disable-pip-version-check",
        "--progress-bar", "off",
        "--upgrade", "pip"
    )

    Write-Status "Installing backend requirements..."

    Run-Python $selectedPython @(
        "-m", "pip", "install",
        "--disable-pip-version-check",
        "--progress-bar", "off",
        "-r", $requirements
    )

    # Save the interpreter and mode without a UTF-8 BOM.
    Write-Status "Saving backend configuration..."

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        (Join-Path $destination ".python_path"),
        $python,
        $utf8NoBom
    )

    [System.IO.File]::WriteAllText(
        (Join-Path $destination ".python_mode"),
        "venv",
        $utf8NoBom
    )

    # Persist for the current Windows user.
    [Environment]::SetEnvironmentVariable(
        "GoGreen_BE_DIR",
        $destination,
        "User"
    )

    # Also set it for this setup process.
    $env:GoGreen_BE_DIR = $destination

    Write-Status "Backend installation completed successfully."
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