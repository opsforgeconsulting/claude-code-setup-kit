<#
.SYNOPSIS
  Bring a fresh machine up to the Claude Code "ships-and-verifies" baseline:
  installs the toolchain, then copies this kit's config into ~/.claude.

.DESCRIPTION
  Idempotent. winget installs skip what's already present; npm -g installs
  upgrade in place. Existing ~/.claude config files are backed up (.bak-<stamp>)
  before being overwritten — nothing is destroyed silently.

.PARAMETER WhatIf
  Show every action without performing it.

.PARAMETER SkipTools
  Only copy config; don't install any software.

.EXAMPLE
  ./bootstrap.ps1 -WhatIf
  ./bootstrap.ps1
#>
[CmdletBinding()]
param(
  [switch]$WhatIf,
  [switch]$SkipTools
)

$ErrorActionPreference = 'Stop'
$KitRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Join-Path $env:USERPROFILE '.claude'

function Step($msg)   { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Info($msg)   { Write-Host "    $msg" -ForegroundColor Gray }
function Ok($msg)     { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg)   { Write-Host "    !   $msg" -ForegroundColor Yellow }

function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Winget-Install($id, $probe) {
  if (Have $probe) { Ok "$probe already installed"; return }
  if ($WhatIf) { Info "would: winget install $id"; return }
  Info "winget install $id"
  winget install --id $id -e --source winget --accept-source-agreements --accept-package-agreements -h | Out-Null
  if (Have $probe) { Ok "$probe installed" } else { Warn "$probe not on PATH yet (may need a new shell)" }
}

function Npm-Global($pkg, $probe) {
  if (Have $probe) { Ok "$probe already installed"; return }
  if ($WhatIf) { Info "would: npm i -g $pkg"; return }
  Info "npm i -g $pkg"
  npm install -g $pkg | Out-Null
  if (Have $probe) { Ok "$probe installed" } else { Warn "$probe not on PATH yet (may need a new shell)" }
}

# ---------------------------------------------------------------------------
Step "Claude Code Setup Kit — bootstrap"
Info "kit:    $KitRoot"
Info "target: $ClaudeDir"
if ($WhatIf) { Warn "WhatIf mode — no changes will be made" }

if (-not $SkipTools) {
  if (-not (Have winget)) {
    Warn "winget not found — install 'App Installer' from the Microsoft Store, then re-run. Skipping system tools."
  } else {
    Step "System tools (winget)"
    Winget-Install 'OpenJS.NodeJS.LTS' 'node'
    Winget-Install 'astral-sh.uv'      'uv'
    Winget-Install 'GitHub.cli'        'gh'
    Winget-Install 'sharkdp.fd'        'fd'
    Winget-Install 'sharkdp.bat'       'bat'
    Winget-Install 'dandavison.delta'  'delta'
  }

  if (Have npm) {
    Step "CLI toolchain (npm global)"
    Npm-Global '@anthropic-ai/claude-code' 'claude'
    Npm-Global '@openai/codex'             'codex'    # powers the 'codex' MCP server (second-opinion code gen)
    Npm-Global '@ast-grep/cli'             'ast-grep' # structural code search
    Npm-Global 'repomix'                   'repomix'  # pack a repo into one LLM-friendly file
    Npm-Global 'ccusage'                   'ccusage'  # the statusline (token/cost usage)
    Npm-Global 'vercel'                    'vercel'   # deploys
    if (-not $WhatIf) { try { corepack enable | Out-Null; Ok 'corepack enabled (pnpm/yarn)' } catch { Warn 'corepack enable failed' } }
  } else {
    Warn "npm not found — open a NEW shell after Node installs, then re-run with -SkipTools to finish."
  }
} else {
  Step "Skipping tool install (-SkipTools)"
}

# ---------------------------------------------------------------------------
Step "Config -> $ClaudeDir"
if (-not $WhatIf) { New-Item -ItemType Directory -Force -Path $ClaudeDir, (Join-Path $ClaudeDir 'hooks'), (Join-Path $ClaudeDir 'agents'), (Join-Path $ClaudeDir 'commands'), (Join-Path $ClaudeDir 'memory'), (Join-Path $ClaudeDir 'session-logs') | Out-Null }

$stamp = '{0:yyyyMMdd-HHmmss}' -f (Get-Date)
$copies = @(
  @{ src = 'settings.json';                dst = 'settings.json' }
  @{ src = 'settings.local.json';          dst = 'settings.local.json' }
  @{ src = 'CLAUDE.md';                    dst = 'CLAUDE.md' }
  @{ src = 'hooks/review_hook.py';         dst = 'hooks/review_hook.py' }
  @{ src = 'hooks/precompact_backup.py';   dst = 'hooks/precompact_backup.py' }
  @{ src = 'agents/premium-ui.md';         dst = 'agents/premium-ui.md' }
  @{ src = 'agents/security-review.md';    dst = 'agents/security-review.md' }
  @{ src = 'agents/supabase-migrator.md';  dst = 'agents/supabase-migrator.md' }
  @{ src = 'commands/ship.md';             dst = 'commands/ship.md' }
  @{ src = 'commands/verify.md';           dst = 'commands/verify.md' }
  @{ src = 'commands/newapp.md';           dst = 'commands/newapp.md' }
  @{ src = 'memory/MEMORY.md';             dst = 'memory/MEMORY.md' }
)

foreach ($c in $copies) {
  $from = Join-Path $KitRoot $c.src
  $to   = Join-Path $ClaudeDir $c.dst
  if (-not (Test-Path $from)) { Warn "missing in kit: $($c.src)"; continue }
  if ((Test-Path $to) -and -not $WhatIf) {
    Copy-Item $to "$to.bak-$stamp" -Force
    Info "backed up existing $($c.dst) -> $($c.dst).bak-$stamp"
  }
  if ($WhatIf) { Info "would copy $($c.src) -> $to" }
  else { Copy-Item $from $to -Force; Ok "copied $($c.dst)" }
}

# ---------------------------------------------------------------------------
Step "Next steps"
@"
  1) Open a NEW terminal so freshly-installed tools are on PATH.
  2) Authenticate:        claude   ->   /login
  3) (optional) review-hook key:  setx OPENAI_API_KEY "sk-..."   (restart shell)
  4) Install the skill/plugin set: see skills-and-plugins.md
  5) Verify in a session: /status   (model, hooks, MCP servers should be listed)
"@ | Write-Host -ForegroundColor White

if ($WhatIf) { Warn "WhatIf complete — nothing was changed." } else { Ok "Bootstrap complete." }
