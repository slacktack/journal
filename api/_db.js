import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = '.data/db.json';
export const MIN_CODE = 6;

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

// shortcut: JSON file store for local dev only; Vercel's disk is read-only, so prod needs Redis.
async function load() {
  if (process.env.VERCEL) throw new Error('No database connected: in Vercel open Storage, add Upstash Redis, connect it to this project, then redeploy');
  try { return JSON.parse(await readFile(FILE, 'utf8')); } catch { return {}; }
}
async function save(db) {
  await mkdir('.data', { recursive: true });
  await writeFile(FILE, JSON.stringify(db));
}

export async function all(hash) {
  if (!URL_) return Object.values((await load())[hash] || {});
  const flat = (await redis('HGETALL', hash)) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
  return out;
}

export async function put(hash, id, obj) {
  if (URL_) return redis('HSET', hash, id, JSON.stringify(obj));
  const db = await load();
  (db[hash] ??= {})[id] = obj;
  await save(db);
}

export async function del(hash, id) {
  if (URL_) return redis('HDEL', hash, id);
  const db = await load();
  delete db[hash]?.[id];
  await save(db);
}

// The diary code picks the diary: same code on any device = same diary. Only its hash is stored.
// shortcut: no rate limit on code guesses; add one (e.g. Upstash ratelimit) if the site gets public traffic.
export async function handle(req, res, fn) {
  let code = '';
  try { code = decodeURIComponent(req.headers['x-journal-key'] || '').trim(); } catch {}
  if (code.length < MIN_CODE) return res.status(401).json({ error: `Diary codes are at least ${MIN_CODE} characters.` });
  const ns = 'd:' + createHash('sha256').update('little-diary:' + code).digest('hex').slice(0, 40);
  try { await fn(name => `${ns}:${name}`); } catch (e) { res.status(500).json({ error: e.message }); }
}
