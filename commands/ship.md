---
description: Build, verify, and deploy the current project to production with a full verify loop
---
Ship the current project to production using the **vercel-ship** playbook (or the `premium-ui`/`security-review` agents as needed):

1. Read THIS repo's CLAUDE.md for the exact build/deploy commands, dev port, and gotchas. Do not assume the flow.
2. Run the build; fix ALL type/lint errors (they're part of "done").
3. Verify key routes locally — curl for 200/307, and for UI changes use the playwright-skill to screenshot + assert (write test output to a temp dir; `--use-gl=swiftshader` for WebGL).
4. Deploy with the repo's documented flow (e.g. `vercel --prod` for a Next app on Vercel; rebundle first for Vite+Express apps).
5. Verify the LIVE production URL returns 200 and the changed route works — not a per-deployment URL (those can 401 under deployment protection).

Report: build status, routes checked + codes, deploy URL, anything unverified. Be honest — no "probably works." $ARGUMENTS
