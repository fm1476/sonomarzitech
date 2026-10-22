import assert from 'node:assert/strict';
import {activePersonAssignments,authorizedPersonFromAssignments,PERSON_ORGANIZATION_QUERY,AGENCY_PERSON_ORGANIZATION_QUERY,canonicalOrganizationReady} from '../lambdas/api/lib/organization-assignments.mjs';
const t='tenant-a',a='agency-a',p='employee-a';
const entry=(org,kind='unit',extra={})=>({tenant_id:t,agency_id:a,person_id:p,organization_id:org,node_kind:kind,node_active:true,active:true,...extra});
const rows=[entry('patrol'),entry('dispatch'),entry('operations','division'),entry('dispatch-admin','work_group')];
const c={tenantId:t,agencyId:a,personId:p,actorPersonId:'manager',onDate:'2026-10-22'};
assert.equal(activePersonAssignments(rows,c).length,4);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},rows,c),true);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['fire']},rows,c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',divisionIds:['operations']},rows,c),true);
assert.equal(authorizedPersonFromAssignments({mode:'selected',workGroupIds:['dispatch-admin']},rows,c),true);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},rows,{...c,agencyId:'agency-b'}),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},rows,{...c,personId:'other'}),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{active:false})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{node_active:false})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{effective_from:'2026-10-23'})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{effective_to:'2026-10-21'})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{effective_from:'2026-10-22',effective_to:'2026-10-22'})],c),true);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{agency_id:'agency-b'})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'selected',unitIds:['dispatch']},[entry('dispatch','unit',{tenant_id:'tenant-b'})],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'agency'},rows,c),false);
assert.equal(authorizedPersonFromAssignments({mode:'agency'},rows,{...c,verifiedAdministrator:true}),true);
assert.equal(authorizedPersonFromAssignments({mode:'self'},[],{...c,actorPersonId:p}),true);
assert.equal(authorizedPersonFromAssignments({mode:'self'},[],c),false);
assert.equal(authorizedPersonFromAssignments({mode:'none'},rows,c),false);
assert.match(PERSON_ORGANIZATION_QUERY,/a\.tenant_id=\$1 AND a\.agency_id=\$2 AND a\.person_id=\$3/);
console.log('Canonical organizational assignment authorization checks passed.');

const notInstalled={query:async()=>({rows:[{assignments:null,nodes:null,rollout:null}]})};
assert.equal(await canonicalOrganizationReady(notInstalled,'tenant','agency'),false);
const noActivation={query:async(sql)=>sql.includes('to_regclass')?
 {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes',rollout:'suite_organization_rollout'}]}:
 {rows:[{enabled:false}]}};
assert.equal(await canonicalOrganizationReady(noActivation,'tenant','agency'),false,'Installed but unactivated tables cannot cut over');
const activationCalls=[];
const activated={query:async(sql,args=[])=>{
 activationCalls.push({sql,args});
 return sql.includes('to_regclass')?
 {rows:[{assignments:'suite_person_organization_assignments',nodes:'suite_organization_nodes',rollout:'suite_organization_rollout'}]}:
 {rows:[{enabled:true}]};
}};
assert.equal(await canonicalOrganizationReady(activated,'tenant','agency'),true);
assert.deepEqual(activationCalls[1].args,['tenant','agency']);
console.log('Agency rollout gate tests passed.');

const underDivision=[entry('dispatch','unit',{ancestor_division_ids:['communications-division']})];
assert.equal(authorizedPersonFromAssignments({mode:'selected',divisionIds:['communications-division']},underDivision,c),true,'Division grant covers directly assigned unit descendants');
assert.equal(authorizedPersonFromAssignments({mode:'selected',divisionIds:['other-division']},underDivision,c),false,'Unrelated division stays denied');
assert.equal(authorizedPersonFromAssignments({mode:'selected',divisionIds:['communications-division']},[entry('dispatch','unit',{ancestor_division_ids:[],active:false})],c),false);
assert.match(PERSON_ORGANIZATION_QUERY,/WITH RECURSIVE ancestor_chain/);
assert.match(PERSON_ORGANIZATION_QUERY,/NOT parent.id=ANY\(child.visited\)/,'Organizational hierarchy traversal must reject cycles');
assert.match(PERSON_ORGANIZATION_QUERY,/parent.active=true/,'Inactive ancestors must not confer inherited grants');
console.log('Canonical parent-division inheritance tests passed.');

// Activated agencies must fail closed for non-administrators with no scope row.
import {readFileSync} from 'node:fs';
const core=readFileSync(new URL('../lambdas/api/core.mjs',import.meta.url),'utf8');
const ft=readFileSync(new URL('../lambdas/api/field-training.mjs',import.meta.url),'utf8');
const coreStart=core.indexOf('async function loadPersonnelScope(');
const coreEnd=core.indexOf('function personnelScopeAllows(',coreStart);
const ftStart=ft.indexOf('async function ftLoadOrgScope(');
const ftEnd=ft.indexOf('async function ftOrgMembers(',ftStart);
assert.ok(coreStart>=0 && coreEnd>coreStart && ftStart>=0 && ftEnd>ftStart);
for(const block of [core.slice(coreStart,coreEnd),ft.slice(ftStart,ftEnd)]) {
  assert.match(block,/canonicalOrganizationReady\(client,/);
  assert.match(block,/\? \{mode:'none'\} : null/);
}
console.log('Activated-agency missing-scope fail-closed structural checks passed.');

import vm from 'node:vm';
const testScopes=async(source,fnName,endMarker,authInput)=>{
  const start=source.indexOf('async function '+fnName+'(');
  const end=source.indexOf(endMarker,start);
  assert.ok(start>=0 && end>start);
  let active=false;
  const sandbox={canonicalOrganizationReady:async()=>active};
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  const ctx={tenantId:'tenant',agencyId:'agency',userId:'user',admin:false,...authInput};
  const run=async({enabled=false,grants=[],table=true}={})=>{
    active=enabled;
    const client={query:async(sql,args=[])=>{
      if(sql.includes('to_regclass'))return {rows:[{relation:table?'suite_organizational_access':null}]};
      if(sql.includes('SELECT scope FROM suite_organizational_access')) {
        assert.deepEqual(Array.from(args),['tenant','agency','user']);
        return {rows:grants};
      }
      throw Error('Unexpected access scope SQL');
    }};
    return sandbox[fnName](client,ctx);
  };
  assert.equal(await run(),null,'Before activation unconfigured accounts retain legacy behavior');
  assert.equal((await run({enabled:true}))?.mode,'none','After activation unconfigured accounts deny');
  assert.equal((await run({enabled:true,table:false}))?.mode,'none','After activation absent grant table must deny');
  assert.equal((await run({enabled:true,grants:[{scope:null}]}))?.mode,'none','Explicit null grant must deny');
  assert.equal((await run({enabled:true,grants:[{scope:{mode:'selected',unitIds:['dispatch']}}]}))?.mode,'selected','Configured scope retained');
  assert.equal((await run({enabled:false,grants:[{scope:{mode:'none'}}]}))?.mode,'none','Explicit deny works before activation');
};
await testScopes(core,'loadPersonnelScope','function personnelScopeAllows(');
await testScopes(ft,'ftLoadOrgScope','async function ftOrgMembers(');
console.log('Executable missing-grant activation boundaries passed for Personnel and Field Training.');

// A bulk Personnel list and a single-person/attachment lookup must traverse
// exactly the same active hierarchy, or a list can expose a denied subject.
const hierarchySql = query => query.slice(query.indexOf('WITH RECURSIVE ancestor_chain'), query.indexOf('AS ancestor_division_ids'));
assert.equal(hierarchySql(AGENCY_PERSON_ORGANIZATION_QUERY), hierarchySql(PERSON_ORGANIZATION_QUERY),
  'Bulk and single-person authorization must use identical active ancestor traversal');
console.log('Bulk Personnel and single-person hierarchy authorization parity passed.');
