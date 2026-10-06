# Syncs daml/ to the build VPS (isolated `lute` user) and runs a dpm command there.
# Usage: scripts/vps/daml.ps1 "dpm build --all"   |   scripts/vps/daml.ps1 "cd lute-tests && dpm test"
# Host alias comes from ~/.ssh/config (LUTE_VPS_HOST, default: optiongenome).
param([string]$Command = "dpm build --all")
$ErrorActionPreference = "Stop"
$hostAlias = if ($env:LUTE_VPS_HOST) { $env:LUTE_VPS_HOST } else { "optiongenome" }
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$archive = Join-Path $env:TEMP "lute-daml.tgz"

# Strip UTF-8 BOMs (Windows tools add them; damlc may reject them).
Get-ChildItem (Join-Path $root "daml") -Recurse -Include *.daml, *.yaml | ForEach-Object {
  $b = [IO.File]::ReadAllBytes($_.FullName)
  if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    [IO.File]::WriteAllBytes($_.FullName, $b[3..($b.Length - 1)])
  }
}

tar -czf $archive -C $root --exclude=.daml daml
scp -q $archive "${hostAlias}:/tmp/lute-daml.tgz"
$remote = @"
set -o pipefail
mkdir -p ~/lute && cd ~/lute && rm -rf daml && tar -xzf /tmp/lute-daml.tgz
export PATH=`$HOME/.dpm/bin:`$HOME/opt/jdk/bin:`$PATH
export JAVA_TOOL_OPTIONS=-Xmx1g
cd daml
$Command
"@
# Ship the command as a file (LF, no BOM) so it needs no shell quoting.
$runFile = Join-Path $env:TEMP "lute-run.sh"
[IO.File]::WriteAllText($runFile, ($remote -replace "`r", "") + "`n", (New-Object System.Text.UTF8Encoding $false))
scp -q $runFile "${hostAlias}:/tmp/lute-run.sh"
ssh -o BatchMode=yes $hostAlias "chmod 644 /tmp/lute-daml.tgz /tmp/lute-run.sh && su - lute -c 'bash /tmp/lute-run.sh' 2>&1"
