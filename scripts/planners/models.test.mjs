import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRecommendation, plannerQuestions} from './poc-model.ts';
import {createPqcPlan, pqcQuestions} from './pqc-model.ts';
import {spawnSync} from 'node:child_process';
const base = qs => Object.fromEntries(qs.map(q => [q.id,q.options[0].id]));
test('both models require complete supported answers', () => {
  for(const [qs, make] of [[plannerQuestions,createRecommendation],[pqcQuestions,createPqcPlan]]) {
    assert.equal(qs.length,10);
    assert.throws(()=>make({}));
    assert.throws(()=>make({...base(qs),unknown:'x'}));
    assert.throws(()=>make({...base(qs),[qs[0].id]:'<script>alert(1)</script>'}));
    assert.throws(()=>make(Object.create(base(qs))));
    assert.ok(make(base(qs)).summary);
  }
});
test('offline boundaries reject external inference', () => {
  for(const connectivity of ['airgap','window']) {
    assert.throws(()=>createRecommendation({...base(plannerQuestions),connectivity,inference:'external'}),/Isolated/);
    assert.ok(createRecommendation({...base(plannerQuestions),connectivity,inference:'offline'}));
    const isolated=createRecommendation({...base(plannerQuestions),connectivity,inference:'offline'});
    assert.match(JSON.stringify(isolated.sequences[0]),/Signed offline package/);
    assert.doesNotMatch(JSON.stringify(isolated.sequences[0]),/mTLS upload/);
  }
});
test('SOAR execution respects all four requested response scopes', () => {
  for(const response of ['investigate','rehearse','lab','adapter']) {
    const result=createRecommendation({...base(plannerQuestions),response});
    const sequence=result.sequences.find(s=>s.product==='SOAR');
    const copy=JSON.stringify(sequence);
    if(['investigate','rehearse'].includes(response)) assert.doesNotMatch(copy,/Governed action|Execute only|Adapter|Target/);
    if(response==='rehearse') assert.match(copy,/Rehearsal/);
    if(response==='lab') assert.match(copy,/Lab target/);
    if(response==='adapter') assert.match(copy,/Approved target/);
    assert.equal(result.software.find(x=>x.label==='Agentic SOAR').text,result.responseMode);
    assert.equal(result.threatModel.some(x=>x.element==='Response adapter (process)'),['lab','adapter'].includes(response));
  }
});
test('sizing proxies and external data processing remain explicit', () => {
  const r=createRecommendation({...base(plannerQuestions),networks:'twelve',assets:'xlarge'});
  assert.match(r.summary,/25,000 sizing proxy/); assert.match(r.assetsLabel,/not a limit/);
  assert.match(r.software.find(x=>x.label==='Secure platform').text,/12\+/);
  assert.match(r.assessment[0],/External inference/);
});
test('collector placement uses singular and plural correctly', () => {
  for(const [networks,phrase] of [['one','1 collection point'],['three','3 collection points'],['twelve','12+ collection points']]) {
    const r=createRecommendation({...base(plannerQuestions),networks});
    const copy=r.software.find(x=>x.label==='Secure platform').text;
    assert.ok(copy.includes(phrase+' as a placement'));
    assert.doesNotMatch(copy,/\b1 collection points\b/);
  }
});
test('PQC horizons are relative assumptions; equality is not a missed deadline', () => {
  const a={...base(pqcQuestions),shelf:'le1',horizon:'aggressive',program:'y3',capacity:'moderate',agility:'abstracted',dependency:'low'};
  const r=createPqcPlan(a); assert.equal(r.mosca.late,0); assert.match(r.mosca.verdict,/≤/);
  assert.equal(createPqcPlan({...a,horizon:'mandate',compliance:'cnsa2'}).mosca.z,7);
  assert.equal(createPqcPlan({...a,horizon:'mandate',compliance:'none'}).mosca.z,7);
  assert.doesNotMatch(JSON.stringify(pqcQuestions),/NIST-central|~2030|~2033|~2040/);
  assert.match(r.assessment[0],/no CBOM was uploaded/);
});
test('deterministic sample covers finite model output and answer boundaries', () => {
  for(const [qs,make]of [[plannerQuestions,createRecommendation],[pqcQuestions,createPqcPlan]]) {
    for(let seed=0;seed<512;seed++) {
      const a=Object.fromEntries(qs.map((q,i)=>[q.id,q.options[(seed*(i*2+1)+(seed>>i))%4].id]));
      if(qs===plannerQuestions&&['airgap','window'].includes(a.connectivity)&&a.inference==='external') continue;
      const r=make(a);assert.doesNotMatch(JSON.stringify(r),/undefined|NaN/);
      assert.doesNotMatch(JSON.stringify(r),/—|ever leave a collector/);
      if(r.mosca) {assert.equal(r.mosca.late,r.mosca.x+r.mosca.y-r.mosca.z);assert.ok(r.mosca.y>=1);assert.equal(r.domains.length,4);}
    }
  }
});
test('local candidate flags cannot invoke either publication entrypoint', () => {
  for(const file of ['deploy/aws/deploy.sh','scripts/publish-site.sh']) {
    const r=spawnSync('bash',[file,'publish','production','--confirm-production'],{env:{...process.env,BWTR_LOCAL_CANDIDATE:'1'},encoding:'utf8'});
    assert.equal(r.status,2);assert.match(r.stderr,/Local candidate mode cannot/);
  }
});
