# Skills & Plugins

## Skills — already bundled ✅

`bootstrap.ps1` installs **37 skills** into `~/.claude/skills/`. Nothing to clone,
nothing to hunt down. After bootstrap, start a session and ask *"what skills do
you have?"* to see them listed.

Provenance and licensing for every bundled skill: see `ATTRIBUTION.md`.

What you get, by group:

| Group | Skills |
|---|---|
| **Engineering discipline** | brainstorming · writing-plans · executing-plans · subagent-driven-development · test-driven-development · systematic-debugging · requesting-code-review · receiving-code-review · verification-before-completion · dispatching-parallel-agents · using-git-worktrees · finishing-a-development-branch · using-superpowers · writing-skills · loop-contract · skill-stocktake |
| **UI / UX** | ui-ux-pro-max (styles, palettes, font pairings) · motion-design · ux-designer-skill · web-design-guidelines · mobile-app-ui-design · composition-patterns · react-best-practices |
| **21st.dev** | 21st-ui-build · 21st-ui-explore · 21st-ui-review · 21st-ai · 21st-cli-use · 21st-registry · 21st-design-sync |
| **Obsidian / writing** | obsidian-markdown · obsidian-bases · obsidian-cli · json-canvas · defuddle (web → clean markdown) |
| **Tooling** | ast-grep (structural code search) · playwright-skill (browser automation) |

Skills update independently of this kit — re-clone from the sources in
`ATTRIBUTION.md` when you want the newest versions.

## Plugins (via the marketplace)

Run inside a Claude Code session:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install vercel@claude-plugins-official      # deploy + Vercel/Next.js skills
```

`settings.json` already lists `vercel@claude-plugins-official` under
`enabledPlugins`, so it activates as soon as it's installed.

## CLI tools (installed by bootstrap.ps1)

| Tool | Purpose |
|---|---|
| `claude` | Claude Code itself (`@anthropic-ai/claude-code`) |
| `codex` | OpenAI Codex CLI — also powers the `codex` MCP server (second-opinion code gen) |
| `ast-grep` / `sg` | structural (AST) code search — pairs with the ast-grep skill |
| `repomix` | pack a whole repo into one LLM-friendly file |
| `ccusage` | the statusline — live token/cost usage |
| `vercel` | deploys |
| `gh` | GitHub CLI — scripted PRs/releases/repo creation |
| `fd`, `bat`, `delta` | fast find, better cat, better git diff pager |
| `uv` / `uvx` | Python tool runner — powers the `basic-memory` MCP server |

## MCP servers (already wired in settings.json)

| Server | Needs | Notes |
|---|---|---|
| `codex` | `codex` CLI on PATH | adversarial second opinion on code |
| `context7` | nothing (npx) | up-to-date library/framework docs |
| `playwright` | nothing (npx) | drive a real browser to verify UI |
| `basic-memory` | `uv`/`uvx` on PATH | a general-purpose memory MCP |

To add a credentialed server later (e.g. Supabase), add it under `mcpServers`
and pass the token via an env var — never paste it into the file.

## Hooks (installed to ~/.claude/hooks)

| Hook | What it does |
|---|---|
| `review_hook.py` | PostToolUse on Write/Edit — automatic second-opinion review of every diff. Needs `OPENAI_API_KEY`; silently no-ops without it. Model via `REVIEW_MODEL`. |
| `precompact_backup.py` | PreCompact — snapshots the session before context compaction. |
| `heredoc_guard.py` | Blocks bash heredocs carrying non-ASCII on Windows (they silently corrupt em-dashes and eat backslashes). Windows-specific; drop it on macOS/Linux. |
