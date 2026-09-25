import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const root = path.resolve(process.argv[2]);
assert(existsSync(path.join(root,'asset-manifest.json')), 'Use only a built public artifact');
const evidence = '/tmp/bwtr-planner-browser-20260924'; mkdirSync(evidence,{recursive:true});
const browser = await chromium.launch();
const errors=[], external=[], requests=[];
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
let checks=0;
try {
 const context=await browser.newContext({reducedMotion:'reduce',acceptDownloads:true});
 await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());requests.push({method:request.method(),url:request.url()});
   if(url.origin!=='http://localhost:4177') {external.push(request.url());return route.abort();}
   let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   assert(file.startsWith(root+path.sep)||file===root);
   if(existsSync(file)&&statSync(file).isDirectory())file=path.join(file,'index.html');
   assert(existsSync(file),'missing public asset '+url.pathname);
   return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,768,1440]) for(const theme of ['light','dark']) {
   await page.setViewportSize({width,height:900});await page.goto('http://localhost:4177/products/');
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
   for(const product of ['secure','assure','soar']) assert.equal(await page.locator(`#${product} .product-site-link`).getAttribute('href'),`https://${product}.bwtr.ai/`);
   assert.deepEqual(await page.locator('#access a').evaluateAll(links=>links.map(a=>a.href)),['https://secure.bwtr.ai/app','https://assure.bwtr.ai/app/login','https://soar.bwtr.ai/app']);
   assert.equal(await page.locator('a[href*="console.html"]').count(),0);
   for(const [route,selector,name] of [['','.industry-card .context-crop','home-utilities'],['power-utilities/','.sector-photo .context-crop','utilities-hero']]) {
     await page.goto('http://localhost:4177/'+route);
     const crop=page.locator(selector);await crop.scrollIntoViewIfNeeded();await crop.locator('img').evaluate(img=>img.decode());
     assert(await crop.evaluate(frame=>{const a=frame.getBoundingClientRect(),b=frame.querySelector('img').getBoundingClientRect();return getComputedStyle(frame).overflow==='hidden'&&a.top-b.top>1&&b.bottom-a.bottom>1&&a.left-b.left>1&&b.right-a.right>1;}));
     await crop.screenshot({path:path.join(evidence,`${name}-${width}-${theme}.png`)});
   }
   checks++;
 }
 const release=JSON.parse(readFileSync(new URL('../site-release.json',import.meta.url)));
 for(const file of release.files.filter(f=>f.path.endsWith('.html'))) {
   const html=readFileSync(path.join(root,file.path),'utf8');
   assert.doesNotMatch(html,/https:\/\/asoc\.bwtr\.ai|https:\/\/assure\.bwtr\.ai\/console\.html/);
   const nav=html.match(/<nav class="nav-links"[^>]*>[\s\S]*?<\/nav>/)?.[0];
   assert(nav,file.path+' navigation');
   assert.deepEqual([...nav.matchAll(/<a[^>]*>([^<]+)/g)].map(m=>m[1]),['Products','Industries','Architecture','Evaluate','Company','Talk to us']);
   assert.equal((html.match(/evaluation-entry\.[a-f0-9]+\.css/g)||[]).length,1);
   const active=/^(reader-pack|poc-planner|pqc-planner)\//.test(file.path);
   assert.equal(/href="\/reader-pack\/" aria-current=/.test(nav),active);
   checks++;
 }
 for(const route of ['', 'products/', 'architecture/', 'research/']) {
   await page.goto('http://localhost:4177/'+route);
   assert.equal(await page.locator('.evaluation-cards article').count(),3);
   assert.equal(await page.locator('.evaluation-cards br').count(),0);
   assert.deepEqual(await page.locator('.evaluation-cards a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),['/reader-pack/','/poc-planner/','/pqc-planner/']);
   assert(await page.evaluate(()=>Boolean(document.querySelector('#planning-resources').compareDocumentPosition(document.querySelector('section.contact'))&Node.DOCUMENT_POSITION_FOLLOWING)));
   for(const width of [320,390,768,900,901,1000,1001,1024,1100,1101,1440]) for(const theme of ['light','dark']) {
     await page.setViewportSize({width,height:900});
     if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' entry overflow '+width);
     assert(await page.evaluate(()=>{const els=[...document.querySelector('.nav').children].filter(e=>getComputedStyle(e).display!=='none');const rects=els.map(e=>e.getBoundingClientRect());return rects.every((a,i)=>rects.slice(i+1).every(b=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1));}),route+' header collision '+width);
     if(width===1440||width===390) {
       await page.locator('#planning-resources').scrollIntoViewIfNeeded();
       await page.screenshot({path:path.join(evidence,`${route.replace('/','')||'home'}-entries-${width}-${theme}.png`)});
     }
     checks++;
   }
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4177/');
 await page.locator('[data-menu]').click();await page.locator('.nav-links a[href="/reader-pack/"]').focus();
 await page.keyboard.press('Enter');await page.waitForURL('**/reader-pack/');
 assert.equal(await page.locator('.nav-links a[aria-current="page"]').innerText(),'Evaluate');checks++;
 for(const route of ['reader-pack','poc-planner','pqc-planner']) {
   for(const width of [320,390,768,1440]) {
     await page.setViewportSize({width,height:900});await page.goto(`http://localhost:4177/${route}/`);
     if(route!=='reader-pack')await page.getByRole('radio').first().waitFor();
     for(const theme of ['light','dark']) {
       if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
       assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
       await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
       assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
       assert.equal(await page.locator('h1').count(),1);checks++;
       if(width===1440&&theme==='light')await page.screenshot({path:path.join(evidence,route+'-desktop.png')});
     }
   }
 }
 for(const kind of ['poc','pqc']) {
   await page.goto(`http://localhost:4177/${kind}-planner/`);
   await page.getByRole('button',{name:'Continue',exact:true}).click();
   await page.getByRole('status').filter({hasText:'Choose an option'}).waitFor();checks++;
   for(let step=0;step<10;step++) {
     await page.getByRole('radio').first().check();
     if(step===1) {await page.getByRole('button',{name:'Back',exact:true}).click();assert(await page.getByRole('radio').first().isChecked());await page.getByRole('button',{name:'Continue',exact:true}).click();}
     await page.getByRole('button',{name:step===9?'Create my draft plan':'Continue',exact:true}).click();
   }
   const resultTitle=kind==='poc'?'Your draft evaluation plan':'Your draft migration plan';
   await page.getByRole('heading',{name:resultTitle}).waitFor();
   if(kind==='poc') {
     assert.equal(await page.getByText('1 collection point',{exact:true}).count(),1);
     assert.doesNotMatch(await page.locator('[data-planner]').innerText(),/\b1 collection points\b/);checks++;
   }
   assert(await page.getByText('Your selected assumptions',{exact:true}).isVisible());
   await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(evidence,kind+'-result-desktop.png')});
   assert(!page.url().includes('plan='),'answers are not automatically serialized');
   assert.equal(await page.evaluate(()=>sessionStorage.length),0);
   assert(!(await page.evaluate(()=>Object.keys(localStorage))).some(k=>/plan|answer/.test(k)));checks++;
   await page.getByRole('button',{name:'Create share link',exact:true}).click();
   const share=await page.locator('[data-share-link]').inputValue();assert(share.includes('#plan='));assert(!share.includes('?plan='));
   const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();
   const download=await downloadPromise;const data=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(Object.keys(data.answers).length,10);assert.equal(data.planner,kind);checks++;
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:path.join(evidence,kind+'-mobile.png'),fullPage:true});
   await page.emulateMedia({media:'print'});
   assert(!(await page.locator('.planner-actions').isVisible()));
   await page.pdf({path:path.join(evidence,kind+'-plan.pdf'),format:'A4',printBackground:true,tagged:true});
   await page.emulateMedia({media:'screen'});
   await page.goto(share);await page.getByRole('heading',{name:resultTitle}).waitFor();checks++;
   await page.getByRole('button',{name:'Edit answers',exact:true}).click();assert(await page.getByRole('radio').first().isChecked());
   await page.goto(share);await page.getByRole('button',{name:'Start over',exact:true}).click();
   assert.equal(await page.getByRole('radio',{checked:true}).count(),0);assert(!page.url().includes('#plan='));checks++;
   for(const fragment of ['<script>alert(1)</script>','x'.repeat(401)]) {
     await page.goto(`http://localhost:4177/${kind}-planner/#plan=${encodeURIComponent(fragment)}`);
     await page.getByRole('radio').first().waitFor();assert.equal(await page.locator('[data-planner] script').count(),0);checks++;
   }
 }
 await page.goto('http://localhost:4177/reader-pack/');assert.equal(await page.locator('a[href$=".pdf"]').count(),11);checks++;
 assert.equal(await page.locator('.reader-product').count(),3);
 await page.locator('.reader-product a[href="#chapters-secure"]').click();
 await page.waitForFunction(()=>document.querySelector('#chapters-secure').open);
 assert(await page.locator('#chapters-secure details').count()>8);checks++;
 for(const kind of ['poc','pqc']) {
   await page.goto(`http://localhost:4177/${kind}-planner/`);
   await page.getByRole('radio').first().waitFor();
   await page.locator('legend').click();await page.keyboard.press('2');
   assert.equal(await page.locator('progress').getAttribute('value'),'1');
   assert(await page.getByRole('radio').nth(1).isChecked());await page.keyboard.press('Enter');
   await page.locator('legend').click();await page.keyboard.press('ArrowLeft');
   assert(await page.getByRole('radio').nth(1).isChecked());checks++;
   for(let i=0;i<10;i++) {await page.getByRole('radio').first().check();await page.locator('[data-action="continue"]').click();}
   assert.equal(await page.locator('.plan-jump button').count(),6);
   assert.equal(await page.locator('.plan-glance > div').count(),6);
   await page.locator('.plan-jump button').nth(2).click();
   await page.waitForFunction(()=>document.querySelector('.plan-jump button:nth-child(3)').hasAttribute('aria-current'));
   assert(!page.url().includes('plan='));
   assert(!/—|Owner: customer|QASO|ASOC/.test(await page.locator('[data-planner]').innerText()));
   const boxes=page.locator('[data-check]');
   for(let i=0;i<await boxes.count();i++)await boxes.nth(i).check();
   assert.match(await page.locator('[data-check-count]').innerText(),/ready for team discussion/);
   const mail=await page.locator('[data-discuss]').getAttribute('href');
   assert(mail.startsWith('mailto:hello@bwtr.ai?'));assert(decodeURIComponent(mail).includes('Not deployment approval'));
   await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('blocked');};});
   await page.locator('[data-action="summary"]').click();
   assert((await page.locator('[data-copy-fallback]').inputValue()).includes('Breakwater'));checks++;
   if(kind==='poc') {
     assert.equal(await page.locator('.plan-spec-card').count(),3);
     await page.getByText('Threat model · STRIDE',{exact:true}).click();
     assert.equal(await page.getByRole('columnheader',{name:'Elevation of privilege'}).count(),1);
     assert.equal(await page.getByRole('rowheader',{name:'Response adapter (process)'}).count(),0);
   } else {
     assert.equal(await page.locator('.plan-equation > div').count(),3);
     assert.equal(await page.locator('.plan-domain').count(),4);
     assert.equal(await page.locator('.plan-references a').count(),5);
   }
   for(const width of [320,390,768,1440]) for(const theme of ['light','dark']) {
     await page.setViewportSize({width,height:900});
     if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
     await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result overflow');
     const target=page.locator('.plan-section').first();await target.scrollIntoViewIfNeeded();
     await page.locator('.plan-jump button').first().click();
     assert.equal(await page.locator('.plan-jump button[aria-current]').count(),1);
     if([390,1440].includes(width))await page.screenshot({path:path.join(evidence,`${kind}-detail-${width}-${theme}.png`)});
     checks++;
   }
   await page.locator('[data-action="edit"]').click();
   for(let i=0;i<10;i++)await page.locator('[data-action="continue"]').click();
   assert.equal(await page.locator('[data-check]:checked').count(),0);checks++;
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert(requests.every(r=>r.method==='GET'));
 console.log(JSON.stringify({status:'PASS',checks,externalRequests:external.length,exceptions:errors.length,realSubmissions:0,evidence}));
} finally {await browser.close();}
