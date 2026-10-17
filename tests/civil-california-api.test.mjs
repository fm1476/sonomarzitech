import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as domain from '../lambdas/api/lib/civil-california-domain.mjs';
const tenant='f15865be-cf46-41e0-9d60-7cd753437501',agency=randomUUID(),person=randomUUID();
let records=new Map(),audit=[],failAudit=false,snapshot,admin=true,profile={profileId:'US-CA',status:'test',county:'Sonoma'},grants=['civil_paper_view_own'],licensed=true,attachmentValid=true;
const db={query:async(sql,p=[])=>{
 if(sql==='BEGIN'){snapshot={records:structuredClone(records),audit:structuredClone(audit)};return {rows:[]};}
 if(sql==='COMMIT'){snapshot=null;return {rows:[]};}
 if(sql==='ROLLBACK'){records=snapshot.records;audit=snapshot.audit;snapshot=null;return {rows:[]};}
 if(sql.includes('AS profile,timezone'))return {rows:[{profile,timezone:'America/Los_Angeles'}]};
 if(sql.includes('INSERT INTO suite_records')){assert.equal(p[0],tenant);assert.equal(p[1],agency);records.set(p[2],{value:JSON.parse(p[3]),version:1});return {rows:[]};}
 if(sql.includes('UPDATE suite_records')){assert.equal(p[0],tenant);assert.equal(p[1],agency);records.set(p[2],{value:JSON.parse(p[3]),version:p[4]});return {rows:[]};}
 if(sql.includes('FROM suite_records')){assert.equal(p[0],tenant);assert.equal(p[1],agency);if(sql.includes('ORDER BY'))return {rows:[...records.values()].filter(x=>p[3]||x.value.assignedServerId===p[4])};return {rows:records.has(p[2])?[structuredClone(records.get(p[2]))]:[]};}
 if(sql.includes('FROM suite_memberships'))return {rows:p[2]===person?[{exists:1}]:[]};
 throw Error('Unexpected SQL: '+sql);
}};
const context={...domain,randomUUID,Intl,Date,Map,JSON,DEMO_TENANT_ID:tenant,response:(status,body)=>({status,body}),resolveWorkspaceMembership:async(c,a,t,g)=>t===tenant&&g===agency?{personId:person,admin,enabledModules:licensed?['civil']:[],roleIds:['staff']}:{error:{status:403}},loadRoleAbilityMap:async()=>new Map(),roleHasAbility:(map,roles,a)=>grants.includes(a),verifyAttachmentForParent:async(t,g,k,col,id)=>{assert.equal(col,'civil.papers');assert.ok(records.has(JSON.stringify([['civil','papers'],id])));if(!attachmentValid)throw Object.assign(Error('Wrong parent'),{statusCode:403});},ensureAuditSchema:async()=>{},appendAuditEvent:async(c,a,event)=>{if(failAudit)throw Error('Audit unavailable');audit.push({actor:a.userId,...event});}};
vm.createContext(context);const source=fs.readFileSync('lambdas/api/civil-california.mjs','utf8').replace(/^import .*;\n/gm,'').replace('export async function californiaCivilApi','async function californiaCivilApi')+'\nglobalThis.api=californiaCivilApi;';vm.runInContext(source,context);
const call=(extra={},actor='actor-a')=>context.api(db,{userId:actor},{tenantId:tenant,agencyId:agency,...extra});
assert.equal((await call({tenantId:randomUUID()})).status,403);licensed=false;assert.equal((await call()).status,403);licensed=true;profile.status='draft';assert.equal((await call({operation:'list'})).status,409);profile.status='test';
const record={workflowId:'summons',caseNumber:'TEST-API',courtOfOrigin:'Fictional',plaintiff:'Demo',defendant:'Demo',receivedDate:'2026-10-16',serviceAddresses:[{address:'Fictional'}]};
failAudit=true;await assert.rejects(()=>call({operation:'create',record}),/Audit unavailable/);assert.equal(records.size,0);assert.equal(audit.length,0);failAudit=false;
let result=await call({operation:'create',record});assert.equal(result.status,200);const id=result.body.data.record.id;let version=1;
const command=(command,payload={},expectedVersion=version)=>call({operation:'command',id,expectedVersion,command,payload:{note:'Fictional test',...payload}});
assert.equal((await command('close')).status,409);assert.equal((await command('cancel',{},version+1)).status,409);assert.equal(audit.length,1);
attachmentValid=false;assert.equal((await command('attach_document',{key:'other',name:'Other.pdf',kind:'Court packet'})).status,403);attachmentValid=true;
failAudit=true;await assert.rejects(()=>command('cancel'),/Audit unavailable/);assert.equal((await call({operation:'get',id})).body.data.record.stage,'Intake');assert.equal((await call({operation:'get',id})).body.data.version,1);failAudit=false;
admin=false;assert.equal((await call({operation:'get',id})).status,404);assert.equal((await call({operation:'list'})).body.data.cases.length,0);assert.equal((await command('cancel')).status,404);admin=true;
assert.equal((await command('cancel')).status,200);assert.equal((await command('cancel')).status,409);assert.equal(audit.length,2);assert.match(audit[1].description,/version 2 \[TEST\]/);
console.log('California API: licensing, scope, profile gates, own-record isolation, attachment rejection, versions and audit rollback passed. Database is simulated.');
