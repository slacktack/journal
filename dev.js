// Local server that mimics Vercel: static files + /api/*.js handlers.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ROOT = process.cwd();

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  res.status = c => ((res.statusCode = c), res);
  res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
  try {
    const api = u.pathname.match(/^\/api\/([a-z]+)$/);
    if (api) {
      let raw = '';
      for await (const c of req) raw += c;
      req.body = raw ? JSON.parse(raw) : undefined;
      req.query = Object.fromEntries(u.searchParams);
      return (await import(`./api/${api[1]}.js`)).default(req, res);
    }
    const p = normalize(join(ROOT, u.pathname === '/' ? 'index.html' : u.pathname));
    if (!p.startsWith(ROOT) || p.includes('/api/') || p.includes('/.data')) throw 0;
    res.setHeader('content-type', TYPES[extname(p)] || 'application/octet-stream');
    res.end(await readFile(p));
  } catch {
    res.status(404).end('not found');
  }
}).listen(process.env.PORT || 3000, () => console.log(`♡ diary on http://localhost:${process.env.PORT || 3000}`));
