$ErrorActionPreference = 'Stop'
$sandboxProject = Split-Path -Parent $PSScriptRoot
$sandboxDirectory = Join-Path $sandboxProject '.local\sandbox'
$sandboxRouterPath = Join-Path $sandboxProject 'scripts\sandbox-router.php'
if (-not (Test-Path -LiteralPath (Join-Path $sandboxDirectory 'database.sqlite'))) {
    throw 'Primero prepara Sandbox con php scripts/refresh-sandbox.php.'
}
$sandboxListener = Get-NetTCPConnection -LocalPort 8015 -State Listen -ErrorAction SilentlyContinue
if ($sandboxListener) {
    foreach ($listenerPid in ($sandboxListener.OwningProcess | Select-Object -Unique)) {
        $sandboxExisting = Get-CimInstance Win32_Process -Filter "ProcessId=$listenerPid"
        if (-not $sandboxExisting.CommandLine -or $sandboxExisting.CommandLine.IndexOf($sandboxRouterPath, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
            throw 'El puerto 8015 está ocupado por otro proceso.'
        }
    }
    Write-Output 'Sandbox ya está ejecutándose.'
    return
}

$installedPhp = Get-Command php.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$sandboxPhp = if ($installedPhp) { $installedPhp.Source } else { Join-Path $sandboxProject '.local\php\php.exe' }
if (-not (Test-Path -LiteralPath $sandboxPhp -PathType Leaf)) {
    throw 'No se encontró PHP. Agrega la carpeta de php.exe al PATH y vuelve a abrir PowerShell.'
}

$sandboxRouter = '"' + $sandboxRouterPath + '"'
$sandboxProcess = Start-Process -FilePath $sandboxPhp -ArgumentList @('-S', '127.0.0.1:8015', $sandboxRouter) -WorkingDirectory (Join-Path $sandboxProject 'public') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $sandboxDirectory 'server.stdout.log') -RedirectStandardError (Join-Path $sandboxDirectory 'server.stderr.log') -PassThru
$sandboxProcess.Id | Set-Content -LiteralPath (Join-Path $sandboxDirectory 'server.pid')
Write-Output 'Sandbox iniciado en http://localhost:8015.'
