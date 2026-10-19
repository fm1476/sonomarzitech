import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pdfLib from '../lambdas/api/node_modules/pdf-lib/cjs/index.js';
import {generateCaliforniaEnforcementUnsignedDraft} from '../lambdas/api/lib/civil-california-enforcement-pdf-service.mjs';
const {PDFDocument}=pdfLib;
const home=new URL('../lambdas/api/templates/civil/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('enforcement-uploaded-manifest.json',home),'utf8'));
const mappings=JSON.parse(await readFile(new URL('enforcement-field-map.json',home),'utf8'));
for(const [code,file] of Object.entries({'WG-002':'wg002.pdf','WG-005':'wg005.pdf','EJ-150':'ej150.pdf','EJ-130':'ej130.pdf','WG-006':'wg006.pdf'})){
 test('official '+code+' binary matches approval manifest and field map',async()=>{
  const bytes=await readFile(new URL(file,home));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest[code].templateSha256);
  const doc=await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),manifest[code].pages);
  assert.equal(doc.getForm().getFields().length,manifest[code].fields);
  const actual=new Set(doc.getForm().getFields().map(f=>f.getName()));
  for(const field of Object.values(mappings[code]||{}))assert.ok(actual.has(field),code+' missing '+field);
 });
}
const base=(id)=>({id:'11111111-1111-4111-8111-111111111111',caseNumber:'T-1',plaintiff:'Demo A',defendant:'Demo B',california:{county:'Sonoma',workflowId:id,holds:[]}});
test('uploaded WG-002 creates a readable unsigned court PDF with populated case',async()=>{
 const result=await generateCaliforniaEnforcementUnsignedDraft(base('earnings-withholding'),'WG-002',
  {order:{levyingOfficer:'Sheriff',employer:'Test Employer',employee:'Test Employee',totalDueCents:10000,judgmentDate:'2026-10-01'}});
 const doc=await PDFDocument.load(Buffer.from(result.base64,'base64'));
 assert.equal(doc.getForm().getTextField(mappings['WG-002'].caseNumber).getText(),'T-1');
 assert.equal(result.unsigned,true);
});
test('uploaded EJ-150 creates a readable unsigned levy notice with populated total',async()=>{
 const result=await generateCaliforniaEnforcementUnsignedDraft(base('bank-levy'),'EJ-150',
  {notice:{levyTarget:'Demo Bank',issuedWritReference:'WRIT-T-1',noticeDate:'2026-10-01',
    levyingOfficer:'Sheriff',judgmentDebtor:'Demo B',personNotified:'Demo B',propertyDescription:'Deposit account',
    totalDueCents:10000,levyFeeCents:1500,sheriffDisbursementFeeCents:100,recoverableCostsCents:0,dailyInterestCents:0}});
 const doc=await PDFDocument.load(Buffer.from(result.base64,'base64'));
 assert.equal(doc.getForm().getTextField(mappings['EJ-150'].caseNumber).getText(),'T-1');
 assert.equal(result.unsigned,true);
});
test('court-issued EJ-130 is not manufactured by the generator',async()=>{
 await assert.rejects(generateCaliforniaEnforcementUnsignedDraft(base('execution'),'EJ-130',{}),/not supported/);
});
