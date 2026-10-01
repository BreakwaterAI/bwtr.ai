import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
const root = resolve(process.argv[2] || '');
if (!process.argv[2] || !existsSync(join(root, 'asset-manifest.json'))) throw Error('Pass a built public artifact directory');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json', '.mp4':'video/mp4', '.pdf':'application/pdf' };
createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let url, path;
  try { url = new URL(req.url, 'http://localhost:4177'); path = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (['/platform','/platform/','/platform.html','/platform/index.html'].includes(path)) { res.writeHead(301, { Location: '/architecture/' + url.search }); return res.end(); }
  let file = resolve(root, '.' + path);
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); return res.end(); }
  // Standard artifacts omit separately provisioned videos. A review artifact may
  // contain a hash-verified local copy; otherwise mirror production and use S3.
  if (path.startsWith('/assets/videos/redesign/') && !existsSync(file)) {
    res.writeHead(302, { Location: 'https://www.bwtr.ai' + path }); return res.end();
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' + url.search }); return res.end(); }
    file = join(file, 'index.html');
  }
  let status = 200;
  if (!existsSync(file) || !statSync(file).isFile()) { status = 404; file = join(root, '404.html'); }
  const body = readFileSync(file);
  const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-cache' };
  if (extname(file) === '.mp4') {
    headers['Accept-Ranges'] = 'bytes';
    const match = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
      if (start > end || start >= body.length) { res.writeHead(416, { 'Content-Range': `bytes */${body.length}` }); return res.end(); }
      headers['Content-Range'] = `bytes ${start}-${end}/${body.length}`;
      headers['Content-Length'] = end - start + 1;
      res.writeHead(206, headers);
      return res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1));
    }
  }
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(4177, '127.0.0.1', () => console.log(`Production-shaped local review: http://localhost:4177/ (${root})`));
