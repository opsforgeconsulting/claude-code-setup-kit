#!/usr/bin/env node
/**
 * Print the human-readable turns of a Claude Code transcript (.jsonl): user + assistant text,
 * tool traffic omitted. Default: the LAST 60k characters (the end of a session carries the
 * lessons). Usage: node transcript-text.mjs <path> [--all] [--chars 60000]
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
if (!file) { console.error('usage: transcript-text.mjs <transcript.jsonl> [--all] [--chars N]'); process.exit(2); }
const all = argv.includes('--all');
const ci = argv.indexOf('--chars');
const limit = ci !== -1 ? Number(argv[ci + 1]) : 60000;

const textOf = (c) => typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n') : '';
const out = [];
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  if ((o.type !== 'user' && o.type !== 'assistant') || o.isSidechain) continue;
  const t = textOf(o.message?.content).trim();
  if (t.length < 2) continue;
  if (/^<(command-name|local-command|system-reminder)/.test(t)) continue;
  out.push(`[${o.type}${o.timestamp ? ' ' + o.timestamp.slice(11, 16) : ''}] ${t}`);
}
let text = out.join('\n\n');
if (!all && text.length > limit) text = '...(earlier turns omitted)...\n\n' + text.slice(-limit);
process.stdout.write(text + '\n');
