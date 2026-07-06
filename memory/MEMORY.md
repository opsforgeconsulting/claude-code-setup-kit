# Memory Index

<!--
This is your persistent, file-based memory index. Each fact lives in its own
file in this folder; this file holds ONE line per fact so it can be loaded into
context every session.

Format for each line:
  - [Short Title](file-name.md) — one-line hook describing the fact

Each fact file has frontmatter:
  ---
  name: <short-kebab-case-slug>
  description: <one-line summary used to decide relevance during recall>
  metadata:
    type: user | feedback | project | reference
  ---
  <the fact; link related memories with [[their-name]]>

Types:
  user      — who you are (role, stack, preferences)
  feedback  — how Claude should work for you (include the why)
  project   — ongoing work/goals/constraints not derivable from the code
  reference — pointers to external resources (URLs, dashboards, tickets)

Keep this index tight — one line each, detail goes in the fact file.
Delete this comment block once you've added your first few memories.
-->
