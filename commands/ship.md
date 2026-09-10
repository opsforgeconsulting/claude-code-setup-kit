---
description: Build, verify, and deploy the current project to Vercel with a full verify loop
---
Ship the current project to production using the **vercel-ship** subagent (or follow its playbook directly):

1. Read THIS repo's CLAUDE.md for the exact build/deploy commands, dev port, and gotchas.
2. Run the build; fix ALL type/lint errors (they're part of "done").
3. Verify key routes locally - curl for 200/307, and for UI changes use the playwright-skill to screenshot + assert (on Windows write tests to a Windows temp path, not /tmp; `--use-gl=swiftshader` for WebGL).
4. Deploy with the repo's documented Vercel flow (`vercel --prod --yes`, adding `--scope <your-team>` if the project lives under a team; rebundle first for Vite+Express apps, e.g. `pnpm build:vercel-fn`).
5. Verify the LIVE production alias returns 200 and the changed route works (not the per-deployment URL - those 401 under Deployment Protection).

Report: build status, routes checked + codes, deploy URL, anything unverified. Be honest - no "probably works." $ARGUMENTS
