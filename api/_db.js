import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = '.data/db.json';

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

// shortcut: JSON file store for local dev only; Vercel's disk is read-only, so prod needs Redis.
async function load() {
  if (process.env.VERCEL) throw new Error('No database connected: add Upstash Redis in Vercel → Storage');
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

const sha = s => createHash('sha256').update(s).digest();

export async function handle(req, res, fn) {
  const pw = process.env.JOURNAL_PASSWORD;
  if (!pw && process.env.VERCEL) return res.status(503).json({ error: 'Set JOURNAL_PASSWORD in Vercel env vars' });
  if (pw) {
    let given = '';
    try { given = decodeURIComponent(req.headers['x-journal-key'] || ''); } catch {}
    if (!timingSafeEqual(sha(pw), sha(given))) return res.status(401).json({ error: 'wrong password' });
  }
  try { await fn(); } catch (e) { res.status(500).json({ error: e.message }); }
}
