import { all, put, handle } from './_db.js';

export default (req, res) => handle(req, res, async key => {
  if (req.method === 'GET') {
    const [s] = (await all(key('settings'))) || [];
    return res.json(s || {});
  }
  if (req.method === 'PUT') {
    const s = req.body;
    if (!s || typeof s !== 'object' || Array.isArray(s) || JSON.stringify(s).length > 20000) return res.status(400).json({ error: 'bad settings' });
    await put(key('settings'), 'me', s);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'method not allowed' });
});
