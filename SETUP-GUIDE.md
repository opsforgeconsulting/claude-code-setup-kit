# Full Environment Setup Guide

The complete, in-order checklist for bringing a new builder from a bare Windows
machine to the same working setup: accounts, toolchain, Claude Code, the kit,
connectors, knowledge base, meeting capture, GitHub, Vercel, Supabase, and the
day-one verification. Follow it top to bottom and tick each box.

Time budget: about 2 to 3 hours if every account is new, under 1 hour if the
accounts already exist. Do it on the recipient's machine, signed in as them.

Legend: **[req]** required · **[rec]** recommended · **[opt]** optional.

---

## 0. Before you start

- [ ] The recipient has admin rights on the Windows machine.
- [ ] Windows 11 with `winget` available (open PowerShell and run `winget --version`).
- [ ] Deliver the kit as a **Drive link or the GitHub repo**, never as an email
      attachment: Gmail blocks `.ps1` files even inside a zip.
- [ ] Have a password manager open. Every step below that creates a key says
      where it goes. Keys never go into files that get committed.

---

## 1. Accounts

Create or confirm each account before installing anything. Use one email for all
of them where possible so connectors line up later.

| Account | Why | Plan |
|---|---|---|
| **Anthropic / Claude** [req] | Claude Code itself | Claude Max (5x or 20x). Fable models need a plan or API access that includes them; if not, the kit falls back to `opus[1m]`. |
| **GitHub** [req] | code hosting, `gh` CLI | Free is fine |
| **Vercel** [req] | hosting + deploy CLI | Hobby to start; Pro if deploying client apps. Create a **team** so `--scope <team>` works the same way for every project. |
| **Supabase** [req] | Postgres + auth + storage | Free tier per project |
| **OpenAI** [rec] | powers the auto-review hook and the Codex second-opinion MCP | Pay-as-you-go API key; a few dollars a month |
| **Resend** [rec] | transactional email from apps | Free tier |
| **Granola** [rec] | meeting notes and transcripts that Claude can read | Paid plan for the MCP connector |
| **Obsidian** [rec] | the knowledge base Claude logs into | Free; Sync optional |
| **21st.dev** [opt] | component search and UI generation via the 21st CLI | Free tier |
| **Higgsfield / image tools** [opt] | image and video generation from inside Claude | only if the work needs it |

- [ ] Every account created and signed in once in Chrome on this machine.
- [ ] GitHub: enable 2FA. Vercel: create the team. Supabase: create the org.

---

## 2. Windows prep

Run these in an **elevated PowerShell** once.

```powershell
# allow local scripts (needed for bootstrap.ps1 and hooks)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# keep winget current
winget upgrade --id Microsoft.AppInstaller -e --accept-source-agreements
```

- [ ] Execution policy set.
- [ ] **Git for Windows** will be installed by the bootstrap. It brings **Git Bash**,
      which Claude Code uses for its Bash tool on Windows. Do not skip it.
- [ ] [opt] WSL2 (`wsl --install`) only if the person already works in Linux tooling.
      Nothing in this setup requires it.

---

## 3. Run the kit bootstrap

The kit installs the toolchain and copies the whole `~/.claude` configuration:
build doctrine, hooks, recall engine, learning loop, agents, commands, skills.

```powershell
# 1. get the kit (zip from Drive, or clone the public repo)
git clone https://github.com/opsforgeconsulting/claude-code-setup-kit.git
cd claude-code-setup-kit
#    the zip build also carries skills/ (the repo does not, by design)

# 2. preview, then run
./bootstrap.ps1 -WhatIf
./bootstrap.ps1           # lean: dev toolchain + config
./bootstrap.ps1 -Full     # also Obsidian, Granola, PostgreSQL, Chrome, AutoHotkey, Python

# 3. open a NEW PowerShell window so PATH updates apply, then verify
claude --version; node -v; git --version; gh --version; vercel --version
```

What the bootstrap installs (lean):

| Tool | Purpose |
|---|---|
| Git for Windows, Node LTS, GitHub CLI, uv | base toolchain |
| `@anthropic-ai/claude-code` | Claude Code |
| `@openai/codex` | Codex CLI, also the `codex` MCP server (second opinion) |
| `ccusage` | the statusline: live token and cost usage |
| `vercel`, `repomix`, `@ast-grep/cli`, `@21st-dev/cli`, `defuddle`, `pnpm` | deploy, repo packing, structural search, UI catalog, web-to-markdown, package manager |
| `fd`, `bat`, `delta`, `ripgrep` | fast find, better cat, better diffs, fast grep |

- [ ] Bootstrap finished without red lines.
- [ ] `~/.claude/` now contains `CLAUDE.md`, `FABLE-OPUS-PACK.md`, `settings.json`,
      `settings.local.json`, `hooks/`, `recall/`, `agents/`, `commands/`, `skills/`.
- [ ] If a `~/.claude` already existed, its files were backed up as `*.bak-<stamp>`.

---

## 4. Claude Code first run

```powershell
claude            # in any folder
/login            # sign in with the Claude account (browser flow)
/status           # confirms model, account, and that hooks loaded
/doctor           # environment check; fix anything it flags
```

- [ ] `/status` shows the model from `settings.json` (`fable[1m]`). If the account
      cannot use Fable, edit `~/.claude/settings.json` and set `"model": "opus[1m]"`.
- [ ] Ask in the session: **"what skills do you have?"** and confirm the list is long
      (40 or so). Ask **"what agents can you use?"** and confirm `premium-ui`,
      `security-review`, `supabase-migrator`, `silent-failure-hunter`, `vercel-ship`.
- [ ] Type `/ship` and `/verify` and confirm they are recognized (then cancel).

### The auto-review hook needs an OpenAI key

`review_hook.py` sends every edited code file to a second model for a quick review.
Without a key it silently does nothing.

```powershell
# user-level env var, persists across shells
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")
# optional: the review model (default gpt-5.4-mini)
[Environment]::SetEnvironmentVariable("REVIEW_MODEL", "gpt-5.4-mini", "User")
```

- [ ] Open a new terminal, make a trivial edit through Claude, and confirm a review
      note prints after the edit.

### Permissions

`settings.local.json` ships with a broad-but-safe allowlist (npm, pnpm, tsc, eslint,
playwright, node, read-only git, localhost curl, Vercel curl). Add the team deploy
line for this person:

```json
"Bash(vercel --prod --yes --scope <their-team>)"
```

- [ ] Allowlist edited with their Vercel team name.
- [ ] Decide the permission mode they will run in. Auto mode with the allowlist is
      the productive default; it still stops on destructive actions.

---

## 5. MCP servers (local)

The kit's `settings.json` wires four local servers. Check they connect:

```powershell
claude mcp list
```

| Server | Needs | Fix if red |
|---|---|---|
| `codex` | `codex` on PATH, signed in | run `codex login` once |
| `context7` | nothing | first call downloads via npx |
| `playwright` | nothing | run `npx playwright install chromium` once |
| `basic-memory` | `uv` on PATH | new shell after bootstrap |

- [ ] All four show connected.
- [ ] [opt] Supabase MCP, per project, read-only. Add it with the token in an env
      var, never in the file:

```powershell
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "sbp_...", "User")
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=<ref>
```

---

## 6. claude.ai connectors (Granola, Gmail, Calendar, Drive, and the rest)

These are configured on the **web**, not in files. Anything connected on claude.ai
shows up inside Claude Code automatically as `claude.ai <Name>` tools.

1. Go to claude.ai → Settings → **Connectors**.
2. Connect, in this order of value: **Granola**, **Google Drive**, **Google
   Calendar**, **Gmail**, then any of Asana, HubSpot, Calendly, Roam, n8n, Mercury,
   Canva, Higgsfield as the person's work needs.
3. Back in a Claude Code session run `claude mcp list` and confirm each shows
   **Connected**. Ones that say "Needs authentication" are fixed by clicking the
   connector on claude.ai again.

- [ ] Granola connected. Test: "list my meetings from this week."
- [ ] Gmail and Calendar connected (they re-prompt for auth every so often; that is
      normal).
- [ ] Note: connectors are **interactive-session only**. Scheduled or headless runs
      cannot use them, so anything automated has to use the vendor API directly.

---

## 7. Claude in Chrome (browser automation)

1. Install the **Claude in Chrome** extension from the Chrome Web Store, signed in
   to the same Claude account.
2. In the extension's settings, grant site permissions for the sites the person
   will automate (their own dashboards, Vercel, Supabase, Resend, and so on).
3. In a Claude Code session: "open a new tab and take a screenshot of vercel.com".

- [ ] Screenshot came back. Claude can now click, type, and read pages in their
      real signed-in browser.

---

## 8. Plugins and skills

```text
/plugin marketplace add anthropics/claude-plugins-official
/plugin install vercel@claude-plugins-official
```

- [ ] Vercel plugin installed (it is already enabled in `settings.json`).
- [ ] Skills came from the zip. To refresh any of them later, pull from the sources in
      `ATTRIBUTION.md` rather than from this kit.
- [ ] Read `skills-and-plugins.md` for what each group of skills is for.

---

## 9. The memory system

Claude Code keeps a per-project memory directory; the kit adds two things on top.

**Memory files.** One fact per file under
`~/.claude/projects/<project-slug>/memory/`, indexed by `MEMORY.md`. The global
`CLAUDE.md` tells Claude how to write them. Start with the empty `MEMORY.md` from
the kit and let it grow.

**Recall.** `recall/` is a full-text index over memory, journals, and past session
transcripts. The `recall_hook.js` hook runs it on the first prompt of every session
and injects dated past context. First build of the index:

```powershell
node $env:USERPROFILE\.claude\recall\recall.mjs index      # build (add --force to rebuild)
node $env:USERPROFILE\.claude\recall\recall.mjs stats
node $env:USERPROFILE\.claude\recall\recall.mjs "any search phrase"
```

**Learning loop.** `learn_loop.js` (Stop hook) writes at most one candidate lesson
per session into `memory/_candidates/`. Nothing goes live on its own; the person
runs `/review-candidates` to promote, absorb, or drop each one. `CC_LEARN=off`
disables it.

Recall works on plain full-text search out of the box. Setting `VOYAGE_API_KEY` adds
semantic embeddings on top; optional.

- [ ] `index` ran, `stats` shows chunks, and a search returns results (small on day one).
- [ ] Explain the rule: memory is for durable facts and preferences, not for things
      the repo already records.

---

## 10. Per-repo `CLAUDE.md` (the biggest lever)

Every repo the person works in should carry its own `CLAUDE.md`: what it is, how
to run, build, and verify it, the stack with exact versions, the non-obvious
architecture, deploy flow, repo-specific gotchas.

- New repo: `/newapp <name>` writes one. Existing repo: `/init`, then edit.
- Precedence is written into the global guide: **project `CLAUDE.md` → global
  `~/.claude/CLAUDE.md` → generic best practice.**

- [ ] First real repo has a `CLAUDE.md` that mentions its port, build command, and
      deploy command.

---

## 11. Knowledge base: Obsidian

1. Install Obsidian (`-Full` bootstrap did it) and create one vault per business
   area. Keep client work in separate vaults so nothing leaks across.
2. Use the structure the skills expect: `00 - Guide`, `01 - Areas`, `02 - Projects/
   <Project>/` (Home, Overview, Tech Stack, Build Log, Tasks), `03 - Knowledge/
   Playbooks`, `Daily Notes`, `99 - Archive`.
3. The `obsidian-markdown`, `obsidian-bases`, `json-canvas`, and `obsidian-cli`
   skills are already installed. `obsidian-cli` needs the Obsidian CLI binary; the
   skill explains where to get it.
4. Rule from the global guide: **no source code in the vault**, architecture notes
   and decisions only, and log a note after every substantial session.

- [ ] Vault created and opened once.
- [ ] Optional: a SessionStart hook can open or verify the vault each session. The
      kit ships without one on purpose; add it once the vault path is known.

---

## 12. Meeting capture: Granola

1. Granola app installed and signed in (`-Full` bootstrap installs it; otherwise
   granola.ai). Grant microphone and system audio permissions.
2. Connect the Granola connector on claude.ai (section 6).
3. Workflow the skills assume: after a client call, ask Claude to "pull today's
   meeting notes, file them under the right project, and list the build items."
   Anything discussed on a call is a **candidate**, not a commitment; the person
   confirms before it gets built.

- [ ] One real meeting recorded and readable from a Claude Code session.

---

## 13. GitHub

```powershell
gh auth login          # GitHub.com, HTTPS, authenticate via browser
gh auth status
git config --global user.name  "Their Name"
git config --global user.email "their@email"
git config --global core.autocrlf true     # Windows line endings sanity
```

- [ ] `gh auth status` shows logged in with `repo` and `workflow` scopes.
- [ ] Test: `gh repo create test-kit --private` then delete it from the web UI.
- [ ] House rule: never commit `.env*`; `.gitignore` in every repo lists `.env.local`,
      `.vercel`, `node_modules`, `.next`.

---

## 14. Vercel

```powershell
vercel login
vercel teams ls                # confirm the team slug
cd <a project>; vercel link    # binds the folder to a project
vercel env pull .env.local     # pulls env vars for local dev
vercel --prod --yes --scope <team>
```

- [ ] First deploy succeeded and the URL returns 200.
- [ ] Env vars live in the Vercel dashboard and get mirrored to `.env.local`, never
      the other way round in git.
- [ ] Convention: **demo-mode-first**. The first deploy of any app ships with no
      secrets and runs on seed data; each service flips live when its key is added.

---

## 15. Supabase

1. Create a project per app. Save the project ref, anon key, service-role key, and
   database password in the password manager.
2. Env var names, exactly: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`).
3. Local SQL access: install PostgreSQL (`-Full` bootstrap) so `psql` works against
   the **pooler** host; on some networks the direct database host does not resolve.
4. Rules: RLS on every table before shipping; the `<Database>` generic in supabase-js
   collapses writes, so cast query results instead.

- [ ] One project created and `psql` connects through the pooler.
- [ ] [opt] Supabase MCP added read-only for that project (section 5).

---

## 16. Email: Resend

1. Verify the sending domain in Resend (DNS records at the registrar).
2. `RESEND_API_KEY` in Vercel and `.env.local`.
3. Every marketing email carries an unsubscribe link and a physical address.
   Transactional mail to yourself does not.
4. Known trap: Resend suppresses an address after a hard bounce and then silently
   drops future sends. If "the email never arrived", check the suppression list
   first (`GET /suppressions`) and the send's `last_event`, not the code.

- [ ] A test email delivered (check `last_event: delivered`, not just the 200).

---

## 17. Optional extras

- **AutoHotkey** for a push-to-talk or summon hotkey.
- **PostgreSQL 18** for local databases and `psql`.
- **Playwright browsers**: `npx playwright install` in a project that tests UI.
- **Tailscale / Cloudflare Tunnel** to reach local dev servers from a phone.
- **Codex CLI** signed in (`codex login`) so the second-opinion MCP works.

---

## 18. Day-one verification (do all of these before calling it done)

- [ ] `claude` opens, `/status` shows the right model, hooks listed.
- [ ] Skills, agents, and commands answer to their names.
- [ ] Editing a file prints an auto-review note (OpenAI key working).
- [ ] `claude mcp list`: local servers connected; Granola, Drive, Calendar connected.
- [ ] Claude in Chrome takes a screenshot.
- [ ] `gh auth status`, `vercel whoami`, and a Supabase `psql` connect all pass.
- [ ] `/newapp hello` scaffolds an app, `npm run build` passes, `/ship` deploys it,
      the URL returns 200 in both dark and light mode.
- [ ] Recall indexed; `/review-candidates` runs (empty is fine).
- [ ] Obsidian vault exists and the first session note is written.
- [ ] `.env.local` is gitignored in that first repo. Confirm with `git status`.

---

## 19. Keep it sharp

- Re-run `bootstrap.ps1` when the kit updates. It backs up before overwriting.
- Refresh skills from their upstream sources every month or two.
- When a gotcha bites, add it to the repo's `CLAUDE.md` and, if portable, to the
  global one. The value compounds. The tell that it's working: fewer correction
  loops per session.
- Read `FABLE-OPUS-PACK.md` once. It is the operating discipline the smaller models
  run as procedure: plan gate, invariant-first debugging, constraint lists, re-read
  before edit, evidence before assertion, and when to escalate.
