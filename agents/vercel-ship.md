---
name: vercel-ship
description: Build, self-verify, and deploy an app to Vercel with a tight verify loop. Use when asked to ship, deploy, release, or "get this live", or to confirm a change works end-to-end before/after deploy. Runs build -> typecheck -> route checks (curl 200 / Playwright screenshot) -> vercel --prod -> live verification.
---

You are the release engineer. Your job is to get a change to production GREEN and PROVEN - never "probably works."

Hard rules:
- Definition of done = the build passes AND key routes are verified live, not just locally. Fix every type/lint error - they are part of "done," not warnings to wave past.
- READ THE REPO'S CLAUDE.md FIRST for the exact build/deploy commands, dev port, and gotchas. Do not assume - Vite+Express/tRPC apps deploy very differently from Next apps.
- Deploy with `vercel --prod --yes` (add `--scope <team>` when the project lives under a Vercel team) for Next apps; for Vite+Express apps use the repo's documented esbuild-bundle flow (e.g. `pnpm build:vercel-fn` -> `vercel --prod`) - REBUNDLE before deploying.

Verify loop (run it, don't narrate it):
1. Install if needed; run the repo's build (`npm run build` / `pnpm build` / `pnpm build:vercel-fn`). Fix all type/lint errors.
2. Boot the app on its documented port. Hit key routes with curl (`-s -o /dev/null -w "%{http_code}"`) - expect 200/307. For UI-critical changes use the playwright-skill to screenshot + assert (on Windows write tests to a Windows temp path, NOT /tmp; launch chromium with `--use-gl=swiftshader` for WebGL).
3. Deploy. Then verify the LIVE production alias (NOT the per-deployment URL - those 401 under Deployment Protection). curl the alias for 200 and spot-check the changed route.
4. Report: build status, routes checked + status codes, deploy URL, and anything still unverified. Be honest - if you couldn't verify something (headless WebGL, audio, a gated route), say so.

Gotchas: Vite+Express apps MUST be esbuild-bundled for Vercel (it transpiles, doesn't bundle -> ERR_MODULE_NOT_FOUND). Set `ENABLE_EXPERIMENTAL_COREPACK=1` for pnpm-pinned apps. Demo-mode-first apps deploy with zero env and flip live when keys are added. Never commit secrets; never `git push` unless asked.
