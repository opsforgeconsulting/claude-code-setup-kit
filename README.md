# Claude Code Setup Kit

A portable starter that brings a fresh Claude Code install up to a dialed-in,
"ships-and-verifies" level: an auto code-review hook on every edit, transcript
backups before compaction, a curated MCP + skill set, a premium-UI build
doctrine, and the supporting CLI toolchain.

This is the **universal craft layer** only. It contains **no API keys, no client
data, no personal knowledge-base (Obsidian/Roam) wiring**. You bring your own
auth and your own memory.

---

## What's in here

```
claude-code-setup-kit/
├── README.md                  ← you are here
├── bootstrap.ps1              ← installs the toolchain + copies config into ~/.claude
├── settings.json              ← hooks, MCP servers, statusline, model, effort (NO secrets)
├── settings.local.json        ← a sane Bash/permission allowlist
├── CLAUDE.md                  ← the build doctrine (operating contract + UI system + gotchas)
├── hooks/
│   ├── review_hook.py         ← PostToolUse: auto second-opinion review on every code edit
│   └── precompact_backup.py   ← PreCompact: snapshot the transcript before context is compacted
├── agents/
│   ├── premium-ui.md          ← build/redesign UI to a funded-SaaS standard (ui-ux → motion → playwright)
│   ├── security-review.md     ← adversarial pre-ship security + compliance gate
│   └── supabase-migrator.md   ← safe Drizzle + Supabase Postgres migrations (knows the MySQL→PG traps)
├── commands/
│   ├── ship.md                ← /ship  — build, verify, deploy with a live-verify loop
│   ├── verify.md              ← /verify — prove a change works end-to-end without deploying
│   └── newapp.md              ← /newapp — scaffold a demo-mode-first Next.js app
├── memory/
│   └── MEMORY.md              ← empty memory index to grow into
└── skills-and-plugins.md      ← public sources + one-line installs for the skill/plugin set
```

The `agents/` and `commands/` are **generalized** versions of a working
builder's toolkit — all brand/client/deploy-scope specifics stripped, the
transferable craft kept. After bootstrap, type `/ship`, `/verify`, or `/newapp`
in a session, and the agents are available to the Agent tool by name.

## Quick start (Windows / PowerShell)

```powershell
# 1. From this folder, run the bootstrap (installs tools, copies config).
#    Use -WhatIf first to see what it would do without changing anything.
./bootstrap.ps1 -WhatIf
./bootstrap.ps1

# 2. Authenticate Claude Code (opens a browser).
claude            # then: /login

# 3. (Optional) set the key the auto-review hook uses. Without it, the hook
#    silently no-ops — nothing breaks.
setx OPENAI_API_KEY "sk-..."     # restart the shell after setx

# 4. Start a session and confirm.
claude
#   /status        → shows model, hooks, MCP servers
#   edit any .ts file → you should see an [AUTO-REVIEW] block appear
```

macOS / Linux: the config files are identical; only `bootstrap.ps1` is
Windows-specific. Swap `winget`→`brew`/`apt`, `setx`→`export` in your shell
profile, and the hook commands work as-is (they're Python + curl).

---

## The one rule before you share this further

**Never copy a populated `settings.json` from a working machine.** Real setups
end up with live tokens pasted into `mcpServers.*.env` (Supabase PATs, etc.) and
keys in the environment. This kit's `settings.json` is pre-sanitized — keep it
that way. Secrets belong in environment variables, never in a file that gets
synced or backed up.

## What this kit deliberately leaves out (and why)

| Left out | Reason |
|---|---|
| API keys / auth (`.credentials.json`, tokens) | Each person authenticates their own. |
| Memory files / project notes | That's personal IP — you build your own. |
| Obsidian vault-init + drift-check hooks | Personal knowledge-management wiring. |
| Roam activity-ping hooks | Personal integration. |
| Supabase MCP server | It carries a project ref + token; add your own if you use Supabase. |
| Client roster / business specifics | Confidential — not part of the craft. |

Add any of those back yourself once the base is running.
