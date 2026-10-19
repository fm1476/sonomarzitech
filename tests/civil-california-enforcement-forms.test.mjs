import assert from 'node:assert/strict';
import test from 'node:test';
import {CA_ENFORCEMENT_FORM_REGISTRY,californiaEnforcementFormReadiness} from '../lambdas/api/lib/civil-california-enforcement-forms.mjs';

test('verified current California form revisions are recorded',()=>{
 assert.equal(CA_ENFORCEMENT_FORM_REGISTRY['WG-002'].effective,'2026-01-01');
 assert.equal(CA_ENFORCEMENT_FORM_REGISTRY['WG-005'].effective,'2026-07-01');
 assert.equal(CA_ENFORCEMENT_FORM_REGISTRY['EJ-150'].effective,'2026-07-01');
 assert.equal(CA_ENFORCEMENT_FORM_REGISTRY['EJ-130'].effective,'2026-07-01');
});
test('form generation fails closed until official mappings are validated',()=>{
 for(const [code,spec] of Object.entries(CA_ENFORCEMENT_FORM_REGISTRY)){
  const result=californiaEnforcementFormReadiness({california:{workflowId:spec.workflowIds[0]}},code,{evidence:Object.fromEntries(spec.requiredEvidence.map(k=>[k,true]))});
  assert.equal(result.generationEnabled,false,code);
  assert.deepEqual(result.missingEvidence,[]);
 }
});
test('missing evidence is reported without silently substituting it',()=>{
 const result=californiaEnforcementFormReadiness({california:{workflowId:'earnings-withholding'}},'WG-005');
 assert.deepEqual(result.missingEvidence,['employer-response','employer-declaration']);
 assert.equal(result.signatureAuthority,'employer');
});
test('mismatched workflow and unknown form are rejected',()=>{
 assert.throws(()=>californiaEnforcementFormReadiness({california:{workflowId:'summons'}},'EJ-150'),/does not apply/);
 assert.throws(()=>californiaEnforcementFormReadiness({california:{workflowId:'bank-levy'}},'FAKE'),/Unknown/);
});
test('court-issued writs cannot be generated as issued instruments',()=>{
 const result=californiaEnforcementFormReadiness({california:{workflowId:'execution'}},'EJ-130',{evidence:{'court-issued-writ':true}});
 assert.equal(result.issuer,'court');assert.equal(result.generationEnabled,false);
 assert.match(result.reason,/Upload the issued court writ/);
});
