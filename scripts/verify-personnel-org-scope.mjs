import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {canAccessOrganizationalRecord} from '../lambdas/api/lib/organizational-access.mjs';
const source=readFileSync(new URL('../lambdas/api/core.mjs',import.meta.url),'utf8');
for(const fragment of [
 'loadPersonnelScope(client,workspaceAuth)',
 "PERSONNEL_SCOPED_COLLECTIONS.has(collection)",
 'personnelScopeAllows(personnelScope,record.value,workspaceAuth,personnelUnits)',
 "collection==='pm.records'&&!roleHasAbility(abilityMap,workspaceAuth.roleIds,'pm_records_view')",
 "scope && (!personnelScopeAllows(scope,afterValue||beforeValue,workspaceAuth)"
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
console.log('Runtime Personnel scope predicate negative cases passed.');
