import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as nodeModule from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readerPage, plannerPage} from './planners/page-templates.mjs';
import {releaseCorrections} from './planners/release-corrections.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(path.join(root, name), 'utf8');
const sha = data => createHash('sha256').update(data).digest('hex');
const write = (name, data) => { mkdirSync(path.dirname(path.join(root, name)), {recursive: true}); writeFileSync(path.join(root, name), data); };
const stripTypeScriptTypes = nodeModule.stripTypeScriptTypes || (source => source
  .replace(/^(?:export )?type .*$/gm, '')
  .replace(/\s+as const satisfies readonly \w+\[\]/g, '')
  .replace(/\s+as const/g, '')
  .replace(/\s+as keyof typeof \w+/g, '')
  .replace(/\b(questions|answers)\s*:\s*(?:readonly )?\w+(?:<[^>]+>)?(?:\[\])?/g, '$1')
  .replace(/\]\s+as \{ owner:[^\n]+?\}\[\]/g, ']'));
const release = JSON.parse(read('site-release.json'));
const managed = [];
for (const file of ['index.html','products/index.html','power-utilities/index.html','architecture/index.html']) {
  write(file, releaseCorrections(file, read(file)));
}
function asset(name, source, extension) {
  // TypeScript stripping preserves type-column padding. Remove only trailing
  // whitespace so generated modules satisfy the repository's release diff gate.
  if (extension === 'js') source = source.replace(/[\t ]+$/gm, '');
  const file = `assets/site-ui/${name}.${sha(source).slice(0,12)}.${extension}`;
  write(file, source); managed.push(file); return '/' + file;
}
const validation = asset('planner-validation', stripTypeScriptTypes(read('scripts/planners/validation.ts')), 'js');
const modules = {};
for (const kind of ['poc','pqc']) {
  const js = stripTypeScriptTypes(read(`scripts/planners/${kind}-model.ts`)).replace("'./validation.ts'", JSON.stringify(validation));
  modules[kind] = asset('planner-' + kind, js, 'js');
}
const script = asset('planner-ui', read('scripts/planners/planner-ui.js').replace("'./poc-model.js'", JSON.stringify(modules.poc)).replace("'./pqc-model.js'", JSON.stringify(modules.pqc)), 'js');
const css = asset('planners', read('scripts/planners/planners.css'), 'css');
const entryCss = asset('evaluation-entry', read('scripts/planners/evaluation-entry.css'), 'css');
const template = read('research/index.html');
const oldTitle = 'Research and teaching | Breakwater';
const oldDescription = 'Explore Breakwater research themes in distributed systems, adversarial methods, cryptography and AI, alongside teaching resources.';
function page(route, title, description, body, planner = false) {
  const hidden = route === 'pqc-planner';
  let html = template.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${body}</main>`)
    .replaceAll(oldTitle, title).replaceAll(oldDescription, description)
    .replaceAll('https://www.bwtr.ai/research/', `https://www.bwtr.ai/${route}/`)
    .replace('</head>', `<meta name="referrer" content="no-referrer">${hidden ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="stylesheet" href="${css}">${planner ? `<script type="module" src="${script}"></script>` : ''}</head>`);
  assert(html.includes(`<title>${title}</title>`));
  const file = `${route}/index.html`; write(file, html); managed.push(file);
}
const cards = `<div class="evaluation-cards"><article><span class="eyebrow">Understand</span><h3>Breakwater ASOC</h3><p>The connected operations security platform follows the path from asset and exposure intelligence through evidence provenance to controlled response.</p><a class="text-link" href="/reader-pack/">Explore the ASOC overview <span aria-hidden="true">→</span></a></article><article><span class="eyebrow">Scope</span><h3>PoC planner</h3><p>Define a proof of concept: footprint, data boundaries and responsibilities to review with your team.</p><a class="text-link" href="/poc-planner/">Build an evaluation brief <span aria-hidden="true">→</span></a></article></div>`;
const entryHeadings = {'index.html':'Take the next step in your evaluation.', 'research/index.html':'Put the research in context.', 'products/index.html':'Prepare your ASOC evaluation.', 'architecture/index.html':'Turn the design into an evaluation scope.'};
for (const [file, heading] of Object.entries(entryHeadings)) {
  let html = read(file);
  html = html.replace(/<section class="wrap section rule" id="planning-resources"[^>]*>[\s\S]*?<\/section>/g, '');
  const hub = `<section class="wrap section rule" id="planning-resources" aria-labelledby="evaluation-heading"><div class="section-heading"><h2 id="evaluation-heading">${heading}</h2></div>${cards}</section>`;
  assert(html.includes('<section class="section contact"'), `${file}: missing contextual insertion point`);
  write(file, html.replace('<section class="section contact"', hub + '<section class="section contact"'));
}
page('reader-pack', 'Breakwater ASOC overview | Breakwater', 'Explore Breakwater ASOC: Discover for asset and exposure intelligence, Provenance for evidence validation, and Response for controlled response and verification.', readerPage());
for (const kind of ['poc','pqc']) {
  const title = kind === 'poc' ? 'PoC deployment planner' : 'PQC migration planner';
  const description = kind === 'poc' ? 'Frame the scope, deployment boundaries and design targets for a Breakwater evaluation.' : 'Explore cryptographic migration priorities using explicit questionnaire assumptions.';
  page(kind+'-planner', title+' | Breakwater', description, plannerPage(kind), true);
}
const routes = ['reader-pack','poc-planner','pqc-planner'];
const productRoutes = ['discover','provenance','response'];
release.routes = release.routes.filter(r => ![...routes,...productRoutes].some(x=>r.route===`/${x}/`));
for(const route of productRoutes) release.routes.push({route:`/${route}/`,canonical:`https://www.bwtr.ai/${route}/`,socialImage:'https://www.bwtr.ai/assets/breakwater-social-home.png'});
for(const route of routes) release.routes.push({route:`/${route}/`,canonical:`https://www.bwtr.ai/${route}/`,socialImage:'https://www.bwtr.ai/assets/breakwater-social-home.png', ...(route === 'pqc-planner' ? {discoverable:false} : {})});
const sitemapOrder = ['', 'products', ...productRoutes, 'architecture', 'research', 'about', 'security', 'airports', 'power-utilities', 'connected-industry', 'healthcare', ...routes.filter(route => route !== 'pqc-planner')];
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapOrder.map(r=>`  <url><loc>https://www.bwtr.ai/${r ? r+'/' : ''}</loc></url>`).join('\n') + '\n</urlset>\n');
const brandFiles = [
  release.resources['styles.css'],
  release.resources['script.js'],
  'assets/brand/v06/corporate/breakwater-horizontal-light.svg',
  'assets/brand/v06/corporate/breakwater-horizontal-dark.svg',
  'assets/brand/v06/icons/apple-touch-icon-180.png',
  'assets/brand/v06/icons/favicon.webp',
  ...['light','dark'].map(theme =>
    `assets/brand/v06/products/breakwater-asoc-horizontal-${theme}-with-tagline.svg`),
  ...['discover','provenance','response'].flatMap(name => ['light','dark'].map(theme =>
    `assets/brand/v06/products/breakwater-${name}-horizontal-${theme}-no-tagline.svg`)),
];
const candidatePublicMedia = ['assets/product-proof/discover-attack-path-poster.webp'];
const productDetailFiles = [
  'assets/site-ui/product-detail.be45d1b86a89.css',
  ...productRoutes.map(route => `${route}/index.html`),
];
release.resources['product-detail.css'] = productDetailFiles[0];
const candidateProvisionedMedia = [{
  destination: '/assets/videos/redesign/discover-attack-path.mp4',
  sha256: '831587c0cbc79c3dfd66a3af512025154db9b41e49103470159c30110b47efc7',
  bytes: 559153,
}];
const refreshedMediaFiles = [
  ...brandFiles.filter(file => file.startsWith('assets/brand/v06/')),
  ...candidatePublicMedia,
];
const retiredBrandFiles = new Set([
  ...['light','dark'].flatMap(theme => [340,510,680].map(width => `assets/product-proof/brand-${theme}-v05-${width}.webp`)),
  'assets/product-proof/apple-touch-icon-v05-180.png',
  'assets/site-ui/favicon.59d331b98f38.webp',
  'assets/brand/v06/icons/favicon.ico',
  'assets/site-ui/site.3bdb33dbae94.js',
  'assets/site-ui/site.750c35ca1506.css',
]);
const retained = release.files.map(f=>f.path).filter(p =>
  !(release.planningFiles || []).includes(p) &&
  !retiredBrandFiles.has(p) &&
  !p.startsWith('assets/brand/v06/') &&
  (!/^assets\/site-ui\/product-detail\.[a-f0-9]{12}\.css$/.test(p) || p === release.resources['product-detail.css']) &&
  (!/^assets\/site-ui\/site\.[a-f0-9]{12}\.(?:css|js)$/.test(p) || [release.resources['styles.css'], release.resources['script.js']].includes(p)) &&
  !p.startsWith('assets/reader-pack/')
);
// One repeatable navigation change across content, utility and resource pages.
for (const file of new Set([...retained, ...managed, ...productDetailFiles].filter(file=>file.endsWith('.html')))) {
  let html = read(file).replace(/<link rel="stylesheet" href="\/assets\/site-ui\/evaluation-entry\.[a-f0-9]+\.css">/g, '');
  html = html.replace('</head>', `<link rel="stylesheet" href="${entryCss}"></head>`);
  const resourcePage = routes.some(route=>file===`${route}/index.html`);
  html = html.replace(/<nav class="nav-links"[^>]*>[\s\S]*?<\/nav>/, nav=>{
    nav = nav.replace(/<a href="\/reader-pack\/"[^>]*>Evaluate<\/a>/g, '');
    return nav.replace(/(<a href="\/architecture\/"[^>]*>Architecture<\/a>)/, `$1<a href="/reader-pack/"${resourcePage ? ` aria-current="${file==='reader-pack/index.html'?'page':'true'}"` : ''}>Evaluate</a>`);
  });
  write(file, html);
}
release.planningFiles = managed;
release.version = '2026-10-01-asoc-product-content-consolidation';
release.candidate = {name: 'asoc-product-content-consolidation-20261001', productionPublicationApproved: false};
const refreshedMediaDestinations = new Set([
  ...refreshedMediaFiles.map(file => '/' + file),
  ...candidateProvisionedMedia.map(record => record.destination),
]);
release.media = release.media.filter(record =>
  !/\/assets\/(?:product-proof\/(?:brand-(?:light|dark)-v05-\d+\.webp|apple-touch-icon-v05-180\.png)|brand\/v06\/)/.test(record.destination) &&
  !refreshedMediaDestinations.has(record.destination)
);
for (const file of refreshedMediaFiles) {
  const bytes = readFileSync(path.join(root, file));
  release.media.push({destination: '/' + file, sha256: sha(bytes), bytes: bytes.length});
}
release.media.push(...candidateProvisionedMedia);
release.files = [...new Set([...retained,...brandFiles,...candidatePublicMedia,...productDetailFiles,...managed])].map(file=>{const bytes=readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:sha(bytes)};});
write('site-release.json',JSON.stringify(release,null,2)+'\n');
console.log(`Prepared ${routes.length} evaluation routes for the ASOC candidate; no publication.`);
