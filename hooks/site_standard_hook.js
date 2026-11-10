#!/usr/bin/env node
/**
 * UserPromptSubmit hook: when a prompt asks to build, remake or redesign a website or landing
 * page, inject a reminder to load the `premium-site` skill before any UI file is written.
 *
 * Why a hook and not a line in CLAUDE.md: a written rule gets skipped under time pressure; this
 * fires every time. It never blocks and never edits the prompt. Any failure exits silently.
 * Disable with CC_SITE_STANDARD=off.
 */
const fs = require('node:fs');

const VERB = '(?:build|make|create|remake|rebuild|redo|redesign|design|scaffold|start|spin up|put together|mock up|overhaul|revamp|refresh)';
const NOUN = '(?:web ?site|site|landing page|landing|home ?page|marketing page|web page|one[- ]pager|microsite)';
const PATTERNS = [
  new RegExp(`\\b${VERB}\\b[^.?!\\n]{0,90}\\b${NOUN}\\b`, 'i'),
  new RegExp(`\\bnew ${NOUN}\\b`, 'i'),
  new RegExp(`\\b${NOUN}\\b[^.?!\\n]{0,40}\\b(?:for|like)\\b[^.?!\\n]{0,60}\\b(?:client|them|him|her|company|business)\\b`, 'i'),
];

function main() {
  if (process.env.CC_SITE_STANDARD === 'off') return;
  let input = '';
  try { input = fs.readFileSync(0, 'utf8'); } catch { return; }
  let o; try { o = JSON.parse(input); } catch { return; }
  const prompt = String(o.prompt || '').trim();
  // Skip slash and bang commands and harness-injected turns: those are not the user asking for a site.
  if (prompt.length < 12 || prompt.startsWith('/') || prompt.startsWith('!') || prompt.startsWith('<')) return;
  if (/<task-notification>|<system-reminder>/.test(prompt)) return;
  if (!PATTERNS.some((re) => re.test(prompt))) return;

  const ctx = [
    '<site-standard>',
    'This prompt looks like a website or landing page build. House rule: every site goes through the',
    '`premium-site` skill. Load it with the Skill tool BEFORE writing any UI file, and work its gates in',
    'order: brand and content from the client (never invented), a scroll-driven intro, at least four real',
    '21st.dev components, the 21st-ui-build -> ui-ux-pro-max -> motion-design pipeline, then a browser',
    'check in both themes at desktop and phone width before and after deploy.',
    'If this prompt is not actually a site build (a bug fix, a question, a small copy edit), ignore this note.',
    '</site-standard>',
  ].join('\n');
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } }));
}
try { main(); } catch { /* never block a prompt */ }
