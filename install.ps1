$ErrorActionPreference = "Stop"

# Read input with masked echo (shows '*' per character).
function Read-MaskedInput {
    param([string]$Prompt)
    Write-Host -NoNewline $Prompt
    $Result = ""
    while ($true) {
        $Key = [Console]::ReadKey($true)
        if ($Key.Key -eq [ConsoleKey]::Enter) {
            Write-Host ""
            break
        } elseif ($Key.Key -eq [ConsoleKey]::Backspace) {
            if ($Result.Length -gt 0) {
                $Result = $Result.Substring(0, $Result.Length - 1)
                Write-Host -NoNewline "`b `b"
            }
        } elseif (-not [char]::IsControl($Key.KeyChar)) {
            $Result += $Key.KeyChar
            Write-Host -NoNewline "*"
        }
    }
    return $Result
}

function Invoke-FinhayInstall {
    Write-Host ""
    Write-Host "  Finhay MCP Server — Cai dat cho Claude Desktop"
    Write-Host ""

    # --- Step 1: Check & install Node.js ---
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

    # --- Step 2: Claude Desktop config ---
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
    foreach ($Path in $ConfigPaths) {
        Write-Host "Cai dat config Finhay MCP Claude Desktop thanh cong $Path"
    }
    Write-Host ""

    # --- Step 3: Credentials ---
    $CredsDir = Join-Path $env:USERPROFILE ".finhay\credentials"
    $CredsFile = Join-Path $CredsDir ".env"

    $CredsAction = ""   # create | update | reuse

    Write-Host "Xac thuc ket noi tai khoan FHSC"

    if (Test-Path $CredsFile) {
        $Content = Get-Content $CredsFile -Raw
        $KeyMatch = [regex]::Match($Content, 'FINHAY_API_KEY=(.+)')
        $SecretMatch = [regex]::Match($Content, 'FINHAY_API_SECRET=(.+)')

        if ($KeyMatch.Success -and $SecretMatch.Success) {
            $ExistingKey = $KeyMatch.Groups[1].Value.Trim()
            $MaskedKey = $ExistingKey.Substring(0, [Math]::Min(8, $ExistingKey.Length)) + "***"

            Write-Host "Tim thay thong tin Credentials $CredsFile"
            Write-Host "API Key: $MaskedKey"
            Write-Host "Secret Key: ******"
            Write-Host ""
            $Replace = Read-Host "Ban co muon thay the khong? (y/n)"
            if ($Replace -eq "y") {
                $CredsAction = "update"
            } else {
                $CredsAction = "reuse"
            }
            Write-Host ""
        }
    }

    if (-not $CredsAction) {
        $CredsAction = "create"
    }

    if ($CredsAction -eq "create" -or $CredsAction -eq "update") {
        if ($CredsAction -eq "update") {
            $ApiKey = Read-Host "Nhap API Key moi"
        } else {
            $ApiKey = Read-Host "Nhap API Key"
        }
        if (-not $ApiKey) {
            throw "API Key khong duoc de trong."
        }

        if ($CredsAction -eq "update") {
            $ApiSecret = Read-MaskedInput "Nhap Secret Key moi: "
        } else {
            $ApiSecret = Read-MaskedInput "Nhap Secret Key: "
        }
        if (-not $ApiSecret) {
            throw "Secret Key khong duoc de trong."
        }

        New-Item -ItemType Directory -Force -Path $CredsDir | Out-Null
        @"
FINHAY_API_KEY=$ApiKey
FINHAY_API_SECRET=$ApiSecret
FINHAY_BASE_URL=https://open-api.fhsc.com.vn
"@ | Set-Content -Path $CredsFile -Encoding UTF8
        Write-Host ""
    }

    switch ($CredsAction) {
        "create" { Write-Host "Tao Credentials thanh cong tai $CredsFile" }
        "update" { Write-Host "Cap nhat Credentials thanh cong tai $CredsFile" }
        "reuse"  { Write-Host "Su dung credentials hien co tai $CredsFile" }
    }
    Write-Host ""
    Write-Host "Hay khoi dong lai ung dung de su dung"
    Write-Host ""
}

try {
    Invoke-FinhayInstall
} catch {
    Write-Host ""
    Write-Host "  Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}
