# Project-local PostgreSQL, for Windows without Docker. Run from the repo root.
param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$runtime = Join-Path $repo '.tools\pgsql\bin'
$data = Join-Path $repo '.tools\pgdata'
$log = Join-Path $repo '.tools\postgres.log'
if (!(Test-Path (Join-Path $runtime 'pg_ctl.exe'))) { throw 'Extract official PostgreSQL Windows binaries into .tools/pgsql first. See backend/README.md.' }
if ($Stop) {
    & (Join-Path $runtime 'pg_ctl.exe') -D $data -m fast -w stop
    exit $LASTEXITCODE
}
if (!(Test-Path (Join-Path $data 'PG_VERSION'))) {
    $passwordFile = Join-Path $repo '.tools\local-password.txt'
    [System.IO.File]::WriteAllText($passwordFile, 'bolo_local')
    & (Join-Path $runtime 'initdb.exe') -D $data -U bolo --encoding=UTF8 --locale=C --auth=scram-sha-256 --pwfile=$passwordFile
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
    Remove-Item -LiteralPath $passwordFile
}
& (Join-Path $runtime 'pg_ctl.exe') -D $data status *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $runtime 'pg_ctl.exe') -D $data -l $log -o '-h 127.0.0.1 -p 55432' -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL failed to start' }
}
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = 'bolo_local'
    foreach ($databaseName in @('bolo', 'bolo_milestone2_test')) {
        $exists = & (Join-Path $runtime 'psql.exe') -h 127.0.0.1 -p 55432 -U bolo -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$databaseName'"
        if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to PostgreSQL' }
        if ($exists -ne '1') {
            & (Join-Path $runtime 'createdb.exe') -h 127.0.0.1 -p 55432 -U bolo $databaseName
            if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
        }
    }
} finally { $env:PGPASSWORD = $previousPassword }
Write-Output 'PostgreSQL ready at 127.0.0.1:55432 (project-local development only).'
