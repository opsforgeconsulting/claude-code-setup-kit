---
description: Scaffold a new demo-mode-first Next.js app on a premium stack, ready to deploy
argument-hint: <app-name> [brand colors / vibe]
---
Scaffold a new app called "$1". Treat extra args ($ARGUMENTS) as brand/color/vibe notes.

1. **Brand first** — colors come from the project, never invented. If none given, start from a neutral premium-dark scaffold and ask for the logo/colors before finalizing styling.
2. **Scaffold:** `npx create-next-app@latest $1 --typescript --tailwind --app --eslint --import-alias "@/*"` (pin the Next major if it matters). Add framer-motion, sonner, zod, lucide-react, next-themes; shadcn-style primitives in `components/ui`; `@supabase/ssr` + `@anthropic-ai/sdk` only if the app needs them. tsconfig `target: ES2020`.
3. **Demo-mode-first** — create `lib/demo/` (or `lib/mock-data.ts`) with a deterministic seed anchored to a fixed `REFERENCE_NOW` (never `Date.now()`). The app MUST boot and be fully browsable with ZERO env vars. Each service flips live independently when its key is set; AI features get deterministic fallbacks.
4. **Premium UI baseline:** dark + light toggle (next-themes + per-mode CSS-var tokens), a background component, glass cards, radial glows behind CTAs/metrics, Framer Motion presets in `lib/motion.ts`, the right font pair for the brand.
5. **Verify** — `npm run build` passes + dev server boots + key route 200. Then it's ready to deploy (first deploy goes up in demo mode).
6. **Document** — write a per-repo CLAUDE.md and, if you keep a memory index, add an entry for it.

Confirm the app name and brand before scaffolding if anything's unclear.
