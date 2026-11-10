import { all, put, del, handle } from './_db.js';

const DATE = /^(\d{4}-\d{2}-\d{2}|moodboard|garden)$/;

export default (req, res) => handle(req, res, async key => {
  if (req.method === 'GET') return res.json({ entries: await all(key('entries')) });
  if (req.method === 'PUT') {
    const e = req.body;
    if (!e || !DATE.test(e.id) || !Array.isArray(e.stickers) || JSON.stringify(e).length > 600_000)
      return res.status(400).json({ error: 'bad entry' });
    await put(key('entries'), e.id, e);
    return res.json({ ok: true });
  }
  if (req.method === 'DELETE') {
    if (!DATE.test(req.query.id)) return res.status(400).json({ error: 'bad id' });
    await del(key('entries'), req.query.id);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
});
