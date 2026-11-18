$ErrorActionPreference = 'Stop'
$sandboxProject = Split-Path -Parent $PSScriptRoot
$sandboxDirectory = Join-Path $sandboxProject '.local\sandbox'
if (-not (Test-Path -LiteralPath (Join-Path $sandboxDirectory 'database.sqlite'))) {
    throw 'Primero prepara Sandbox con scripts/refresh-sandbox.php.'
}
$sandboxListener = Get-NetTCPConnection -LocalPort 8015 -State Listen -ErrorAction SilentlyContinue
if ($sandboxListener) {
    $sandboxExisting = Get-CimInstance Win32_Process -Filter "ProcessId=$($sandboxListener.OwningProcess)"
    if ($sandboxExisting.CommandLine -notlike '*sandbox-router.php*') { throw 'El puerto 8015 está ocupado por otro proceso.' }
    Write-Output 'Sandbox ya está ejecutándose.'
    return
}
$sandboxRouter = '"' + (Join-Path $sandboxProject 'scripts\sandbox-router.php') + '"'
$sandboxProcess = Start-Process -FilePath (Join-Path $sandboxProject '.local\php\php.exe') -ArgumentList @('-S', '127.0.0.1:8015', $sandboxRouter) -WorkingDirectory (Join-Path $sandboxProject 'public') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $sandboxDirectory 'server.stdout.log') -RedirectStandardError (Join-Path $sandboxDirectory 'server.stderr.log') -PassThru
$sandboxProcess.Id | Set-Content -LiteralPath (Join-Path $sandboxDirectory 'server.pid')
Write-Output 'Sandbox iniciado en http://localhost:8015.'
