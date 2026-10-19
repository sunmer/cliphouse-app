// Serve output/social on the local network so a phone on the same Wi-Fi can open and share the videos.
// Supports byte ranges, which iOS Safari needs to play MP4. Lists the files at /.
// Usage: node scripts/social/serve.mjs [port]
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../output/social');
const port = Number(process.argv[2] || 8765);
const types = {'.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.json': 'application/json'};
const files = () => fs.readdirSync(root, {recursive: true}).filter((f) => /\.(mp4|jpg)$/.test(f)).sort();

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') {
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    res.end(`<!doctype html><meta name="viewport" content="width=device-width"><body style="font:17px system-ui;background:#0b0912;color:#f5f5f2;padding:20px">
<h1 style="font-size:22px">Cliphouse social videos</h1>${files().map((f) => f.endsWith('.mp4')
      ? `<p><a style="color:#ffc94a" href="/${f}">${f}</a></p><video src="/${f}" controls playsinline style="width:100%;max-width:420px"></video>`
      : `<p><a style="color:#9a95a8" href="/${f}">${f}</a></p>`).join('')}</body>`);
    return;
  }
  const file = path.join(root, url);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  const size = fs.statSync(file).size;
  const headers = {'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'no-cache'};
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, {'content-range': `bytes */${size}`}); res.end(); return; }
    res.writeHead(206, {...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1});
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file, {start, end}).pipe(res);
    return;
  }
  res.writeHead(200, {...headers, 'content-length': size});
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(ips.map((ip) => `http://${ip}:${port}/`).join('\n'));
});
