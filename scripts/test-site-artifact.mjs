import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogPublicFiles } from './blog-public-files.mjs';
const root = process.argv[2];
assert.ok(root, 'Usage: test-site-artifact.mjs ARTIFACT_DIRECTORY');
const source = dirname(dirname(fileURLToPath(import.meta.url)));
const release = JSON.parse(readFileSync(new URL('../site-release.json', import.meta.url)));
function files(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]);
}
const blogFiles = blogPublicFiles(source);
assert.deepEqual(files(root).sort(), [...release.files.map(f => f.path), ...blogFiles, 'asset-manifest.json'].sort(), 'Artifact must contain only approved public files and generated blog files');
for (const f of release.files) {
  const bytes = readFileSync(join(root, f.path));
  assert.equal(bytes.length, f.bytes, f.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), f.sha256, f.path);
}
assert.deepEqual(JSON.parse(readFileSync(join(root, 'asset-manifest.json'))), release.resources);
for (const path of Object.entries(release.resources).filter(([name]) => name !== 'favicon.webp').map(([, path]) => path)) {
  const hash = createHash('sha256').update(readFileSync(join(root, path))).digest('hex').slice(0, 12);
  assert.ok(path.includes(`.${hash}.`), `${path}: resource must be content-addressed`);
}
for (const f of release.files.filter(f => f.path.endsWith('.html'))) {
  const html = readFileSync(join(root, f.path), 'utf8');
  for (const name of ['styles.css', 'script.js', 'theme-init.js']) assert.ok(html.includes('/' + release.resources[name]), `${f.path}: ${name}`);
  assert.ok(!/Local prototype|Publication review pending|LOCAL (?:DESIGN|INTEGRATION) REVIEW|\/redesign-preview\//.test(html));
}
for (const file of blogFiles) {
  assert.deepEqual(readFileSync(join(root, file)), readFileSync(join(source, file)), `${file}: blog artifact differs from source`);
  if (file.endsWith('.html')) {
    const html = readFileSync(join(root, file), 'utf8');
    assert.ok(html.includes('/' + release.resources['styles.css']), `${file}: missing current site stylesheet`);
    assert.ok(html.includes('/' + release.resources['theme-init.js']), `${file}: missing current theme initialization`);
  }
}
console.log(`Public artifact: ${release.files.length} pinned files and ${blogFiles.length} blog files, no review material.`);
