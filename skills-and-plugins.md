# Skills & Plugins

Skills and plugins aren't copied as files — they're installed from public
sources so they stay updated. Here's the curated set and how to get each.

## Plugins (via the marketplace)

Claude Code ships with a marketplace command. Add the official marketplace, then
enable plugins.

```
# inside a Claude Code session:
/plugin marketplace add anthropics/claude-plugins-official
/plugin install vercel@claude-plugins-official      # deploy + Vercel/Next.js skills
```

The kit's `settings.json` already lists `vercel@claude-plugins-official` under
`enabledPlugins`, so once installed it activates automatically.

## Skill collections (clone into ~/.claude/skills)

These are folders of skills. Clone each repo's skills into `~/.claude/skills/`
(one subfolder per skill). Check each repo's README for the exact layout.

| Set | What you get | Source |
|---|---|---|
| **Obra "Superpowers"** | Engineering-discipline skills: brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, requesting/receiving-code-review, verification-before-completion, dispatching-parallel-agents, using-git-worktrees | search GitHub for "obra superpowers claude skills" |
| **kepano / obsidian-skills** | Obsidian authoring: obsidian-markdown, obsidian-bases, json-canvas, defuddle (clean web→markdown), obsidian-cli | `github.com/kepano/obsidian-skills` |
| **UI/UX set** | ui-ux-pro-max (styles/palettes/font-pairings), motion-design, ux-designer-skill, web-design-guidelines, mobile-app-ui-design, composition-patterns, react-best-practices | bundle these from the design-skill repos you prefer |

After cloning, restart Claude Code and run `/status` or check that the skills
appear in the available-skills list.

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
