import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from './civil-support/node_modules/playwright/index.mjs';
import {CA_WORKFLOWS,createCaliforniaCase} from '../lambdas/api/lib/civil-california-domain.mjs';
const ctx={admin:true,userId:'demo',personId:'demo',today:'2026-10-17',at:'2026-10-17T16:00:00Z',eventId:'e',id:'demo',county:'Sonoma',testOnly:true};
const record=createCaliforniaCase({workflowId:'summons',caseNumber:'DEMO-CA-100',courtOfOrigin:'Fictional Court',plaintiff:'Demo Plaintiff',defendant:'Demo Defendant',receivedDate:'2026-10-16',serviceAddresses:[{address:'123 Example Lane'}]},ctx);
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.setContent('<main><div id="view-civil-board" class="view active"></div></main>');
await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
for(const file of ['base','workspace','workspace-overrides']){
  await page.addStyleTag({content:fs.readFileSync('frontend/assets/css/'+file+'.css','utf8')});
}
await page.evaluate(({record,workflows})=>{
window.STATE={personnel:[{id:'demo',name:'Demo Deputy'}]};
window.AWS_ATTACHMENTS={upload:async()=>({storageKey:'demo/file'}),download:async()=>{}};
window.SuiteStore={mode:()=> 'shared',remoteContext:()=>({tenantId:'demo',agencyId:'demo'}),api:async(_path,opt)=>{
const b=JSON.parse(opt.body);
const data=b.operation==='context'?{profile:{profileId:'US-CA',status:'test',county:'Sonoma'},workflows,admin:true,personId:'demo',abilities:[],people:[]}:b.operation==='filters'?{types:[record.paperType],locations:[record.courtOfOrigin]}:b.operation==='list'?{cases:[{record,version:1}],nextCursor:null}:b.operation==='get'?{record,version:1}:b.operation==='calendar'?{events:[]}:b.operation==='roster'?{people:[]}:null;
if(!data)throw Error('Unexpected operation: '+b.operation);return {success:true,data};
}};
},{record,workflows:CA_WORKFLOWS});
for(const name of ['civil-board-ui','civil-case-ui','civil-california-view','civil-california-calendar','civil-california'])await page.addScriptTag({content:fs.readFileSync('frontend/assets/js/modules/'+name+'.js','utf8')});
await page.evaluate(()=>window.CaliforniaCivil.route(document.querySelector('#view-civil-board'),'civil-board'));
await page.locator('[data-case]').first().click();
await page.locator('[data-section="Forms"]').click();
const forms=await page.locator('.ca-pos-catalog').textContent();
assert.equal(await page.locator('.ca-pos-catalog .ca-form-resource').count(),4,'Expected exactly four POS cards');
for(const code of ['POS-010','POS-020','POS-030','POS-040'])assert.ok(forms.includes(code),'Missing '+code);
await page.locator('.ca-pos-catalog').scrollIntoViewIfNeeded();
await page.locator('.ca-pos-catalog').screenshot({path:'artifacts/civil-forms-catalog-desktop.png'});
await page.screenshot({path:'artifacts/civil-forms-desktop.png',fullPage:true});
await page.locator('.ca-signed-upload').click();
assert.equal(await page.locator('[data-section="Documents"]').getAttribute('aria-pressed'),'true');
assert.equal(await page.locator('#ca-form form').count(),1);
await page.locator('#ca-cancel-form').click();
await page.setViewportSize({width:390,height:844});
await page.locator('.ca-proof-progress').scrollIntoViewIfNeeded();
await page.locator('.ca-proof-progress').screenshot({path:'artifacts/civil-proof-status-mobile.png'});
await page.screenshot({path:'artifacts/civil-documents-mobile.png',fullPage:true});
const mobileSize=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));
assert.ok(mobileSize.width<=mobileSize.viewport+2,'Civil mobile layout must avoid page-level horizontal overflow');
await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
await page.screenshot({path:'artifacts/civil-documents-mobile-light.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('Civil Chromium desktop/mobile smoke passed');
}finally{await browser.close();}
