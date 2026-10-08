// Minimal static server for tests: serves the site root with the exact headers from vercel.json.
//   node tests/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
const headers = Object.fromEntries(
  config.headers.flatMap((rule) => rule.headers.map((h) => [h.key, h.value]))
);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.ai': 'application/postscript',
};
// Mirror .vercelignore: whatever Vercel does not deploy must 404 here too.
const ignored = (await readFile(join(root, '.vercelignore'), 'utf8').catch(() => ''))
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const isHidden = (path) =>
  path === '/.vercelignore' ||
  path === '/vercel.json' ||
  path.startsWith('/node_modules/') ||
  ignored.some((rule) => (rule.endsWith('/') ? path.startsWith(`/${rule}`) : path === `/${rule}`));

export function start(port = 0) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
    try {
      if (!file.startsWith(root) || isHidden(path)) throw new Error('not found');
      if (!(await stat(file)).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', ...headers });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
      res.end('Not found');
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await start(Number(process.argv[2]) || 4173);
  console.log(`http://127.0.0.1:${server.address().port}`);
}
