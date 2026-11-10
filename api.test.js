import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'VERCEL']) delete process.env[k];
process.chdir(mkdtempSync(join(tmpdir(), 'diary-')));
const entries = (await import(new URL('./api/entries.js', import.meta.url))).default;
const settings = (await import(new URL('./api/settings.js', import.meta.url))).default;
const stickers = (await import(new URL('./api/stickers.js', import.meta.url))).default;

const call = (h, { method = 'GET', key = 'kitty♡', body, query = {} } = {}) => new Promise(resolve => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o }); } };
  h({ method, body, query, headers: { 'x-journal-key': encodeURIComponent(key) } }, res);
});

test('short codes are rejected', async () => {
  assert.equal((await call(entries, { key: 'abc' })).code, 401);
});

test('each code is its own diary, same code shares it', async () => {
  const e = { id: '2026-01-01', title: 'mine', stickers: [] };
  await call(entries, { method: 'PUT', body: e, key: 'bestie-code' });
  assert.deepEqual((await call(entries, { key: 'bestie-code' })).body.entries, [e]);
  assert.deepEqual((await call(entries, { key: 'someone-else' })).body.entries, []);
});

test('entries round-trip and delete', async () => {
  const e = { id: '2026-11-10', title: 'hi', body: 'yay', stickers: [{ s: 'e:🎀', x: 50, y: 20, size: 14, r: 0 }] };
  assert.equal((await call(entries, { method: 'PUT', body: e })).code, 200);
  assert.deepEqual((await call(entries)).body.entries, [e]);
  assert.equal((await call(entries, { method: 'PUT', body: { ...e, id: 'x' } })).code, 400);
  assert.equal((await call(entries, { method: 'PUT', body: { ...e, id: 'moodboard' } })).code, 200);
  await call(entries, { method: 'DELETE', query: { id: 'moodboard' } });
  await call(entries, { method: 'DELETE', query: { id: e.id } });
  assert.deepEqual((await call(entries)).body.entries, []);
});

test('stickers validate and save', async () => {
  assert.equal((await call(stickers, { method: 'POST', body: { src: 'javascript:alert(1)' } })).code, 400);
  const src = 'data:image/png;base64,iVBORw0KGgo=';
  const { body } = await call(stickers, { method: 'POST', body: { src } });
  assert.deepEqual((await call(stickers)).body.stickers, [{ id: body.id, src, pack: 'my stickers' }]);
});

test('settings save and load', async () => {
  assert.deepEqual((await call(settings)).body, {});
  await call(settings, { method: 'PUT', body: { theme: 'cloud' } });
  assert.deepEqual((await call(settings)).body, { theme: 'cloud' });
  assert.equal((await call(settings, { method: 'PUT', body: 'x' })).code, 400);
});
