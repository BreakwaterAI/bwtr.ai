import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogPublicFiles } from './blog-public-files.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2], 'Usage: build-public-site.mjs NEW_ARTIFACT_DIRECTORY');
const target = resolve(process.argv[2]);
assert.ok(!existsSync(target), 'Artifact destination must not already exist');
const release = JSON.parse(readFileSync(join(source, 'site-release.json')));
// An exact public-file allowlist keeps working documents and private review material out.
for (const file of release.files) {
  assert.ok(!file.path.endsWith('.pdf'), 'Legacy product PDFs are not part of the ASOC release');
  assert.match(file.path, /^(?:assets\/[\w./-]+\.(?:png|jpg|webp|ico|svg|css|js)|(?:[\w-]+\/)?[\w.-]+\.(?:html|txt|xml)|\.well-known\/security\.txt)$/);
  assert.ok(!file.path.includes('..') && !file.path.startsWith('assets/videos/'));
  const bytes = readFileSync(join(source, file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
for (const file of release.files) {
  mkdirSync(dirname(join(target, file.path)), { recursive: true });
  copyFileSync(join(source, file.path), join(target, file.path));
}
// Blog pages are generated from Markdown and included by path. Core files above
// remain hash-pinned; raw Markdown never enters the public artifact.
const blogFiles = blogPublicFiles(source);
for (const relPath of blogFiles) {
  assert.ok(!relPath.includes('..'), relPath);
  mkdirSync(dirname(join(target, relPath)), { recursive: true });
  copyFileSync(join(source, relPath), join(target, relPath));
}

writeFileSync(join(target, 'asset-manifest.json'), JSON.stringify(release.resources, null, 2) + '\n');
console.log(
  `Built ${release.files.length} approved public files, ${blogFiles.length} pattern-included blog files, ` +
  `plus asset manifest in ${target}`,
);
