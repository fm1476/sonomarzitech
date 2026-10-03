import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sonomarzi-v14-test-'));const port=5094;const base=`http://127.0.0.1:${port}/api`;
const server=spawn(process.env.DOTNET_EXECUTABLE??'/tmp/ps-dotnet/dotnet',['run','--project','backend/SonoMarzi.Api','--no-build','--no-launch-profile','--','--urls',`http://127.0.0.1:${port}`],{stdio:'ignore',env:{...process.env,ASPNETCORE_ENVIRONMENT:'Development',Local__Enabled:'true',Local__Password:'LocalTest!2026',Local__DataPath:path.join(directory,'records.json'),DOTNET_CLI_HOME:process.env.DOTNET_CLI_HOME??'/tmp/ps-dotnet-home'}});
async function call(route,body,token){const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const raw=await response.text();return {status:response.status,data:raw?JSON.parse(raw):null};}
async function ready(){for(let i=0;i<100;i++){try{if((await call('/health')).status===200)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('C# API did not start');}
await ready();
const tenant='f15865be-cf46-41e0-9d60-7cd753437501',agency='64624bcc-232d-4af5-bae6-a8e621cde447';
const identity=async email=>{const res=await call('/auth/login',{email,password:'LocalTest!2026'});assert.equal(res.status,200);return res.data.token;};
test.after(async()=>{server.kill('SIGTERM');await fs.rm(directory,{recursive:true,force:true});});
test('authentication, membership and filtered workspace',async()=>{
 assert.equal((await call('/workspace')).status,401);
 assert.equal((await call('/auth/login',{email:'admin@local.test',password:'wrong'})).status,401);
 const admin=await identity('admin@local.test'),officer=await identity('officer@local.test');
 const workspace=await call('/workspace',undefined,admin);assert.equal(workspace.status,200);assert.ok(workspace.data.records.length>200);
 const limited=await call('/workspace',undefined,officer);assert.equal(limited.status,200);assert.ok(limited.data.records.length<workspace.data.records.length);
 assert.equal((await call(`/workspace?tenantId=${tenant}&agencyId=00000000-0000-0000-0000-000000000000`,undefined,officer)).status,403);
 assert.ok(!limited.data.records.some(r=>JSON.parse(r.key)[0][0]==='accounts'));
 const personnel=limited.data.records.find(r=>JSON.parse(r.key)[0][0]==='personnel'&&JSON.parse(r.key)[1]==='p1');assert.deepEqual(Object.keys(personnel.value).sort(),['badge','email','id','name','qualifications','roleIds','unit'].sort());
});
test('atomic versioned saves, conflict and restricted writes',async()=>{
 const admin=await identity('admin@local.test'),officer=await identity('officer@local.test');const key=JSON.stringify([['qm','equipment'],'test-atomic-'+Date.now()]);
 const value={id:JSON.parse(key)[1],name:'Test fixture'};
 const change=(k,expected,v)=>({key:k,value:v,expected_version:expected,deleted:false});
 assert.equal((await call('/apply-changes',{tenant_id:tenant,agency_id:agency,changes:[change(key,0,value)]},officer)).status,403);
 assert.equal((await call('/apply-changes',{tenant_id:tenant,agency_id:agency,changes:[change(key,0,value)]},admin)).status,200);
 const other=JSON.stringify([['qm','equipment'],'test-rollback-'+Date.now()]);
 const result=await call('/apply-changes',{tenant_id:tenant,agency_id:agency,changes:[change(other,0,{id:JSON.parse(other)[1]}),change(key,0,value)]},admin);assert.equal(result.status,409);
 const workspace=await call('/workspace',undefined,admin);assert.equal(workspace.data.records.find(r=>r.key===key).version,1);assert.equal(workspace.data.records.find(r=>r.key===other),undefined);
 assert.equal((await call('/apply-changes',{tenant_id:tenant,agency_id:agency,changes:[change(JSON.stringify([['accounts'],'x']),0,{})]},admin)).status,403);
});
test('Field Training program and in-app notices',async()=>{
 const admin=await identity('admin@local.test');const args={p_tenant_id:tenant,p_agency_id:agency};
 const listing=await call('/rpc/suite_ft_api',{...args,p_action:'list',p_payload:{}},admin);assert.equal(listing.status,200);assert.ok(listing.data.members.length>=3);
 const template={phases:[{id:'phase1',name:'Phase 1'}],ratingScale:[{id:'1',label:'Needs coaching'},{id:'2',label:'Meets standard'}],categories:[{id:'c1',label:'Safety'}],items:[{id:'i1',label:'Checklist'}]};
 const config=await call('/rpc/suite_ft_api',{...args,p_action:'save_config',p_payload:{model:'san_jose',template}},admin);assert.equal(config.status,200,JSON.stringify(config.data));
 const enrollment=await call('/rpc/suite_ft_api',{...args,p_action:'enroll',p_payload:{traineeUser:'local-officer',trainerUser:'local-trainer',supervisorUser:'local-supervisor',startedOn:'2026-10-03'}},admin);assert.equal(enrollment.status,200,JSON.stringify(enrollment.data));
 const check=await call('/rpc/suite_ft_api',{...args,p_action:'list',p_payload:{}},admin);assert.equal(check.data.enrollments.length,1);
 const notice=await call('/rpc/suite_notify_create',{p_tenant:tenant,p_agency:agency,p_body:'Local test notice',p_people:['p2'],p_units:[],p_shifts:[],p_on_date:'2026-10-03',p_client_id:'notice-'+Date.now()},admin);assert.equal(notice.status,200,JSON.stringify(notice.data));
 const officer=await identity('officer@local.test');const inbox=await call('/rpc/suite_notify_inbox',{p_tenant:tenant,p_agency:agency},officer);assert.equal(inbox.status,200);assert.ok(inbox.data.some(n=>n.body==='Local test notice'));
});
test('notification read status persists for its owner only',async()=>{
 const officer=await identity('officer@local.test'),admin=await identity('admin@local.test');const scope={p_tenant_id:tenant,p_agency_id:agency};
 const before=await call('/rpc/suite_notification_reads',{...scope,p_action:'list'},officer);assert.equal(before.status,200);assert.deepEqual(before.data,[]);
 const marked=await call('/rpc/suite_notification_reads',{...scope,p_action:'mark',p_keys:['qm|test-alert']},officer);assert.equal(marked.status,200,JSON.stringify(marked.data));assert.deepEqual(marked.data,['qm|test-alert']);
 const after=await call('/rpc/suite_notification_reads',{...scope,p_action:'list'},officer);assert.deepEqual(after.data,['qm|test-alert']);
 const adminReads=await call('/rpc/suite_notification_reads',{...scope,p_action:'list'},admin);assert.deepEqual(adminReads.data,[]);
 const officerMe=await call('/me',undefined,officer);const person=officerMe.data.memberships[0].person_id;const key=JSON.stringify([['notificationReads'],person]);
 const ownWorkspace=await call('/workspace',undefined,officer);assert.ok(ownWorkspace.data.records.some(r=>r.key===key));
 const adminWorkspace=await call('/workspace',undefined,admin);assert.ok(!adminWorkspace.data.records.some(r=>r.key===key));
 const forged={tenant_id:tenant,agency_id:agency,changes:[{key,value:{id:person,personId:person,keys:['qm|forged']},expected_version:1,deleted:false}]};
 assert.equal((await call('/apply-changes',forged,admin)).status,403);
 assert.equal((await call('/rpc/suite_notification_reads',{...scope,p_action:'mark',p_keys:['invalid|test']},officer)).status,400);
});
