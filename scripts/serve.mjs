// Servidor estático local para conferência (com gzip para texto, como um host real).
// Uso: node scripts/serve.mjs <pasta> <porta>     ou, como módulo: import { startServer } from './serve.mjs'
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml']);

export function startServer(root, port = 0) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) {
      const nf = path.join(root, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
      return;
    }
    const ext = path.extname(f);
    let body = fs.readFileSync(f);
    const headers = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
    if (COMPRESSIBLE.has(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
      body = zlib.gzipSync(body, { level: 9 });
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers).end(body);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port } = await startServer(process.argv[2] ?? 'dist/preview', Number(process.argv[3] ?? 4321));
  console.log(`http://127.0.0.1:${port}/  (${process.argv[2]})`);
}
