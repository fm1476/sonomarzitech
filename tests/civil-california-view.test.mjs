import {californiaFinancialReport} from '../lambdas/api/lib/civil-california-reporting.mjs';
import {JSDOM} from './civil-support/node_modules/jsdom/lib/api.js';import fs from 'node:fs';import assert from 'node:assert/strict';import * as domain from '../lambdas/api/lib/civil-california-domain.mjs';
const dom=new JSDOM('<div id="view-civil-board" class="view active"></div>',{runScripts:'outside-only',url:'https://demo.example.test'}),w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};w.structuredClone=structuredClone;
let record=null,version=0,requests=[],nextError=null,paged=false,exportConflict=false,reportCalls=0;const allRecords=()=>record?(paged?[record,{...structuredClone(record),id:'case-2',caseNumber:'=DEMO-SECOND'}]:[record]):[];const scope={tenantId:'tenant',agencyId:'agency'};const ctx={admin:true,userId:'a',personId:'person-a',today:'2026-10-17',at:'2026-10-17T12:00:00Z',id:'case-1',county:'Sonoma',testOnly:true,eventId:'e1'};
w.SuiteStore={mode:()=> 'shared',remoteContext:()=>scope,api:async(path,request)=>{const b=JSON.parse(request.body);requests.push(b);if(nextError){const error=nextError;nextError=null;throw Error(error);}if(b.operation==='context')return {success:true,data:{profile:{profileId:'US-CA',status:'test',county:'Sonoma'},workflows:domain.CA_WORKFLOWS,admin:true,personId:ctx.personId,abilities:[]}};if(b.operation==='report'){reportCalls++;return {success:true,data:{...californiaFinancialReport(allRecords(),b),revision:exportConflict&&reportCalls>1?'changed':'revision'}};}if(b.operation==='filters')return {success:true,data:{types:['Summons and Complaint'],locations:['Fictional Court']}};if(b.operation==='list'){const records=allRecords().filter(r=>!b.query||JSON.stringify(r).toLowerCase().includes(b.query.toLowerCase()));return {success:true,data:{cases:(b.afterKey?records.slice(1):records.slice(0,1)).map(record=>({record,version})),nextCursor:!b.afterKey&&records.length>1?'page-2':null}};}if(b.operation==='get')return {success:true,data:{record,version}};if(b.operation==='create'){record=domain.createCaliforniaCase(b.record,ctx);version=1;return {success:true,data:{record,version}};}if(b.operation==='command'){assert.equal(b.expectedVersion,version);record=domain.applyCaliforniaCommand(record,b.command,b.payload,ctx);version++;return {success:true,data:{record,version}};}if(b.operation==='roster')return {success:true,data:{people:[{person_id:'person-a',name:'Demo Officer'}]}};throw Error(b.operation);}};
w.AWS_ATTACHMENTS={upload:async()=>({storageKey:'agency/case/packet'}),download:async()=>{}};w.STATE={personnel:[{id:'person-a',name:'Demo Officer'}]};for(const file of ['civil-board-ui','civil-record-ui','civil-california-view','civil-california-calendar','civil-california'])w.eval(fs.readFileSync('frontend/assets/js/modules/'+file+'.js','utf8'));
const root=w.document.querySelector('#view-civil-board');const tick=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};const click=async selector=>{const el=root.querySelector(selector);assert.ok(el,selector);el.click();await tick();};const fill=values=>{for(const [name,value]of Object.entries(values)){const el=root.querySelector(`[name="${name}"]`);assert.ok(el,name);el.value=value;}};const save=()=>click('#ca-form button[type=submit]');
assert.equal(await w.CaliforniaCivil.route(root,'civil-board'),true);assert.match(root.textContent,/No papers/);assert.equal(root.querySelector('[data-civil-mode="kanban"]').getAttribute('aria-pressed'),'true');await click('[data-civil-mode="table"]');assert.equal(root.querySelector('[data-civil-mode="table"]').getAttribute('aria-pressed'),'true');await click('[data-civil-mode="kanban"]');assert.equal(root.querySelector('[data-civil-mode="kanban"]').getAttribute('aria-pressed'),'true');await click('#ca-new');assert.equal(w.CaliforniaCivil.hasOpenWork(),true);await click('#ca-refresh');assert.ok(root.querySelector('#ca-form form'),'Refresh must preserve open forms');assert.match(root.querySelector('#ca-form form').textContent,/Workflow Type/);
assert.ok(root.querySelector('.ca-workflow-picker'),'Workflow picker must render inside the dialog');
assert.equal(root.querySelectorAll('select[name=workflowId]').length,0,'Native workflow dropdown must not coexist with custom picker');
assert.equal(root.querySelectorAll('input[name=workflowId]').length,1,'Only one workflow value must be submitted');
await click('.ca-workflow-picker .ca-kind-trigger');
assert.equal(root.querySelector('.ca-workflow-picker .ca-kind-options').hidden,false);
const workflowOption=[...root.querySelectorAll('.ca-workflow-picker .ca-kind-option')].find(option=>option.dataset.value==='summons');
assert.ok(workflowOption,'Summons must be a selectable workflow');workflowOption.click();
assert.equal(root.querySelector('[name=workflowId]').value,'summons');
assert.equal(root.querySelector('.ca-workflow-picker .ca-kind-options').hidden,true);fill({workflowId:'summons',caseNumber:'TEST-UI',courtOfOrigin:'Fictional Court',plaintiff:'Demo',defendant:'Demo',receivedDate:'2026-10-17',address:'Fictional address'});await save();assert.match(root.textContent,/TEST-UI/);
const workspace=root.querySelector('#ca-detail');
const orderedSelectors=['.ca-workspace-heading','.ca-case-tabs','.ca-progress','.civil-record-facts','.ca-next-step','.civil-shared-address-panel'];
const orderedNodes=orderedSelectors.map(selector=>{const element=workspace.querySelector(selector);assert.ok(element,'Missing California workspace section '+selector);return element;});
for(let i=1;i<orderedNodes.length;i++)assert.ok(Boolean(orderedNodes[i-1].compareDocumentPosition(orderedNodes[i]) & w.Node.DOCUMENT_POSITION_FOLLOWING),'Case workspace section out of order: '+orderedSelectors[i]);
assert.equal(workspace.lastElementChild?.classList.contains('civil-shared-address-panel'),true,'Service address/map must be the final record section');
assert.equal(workspace.querySelectorAll('#ca-actions').length,1,'Workflow actions must remain mounted exactly once');
assert.equal(workspace.querySelectorAll('.ca-progress').length,1,'Progress tracker must appear exactly once');
assert.equal(record.stage,'Intake');assert.equal(w.CaliforniaCivil.hasOpenWork(),true,'Open case must block background replacement');assert.ok(root.querySelector('.ca-intake-checklist'),'Intake must show a compact actionable checklist');assert.ok(root.querySelector('.ca-intake-more summary'),'Remaining intake issues must be accessible through an expandable disclosure');assert.equal(root.querySelector('.ca-intake-more').open,false,'Long intake checklists should start compact');
await click('[data-action="intake_details"]');fill({returnByDate:'2026-11-15',instructionsReference:'Signed',deadlineAuthority:'Court packet',formReviewReference:'Reviewed',reviewedForms:'SER-001',note:'Fictional'});await save();assert.equal(version,2);
await click('[data-action="approve_intake"]');fill({note:'Approve'});await save();assert.match(root.querySelector('#ca-form [role=alert]').textContent,/court packet/);assert.equal(version,2);
await click('#ca-cancel-form');record=domain.applyCaliforniaCommand(record,'attach_document',{note:'Test',name:'Packet',key:'packet',kind:'Court packet'},ctx);record=domain.applyCaliforniaCommand(record,'attach_document',{note:'Test',name:'Instructions',key:'instructions',kind:'Signed instructions'},ctx);version+=2;await w.CaliforniaCivil.route(root,'civil-board');await click('[data-case]');await click('[data-action="approve_intake"]');fill({note:'Approved'});await save();assert.equal(record.stage,'Ready');await click('[data-action="assign"]');fill({personId:'person-a',note:'Assign'});await save();assert.equal(record.stage,'Assigned');
// Each detail section must be reachable in exactly one workspace tab.
const caseTabs=[...root.querySelectorAll('[data-section]')];
const detailSections=[...root.querySelectorAll('#ca-detail details')];
const sectionCounts=new Map(detailSections.map(el=>[el.querySelector('summary')?.textContent.trim(),0]));
for(const tab of caseTabs){
  await click('[data-section="'+tab.dataset.section+'"]');
  root.querySelectorAll('#ca-detail details').forEach(section=>{
    if(!section.hidden){
      const label=section.querySelector('summary')?.textContent.trim();
      sectionCounts.set(label,(sectionCounts.get(label)||0)+1);
    }
  });
}
assert.ok([...sectionCounts.values()].every(count=>count===1),'Each case section must appear in precisely one workspace tab');
await click('[data-section="Forms"]');
assert.equal(root.querySelector('[data-section="Forms"]').getAttribute('aria-pressed'),'true');
const supplemental=root.querySelector('.ca-pos-supplementals');
assert.ok(supplemental,'California Forms must describe official POS continuation attachments');
for(const code of ['POS-020(D)','POS-020(P)','POS-030(D)','POS-030(P)','POS-040(D)','POS-040(P)'])
 assert.ok(supplemental.textContent.includes(code),'Missing continuation form '+code);
assert.equal(supplemental.open,false,'Supplemental forms should remain collapsed by default');
await click('.ca-signed-upload');
assert.equal(root.querySelector('[data-section="Documents"]').getAttribute('aria-pressed'),'true','Proof upload shortcut should open Documents');
assert.ok(root.querySelector('#ca-form form'),'Proof upload shortcut should open the attachment dialog');
await click('#ca-cancel-form');
await click('[data-section="Service"]');
assert.equal(root.querySelector('[data-section="Service"]').getAttribute('aria-pressed'),'true');
await click('[data-action="attempt"]');fill({date:'2026-10-17',time:'10:00',result:'Not home',note:'Demo'});nextError='Changed in another session';await save();assert.match(root.querySelector('#ca-form [role=alert]').textContent,/another session/);assert.equal(record.attempts.length,0);await save();assert.equal(record.attempts.length,1);
assert.equal(root.querySelector('[data-section="Service"]').getAttribute('aria-pressed'),'true','Successful action save must preserve selected case tab');
await click('[data-action="receipt"]');fill({kind:'Service fee',amountCents:'12.345',payer:'Demo',reference:'R1',note:'Demo'});await save();assert.match(root.querySelector('#ca-form [role=alert]').textContent,/two decimal/);fill({amountCents:'12.34'});await save();assert.equal(record.california.ledger[0].amountCents,1234);assert.match(root.textContent,/\$12.34/);
assert.equal(root.querySelector('#ca-detail pre'),null,'Readable case details must replace raw data');assert.match(root.querySelector('#ca-detail').textContent,/Demo Officer/);await click('[data-action="serve"]');const method=root.querySelector('[name=method]'),mailing=root.querySelector('[name=mailingAddress]'),courtOrder=root.querySelector('[name=courtOrderReference]');assert.equal(mailing.disabled,true);method.value='Substituted service';method.dispatchEvent(new w.Event('change'));assert.equal(mailing.disabled,false);assert.equal(courtOrder.disabled,true);method.value='Court-authorized alternative';method.dispatchEvent(new w.Event('change'));assert.equal(mailing.disabled,true);assert.equal(courtOrder.disabled,false);const retained=root.querySelector('#ca-form form');await click('[data-case]');assert.equal(root.querySelector('#ca-form form'),retained,'Case click must preserve unfinished work');await click('#ca-new');assert.equal(root.querySelector('#ca-form form'),retained,'New intake must preserve unfinished work');await click('#ca-cancel-form');
assert.ok(requests.every(r=>r.tenantId===scope.tenantId&&r.agencyId===scope.agencyId));paged=true;const blobs=[];w.Blob=Blob;w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
await w.CaliforniaCivil.route(root,'civil-reports');assert.match(root.querySelector('#ca-totals').textContent,/\$24.68/);assert.ok(root.querySelector('#ca-more'));await click('#ca-more');assert.equal(root.querySelectorAll('[data-case]').length,2);
root.querySelector('#ca-export-kind').value='ledger';reportCalls=0;await click('#ca-export');assert.equal(blobs.length,1);const csv=await blobs[0].text();assert.match(csv,/case-2/);assert.match(csv,/'=DEMO-SECOND/);assert.match(root.textContent,/Complete export generated/);
exportConflict=true;reportCalls=0;await click('#ca-export');assert.equal(blobs.length,1,'Concurrent changes must prevent downloading an inconsistent export');assert.match(root.textContent,/changed during export/);
record={...record,stage:'Served',california:{...record.california,workflowId:'subpoena',service:{
 method:'Personal service',recipient:'Demo Defendant',address:'123 Fictional Lane',date:'2026-10-17',time:'10:30'
}}};version++;paged=false;exportConflict=false;
await w.CaliforniaCivil.route(root,'civil-board');await click('[data-case]');await click('[data-section="Forms"]');
assert.ok(root.querySelector('#ca-generate-draft'),'Eligible non-summons personal service should permit a POS draft');
await click('#ca-generate-draft');
assert.ok(root.querySelector('.ca-court-form-picker'),'Court proof form must have an in-dialog selection list');
await click('.ca-court-form-picker .ca-kind-trigger');
const chooseForm=(code)=>[...root.querySelectorAll('.ca-court-form-picker .ca-kind-option')].find(el=>el.dataset.value===code);
assert.ok(chooseForm('POS-020'));assert.ok(chooseForm('POS-040'));assert.equal(chooseForm('POS-030'),undefined);
chooseForm('POS-020').click();assert.equal(root.querySelector('[name=formCode]').value,'POS-020');
await click('#ca-cancel-form');
record.california.service.method='First-class mail';version++;
await w.CaliforniaCivil.route(root,'civil-board');await click('[data-case]');await click('[data-section="Forms"]');await click('#ca-generate-draft');
await click('.ca-court-form-picker .ca-kind-trigger');
assert.ok(chooseForm('POS-030'),'First-class mailed non-summons papers must offer POS-030');
assert.equal(chooseForm('POS-020'),undefined);
await click('#ca-cancel-form');
await click('[data-ca-add-safety]');
fill({scope:'Address',reason:'Fictional caution from verified demo event',verificationReference:'TRAINING-123',note:'Training safety record reviewed'});
await save();
assert.equal(record.safetyFlags.length,1);
assert.ok(root.querySelector('.ca-safety-alert'),'Active safety flags should appear prominently in the California record');
await click('[data-ca-retire-safety]');
fill({note:'Training caution cleared'});
await save();
assert.equal(record.safetyFlags[0].active,false);
assert.equal(root.querySelector('.ca-safety-alert'),null,'Retired safety flag must not remain an active alert');
console.log('DOM reports: all-case totals, load-more, complete ledger CSV, formula escaping and changed-export rejection passed.');
console.log('DOM workflow: empty state, intake, forms, blocked approval, assignment roster, stale save retry, cents parsing and balance rendering passed.');w.close();
