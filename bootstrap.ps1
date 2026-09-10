<#
.SYNOPSIS
  Bring a fresh machine up to the Claude Code "ships-and-verifies" baseline:
  installs the toolchain, then copies this kit's config into ~/.claude.

.DESCRIPTION
  Idempotent. winget installs skip what's already present; npm -g installs
  upgrade in place. Existing ~/.claude config files are backed up (.bak-<stamp>)
  before being overwritten - nothing is destroyed silently.

  Keep this file pure ASCII with a UTF-8 BOM: Windows PowerShell 5.1 reads .ps1
  as ANSI without a BOM and non-ASCII characters break the parser.

.PARAMETER WhatIf
  Show every action without performing it.

.PARAMETER SkipTools
  Only copy config; don't install any software.

.PARAMETER Full
  Also install the desktop apps the full setup uses: Obsidian, Granola, Google
  Chrome, PostgreSQL (psql), AutoHotkey, Python 3.11+. Skipped by default.

.EXAMPLE
  ./bootstrap.ps1 -WhatIf
  ./bootstrap.ps1
  ./bootstrap.ps1 -Full
#>
[CmdletBinding()]
param(
  [switch]$WhatIf,
  [switch]$SkipTools,
  [switch]$Full
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
  if ($probe -and (Have $probe)) { Ok "$probe already installed"; return }
  if ($WhatIf) { Info "would: winget install $id"; return }
  Info "winget install $id"
  try {
    winget install --id $id -e --source winget --accept-source-agreements --accept-package-agreements -h | Out-Null
  } catch { Warn "winget install $id failed: $($_.Exception.Message)"; return }
  if (-not $probe) { Ok "$id installed (or already present)"; return }
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
Step "Claude Code Setup Kit - bootstrap"
Info "kit:    $KitRoot"
Info "target: $ClaudeDir"
if ($WhatIf) { Warn "WhatIf mode - no changes will be made" }

if (-not $SkipTools) {
  if (-not (Have winget)) {
    Warn "winget not found - install 'App Installer' from the Microsoft Store, then re-run. Skipping system tools."
  } else {
    Step "System tools (winget)"
    Winget-Install 'Git.Git'           'git'
    Winget-Install 'OpenJS.NodeJS.LTS' 'node'
    Winget-Install 'astral-sh.uv'      'uv'
    Winget-Install 'GitHub.cli'        'gh'
    Winget-Install 'sharkdp.fd'        'fd'
    Winget-Install 'sharkdp.bat'       'bat'
    Winget-Install 'dandavison.delta'  'delta'
    Winget-Install 'BurntSushi.ripgrep.MSVC' 'rg'

    if ($Full) {
      Step "Desktop apps (-Full)"
      Winget-Install 'Python.Python.3.11'      'python'
      Winget-Install 'Google.Chrome'           $null
      Winget-Install 'Obsidian.Obsidian'       $null
      Winget-Install 'PostgreSQL.PostgreSQL.18' 'psql'
      Winget-Install 'AutoHotkey.AutoHotkey'   $null
      # Granola (meeting notes) - winget id varies by release; try it, fall back to the site.
      $granola = winget search --id Granola.Granola -e --source winget 2>$null | Select-String 'Granola'
      if ($granola) { Winget-Install 'Granola.Granola' $null }
      else { Warn "Granola not found in winget - download it from https://www.granola.ai/download" }
    }
  }

  if (Have npm) {
    Step "CLI toolchain (npm global)"
    Npm-Global '@anthropic-ai/claude-code' 'claude'
    Npm-Global '@openai/codex'             'codex'    # powers the 'codex' MCP server (second-opinion code gen)
    Npm-Global '@ast-grep/cli'             'ast-grep' # structural code search
    Npm-Global 'repomix'                   'repomix'  # pack a repo into one LLM-friendly file
    Npm-Global 'ccusage'                   'ccusage'  # the statusline (token/cost usage)
    Npm-Global 'vercel'                    'vercel'   # deploys
    Npm-Global '@21st-dev/cli'             '21st'     # 21st.dev component search / generation
    Npm-Global 'defuddle'                  'defuddle' # clean markdown from web pages
    Npm-Global 'pnpm'                      'pnpm'
    if (-not $WhatIf) { try { corepack enable | Out-Null; Ok 'corepack enabled (pnpm/yarn)' } catch { Warn 'corepack enable failed' } }
  } else {
    Warn "npm not found - open a NEW shell after Node installs, then re-run with -SkipTools to finish."
  }
} else {
  Step "Skipping tool install (-SkipTools)"
}

# ---------------------------------------------------------------------------
Step "Config -> $ClaudeDir"
$dirs = @('hooks', 'agents', 'commands', 'recall', 'memory') | ForEach-Object { Join-Path $ClaudeDir $_ }
if (-not $WhatIf) { New-Item -ItemType Directory -Force -Path (@($ClaudeDir) + $dirs) | Out-Null }

$stamp = '{0:yyyyMMdd-HHmmss}' -f (Get-Date)
$copies = @(
  'settings.json', 'settings.local.json', 'CLAUDE.md', 'FABLE-OPUS-PACK.md',
  'hooks/review_hook.py', 'hooks/precompact_backup.py', 'hooks/heredoc_guard.py',
  'hooks/context_monitor.js', 'hooks/harness_telemetry.js', 'hooks/learn_loop.js',
  'hooks/learn_prompt.md', 'hooks/recall_hook.js', 'hooks/candidates_notice.js',
  'recall/recall.mjs', 'recall/transcript-text.mjs',
  'agents/premium-ui.md', 'agents/security-review.md', 'agents/supabase-migrator.md',
  'agents/silent-failure-hunter.md', 'agents/vercel-ship.md',
  'commands/ship.md', 'commands/verify.md', 'commands/newapp.md',
  'commands/learn-eval.md', 'commands/review-candidates.md',
  'memory/MEMORY.md'
)

foreach ($rel in $copies) {
  $from = Join-Path $KitRoot $rel
  $to   = Join-Path $ClaudeDir $rel
  if (-not (Test-Path $from)) { Warn "missing in kit: $rel"; continue }
  if ((Test-Path $to) -and -not $WhatIf) {
    Copy-Item $to "$to.bak-$stamp" -Force
    Info "backed up existing $rel -> $rel.bak-$stamp"
  }
  if ($WhatIf) { Info "would copy $rel -> $to" }
  else { Copy-Item $from $to -Force; Ok "copied $rel" }
}

# ---------------------------------------------------------------------------
# Skills - bundled as real folders (one per skill) so nothing has to be hunted
# down. An existing skills/ dir is backed up wholesale before being replaced;
# a skill you added yourself that isn't in the kit is preserved (merge, not wipe).
Step "Skills -> $ClaudeDir\skills"
$SkillsSrc = Join-Path $KitRoot 'skills'
$SkillsDst = Join-Path $ClaudeDir 'skills'
if (-not (Test-Path $SkillsSrc)) {
  Warn "no skills/ folder in this kit - see skills-and-plugins.md to install them manually"
} else {
  $names = @(Get-ChildItem -Path $SkillsSrc -Directory | Select-Object -ExpandProperty Name)
  Info "$($names.Count) skills in kit"
  if ($WhatIf) {
    Info "would copy $($names.Count) skill folders into $SkillsDst (existing ones backed up)"
  } else {
    if (Test-Path $SkillsDst) {
      $bak = "$SkillsDst.bak-$stamp"
      Copy-Item $SkillsDst $bak -Recurse -Force
      Info "backed up existing skills -> $(Split-Path -Leaf $bak)"
    }
    New-Item -ItemType Directory -Force -Path $SkillsDst | Out-Null
    foreach ($n in $names) {
      $target = Join-Path $SkillsDst $n
      if (Test-Path $target) { Remove-Item $target -Recurse -Force }
      Copy-Item (Join-Path $SkillsSrc $n) $target -Recurse -Force
    }
    Ok "installed $($names.Count) skills"
  }
}

# ---------------------------------------------------------------------------
Step "Next steps"
@"
  1) Open a NEW terminal so freshly-installed tools are on PATH.
  2) Authenticate:        claude   ->   /login
       If your account has no Fable access, set "model" to "opus[1m]" in ~/.claude/settings.json.
  3) (optional) review-hook key:  setx OPENAI_API_KEY "sk-..."   (restart shell)
     (optional) semantic recall:  setx VOYAGE_API_KEY "pa-..."
  4) Plugins (inside a session):
       /plugin marketplace add anthropics/claude-plugins-official
       /plugin install vercel@claude-plugins-official
  5) Verify in a session: /status   (model, hooks, MCP servers should be listed)
       Skills are already installed - ask "what skills do you have?" to see them.
  6) Read SETUP-GUIDE.md for the full step-by-step (accounts, connectors, verification).
"@ | Write-Host -ForegroundColor White

if ($WhatIf) { Warn "WhatIf complete - nothing was changed." } else { Ok "Bootstrap complete." }
