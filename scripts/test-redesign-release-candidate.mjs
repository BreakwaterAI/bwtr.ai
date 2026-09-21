import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || '');
assert.equal(process.argv.length, 3, 'Usage: node scripts/test-redesign-release-candidate.mjs CANDIDATE_SITE');
const release = JSON.parse(readFileSync(new URL('../site-release.json', import.meta.url)));
const candidateManifest = join(dirname(root), 'release-candidate.json');
const cisoRelease = existsSync(candidateManifest) || release.version === '2026-09-21-ciso-led';
const manifest = existsSync(candidateManifest) ? JSON.parse(readFileSync(candidateManifest, 'utf8')) : {
  productionApproved: false, files: release.files, routes: release.routes,
  resources: Object.fromEntries(Object.entries(release.resources).map(([k, v]) => [k, '/' + v])),
  liveForm: { endpoint: release.endpoint, schema: 'google-apps-script/org-owned/Code.gs' },
};
assert.equal(manifest.productionApproved, false);
const output = mkdtempSync('/tmp/bwtr-release-checks-');
const read = name => readFileSync(join(root, name), 'utf8');
const results = [];
for (const record of manifest.files) {
  const bytes = readFileSync(join(root, record.path));
  assert.equal(bytes.length, record.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
  assert.ok(!/review-evidence|\.md$|\.mjs$|integration-review|release-candidate\.json|integration-form\./.test(record.path));
}
for (const record of manifest.routes) {
  const html = read(record.route === '/' ? 'index.html' : `${record.route}/index.html`);
  assert.ok(!/noindex|nofollow|LOCAL INTEGRATION|local preview|Local prototype|data-preview-form|data-integration-form|connect-src 'none'|form-action 'none'/.test(html));
  assert.ok(html.includes(`rel="canonical" href="${record.canonical}"`));
  assert.ok(html.includes(`property="og:url" content="${record.canonical}"`));
  assert.ok(html.includes(`property="og:image" content="${record.socialImage}"`));
}
for (const path of ['404.html', 'platform/index.html']) assert.match(read(path), /name="robots" content="noindex,follow"/);
assert.ok(!read('robots.txt').includes('Disallow: /\n'));
assert.match(read('index.html'), /data-lead-form method="post"/);
assert.match(read('index.html'), /<fieldset disabled/);
assert.match(read('index.html'), /Contact details are sent through Google Apps Script to a Breakwater-managed Google Sheet/);
const leadCapture = { endpoint: release.endpoint, schema: 'google-apps-script/org-owned/Code.gs' };
assert.equal(manifest.liveForm.endpoint, leadCapture.endpoint);
assert.equal(manifest.liveForm.schema, leadCapture.schema);
const pw = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await pw.chromium.launch({ headless: true });
const base = 'http://localhost:4177';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
let mode = 'success', blockedScript = false, releaseRequest;
const submissions = [], unexpected = [], served = [], exceptions = [];
const videoBytes = new Map();
async function intercept(route) {
  const req = route.request(), url = new URL(req.url());
  if (req.url() === manifest.liveForm.endpoint) {
    submissions.push({ method: req.method(), body: req.postData() });
    if (mode === 'error') return route.abort('failed');
    if (mode === 'pending') await new Promise(resolve => { releaseRequest = resolve; });
    return route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock only' });
  }
  if (url.origin !== base) { unexpected.push(req.url()); return route.abort(); }
  // Every request is fulfilled from the candidate or explicitly mocked above.
  // No request is continued to the live site, local server, or Google backend.
  if (blockedScript && url.pathname === manifest.resources['lead-form.js']) return route.abort();
  if (url.pathname.startsWith('/assets/videos/')) {
    const media = release.media.find(m => m.destination === url.pathname);
    assert.ok(media, 'Only approved video dependencies may load');
    if (!videoBytes.has(url.pathname)) {
      const response = await fetch('https://www.bwtr.ai' + url.pathname, { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(createHash('sha256').update(bytes).digest('hex'), media.sha256);
      videoBytes.set(url.pathname, bytes);
    }
    const bytes = videoBytes.get(url.pathname);
    served.push({ path: url.pathname, bytes: bytes.length, status: 200 });
    return route.fulfill({ status: 200, contentType: 'video/mp4', body: bytes });
  }
  let file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep) && file !== root) return route.fulfill({ status: 403, body: '' });
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  const status = existsSync(file) ? 200 : 404;
  if (status === 404) file = join(root, '404.html');
  const bytes = readFileSync(file);
  served.push({ path: url.pathname, bytes: bytes.length, status });
  return route.fulfill({ status, contentType: mime[extname(file)] || 'application/octet-stream', body: bytes });
}
async function context(options = {}) {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', ...options });
  await ctx.route('**/*', intercept);
  return ctx;
}
try {
  const ctx = await context(); const page = await ctx.newPage();
  page.on('pageerror', error => exceptions.push(error.message));
  for (const path of [...manifest.routes.map(r => r.route), '/404.html']) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(base + path);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('body').getAttribute('data-theme') !== theme) await page.locator('[data-theme-toggle]').click();
        await page.locator('[data-brand-logo]').evaluate(el => el.decode());
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.locator('.review-bar').count(), 0);
        const state = await page.evaluate(() => ({
          anchors: [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.querySelector(a.getAttribute('href'))).map(a => a.hash),
          broken: [...document.images].filter(i => i.getAttribute('src') && i.loading !== 'lazy' && i.complete && !i.naturalWidth).map(i => i.src),
          vanta: getComputedStyle(document.documentElement).getPropertyValue('--vanta').trim(),
          red: getComputedStyle(document.documentElement).getPropertyValue('--breakwater-red').trim(),
          videos: [...document.querySelectorAll('video')].map(v => v.getAttribute('src')),
        }));
        assert.deepEqual(state.anchors, []); assert.deepEqual(state.broken, []);
        assert.equal(state.vanta, '#000100'); assert.equal(state.red, '#F0443E');
        assert.ok(state.videos.every(v => !v), 'Reduced motion must not fetch clips');
        results.push({ route: path, width, theme, layout: 'pass' });
      }
    }
  }
  assert.ok(!served.some(s => s.path.endsWith('.mp4')), 'Reduced-motion layout checks fetched video');
  // Preserve above-the-fold product proof, mobile navigation and accessible enlargement.
  for (const [width, height] of [[1440,800], [1280,720], [1024,768], [390,844], [320,740]]) {
    await page.setViewportSize({ width, height }); await page.goto(base + '/');
    const b = await page.locator('.hero-product video').boundingBox();
    assert.ok(b.y < (width >= 1024 ? 280 : 610)); assert.ok(b.y + b.height < height);
  }
  await page.locator('[data-menu]').click();
  assert.equal(await page.locator('[data-menu]').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-menu]').getAttribute('aria-expanded'), 'false');
  for (const path of ['/', '/products/', '/connected-industry/']) {
    await page.goto(base + path);
    // The CISO revision intentionally keeps secondary PQC detail collapsed.
    // Open it through its native control before exercising its enlargement UI.
    const disclosure = page.locator('#secure-crypto-readiness');
    if (await disclosure.count() && !await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
    for (const button of await page.locator('[data-enlarge]').all()) {
      const before = served.length;
      await button.click(); await page.locator('dialog img').evaluate(i => i.decode());
      assert.ok(await page.locator('dialog').isVisible());
      const original = await button.getAttribute('data-enlarge');
      assert.ok(served.slice(before).some(s => s.path === original));
      await page.locator('[data-zoom]').click();
      assert.equal(await page.locator('[data-zoom]').getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Escape'); assert.ok(!await page.locator('dialog').isVisible());
    }
  }
  await page.goto(base + '/missing-release-check'); assert.match(await page.locator('h1').innerText(), /Page not found/);
  await page.goto(base + '/platform/?release_test=1#technical-architecture');
  await page.waitForURL('**/architecture/?release_test=1#technical-architecture');
  // Cold contexts disable caching. Count every delivered body, including branding,
  // lazy images near the viewport and the short hero clip (uncompressed byte budget).
  const budgets = [];
  for (const route of manifest.routes) {
    for (const [width, dpr, budget] of [[1440,1,500000], [390,2,750000], [1440,2,1000000]]) {
      const cold = await context({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, reducedMotion: 'no-preference' });
      const tab = await cold.newPage(); const before = served.length;
      await tab.goto(base + route.route); await tab.waitForLoadState('networkidle');
      await tab.waitForTimeout(250);
      const requests = served.slice(before);
      assert.ok(requests.every(r => r.status === 200));
      const bytes = requests.reduce((sum, r) => sum + r.bytes, 0);
      assert.ok(bytes <= budget, `${route.route} ${width}@${dpr}: ${bytes} > ${budget}`);
      assert.equal(requests.filter(r => /brand-(?:light|dark)-/.test(r.path)).length, 1);
      assert.ok(!requests.some(r => /Breakwater-.*\.png$|horizontal-.*\.png$|emblems\/|soar-review\.mp4$/.test(r.path)));
      if (cisoRelease) assert.ok(!requests.some(r => /\.mp4$/.test(r.path)), 'CISO release must not fetch clips before explicit play');
      const captures = await tab.locator('.product-capture').evaluateAll(images => images.map(i => ({ src: i.currentSrc, width: i.getBoundingClientRect().width })));
      for (const capture of captures.filter(c => c.src)) {
        const choices = capture.src.includes('PQC') ? [640,960,1280,1676] : [640,960,1280,1920];
        const selected = Number(capture.src.match(/-(\d+)\.webp$/)?.[1]);
        assert.ok(choices.includes(selected));
        assert.ok(selected <= (choices.find(w => w >= capture.width*dpr) || choices.at(-1)));
      }
      budgets.push({ route: route.route, width, dpr, bytes, budget }); await cold.close();
    }
  }
  const motion = await context({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });
  const film = await motion.newPage();
  for (const path of ['/', '/products/']) {
    await film.goto(base + path);
    const video = film.locator('video').first(); await video.scrollIntoViewIfNeeded();
    // Both the candidate and the promoted CISO release require opt-in playback.
    if (cisoRelease) {
      assert.equal(await video.getAttribute('src'), null);
      assert.ok(await video.evaluate(v => v.paused));
      await film.locator('[data-play]').first().click();
    }
    await film.waitForFunction(() => { const v = document.querySelector('video'); return v.readyState >= 2 && !v.paused; });
    const duration = await video.evaluate(v => v.duration); assert.ok(duration >= 5 && duration <= 10);
    await film.locator('[data-play]').first().click(); assert.ok(await video.evaluate(v => v.paused));
    await film.evaluate(() => scrollTo(0, document.body.scrollHeight)); await film.waitForTimeout(150);
    await video.scrollIntoViewIfNeeded(); await film.waitForTimeout(150); assert.ok(await video.evaluate(v => v.paused));
    await film.locator('[data-play]').first().click();
    await film.evaluate(() => scrollTo(0, document.body.scrollHeight)); await film.waitForTimeout(250);
    assert.ok(await video.evaluate(v => v.paused));
  }
  await motion.close();
  const fill = async () => {
    for (const [name, value] of Object.entries({ name: 'Release test', email: 'release@example.invalid', organization: 'Local only', message: 'Intercepted test; no delivery' })) await page.locator(`[name="${name}"]`).fill(value);
  };
  const schema = readFileSync(leadCapture.schema, 'utf8').match(/const HEADERS = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  for (const interest of ['General', 'Airports', 'Healthcare', 'Power & utilities', 'Connected industry', 'Products', 'Breakwater Secure', 'Breakwater Assure', 'Breakwater SOAR', 'PQC readiness']) {
    await page.goto(`${base}/?interest=${encodeURIComponent(interest)}#contact`); await fill();
    const data = await page.evaluate(async path => {
      const { inquiryPayload } = await import(path);
      return Object.fromEntries(inquiryPayload(document.querySelector('form'), location.href));
    }, manifest.resources['lead-form.js']);
    assert.equal(data.company, 'Local only'); assert.equal(data.form_type, 'company_inquiry');
    assert.equal(data.environment, interest === 'General' ? 'General inquiry' : interest);
    assert.equal(data.industry, ['Airports', 'Healthcare', 'Power & utilities', 'Connected industry'].includes(interest) ? interest : '');
    assert.ok(Object.keys(data).every(key => schema.includes(key) || key === 'website'));
    const before = submissions.length; await page.locator('form button').click();
    await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('Delivery cannot be confirmed'));
    assert.equal(submissions.length, before + 1); assert.equal(submissions.at(-1).method, 'POST');
    assert.ok(submissions.at(-1).body.includes('name="company"')); assert.ok(submissions.at(-1).body.includes('name="form_type"'));
    assert.equal(await page.locator('[name="name"]').inputValue(), '');
    assert.equal(await page.locator('[name="interest"]').inputValue(), interest);
    results.push({ interest, payload: 'pass', transport: 'mocked opaque success', sentToGoogle: false });
  }
  await page.goto(base + '/#contact'); await fill(); mode = 'pending';
  const beforeBusy = submissions.length;
  await page.locator('form button').click();
  await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === 'true');
  assert.ok(await page.locator('form button').isDisabled());
  await page.locator('form').evaluate(el => el.requestSubmit());
  for (let n = 0; !releaseRequest && n < 100; n++) await page.waitForTimeout(20);
  assert.ok(releaseRequest); assert.equal(submissions.length, beforeBusy + 1); releaseRequest();
  await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === null);
  assert.ok(await page.locator('form button').isEnabled());
  results.push({ busyState: 'pass', duplicateRequests: 0 });
  mode = 'error'; await fill(); await page.locator('form button').click();
  await page.waitForFunction(() => document.querySelector('[data-form-status]').dataset.tone === 'error');
  assert.equal(await page.locator('[name="name"]').inputValue(), 'Release test');
  assert.ok(await page.locator('form button').isEnabled());
  assert.ok(await page.locator('[data-form-status]').evaluate(el => el === document.activeElement));
  results.push({ networkFailure: 'inputs retained, retry enabled, email fallback and focused status' });
  mode = 'success'; const beforeHoney = submissions.length;
  await page.locator('[name="website"]').evaluate(el => { el.value = 'spam'; });
  await page.locator('form button').click(); assert.equal(submissions.length, beforeHoney);
  await page.locator('form button').click(); assert.equal(submissions.length, beforeHoney);
  results.push({ honeypotAndInvalidForm: 'no request' });
  for (const failure of ['disabled', 'blocked']) {
    blockedScript = failure === 'blocked';
    const safe = await context({ javaScriptEnabled: failure !== 'disabled' }); const tab = await safe.newPage();
    await tab.goto(base + '/'); assert.ok(await tab.locator('form button').isDisabled());
    assert.ok(await tab.locator('[data-form-fallback]').isVisible()); await safe.close();
    results.push({ failure, form: 'fail closed' });
  }
  assert.deepEqual(unexpected, []);
  assert.deepEqual(exceptions, []);
  writeFileSync(join(output, 'results.json'), JSON.stringify({ passed: true, results, budgets, interceptedSubmissions: submissions.length, realSubmissions: 0 }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: results.length, coldBudgetCases: budgets.length, files: manifest.files.length, interceptedSubmissions: submissions.length, realSubmissions: 0, output }));
  await ctx.close();
} finally { await browser.close(); }
