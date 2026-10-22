import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {canonicalOrganizationReady,authorizedPersonFromAssignments,AGENCY_PERSON_ORGANIZATION_QUERY} from '../lambdas/api/lib/organization-assignments.mjs';
import {canAccessOrganizationalRecord} from '../lambdas/api/lib/organizational-access.mjs';
const source=readFileSync('lambdas/api/core.mjs','utf8');
const org='23e74951-ea95-46cc-9d37-edfd89f5b634';
const scope={mode:'selected',unitIds:[org],divisionIds:[],workGroupIds:[]};
const key=(collection,id)=>JSON.stringify([collection.split('.'),id]);
const records=['personnel','pm.records'].flatMap(collection=>[
 {key:key(collection,'$order'),value:['dispatch','patrol','blank']},
 ...['dispatch','patrol','blank'].map(id=>({key:key(collection,id),value:{id,personId:id,unitId:id==='blank'?'':id}}))
]);
const calls=[];
const client={query:async(sql,args=[])=>{
 calls.push({sql,args});
 if(sql.includes('FROM suite_tenants'))return {rows:[{tenant_status:'active',agency_status:'active',membership_status:'active',person_id:'manager',role_ids:['dispatch-role'],enabled_modules:['personnel'],metadata:{}}]};
 if(sql.includes('to_regclass'))return {rows:[{relation:'suite_organizational_access',assignments:'assignments',nodes:'nodes',rollout:'rollout'}]};
 if(sql.includes('SELECT scope FROM'))return {rows:args[2]==='ses-user'?[{scope}]:[]};
 if(sql.includes('SELECT EXISTS'))return {rows:[{enabled:false}]};
 if(sql===AGENCY_PERSON_ORGANIZATION_QUERY)return {rows:[{tenant_id:'tenant',agency_id:'agency',person_id:'dispatch',organization_id:org,node_kind:'unit',active:true,node_active:true}]};
 throw Error('Unexpected SQL: '+sql);
}};
const context={canonicalOrganizationReady,authorizedPersonFromAssignments,AGENCY_PERSON_ORGANIZATION_QUERY,canAccessOrganizationalRecord,
 response:(status,body)=>({status,body}),loadRoleAbilityMap:async()=>new Map(),roleHasAbility:(map,roles,ability)=>ability==='pm_records_view',
 biddingSeniorityProjection:()=>[],schedulingSkillsProjection:()=>[],filterSchedulingRecords:r=>r,moduleLicensed:()=>true,
 OFFICER_UNIVERSAL_READ:new Set(['personnel']),PM_COLLECTION_RULES:{'pm.records':{}},pmRecordReadable:()=>true,limitPersonnelRecord:v=>v,redactPmRecord:v=>v,sharedCollectionReadable:()=>true};
vm.createContext(context);
const block=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
vm.runInContext(block('async function resolveWorkspaceMembership(','function moduleLicensed('),context);
vm.runInContext(block('const PERSONNEL_SCOPED_COLLECTIONS=','async function authorizeOfficerSelfServiceChange('),context);
const auth=await context.resolveWorkspaceMembership(client,{userId:'ses-user',platformAdmin:false},'tenant','agency');
assert.equal(auth.userId,'ses-user','Membership context must preserve authenticated actor ID');
const visible=await context.filterOfficerWorkspaceRecords(client,auth,records);
assert.equal(visible.length,2,'Only Dispatch rows from the two Personnel collections may survive');
assert.ok(visible.every(row=>row.value.personId==='dispatch'),'Patrol, blank assignments and ordering IDs must be excluded');
assert.ok(calls.some(c=>c.sql.includes('SELECT scope FROM')&&c.args[2]==='ses-user'));
assert.equal((await context.loadPersonnelScope(client,{tenantId:'tenant',agencyId:'agency',admin:false})).mode,'none','Missing actor ID must fail closed, not fall back to legacy access');
assert.equal(await canonicalOrganizationReady(client,'tenant','agency'),false,'Per-user UUID grant must not activate agency defaults');
assert.equal(await canonicalOrganizationReady(client,'tenant','agency',scope),true,'Explicit UUID scope uses canonical assignments before agency rollout');
assert.equal(await canonicalOrganizationReady(client,'tenant','agency',{mode:'selected',unitIds:['Dispatch']}),false,'Labels must not trigger canonical resolution');
assert.equal(await canonicalOrganizationReady(client,'tenant','agency',{mode:'selected',unitIds:[org,'Patrol']}),false,'Mixed legacy and UUID scope must not silently cut over');
console.log('Actual membership -> scope lookup -> Personnel filtering pipeline passed, including UUID opt-in and agency rollout separation.');
