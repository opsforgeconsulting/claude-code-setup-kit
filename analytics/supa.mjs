// Read-only Supabase helpers for the product-analytics agent and ad-hoc usage reports.
// Usage (from a script in the scratchpad):
//   import { connect } from "file:///C:/Users/<you>/.claude/analytics/supa.mjs";  // Windows: file:/// URL required
//   const db = connect("C:/path/to/app/.env.local");
//   const users = await db.authUsers();
//   const rows = await db.all("projects?select=id,user_id,type,updated_at");
//   const tables = await db.tables();
// Never print the key. Never return raw rows; aggregate and mask.
import fs from "node:fs";

export function loadEnv(path) {
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
  );
}

export function connect(envPath, { urlVar = "NEXT_PUBLIC_SUPABASE_URL", keyVar = "SUPABASE_SERVICE_ROLE_KEY" } = {}) {
  const env = loadEnv(envPath);
  const url = env[urlVar], key = env[keyVar];
  if (!url || !key) throw new Error(`missing ${urlVar} or ${keyVar} in ${envPath}`);
  const H = { apikey: key, Authorization: `Bearer ${key}` };

  // Pages past the 1000-row PostgREST cap with offset/limit (works for GET; POST RPCs ignore Range).
  async function all(path, { max = 200000 } = {}) {
    const out = [];
    for (let from = 0; from < max; from += 1000) {
      const sep = path.includes("?") ? "&" : "?";
      const r = await fetch(`${url}/rest/v1/${path}${sep}offset=${from}&limit=1000`, { headers: H });
      const j = await r.json();
      if (!Array.isArray(j)) throw new Error(`${path}: ${JSON.stringify(j).slice(0, 300)}`);
      out.push(...j);
      if (j.length < 1000) break;
    }
    return out;
  }

  async function count(table, filter = "") {
    const r = await fetch(`${url}/rest/v1/${table}?select=*${filter ? "&" + filter : ""}`, { method: "HEAD", headers: { ...H, Prefer: "count=exact" } });
    return Number((r.headers.get("content-range") || "*/0").split("/")[1]);
  }

  async function authUsers() {
    const users = [];
    for (let p = 1; ; p++) {
      const j = await (await fetch(`${url}/auth/v1/admin/users?page=${p}&per_page=1000`, { headers: H })).json();
      users.push(...(j.users || []));
      if (!j.users || j.users.length < 1000) break;
    }
    return users;
  }

  async function tables() {
    const j = await (await fetch(`${url}/rest/v1/`, { headers: H })).json();
    return Object.fromEntries(Object.entries(j.definitions || {}).map(([n, d]) => [n, Object.keys(d.properties || {})]));
  }

  return { url, all, count, authUsers, tables };
}

export const mask = (email = "") => email.replace(/^(.{1,3}).*@/, "$1***@");
export const day = (t) => new Date(t).toISOString().slice(0, 10);
