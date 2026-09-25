import {plannerQuestions, createRecommendation} from './poc-model.js';
import {pqcQuestions, createPqcPlan} from './pqc-model.js';

const root = document.querySelector('[data-planner]'), kind = root.dataset.planner;
const questions = kind === 'poc' ? plannerQuestions : pqcQuestions;
const generate = kind === 'poc' ? createRecommendation : createPqcPlan;
const status = document.querySelector('[data-planner-status]');
let answers = Object.create(null), step = 0, result, checked = new Set(), observer;
let trackSection=()=>{}, scrollFrame=0;
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;trackSection();});},{passive:true});
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const years = n => `${n} ${n===1?'year':'years'}`;
const icon = (type = 'network') => `<svg class="plan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${({network:'<rect x="8" y="2" width="8" height="6" rx="1"/><path d="M12 8v6M4 18v-4h16v4"/><rect x="1" y="18" width="6" height="4" rx="1"/><rect x="17" y="18" width="6" height="4" rx="1"/>',server:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M6 6h2M6 12h2M6 18h2"/>',shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 12l3 3 5-6"/>',document:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>'})[type]}</svg>`;
const qIcon = id => ['retention','shelf','horizon','program'].includes(id) ? 'clock' : ['source','inventory','compliance'].includes(id) ? 'document' : ['response','crown','agility'].includes(id) ? 'shield' : 'network';
const message = text => { status.textContent = text; };
function focusHeading() { const h = root.querySelector('legend, h2'); h.tabIndex = -1; h.focus({preventScroll:true}); h.scrollIntoView({block:'center',behavior:'instant'}); }
function act(name, handler) { root.querySelectorAll(`[data-action="${name}"]`).forEach(node => node.addEventListener('click', handler)); }
const action = (name, label, primary = false) => `<button type="button" class="plan-button${primary ? ' primary' : ''}" data-action="${name}">${label}</button>`;
function showQuestion() {
  observer?.disconnect(); trackSection=()=>{}; result = undefined; document.body.classList.remove('planner-is-result');
  const q = questions[step], count = Object.keys(answers).length;
  root.innerHTML = `<div class="plan-progress-label"><span>YOUR ${kind === 'poc' ? 'EVALUATION' : 'MIGRATION'} BRIEF</span><span>${count} of ${questions.length} answered</span></div>
    <progress class="planner-progress" max="${questions.length}" value="${count}" aria-label="Questions answered">${count} / ${questions.length}</progress>
<nav class="planner-trail" aria-label="Review your answers">${questions.map((item,i) => `<button type="button" data-step="${i}" ${!answers[item.id] && i !== step ? 'disabled' : ''} ${i===step ? 'aria-current="step"' : ''} title="${esc(item.question)}">${icon(qIcon(item.id))}<span>${esc(item.options.find(o=>o.id===answers[item.id])?.title || item.eyebrow.split('·')[1]?.trim() || item.id)}</span>${answers[item.id] ? '<b aria-label="answered">✓</b>' : ''}</button>`).join('')}</nav>
    <fieldset class="plan-question"><legend>${esc(q.question)}</legend><div class="plan-question-layout"><div class="plan-question-context"><span class="eyebrow">${esc(q.eyebrow)}</span><p>${esc(q.context)}</p><div class="plan-output-note">${icon('document')}<p>${kind==='poc' ? 'Your answers shape a deployment sketch, sizing targets and an owner checklist.' : 'Your answers shape a timing scenario, domain priorities and a phased roadmap.'}</p></div></div>
    <div class="planner-choices">${q.options.map((option,i)=>`<label class="planner-choice"><input type="radio" name="${q.id}" value="${option.id}" ${answers[q.id]===option.id?'checked':''}><span class="option-index" aria-hidden="true">${i+1}</span><span><strong>${esc(option.title)}</strong><span>${esc(option.description)}</span></span></label>`).join('')}</div></div></fieldset>
    <div class="plan-question-footer"><button type="button" class="plan-button" data-action="back" ${step===0?'disabled':''}>Back</button><p><kbd>1</kbd>–<kbd>${q.options.length}</kbd> select · <kbd>Enter</kbd> continue · <kbd>←</kbd> back</p>${action('continue',step===questions.length-1?'Create my draft plan':'Continue',true)}</div>`;
  root.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.step);message('');showQuestion();focusHeading();}));
  root.querySelectorAll('input[type="radio"]').forEach(r=>r.addEventListener('change',()=>{
    answers[q.id]=r.value;checked.clear();message('');
    const completed=Object.keys(answers).length;
    root.querySelector('progress').value=completed;
    root.querySelector('.plan-progress-label span:last-child').textContent=`${completed} of ${questions.length} answered`;
  }));
  act('back',back); act('continue',next);
}
function back() { if(step>0){step--;message('');showQuestion();focusHeading();} }
function next() {
  if(!answers[questions[step].id]) {message('Choose an option to continue.');return;}
  if(step<questions.length-1){step++;message('');showQuestion();focusHeading();return;}
  try{result=generate(answers);message('');showResult();focusHeading();}
  catch(error){message(error.message+' Select a previous question above to revise your choices.');}
}
document.addEventListener('keydown', event=>{
  if(result || event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || ['TEXTAREA','SELECT'].includes(event.target.tagName) || event.target.matches('input:not([type="radio"])'))return;
  const index=Number(event.key)-1;
  if(index>=0&&index<questions[step].options.length){event.preventDefault();const radio=root.querySelectorAll('input[type="radio"]')[index];radio.checked=true;radio.dispatchEvent(new Event('change'));radio.focus();}
  else if(event.key==='Enter'&&!event.target.closest('button,a')){event.preventDefault();next();}
  else if(event.key==='ArrowLeft'&&!event.target.matches('input')){event.preventDefault();back();}
});
const section = (id,kicker,title,lead,body) => `<section id="plan-${id}" class="plan-section"><header class="plan-section-heading"><p class="eyebrow">${kicker}</p><h3>${title}</h3>${lead?`<p>${lead}</p>`:''}</header>${body}</section>`;
const rows = items => `<dl class="plan-specs">${items.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
const list = items => `<ul class="plan-list">${items.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`;
const details = (title,body) => `<details class="plan-details"><summary>${title}</summary>${body}</details>`;
function table(headers,data,label) {return `<div class="plan-table-scroll" role="region" aria-label="${label}" tabindex="0"><table class="plan-table"><caption>${label}</caption><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${data.map(row=>`<tr>${row.map((value,i)=>i===0?`<th scope="row">${esc(value)}</th>`:`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function checklist() {return `<div class="plan-check-status"><strong data-check-count>0 / ${result.caveats.length} reviewed</strong><span>Local review only. This does not authorize deployment or changes.</span></div><div class="plan-checklist">${result.caveats.map((item,i)=>`<label><input type="checkbox" data-check="${i}"><span>${esc(item)}</span></label>`).join('')}</div>`;}
function architecture() {
  const r=result, isolated=['window','airgap'].includes(answers.connectivity), executes=['lab','adapter'].includes(answers.response);
  const node=(title,text)=>`<div class="plan-flow-node"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
  return `<figure class="plan-blueprint"><figcaption>Illustrative deployment sketch · selected design targets</figcaption><div class="plan-flow-grid"><div><h4>${icon('network')} Your environment</h4>${node(r.networkLabel,r.estateLabel)}${node('Secure collectors',r.collectionLabel)}${node('Assure workers',r.sourceLabel)}<p class="plan-custody">Raw captures and source: define local custody and approved export rules.</p></div><div class="plan-transfer"><span aria-hidden="true">→</span><strong>${isolated?'Signed offline packages':'Collector-initiated transfer'}</strong><p>${esc(r.flow)}</p></div><div><h4>${icon('server')} Proposed platform</h4>${node('Secure + Assure','Named findings and supporting records')}${node('SOAR',r.responseLabel)}${node('Inference',r.inferenceLabel)}<p class="plan-custody">${executes?'Separately approved action scope, rollback and fresh verification.':'No execution path. Review and handoff stay with your team.'}</p></div></div></figure>
    ${details('Placement, data custody and inference',rows([['Environment',r.environmentPlan],['Collection',r.collectionMode],['Source boundary',r.sourcePlan],['Inference boundary',r.inferencePlan],['Response authority',r.responseMode]]))}
    <div class="plan-sequences">${r.sequences.map(s=>details(`${esc(s.product)} · evidence sequence`,`<ol class="plan-hops">${s.steps.map(([from,to,what])=>`<li><strong>${esc(from)} <span aria-hidden="true">→</span> ${esc(to)}</strong><p>${esc(what)}</p></li>`).join('')}</ol>`)).join('')}</div>`;
}
function pocSections() {
  const r=result;
  const spec=(title,type,data)=>`<article class="plan-spec-card"><h4>${icon(type)}${title}</h4>${rows(data)}</article>`;
  return section('capacity','01 / FOOTPRINT','A starting point for capacity.','Sizing targets for your chosen scope. Benchmark representative traffic, repositories and concurrent work before committing hardware.',`<div class="plan-hardware">${spec('Central server','server',[['Compute',r.central.cpu],['Memory',r.central.memory],['Storage',r.central.storage],['Accelerator',r.central.gpu],['Network',r.central.network]])}${spec('Secure collectors','network',[['Placement',`${r.collector.count}${answers.networks==='twelve'?'+':''} collection point${r.collector.count===1?'':'s'}`],['Compute',r.collector.cpu],['Memory',r.collector.memory],['Local buffer',r.collector.storage],['Network',r.collector.network]])}${spec('Assure workers','document',[['Workers',r.sourceWorkers],['Input',r.sourceLabel],['Isolation','Read-only, ephemeral workspace'],['Boundary',r.sourcePlan]])}</div>`)
    +section('architecture','02 / DATA FLOW','Keep the boundaries visible.','A reference layout shaped by your answers, not an installed topology. Confirm supported connectors and deployment modes with engineering.',architecture())
    +section('software','03 / RESPONSIBILITIES','Agree who provides what.','Use these proposed responsibilities to prepare the evaluation scope. Availability and support belong in the agreed statement of work.',`<div class="plan-two-col">${['customer','vendor'].map(owner=>`<article class="plan-panel"><h4>${icon(owner==='customer'?'shield':'server')}${owner==='customer'?'You provide':'Breakwater scope to confirm'}</h4><ul class="plan-responsibilities">${r.software.filter(x=>x.owner===owner).map(x=>`<li><strong>${esc(x.label)}</strong><p>${esc(x.text)}</p></li>`).join('')}</ul></article>`).join('')}</div>`)
    +section('security','04 / SECURITY REVIEW','Turn controls into acceptance checks.','These are proposed controls to validate, not assurances about an existing installation.',table(['Control to validate','Risk addressed'],r.controls.map(x=>[x.control,x.defends]),'Evaluation controls')+`<aside class="plan-notice"><h4>Customer-owned controls</h4>${list(r.customerControls)}</aside>`+details('Threat model · STRIDE',`<p class="plan-detail-intro">Review each threat category against the chosen configuration. “Not specified” means this planner supplies no control for that cell.</p>${table(['Boundary','Spoofing','Tampering','Repudiation','Information disclosure','Denial of service','Elevation of privilege'],r.threatModel.map(x=>[x.element,x.s,x.t,x.r,x.i,x.d,x.e]),'Proposed STRIDE controls')}`)+details('Evidence and failure-mode checks',list(r.assessment)))
    +section('boundaries','05 / REVIEW','Confirm the limits with your team.','Reviewing these items records your understanding in this browser only.',checklist())
    +section('next','06 / NEXT STEP','Bring the plan to a scope review.','Agree owners, evidence boundaries and measurable acceptance criteria before installation.',nextActions());
}
function pqcSections() {
  const r=result,m=r.mosca;
  const refs=`<div class="plan-references"><h4>Method and standards</h4><a href="https://doi.org/10.1109/MSP.2018.3761723" target="_blank" rel="noopener noreferrer">Mosca · Cybersecurity in an Era with Quantum Computers (2018) ↗</a><a href="https://csrc.nist.gov/projects/post-quantum-cryptography" target="_blank" rel="noopener noreferrer">NIST Post-Quantum Cryptography project ↗</a>${[['203','ML-KEM'],['204','ML-DSA'],['205','SLH-DSA']].map(([n,name])=>`<a href="https://csrc.nist.gov/pubs/fips/${n}/final" target="_blank" rel="noopener noreferrer">FIPS ${n} · ${name} ↗</a>`).join('')}</div>`;
  return section('urgency','01 / TIMING SCENARIO','Make the timing assumptions explicit.','Mosca’s inequality compares how long data must remain confidential (X), how long migration may take (Y), and an assumed quantum-threat horizon (Z).',`<div class="plan-equation" aria-label="Data lifetime plus migration time compared with assumed quantum horizon"><div><span>X · DATA LIFETIME</span><strong>${m.x}<small>${m.x===1?'year':'years'}</small></strong><p>How long the data must stay confidential</p></div><b>+</b><div><span>Y · MIGRATION</span><strong>${m.y}<small>${m.y===1?'year':'years'}</small></strong><p>Estimated from your selected constraints</p></div><b>${m.late>0?'&gt;':'≤'}</b><div><span>Z · HORIZON</span><strong>${m.z}<small>${m.z===1?'year':'years'}</small></strong><p>Your assumed scenario, not a forecast</p></div></div><div class="plan-verdict"><strong>${esc(m.band)} scenario priority</strong><p>${esc(m.verdict)}</p></div><p class="plan-explanation">When X + Y exceeds Z, the assumptions point to a confidentiality window that migration may not cover. This helps frame the risk of data being collected now and decrypted later. It does not establish that data has been captured or that a quantum computer will arrive on a particular date.</p>${details('How the timing estimate is calculated',`<p class="plan-detail-intro">X and Z map to your selected ranges. Y begins with your completion target, then adds heuristic adjustments for capacity, crypto-agility and vendor dependencies, with a one-year minimum. Domain priority weights reflect your selected surface and highest-value asset. Neither the timing nor the priority band is a measured probability.</p>`)}${refs}`)
    +section('domains','02 / DOMAIN PRIORITIES','Start with the dependencies that matter.','A questionnaire-weighted order for investigation. Validate it against a cryptography inventory and supplier support.',`<div class="plan-domain-grid">${r.domains.map(d=>`<article class="plan-domain"><header><span class="plan-rank">${d.priority}</span><div><h4>${esc(d.name)}</h4><span class="plan-badge">${esc(d.urgency)} · scenario priority</span></div></header><p><strong>Evaluate</strong>${esc(d.target)}</p><p><strong>First step</strong>${esc(d.first)}</p></article>`).join('')}</div>`)
    +section('roadmap','03 / DELIVERY GATES','Move through the migration in stages.','Assign an owner to each exit gate before advancing. Confirm protocol support, interoperability and recovery at every change.',`<ol class="plan-roadmap">${r.roadmap.map(p=>`<li><span>${String(p.n).padStart(2,'0')}</span><div><h4>${esc(p.phase)}</h4><p><strong>Exit gate</strong> ${esc(p.gate)}</p></div></li>`).join('')}</ol>`)
    +section('responsibilities','04 / OWNERSHIP','Your team owns the migration.','Evaluate where Breakwater can support inventory and review. Key, certificate and production changes remain separately authorized work.',`<div class="plan-two-col"><article class="plan-panel"><h4>${icon('document')}Breakwater scope to evaluate</h4>${list(r.weProvide)}</article><article class="plan-panel"><h4>${icon('shield')}You own and authorize</h4>${list(r.customerControls)}</article></div>`)
    +section('assurance','05 / VALIDATION','Test the assumptions against evidence.','The questionnaire has not inspected an inventory, tested a protocol or established compliance.',`<div class="plan-assessment">${r.assessment.map(v=>`<article>${icon('shield')}<p>${esc(v)}</p></article>`).join('')}</div>`)
    +section('confirm','06 / REVIEW & SHARE','Prepare for the migration discussion.','Confirm the assumptions with the cryptography, application and operational owners.',checklist()+nextActions());
}
function nextActions() {return `<div class="plan-next"><p>Download or print your draft, then review it with the team. Sending an email is your choice; the planner does not submit anything.</p><div class="planner-actions">${action('print','Print / save PDF')}${action('download','Download JSON')}${action('summary','Copy summary')}${action('share','Create share link')}${action('reset','Start over')}<a class="plan-button primary" data-discuss href="#">Discuss with Breakwater ↗</a></div><p class="plan-small">The discussion link opens an email draft to hello@bwtr.ai containing your plan summary. Review it before sending.</p></div>`;}
function summary() {return [`Breakwater ${kind==='poc'?'PoC evaluation':'PQC migration'} draft`,result.summary,result.status,'',...(kind==='poc'?[`Central: ${Object.values(result.central).join(' | ')}`,`Collection: ${result.collectionLabel}`,`Connectivity: ${result.flow}`,`Response: ${result.responseMode}`]:[result.mosca.verdict,`First domain: ${result.domains[0].name}`]),'',`Limits reviewed locally: ${checked.size} / ${result.caveats.length}. Not deployment approval.`].join('\n');}
function updateReview() {
  root.querySelector('[data-check-count]').textContent=`${checked.size} / ${result.caveats.length} reviewed${checked.size===result.caveats.length?' · ready for team discussion':''}`;
  root.querySelector('[data-discuss]').href=`mailto:hello@bwtr.ai?subject=${encodeURIComponent(`Breakwater ${kind.toUpperCase()} plan review`)}&body=${encodeURIComponent(summary())}`;
}
async function copy(text,label) {
  try{await navigator.clipboard.writeText(text);message(`${label} copied. Review before sharing.`);}
  catch{let area=root.querySelector('[data-copy-fallback]');if(!area){area=document.createElement('textarea');area.readOnly=true;area.dataset.copyFallback='';area.setAttribute('aria-label',`${label} to copy`);root.querySelector('.plan-next').append(area);}area.value=text;area.focus();area.select();message('Clipboard unavailable. Select and copy the text shown.');}
}
function showResult() {
  document.body.classList.add('planner-is-result');
  const r=result;
  const sections=kind==='poc'?[['capacity','Hardware'],['architecture','Architecture'],['software','Responsibilities'],['security','Security'],['boundaries','Checklist'],['next','Next step']]:[['urgency','Timing'],['domains','Priorities'],['roadmap','Roadmap'],['responsibilities','Ownership'],['assurance','Validation'],['confirm','Review & share']];
  const metrics=kind==='poc'?[['Zones',r.networkLabel],['Assets',r.assetsLabel],['Inference',r.inferenceLabel],['Accelerator',r.central.gpu],['Retention',r.retentionLabel],['Connectivity',r.connectivityLabel]]:[['Scenario priority',r.mosca.band],['Data lifetime',years(r.mosca.x)],['Migration estimate',years(r.mosca.y)],['Assumed horizon',years(r.mosca.z)],['Driver',r.complianceLabel],['Inventory',r.inventoryLabel]];
  root.innerHTML=`<header class="plan-result-header"><div><img class="plan-print-logo" src="/assets/product-proof/brand-light-v05-340.webp" width="340" height="97" alt="Breakwater"><p class="eyebrow">BREAKWATER / ${kind.toUpperCase()} PLANNER</p><h2>${kind==='poc'?'Your draft evaluation plan':'Your draft migration plan'}</h2><p>${esc(r.summary)}</p></div><div class="plan-result-status">${icon('document')}<strong>For team review</strong><span>Generated from your answers</span></div></header><p class="plan-notice">${esc(r.status)}. These are illustrative design targets, not a scan, measured capacity, a compliance assessment or a deployment commitment.</p><div class="plan-glance">${metrics.map(([label,value])=>`<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
    <nav class="plan-jump" aria-label="Plan sections">${sections.map(([id,label],i)=>`<button type="button" data-jump="${id}" ${i===0?'aria-current="location"':''}>${label}</button>`).join('')}</nav>
    <div class="plan-review-tools">${details('Your selected assumptions',`<div class="plan-assumptions">${questions.map((q,i)=>`<button type="button" data-edit="${i}"><span>${esc(q.eyebrow.split('·')[1]?.trim())}</span><strong>${esc(q.options.find(o=>o.id===answers[q.id]).title)}</strong><small>Edit →</small></button>`).join('')}</div>`)}
    ${action('edit','Edit answers')}</div>${kind==='poc'?pocSections():pqcSections()}`;
  root.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{const target=root.querySelector(`#plan-${b.dataset.jump}`);target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}));
  const updateActive=()=>{if(!result)return;let active=sections[0][0];for(const [id]of sections){if(root.querySelector(`#plan-${id}`).getBoundingClientRect().top<=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--planner-header-height'))+140)active=id;}root.querySelectorAll('[data-jump]').forEach(b=>b.dataset.jump===active?b.setAttribute('aria-current','location'):b.removeAttribute('aria-current'));};
  trackSection=updateActive;observer?.disconnect();observer=new IntersectionObserver(updateActive,{threshold:[0,.1,.25,.5,.75,1]});sections.forEach(([id])=>observer.observe(root.querySelector(`#plan-${id}`)));
  const edit=i=>{step=i;checked.clear();history.replaceState(null,'',location.pathname);showQuestion();focusHeading();};
  root.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>edit(Number(b.dataset.edit))));
  act('edit',()=>edit(0));act('print',()=>window.print());act('summary',()=>copy(summary(),'Plan summary'));
  act('download',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({modelVersion:'2026-09-24',planner:kind,...result,review:{confirmedItems:[...checked],total:result.caveats.length,deploymentApproved:false}},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`breakwater-${kind}-plan.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  act('share',()=>{const code=questions.map(q=>`${q.id}-${answers[q.id]}`).join('.');const link=`${location.origin}${location.pathname}#plan=${code}`;let box=root.querySelector('[data-share-link]');if(!box){box=document.createElement('input');box.type='text';box.readOnly=true;box.dataset.shareLink='';box.setAttribute('aria-label','Share link containing your selected answers');root.querySelector('.plan-next').append(box);const button=document.createElement('button');button.type='button';button.className='plan-button plan-copy-link';button.textContent='Copy link';button.addEventListener('click',()=>copy(box.value,'Share link'));box.after(button);}box.value=link;box.focus();box.select();message('Anyone with this link can read your selected answers. Review confirmations are not shared.');});
  act('reset',()=>{answers=Object.create(null);checked.clear();step=0;history.replaceState(null,'',location.pathname);message('Answers cleared from this page.');showQuestion();focusHeading();});
  root.querySelectorAll('[data-check]').forEach(input=>input.addEventListener('change',()=>{const n=Number(input.dataset.check);input.checked?checked.add(n):checked.delete(n);updateReview();}));
  updateReview();
}
const header=document.querySelector('.header');
new ResizeObserver(()=>document.documentElement.style.setProperty('--planner-header-height',`${header.getBoundingClientRect().height}px`)).observe(header);
let printDetails=[];
window.addEventListener('beforeprint',()=>{printDetails=[...root.querySelectorAll('details:not([open])')];printDetails.forEach(d=>d.open=true);});
window.addEventListener('afterprint',()=>{printDetails.forEach(d=>d.open=false);printDetails=[];});
function restoreSharedPlan() {
  answers=Object.create(null);step=0;result=undefined;checked.clear();message('');
  if(location.hash.startsWith('#plan=')){
    const code=location.hash.slice(6);
    if(code.length<=400){for(const token of code.split('.')){const [qid,oid,extra]=token.split('-');if(!extra&&questions.some(q=>q.id===qid&&q.options.some(o=>o.id===oid)))answers[qid]=oid;}try{result=generate(answers);}catch{message('The shared plan is incomplete or incompatible. Review each answer.');}}
    else message('Shared plan is too long. Start with fresh answers.');
  }
  if(result)showResult();else showQuestion();
}
restoreSharedPlan();
window.addEventListener('hashchange',restoreSharedPlan);
