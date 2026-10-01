import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const release = JSON.parse(read('site-release.json'));
const contract = JSON.parse(read('brand-contract.json'));
const priorApproval = JSON.parse(read('release-prep/logo-v05-publication-approval.json'));

assert.equal(priorApproval.productionPublicationApproved, true);
if (process.env.BWTR_LOCAL_CANDIDATE === '1') {
  assert.ok(!process.env.CI, 'Candidate mode is local-only, not a production CI bypass');
  assert.equal(release.brandRevision, '2026-09-30-product-v06');
  assert.equal(release.candidate?.name, 'asoc-product-content-consolidation-20261001');
  assert.equal(release.candidate?.productionPublicationApproved, false);
  const baseline = read('scripts/planners/approved-site-baseline.json');
  assert.equal(createHash('sha256').update(baseline).digest('hex'), priorApproval.publicManifestSha256);
} else {
  const approval = JSON.parse(read('release-prep/marketing-resources-20260924/publication-approval.json'));
  assert.equal(approval.productionPublicationApproved, true);
  assert.equal(approval.revision, '2026-09-27-team-update-rc1');
  assert.equal(approval.publicFiles, release.files.length);
  assert.equal(createHash('sha256').update(read('site-release.json')).digest('hex'), approval.publicManifestSha256,
    'This local ASOC candidate does not have production publication approval');
}

const files = new Set(release.files.map(record => record.path));
for (const [file, expectedHash] of Object.entries(contract.pinnedBrandAssets)) {
  assert.ok(files.has(file), `${file}: pinned brand asset must be in the release candidate`);
  assert.equal(createHash('sha256').update(read(file)).digest('hex'), expectedHash, file);
}

const lightLogo = '/assets/brand/v06/corporate/breakwater-horizontal-light.svg';
const darkLogo = '/assets/brand/v06/corporate/breakwater-horizontal-dark.svg';
for (const file of release.files.filter(record => record.path.endsWith('.html'))) {
  const html = read(file.path).toString();
  assert.equal((html.match(/rel="icon"/g) || []).length, 1, file.path);
  assert.ok(html.includes(`href="/${release.resources['favicon.webp']}"`), file.path);
  assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="/assets/brand/v06/icons/apple-touch-icon-180.png"'), file.path);
  assert.ok(html.includes(`data-light-src="${lightLogo}"`), file.path);
  assert.ok(html.includes(`data-dark-src="${darkLogo}"`), file.path);
  assert.doesNotMatch(html, /brand-(?:light|dark)-v05|apple-touch-icon-v05/, file.path);
}

const products = read('products/index.html').toString();
assert.ok(products.includes('breakwater-asoc-horizontal-light-with-tagline.svg'), 'asoc light');
assert.ok(products.includes('breakwater-asoc-horizontal-dark-with-tagline.svg'), 'asoc dark');
for (const name of ['discover', 'provenance', 'response']) {
  assert.ok(products.includes(`breakwater-${name}-horizontal-light-no-tagline.svg`), name);
  assert.ok(products.includes(`breakwater-${name}-horizontal-dark-no-tagline.svg`), name);
}
const script = read(release.resources['script.js']).toString();
assert.ok(script.includes("querySelectorAll('[data-theme-logo]')"));

console.log(process.env.BWTR_LOCAL_CANDIDATE === '1'
  ? 'Local v06 ASOC candidate branding passed; production publication is NOT approved.'
  : 'Approved production branding and source-bound publication approval passed.');
