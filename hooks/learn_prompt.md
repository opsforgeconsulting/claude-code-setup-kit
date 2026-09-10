# Learn-loop child run (headless, quarantine mode)

You are the assistant's learning pass over a session that just ended. Your output is ONE
candidate lesson written to quarantine. You never write to live memory, MEMORY.md, or
~/.claude/skills. You never edit code. You never send anything. Budget: be done in under 5
minutes of work.

Inputs arrive in your prompt as `TRANSCRIPT=<path> SESSION=<id> DATE=<yyyy-mm-dd> MEMORY_DIR=<path>`.
`MEMORY_DIR` is the auto-memory folder for the project the session ran in; everything you
write goes under it.

## Steps

1. Extract the session's text: run
   `node --no-warnings ~/.claude/recall/transcript-text.mjs "<TRANSCRIPT>"`
   (prints user + assistant turns, last ~60k chars). Read it once.
2. Find the single most valuable reusable insight, using the /learn-eval rubric:
   error-resolution root causes, non-obvious debugging technique, a workaround for a library or
   platform quirk, or a project constraint or preference not derivable from code. Skip trivia
   and anything the repo or git history already records. If nothing qualifies, write nothing
   and print `NO CANDIDATE: <one line why>` and stop.
3. Duplicate check, by actually running it:
   `CC_MEMORY_DIR=<MEMORY_DIR> node --no-warnings ~/.claude/recall/recall.mjs "<the insight in 8 words>" -n 6`
   If a hit already states the lesson, your candidate becomes an "Absorb into <path>" note, not
   a new file, unless the new evidence materially changes it.
4. Write exactly one file to `<MEMORY_DIR>/_candidates/` named `<DATE>-<kebab-slug>.md` with
   this shape:

```
---
name: <kebab-slug>
description: <one line, used for recall relevance>
metadata:
  type: user | feedback | project | reference | skill
  session: <SESSION>
  verdict: Save | Improve then Save | Absorb into <existing path> | Drop
  evidence: <the concrete moment(s) in the session that prove it, with what was observed>
  status: pending
---
<the lesson. For feedback/project: **Why:** and **How to apply:** lines. For type skill: a
short SKILL.md body (Problem / Solution / When to use) that would live at
~/.claude/skills/<name>/SKILL.md if promoted.>
```

5. Append one JSON line to `<MEMORY_DIR>/harness-log/<yyyy-mm>.jsonl`:
   `{"ts":"<iso>","src":"learn","session":"<SESSION>","file":"<filename or null>","verdict":"<verdict>"}`
6. Print the filename and the verdict, then stop.

## Rules

- One candidate per run. If two compete, take the one with the stronger evidence.
- Evidence must be observed in the transcript, not inferred. Quote the moment.
- Never include secrets, credentials, or anything that looks like regulated personal data. If
  the transcript contains such content near the lesson, describe the lesson without it.
- Client boundaries hold: a lesson about one client's stack never names another client.
- "Drop" is a valid and common verdict. An empty candidates folder is healthier than a noisy one.
