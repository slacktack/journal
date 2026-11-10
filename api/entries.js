import { all, put, del, handle } from './_db.js';

const DATE = /^(\d{4}-\d{2}-\d{2}|moodboard)$/;

export default (req, res) => handle(req, res, async () => {
  if (req.method === 'GET') return res.json({ entries: await all('entries') });
  if (req.method === 'PUT') {
    const e = req.body;
    if (!e || !DATE.test(e.id) || !Array.isArray(e.stickers) || JSON.stringify(e).length > 200_000)
      return res.status(400).json({ error: 'bad entry' });
    await put('entries', e.id, e);
    return res.json({ ok: true });
  }
  if (req.method === 'DELETE') {
    if (!DATE.test(req.query.id)) return res.status(400).json({ error: 'bad id' });
    await del('entries', req.query.id);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
});
