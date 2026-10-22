import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {canAccessOrganizationalRecord} from '../lambdas/api/lib/organizational-access.mjs';
import {authorizedPersonFromAssignments,PERSON_ORGANIZATION_QUERY,AGENCY_PERSON_ORGANIZATION_QUERY} from '../lambdas/api/lib/organization-assignments.mjs';
const source=readFileSync(new URL('../lambdas/api/core.mjs',import.meta.url),'utf8');
for(const fragment of [
 'loadPersonnelScope(client,workspaceAuth)',
 "PERSONNEL_SCOPED_COLLECTIONS.has(collection)",
 'personnelScopeAllows(personnelScope,record.value,workspaceAuth,personnelUnits)',
 "collection==='pm.records'&&!roleHasAbility(abilityMap,workspaceAuth.roleIds,'pm_records_view')",
 "const canonicalAllows=await canonicalPersonnelScope(client,workspaceAuth,scope)"
]) assert.ok(source.includes(fragment),fragment);
assert.match(source,/The record is outside your authorized organizational scope/);
console.log('Personnel organizational authorization integration checks passed.');

const attachments=source.slice(source.indexOf('async function fieldTrainingAttachmentScopeAllowed('),source.indexOf('async function attachmentParentWriteAllowed('));
assert.match(attachments,/suite_memberships/);
assert.match(attachments,/canAccessOrganizationalRecord\(scope/);
assert.match(attachments,/if\(!await fieldTrainingAttachmentScopeAllowed\(client,workspaceAuth,enrollment\)\)continue/);
console.log('Field Training signed URL scope checks passed.');

for(const name of ['pm.trainingRecords','pm.trainingRequests','pm.disciplinaryActions','pm.inquiries','pm.instructors'])assert.ok(source.includes("'"+name+"'"),name);
assert.match(source,/PERSONNEL_SCOPED_COLLECTIONS\.has\(collection\)/);
console.log('Related employee collection organizational checks passed.');

const gated=source.slice(source.indexOf('const { collection, itemId } = parsed;',source.indexOf('const personnelScope=await loadPersonnelScope')),source.indexOf('if(personnelScope && PERSONNEL_SCOPED_COLLECTIONS.has(collection))'));
assert.match(gated,/moduleLicensed\(workspaceAuth\.enabledModules, collection\)/,'Licensed modules must be checked before scoped aggregate projections');

// Conflicting agency personnel unit assignments must be rejected rather than last-write-wins.
const conflictPattern=/if\(personnelUnits\.has\(id\) && personnelUnits\.get\(id\)!==unit\) personnelUnits\.set\(id,null\)/g;
assert.equal([...source.matchAll(conflictPattern)].length,2,'Both Personnel and PM unit mappings must fail closed on conflicts');
console.log('Personnel unit conflict handling checks passed.');

// Exercise the actual scoped Personnel read predicate using contradictory source records.
const predicateStart=source.indexOf('function personnelScopeAllows(');
const predicateEnd=source.indexOf('async function filterOfficerWorkspaceRecords(',predicateStart);
assert.ok(predicateStart>=0&&predicateEnd>predicateStart);
const sandbox={canAccessOrganizationalRecord,Map};
vm.createContext(sandbox);
vm.runInContext(source.slice(predicateStart,predicateEnd),sandbox);
const dispatchScope={mode:'selected',unitIds:['dispatch'],divisionIds:[],workGroupIds:[]};
const auth={personId:'dispatch-supervisor'};
assert.equal(sandbox.personnelScopeAllows(dispatchScope,{personId:'dispatcher',unitId:'dispatch'},auth,new Map([['dispatcher','dispatch']])),true);
assert.equal(sandbox.personnelScopeAllows(dispatchScope,{personId:'patrol-officer',unitId:'patrol'},auth,new Map([['patrol-officer','patrol']])),false);
assert.equal(sandbox.personnelScopeAllows(dispatchScope,{personId:'dispatcher',unitId:'dispatch'},auth,new Map([['dispatcher',null]])),false,'Conflicting unit mapping must deny even when record claims Dispatch');
assert.equal(sandbox.personnelScopeAllows(dispatchScope,{personId:'patrol-officer',unitId:'dispatch'},auth,new Map([['patrol-officer','patrol']])),false,'Related record must not override authoritative Patrol assignment with Dispatch');
assert.equal(sandbox.personnelScopeAllows(dispatchScope,{personId:'dispatcher',unitId:'patrol'},auth,new Map([['dispatcher','dispatch']])),true,'Authoritative Dispatch assignment takes precedence over stale linked record');
console.log('Runtime Personnel scope predicate negative cases passed.');

// Execute the signed-URL organizational guard, not just a source-pattern assertion.
const attachmentStart=source.indexOf('async function fieldTrainingAttachmentScopeAllowed(');
const attachmentEnd=source.indexOf('async function attachmentReadAllowed(',attachmentStart);
assert.ok(attachmentStart>=0 && attachmentEnd>attachmentStart);
const attachmentSandbox={
  loadPersonnelScope:async()=>dispatchScope,
  collectionFromRecordKey:key=>{const decoded=JSON.parse(key);return {collection:decoded[0].join('.'),itemId:decoded[1]};},
  canAccessOrganizationalRecord,authorizedPersonFromAssignments,PERSON_ORGANIZATION_QUERY
};
vm.createContext(attachmentSandbox);
vm.runInContext(source.slice(attachmentStart,attachmentEnd),attachmentSandbox);
const key=(collection,id)=>JSON.stringify([collection.split('.'),id]);
const member={tenantId:'tenant',agencyId:'agency',personId:'manager'};
const enrollment={trainee_user:'trainee-user'};
const attachmentClient=async records=>({query:async(query)=>query.includes('suite_memberships')?{rows:[{person_id:'person-dispatch'}]}:query.includes('to_regclass')?{rows:[{assignments:null,nodes:null}]}:{rows:records}});
const dispatchRow={key:key('pm.records','dispatch'),value:{personId:'person-dispatch',unitId:'dispatch'}};
const patrolRow={key:key('personnel','conflict'),value:{id:'person-dispatch',unitId:'patrol'}};
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(await attachmentClient([dispatchRow]),member,enrollment),true);
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(await attachmentClient([dispatchRow,patrolRow]),member,enrollment),false,'Conflicting unit rows must block signed URL access');
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(await attachmentClient([{...dispatchRow,value:{personId:'person-dispatch',unitId:'patrol'}}]),member,enrollment),false);
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(await attachmentClient([dispatchRow]),member,{trainee_user:'trainee-user',trainee_person:'other-person'}),false,'A reassigned membership must not expose an old enrollment attachment');
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(await attachmentClient([dispatchRow]),member,{trainee_user:'trainee-user',trainee_person:'person-dispatch'}),true);
console.log('Signed URL runtime organizational access checks passed.');

assert.match(source,/return grants\.rows\.length \? \(grants\.rows\[0\]\.scope \?\? \{mode:'none'\}\) : null;/,'Configured null Personnel scope must deny');

const loadStart=source.indexOf('async function loadPersonnelScope(');
const loadEnd=source.indexOf('function personnelScopeAllows(',loadStart);
assert.ok(loadStart>=0&&loadEnd>loadStart);
const loadSandbox={};vm.createContext(loadSandbox);
vm.runInContext(source.slice(loadStart,loadEnd),loadSandbox);
const access={tenantId:'tenant-a',agencyId:'agency-a',userId:'user-a',admin:false};
async function resolveScope(rows, relation='suite_organizational_access') {
  const calls=[];
  const client={query:async(sql,args)=>{calls.push({sql,args});return sql.includes('to_regclass')?{rows:[{relation}]}:{rows};}};
  const value=await loadSandbox.loadPersonnelScope(client,access);
  return {value,calls};
}
assert.equal((await resolveScope([])).value,null,'Absent configured grants preserve legacy access');
assert.equal((await resolveScope([{scope:null}])).value.mode,'none','Null configured grant must deny');
assert.equal((await resolveScope([{scope:{mode:'selected',unitIds:['dispatch']}}])).value.mode,'selected');
assert.equal(sandbox.personnelScopeAllows((await resolveScope([{scope:{mode:'agency'}}])).value,{personId:'dispatcher',unitId:'dispatch'},auth),false,'A nonadministrator cannot use a stored agency grant to read Personnel records');
const bounded=await resolveScope([{scope:{mode:'none'}}]);
assert.deepEqual(Array.from(bounded.calls[1].args),['tenant-a','agency-a','user-a'],'Scope lookup must be tenant, agency, and actor bounded');
assert.equal((await loadSandbox.loadPersonnelScope({query:async()=>{throw Error('DB unavailable');}},access).catch(e=>e.message)),'DB unavailable','Database errors must not silently permit legacy access');
console.log('Personnel grant loading tenant isolation and fail-closed behavior passed.');

const canonicalAttachmentClient={query:async(sql,args=[])=>{
  if(sql.includes('suite_memberships'))return {rows:[{person_id:'person-dispatch'}]};
  if(sql.includes('to_regclass'))return {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes'}]};
  if(sql===PERSON_ORGANIZATION_QUERY)return {rows:[{
    tenant_id:'tenant',agency_id:'agency',person_id:'person-dispatch',
    organization_id:'dispatch',node_kind:'unit',active:true,node_active:true
  }]};
  throw Error('Canonical signed URL guard must not use legacy records');
}};
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(canonicalAttachmentClient,member,{trainee_user:'trainee-user',trainee_person:'person-dispatch'}),true);
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(canonicalAttachmentClient,member,{trainee_user:'trainee-user',trainee_person:'person-patrol'}),false);
const canonicalEmpty={query:async(sql,args=[])=>{
  if(sql.includes('suite_memberships'))return {rows:[{person_id:'person-dispatch'}]};
  if(sql.includes('to_regclass'))return {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes'}]};
  return {rows:[]};
}};
assert.equal(await attachmentSandbox.fieldTrainingAttachmentScopeAllowed(canonicalEmpty,member,enrollment),false,'No canonical assignment must deny signed URL');
console.log('Canonical Field Training attachment negative tests passed.');

const canonicalStart=source.indexOf('async function canonicalPersonnelScope(');
const canonicalEnd=source.indexOf('async function filterOfficerWorkspaceRecords(',canonicalStart);
assert.ok(canonicalStart>0 && canonicalEnd>canonicalStart);
const canonicalSandbox={authorizedPersonFromAssignments,AGENCY_PERSON_ORGANIZATION_QUERY};
vm.createContext(canonicalSandbox);
vm.runInContext(source.slice(canonicalStart,canonicalEnd),canonicalSandbox);
const canonicalScope={mode:'selected',unitIds:['dispatch']};
const canonClient={query:async(sql,args=[])=>sql.includes('to_regclass')?
  {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes'}]}:
  {rows:[{tenant_id:'tenant-a',agency_id:'agency-a',person_id:'dispatch-person',organization_id:'dispatch',node_kind:'unit',active:true,node_active:true},
         {tenant_id:'tenant-a',agency_id:'agency-a',person_id:'patrol-person',organization_id:'patrol',node_kind:'unit',active:true,node_active:true}]}};
const canonFilter=await canonicalSandbox.canonicalPersonnelScope(canonClient,{tenantId:'tenant-a',agencyId:'agency-a',personId:'manager'},canonicalScope);
assert.equal(canonFilter({personId:'dispatch-person',unitId:'patrol'}),true,'Canonical dispatch assignment overrides stale unit label');
assert.equal(canonFilter({personId:'patrol-person',unitId:'dispatch'}),false,'Client-controlled legacy unit cannot grant access');
assert.equal(canonFilter({personId:'missing-person',unitId:'dispatch'}),false,'Missing canonical assignment must deny');
assert.equal(canonFilter({unitId:'dispatch'}),false,'No person identity must deny');
assert.match(source,/const allowed=value=>canonicalAllows \? canonicalAllows\(value\) : personnelScopeAllows\(scope,value,workspaceAuth\)/,'Both before and after writes use canonical identity checks');
console.log('Personnel canonical source-of-truth read/write guards passed.');

assert.match(source,/A restricted editor cannot change the record person identity/);
assert.match(source,/String\(beforeValue\.personId\|\|beforeValue\.id\|\|''\) !== String\(afterValue\.personId\|\|afterValue\.id\|\|''\)/);
console.log('Restricted Personnel person identity rebinding protection passed.');
