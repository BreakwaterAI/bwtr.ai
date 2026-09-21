import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const release = JSON.parse(readFileSync(join(root, 'site-release.json')));
const read = file => readFileSync(join(root, file), 'utf8');
const pages = [...release.routes.map(r => r.route === '/' ? 'index.html' : `${r.route.slice(1)}index.html`), '404.html', 'platform/index.html'];
for (const file of pages) {
  const html = read(file);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
  assert.ok(!/Local prototype|Publication review pending|LOCAL (?:DESIGN|INTEGRATION) REVIEW|\/redesign-preview\/|data-preview-form|data-integration-form/.test(html), file);
  assert.ok(html.includes('© 2026 Breakwater. All rights reserved.'), file);
  for (const match of html.matchAll(/(?:href|src|poster|data-enlarge)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    if (match[1].startsWith('//') || match[1].startsWith('/assets/videos/')) continue;
    const path = match[1].endsWith('/') ? match[1] + 'index.html' : match[1];
    assert.ok(existsSync(resolve(root, '.' + path)), `${file}: missing ${path}`);
  }
  assert.ok(!html.includes('—'), `${file}: avoid repeated em-dash copy cadence`);
}
for (const route of release.routes) {
  const html = read(route.route === '/' ? 'index.html' : `${route.route.slice(1)}index.html`);
  assert.ok(!/noindex|nofollow/.test(html));
  for (const text of [`rel="canonical" href="${route.canonical}"`, `property="og:url" content="${route.canonical}"`, `property="og:image" content="${route.socialImage}"`, `name="twitter:image" content="${route.socialImage}"`, 'property="og:image:width" content="1280"', 'property="og:image:height" content="720"']) assert.ok(html.includes(text), `${route.route}: ${text}`);
}
const home = read('index.html');
for (const text of ['IoT & OT security', 'Understand exposure across connected operations.', 'See what the connection is based on.', 'cryptographic readiness', 'Simulated plant', 'data-lead-form', 'Google Apps Script', 'Breakwater-managed Google Sheet', '<fieldset disabled', 'data-play', 'id="product-family"']) assert.ok(home.includes(text), text);
assert.ok(!home.includes('Plan your post-quantum transition.'), 'PQC must not dominate the homepage');
const products = read('products/index.html');
assert.match(products, /<details\b[^>]*id="secure-crypto-readiness"[^>]*>/);
assert.ok(!/<details\b[^>]*id="secure-crypto-readiness"[^>]*\bopen\b/.test(products), 'Secondary PQC detail is closed initially');
assert.match(products, /Post-quantum transition planning/);
assert.match(products, /soar-review-summary/);
for (const name of ['name', 'email', 'organization', 'interest', 'message', 'website']) assert.ok(home.includes(`name="${name}"`));
assert.ok(!/hero-backdrop|secure\.webp|assure\.webp|soar\.webp/.test(home));
const lead = read(release.resources['lead-form.js']);
for (const text of [release.endpoint, 'no-cors', 'AbortController', 'Delivery cannot be confirmed']) assert.ok(lead.includes(text), text);
const headlines = [];
for (const industry of ['airports', 'healthcare', 'power-utilities', 'connected-industry']) {
  const html = read(`${industry}/index.html`);
  headlines.push(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]);
  assert.match(html, /Photo: Unsplash/);
  assert.ok(!/href="https:\/\/(?:www\.)?unsplash\.com\//.test(html), 'Photo credits remain unlinked');
}
assert.match(read('healthcare/index.html'), /Photo: Unsplash · not a depiction of an exposed facility/);
assert.equal(new Set(headlines).size, 4, 'Industry messages must be distinct');
for (const anchor of ['reference-model', 'technical-architecture', 'category-positioning']) assert.ok(read('architecture/index.html').includes(`id="${anchor}"`));
const architecture = read('architecture/index.html');
for (const text of ['Illustrative reference design', 'must be confirmed for the selected configuration', 'These are reference-design mechanisms. Confirm support for your deployment with engineering.', 'aria-describedby="architecture-mechanism-scope"']) assert.ok(architecture.includes(text), text);
assert.ok(!architecture.includes('ASOC'), 'Do not use an unexplained acronym in Architecture copy');
assert.ok(!/<h[23][^>]*class="architecture-zone-label"/.test(architecture), 'Diagram zones are not page sections');
for (const text of ['Nagu Thogiti', 'Chetna Mallarapu', 'President']) assert.ok(read('about/index.html').includes(text));
assert.match(read('404.html'), /Page not found/);
assert.match(read('platform/index.html'), /http-equiv="refresh" content="0;\s*url=\/architecture\/"/);
for (const file of ['404.html', 'platform/index.html']) assert.match(read(file), /name="robots" content="noindex,follow"/);
console.log('Approved redesign content, metadata, industry specificity, form safety, founder and utility contracts passed.');
