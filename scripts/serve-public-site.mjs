import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
const root = resolve(process.argv[2] || '');
if (!process.argv[2] || !existsSync(join(root, 'asset-manifest.json'))) throw Error('Pass a built public artifact directory');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json', '.mp4':'video/mp4', '.pdf':'application/pdf' };
createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let url, path;
  try { url = new URL(req.url, 'http://localhost:4177'); path = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (['/platform','/platform/','/platform.html','/platform/index.html'].includes(path)) { res.writeHead(301, { Location: '/architecture/' + url.search }); return res.end(); }
  // Videos remain S3-only, including in local production review.
  if (path.startsWith('/assets/videos/redesign/')) { res.writeHead(302, { Location: 'https://www.bwtr.ai' + path }); return res.end(); }
  let file = resolve(root, '.' + path);
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' + url.search }); return res.end(); }
    file = join(file, 'index.html');
  }
  let status = 200;
  if (!existsSync(file) || !statSync(file).isFile()) { status = 404; file = join(root, '404.html'); }
  const body = readFileSync(file);
  res.writeHead(status, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(4177, '127.0.0.1', () => console.log(`Production-shaped local review: http://localhost:4177/ (${root})`));
