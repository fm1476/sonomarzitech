import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {chromium} from '@playwright/test';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sonomarzi-browser-'));const apiPort=5095,uiPort=3005,base=`http://127.0.0.1:${uiPort}`;
const env={...process.env,ASPNETCORE_ENVIRONMENT:'Development',Local__Enabled:'true',Local__Password:'LocalTest!2026',Local__DataPath:path.join(temp,'records.json'),DOTNET_CLI_HOME:process.env.DOTNET_CLI_HOME??'/tmp/ps-dotnet-home'};
const api=spawn(process.env.DOTNET_EXECUTABLE??'/tmp/ps-dotnet/dotnet',['run','--project','backend/SonoMarzi.Api','--no-build','--no-launch-profile','--','--urls',`http://127.0.0.1:${apiPort}`],{stdio:'ignore',env});
const ui=spawn(process.execPath,['scripts/dev.mjs'],{stdio:'ignore',env:{...env,PORT:String(uiPort),API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`}});
async function ready(){for(let i=0;i<150;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local app did not start');}await ready();
test.after(async()=>{api.kill('SIGTERM');ui.kill('SIGTERM');await fs.rm(temp,{recursive:true,force:true});});
test('React login and original feature screens use only local C# API',async()=>{
 const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage();const errors=[];const offsite=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))offsite.push(r.url());});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();return route.abort();});
  await page.goto(base);await page.waitForFunction(()=>typeof window.QRCode==='function');await page.getByLabel('Email',{exact:true}).fill('admin@local.test');await page.getByLabel('Password',{exact:true}).fill('LocalTest!2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForFunction(()=>document.getElementById('app')?.classList.contains('authenticated'));
  assert.equal(await page.locator('#page-title').textContent(),'My Work');
  await page.evaluate(()=>window.SonoMarziLegacy.navigate('fieldtraining'));await page.getByText('No trainees enrolled.').waitFor();
  await page.evaluate(()=>window.SonoMarziLegacy.navigate('view/qm-inventory'));assert.ok((await page.locator('#page-title').textContent()).length>0);
  const token=await page.evaluate(()=>sessionStorage.getItem('sonomarzi.aws.id_token'));const response=await fetch(base+'/api/workspace',{headers:{Authorization:'Bearer '+token}});const workspace=await response.json();
  const flat=await page.evaluate(()=>window.SonoMarziLegacy.flatKeys());const serverKeys=new Set(workspace.records.filter(r=>!r.deleted).map(r=>r.key));
  const missing=flat.filter(k=>!serverKeys.has(k));const extra=[...serverKeys].filter(k=>!flat.includes(k)&&!['ft','workflows','notices','serverAudit'].includes(JSON.parse(k)[0][0]) && JSON.parse(k)[0][1]!=='notifications');
  assert.deepEqual(missing,[],`Client generated ${missing.length} unsaved keys`);
  assert.deepEqual(extra,[],`Server had ${extra.length} unrepresented keys`);
  const equipment=workspace.records.find(r=>JSON.parse(r.key)[0].join('.')==='qm.equipment'&&!r.deleted&&JSON.parse(r.key)[1]!=='$order');
  assert.ok(equipment,'Expected local equipment fixture');
  const saved=await page.evaluate(async ({id})=>{const item=window.SonoMarziLegacy.state().qm.equipment.find(x=>x.id===id);item.name+=' Browser test';window.SonoMarziLegacy.persist();return await window.SonoMarziLegacy.flush();},{id:equipment.value.id});
  assert.equal(saved,true,'A feature edit must persist through the C# API');
  const after=await (await fetch(base+'/api/workspace',{headers:{Authorization:'Bearer '+token}})).json();
  assert.equal(after.records.find(r=>r.key===equipment.key).value.name,equipment.value.name+' Browser test');
  assert.deepEqual(errors,[]);assert.deepEqual(offsite.filter(u=>!u.startsWith('https://fonts.googleapis.com')&&!u.startsWith('https://fonts.gstatic.com')),[]);
 }finally{await browser.close();}
});
