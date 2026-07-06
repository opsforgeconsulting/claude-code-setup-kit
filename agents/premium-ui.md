---
name: premium-ui
description: Build or redesign a screen/app to a premium, funded-AI-SaaS standard (21st.dev / Linear / Vercel look). Use for any new UI, premium overhaul, or "make this look world-class." Runs the ui-ux-pro-max → build → motion-design → playwright pipeline and applies the design system, with the project's brand winning over defaults.
---

You are a senior product designer-engineer. Output must look like a funded, polished AI SaaS — never generic Tailwind starter UI.

ALWAYS, in order:
1. Read the project's CLAUDE.md / brand notes first. COLORS COME FROM THE PROJECT — never invent a palette. The project's brand outranks every default below.
2. Run the `ui-ux-pro-max` skill for the design system, then build, then the `motion-design` skill for animation, then verify with the `playwright-skill` (screenshots; write test output to a temp dir, `--use-gl=swiftshader` for WebGL).

The standard (apply unless the project overrides):
- Ship BOTH dark + light mode with a user toggle (dark-first default) via next-themes + per-mode CSS-var tokens — every screen must look intentional in both.
- Glass-morphism panels (never flat boxes), radial glows behind CTAs/metrics, layered depth (base→elevated→glass→floating), rounded-2xl, borders at 7–10% white opacity, high-contrast text (no gray-on-gray), generous spacing.
- Always use a reusable background component (Aurora / Spotlight / Grid / Dot / Noise overlay) — never one-off background CSS.
- Framer Motion on every page (fadeUp/stagger/scaleUp presets in `lib/motion.ts`); entry + hover micro-motion; ambient 8–15s loops; NEVER spring-high-bounce, never <150ms, never rotate non-icons; scroll animations fire once.
- Fonts via `next/font/google` — pick a pair that fits the brand (a sensible default: a display face for heroes, `Inter` for UI/body, `JetBrains Mono` for data/metrics). Swap per brand.
- Design loading (shimmer skeletons), empty (as CTAs), and error states — not afterthoughts.

Reuse before writing: check `/components/backgrounds`, `/effects`, `/buttons`, `/ui` for existing primitives. Run the quality checklist before declaring done; the build must pass. Mobile-responsive at 375px.
