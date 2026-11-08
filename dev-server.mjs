// Servidor local para probar sin Vercel: `npm run dev` → http://localhost:3000
// Sirve public/, las funciones de api/ y las fotos guardadas en .data/img/.
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

try { process.loadEnvFile('.env'); } catch {} // ADMIN_PASSWORD local (no se sube a git)
if (!process.env.ADMIN_PASSWORD) throw new Error('Crea un archivo .env con ADMIN_PASSWORD=...');
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

async function sendFile(res, file) {
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
      const mod = await import(pathToFileURL(path.resolve('api', name + '.js')).href);
      const handler = mod[req.method];
      if (!handler) return res.writeHead(405).end();
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(Buffer.from(await response.arrayBuffer()));
    }
    if (url.pathname.startsWith('/local-img/')) {
      return sendFile(res, path.join('.data', 'img', path.normalize(decodeURIComponent(url.pathname.slice(11))).replace(/^(\.\.[\\/])+/, '')));
    }
    const rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\\/])+/, '');
    const file = path.join('public', rel.endsWith(path.sep) || rel === path.sep ? 'index.html' : rel);
    return sendFile(res, file);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Error: ' + err.message);
  }
}).listen(PORT, () => {
  console.log(`Trastero en http://localhost:${PORT}`);
});
