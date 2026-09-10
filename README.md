# Claude Code Setup Kit

A portable starter that brings a fresh Claude Code install up to a dialed-in,
"ships-and-verifies" level: an auto code-review hook on every edit, a context
monitor that catches stuck loops, cross-session recall, a quarantined learning
loop, transcript backups before compaction, a curated MCP + skill set, a
premium-UI build doctrine, and the supporting CLI toolchain.

This is the **universal craft layer** only. It contains **no API keys, no client
data, no personal knowledge-base wiring**. You bring your own auth and your own
memory.

**New here? Start with `SETUP-GUIDE.md`** - the full step-by-step (accounts,
tools, connectors, verification). This README is the map of what's in the box.

---

## What's in here

```
claude-code-setup-kit/
|-- README.md                  <- you are here
|-- SETUP-GUIDE.md             <- full step-by-step setup walkthrough
|-- bootstrap.ps1              <- installs the toolchain + copies config into ~/.claude
|-- settings.json              <- hooks, MCP servers, statusline, model, effort (NO secrets)
|-- settings.local.json        <- a sane Bash/permission allowlist
|-- CLAUDE.md                  <- the build doctrine (operating contract + UI system + gotchas)
|-- FABLE-OPUS-PACK.md         <- imported by CLAUDE.md: Fable-tier discipline as procedure for Opus/Sonnet
|-- hooks/
|   |-- review_hook.py         <- PostToolUse: auto second-opinion review on every code edit
|   |-- context_monitor.js     <- PostToolUse: compact / context / scope / loop / stall warnings
|   |-- harness_telemetry.js   <- PostToolUse (Skill|Agent): usage log for evidence-based stocktakes
|   |-- recall_hook.js         <- UserPromptSubmit: injects dated recall hits on the first prompt
|   |-- learn_loop.js          <- Stop: spawns a headless run that writes ONE candidate lesson to quarantine
|   |-- learn_prompt.md        <- the instructions that headless run follows
|   |-- candidates_notice.js   <- SessionStart: "N candidate lessons awaiting review"
|   |-- precompact_backup.py   <- PreCompact: snapshot the transcript before context is compacted
|   `-- heredoc_guard.py       <- PreToolUse (Bash): blocks non-ASCII heredocs (Windows corruption)
|-- recall/
|   |-- recall.mjs             <- FTS5 search over memory, journal, session logs, optional vaults
|   `-- transcript-text.mjs    <- human-readable dump of a session transcript
|-- agents/
|   |-- premium-ui.md          <- build/redesign UI to a funded-SaaS standard (ui-ux -> motion -> playwright)
|   |-- vercel-ship.md         <- build -> verify -> deploy -> verify live
|   |-- security-review.md     <- adversarial pre-ship security + compliance gate
|   |-- supabase-migrator.md   <- safe Drizzle + Supabase Postgres migrations (knows the MySQL->PG traps)
|   `-- silent-failure-hunter.md <- finds swallowed errors and fallbacks that hide real breakage
|-- commands/
|   |-- ship.md                <- /ship  - build, verify, deploy with a live-verify loop
|   |-- verify.md              <- /verify - prove a change works end-to-end without deploying
|   |-- newapp.md              <- /newapp - scaffold a demo-mode-first Next.js app
|   |-- learn-eval.md          <- /learn-eval - extract a lesson, quality-gate it, save it
|   `-- review-candidates.md   <- /review-candidates - promote / absorb / drop quarantined lessons
|-- skills/                    <- 38 skills, installed for you (zip build only)
|-- memory/
|   `-- MEMORY.md              <- empty memory index to grow into
|-- ATTRIBUTION.md             <- who wrote the bundled skills + licenses
`-- skills-and-plugins.md      <- what's bundled, plus plugins/CLI/MCP reference
```

The `agents/` and `commands/` are **generalized** versions of a working
builder's toolkit - all brand/client/deploy-scope specifics stripped, the
transferable craft kept. After bootstrap, type `/ship`, `/verify`, `/newapp`,
`/learn-eval`, or `/review-candidates` in a session, and the agents are
available to the Agent tool by name.

**Skills are bundled** in the zip distribution (38 of them - engineering
discipline, UI/UX, 21st.dev, Obsidian, recall, tooling) and installed straight
into `~/.claude/skills/` by the bootstrap. Most are third-party work: see
`ATTRIBUTION.md` for authors and licenses. The git repo omits `skills/` on
purpose - pull those from their upstream sources rather than a fork.

## Quick start (Windows / PowerShell)

```powershell
# 1. From this folder, run the bootstrap (installs tools, copies config).
#    Use -WhatIf first to see what it would do without changing anything.
#    Add -Full to also install Obsidian, Granola, Chrome, PostgreSQL, AutoHotkey, Python.
./bootstrap.ps1 -WhatIf
./bootstrap.ps1

# 2. Authenticate Claude Code (opens a browser).
claude            # then: /login

# 3. (Optional) keys for the extras. Without them nothing breaks:
setx OPENAI_API_KEY "sk-..."     # auto-review hook (second-opinion model)
setx VOYAGE_API_KEY "pa-..."     # semantic stage for recall
# restart the shell after setx

# 4. Start a session and confirm.
claude
#   /status        -> shows model, hooks, MCP servers
#   edit any .ts file -> you should see an [AUTO-REVIEW] block appear (if OPENAI_API_KEY is set)
```

**Model:** `settings.json` is set to `fable[1m]`. If your account does not have
access to the Fable model, change it to `opus[1m]` - everything else works the same.

macOS / Linux: the config files are identical; only `bootstrap.ps1` is
Windows-specific. Swap `winget`->`brew`/`apt`, `setx`->`export` in your shell
profile, and the hooks work as-is (Node + Python). Drop `heredoc_guard.py`
from `settings.json` - it guards a Windows-only problem.

## How the hooks find your memory

Claude Code keeps auto-memory per launch directory at
`~/.claude/projects/<cwd-slug>/memory`. Every hook and the recall engine derive
that folder from the session's cwd, so they work wherever you run `claude`.
Set `CC_MEMORY_DIR` to pin them to one folder if you want a single memory
across projects (the original setup runs everything from one fixed directory
for exactly that reason).

---

## The one rule before you share this further

**Never copy a populated `settings.json` from a working machine.** Real setups
end up with live tokens pasted into `mcpServers.*.env` (Supabase PATs, etc.) and
keys in the environment. This kit's `settings.json` is pre-sanitized - keep it
that way. Secrets belong in environment variables, never in a file that gets
synced or backed up.

## What this kit deliberately leaves out (and why)

| Left out | Reason |
|---|---|
| API keys / auth (`.credentials.json`, tokens) | Each person authenticates their own. |
| Memory files / project notes | That's personal IP - you build your own. |
| Knowledge-base vault-init + drift-check hooks | Personal knowledge-management wiring. Point recall at your vaults with `CC_RECALL_VAULTS`. |
| Meeting-tool activity-ping hooks | Personal integration. |
| Supabase MCP server | It carries a project ref + token; add your own if you use Supabase. |
| Scheduled-task skills (fleet watch, meeting sync, client reports, queue worker, email inbox) | They encode one business's app inventory, clients, and infrastructure. The pattern is described in SETUP-GUIDE.md so you can build your own. |
| Client roster / business specifics | Confidential - not part of the craft. |

Add any of those back yourself once the base is running.
