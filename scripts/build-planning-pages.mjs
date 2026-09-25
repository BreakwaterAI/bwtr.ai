import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readerPage, plannerPage} from './planners/page-templates.mjs';
import {releaseCorrections} from './planners/release-corrections.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(path.join(root, name), 'utf8');
const sha = data => createHash('sha256').update(data).digest('hex');
const write = (name, data) => { mkdirSync(path.dirname(path.join(root, name)), {recursive: true}); writeFileSync(path.join(root, name), data); };
const release = JSON.parse(read('site-release.json'));
const readers = JSON.parse(read('scripts/planners/reader-pack.json'));
const chapters = JSON.parse(read('scripts/planners/chapter-outcomes.json'));
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
const hubScript = asset('reader-hub', read('scripts/planners/reader-hub.js'), 'js');
const template = read('research/index.html');
const oldTitle = 'Research and teaching | Breakwater';
const oldDescription = 'Explore Breakwater research themes in distributed systems, adversarial methods, cryptography and AI, alongside teaching resources.';
function page(route, title, description, body, planner = false) {
  let html = template.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${body}</main>`)
    .replaceAll(oldTitle, title).replaceAll(oldDescription, description)
    .replaceAll('https://www.bwtr.ai/research/', `https://www.bwtr.ai/${route}/`)
    .replace('</head>', `<meta name="referrer" content="no-referrer"><link rel="stylesheet" href="${css}">${planner ? `<script type="module" src="${script}"></script>` : ''}</head>`);
  assert(html.includes(`<title>${title}</title>`));
  const file = `${route}/index.html`; write(file, html); managed.push(file);
}
const cards = `<div class="evaluation-cards"><article><span class="eyebrow">Read</span><h3>Product reader pack</h3><p>Compare Secure, Assure and SOAR through product overviews, evaluation briefs and guides.</p><a class="text-link" href="/reader-pack/">Explore the reader pack <span aria-hidden="true">→</span></a></article><article><span class="eyebrow">Scope</span><h3>PoC planner</h3><p>Define a proof of concept: footprint, data boundaries and responsibilities to review with your team.</p><a class="text-link" href="/poc-planner/">Build an evaluation brief <span aria-hidden="true">→</span></a></article><article><span class="eyebrow">Prioritize</span><h3>PQC planner</h3><p>Explore post-quantum migration timing and priorities using your own planning assumptions.</p><a class="text-link" href="/pqc-planner/">Frame a migration review <span aria-hidden="true">→</span></a></article></div>`;
const entryHeadings = {'index.html':'Take the next step in your evaluation.', 'research/index.html':'Put the research in context.', 'products/index.html':'Prepare your product evaluation.', 'architecture/index.html':'Turn the design into an evaluation scope.'};
for (const [file, heading] of Object.entries(entryHeadings)) {
  let html = read(file);
  html = html.replace(/<section class="wrap section rule" id="planning-resources"[^>]*>[\s\S]*?<\/section>/g, '');
  const hub = `<section class="wrap section rule" id="planning-resources" aria-labelledby="evaluation-heading"><div class="section-heading"><h2 id="evaluation-heading">${heading}</h2></div>${cards}</section>`;
  assert(html.includes('<section class="section contact"'), `${file}: missing contextual insertion point`);
  write(file, html.replace('<section class="section contact"', hub + '<section class="section contact"'));
}
const names = {secure:'Secure',assure:'Assure',soar:'SOAR'};
const nameFor = slug => slug === 'portfolio-overview' ? 'Portfolio overview' : slug === 'pilot-engagement-outline' ? 'Pilot engagement outline' : slug.split('-').map((s,i) => i ? s : names[s]).join(' ');
for (const doc of readers.documents) {
  const bytes = readFileSync(path.join(root, 'assets/reader-pack', doc.file));
  assert.equal(sha(bytes), doc.sha256); assert.equal(bytes.length, doc.bytes);
  managed.push('assets/reader-pack/' + doc.file);
}
page('reader-pack', 'Product reader pack | Breakwater', 'Public product overviews, evaluation briefs and guides for Breakwater Secure, Assure and SOAR.', readerPage(readers,chapters).replace('/assets/site-ui/RESOURCE_HUB_SCRIPT',hubScript));
for (const kind of ['poc','pqc']) {
  const title = kind === 'poc' ? 'PoC deployment planner' : 'PQC migration planner';
  const description = kind === 'poc' ? 'Frame the scope, deployment boundaries and design targets for a Breakwater evaluation.' : 'Explore cryptographic migration priorities using explicit questionnaire assumptions.';
  page(kind+'-planner', title+' | Breakwater', description, plannerPage(kind), true);
}
const routes = ['reader-pack','poc-planner','pqc-planner'];
release.routes = release.routes.filter(r => !routes.some(x=>r.route===`/${x}/`));
for(const route of routes) release.routes.push({route:`/${route}/`,canonical:`https://www.bwtr.ai/${route}/`,socialImage:'https://www.bwtr.ai/assets/breakwater-social-home.png'});
const sitemapOrder = ['', 'products', 'architecture', 'research', 'about', 'security', 'airports', 'power-utilities', 'connected-industry', 'healthcare', ...routes];
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapOrder.map(r=>`  <url><loc>https://www.bwtr.ai/${r ? r+'/' : ''}</loc></url>`).join('\n') + '\n</urlset>\n');
const retained = release.files.map(f=>f.path).filter(p=>!(release.planningFiles || []).includes(p));
// One repeatable navigation change across content, utility and resource pages.
for (const file of new Set([...retained, ...managed].filter(file=>file.endsWith('.html')))) {
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
release.candidate = {name: 'marketing-resources-20260924', productionPublicationApproved: false};
release.files = [...new Set([...retained,...managed])].map(file=>{const bytes=readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:sha(bytes)};});
write('site-release.json',JSON.stringify(release,null,2)+'\n');
console.log(`Prepared ${routes.length} routes, ${readers.documents.length} public PDFs; no publication.`);
