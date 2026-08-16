---
description: Extract a reusable lesson from this session, self-evaluate its quality, pick the right destination (memory file vs skill), check for overlap, then save only if it passes the gate.
---

# /learn-eval — Extract, Evaluate, then Save

Extends a plain "save what we learned" with a quality gate, a destination decision, and an overlap check — so the memory index and skills dir stay lean instead of accumulating near-duplicates. (Adapted to the memory protocol in CLAUDE.md.)

## What to extract
Look for the non-trivial, reusable signal from this session:
1. **Error-resolution patterns** — root cause + fix + why it reoccurs
2. **Debugging techniques** — non-obvious steps, tool combinations
3. **Workarounds** — library quirks, API limits, version-specific fixes
4. **Project state / constraints / preferences** — things not derivable from the code or git history
Skip trivia: typos, one-off outages, anything the repo or git history already records.

## Step 1 — Identify the single most valuable insight
One lesson per run. If several surfaced, pick the highest-leverage one (or run again).

## Step 2 — Choose the destination

**Memory file** → `~/.claude/memory/` (or your configured memory dir) (one fact per file, indexed in `MEMORY.md`). Use for the four memory types from CLAUDE.md:
- `user` — who the user is / preferences
- `feedback` — how I should work (corrections + confirmed approaches; include the why)
- `project` — ongoing work, goals, constraints not in the code (convert relative dates to absolute)
- `reference` — pointers to external resources

**Skill** → `~/.claude/skills/<name>/SKILL.md` (global, reusable across 2+ projects) or `{project}/.claude/skills/` (project-specific). Use for a reusable *workflow / technique / domain procedure* with clear trigger conditions and steps or code.

Rule of thumb: a **fact or preference** → memory file; a **repeatable procedure** → skill. When in doubt between global and project skill, choose global.

## Step 3 — Draft it in the destination's format

**Memory file:**
```markdown
---
name: <short-kebab-slug>
description: <one-line summary used for recall relevance>
metadata:
  type: user | feedback | project | reference
---
<the fact. For feedback/project, follow with **Why:** and **How to apply:** lines. Link related memories with [[their-name]].>
```

**Skill:**
```markdown
---
name: pattern-name
description: "Under ~130 chars, with trigger conditions"
---
# Descriptive Name
## Problem
## Solution  (with code/commands)
## When to Use  (trigger conditions)
```

## Step 4 — Quality gate (the point of this command)

### 4a. Required checklist — verify by actually reading files, not from memory
- [ ] Grep `~/.claude/skills/` and the project's `.claude/skills/` for keyword overlap
- [ ] Grep `MEMORY.md` and the memory dir for an existing file that already covers this
- [ ] Consider whether **appending to an existing** memory file or skill would suffice
- [ ] Confirm it's reusable, not a one-off

### 4b. Holistic verdict — choose one
| Verdict | Meaning |
|---------|---------|
| **Save** | Unique, specific, well-scoped |
| **Improve then Save** | Valuable but needs refinement |
| **Absorb into [X]** | Should be appended to an existing memory file / skill |
| **Drop** | Trivial, redundant, or too abstract |

Dimensions informing the verdict (not scored): specificity & actionability · scope fit · uniqueness vs existing memory/skills · realistic future trigger.

## Step 5 — Output the evaluation
```
### Checklist
- [x] skills grep: <no overlap | overlap with X → detail>
- [x] MEMORY.md / memory dir: <no overlap | overlaps Y → detail>
- [x] append-instead check: <new file appropriate | append to Z>
- [x] reusability: <confirmed | one-off → Drop>

### Destination: memory file (type: …) | global skill | project skill
### Verdict: Save | Improve then Save | Absorb into [X] | Drop
**Rationale:** (1–2 sentences)
```

## Step 6 — Confirmation flow by verdict
- **Save** — present destination path + draft + checklist → save after confirmation.
- **Improve then Save** — present required improvements + revised draft + re-evaluated verdict; if now Save, save after confirmation.
- **Absorb into [X]** — present the target file + the addition as a diff → append after confirmation.
- **Drop** — show checklist + reasoning only; nothing saved.

## Step 7 — Save, then keep the index honest
After writing a **memory file**, add its one-line pointer to `MEMORY.md` (`- [Title](file.md) — hook`, one line, under ~200 chars). After writing a **skill**, no index edit is needed. Never put memory content in `MEMORY.md` itself.

## Notes
- One pattern per file. Prefer appending over creating near-duplicates.
- Don't save what the repo, git history, or CLAUDE.md already records — if asked to remember one of those, save what was *non-obvious* about it instead.
- Delete memories later found to be wrong rather than stacking corrections.
