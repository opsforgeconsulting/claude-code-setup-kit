# Attribution - bundled skills

The `skills/` folder bundles work from several open-source authors so the kit
installs in one step instead of sending you hunting. Credit stays with them; if
you redistribute this kit publicly, pull these from their sources instead and
keep their licenses intact.

| Skills | Author / Source |
|---|---|
| brainstorming, writing-plans, executing-plans, subagent-driven-development, test-driven-development, systematic-debugging, requesting-code-review, receiving-code-review, verification-before-completion, dispatching-parallel-agents, using-git-worktrees, finishing-a-development-branch, using-superpowers, writing-skills | **obra / superpowers** - github.com/obra/superpowers |
| obsidian-markdown, obsidian-bases, obsidian-cli, json-canvas, defuddle | **kepano / obsidian-skills** - github.com/kepano/obsidian-skills |
| mobile-app-ui-design | **ceorkm** - github.com/ceorkm/mobile-app-ui-design |
| ux-designer-skill | **Szilard Hajba (szilu)** - github.com/szilu/ux-designer-skill (MIT, LICENSE included) |
| playwright-skill | **mehmet-kozan** - github.com/sponsors/mehmet-kozan |
| 21st-ai, 21st-cli-use, 21st-design-sync, 21st-registry, 21st-ui-build, 21st-ui-explore, 21st-ui-review | **21st.dev** |
| ui-ux-pro-max, motion-design, web-design-guidelines, composition-patterns, react-best-practices, ast-grep | community skill sets |
| loop-contract, skill-stocktake, recall | in-house (sanitized for sharing) |

The hooks `context_monitor.js`, `harness_telemetry.js`, and the `/learn-eval`
command were ported and adapted from **affaan-m / ECC** (Everything Claude Code).

## What was deliberately left out

Operational skills tied to a specific business (client reporting, fleet
monitoring, meeting sync, build-queue worker, email inbox worker, browser-task
recorder, agent-architecture audit) are **not** in this bundle - they encode
client rosters, vault layouts and app inventories that are meaningless (and
private) outside the machine they were built for. SETUP-GUIDE.md describes the
pattern so you can build your own.

`playwright-skill` ships without its `node_modules` (112MB). If you use it, run
`npm i` inside that skill folder, or just rely on the Playwright MCP server that
`settings.json` already wires up.
