// Loop worker: a private Cloud Run service that renders one animated WebP loop per request.
// It runs from the share service image with its own CPU, so loops never compete with posters.
// Cloud Run IAM allows only the share service account to call it; there is no other auth here.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {HttpError, validateShare} from './model.ts';
import {createPreviewRenderer} from './preview.ts';

const MAX_BODY = 256 * 1024;
const renderer = createPreviewRenderer();
await Promise.race([Promise.all([renderer.warm(), renderer.warmLoops()]), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 45_000))])
  .catch((e) => console.error('Loop worker warm-up failed:', (e as Error).message));

const server = createServer(async (req, res) => {
  try {
    const {pathname} = new URL(req.url || '/', 'http://worker');
    if (pathname === '/health' && req.method === 'GET') { res.writeHead(200).end('ok'); return; }
    if (pathname !== '/render-loop' || req.method !== 'POST') throw new HttpError(404, 'Not found.');
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY) throw new HttpError(413, 'Request too large.');
      chunks.push(chunk as Buffer);
    }
    const value = validateShare(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const started = Date.now();
    const result = await renderer.renderLoop(value, AbortSignal.timeout(110_000));
    try {
      const bytes = await readFile(result.image);
      res.writeHead(200, {'Content-Type': 'image/webp', 'Content-Length': bytes.length, 'X-Render-Ms': String(Date.now() - started)});
      res.end(bytes);
    } finally { await result.cleanup().catch(() => {}); }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : e instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error('Loop render failed:', String((e as Error).message).slice(0, 200));
    if (!res.headersSent) res.writeHead(status, {'Content-Type': 'text/plain'});
    res.end(e instanceof HttpError ? e.message : 'Loop render failed.');
  }
});
server.requestTimeout = 150_000;
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Loop worker ready'));
process.on('SIGTERM', () => server.close());
