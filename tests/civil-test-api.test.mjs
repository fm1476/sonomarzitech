import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {validateTestIntake,validateTestTransition} from '../lambdas/api/lib/civil-test-validation.mjs';
const tenant='f15865be-cf46-41e0-9d60-7cd753437501',id='12345678-1234-1234-1234-123456789012';
let cases=new Map(),events=[],mode='test',conflict=false;
const db={query:async(sql,p=[])=>{
  if(sql.includes("AS jurisdiction FROM suite_tenants"))return {rows:[{jurisdiction:{profileId:'US-CA',status:mode}}]};
  if(sql.startsWith('CREATE TABLE'))return {rows:[]};
  if(sql.includes('INSERT INTO suite_civil_california_test_cases')){
    const row={id,case_number:p[1],record:JSON.parse(p[2]),stage:'intake'};cases.set(id,row);return {rows:[row]};
  }
  if(sql.includes('SELECT id,case_number'))return {rows:[...cases.values()]};
  if(sql.includes('SELECT id,record,stage'))return {rows:cases.has(p[1])?[structuredClone(cases.get(p[1]))]:[]};
  if(sql.includes('UPDATE suite_civil_california_test_cases')){
    if(conflict)return {rows:[]};
    const row=cases.get(p[1]);assert.equal(row.stage,p[4]);row.stage=p[2];row.record.testHistory.push(...JSON.parse(p[3]));return {rows:[row]};
  }
  throw Error('Unexpected SQL: '+sql);
}};
const ctx={validateTestIntake,validateTestTransition,DEMO_TENANT_ID:tenant,
 response:(status,body)=>({status,body}),ensureAgencySubdomainSchema:async()=>{},
 platformEvent:async(c,a,t,event)=>{events.push({actor:a.userId,tenant:t,event});}};
vm.createContext(ctx);
let source=fs.readFileSync('lambdas/api/tenant-admin.mjs','utf8').replace(/^import .*;\n/gm,'').replace(/async function platformEvent\([\s\S]*?\n}\n/,'').replace('export { internalIdentityApi, tenantAdminDbApi };','globalThis.api=tenantAdminDbApi;');
vm.runInContext(source,ctx);
const auth={platformAdmin:true,userId:'A'};
const call=(payload,identity=auth)=>ctx.api(db,identity,{action:'california_test_summons',tenantId:tenant,...payload});
assert.equal((await call({operation:'list'},{platformAdmin:false})).status,403);
assert.equal((await call({tenantId:'another',operation:'list'})).status,403);
mode='draft';assert.equal((await call({operation:'list'})).status,409);mode='test';
const record={caseNumber:'TEST-CA-001',courtOfOrigin:'Fictional court',receivedDate:'2026-10-17',defendant:'Demo Defendant',plaintiff:'Demo Plaintiff',signedInstructions:'Fictional',serviceAddresses:[{address:'123 Example Street'}],testHistory:[{stage:'reviewed'}]};
assert.equal((await call({operation:'create',record:{...record,receivedDate:'2026-02-30'}})).status,400);
assert.equal(cases.size,0);
assert.equal((await call({operation:'create',record})).status,200);
assert.equal(cases.get(id).record.testHistory.length,0);
assert.equal((await call({operation:'transition',id:'bad',stage:'assigned'})).status,400);
assert.equal((await call({operation:'transition',id,stage:'closed',evidence:{note:'Test'}})).status,409);
const move=(stage,evidence,identity=auth)=>call({operation:'transition',id,stage,evidence},identity);
assert.equal((await move('assigned',{note:'Test'})).status,400);
assert.equal((await move('assigned',{note:'Test',assignedTo:'Demo officer'})).status,200);
conflict=true;assert.equal((await move('attempted',{note:'Test',attemptDate:'2026-10-17',attemptTime:'12:00',attemptResult:'No contact'})).status,409);conflict=false;
assert.equal(cases.get(id).stage,'assigned');
assert.equal((await move('attempted',{note:'Test',attemptDate:'2026-10-17',attemptTime:'12:00',attemptResult:'No contact'})).status,200);
assert.equal((await move('served',{note:'Test',serviceMethod:'FICTIONAL TEST ONLY',servedDate:'2026-10-17',servedOnName:'Demo',serverIdentity:'Demo'})).status,400);
assert.equal((await move('served',{note:'Test',serviceMethod:'Personal Service',servedDate:'2026-10-17',servedTime:'12:01',servedOnName:'Demo',serverIdentity:'Demo'})).status,200);
assert.equal((await move('reviewed',{note:'Test',approvalReference:'TEST-APPROVAL'})).status,400);
assert.equal((await move('reviewed',{note:'Test',approvalReference:'TEST-APPROVAL'},{platformAdmin:true,userId:'B'})).status,200);
assert.equal((await move('closed',{note:'Test',returnReference:'TEST-RETURN',returnedDate:'2026-10-17'})).status,200);
assert.equal((await move('assigned',{note:'Test',assignedTo:'Demo'})).status,409);
const listed=await call({operation:'list'});
assert.equal(listed.body.data.cases[0].stage,'closed');
assert.equal(cases.get(id).record.testHistory.length,5);
assert.equal(events.length,6);
assert.ok(events.every(e=>e.tenant===tenant));
console.log('Civil API behavior passed: authorization, tenant/mode isolation, intake, full lifecycle, evidence rejection, conflict response, history and audit calls. Database is simulated.');
