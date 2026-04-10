$ErrorActionPreference = "Stop"

function Invoke-FinhayInstall {
    Write-Host ""
    Write-Host "  Finhay MCP Server — Cai dat cho Claude Desktop"
    Write-Host ""

    # --- Check & install Node.js ---
    $NodeExe = $null
    $NodeInstallDir = Join-Path $env:USERPROFILE ".finhay\nodejs"
    $PortableNode = Join-Path $NodeInstallDir "node.exe"

    if (Get-Command node -ErrorAction SilentlyContinue) {
        $NodeExe = "node"
    } elseif (Test-Path $PortableNode) {
        $NodeExe = $PortableNode
        $env:PATH = "$NodeInstallDir;$env:PATH"
    } else {
        Write-Host "  Node.js chua duoc cai dat. Dang tai ban portable (khong can quyen admin)..."
        Write-Host ""

        $TmpDir = Join-Path $env:TEMP "finhay-node-install"
        New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

        # Use portable zip — no admin rights needed
        $Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
        $NodeZip = Join-Path $TmpDir "node.zip"
        $NodeUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-$Arch.zip"

        Write-Host "  Dang tai Node.js tu nodejs.org ($Arch)..."
        Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip -UseBasicParsing

        Write-Host "  Dang giai nen Node.js vao $NodeInstallDir..."
        if (Test-Path $NodeInstallDir) {
            Remove-Item -Recurse -Force $NodeInstallDir -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Force -Path $NodeInstallDir | Out-Null

        Expand-Archive -Path $NodeZip -DestinationPath $TmpDir -Force

        # Move contents of extracted node-vXX folder to NodeInstallDir
        $ExtractedFolder = Get-ChildItem -Path $TmpDir -Directory | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
        if (-not $ExtractedFolder) {
            throw "Khong tim thay thu muc Node.js sau khi giai nen."
        }
        Get-ChildItem -Path $ExtractedFolder.FullName | Move-Item -Destination $NodeInstallDir -Force

        Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue

        if (-not (Test-Path $PortableNode)) {
            throw "Khong the cai Node.js. Hay cai thu cong tai https://nodejs.org"
        }

        $NodeExe = $PortableNode
        $env:PATH = "$NodeInstallDir;$env:PATH"

        # Add to user PATH permanently
        $CurrentUserPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
        if ($CurrentUserPath -notlike "*$NodeInstallDir*") {
            [System.Environment]::SetEnvironmentVariable("PATH", "$NodeInstallDir;$CurrentUserPath", "User")
        }

        $NodeVersion = & $NodeExe -v
        Write-Host "  Node.js $NodeVersion da duoc cai dat."
        Write-Host ""
    }

    # --- Credentials ---
    $CredsDir = Join-Path $env:USERPROFILE ".finhay\credentials"
    $CredsFile = Join-Path $CredsDir ".env"

    $ApiKey = ""
    $ApiSecret = ""

    if (Test-Path $CredsFile) {
        $Content = Get-Content $CredsFile -Raw
        $KeyMatch = [regex]::Match($Content, 'FINHAY_API_KEY=(.+)')
        $SecretMatch = [regex]::Match($Content, 'FINHAY_API_SECRET=(.+)')

        if ($KeyMatch.Success -and $SecretMatch.Success) {
            $ExistingKey = $KeyMatch.Groups[1].Value.Trim()
            $ExistingSecret = $SecretMatch.Groups[1].Value.Trim()
            $MaskedKey = $ExistingKey.Substring(0, [Math]::Min(8, $ExistingKey.Length)) + "***"

            Write-Host "  Tim thay credentials tai $CredsFile"
            Write-Host "  API Key: $MaskedKey"
            Write-Host ""
            $Reuse = Read-Host "  Su dung credentials nay? (Y/n)"
            if ($Reuse -ne "n") {
                $ApiKey = $ExistingKey
                $ApiSecret = $ExistingSecret
            }
            Write-Host ""
        }
    }

    if (-not $ApiKey) {
        Write-Host "  Tao API Key tai: https://www.finhay.com.vn/finhay-skills"
        Write-Host ""
        $ApiKey = Read-Host "  API Key"
        if (-not $ApiKey) {
            throw "API Key khong duoc de trong."
        }

        $SecureSecret = Read-Host "  API Secret" -AsSecureString
        $ApiSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureSecret)
        )
        if (-not $ApiSecret) {
            throw "API Secret khong duoc de trong."
        }

        # Save credentials
        New-Item -ItemType Directory -Force -Path $CredsDir | Out-Null
        @"
FINHAY_API_KEY=$ApiKey
FINHAY_API_SECRET=$ApiSecret
FINHAY_BASE_URL=https://open-api.fhsc.com.vn
"@ | Set-Content -Path $CredsFile -Encoding UTF8

        Write-Host ""
        Write-Host "  Credentials: $CredsFile"
        Write-Host ""
    }

    # --- Claude Desktop config ---
    # Both paths may exist — prefer the one that Claude Desktop actually uses
    $StorePath = Join-Path $env:LOCALAPPDATA "Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json"
    $StandardPath = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"

    # Collect all existing config paths; we will write to all of them to be safe
    $ConfigPaths = @()
    if (Test-Path $StorePath) { $ConfigPaths += $StorePath }
    if (Test-Path $StandardPath) { $ConfigPaths += $StandardPath }

    # If none exist, default to Standard path
    if ($ConfigPaths.Count -eq 0) {
        $ConfigPaths = @($StandardPath)
    }

    foreach ($ConfigPath in $ConfigPaths) {
        Write-Host "  Ghi config vao: $ConfigPath"

        $ConfigDir = Split-Path $ConfigPath -Parent
        if (-not (Test-Path $ConfigDir)) {
            New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
        }

        # Build new config as ordered hashtable, preserving existing properties
        $NewConfig = [ordered]@{}
        $McpServers = [ordered]@{}

        if (Test-Path $ConfigPath) {
            try {
                $RawJson = Get-Content $ConfigPath -Raw -ErrorAction Stop
                if ($RawJson.Trim()) {
                    $Old = $RawJson | ConvertFrom-Json -ErrorAction Stop

                    foreach ($prop in $Old.PSObject.Properties) {
                        if ($prop.Name -eq "mcpServers" -and $prop.Value) {
                            # Copy existing mcpServers entries
                            foreach ($srv in $prop.Value.PSObject.Properties) {
                                $McpServers[$srv.Name] = $srv.Value
                            }
                        } else {
                            $NewConfig[$prop.Name] = $prop.Value
                        }
                    }
                }
            } catch {
                Write-Host "  Canh bao: Khong doc duoc config cu, se tao moi. Loi: $($_.Exception.Message)"
            }
        }

        # Add/update finhay entry
        if ($McpServers.Contains("finhay")) {
            Write-Host "  Entry 'finhay' da ton tai, cap nhat lai."
        }
        $McpServers["finhay"] = [ordered]@{
            command = "npx"
            args = @("-y", "finhay-mcp-server")
        }

        $NewConfig["mcpServers"] = $McpServers

        # Write config (no BOM for JSON)
        $JsonOutput = $NewConfig | ConvertTo-Json -Depth 10
        $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($ConfigPath, $JsonOutput, $Utf8NoBom)
    }
    Write-Host ""
    Write-Host "  Da cai dat thanh cong!"
    Write-Host "  Hay khoi dong lai Claude Desktop de su dung."
    Write-Host ""
}

try {
    Invoke-FinhayInstall
} catch {
    Write-Host ""
    Write-Host "  Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}
