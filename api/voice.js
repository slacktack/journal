import { randomUUID } from 'node:crypto';
import { get, put, del, handle } from './_db.js';

// ~2 minutes of compressed speech; Upstash's free tier caps a request at 1MB.
const AUDIO = /^data:audio\/(webm|mp4|ogg|mpeg|aac|x-m4a)(;[a-z0-9=.,+-]+)*;base64,[A-Za-z0-9+/=]+$/i;
const MAX = 900_000;

export default (req, res) => handle(req, res, async key => {
  if (req.method === 'GET') {
    const v = req.query.id && (await get(key('voice'), req.query.id));
    return v ? res.json(v) : res.status(404).json({ error: 'voice note not found' });
  }
  if (req.method === 'POST') {
    const src = req.body?.src;
    if (typeof src !== 'string' || src.length > MAX || !AUDIO.test(src)) return res.status(400).json({ error: 'voice note must be a short audio clip' });
    const id = randomUUID();
    await put(key('voice'), id, { id, src });
    return res.json({ id });
  }
  if (req.method === 'DELETE') {
    if (!req.query.id) return res.status(400).json({ error: 'bad id' });
    await del(key('voice'), req.query.id);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
});
