#!/usr/bin/env node
'use strict';
/**
 * SessionStart hook: if the learning loop has candidate lessons waiting in quarantine
 * (memory/_candidates/*.md with `status: pending`), print a one-line reminder to run
 * /review-candidates. Never blocks, always exits 0, ASCII-only output.
 *
 * Kit version: memory dir derived from the session cwd (~/.claude/projects/<cwd-slug>/memory),
 * overridable with CC_MEMORY_DIR.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function memoryDir(cwdHint) {
  if (process.env.CC_MEMORY_DIR) return process.env.CC_MEMORY_DIR;
  const cwd = cwdHint || process.cwd();
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\/]/g, '-'), 'memory');
}

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    let cwd; try { cwd = JSON.parse(data).cwd; } catch {}
    const dir = path.join(memoryDir(cwd), '_candidates');
    let n = 0;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      try { if (/^\s*status:\s*pending/m.test(fs.readFileSync(path.join(dir, f), 'utf8'))) n++; } catch {}
    }
    if (n > 0) process.stdout.write(`[learning loop] ${n} candidate lesson(s) awaiting review - run /review-candidates\n`);
  } catch { /* no candidates dir yet */ }
  process.exit(0);
});
