---
description: Review the learning loop's quarantined candidates (memory/_candidates) - promote the good ones into live memory or skills, absorb into existing files, or drop. The only path from candidate to live.
---

# /review-candidates

The learning loop (`hooks/learn_loop.js`, Stop hook) writes one candidate lesson per substantial
session into the project's auto-memory folder under `_candidates/`
(`~/.claude/projects/<cwd-slug>/memory/_candidates/`). Nothing there is live. This command is the gate.

## Steps

1. List `_candidates/*.md` with `status: pending` in frontmatter. For each, show: name, type,
   verdict the child proposed, evidence line, and the body. If none: say so and stop.
2. For each candidate, decide (the assistant decides; the user overrides when present):
   - **Promote**: type user/feedback/project/reference -> move to `memory/<type>_<slug>.md`
     (drop the `session/verdict/evidence/status` metadata, keep name/description/type), add the
     one-line pointer to `MEMORY.md` under the right section. Type skill -> create
     `~/.claude/skills/<name>/SKILL.md` from the body.
   - **Absorb**: append the lesson (dated) to the existing file the verdict names; delete the candidate.
   - **Drop**: delete the candidate. Say why in one line.
   - **Hold**: leave pending only if it needs the user's eyes (a preference claim, a client boundary
     question). Set `status: needs-review`.
3. Re-run the duplicate check yourself before promoting:
   `node --no-warnings ~/.claude/recall/recall.mjs "<lesson>" -n 5`
4. After promotions, re-index: `node --no-warnings ~/.claude/recall/recall.mjs index --quiet`
   (add `--embed` if you have a VOYAGE_API_KEY set).
5. Anything pending older than 30 days gets dropped (skill-stocktake also enforces this).
6. Report: promoted / absorbed / dropped / held, one line each.

## Rules

- Evidence-less candidates are dropped, not improved.
- A promoted skill must have a realistic future trigger; if you cannot name the next session
  that would use it, absorb or drop.
- Never promote anything containing credentials or regulated personal data.
