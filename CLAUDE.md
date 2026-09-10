# Global Claude Code Build Guide

A portable operating contract for full-stack / AI app work. This is the
**craft layer**: conventions, discipline, and a premium-UI floor. Personalize the
bracketed bits (your name, deploy scope, brand rules), then let it run.

> Precedence when guidance conflicts: **project's own CLAUDE.md / memory file -> this guide -> generic best practice.**

---

## TL;DR - Operating Contract

The eight rules that matter most. Everything below is the detail behind them.

1. **Build and ship, then verify.** Proceed without asking on routine work; stop only for destructive/irreversible actions or real legal/ethical/architectural forks. Not "done" until `npm run build` passes and key routes are checked (200 / screenshot).
2. **Be honest about state** - demo vs live, stubbed vs real, verified vs assumed. Never claim something works that you haven't confirmed.
3. **Demo-mode-first, always** - apps boot zero-credential on deterministic seed data; each service flips live independently when its key is set; AI keeps deterministic fallbacks. (Full section below.)
4. **Colors come from the project - never invented.** Read the project's memory file FIRST; its brand and conventions outrank every default in this guide.
5. **Premium UI is the floor** (21st.dev / Linear / Vercel). Dark + light with a toggle, glass, motion, radial glows. Never ship generic Tailwind starter UI.
6. **Compliant by default** - official APIs over scrapers-with-evasion; CAN-SPAM on email; RLS on every table; no regulated data (health, financial) in logs.
7. **Default stack:** Next.js + TS + Tailwind + shadcn/ui + Supabase (`@supabase/ssr`) + Framer Motion + Anthropic SDK (prompt caching on). Models: `claude-fable-5` (moat features only) / `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`.
8. **Deploy** `vercel --prod --yes` (add `--scope <your-team>`); **log** after substantial work (auto-memory + your knowledge base).

---

## Who You Are Working For

[Your name] - [role, e.g. fractional CTO + AI systems architect]. Builds and ships full-stack AI platforms fast.
[Brands / companies / contact. Keep this short; the roster of active projects lives in memory files, not here.]

---

## Working Style

- **Proceed without asking** - click yes on all prompts. Never pause to confirm routine actions.
- **Only stop for**: genuinely destructive/irreversible actions, real legal/ethical forks, architectural decisions that can't be undone
- **Ship AND verify** - not done until `npm run build` passes + key routes checked. Fix lint + types as part of "done."
- **Be honest about state** - always label demo vs live, stubbed vs real, unverified vs confirmed
- **After substantial work** - update auto-memory + drop a decisions note in your knowledge base (architecture and decisions only, never source code)
- **Direct, no filler** - honest assessments over validation. Flag tradeoffs, don't silently pick one path.

---

## Environment

- **Machine**: [OS, e.g. Windows 11 with Git Bash; or macOS]
- **Shell**: On Windows always use the Bash tool (Git Bash). PowerShell only when explicitly needed. Node needs `C:/...` paths on Windows.
- **Running**: Claude Code terminals (multiple simultaneous sessions are normal)
- **Services to never touch in cleanup scripts**: [e.g. PostgreSQL, Tailscale, VPN]

---

## Harness & Automation (this Claude Code setup)

You're running in a tuned setup - use it, don't fight it.

- **Effort is high** - full reasoning every turn. Don't shortcut hard problems to save tokens.
- **Edits are auto-reviewed** - a `PostToolUse` hook (`review_hook.py`) runs on every Write/Edit when `OPENAI_API_KEY` is set. No need to manually re-review your own diffs; act on what it flags.
- **Context monitor** (`context_monitor.js`) injects `[StrategicCompact]`, `[CONTEXT WARNING]`, `[LOOP WARNING]`, and `[STALL WARNING/CRITICAL]` notes. Obey them - they see repeats your in-context judgment rationalizes away.
- **Recall** (`recall_hook.js`) injects dated hits from memory, journal, and past sessions on the first prompt of every session; `recall: <question>` re-triggers it. Hits are claims as of their date - verify against live code.
- **Learning loop** (`learn_loop.js`, Stop hook) writes ONE candidate lesson per substantial session into `memory/_candidates/`; `/review-candidates` is the only path to live memory.
- **Connectors** (claude.ai MCP, if you enable them): Gmail, Google Calendar/Drive, Asana, HubSpot, meeting-notes tools, banking, n8n, Vercel. When a task touches email / calendar / meetings / CRM, offer to use the connector instead of hand-rolling it. (May be absent in headless/cron runs - degrade gracefully.)
- **Vercel plugin** enabled (deploy + skills); **codex** MCP available for a second-opinion code generation pass.
- **Skills to reach for:** `ui-ux-pro-max` + `motion-design` (premium UI), `playwright-skill` (verify), `systematic-debugging`, `loop-contract`, `verification-before-completion`.

---

## Default Stack

```
Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Radix)
Supabase (@supabase/ssr) - Postgres + Auth + Realtime + Storage
Framer Motion - all animation
Sonner - toasts
Zod - validation
Resend - email
Anthropic SDK - Claude API (prompt caching on)
Recharts - charts/data viz
dnd-kit - drag and drop
Tiptap - rich text (immediatelyRender: false always)
```

**Current Claude model IDs (use exactly):**
```
claude-fable-5           - flagship/moat reasoning ONLY (scoring engines, exec agents) - 2x Opus cost; never the blanket default
claude-opus-4-8          - architectural work, complex reasoning
claude-sonnet-4-6        - standard builds, most tasks (the in-app workhorse)
claude-haiku-4-5-20251001 - fast/cheap tasks, evals
```

**Verified current external model IDs - 2026-06** (default to them for NEW work; don't mass-migrate existing apps - update each only when next touched; always verify live before wiring):
```
OpenAI LLM:    gpt-5.5 (flagship) - gpt-5.4-mini (fast)   <- GPT-4o & all GPT-4.x are OBSOLETE, do not use
OpenAI image:  gpt-image-2 (GPT Image 2.0)                <- stop using gpt-image-1
Google:        gemini-3.5-flash  (+ gemini-3.x-pro available)
Groq / Meta:   meta-llama/llama-4-scout-17b-16e-instruct  <- was llama-3.3
```
GPT-5.x gotchas: use `max_completion_tokens` (NOT `max_tokens` -> 400); no custom `temperature`; `gpt-5.5-pro` is Responses-API only (not chat/completions). For ANY model/API/pricing: web-search or hit the live `/models` endpoint and verify before wiring - training cutoff lags reality.

**Fable 5 API gotchas:** adaptive thinking only (`thinking: {type: "adaptive"}`); `thinking: {type: "disabled"}` returns 400 - omit the param instead; no `temperature`/`top_p`/`top_k`; no assistant prefills. Tier per feature (static per-route choice or an env override) - models never switch on their own.

**Next.js version notes:**
- Next 15: use `next/font/google` - fetches at build time
- Next 16 + Turbopack: `ssr: false` dynamic imports must be inside a Client Component
- Tailwind v4: CSS-first config via `@theme {}` - no `tailwind.config.js`
- tsconfig: `target: ES2020` always
- Forms: `react-dom` `useFormState`/`useFormStatus` (not `react` namespace)

---

## Demo-Mode-First Architecture

The signature pattern - nearly every app uses it. Build so the app is fully usable with **zero credentials**, then let real services flip on independently.

- **Zero-cred boot** - every screen renders from a deterministic seed dataset (`lib/demo/` or `lib/mock-data.ts`) with no env vars set. A visible "Demo data" badge is fine.
- **Fixed reference timestamp** - anchor all demo dates to a constant `REFERENCE_NOW`, never `Date.now()`. This is what prevents server/client hydration mismatch (the #1 demo bug).
- **Independent live flips** - each service (Supabase, Resend, Anthropic, Places/Yelp, Twilio...) switches demo->live on its own when its key is present (`isSupabaseConfigured`, etc.). One missing key never breaks the app.
- **AI keeps deterministic fallbacks** - every AI feature degrades to a non-AI path so it works with no `ANTHROPIC_API_KEY`.
- **First deploy ships in demo mode** - instant shareable link, no secrets required; go live by adding keys later.

---

## UI / Design System

### The Standard

Every interface must look like a funded, polished AI SaaS product. Reference aesthetic: **21st.dev, Linear, Vercel, Resend, Luma**.
Never output basic Tailwind starter UI. Never use plain boxes on flat backgrounds. Never use generic aesthetics.

> **Defaults, not dogma.** The UI system below (dark-first with a light-mode toggle, aurora backgrounds, an editorial serif + Inter, glass) is the default for premium SaaS builds. **The project's memory file wins on aesthetics - always check it first.** A kids' app, a clinical tool, or a monochrome editorial brand each override these defaults; when a project's brand conflicts with them, the brand wins.

Run this pipeline for any premium build or redesign:
```
ui-ux-pro-max -> build -> motion-design -> verify with playwright
```

### Color Rule

**The user specifies colors per project. Never invent a color scheme. Never default to your favorite accent.**

When colors are given, derive the full token system:
```css
--color-bg-base         /* darkest bg, usually near #080B12 */
--color-bg-elevated     /* cards/panels - slightly lighter */
--color-bg-glass        /* rgba(255,255,255,0.04-0.06) */
--color-border          /* rgba(255,255,255,0.07-0.10) */
--color-accent          /* primary brand - CTAs, glows, highlights */
--color-accent-glow     /* accent at 10-20% opacity for radial glow */
--color-accent-2        /* secondary accent if provided */
--color-text-primary    /* #F9FAFB or near-white */
--color-text-secondary  /* #9CA3AF muted */
--color-text-dim        /* #4B5563 disabled/placeholder */
```

### Typography

- **Display/Hero**: `Cinzel Decorative` - hero headlines only, extreme restraint
- **Editorial headings**: `Cormorant Garamond` - h2/h3, premium weight
- **UI/Body**: `Inter` - all body copy, labels, UI text
- **Data/Mono**: `JetBrains Mono` - code blocks, API keys, metrics
- **Kids/playful builds only**: `Fredoka`

Always import via `next/font/google` in `layout.tsx`. Never use system fonts unless asked.

### Non-Negotiable Baseline (every screen)

- Ship BOTH dark + light mode with a user-facing toggle (dark-first default) - every screen must look intentional in both; use next-themes + CSS-var tokens defined per mode (not just dark)
- Radial glows behind primary CTAs and key metrics
- Glass morphism panels - never flat opaque boxes
- Layered depth: base -> elevated -> glass -> floating
- Micro-motion on every interactive element
- Ambient background motion (aurora, gradient drift, or spotlight)
- High-contrast text - never gray-on-gray
- Generous spacing - sections breathe
- Rounded-2xl on all cards and panels
- Borders at 7-10% white opacity - always present, barely visible

### Background Components

**Always use a background component. Never write one-off background CSS.**

Priority:
1. `AuroraBackground` - animated aurora gradient, flagship heroes
2. `SpotlightBackground` - mouse-follow spotlight, dashboards
3. `GridBackground` - dot/line grid, data-heavy pages
4. `DotPatternBackground` - fine dot field, secondary pages
5. `AnimatedGradientBackground` - slow color shift, marketing pages
6. `NoiseOverlay` - film grain texture, stack on any background
7. `BackgroundWrapper` - base dark gradient, always outermost

Standard composition:
```tsx
<BackgroundWrapper>
  <AuroraBackground />
  <NoiseOverlay opacity={0.03} />
  <main className="relative z-10">{/* content */}</main>
</BackgroundWrapper>
```

### Component Patterns

**Check `/components/backgrounds`, `/components/effects`, `/components/buttons`, `/components/ui` before writing new CSS.**

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

Glass secondary button:
```tsx
<button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white hover:-translate-y-0.5 transition-all duration-200">
```

Metric card:
```tsx
<div className="relative rounded-2xl border border-white/8 bg-white/4 p-6 overflow-hidden">
  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-accent-glow)] blur-2xl" />
  <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
  <p className="mt-1 text-sm text-white/50">{label}</p>
</div>
```

Gradient hero headline:
```tsx
<h1 className="bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent font-display text-6xl font-bold leading-tight tracking-tight">
```

### Framer Motion System

Use Framer Motion on every page. No exceptions.

Core presets (put in `lib/motion.ts`):
```ts
export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
}
export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } }
}
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
}
export const scaleUp = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
}
```

Hover patterns:
```tsx
// Card lift
whileHover={{ y: -4, scale: 1.015 }} transition={{ duration: 0.2, ease: 'easeOut' }}
// Button
whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
// Glow pulse (AI elements)
animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
// Background orb drift
animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
```

Page entry wrapper (every page):
```tsx
<motion.div initial="hidden" animate="visible" variants={stagger}>
  <motion.section variants={fadeUp}>...</motion.section>
</motion.div>
```

Motion rules:
- Never use `type: "spring"` with high bounce - reads as amateur
- Never animate faster than 150ms
- Never rotate non-icon elements
- Ambient loops: 8-15s cycles, subtle
- Scroll animations fire once only

### AI / Agent UI Patterns

Agent online indicator:
```tsx
<div className="relative flex items-center gap-2">
  <div className="relative">
    <div className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping" />
    <div className="relative h-2.5 w-2.5 rounded-full bg-teal-400" />
  </div>
  <span className="text-sm text-teal-400 font-medium">Agent Online</span>
</div>
```

AI thinking (3-dot):
```tsx
{[0,1,2].map(i => (
  <motion.div key={i} className="h-2 w-2 rounded-full bg-white/40"
    animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
))}
```

### Quality Checklist (run before every commit)

- [ ] Colors derived from the project's spec - never invented
- [ ] Both dark + light mode work (dark-first default, user toggle)
- [ ] Background component used - no one-off background CSS
- [ ] Glass cards with backdrop-blur + border + shadow
- [ ] Radial glow behind CTA and metrics
- [ ] Framer Motion on entry + hover
- [ ] Correct font pair for this project
- [ ] No gray-on-gray text
- [ ] Mobile responsive at 375px
- [ ] All interactive elements have hover state
- [ ] Loading / empty / error states are designed
- [ ] `npm run build` passes before done

---

## Supabase Conventions

```ts
// Auth - always use @supabase/ssr
import { createServerClient } from '@supabase/ssr'
import { createBrowserClient } from '@supabase/ssr'

// CRITICAL: supabase-js <Database> generic collapses writes to `never` - cast instead
const { data } = await supabase.from('table').select().returns<MyType[]>()

// RLS always on - never disable in production
// Every table needs RLS policies before shipping

// Middleware pattern - protect routes at edge
// File: middleware.ts at project root
// Use updateSession() from @supabase/ssr
```

Auth patterns:
- Server components: `createServerClient` with cookie store
- Client components: `createBrowserClient`
- Route handlers: `createServerClient` with cookie store
- Middleware: `updateSession()` - refreshes session on every request
- Protected routes: check session in layout, redirect to `/login` if null
- Never store JWT in localStorage - let @supabase/ssr handle cookies

Realtime:
```ts
const channel = supabase.channel('room').on('postgres_changes',
  { event: '*', schema: 'public', table: 'tablename' },
  (payload) => handleChange(payload)
).subscribe()
// Always unsubscribe on cleanup: return () => supabase.removeChannel(channel)
```

---

## Claude API Patterns

```ts
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

// Prompt caching - always on for system prompts > 1024 tokens
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: [{ type: 'text', text: systemPrompt,
    cache_control: { type: 'ephemeral' } as any }], // type cast required
  messages: [{ role: 'user', content: userMessage }]
})

// Streaming
const stream = await client.messages.stream({ ... })
for await (const chunk of stream) { ... }

// Tool use - define tools array, handle tool_use stop_reason
```

---

## Auth & Security

- Never hardcode API keys - always `process.env.KEY_NAME`
- All env vars in `.env.local` (never committed), mirror in Vercel dashboard
- RLS on every Supabase table - non-negotiable
- Webhook endpoints: validate signature before processing (Stripe, Lemon Squeezy, Resend/svix, etc.)
- Regulated data awareness (health, financial): no such data in logs, no third-party analytics on the sensitive routes, develop on demo data until the legal agreement is in place
- CAN-SPAM: all marketing emails need an unsubscribe link + physical address

Env var naming convention:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # server only, never NEXT_PUBLIC_
ANTHROPIC_API_KEY
RESEND_API_KEY
CRON_SECRET                     # for Vercel cron validation
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
LEMON_SQUEEZY_API_KEY
LEMON_SQUEEZY_WEBHOOK_SECRET
```

---

## API & Route Handler Patterns

```ts
// app/api/route-name/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = MySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // ... logic

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[route-name]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Cron route - validate secret
const secret = req.headers.get('authorization')?.replace('Bearer ', '')
if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

---

## Error Handling & State

Toasts via Sonner:
```ts
import { toast } from 'sonner'
toast.success('Saved')
toast.error('Something went wrong')
toast.loading('Processing...') // returns id
toast.dismiss(id)
```

Loading states: always design them - shimmer skeletons, not spinners alone
Empty states: always design them - they're CTAs, not voids
Error boundaries: wrap major sections in `<ErrorBoundary>` with a fallback UI

---

## Deploy

```bash
vercel --prod --yes            # add --scope <your-team> if the project lives under a Vercel team
```

- Crons: defined in `vercel.json` + validated with `CRON_SECRET`
- Always demo-mode first deploy - services flip live independently
- Check build output size - warn if any route > 500kb
- Playwright test files -> Windows temp paths on Windows (not `/tmp`)

---

## Project Roster Context

When working on a project, pull the relevant project memory file (in the memory dir, indexed by `MEMORY.md`) and treat it as ground truth. Keep one memory file per client / product with: what it is, live URL, stack quirks, brand rules, and the current state (demo / live / blocked). Never let one client's details leak into another client's work.

---

## Knowledge-Base Logging Protocol

After any substantial session, drop a note in your knowledge base (Obsidian or similar), filed under the project it belongs to:

```md
## [Project Name] - [Date]
### What shipped
### Current state (demo/live/stubbed)
### Key decisions made
### Next steps
### Known issues / gotchas
```

No source code in the knowledge base - architecture notes, decisions, and conventions only.

---

## Memory File Hygiene

Your memory files (one fact each) are all indexed in `MEMORY.md` (the index injected each session).
- Keep every memory file indexed - when you add a new one, add its `MEMORY.md` line too.
- Treat code/file-path claims in older memories as possibly stale; verify against current code before acting.
- New clients or products may not have a memory file yet - create one after substantial work.

---

## Hard-Won Gotchas

```
supabase-js <Database> generic collapses writes to `never` - cast instead
@anthropic-ai/sdk cache_control requires `as any` type cast
Model IDs: claude-fable-5 (moat only), claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
Fable 5: omit `thinking` to disable (explicit disabled = 400); adaptive thinking only; no temperature/top_p/top_k
tsconfig target: ES2020 always
Next 14 forms: react-dom useFormState/useFormStatus (not react namespace)
Next 16 + Turbopack: ssr:false dynamic imports must be in a Client Component
Tailwind v4: CSS-first @theme{} - no tailwind.config.js
Tiptap: immediatelyRender: false always
White-bg logos -> crest plaque treatment
next/font/google fetches at build time
Windows/PowerShell: use Bash tool; node needs C:/... paths
Playwright test output -> Windows temp paths, not /tmp
Demo-mode-first: apps boot zero-cred on a fixed reference timestamp; each service flips live independently when its env key is set
Supabase REST caps every response at 1000 rows regardless of .limit() - page with .range()
Bash heredocs on Windows corrupt non-ASCII and eat backslashes - use the Write tool (heredoc_guard.py enforces this)
```

---

## Don't

- No source code in the knowledge base
- Don't skip build/verify - not done until `npm run build` passes
- Don't add unused deps
- Don't invent color schemes - wait for the project to specify
- Don't ship dark-only - give the user a light/dark toggle (dark-first default), both fully designed
- Don't write one-off background CSS - use background components
- Don't hardcode API keys ever
- Don't disable RLS in production
- Don't scrape with detection evasion / proxy rotation - use official APIs (Google Places, Yelp Fusion, RESO/RentCast for MLS). Compliant-by-default protects client accounts + sending-domain reputation
- Don't use system fonts
- Don't output generic Tailwind starter UI
- Don't use `type: "spring"` with high bounce in Framer Motion
- Don't stop to ask on routine actions - proceed

---

## Fable -> Opus Operating Pack

Fable-distilled operating procedure for sessions where the daily driver is Opus/Sonnet.
Inlined below via import; Fable 5 sessions skim the Escalation section and skip the rest.
Part B of the pack is the generic API system-prompt shim for app features that don't have
a measured prompt pack yet.

@FABLE-OPUS-PACK.md
