#!/usr/bin/env node
'use strict';
/**
 * harness_telemetry.js — PostToolUse hook on matcher "Skill|Agent".
 *
 * Kit version (generalized): the log directory is derived from the session cwd
 * (~/.claude/projects/<cwd-slug>/memory/harness-log), overridable with CC_MEMORY_DIR.
 *
 * Appends one JSONL line per Skill/Agent invocation to the monthly harness log
 * (memory/harness-log/YYYY-MM.jsonl) so skill-stocktake can retire dead skills
 * and agents on evidence instead of vibes. Other harness components
 * (context_monitor.js warnings, review_hook.py reviews) log to the same files.
 *
 * Contract: NEVER blocks, no stdout, always exits 0. ASCII-only output.
 * Disable with CC_HARNESS_TELEMETRY=off.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function memoryDir(cwdHint) {
  if (process.env.CC_MEMORY_DIR) return process.env.CC_MEMORY_DIR;
  const cwd = cwdHint || process.cwd();
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\/]/g, '-'), 'memory');
}

function append(logDir, event) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, new Date().toISOString().slice(0, 7) + '.jsonl');
    fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
  } catch { /* telemetry must never break the session */ }
}

function run(raw) {
  const off = String(process.env.CC_HARNESS_TELEMETRY || '').trim().toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(off)) return;

  let input;
  try { input = raw.trim() ? JSON.parse(raw) : {}; } catch { return; }

  const logDir = path.join(memoryDir(input.cwd), 'harness-log');
  const tool = String(input.tool_name || '');
  const ti = input.tool_input || {};
  const sid = String(input.session_id || '').slice(0, 8);
  const ts = new Date().toISOString();

  if (tool === 'Skill') {
    append(logDir, { ts, sid, src: 'skill', name: String(ti.skill || '?').slice(0, 60) });
  } else if (tool === 'Agent') {
    append(logDir, {
      ts, sid, src: 'agent',
      name: String(ti.subagent_type || 'claude').slice(0, 60),
      desc: String(ti.description || '').slice(0, 60)
    });
  }
}

if (require.main === module) {
  let data = '';
  const MAX = 256 * 1024;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { if (data.length < MAX) data += c.slice(0, MAX - data.length); });
  process.stdin.on('end', () => {
    try { run(data); } catch { /* never fail */ }
    process.exit(0);
  });
}

module.exports = { run, memoryDir };
