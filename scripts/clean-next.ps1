# Only generated Next.js artifacts are removed; source and database stay intact.
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$expected = Join-Path $repo '.next'
if (Test-Path -LiteralPath $expected) {
    $resolved = (Resolve-Path -LiteralPath $expected).Path
    if ($resolved -ne $expected) { throw 'Unexpected build directory; refusing cleanup.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
