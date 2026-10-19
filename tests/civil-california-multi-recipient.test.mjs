import assert from 'node:assert/strict';
import {createCaliforniaCase,applyCaliforniaCommand} from '../lambdas/api/lib/civil-california-domain.mjs';
const base={id:'multi-case',userId:'intake',personId:'officer-1',admin:true,today:'2026-10-18',at:'2026-10-18T12:00:00Z',county:'Sonoma',testOnly:true};
let seq=0;
const go=(caseRecord,command,payload={},actor={})=>applyCaliforniaCommand(caseRecord,command,payload,{...base,...actor,eventId:'evt-'+(++seq)});
const fail=(r,command,payload={},match,actor={})=>{let before=structuredClone(r);assert.throws(()=>go(r,command,payload,actor),match);assert.deepEqual(r,before)};
let r=createCaliforniaCase({workflowId:'summons',caseNumber:'TEST-MULTI',courtOfOrigin:'Demo Court',plaintiff:'Demo Petitioner',defendant:'Demo Respondent',receivedDate:'2026-10-17',serviceAddresses:[{address:'123 Demo Lane'}]},base);
r=go(r,'add_service_target',{name:'Respondent One',address:'123 Demo Lane',documentsDescription:'Summons and Complaint'});
r=go(r,'add_service_target',{name:'Respondent Two',address:'456 Demo Way',documentsDescription:'Summons and Complaint'});
const [one,two]=r.california.serviceTargets.map(t=>t.id);
assert.notEqual(one,two);
fail(r,'add_service_target',{name:'Respondent Two',address:'456 Demo Way',documentsDescription:'Duplicate'},/already listed/);
r=go(r,'intake_details',{returnByDate:'2026-11-15',instructionsReference:'Signed',deadlineAuthority:'Court order',
  formReviewReference:'Packet reviewed',reviewedForms:['SER-001'],
  ser001:{requesterName:'Requester',requesterMailingAddress:'PO Box 1',serviceTargetType:'Person',serviceTargetName:'Respondent One',
    serviceAddressType:'Home',documentsDescription:'Summons',hearingStatus:'No',safetyAccessibilityStatus:'No issues reported'}});
r=go(r,'attach_document',{kind:'Court packet',name:'court-packet.pdf',key:'packet'});
r=go(r,'attach_document',{kind:'Signed instructions',name:'instructions.pdf',key:'instructions'});
r=go(r,'approve_intake');
r=go(r,'assign',{personId:'officer-1'});
fail(r,'serve',{date:'2026-10-18',time:'10:00',recipient:'Respondent One',address:'123 Demo Lane',method:'Personal service'},/recipient-specific/);
r=go(r,'target_serve',{targetId:one,date:'2026-10-18',time:'10:00',recipient:'Respondent One',address:'123 Demo Lane',method:'Personal service'});
fail(r,'generate_target_return_draft',{targetId:one,formCode:'POS-010',pdfHash:'bogus',templateHash:'bogus'},/authenticated server-generated/);
r=go(r,'generate_target_return_draft',{targetId:one,formCode:'POS-010',
  pdfHash:'a'.repeat(64),templateHash:'b'.repeat(64)});
assert.equal(r.california.draftReturns.at(-1).targetId,one);
assert.equal(r.california.draftReturns.at(-1).unsigned,true);
r=go(r,'attach_document',{kind:'Unsigned return draft',name:'POS-010-target.pdf',
  key:'draft-target-one',targetId:one});
assert.equal(r.california.documents.at(-1).targetId,one);
assert.equal(r.california.documents.at(-1).kind,'Unsigned return draft');
fail(r,'attach_document',{kind:'Unsigned return draft',name:'invalid-target.pdf',
  key:'draft-wrong-target',targetId:'unknown'},/recipient not found/);
fail(r,'generate_target_return_draft',{targetId:two,formCode:'POS-010',
  pdfHash:'a'.repeat(64),templateHash:'b'.repeat(64)},/completed service/);
fail(r,'prepare_return',{formName:'POS-010',reference:'Packet'},/separately/);
fail(r,'target_unserved',{targetId:two,reasonCode:'Unable to locate',attemptsSummary:'No contact'},/attempt/);
r=go(r,'target_attempt',{targetId:two,date:'2026-10-18',time:'11:00',result:'No contact'});
r=go(r,'target_unserved',{targetId:two,reasonCode:'Unable to locate',attemptsSummary:'One documented visit'});
fail(r,'attach_document',{kind:'Court return',name:'missing-target.pdf',key:'bad-proof'},/recipient not found/);
r=go(r,'attach_document',{kind:'Proof of service',name:'proof-one.pdf',key:'proof-one',targetId:one});
r=go(r,'attach_document',{kind:'Court return',name:'return-two.pdf',key:'proof-two',targetId:two});
const [docOne,docTwo]=r.california.documents.filter(d=>d.targetId).map(d=>d.id);
fail(r,'prepare_target_return',{targetId:one,documentId:docTwo,formName:'POS-010',reference:'Return 1'},/recipient-linked/);
r=go(r,'prepare_target_return',{targetId:one,documentId:docOne,formName:'POS-010',reference:'Return 1'});
r=go(r,'prepare_target_return',{targetId:two,documentId:docTwo,formName:'Non-service return',reference:'Return 2'});
fail(r,'remove_document',{documentId:docOne,note:'Try tampering'},/linked to a recipient return/);
fail(r,'replace_document',{documentId:docTwo,name:'replacement.pdf',key:'replacement',note:'Try tampering'},/linked to a recipient return/);
fail(r,'review_target_return',{targetId:one,reviewReference:'SUP-1'},/independent/);
r=go(r,'review_target_return',{targetId:one,reviewReference:'SUP-1'},{userId:'supervisor'});
r=go(r,'review_target_return',{targetId:two,reviewReference:'SUP-2'},{userId:'supervisor'});
r=go(r,'record_target_return',{targetId:one,date:'2026-10-18',reference:'COURT-ONE'});
assert.notEqual(r.stage,'Returned to Court');
r=go(r,'record_target_return',{targetId:two,date:'2026-10-18',reference:'COURT-TWO'});
assert.equal(r.stage,'Returned to Court');
assert.deepEqual(r.california.serviceTargets.map(t=>t.returnPacket.receiptReference),['COURT-ONE','COURT-TWO']);
r=go(r,'close');assert.equal(r.stage,'Closed');
console.log('Multi-recipient Civil: independent outcomes, evidence, reviews, court receipts and close passed.');
