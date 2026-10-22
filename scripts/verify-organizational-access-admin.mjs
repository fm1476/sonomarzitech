import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/tenant-admin.mjs',import.meta.url),'utf8');
const start=source.indexOf("if (action === 'list_organizational_access' || action === 'set_organizational_access')");
const end=source.indexOf("if (action === 'update_agency_branding')",start);
assert.ok(start>0 && end>start,'Organizational administration endpoint exists');
const block=source.slice(start,end);
for (const pattern of [
 /suite_organizational_access/, /suite_memberships/, /agency_id=\$2/,
 /role_admin/, /auth\.platformAdmin/, /appendAuditEvent/,
 /ON CONFLICT/, /tenant_id/, /set_organizational_access/, /list_organizational_access/
]) assert.match(block,pattern);
assert.match(block,/\['none','self','selected'\]/,'Do not permit custom administrators to grant unrestricted agency mode');
assert.doesNotMatch(block,/\['none','self','selected','agency'\]/);
console.log('Organizational administration API structural checks passed.');

// Selected IDs must be resolved from records in the requested agency, not trusted from request input.
assert.match(block,/SELECT key,value FROM suite_records WHERE tenant_id=\$1 AND agency_id=\$2 AND deleted=false/);
assert.match(block,/collection==='pm\.records'/);
assert.match(block,/collection==='pm\.divisions'/);
assert.match(block,/collection==='pm\.scheduleWorkGroups'/);
assert.match(block,/clean\[kind\]\.filter\(id=>!known\[kind\]\.has\(id\)\)/);
assert.match(block,/if\(unknown\.length\) return response\(400/);
console.log('Organizational grant ID catalog validation checks passed.');


// Execute the real administrator route with mocked database boundaries.
import vm from 'node:vm';
const executed='(async function run(){'+block+'})';
const scope={mode:'selected',unitIds:['dispatch'],divisionIds:[],workGroupIds:[]};
const row=(collection,id,value)=>({key:JSON.stringify([collection.split('.'),id]),value});
const catalogs=[row('pm.records','a',{personId:'person-1',unitId:'dispatch'}),row('pm.records','b',{personId:'person-2',unitId:'patrol'}),row('pm.divisions','c',{id:'division-1'}),row('pm.scheduleWorkGroups','d',{id:'group-1',active:true})];
async function tryGrant(selectedScope,catalogRows=catalogs,agencyFound=true,memberFound=true){
  const sqlCalls=[];
  const client={query:async(sql,args=[])=>{
    sqlCalls.push({sql,args});
    if(sql.includes('SELECT id FROM suite_agencies'))return {rows:agencyFound?[{id:'agency-id'}]:[]};
    if(sql.includes('CREATE TABLE IF NOT EXISTS'))return {rows:[]};
    if(sql.includes('SELECT 1 FROM suite_memberships'))return {rows:memberFound?[{exists:1}]:[]};
    if(sql.includes('SELECT key,value FROM suite_records'))return {rows:catalogRows};
    if(sql.includes('INSERT INTO suite_organizational_access'))return {rows:[]};
    throw Error('Unexpected SQL: '+sql);
  }};
  const sandbox={client,body:{agencyId:'11111111-1111-4111-8111-111111111111',userId:'22222222-2222-4222-8222-222222222222',scope:selectedScope},tenantId:'33333333-3333-4333-8333-333333333333',action:'set_organizational_access',auth:{platformAdmin:true,userId:'44444444-4444-4444-8444-444444444444'},response:(status,data)=>({status,data}),appendAuditEvent:async()=>{}};
  vm.createContext(sandbox);
  const outcome=await vm.runInContext(executed,sandbox)();
  return {outcome,sqlCalls};
}
const accepted=await tryGrant(scope);
assert.equal(accepted.outcome.status,200);
assert.equal(accepted.sqlCalls.filter(x=>x.sql.includes('INSERT INTO suite_organizational_access')).length,1);
const unknown=await tryGrant({...scope,unitIds:['not-an-agency-unit']});
assert.equal(unknown.outcome.status,400);
assert.equal(unknown.sqlCalls.some(x=>x.sql.includes('INSERT INTO suite_organizational_access')),false);
const crossAgency=await tryGrant(scope,[row('pm.records','other-tenant',{personId:'p',unitId:'patrol'})]);
assert.equal(crossAgency.outcome.status,400,'An ID absent from this agency must be denied');
const catalogQuery=accepted.sqlCalls.find(x=>x.sql.includes('SELECT key,value FROM suite_records'));
assert.deepEqual(Array.from(catalogQuery.args),['33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111']);
assert.equal((await tryGrant(scope,catalogs,false)).outcome.status,404);
assert.equal((await tryGrant(scope,catalogs,true,false)).outcome.status,404);
assert.equal((await tryGrant({...scope,unitIds:[],divisionIds:['missing-division']})).outcome.status,400);
assert.equal((await tryGrant({...scope,unitIds:[],workGroupIds:['missing-workgroup']})).outcome.status,400);
assert.equal((await tryGrant({...scope,unitIds:[],workGroupIds:['group-1']})).outcome.status,200);
console.log('Organizational assignment API executable negative tests passed.');
