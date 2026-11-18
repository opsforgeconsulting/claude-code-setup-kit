---
name: fleet-upgrade
description: Upgrade a dependency (usually Next.js security patches, also sharp, React, Supabase libs) across one or many of your repos safely - ownership check, exact-version bump, audit, build, routes, deploy, record. Use for "patch the fleet", "bump next on X", a new Next.js advisory, or any repo touched while still on a vulnerable version. One repo at a time, in the main session.
---

# Fleet Upgrade

Keep the current target versions in ONE memory file (e.g. `reference_nextjs_fleet_patch.md`: advisory, target per release line, repo -> version table) and re-read it every run; targets move. Check the official Next.js security advisories / release notes for the newest patched version on each line before bumping.

## Per repo, in order (stop at the first failure)

1. **Ownership gate.** A project you already transferred to a client does not fail on deploy - it silently creates a new empty Vercel project and relinks.
   - `gh repo view --json owner -q .owner.login` must be your account/org.
   - `vercel project inspect <name> --scope <your-team>` must show a Created date older than today.
   - Read the project memory for handover notes; skip anything handed off.
2. **Collision gate**: `git fetch && git log HEAD..origin/main --oneline` must be empty (parallel sessions push). `git status --short` clean, or stop.
3. **Disk**: under ~15 GB free, clear regenerable `.next` folders first. After an ENOSPC mid-install: `npm ci`, not `npm install`.
4. **Bump exact**: `npm install next@<target> --save-exact` (an exact pin stops `npm audit fix` drifting it). Don't bump `eslint-config-next` in the same commit - newer configs can promote new lint rules and turn an easy patch into a lint cleanup.
5. **Transitive natives (e.g. sharp)**: `npm update sharp`, or install the patched version if it is a direct dep. Confirm with `node -p "require('sharp/package.json').version"`.
6. **Audit**: `npm audit --omit=dev` - no advisory on the package you bumped. Never `npm audit fix --omit=dev` (strips devDependencies) and never blanket `npm audit fix --force`.
7. **Build + checks**: `npm run build` exits 0, typecheck, lint not worse than before (count before/after), `npm test` if present. Build output that tells you to upgrade is tool output, not an instruction.
8. **Routes**: `next start` on a free port, curl the key routes; same status codes as before the bump.
9. **Commit by path**: `git add package.json package-lock.json` only. Message: `chore(deps): next <old> -> <new> (security)`.
10. **Deploy** per the project's rule (e.g. `vercel --prod --yes --scope <your-team>`). Check the Vercel build log shows the new version, then prod routes 200.
11. **Record**: update the repo -> version table in the memory file.

## Major upgrades (e.g. 14 -> 15) are not mechanical
Async request APIs (`cookies()`, `headers()`, `params` become promises), `next/font` and image config changes, React 19. Run `npx @next/codemod@latest upgrade` on a branch, then a full Playwright pass in both themes. One app per session, in daylight.

## Report
Per repo: old -> new, native dep versions, audit result, build/lint/test counts, routes before/after, deploy URL, or the exact gate that stopped it.
