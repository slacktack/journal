import { randomUUID } from 'node:crypto';
import { all, put, del, handle } from './_db.js';

const IMG = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export default (req, res) => handle(req, res, async () => {
  if (req.method === 'GET') return res.json({ stickers: await all('stickers') });
  if (req.method === 'POST') {
    const src = req.body?.src;
    if (typeof src !== 'string' || src.length > 500_000 || !IMG.test(src))
      return res.status(400).json({ error: 'sticker must be a small image' });
    const pack = String(req.body.pack || 'my stickers').slice(0, 40);
    const id = randomUUID();
    await put('stickers', id, { id, src, pack });
    return res.json({ id });
  }
  if (req.method === 'DELETE') {
    if (!req.query.id) return res.status(400).json({ error: 'bad id' });
    await del('stickers', req.query.id);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
});
