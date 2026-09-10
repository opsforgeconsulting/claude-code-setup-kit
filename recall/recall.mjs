#!/usr/bin/env node
/**
 * recall - full-text (+ optional semantic) recall over everything the assistant has written or read.
 *
 * Kit version (generalized from a working setup): no hardcoded user paths.
 *   memory dir : CC_MEMORY_DIR, else ~/.claude/projects/<cwd-slug>/memory (the auto-memory folder
 *                Claude Code uses for the directory you launch it from)
 *   vaults     : CC_RECALL_VAULTS - optional list of extra markdown roots (Obsidian vaults, docs),
 *                separated by ';' on Windows or ':' elsewhere. Default: none.
 *   embeddings : VOYAGE_API_KEY (voyage-3.5). Optional - without it recall is plain FTS5.
 *
 * Index (SQLite FTS5 via node:sqlite, zero deps; Node 22.5+) over:
 *   memory/*.md, memory/journal, memory/fleet-digests, memory/build-queue.md,
 *   memory/session-logs/*.jsonl (user + assistant text turns only),
 *   any vault roots (*.md, minus _Templates and .obsidian).
 * Every hit carries its source type and date. Hits are CLAIMS as of that date, not facts:
 * anything about a file, flag, or URL must be verified against the current code before use.
 *
 *   node recall.mjs index [--force] [--quiet] [--embed]     incremental (mtime+size, then hash)
 *   node recall.mjs "query words" [-n 8] [--type memory,journal,digest,vault,session] [--json] [--since 2026-08-01]
 *   node recall.mjs stats
 *
 * Ranking = BM25 x source weight x recency boost (half-life ~90 days). Exact phrase: "quote it".
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(ROOT, 'recall.db');
const MEM = process.env.CC_MEMORY_DIR
  || path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[:\\/]/g, '-'), 'memory');
const VAULTS = (process.env.CC_RECALL_VAULTS || '').split(path.delimiter).map((s) => s.trim()).filter(Boolean);
const SOURCES = [
  { type: 'memory',  weight: 1.0,  roots: [MEM], depth: 1, ext: '.md' },
  { type: 'journal', weight: 0.95, roots: [path.join(MEM, 'journal')], depth: 1, ext: '.md' },
  { type: 'digest',  weight: 0.7,  roots: [path.join(MEM, 'fleet-digests')], depth: 1, ext: '.md' },
  { type: 'vault',   weight: 0.6,  roots: VAULTS, depth: 12, ext: '.md' },
  { type: 'session', weight: 0.5,  roots: [path.join(MEM, 'session-logs')], depth: 1, ext: '.jsonl' },
];
const EXCLUDE = [/[\\/]\.obsidian[\\/]/, /[\\/]_Templates[\\/]/, /[\\/]node_modules[\\/]/, /[\\/]_Attachments[\\/]/];
const CHUNK = 900;
const HALF_LIFE_DAYS = 90;

// ---------- db ----------
function openDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, source TEXT, mtime REAL, size INTEGER, hash TEXT, chunks INTEGER, indexed_at TEXT);
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(text, title, path UNINDEXED, source UNINDEXED, date UNINDEXED, tokenize='porter unicode61');
  `);
  return db;
}

// ---------- walking ----------
function* walk(dir, depth, ext) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (EXCLUDE.some((re) => re.test(p + (e.isDirectory() ? path.sep : '')))) continue;
    if (e.isDirectory()) { if (depth > 0) yield* walk(p, depth - 1, ext); }
    else if (e.name.endsWith(ext)) yield p;
  }
}

// ---------- extraction ----------
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const isoDay = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : null);

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) { const k = line.match(/^\s*([A-Za-z_]+):\s*(.+)$/); if (k) out[k[1].toLowerCase()] = k[2].trim().replace(/^["']|["']$/g, ''); }
  return out;
}
function dateFor(file, text, fm) {
  for (const k of ['date', 'modified', 'created']) if (fm[k]) { const d = new Date(fm[k]); if (!isNaN(d)) return isoDay(d); }
  const inName = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/) || path.basename(file).match(/(\d{4}-\d{2})/);
  if (inName) return inName[1].length === 7 ? inName[1] + '-01' : inName[1];
  const inText = text.slice(0, 4000).match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (inText) return inText[1];
  return isoDay(fs.statSync(file).mtime);
}
function titleFor(file, text, fm) {
  if (fm.name) return fm.name + (fm.description ? ' - ' + fm.description.slice(0, 120) : '');
  const h = text.match(/^#\s+(.+)$/m);
  return (h ? h[1] : path.basename(file, path.extname(file))).slice(0, 160);
}
function chunkMarkdown(text) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const paras = body.split(/\r?\n(?=#{1,6}\s)|\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  const out = []; let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > CHUNK && cur) { out.push(cur); cur = p; } else cur = cur ? cur + '\n\n' + p : p;
    while (cur.length > CHUNK * 2) { out.push(cur.slice(0, CHUNK * 2)); cur = cur.slice(CHUNK * 2); }
  }
  if (cur) out.push(cur);
  return out;
}
function textOfContent(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
  return '';
}
function chunkSession(text) {
  // user + assistant text turns; skip tool traffic, system, attachments, command echoes
  const turns = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'user' && o.type !== 'assistant') continue;
    if (o.isSidechain) continue;
    const t = textOfContent(o.message?.content).trim();
    if (t.length < 20) continue;
    if (/^<(command-name|local-command|bash-input|system-reminder)/.test(t)) continue;
    turns.push({ role: o.type, ts: o.timestamp, text: t.slice(0, 4000) });
  }
  const out = []; let cur = ''; let curDate = null;
  for (const t of turns) {
    const piece = `[${t.role}${t.ts ? ' ' + t.ts.slice(0, 10) : ''}] ${t.text}`;
    if ((cur + '\n' + piece).length > CHUNK * 1.5 && cur) { out.push({ text: cur, date: curDate }); cur = piece; curDate = t.ts?.slice(0, 10) || curDate; }
    else { cur = cur ? cur + '\n' + piece : piece; curDate = curDate || t.ts?.slice(0, 10) || null; }
  }
  if (cur) out.push({ text: cur, date: curDate });
  return out;
}

// ---------- index ----------
function index({ force = false, quiet = false } = {}) {
  const db = openDb();
  const getFile = db.prepare('SELECT mtime, size, hash FROM files WHERE path = ?');
  const delChunks = db.prepare('DELETE FROM chunks WHERE path = ?');
  const insChunk = db.prepare('INSERT INTO chunks (text, title, path, source, date) VALUES (?, ?, ?, ?, ?)');
  const upFile = db.prepare('INSERT OR REPLACE INTO files (path, source, mtime, size, hash, chunks, indexed_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const seen = new Set();
  let scanned = 0, updated = 0, chunksAdded = 0;
  const t0 = Date.now();
  for (const src of SOURCES) {
    for (const root of src.roots) {
      for (const file of walk(root, src.depth, src.ext)) {
        // memory root is depth 1 but its subfolders are their own sources
        if (src.type === 'memory' && path.dirname(file) !== path.normalize(MEM)) continue;
        seen.add(file); scanned++;
        const st = fs.statSync(file);
        const prev = getFile.get(file);
        if (!force && prev && prev.mtime === st.mtimeMs && prev.size === st.size) continue;
        const text = fs.readFileSync(file, 'utf8');
        const hash = sha(text);
        if (!force && prev && prev.hash === hash) { upFile.run(file, src.type, st.mtimeMs, st.size, hash, prev.chunks ?? 0, new Date().toISOString()); continue; }
        let rows;
        if (src.ext === '.jsonl') {
          const date = dateFor(file, '', {});
          rows = chunkSession(text).map((c) => ({ text: c.text, title: 'session ' + path.basename(file, '.jsonl'), date: c.date || date }));
        } else {
          const fm = frontmatter(text);
          const date = dateFor(file, text, fm), title = titleFor(file, text, fm);
          rows = chunkMarkdown(text).map((c) => ({ text: c, title, date }));
        }
        db.exec('BEGIN');
        delChunks.run(file);
        for (const r of rows) insChunk.run(r.text, r.title, file, src.type, r.date);
        upFile.run(file, src.type, st.mtimeMs, st.size, hash, rows.length, new Date().toISOString());
        db.exec('COMMIT');
        updated++; chunksAdded += rows.length;
      }
    }
  }
  // drop files that vanished
  let removed = 0;
  for (const { path: p } of db.prepare('SELECT path FROM files').all()) {
    if (!seen.has(p)) { db.exec('BEGIN'); delChunks.run(p); db.prepare('DELETE FROM files WHERE path = ?').run(p); db.exec('COMMIT'); removed++; }
  }
  if (!quiet) console.log(`indexed: ${scanned} files scanned, ${updated} (re)indexed, ${chunksAdded} chunks added, ${removed} removed, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  db.close();
}

// ---------- embeddings (Voyage voyage-3.5, 1024-dim; optional) ----------
const VOYAGE_MODEL = 'voyage-3.5';
const DIM = 1024;
function voyageKey() { return process.env.VOYAGE_API_KEY || null; }
async function embedTexts(texts, inputType) {
  const key = voyageKey(); if (!key) throw new Error('no VOYAGE_API_KEY');
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType, output_dimension: DIM }),
      signal: AbortSignal.timeout(60000),
    });
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 2000 * (attempt + 1))); continue; }
    if (!r.ok) throw new Error(`voyage ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.data.sort((a, b) => a.index - b.index).map((d) => Float32Array.from(d.embedding));
  }
  throw new Error('voyage: rate limited after 5 attempts');
}
const toBlob = (f32) => Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
const fromBlob = (buf) => new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
function cosine(a, b) { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1); }

async function embed({ quiet = false } = {}) {
  const db = openDb();
  db.exec('CREATE TABLE IF NOT EXISTS vecs (rowid INTEGER PRIMARY KEY, vec BLOB NOT NULL)');
  // drop vectors whose chunk no longer exists (chunks are deleted+reinserted on reindex)
  db.exec('DELETE FROM vecs WHERE rowid NOT IN (SELECT rowid FROM chunks)');
  const todo = db.prepare('SELECT c.rowid, c.title, c.text FROM chunks c LEFT JOIN vecs v ON v.rowid = c.rowid WHERE v.rowid IS NULL').all();
  if (!todo.length) { if (!quiet) console.log('embed: up to date'); db.close(); return; }
  const ins = db.prepare('INSERT OR REPLACE INTO vecs (rowid, vec) VALUES (?, ?)');
  const t0 = Date.now(); let done = 0;
  for (let i = 0; i < todo.length; i += 64) {
    const batch = todo.slice(i, i + 64);
    const vecs = await embedTexts(batch.map((r) => `${r.title}\n${r.text}`.slice(0, 6000)), 'document');
    db.exec('BEGIN'); batch.forEach((r, k) => ins.run(r.rowid, toBlob(vecs[k]))); db.exec('COMMIT');
    done += batch.length;
    if (!quiet && (done % 640 === 0 || done === todo.length)) console.log(`embed: ${done}/${todo.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  db.close();
}

// ---------- query ----------
function ftsQuery(q, mode) {
  const phrases = [...q.matchAll(/"([^"]+)"/g)].map((m) => `"${m[1].replace(/"/g, '')}"`);
  const rest = q.replace(/"[^"]+"/g, ' ');
  const words = rest.toLowerCase().match(/[a-z0-9][a-z0-9_\-./]*[a-z0-9]|[a-z0-9]/g) || [];
  const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'it', 'we', 'i', 'you', 'this', 'that', 'with', 'what', 'how', 'do', 'did', 'does', 'can', 'my', 'our', 'me', 'be', 'was', 'are', 'at', 'as', 'by', 'from', 'so', 'if', 'then', 'ok', 'okay', 'please']);
  const terms = words.filter((w) => w.length > 1 && !STOP.has(w)).map((w) => `"${w}"`);
  const parts = [...phrases, ...terms];
  if (!parts.length) return null;
  return mode === 'and' ? parts.join(' AND ') : parts.join(' OR ');
}
async function search(q, { n = 8, types = null, since = null, json = false, noVec = false } = {}) {
  const db = openDb();
  const weight = Object.fromEntries(SOURCES.map((s) => [s.type, s.weight]));
  const filt = (sqlIn, args) => { let sql = sqlIn; if (types) { sql += ` AND source IN (${types.map(() => '?').join(',')})`; args.push(...types); } if (since) { sql += ' AND date >= ?'; args.push(since); } return sql; };
  const run = (mode) => {
    const fq = ftsQuery(q, mode); if (!fq) return [];
    const args = [fq];
    const sql = filt(`SELECT rowid, path, source, date, title, bm25(chunks, 10.0, 3.0) AS score, snippet(chunks, 0, '[', ']', ' ... ', 28) AS snip FROM chunks WHERE chunks MATCH ?`, args) + ' ORDER BY score LIMIT 60';
    try { return db.prepare(sql).all(...args); } catch { return []; }
  };
  let rows = run('and');
  if (rows.length < n) { const more = run('or'); const have = new Set(rows.map((r) => r.rowid)); for (const r of more) if (!have.has(r.rowid)) rows.push(r); }
  const now = Date.now();
  const recencyOf = (date) => { const age = date ? (now - new Date(date).getTime()) / 864e5 : 365; return 1 + 0.6 * Math.exp(-Math.max(age, 0) / HALF_LIFE_DAYS); };
  // lexical rank, normalised to 0..1 within this result set
  const maxLex = Math.max(...rows.map((r) => -r.score), 1e-9);
  for (const r of rows) r.lex = -r.score / maxLex;

  // semantic stage: embed the query once, score the FTS candidates AND scan the whole vector
  // table for near neighbours the lexical pass missed (synonyms, paraphrase, different words)
  let vecOn = false;
  if (!noVec && voyageKey()) {
    try {
      const hasVecs = db.prepare("SELECT name FROM sqlite_master WHERE name='vecs'").get() && db.prepare('SELECT COUNT(*) c FROM vecs').get().c > 0;
      if (hasVecs) {
        const [qv] = await embedTexts([q], 'query');
        const have = new Map(rows.map((r) => [r.rowid, r]));
        const args = [];
        const scan = db.prepare(filt('SELECT c.rowid, c.path, c.source, c.date, c.title, substr(c.text, 1, 260) AS snip, v.vec FROM chunks c JOIN vecs v ON v.rowid = c.rowid WHERE 1=1', args)).all(...args);
        const extra = [];
        for (const r of scan) {
          const sim = cosine(qv, fromBlob(r.vec));
          const hit = have.get(r.rowid);
          if (hit) hit.sem = sim;
          else if (sim > 0.45) extra.push({ ...r, vec: undefined, sem: sim, lex: 0, snip: r.snip.replace(/\s+/g, ' ') + ' ...' });
        }
        extra.sort((a, b) => b.sem - a.sem);
        rows.push(...extra.slice(0, 30));
        vecOn = true;
      }
    } catch (e) { if (!json) console.error(`[semantic stage skipped: ${e.message}]`); }
  }
  for (const r of rows) {
    const sem = r.sem ?? 0;
    const blended = vecOn ? 0.45 * r.lex + 0.55 * Math.max(0, (sem - 0.3) / 0.5) : r.lex;
    r.rank = blended * (weight[r.source] ?? 0.5) * recencyOf(r.date);
  }
  rows.sort((a, b) => b.rank - a.rank);
  // one hit per file unless the file dominates
  const perPath = new Map(); const out = [];
  for (const r of rows) { const c = perPath.get(r.path) || 0; if (c >= 2) continue; perPath.set(r.path, c + 1); out.push(r); if (out.length >= n) break; }
  db.close();
  const clean = out.map((r) => ({ date: r.date, source: r.source, title: r.title, path: r.path, snippet: r.snip.replace(/\s+/g, ' ').trim(), rank: +r.rank.toFixed(3), lex: +(r.lex ?? 0).toFixed(2), sem: +(r.sem ?? 0).toFixed(2) }));
  if (json) return clean;
  if (!clean.length) return console.log('no hits');
  for (const [i, r] of clean.entries()) console.log(`${String(i + 1).padStart(2)}. [${r.source} ${r.date ?? '????-??-??'}] ${r.title}  (lex ${r.lex} - sem ${r.sem})\n    ${r.snippet}\n    ${r.path}`);
  return clean;
}
function stats() {
  const db = openDb();
  console.log('memory dir', MEM, '| vault roots', VAULTS.length);
  console.log(db.prepare('SELECT source, COUNT(*) files, SUM(chunks) chunks FROM files GROUP BY source').all());
  const vecs = db.prepare("SELECT name FROM sqlite_master WHERE name='vecs'").get() ? db.prepare('SELECT COUNT(*) c FROM vecs').get().c : 0;
  console.log('total chunks', db.prepare('SELECT COUNT(*) c FROM chunks').get().c, '| embedded', vecs, '| db', (fs.statSync(DB_PATH).size / 1e6).toFixed(1) + ' MB');
  db.close();
}

// ---------- cli ----------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); if (i === -1) return null; const v = argv[i + 1]; argv.splice(i, 2); return v ?? true; };
const has = (name) => { const i = argv.indexOf(name); if (i === -1) return false; argv.splice(i, 1); return true; };
const json = has('--json'), force = has('--force'), quiet = has('--quiet'), noVec = has('--no-vec');
const n = Number(flag('-n') ?? 8), types = (flag('--type') || '').split(',').filter(Boolean), since = flag('--since');
const cmd = argv[0];
if (cmd === 'index') { index({ force, quiet }); if (has('--embed')) await embed({ quiet }); }
else if (cmd === 'embed') await embed({ quiet });
else if (cmd === 'stats') stats();
else if (cmd) {
  const res = await search(argv.join(' '), { n, types: types.length ? types : null, since, json, noVec });
  if (json) console.log(JSON.stringify(res));
} else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*|^ \* ?/gm, ''));
