import assert from 'node:assert/strict';
import {SER001_FIELDS,SER001A_FIELDS,normalizeSerIntake,validateSerIntake,serReviewRequiredForms} from '../lambdas/api/lib/civil-california-ser-review.mjs';
const fixture1={requesterName:'Applicant',requesterMailingAddress:'PO Box 100, Sonoma CA',serviceTargetType:'Person',serviceTargetName:'Respondent',serviceAddressType:'Home',documentsDescription:'Summons and complaint',hearingStatus:'No',safetyAccessibilityStatus:'No issues reported'};
const fixtureA={requesterRole:'Judgment creditor',targetRelationship:'Judgment debtor',writType:'Writ of Execution',writCopyStatus:'Original',propertyAndLocation:'Demo asset in Sonoma',dwellingStatus:'No',personalDebtStatus:'No'};
assert.deepEqual(validateSerIntake({ser001:fixture1},['SER-001'],[{kind:'Signed instructions'}]),[]);
assert.ok(validateSerIntake({},['SER-001'],[]).some(x=>x.includes('Requesting party')));
assert.ok(validateSerIntake({ser001:{...fixture1,hearingStatus:'Yes'}},['SER-001'],[{kind:'Signed instructions'}]).some(x=>x.includes('hearing')));
assert.ok(validateSerIntake({ser001:fixture1,ser001a:fixtureA},['SER-001','SER-001A'],[{kind:'Signed instructions'}]).length===0);
assert.ok(validateSerIntake({ser001:fixture1,ser001a:{...fixtureA,personalDebtStatus:'Yes'}},['SER-001','SER-001A'],[{kind:'Signed instructions'}]).some(x=>x.includes('address-verification')));
assert.ok(validateSerIntake({ser001:{...fixture1,safetyAccessibilityStatus:'Issues reported'}},['SER-001'],[{kind:'Signed instructions'}]).some(x=>x.includes('safety')));
assert.ok(validateSerIntake({},['WG-001'],[]).length===0,'Wage garnishment instructions need different forms');
assert.throws(()=>normalizeSerIntake({requesterName:'ok',secret:'abc'}),/Unknown/);
assert.throws(()=>normalizeSerIntake({serviceTargetType:'Fictional type'}),/selection/);
assert.equal(serReviewRequiredForms(['SER-001A']).ser001a,true);
const fs=await import('node:fs/promises');
const ui=await fs.readFile(new URL('../frontend/assets/js/modules/civil-california.js',import.meta.url),'utf8');
for(const [section,fields] of [['ser001',SER001_FIELDS],['ser001a',SER001A_FIELDS]]){
  const portion=ui.slice(ui.indexOf('  const serReviewFields='),ui.indexOf('  const narrativeNoteActions'));
  for(const [key] of fields)assert.ok(portion.includes("['"+key+"'"),'UI missing '+section+' '+key);
}
console.log('SER-001 / SER-001A structured intake review rules and UI schema parity passed.');
