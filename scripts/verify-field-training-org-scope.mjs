import assert from 'node:assert/strict';
import vm from 'node:vm';
import {canAccessOrganizationalRecord} from '../lambdas/api/lib/organizational-access.mjs';
import {authorizedPersonFromAssignments,PERSON_ORGANIZATION_QUERY} from '../lambdas/api/lib/organization-assignments.mjs';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/field-training.mjs',import.meta.url),'utf8');
for(const expected of [
  "ftLoadOrgScope(client,ctx)",
  "tenant_id=$1 AND agency_id=$2 AND user_id=$3",
  "canAccessOrganizationalRecord(scope",
  "ctx.orgScope=org.scope;ctx.orgAllowed=org.allowed",
  "members.filter(m=>org.allowed.has(m.user_id))",
  "if(!ftOrgAllowsEnrollment(ctx,e))return false",
  "if(enrollmentId)ftAssertOrgEnrollment(ctx,ftEnrollmentFor(state,enrollmentId))",
  "action==='save_config'",
  "[payload.traineeUser,payload.trainerUser,payload.supervisorUser].every",
  "[e.trainee_user,payload.trainerUser,payload.supervisorUser].every",
  "org.allowed.has(payload.coverUser)",
  "org.allowed.has(payload.trainerUser||expectedTrainer)",
  "if(units.has(id) && units.get(id)!==unit) units.set(id,null)"
])assert.ok(source.includes(expected),expected);
assert.match(source,/This trainee file is outside your authorized organizational scope/);
console.log('Field Training organizational scope route checks passed.');

const begin=source.indexOf('async function ftOrgMembers(');
const end=source.indexOf('async function ftMembers(',begin);
assert.ok(begin>=0&&end>begin);
const scope={mode:'selected',unitIds:['communications'],divisionIds:[],workGroupIds:[]};
const members=[
  {user_id:'dispatch-manager',person_id:'person-1'},
  {user_id:'dispatcher',person_id:'person-2'},
  {user_id:'patrol',person_id:'person-3'}
];
const rows=[
  {key:JSON.stringify([['pm','records'],'a']),value:{personId:'person-1',unitId:'communications'}},
  {key:JSON.stringify([['pm','records'],'b']),value:{personId:'person-2',unitId:'communications'}},
  {key:JSON.stringify([['pm','records'],'c']),value:{personId:'person-3',unitId:'patrol'}}
];
const context={canAccessOrganizationalRecord,authorizedPersonFromAssignments,PERSON_ORGANIZATION_QUERY,canonicalOrganizationReady:async(client)=>Boolean((await client.query('to_regclass')).rows[0]?.assignments),ftLoadOrgScope:async()=>scope};
vm.createContext(context);
vm.runInContext(source.slice(begin,end),context);
const client={query:async()=>({rows})};
const result=await context.ftOrgMembers(client,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.deepEqual([...result.allowed].sort(),['dispatch-manager','dispatcher']);
assert.equal(context.ftOrgAllowsEnrollment({orgScope:scope,orgAllowed:result.allowed,orgPersonByUser:result.personByUser},{trainee_user:'dispatcher',trainee_person:'person-2'}),true);
assert.equal(context.ftOrgAllowsEnrollment({orgScope:scope,orgAllowed:result.allowed,orgPersonByUser:result.personByUser},{trainee_user:'patrol',trainee_person:'person-3'}),false);
assert.equal(context.ftOrgAllowsEnrollment({orgScope:scope,orgAllowed:result.allowed,orgPersonByUser:result.personByUser},{trainee_user:'dispatcher',trainee_person:'person-3'}),false,'Membership remapping must not reveal a stale trainee file');
console.log('Field Training cross-division behavior checks passed.');

// Conflicting source records for the same person must fail closed.
const conflictingRows=[...rows,{key:JSON.stringify([['personnel'],'duplicate']),value:{id:'person-2',unitId:'patrol'}}];
const conflictingClient={query:async()=>({rows:conflictingRows})};
const conflict=await context.ftOrgMembers(conflictingClient,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.equal(conflict.allowed.has('dispatcher'),false,'Conflicting unit records cannot grant a dispatcher access');
assert.equal(conflict.allowed.has('patrol'),false,'Patrol remains excluded');
console.log('Conflicting personnel organizational assignment denied.');

assert.match(source,/const scope=result\.rows\[0\]\.scope \?\? \{mode:'none'\}/,'Configured null Field Training scope must deny');
assert.match(source,/scope\?\.mode==='agency' \? \{mode:'none'\} : scope/,'Nonadmins must not receive agency-wide grants');
const loadStart=source.indexOf('async function ftLoadOrgScope(');
const loadEnd=source.indexOf('async function ftOrgMembers(',loadStart);
const loaderContext={}; vm.createContext(loaderContext);vm.runInContext(source.slice(loadStart,loadEnd),loaderContext);
const mockScope=async scope=>({query:async sql=>sql.includes('to_regclass')?{rows:[{relation:'suite_organizational_access'}]}:{rows:[{scope}]}});
const loadCtx={tenantId:'t',agencyId:'a',userId:'u',admin:false};
assert.equal((await loaderContext.ftLoadOrgScope(await mockScope(null),loadCtx)).mode,'none');
assert.equal((await loaderContext.ftLoadOrgScope(await mockScope({mode:'agency'}),loadCtx)).mode,'none');
assert.equal((await loaderContext.ftLoadOrgScope(await mockScope({mode:'selected',unitIds:['dispatch']}),loadCtx)).mode,'selected');
console.log('Field Training configured-grant fail-closed behavior passed.');

assert.match(source,/ctx\.orgPersonByUser=org\.personByUser/,'Both Field Training routes must retain membership-to-person binding');

const canonicalRows=[
  {tenant_id:'tenant',agency_id:'agency',person_id:'person-1',organization_id:'communications',node_kind:'unit',active:true,node_active:true},
  {tenant_id:'tenant',agency_id:'agency',person_id:'person-2',organization_id:'patrol',node_kind:'unit',active:true,node_active:true},
  {tenant_id:'tenant',agency_id:'agency',person_id:'person-2',organization_id:'communications',node_kind:'unit',active:true,node_active:true}
];
const canonicalCalls=[];
const canonicalClient={query:async(sql,args=[])=>{
  canonicalCalls.push({sql,args});
  if(sql.includes('to_regclass'))return {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes'}]};
  if(sql===PERSON_ORGANIZATION_QUERY)return {rows:canonicalRows.filter(x=>x.person_id===args[2])};
  throw Error('Unexpected canonical query');
}};
const canon=await context.ftOrgMembers(canonicalClient,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.deepEqual([...canon.allowed].sort(),['dispatch-manager','dispatcher'],'An explicitly cross-assigned person must be visible');
assert.equal(canon.allowed.has('patrol'),false,'Patrol-only staff remain outside scope');
assert.equal(canonicalCalls.filter(x=>x.sql===PERSON_ORGANIZATION_QUERY).length,3);
assert.equal(canonicalCalls.filter(x=>x.sql.includes('suite_records')).length,0,'Canonical assignments must override legacy unit fields');
const disabledClient={query:async(sql,args=[])=>sql.includes('to_regclass')?
 {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes'}]}:
 {rows:canonicalRows.filter(x=>x.person_id===args[2]).map(x=>({...x,active:false}))}};
const disabled=await context.ftOrgMembers(disabledClient,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.equal(disabled.allowed.size,0,'Inactive canonical assignments must deny');
console.log('Field Training canonical multi-assignment integration checks passed.');
