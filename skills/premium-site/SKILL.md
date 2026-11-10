---
name: premium-site
description: The house standard for every website, landing page or marketing site build, remake or redesign. Scroll-driven cinematic intro, real 21st.dev components, the client's own brand and content, both themes, verified live. Load this BEFORE writing any UI file whenever the task is to build, remake, rebuild or redesign a site, landing page, homepage or marketing page for anyone. Triggers on "build a site", "remake this website", "new landing page", "redesign their homepage", "make a site for <client>".
---

# Premium Site Standard

Every site we ship should feel like a film that turns into a product page. A visitor scrolls,
something cinematic happens that is specific to this client, and it lands on a clear next step.
Generic sections on a flat background are a failed build, however clean the code.

Work the gates in order. Do not write a UI file before Gate 3 is done.

## Gate 0: Declare the loop

State in one short block before starting: the client, the source of truth for brand and content,
the intro concept in one sentence, and the done check (build passes, routes 200 live, both themes
and phone width screenshotted, zero console errors).

## Gate 1: Brand and content come from the client, never from you

- **Colors, fonts and logo:** take them from the client's existing site, brand file, or the
  project's memory file. If none exists, ask for them. Never invent a palette.
- **Content:** when remaking an existing site, pull the real copy from its page source and keep it
  verbatim in one data file (for example `lib/site.ts`): prices, dates, FAQ answers, contact links.
  Anything the source marks as to-be-confirmed stays marked that way. Do not write facts.
- **Assets:** copy their real photos and logos into `public/`. Generated imagery fills gaps; it
  does not replace what they already have.
- **Sibling sites must not look alike.** If this client or a related one already has a site from
  us, change the type family and the surface treatment, not only the layout. Layout alone does not
  separate two sites.

## Gate 2: Pick the intro

Choose one and say why in a line.

| Intro | Use when | Cost |
|---|---|---|
| **Scroll-scrubbed film** (default) | The place, product or event is physical and photogenic | Image + video generation credits, about an hour |
| **Code-driven intro** | The story is data or a process (a map scan, counters, a ledger) | No credits, more build time |
| **Scroll-locked reveal** (a door, a curtain, one push) | One strong metaphor fits the brand | One short clip |

Tell the user the fork once: film looks real but its camera path is baked; code-driven is
tweakable forever but reads as designed, not shot.

### The scroll-scrubbed film recipe

1. **Storyboard three beats**: where we start, what we pass through, where we land. The landing
   frame is the one the logo and the calls to action sit on.
2. **Frames**: use the client's own photos as first and last frames wherever they exist. Generate
   only the missing ones, prompted as photography ("cinematic photograph, golden hour, 35mm,
   shallow depth of field"), never as a render. Keep faces and hands distant.
3. **Clips**: image-to-video with start and end frames, a slow simple camera move, sound off.
   Fast or complex moves morph. Two clips of about six seconds is enough.
4. **Encode** with `references/encode-film.sh`: 1280x720, crossfade between clips, a keyframe
   every 8 frames so seeking is smooth, no audio, plus a 480p cut for phones and keyframe stills.
   Target 4 to 6 MB for the desktop file.
5. **Component**: start from `references/scroll-film-hero.tsx`. The parts that matter:
   - a tall wrapper (about 420vh) with a sticky full-screen stage inside it;
   - a requestAnimationFrame loop that eases `video.currentTime` toward scroll progress (move 15%
     of the gap each frame) instead of setting it directly;
   - prime the video once with play-then-pause, or some browsers never seek;
   - keyframe stills underneath that cross-fade by scroll position, so there is a picture before
     the video can seek;
   - phones get the 480p file, chosen after mount;
   - reduced motion gets the final still and a normal-height hero;
   - text beats that fade in and out at scroll ranges, then the landing lockup with the logo, one
     primary call to action and one secondary.
6. **Check the scrub at reading speed** on desktop and on a phone. If the film ends before the
   page releases, or text beats overlap, fix the ranges.

## Gate 3: Real 21st.dev components

- Search before you write: `mcp__21st__search` and `mcp__21st__get_component`, or the `21st` CLI
  when it is logged in. If the CLI returns 401, use the MCP tools.
- Port **at least four** real components that fit the brand (a spotlight or border treatment, a
  number ticker, a marquee, a countdown, a testimonial wall, a bento, and so on) and restyle them
  with the project's tokens.
- Record what you chose and what you rejected in `.21st/design.json`, with component ids.
- Never hand-write a card grid, marquee, ticker or hero treatment that a 21st component already
  does better. Never hand a UI build to a subagent whose prompt does not require this gate.

## Gate 4: Build through the pipeline

`21st-ui-build` (grounded in the brand tokens) then `ui-ux-pro-max` then `motion-design`. Load each
skill; do not paraphrase it from memory.

Floor for every page:
- Dark and light, with a toggle, both designed. A single-theme site is allowed only when the
  client's brand calls for it, and the reason is written in the project notes.
- Scroll reveals fire once, at reading speed. Nothing animates faster than 150ms. No bouncy springs.
- A film-grain or glow layer over photography so text stays readable; text on photos gets a shade.
- One primary action per screen. Forms, phone numbers and map links actually work.
- Loading, empty and error states are designed.
- The app boots with no credentials set. Anything not wired says so on the page or in the notes.

## Gate 5: Verify, then ship

Run `playwright-skill` against the production build, then again against the live URL:
- every route returns 200, unknown routes 404;
- zero console errors;
- no horizontal scroll at 390 and 375 wide;
- screenshots in both themes at desktop and phone width, and you looked at them;
- the intro scrubs on desktop and phone;
- demo deployments are `noindex`.

Deploy only after the build passes. Report what is live, what is demo data, and what is still
waiting on the client (real video, headshots, domain, ticket links).

## What "done" is not

- A page that builds but that you have not opened in a browser.
- A hero with a stock gradient because generation credits were not spent.
- Their content rewritten in your words.
- Screens that pass in dark and were never opened in light.
