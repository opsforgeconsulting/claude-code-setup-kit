# Global Claude Code Build Guide

A portable operating contract for full-stack / AI app work. This is the
**craft layer** — conventions, discipline, and a premium-UI floor. Personalize
the bracketed bits, then let it run.

> Precedence when guidance conflicts: **project's own CLAUDE.md / memory → this guide → generic best practice.**

---

## TL;DR — Operating Contract

1. **Build and ship, then verify.** Proceed without asking on routine work; stop only for destructive/irreversible actions or real legal/ethical/architectural forks. Not "done" until the build passes and key routes are checked (200 / screenshot).
2. **Be honest about state** — demo vs live, stubbed vs real, verified vs assumed. Never claim something works that you haven't confirmed.
3. **Demo-mode-first** — apps boot with zero credentials on deterministic seed data; each service flips live independently when its key is set; AI keeps deterministic fallbacks.
4. **Read the project's own conventions FIRST** — its brand, stack, and gotchas outrank every default here.
5. **Premium UI is the floor** (21st.dev / Linear / Vercel look). Ship dark + light with a toggle, glass, motion, depth. Never generic Tailwind-starter UI.
6. **Compliant by default** — official APIs over scrapers-with-evasion; unsubscribe + physical address on marketing email; row-level security on every table.
7. **Fix lint + types as part of "done."** They're not warnings to wave past.

---

## Working Style

- **Proceed without asking** on routine actions. Only stop for genuinely destructive/irreversible operations, real legal/ethical forks, or architectural decisions that can't be undone.
- **Ship AND verify** — not done until the build passes and key routes are checked.
- **Be honest about state** — always label demo vs live, stubbed vs real, unverified vs confirmed.
- **Direct, no filler** — honest assessments over validation. Flag tradeoffs; don't silently pick one path.

---

## Default Stack

> A sensible modern default — override per project.

```
Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Radix)
Supabase (@supabase/ssr) — Postgres + Auth + Realtime + Storage
Framer Motion — animation
Sonner — toasts · Zod — validation · Resend — email
Recharts — charts · dnd-kit — drag & drop · Tiptap — rich text
Anthropic SDK — Claude API (prompt caching on)
```

Model selection (verify current IDs/pricing live before wiring — training data lags reality):
- A **flagship/reasoning** model for architecture and hard problems.
- A **mid-tier workhorse** for standard builds and most in-app calls.
- A **fast/cheap** model for bulk, evals, and trivial tasks.

Framework notes:
- Tailwind v4: CSS-first config via `@theme {}` — no `tailwind.config.js`.
- Next.js + Turbopack: `ssr: false` dynamic imports must live inside a Client Component.
- `next/font/google` fetches at build time.
- tsconfig `target: ES2020`.
- Tiptap: `immediatelyRender: false` always.

---

## Demo-Mode-First Architecture

Build so the app is fully usable with **zero credentials**, then let real
services flip on independently.

- **Zero-cred boot** — every screen renders from a deterministic seed dataset (`lib/demo/` or `lib/mock-data.ts`) with no env vars set. A visible "Demo data" badge is fine.
- **Fixed reference timestamp** — anchor all demo dates to a constant `REFERENCE_NOW`, never `Date.now()`. This is what prevents server/client hydration mismatch (the #1 demo bug).
- **Independent live flips** — each service (DB, email, AI, maps…) switches demo→live on its own when its key is present (`isSupabaseConfigured`, etc.). One missing key never breaks the app.
- **AI keeps deterministic fallbacks** — every AI feature degrades to a non-AI path so it works with no API key.
- **First deploy ships in demo mode** — instant shareable link, no secrets required.

---

## UI / Design System

### The Standard

Every interface should look like a funded, polished product. Reference
aesthetic: **21st.dev, Linear, Vercel, Resend, Luma**. Never output basic
Tailwind starter UI, plain boxes on flat backgrounds, or generic aesthetics.

> Defaults, not dogma — the project's brand wins over everything below. **Never invent a color scheme; derive it from the brand you're given.**

### Color tokens (derive the full set from the brand)

```css
--color-bg-base         /* darkest bg, e.g. near #080B12 */
--color-bg-elevated     /* cards/panels — slightly lighter */
--color-bg-glass        /* rgba(255,255,255,0.04-0.06) */
--color-border          /* rgba(255,255,255,0.07-0.10) */
--color-accent          /* primary brand — CTAs, glows, highlights */
--color-accent-glow     /* accent at 10-20% opacity for radial glow */
--color-text-primary    /* near-white #F9FAFB */
--color-text-secondary  /* muted #9CA3AF */
--color-text-dim        /* placeholder #4B5563 */
```

### Typography (defaults — swap per brand)

- **Display/Hero**: a high-impact display face, used with restraint.
- **UI/Body**: `Inter` for all body copy, labels, UI text.
- **Data/Mono**: `JetBrains Mono` for code, keys, metrics.
- Import via `next/font/google` in `layout.tsx`. Avoid system fonts unless asked.

### Non-negotiable baseline (every screen)

- Ship BOTH dark + light mode with a user-facing toggle (dark-first default) via `next-themes` + per-mode CSS-var tokens — every screen must look intentional in both.
- Radial glows behind primary CTAs and key metrics.
- Glass-morphism panels — never flat opaque boxes.
- Layered depth: base → elevated → glass → floating.
- Micro-motion on every interactive element; subtle ambient background motion.
- High-contrast text — never gray-on-gray. Generous spacing. Rounded-2xl cards.
- Borders at 7-10% white opacity — always present, barely visible.
- Designed loading (skeletons, not bare spinners), empty, and error states.
- Mobile responsive at 375px.

### Reusable patterns

Glass card:
```tsx
<div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-xl shadow-black/30 hover:border-white/12 hover:bg-white/6 transition-all duration-200">
  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-accent-glow)] to-transparent pointer-events-none" />
  <div className="relative z-10">{/* content */}</div>
</div>
```

Primary CTA:
```tsx
<button className="relative inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-glow)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
```

Metric card:
```tsx
<div className="relative rounded-2xl border border-white/8 bg-white/4 p-6 overflow-hidden">
  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-accent-glow)] blur-2xl" />
  <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
  <p className="mt-1 text-sm text-white/50">{label}</p>
</div>
```

### Motion presets (`lib/motion.ts`)

```ts
export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
}
export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } }
}
export const scaleUp = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
}
```

Motion rules: never `type: "spring"` with high bounce; never faster than 150ms;
ambient loops 8-15s; scroll animations fire once.

### Quality checklist (before "done")

- [ ] Colors derived from the brand — never invented
- [ ] Dark + light both work (dark-first default, user toggle)
- [ ] Glass cards w/ backdrop-blur + border + shadow; radial glow behind CTA/metrics
- [ ] Framer Motion on entry + hover
- [ ] No gray-on-gray text; responsive at 375px
- [ ] Loading / empty / error states designed
- [ ] Build passes

---

## Code Patterns

### Supabase (`@supabase/ssr`)

```ts
import { createServerClient, createBrowserClient } from '@supabase/ssr'

// supabase-js <Database> generic collapses writes to `never` — cast instead:
const { data } = await supabase.from('table').select().returns<MyType[]>()
```

- Server components / route handlers: `createServerClient` with the cookie store.
- Client components: `createBrowserClient`.
- Middleware: `updateSession()` — refreshes the session each request; protect routes at the edge.
- Never store the JWT in localStorage — let `@supabase/ssr` handle cookies.
- **Row-level security on every table before shipping — never disable it in production.**

### Claude API

```ts
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic() // reads ANTHROPIC_API_KEY

const res = await client.messages.create({
  model: '<workhorse-model-id>',
  max_tokens: 1024,
  system: [{ type: 'text', text: systemPrompt,
    cache_control: { type: 'ephemeral' } as any }], // cast required
  messages: [{ role: 'user', content: userMessage }],
})
```

Prompt caching: on for system prompts > ~1024 tokens. `cache_control` needs the
`as any` cast. Long/expensive calls → precompute + cache, never run them on a
live page view.

### Route handler

```ts
export async function POST(req: NextRequest) {
  try {
    const parsed = MySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    // ...logic
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[route-name]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
// Cron: validate a shared secret from the Authorization header before doing work.
```

---

## Security & Compliance Baseline

- Never hardcode API keys — always `process.env.KEY_NAME`. Secrets in `.env.local` (never committed), mirrored in the host's dashboard.
- Server-only secrets must NOT carry the `NEXT_PUBLIC_` prefix.
- Row-level security on every table — non-negotiable.
- Validate webhook signatures before processing (Stripe, etc.).
- Marketing email: unsubscribe link + physical address (CAN-SPAM).
- Prefer official APIs over scraping-with-evasion — it protects account + domain reputation.
- Handling sensitive/health data: no sensitive data in logs, no third-party analytics on sensitive routes.

Env naming:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server only
ANTHROPIC_API_KEY
RESEND_API_KEY
CRON_SECRET
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
```

---

## Memory File Hygiene

You have a persistent file-based memory (`~/.claude/.../memory/`), indexed by
`MEMORY.md` (loaded each session). One fact per file.

- Keep every memory indexed — add the `MEMORY.md` line when you add a file.
- Don't save what the repo already records (code structure, git history, the project's CLAUDE.md). Save what's non-obvious and durable: who you are, how you want Claude to work, ongoing project constraints, external resource pointers.
- Convert relative dates to absolute. Update the existing file rather than duplicating; delete memories that turn out wrong.
- Treat older memories as possibly stale — verify file paths / flags against current code before acting on them.

---

## Hard-Won Gotchas

```
supabase-js <Database> generic collapses writes to `never` — cast with .returns<T>()
@anthropic-ai/sdk cache_control requires `as any`
Tailwind v4: CSS-first @theme{} — no tailwind.config.js
Next + Turbopack: ssr:false dynamic imports must be in a Client Component
tsconfig target: ES2020
Tiptap: immediatelyRender: false always
next/font/google fetches at build time
Demo-mode-first: boot zero-cred on a FIXED reference timestamp (not Date.now) — prevents hydration mismatch
Windows: node needs C:/... paths; Playwright output → a temp dir, not /tmp
Long/expensive AI calls: precompute + cache, never on a live page view
For any model/API/pricing detail: verify live — training cutoff lags reality
```

---

## Don't

- Don't skip build/verify — not done until the build passes.
- Don't invent color schemes — derive from the brand.
- Don't ship dark-only — give a light/dark toggle (dark-first), both fully designed.
- Don't write one-off background CSS — use a reusable background component.
- Don't hardcode API keys, ever. Don't disable RLS in production.
- Don't scrape with detection evasion — use official APIs.
- Don't add unused deps. Don't use generic Tailwind starter UI.
- Don't stop to ask on routine actions — proceed.
