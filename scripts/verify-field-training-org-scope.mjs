import assert from 'node:assert/strict';
import vm from 'node:vm';
import {canAccessOrganizationalRecord} from '../lambdas/api/lib/organizational-access.mjs';
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
const context={canAccessOrganizationalRecord,ftLoadOrgScope:async()=>scope};
vm.createContext(context);
vm.runInContext(source.slice(begin,end),context);
const client={query:async()=>({rows})};
const result=await context.ftOrgMembers(client,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.deepEqual([...result.allowed].sort(),['dispatch-manager','dispatcher']);
assert.equal(context.ftOrgAllowsEnrollment({orgScope:scope,orgAllowed:result.allowed},{trainee_user:'dispatcher'}),true);
assert.equal(context.ftOrgAllowsEnrollment({orgScope:scope,orgAllowed:result.allowed},{trainee_user:'patrol'}),false);
console.log('Field Training cross-division behavior checks passed.');

// Conflicting source records for the same person must fail closed.
const conflictingRows=[...rows,{key:JSON.stringify([['personnel'],'duplicate']),value:{id:'person-2',unitId:'patrol'}}];
const conflictingClient={query:async()=>({rows:conflictingRows})};
const conflict=await context.ftOrgMembers(conflictingClient,{tenantId:'tenant',agencyId:'agency',personId:'person-1',userId:'dispatch-manager'},members);
assert.equal(conflict.allowed.has('dispatcher'),false,'Conflicting unit records cannot grant a dispatcher access');
assert.equal(conflict.allowed.has('patrol'),false,'Patrol remains excluded');
console.log('Conflicting personnel organizational assignment denied.');

assert.match(source,/return result\.rows\.length \? \(result\.rows\[0\]\.scope \?\? \{mode:'none'\}\) : null;/,'Configured null Field Training scope must deny');
