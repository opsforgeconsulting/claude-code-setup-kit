#!/usr/bin/env node
'use strict';
/**
 * context_monitor.js — PostToolUse hook (standalone; Node built-ins only).
 *
 * Kit version (generalized): no hardcoded user paths. The memory directory is
 * derived from the session cwd the same way Claude Code names project folders
 * (~/.claude/projects/<cwd-slug>/memory), overridable with CC_MEMORY_DIR.
 *
 * Ported & consolidated from ECC (affaan-m/ECC: suggest-compact + ecc-metrics-bridge
 * + ecc-context-monitor), with ECC's plugin-root/lib plumbing stripped, the two
 * hooks merged into one (single Node spawn per tool call), and cost tracking
 * removed.
 *
 * On every PostToolUse it maintains a tiny per-session state file in the OS temp
 * dir and injects agent-facing warnings (via hookSpecificOutput.additionalContext)
 * when any of these cross a threshold:
 *   - strategic compact: context size has grown into a new bucket  -> "consider /compact"
 *   - context exhaustion: remaining window % is low                -> WARNING / CRITICAL
 *   - scope creep:        many distinct files modified this session
 *   - tool loop:          same tool + same params repeated          -> likely stuck
 *   - stall:              same ERROR signature recurring across Bash/PowerShell
 *                         calls (inputs may differ — catches retry-variant loops
 *                         the input-hash loop detector cannot see)
 *
 * Window-aware: detects a 1M window from the model's `[1m]` marker (e.g.
 * opus[1m]) or from observed tokens >200k; honors CLAUDE_CODE_AUTO_COMPACT_WINDOW.
 *
 * Contract: NEVER blocks. Always exits 0 and prints valid stdout (passthrough or JSON).
 * Disable entirely with CC_CONTEXT_MONITOR=off.
 *
 * Tunable via env: COMPACT_CONTEXT_THRESHOLD (0 disables compact signal),
 *   COMPACT_CONTEXT_INTERVAL, CTX_WARN_PCT, CTX_CRIT_PCT, SCOPE_FILES_WARN,
 *   CC_CONTEXT_WINDOW_TOKENS / CLAUDE_CODE_AUTO_COMPACT_WINDOW,
 *   CC_STALL_WINDOW (failure sigs kept), CC_STALL_REPEAT (critical threshold).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ---------------- paths ----------------
/** ~/.claude/projects/<cwd-slug>/memory, the folder Claude Code's auto-memory uses for this cwd. */
function memoryDir(cwdHint) {
  if (process.env.CC_MEMORY_DIR) return process.env.CC_MEMORY_DIR;
  const cwd = cwdHint || process.cwd();
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\/]/g, '-'), 'memory');
}
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

// ---------------- defaults ----------------
const STD_WINDOW = 200000;
const LARGE_WINDOW = 1000000;
const COMPACT_THRESH_STD = 160000;
const COMPACT_THRESH_LARGE = 250000;
const COMPACT_INTERVAL = 60000;
const CTX_WARN_PCT = 35;   // remaining %
const CTX_CRIT_PCT = 25;   // remaining %
const SCOPE_FILES_WARN = 20;
const LOOP_THRESHOLD = 3;
const RECENT_SIZE = 5;
const STALL_WINDOW = 6;    // rolling window of failure signatures kept
const STALL_REPEAT = 3;    // same signature this many times in window -> critical
const MAX_FILES = 200;
const TAIL_BYTES = 256 * 1024;
const LARGE_MARKER = '[1m]';

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : fallback;
}

function sanitizeSessionId(id) {
  if (typeof id !== 'string' || !id) return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

// ---------------- transcript context size ----------------
function readFileTail(filePath, tailBytes) {
  let fd;
  try { fd = fs.openSync(filePath, 'r'); } catch { return null; }
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - tailBytes);
    const length = size - start;
    if (length <= 0) return { text: '', truncated: false };
    const buf = Buffer.alloc(length);
    const read = fs.readSync(fd, buf, 0, length, start);
    return { text: buf.toString('utf8', 0, read), truncated: start > 0 };
  } catch {
    return null;
  } finally {
    try { fs.closeSync(fd); } catch { /* ignore */ }
  }
}

function usageTokens(record) {
  const u = record && record.message && record.message.usage;
  if (!u || typeof u !== 'object') return 0;
  const t =
    (Number.isFinite(u.input_tokens) ? u.input_tokens : 0) +
    (Number.isFinite(u.cache_read_input_tokens) ? u.cache_read_input_tokens : 0) +
    (Number.isFinite(u.cache_creation_input_tokens) ? u.cache_creation_input_tokens : 0);
  return t > 0 ? t : 0;
}

/** Latest {tokens, model} from the transcript tail, or null. */
function latestContext(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) return null;
  const tail = readFileTail(transcriptPath, TAIL_BYTES);
  if (!tail) return null;
  const lines = tail.text.split('\n');
  const first = tail.truncated ? 1 : 0;
  for (let i = lines.length - 1; i >= first; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const tokens = usageTokens(rec);
    if (tokens > 0) {
      const model = rec.message && typeof rec.message.model === 'string' ? rec.message.model : '';
      return { tokens, model };
    }
  }
  return null;
}

// The transcript records the RESOLVED API model id (no [1m] suffix) — the marker
// only exists in settings.json's model string, so check there too. (Otherwise a
// 1M session gets false CONTEXT CRITICAL warnings at ~190k.)
function settingsHasLargeMarker() {
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return typeof s.model === 'string' && s.model.includes(LARGE_MARKER);
  } catch { return false; }
}

function windowTokens(tokens, model) {
  const envWin = intEnv('CC_CONTEXT_WINDOW_TOKENS', intEnv('CLAUDE_CODE_AUTO_COMPACT_WINDOW', 0));
  if (envWin > 0) return envWin;
  if (typeof model === 'string' && model.includes(LARGE_MARKER)) return LARGE_WINDOW;
  if (Number.isFinite(tokens) && tokens > STD_WINDOW) return LARGE_WINDOW;
  if (settingsHasLargeMarker()) return LARGE_WINDOW;
  return STD_WINDOW;
}

function compactThreshold(win) {
  const raw = intEnv('COMPACT_CONTEXT_THRESHOLD', -1);
  if (raw === 0) return 0;            // disabled
  if (raw > 0) return raw;
  return win >= LARGE_WINDOW ? COMPACT_THRESH_LARGE : COMPACT_THRESH_STD;
}

function windowLabel(win) {
  return win >= LARGE_WINDOW ? '1M' : `${Math.round(win / 1000)}k`;
}

// ---------------- session state ----------------
function statePath(sessionId) {
  return path.join(os.tmpdir(), `cc-ctxmon-${sessionId}.json`);
}
function readState(sessionId) {
  try { return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf8')); }
  catch {
    return { files: [], recent: [], compactBucket: -1, lastWarn: null, lastSeverity: null };
  }
}
function writeState(sessionId, state) {
  const target = statePath(sessionId);
  const tmp = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
    fs.renameSync(tmp, target);
  } catch {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// ---------------- loop + scope tracking ----------------
function stableStringify(v, depth = 0) {
  if (depth > 4) return '"[depth]"';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(x => stableStringify(x, depth + 1)).join(',')}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k], depth + 1)}`).join(',')}}`;
}

function hashToolCall(name, input) {
  let key = '';
  if (name === 'Bash') key = String((input && input.command) || '').slice(0, 160);
  else if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(name)) {
    key = crypto.createHash('sha256').update(stableStringify({
      file_path: input && input.file_path,
      old_string: input && input.old_string,
      new_string: input && input.new_string,
      content: input && input.content,
      edits: input && input.edits
    })).digest('hex');
  } else if (input && input.file_path) key = String(input.file_path);
  else key = stableStringify(input || {}).slice(0, 2048);
  return crypto.createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 8);
}

function filePaths(name, input) {
  const out = [];
  if (!input || typeof input !== 'object') return out;
  if (typeof input.file_path === 'string') out.push(input.file_path);
  if (Array.isArray(input.edits)) for (const e of input.edits) if (e && typeof e.file_path === 'string') out.push(e.file_path);
  return out;
}

function detectLoop(recent) {
  if (!Array.isArray(recent) || recent.length < LOOP_THRESHOLD) return null;
  const counts = {};
  for (const e of recent) {
    const k = `${e.tool}:${e.hash}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  for (const [k, c] of Object.entries(counts)) {
    if (c >= LOOP_THRESHOLD) return { tool: k.split(':')[0], count: c };
  }
  return null;
}

// ---------------- failure-signature (stall) tracking ----------------
// Catches the loop the input-hash detector can't: retrying VARIANTS of a command
// that keep dying with the same error. Signature = normalized error lines, so
// line numbers / paths / timestamps shifting doesn't make a failure look "new".
const STALL_TOOLS = /^(Bash|PowerShell)$/;

// Strong, line-anchored failure patterns — anchoring avoids false positives from
// grep/cat output where "error" appears mid-line inside matched code.
const FAIL_LINE_RE = /^\s*(error(\b|:)|fatal:|npm err!|traceback \(most recent call last\)|[^\s]+: command not found|.* is not recognized as|error ts\d+|type error:|syntaxerror|referenceerror|typeerror:|failed to compile|build failed|assertion(error| failed)|panic:|unhandled(promise)? ?rejection|segmentation fault)/i;
// Node/OS error codes are uppercase by convention — matched case-SENSITIVELY so
// lines starting with ordinary words like "export"/"eslint" don't false-positive.
const ERRNO_RE = /\bE(NOENT|ACCES|ADDRINUSE|PERM|PIPE|CONN(RESET|REFUSED|ABORTED)?|TIMEDOUT|MFILE|NOTDIR|ISDIR|EXIST|BUSY|NOSPC|AI_AGAIN)\b/;

function collectStrings(v, depth, out) {
  if (out.len >= 20000 || depth > 3 || v == null) return;
  if (typeof v === 'string') {
    const take = v.slice(0, 20000 - out.len);
    out.parts.push(take);
    out.len += take.length;
    return;
  }
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, depth + 1, out); return; }
  if (typeof v === 'object') { for (const k of Object.keys(v)) collectStrings(v[k], depth + 1, out); }
}

function isExplicitFailure(resp) {
  if (!resp || typeof resp !== 'object' || Array.isArray(resp)) return null;
  if (resp.success === false || resp.is_error === true || resp.isError === true) return true;
  for (const k of ['exit_code', 'exitCode', 'code', 'returnCode', 'return_code']) {
    if (Number.isInteger(resp[k]) && resp[k] !== 0) return true;
  }
  return null; // unknown — fall back to pattern matching
}

function scanErrLines(text) {
  const errLines = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    // damp code-shaped lines (interface fields / statements ending ; { ,) —
    // they're grep/cat hits, not runtime errors, which end in prose or codes
    if (/[;{,]$/.test(t)) continue;
    // ERRNO only near line start — grep hits ("src/x.ts:42: ...ENOENT...") have a
    // path prefix that pushes the code past char 16, real errno lines don't.
    if (FAIL_LINE_RE.test(t) || ERRNO_RE.test(t.slice(0, 16))) {
      errLines.push(t.slice(0, 300));
      if (errLines.length >= 3) break;
    }
  }
  return errLines;
}

/** 8-hex signature of the failure in a tool response, or null if it didn't fail. */
function failureSignature(resp) {
  if (resp == null) return null;
  const explicit = isExplicitFailure(resp);
  const stderrText = (resp && typeof resp === 'object' && typeof resp.stderr === 'string' && resp.stderr.trim())
    ? resp.stderr.slice(0, 20000) : '';
  const out = { parts: [], len: 0 };
  collectStrings(resp, 0, out);
  const fullText = out.parts.join('\n');

  // Explicit failure with NO output at all: sign a constant so identical silent
  // failures still group.
  if (!fullText.trim() && !stderrText.trim()) {
    return explicit === true
      ? crypto.createHash('sha256').update('explicit-silent-failure').digest('hex').slice(0, 8)
      : null;
  }

  // stderr first (a successful grep can't pollute stderr), but fall back to full
  // text when stderr has no recognizable error line — a failing Next build puts
  // "Type error:" on stdout while stderr carries only node warnings.
  let errLines = stderrText ? scanErrLines(stderrText) : [];
  if (errLines.length === 0) errLines = scanErrLines(fullText);

  if (errLines.length === 0 && explicit !== true) return null;
  // Explicit failure but no recognizable error line: sign the response tail so
  // identical silent failures still group together.
  const basis = errLines.length ? errLines.join('|') : (fullText || stderrText).slice(-500);

  const norm = basis.toLowerCase()
    // preserve TS/tool error codes through digit-stripping (ts2345 -> tscdef)
    .replace(/\b(ts|e)(\d{3,5})\b/g, (m, p, d) => p + d.replace(/\d/g, x => 'abcdefghij'[+x]))
    .replace(/(["'`]).*?\1/g, '$1$1')
    .replace(/0x[0-9a-f]+/g, '#')
    .replace(/[a-z]:[\\/][^\s:'"]+/g, 'P')
    .replace(/\/[^\s:'"]+/g, 'P')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, 600);
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 8);
}

// ---------------- main ----------------
function run(raw) {
  // master kill switch
  const off = String(process.env.CC_CONTEXT_MONITOR || '').trim().toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(off)) return '';

  let input;
  try { input = raw.trim() ? JSON.parse(raw) : {}; } catch { return ''; }

  const sessionId = sanitizeSessionId(input.session_id) ||
    sanitizeSessionId(process.env.CLAUDE_SESSION_ID) || 'default';
  const toolName = String(input.tool_name || '');
  const toolInput = input.tool_input || {};
  const transcriptPath = typeof input.transcript_path === 'string' ? input.transcript_path : '';

  const state = readState(sessionId);

  // --- update scope + loop tracking ---
  if (/^(Write|Edit|MultiEdit)$/i.test(toolName)) {
    const set = new Set(state.files || []);
    for (const p of filePaths(toolName, toolInput)) {
      if (set.size < MAX_FILES) set.add(p);
    }
    state.files = [...set];
  }
  const recent = state.recent || [];
  recent.push({ tool: toolName, hash: hashToolCall(toolName, toolInput) });
  while (recent.length > RECENT_SIZE) recent.shift();
  state.recent = recent;

  // --- failure-signature (stall) tracking ---
  let stall = null;
  if (STALL_TOOLS.test(toolName)) {
    const sig = failureSignature(input.tool_response);
    if (sig) {
      const fails = state.fails || [];
      const consecutive = fails.length > 0 && fails[fails.length - 1] === sig;
      fails.push(sig);
      while (fails.length > intEnv('CC_STALL_WINDOW', STALL_WINDOW)) fails.shift();
      state.fails = fails;
      const count = fails.filter(s => s === sig).length;
      if (count >= intEnv('CC_STALL_REPEAT', STALL_REPEAT)) stall = { count, sev: 3 };
      else if (consecutive) stall = { count, sev: 2 };
    }
  }

  // --- build signals ---
  const lines = [];          // ordered, most important first
  let compactLine = null;

  // context size signals (compact + exhaustion)
  const ctx = latestContext(transcriptPath);
  if (ctx) {
    const win = windowTokens(ctx.tokens, ctx.model);
    const remainingPct = Math.round(((win - ctx.tokens) / win) * 100);
    const usedK = `${Math.round(ctx.tokens / 1000)}k`;

    // exhaustion (remaining %)
    const critPct = intEnv('CTX_CRIT_PCT', CTX_CRIT_PCT);
    const warnPct = intEnv('CTX_WARN_PCT', CTX_WARN_PCT);
    if (remainingPct <= critPct) {
      lines.push({ sev: 3, text: `[CONTEXT CRITICAL] ~${remainingPct}% of the ${windowLabel(win)} window remains (~${usedK} used). Wrap up or tell the user context is low and ask how to proceed. Do not autonomously write handoff files unless asked.` });
    } else if (remainingPct <= warnPct) {
      lines.push({ sev: 2, text: `[CONTEXT WARNING] ~${remainingPct}% of the ${windowLabel(win)} window remains (~${usedK} used). Avoid starting large new work; consider /compact at a logical boundary.` });
    }

    // strategic compact (bucketed, only on rising bucket)
    const thresh = compactThreshold(win);
    if (thresh > 0 && ctx.tokens >= thresh) {
      const interval = intEnv('COMPACT_CONTEXT_INTERVAL', COMPACT_INTERVAL);
      const bucket = Math.floor((ctx.tokens - thresh) / Math.max(1, interval));
      if (bucket > (state.compactBucket ?? -1)) {
        state.compactBucket = bucket;
        compactLine = `[StrategicCompact] Context ~${usedK} (${100 - remainingPct}% of ${windowLabel(win)}) — consider /compact at the next logical boundary.`;
      }
    }
  }

  // scope creep
  const scopeWarn = intEnv('SCOPE_FILES_WARN', SCOPE_FILES_WARN);
  if ((state.files || []).length > scopeWarn) {
    lines.push({ sev: 2, text: `[SCOPE WARNING] ${state.files.length} distinct files modified this session — check the changes aren't getting too scattered.` });
  }

  // tool loop
  const loop = detectLoop(state.recent);
  if (loop) {
    lines.push({ sev: 2, text: `[LOOP WARNING] '${loop.tool}' called ${loop.count}x with identical params in the last ${RECENT_SIZE} calls — likely a stuck loop. Change approach.` });
  }

  // stall (same error signature recurring)
  if (stall && stall.sev >= 3) {
    lines.push({ sev: 3, text: `[STALL CRITICAL] The same error signature has now appeared ${stall.count}x — this is a failure loop, not progress. Do NOT retry another variant. Change altitude: state the invariant that keeps breaking, question the approach or its underlying assumption, or surface the blocker to the user.` });
  } else if (stall) {
    lines.push({ sev: 2, text: `[STALL WARNING] Same error signature 2x in a row. Stop retrying variants — re-orient first: state the broken invariant in one sentence, read the failing code, then change the fix's approach if the invariant doesn't hold.` });
  }

  // --- dedupe warnings (compact handled by its own bucket gate) ---
  lines.sort((a, b) => b.sev - a.sev);
  const top = lines.slice(0, 2);
  const warnText = top.map(l => l.text).join('\n');
  const topSeverity = top.length ? top[0].sev : 0;
  const escalatedToCritical = topSeverity >= 3 && state.lastSeverity !== 3;
  const warnChanged = warnText && (warnText !== state.lastWarn || escalatedToCritical);

  if (warnText && warnChanged) {
    state.lastWarn = warnText;
    state.lastSeverity = topSeverity;
  } else if (!warnText && state.lastWarn) {
    // condition resolved — clear so it can re-fire later
    state.lastWarn = null;
    state.lastSeverity = null;
  }

  writeState(sessionId, state);

  const emit = [];
  if (compactLine) emit.push(compactLine);
  if (warnText && warnChanged) emit.push(warnText);

  if (emit.length === 0) return '';

  // telemetry: one line per injected warning tag -> monthly harness log
  try {
    const LOG_DIR = path.join(memoryDir(input.cwd), 'harness-log');
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, new Date().toISOString().slice(0, 7) + '.jsonl');
    const rows = [];
    for (const line of emit) {
      const m = line.match(/^\[([^\]]+)\]/);
      rows.push(JSON.stringify({ ts: new Date().toISOString(), sid: sessionId.slice(0, 8), src: 'monitor', warn: m ? m[1] : 'unknown' }));
    }
    fs.appendFileSync(logFile, rows.join('\n') + '\n', 'utf8');
  } catch { /* telemetry must never break the hook */ }

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: emit.join('\n')
    }
  });
}

if (require.main === module) {
  let data = '';
  const MAX = 1024 * 1024;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { if (data.length < MAX) data += c.slice(0, MAX - data.length); });
  process.stdin.on('end', () => {
    let out = '';
    try { out = run(data); } catch { out = ''; }
    process.stdout.write(out || '');
    process.exit(0);
  });
}

module.exports = { run, hashToolCall, detectLoop, latestContext, windowTokens, compactThreshold, failureSignature, memoryDir };
