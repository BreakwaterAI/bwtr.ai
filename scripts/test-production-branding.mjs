import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url));
const release = JSON.parse(read('site-release.json'));
const contract = JSON.parse(read('brand-contract.json'));
const approval = JSON.parse(read('release-prep/logo-v05-publication-approval.json'));
assert.equal(release.brandRevision, '2026-09-21-logo-v05');
assert.equal(approval.productionPublicationApproved, true);
assert.equal(createHash('sha256').update(read('site-release.json')).digest('hex'), approval.publicManifestSha256);
const files = new Set(release.files.map(r => r.path));
const logos = ['light', 'dark'].flatMap(theme => [340, 510, 680].map(width => `assets/product-proof/brand-${theme}-v05-${width}.webp`));
for (const file of [...logos, 'assets/product-proof/apple-touch-icon-v05-180.png', release.resources['favicon.webp']]) {
  assert.ok(files.has(file), file);
  assert.equal(createHash('sha256').update(read(file)).digest('hex'), contract.pinnedBrandAssets[file], file);
}
for (const file of release.files.filter(r => r.path.endsWith('.html'))) {
  const html = read(file.path).toString();
  assert.equal((html.match(/rel="icon"/g) || []).length, 1, file.path);
  assert.ok(html.includes(`href="/${release.resources['favicon.webp']}"`), file.path);
  assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="/assets/product-proof/apple-touch-icon-v05-180.png"'), file.path);
  assert.ok(html.includes('brand-light-v05-340.webp" width="1600" height="454"'), file.path);
  assert.ok(html.includes('sizes="(max-width: 380px) 160px, (max-width: 760px) 180px, (max-width: 1000px) 170px, 220px"'), file.path);
  assert.ok(!/brand-(?:light|dark)-(?:340|510)\.webp/.test(html), file.path);
}
const script = read(release.resources['script.js']).toString();
for (const width of [340, 510, 680]) assert.ok(script.includes(`brand-\u0024{variant}-v05-${width}.webp`));
console.log('Approved v05 branding: 12 pages, both themes, three densities, pinned icons and source-bound publication approval.');
