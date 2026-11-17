// Tiny static server for the docs and templates: `npm run dev`, then open http://localhost:4173/docs/
// It behaves like GitHub Pages for the things the docs rely on: folders redirect to a trailing slash
// and serve index.html, and .md and .txt files are served as text.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt; charset=utf-8',
};
const port = Number(process.env.PORT) || 4173;

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return res.writeHead(400).end('Bad request');
    }
    let file = path.join(root, pathname);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      // Like GitHub Pages: /docs becomes /docs/, so relative links inside the page work.
      if (!url.pathname.endsWith('/')) return res.writeHead(301, { location: url.pathname + '/' + url.search }).end();
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) return res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    const headers = { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
    // Video and audio ask for byte ranges when people seek.
    const size = fs.statSync(file).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) return res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'content-length': size });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Xsenze UI Kit docs: http://localhost:${port}/docs/`));
