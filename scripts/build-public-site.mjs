import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2], 'Usage: build-public-site.mjs NEW_ARTIFACT_DIRECTORY');
const target = resolve(process.argv[2]);
assert.ok(!existsSync(target), 'Artifact destination must not already exist');
const release = JSON.parse(readFileSync(join(source, 'site-release.json')));
const readerPack = JSON.parse(readFileSync(join(source, 'scripts/planners/reader-pack.json')));
const publicPdfs = new Map(readerPack.documents.map(d => ['assets/reader-pack/' + d.file, d]));
// An exact public-file allowlist keeps working documents and private review material out.
for (const file of release.files) {
  if (file.path.endsWith('.pdf')) {
    assert.ok(publicPdfs.has(file.path), 'PDF is not in the explicit public reader-pack allowlist');
    assert.equal(file.sha256, publicPdfs.get(file.path).sha256, 'PDF must match its approved bytes');
  } else assert.match(file.path, /^(?:assets\/[\w./-]+\.(?:png|jpg|webp|css|js)|(?:[\w-]+\/)?[\w.-]+\.(?:html|txt|xml)|\.well-known\/security\.txt)$/);
  assert.ok(!file.path.includes('..') && !file.path.startsWith('assets/videos/'));
  const bytes = readFileSync(join(source, file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
for (const file of release.files) {
  mkdirSync(dirname(join(target, file.path)), { recursive: true });
  copyFileSync(join(source, file.path), join(target, file.path));
}
writeFileSync(join(target, 'asset-manifest.json'), JSON.stringify(release.resources, null, 2) + '\n');
console.log(`Built ${release.files.length} approved public files plus asset manifest in ${target}`);
