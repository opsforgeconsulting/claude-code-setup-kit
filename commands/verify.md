---
description: Verify the current change works end-to-end (build + routes + screenshot) WITHOUT deploying
---
Verify the current change actually works — do NOT deploy.

1. Read THIS repo's CLAUDE.md for the run command + port.
2. Run the build (`npm run build` / `pnpm build`); fix type/lint errors.
3. Boot the app on its documented port; hit the key routes with curl for 200/307.
4. For UI changes, use the playwright-skill to screenshot + assert (write test output to a temp dir; `--use-gl=swiftshader` for WebGL).

Report exactly what passed, what failed (with the error output), and anything you couldn't verify (headless audio/WebGL/gated routes). Be honest — no "probably works." $ARGUMENTS
