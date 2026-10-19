import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareCaliforniaEnforcementFormData} from '../lambdas/api/lib/civil-california-form-preparation.mjs';
const base=(workflowId)=>({caseNumber:'TEST-123',plaintiff:'Fictional Plaintiff',defendant:'Fictional Debtor',california:{workflowId,county:'Sonoma',holds:[]}});
test('WG-005 never invents employer response or signature',()=>{
 const p=prepareCaliforniaEnforcementFormData(base('earnings-withholding'),'WG-005');
 assert.equal(p.fields.employmentStatus,'');assert.equal(p.fields.employerSignature,'');
 assert.equal(p.generatedPdf,false);assert.equal(p.readiness.generationEnabled,false);
});
test('EJ-150 requires writ and specific levy details',()=>{
 const r=base('bank-levy');
 assert.throws(()=>prepareCaliforniaEnforcementFormData(r,'EJ-150'),/Levy target/);
 const p=prepareCaliforniaEnforcementFormData(r,'EJ-150',{notice:{levyTarget:'Fictional Bank',issuedWritReference:'COURT-1',noticeDate:'2026-10-10'}});
 assert.equal(p.fields.levyTarget,'Fictional Bank');assert.equal(p.fields.noticeSigner,'');assert.equal(p.fields.amountCents,null);assert.equal(p.generatedPdf,false);
});
test('EJ-150 preparation rejects active holds and unrelated workflows',()=>{
 const r=base('bank-levy');r.california.holds=[{id:'HOLD-1'}];
 assert.throws(()=>prepareCaliforniaEnforcementFormData(r,'EJ-150',{notice:{levyTarget:'Bank',issuedWritReference:'123',noticeDate:'2026-10-10'}}),/Unresolved hold/);
 assert.throws(()=>prepareCaliforniaEnforcementFormData(base('summons'),'EJ-150'),/does not apply/);
});
test('EJ-130 can never represent a court-issued writ',()=>{
 const p=prepareCaliforniaEnforcementFormData(base('execution'),'EJ-130');
 assert.equal(p.generatedPdf,false);assert.equal(p.readiness.generationEnabled,false);assert.equal(p.signature,'');
});
