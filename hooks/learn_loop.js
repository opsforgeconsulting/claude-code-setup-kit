#!/usr/bin/env node
/**
 * Stop hook: the cross-session learning loop. When a substantial session ends, spawn a
 * detached headless Claude run that extracts ONE candidate lesson into quarantine
 * (memory/_candidates/). Nothing it writes is live: candidates are promoted only by
 * /review-candidates. This hook must return in <1s, so it only decides and spawns.
 *
 * Kit version (generalized): no hardcoded user paths. Memory dir comes from the session
 * cwd (~/.claude/projects/<cwd-slug>/memory, override CC_MEMORY_DIR); the prompt file
 * sits beside this hook; `claude` is resolved from PATH.
 *
 * Guards: once per session - not for the learn child itself - not for -p/headless runs that
 * set CC_LEARN_CHILD - session must have >= MIN_TOOL_CALLS assistant tool uses - max 6 runs/day
 * - CC_LEARN=off disables.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function memoryDir(cwdHint) {
  if (process.env.CC_MEMORY_DIR) return process.env.CC_MEMORY_DIR;
  const cwd = cwdHint || process.cwd();
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\/]/g, '-'), 'memory');
}

const PROMPT = path.join(__dirname, 'learn_prompt.md');
const CLAUDE = process.platform === 'win32' ? 'claude.cmd' : 'claude';
const MIN_TOOL_CALLS = 25;
const MAX_PER_DAY = 6;

function toolCallCount(transcriptPath) {
  let n = 0;
  try {
    const text = fs.readFileSync(transcriptPath, 'utf8');
    for (const line of text.split('\n')) {
      if (!line.includes('"tool_use"')) continue;
      try { const o = JSON.parse(line); if (o.type === 'assistant' && Array.isArray(o.message?.content)) n += o.message.content.filter((b) => b.type === 'tool_use').length; } catch {}
    }
  } catch {}
  return n;
}

function main() {
  if (process.env.CC_LEARN === 'off' || process.env.CC_LEARN_CHILD) return;
  let input = ''; try { input = fs.readFileSync(0, 'utf8'); } catch { return; }
  let o; try { o = JSON.parse(input); } catch { return; }
  if (o.stop_hook_active) return; // never re-enter
  const sid = o.session_id, tp = o.transcript_path;
  if (!sid || !tp || !fs.existsSync(tp)) return;

  const MEM = memoryDir(o.cwd);
  const CAND = path.join(MEM, '_candidates');
  const STATE = path.join(CAND, '.learn-state.json');
  const LOGDIR = path.join(MEM, 'harness-log');
  const LOG = path.join(LOGDIR, 'learn-runs.log');
  const log = (m) => { try { fs.mkdirSync(LOGDIR, { recursive: true }); fs.appendFileSync(LOG, `${new Date().toISOString()} ${m}\n`); } catch {} };

  fs.mkdirSync(CAND, { recursive: true });
  let st = { sessions: {}, days: {} }; try { st = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch {}
  if (st.sessions[sid]) return;
  const day = new Date().toISOString().slice(0, 10);
  if ((st.days[day] || 0) >= MAX_PER_DAY) { log(`skip ${sid}: daily cap`); return; }

  const calls = toolCallCount(tp);
  if (calls < MIN_TOOL_CALLS) { st.sessions[sid] = `skipped:${calls}`; fs.writeFileSync(STATE, JSON.stringify(st)); return; }

  st.sessions[sid] = new Date().toISOString();
  st.days[day] = (st.days[day] || 0) + 1;
  for (const k of Object.keys(st.sessions)) if (Object.keys(st.sessions).length > 300) delete st.sessions[k];
  fs.writeFileSync(STATE, JSON.stringify(st));

  const prompt = `Read ${PROMPT.replace(/\\/g, '/')} and follow it exactly. TRANSCRIPT=${tp} SESSION=${sid} DATE=${day} MEMORY_DIR=${MEM.replace(/\\/g, '/')}`;
  const childLog = path.join(LOGDIR, 'learn-child.log');
  const cmd = `${CLAUDE} -p --model sonnet --dangerously-skip-permissions "${prompt.replace(/"/g, "'")}" >> "${childLog}" 2>&1`;
  try {
    const shell = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
    const args = process.platform === 'win32' ? ['/c', cmd] : ['-c', cmd];
    const child = spawn(shell, args, {
      detached: true, stdio: 'ignore', windowsHide: true, cwd: o.cwd || os.homedir(),
      env: { ...process.env, CC_LEARN_CHILD: '1', CC_RECALL: 'off', CC_MEMORY_DIR: MEM },
    });
    child.unref();
    log(`spawned learn run for ${sid} (${calls} tool calls)`);
  } catch (e) { log(`spawn failed ${sid}: ${e.message}`); }
}
main();
