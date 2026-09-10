#!/usr/bin/env node
/**
 * UserPromptSubmit hook: on the FIRST real prompt of a session, run recall against it and
 * inject the top hits as context. Hits are labelled as dated claims, never facts.
 * Skips: later prompts in the same session, slash commands, prompts under 12 chars,
 * and anything when CC_RECALL=off. Re-indexes incrementally first (mtime-gated, ~100ms idle).
 *
 * Kit version (generalized): recall lives at ~/.claude/recall/recall.mjs; the memory dir
 * is derived from the session cwd and handed to recall via CC_MEMORY_DIR; embeddings only
 * run when VOYAGE_API_KEY is set (plain full-text search otherwise).
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RECALL = path.join(os.homedir(), '.claude', 'recall', 'recall.mjs');
const SEEN = path.join(os.homedir(), '.claude', 'recall', '.seen-sessions.json');
const N = 6;

function memoryDir(cwdHint) {
  if (process.env.CC_MEMORY_DIR) return process.env.CC_MEMORY_DIR;
  const cwd = cwdHint || process.cwd();
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\/]/g, '-'), 'memory');
}

function main() {
  if (process.env.CC_RECALL === 'off') return;
  if (!fs.existsSync(RECALL)) return;
  let input = '';
  try { input = fs.readFileSync(0, 'utf8'); } catch { return; }
  let o; try { o = JSON.parse(input); } catch { return; }
  const prompt = String(o.prompt || '').trim();
  const sid = o.session_id || 'unknown';
  // skip slash/bang commands and harness-injected turns (task notifications, hook echoes), which are not the user talking
  if (prompt.length < 12 || prompt.startsWith('/') || prompt.startsWith('!') || prompt.startsWith('<') || /<task-notification>|<system-reminder>/.test(prompt)) return;

  let seen = {}; try { seen = JSON.parse(fs.readFileSync(SEEN, 'utf8')); } catch {}
  const force = /^recall[:\s]/i.test(prompt);
  if (seen[sid] && !force) return;
  // keep the seen file small
  const keys = Object.keys(seen); if (keys.length > 200) for (const k of keys.slice(0, 100)) delete seen[k];
  seen[sid] = new Date().toISOString();
  try { fs.writeFileSync(SEEN, JSON.stringify(seen)); } catch {}

  const q = prompt.replace(/^recall[:\s]+/i, '').slice(0, 400);
  const env = { ...process.env, CC_MEMORY_DIR: memoryDir(o.cwd) };
  let hits = [];
  try {
    // incremental index (+ embed the few new chunks when a Voyage key exists); no-ops when nothing changed
    const indexArgs = ['--no-warnings', RECALL, 'index', '--quiet'];
    if (process.env.VOYAGE_API_KEY) indexArgs.push('--embed');
    execFileSync(process.execPath, indexArgs, { timeout: 8000, stdio: 'ignore', env });
    const out = execFileSync(process.execPath, ['--no-warnings', RECALL, '--json', '-n', String(N), q], { timeout: 6000, encoding: 'utf8', env });
    hits = JSON.parse(out.trim().split('\n').pop() || '[]');
  } catch { return; }
  if (!hits.length) return;

  const lines = hits.map((h, i) => `${i + 1}. [${h.source} ${h.date || 'undated'}] ${h.title}\n   ${h.snippet}\n   ${h.path}`);
  const ctx = [
    `<recall query="${q.replace(/"/g, "'").slice(0, 120)}">`,
    'Past context matching this prompt. Each item is a CLAIM as of its date, not a current fact:',
    'verify any file, flag, URL, or status against the live code before relying on it.',
    ...lines,
    `More: node ~/.claude/recall/recall.mjs "<query>"  (add --type memory,journal,digest,vault,session or --since YYYY-MM-DD)`,
    '</recall>',
  ].join('\n');
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } }));
}
main();
