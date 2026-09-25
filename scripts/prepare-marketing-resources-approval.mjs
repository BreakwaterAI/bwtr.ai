// Prepare review evidence only. Never grants approval or changes cloud resources.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(p);
const sha=b=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(read('site-release.json'));
assert.equal(release.candidate.productionPublicationApproved,false);
const output='release-prep/marketing-resources-20260924';
mkdirSync(output,{recursive:true});
const template=read('infra/cloudformation/static-site.yml').toString();
const code=template.match(/      FunctionCode: (?:!Sub )?\|\n([\s\S]*?)\n\n  SiteDistribution:/)[1]
  .split('\n').map(line=>line.replace(/^        /,'')).join('\n')
  .replaceAll('${AttachCustomDomains}','true').replaceAll('${AlternateDomainName}','www.bwtr.ai')+'\n';
const live=read(process.argv[2]).toString();
assert.equal(code.replace(", '/reader-pack', '/poc-planner', '/pqc-planner'",'').trim(),live.trim(), 'Live routing drift: review before preparing the three-route-only change');
writeFileSync(`${output}/routing-before.js`,live);
writeFileSync(`${output}/routing-candidate.js`,code);
const sourceFiles=[...new Set([
  ...execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n'),
  'scripts/build-planning-pages.mjs','scripts/prepare-marketing-resources-approval.mjs','scripts/test-planners-browser.mjs',
  ...readdirSync('scripts/planners').map(name=>'scripts/planners/'+name),
  ...release.files.map(f=>f.path),
])].sort();
const record={
  revision:'2026-09-24-marketing-resources-rc1',
  status:'PREPARED FOR OWNER APPROVAL; NOT AUTHORIZED FOR PUBLICATION',
  productionPublicationApproved:false,
  publicManifestSha256:sha(read('site-release.json')),
  publicFiles:release.files.length,
  baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  target:{repository:'BreakwaterAI/bwtr.ai',account:'506126099258',bucket:'bwtr-ai-site-prod-506126099258',distribution:'E173Y881SRDFT0'},
  routing:{function:'bwtr-ai-static-site-preview-canonical-urls',observedLiveEtag:'E3UN6WX5RRO2AG',beforeSha256:sha(live),candidateSha256:sha(code),addedRoutes:['/reader-pack/','/poc-planner/','/pqc-planner/'],applied:false},
  scope:['Evaluation hub and two browser-only planners','Eleven public branded PDFs; protected books excluded','Evaluate navigation and contextual resource cards','Product website links and Assure login correction','Utility photo framing in two locations','Remove obsolete ASOC architecture outbound link','Three marketing edge-route additions; no DNS or product-app changes'],
  outstanding:['Owner approval of this exact candidate, main commit/push and production publication','Explicit approval and execution of the three-route edge change before content deployment','Record a new approved receipt and enable the source-bound release gate only after approval'],
  sourceFiles:sourceFiles.map(path=>({path,sha256:sha(read(path))})),
};
writeFileSync(`${output}/approval-pending.json`,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({output,manifest:record.publicManifestSha256,files:record.publicFiles,publicationApproved:false}));
