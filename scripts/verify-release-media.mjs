import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const base = process.argv[2] || 'https://www.bwtr.ai';
assert.match(base, /^https:\/\/[^/]+$/);
const release = JSON.parse(readFileSync(new URL('../site-release.json', import.meta.url)));
const videos = release.media.filter(m => m.destination.startsWith('/assets/videos/'));
assert.equal(videos.length, 2);
for (const media of videos) {
  const response = await fetch(base + media.destination, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, media.destination);
  assert.match(response.headers.get('content-type'), /^video\/mp4/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length, media.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), media.sha256);
  const range = await fetch(base + media.destination, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(30000) });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), `bytes 0-1023/${media.bytes}`);
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(0, 1024));
  console.log(`Verified public video hash, MIME and byte range: ${media.destination}`);
}
