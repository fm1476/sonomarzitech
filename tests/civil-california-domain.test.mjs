import assert from 'node:assert/strict';
import {CA_WORKFLOWS,createCaliforniaCase,applyCaliforniaCommand,ledgerBalance,civilDate} from '../lambdas/api/lib/civil-california-domain.mjs';
const ctx={admin:true,userId:'clerk',personId:'person-a',today:'2026-10-17',at:'2026-10-17T12:00:00Z',eventId:'event',id:'case',county:'Sonoma',testOnly:true};
const intake=workflowId=>({workflowId,caseNumber:'TEST-CA',courtOfOrigin:'Fictional Court',plaintiff:'Demo Plaintiff',defendant:'Demo Defendant',receivedDate:'2026-10-16',serviceAddresses:[{address:'123 Fictional Lane'}]});
let seq=0;
const step=(r,command,payload={},actor=ctx)=>applyCaliforniaCommand(r,command,{note:'Fictional verification',...payload},{...actor,eventId:String(++seq)});
const fails=(r,command,payload={},actor=ctx,pattern)=>{const snapshot=structuredClone(r);assert.throws(()=>step(r,command,payload,actor),pattern);assert.deepEqual(r,snapshot,'Rejected command must not mutate original');};
const doc=(r,kind)=>step(r,'attach_document',{name:kind+'.pdf',key:'uploaded/'+kind,kind});
const serEvidence={
  ser001:{requesterName:'Demo Requester',requesterMailingAddress:'P.O. Box 10, Sonoma, CA',serviceTargetType:'Person',serviceTargetName:'Demo Defendant',serviceAddressType:'Home',documentsDescription:'Summons and complaint',hearingStatus:'No',safetyAccessibilityStatus:'No issues reported'},
  ser001a:{requesterRole:'Judgment creditor',targetRelationship:'Judgment debtor',writType:'Writ of execution',writCopyStatus:'Original',propertyAndLocation:'Demo property, Sonoma, California',dwellingStatus:'No',personalDebtStatus:'No'}
};
const ready=workflowId=>{
 let r=createCaliforniaCase(intake(workflowId),ctx);
 fails(r,'approve_intake');
 r=step(r,'intake_details',{returnByDate:'2026-11-15',instructionsReference:'Signed packet',deadlineAuthority:'Reviewed court order',formReviewReference:'Reviewed current court forms',reviewedForms:CA_WORKFLOWS[workflowId].forms,...(CA_WORKFLOWS[workflowId].forms.includes('SER-001')?{ser001:serEvidence.ser001}:{}),...(CA_WORKFLOWS[workflowId].forms.includes('SER-001A')?{ser001a:serEvidence.ser001a}:{}),issuedDate:'2026-10-01',writExpirationDate:'2027-04-01',employerName:'Demo Employer',personalDebtStatus:'No',propertyDescription:'Fictional parcel',financialInstitution:'Demo Bank'});
 r=doc(doc(r,'Court packet'),'Signed instructions');if(CA_WORKFLOWS[workflowId].writ)r=doc(r,'Writ');return step(r,'approve_intake');
};
// Routine structured actions no longer demand repetitive notes.
let noNoteCase=createCaliforniaCase(intake('summons'),ctx);
noNoteCase=applyCaliforniaCommand(noNoteCase,'intake_details',{returnByDate:'2026-11-15',instructionsReference:'Signed',deadlineAuthority:'Court order',formReviewReference:'Reviewed',reviewedForms:['SER-001'],ser001:serEvidence.ser001},ctx);
assert.equal(noNoteCase.california.history.at(-1).note,'');
assert.throws(()=>applyCaliforniaCommand(noNoteCase,'cancel',{note:''},ctx),/note|decision|exception/i);
assert.equal(civilDate('2026-02-29'),false);assert.equal(civilDate('2028-02-29'),true);
assert.throws(()=>createCaliforniaCase({...intake('summons'),receivedDate:'2099-01-01'},ctx));
assert.throws(()=>createCaliforniaCase(intake('summons'),{...ctx,admin:false,abilities:[]}));
for(const workflowId of Object.keys(CA_WORKFLOWS)){
 let r=ready(workflowId);assert.equal(r.stage,'Ready');r=step(r,'assign',{personId:ctx.personId});
 const other={...ctx,admin:false,personId:'other',abilities:['civil_paper_view_all','civil_paper_log_attempt']};
 fails(r,'attempt',{date:'2026-10-17',time:'10:00',result:'Not home'},other,/assigned server/);
 fails(r,'unserved',{},other,/assigned server/);
 fails(r,'serve',{date:'2026-10-17',time:'10:00',recipient:'Demo',address:'Fictional',method:'Substituted service'});
 fails(r,'attempt',{date:'2026-10-18',time:'10:00',result:'Not home'});
 r=step(r,'attempt',{date:'2026-10-17',time:'10:00',result:'Not home'});
 r=step(r,'serve',{date:'2026-10-17',time:'11:00',recipient:'Demo',address:'Fictional',method:'Personal service'});
 if(workflowId==='sheriff-sale'){
   r=step(r,'schedule_sheriff_sale',{propertyType:'Personal property',propertyDescription:'Fictional parcel',
     saleLocation:'County annex',saleDate:'2026-10-17',writReference:'Fictional writ',noticeAuthority:'Fictional reviewed notice authority',
     legalReviewReference:'Fictional legal acceptance'});
   r=step(r,'attach_document',{kind:'Other',name:'Fictional sale notice',key:'sale-notice-'+workflowId});
   const saleNoticeId=r.california.documents.at(-1).id;
   r=step(r,'record_sheriff_sale_notice',{recipient:'Interested persons',method:'Publication',date:'2026-10-17',
     authorityReference:'Reviewed fictional notice',documentId:saleNoticeId});
   r=step(r,'approve_sheriff_sale',{reviewReference:'Supervisor-approval',noticeCompletionReference:'Notices-verified',
     authorityReference:'Court packet'},{...ctx,userId:'sale-approver'});
   r=step(r,'record_sheriff_sale_result',{outcome:'No bids',date:'2026-10-17',
     authorityReference:'Court packet',resultReference:'No bidders'});
 }
 fails(r,'prepare_return',{formName:'Reviewed return',reference:'Packet'});
 r=doc(r,'Proof of service');r=step(r,'prepare_return',{formName:'Reviewed return',reference:'Packet'});fails(r,'review_return',{},ctx,/different supervisor/);
 fails(r,'review_return',{}, {...ctx,userId:'reviewer'},/review reference/);r=step(r,'review_return',{reviewReference:'SUP-REVIEW-001'}, {...ctx,userId:'reviewer'});assert.equal(r.california.returnPacket.reviewReference,'SUP-REVIEW-001');r=step(r,'record_return',{date:'2026-10-17',reference:'Court receipt'});r=step(r,'close');assert.equal(r.stage,'Closed');fails(r,'receipt',{kind:'Service fee',amountCents:100,payer:'Demo',reference:'R1'});
}
let r=ready('bank-levy');r=step(r,'receipt',{kind:'Creditor deposit',amountCents:10000,payer:'Demo',reference:'R1'});assert.equal(ledgerBalance(r),10000);
fails(r,'receipt',{kind:'Creditor deposit',amountCents:100,payer:'Demo',reference:'R1'},ctx,/already recorded/);
fails(r,'expense',{amountCents:10001,authority:'Reviewed',reference:'E1'});
fails(r,'receipt',{kind:'Creditor deposit',amountCents:Number.MAX_SAFE_INTEGER,payer:'Demo',reference:'R2'},ctx,/accounting range/);
r=step(r,'hold',{kind:'Bankruptcy',reference:'Demo stay'});fails(r,'request_disbursement',{amountCents:10000,payee:'Demo',authority:'Order',reference:'D1'});
fails(r,'enforcement_event',{kind:'Levy',date:'2026-10-17',description:'Fictional',authorityReference:'Order'});
r=step(r,'resolve_hold',{holdId:r.california.holds[0].id,orderReference:'Court resolution'});
r=step(r,'enforcement_event',{id:'spoofed',kind:'Levy',date:'2026-10-17',description:'Fictional',authorityReference:'Order'});assert.notEqual(r.california.enforcement[0].id,'spoofed');
r=step(r,'request_disbursement',{amountCents:10000,payee:'Demo',authority:'Order',reference:'D1'});const disbursementId=r.california.disbursements[0].id;fails(r,'approve_disbursement',{disbursementId});r=step(r,'approve_disbursement',{disbursementId},{...ctx,userId:'finance-reviewer'});r=step(r,'record_disbursement',{disbursementId,paymentReference:'CHECK-1'});assert.equal(ledgerBalance(r),0);fails(r,'record_disbursement',{disbursementId,paymentReference:'CHECK-1'});fails(r,'cancel');r=step(r,'reconcile',{verifiedBalanceCents:0,reference:'Bank reconciliation'});r=step(r,'cancel');assert.equal(r.stage,'Cancelled');
// Wage-garnishment document applicability: conditional debtor address verification.
let wage=ready('earnings-withholding');
assert.equal(wage.stage,'Ready');
let wageMissing=createCaliforniaCase(intake('earnings-withholding'),ctx);
wageMissing=step(wageMissing,'intake_details',{
  returnByDate:'2026-11-15',instructionsReference:'Signed packet',deadlineAuthority:'Reviewed order',
  formReviewReference:'Reviewed',reviewedForms:['WG-001','WG-002','WG-005'],
  issuedDate:'2026-10-01',writExpirationDate:'2027-04-01',employerName:'Demo Employer',
  personalDebtStatus:'Yes',addressVerificationReference:'WG-015 test reference'
});
wageMissing=doc(doc(doc(wageMissing,'Court packet'),'Signed instructions'),'Writ');
fails(wageMissing,'approve_intake',{},ctx,/Review all required/);
wageMissing=step(wageMissing,'intake_details',{returnByDate:'2026-11-15',reviewedForms:['WG-001','WG-002','WG-005','WG-015/EJ-135']});
fails(wageMissing,'approve_intake',{},ctx,/WG-015 or EJ-135/);
wageMissing=step(wageMissing,'attach_document',{name:'WG-015-SIGNED.pdf',key:'test/WG015',kind:'Other'});
wageMissing=step(wageMissing,'approve_intake');assert.equal(wageMissing.stage,'Ready');
// Levy collections are held until a separate reviewed release, not released by an
// assumed statewide or Sonoma-only fixed-day timer.
let levy=ready('bank-levy');
levy=step(levy,'receipt',{kind:'Levy collection',amountCents:7500,payer:'Demo Bank',reference:'LEVY-COLL-1'});
fails(levy,'expense',{amountCents:100,authority:'Reviewed',reference:'EXP-HELD'},ctx,/unavailable|released/);
const collectionId=levy.california.ledger[0].id;
fails(levy,'release_collection',{collectionId,county:'Sonoma',earliestReleaseDate:'2026-10-17',policyVersion:'county-reviewed',authorityReference:'court',reviewNote:'Reviewed'},ctx,/separate finance reviewer/);
fails(levy,'release_collection',{collectionId,county:'Napa',earliestReleaseDate:'2026-10-17',policyVersion:'county-reviewed',authorityReference:'court',reviewNote:'Reviewed'},{...ctx,userId:'second-reviewer'},/match the agency county/);
fails(levy,'release_collection',{collectionId,county:'Sonoma',earliestReleaseDate:'2026-10-18',policyVersion:'county-reviewed',authorityReference:'court',reviewNote:'Reviewed'},{...ctx,userId:'second-reviewer'},/cannot be released early/);
levy=step(levy,'release_collection',{collectionId,county:'Sonoma',earliestReleaseDate:'2026-10-17',policyVersion:'sample-policy-2026',authorityReference:'Court authorization test',reviewNote:'Fictional authorized release after all claims resolved'},{...ctx,userId:'second-reviewer'});
assert.equal(levy.california.ledger[0].releaseReviewedBy,'second-reviewer');
levy=step(levy,'expense',{amountCents:100,authority:'Reviewed',reference:'EXP-AFTER-RELEASE'});
// Court-backed possession / property release cannot be recorded merely by
// typing an approval reference. Independent authorization and evidence are required.
let possession=ready('possession');
fails(possession,'enforcement_event',{kind:'Possession',date:'2026-10-17',description:'Demo possession',authorityReference:'Writ',approvalReference:'typed by preparer'},ctx,/independent.*authorization/);
possession=step(possession,'attach_document',{kind:'Court order',name:'signed-possession-order.pdf',key:'demo-possession-order'});
const evidenceDocumentId=possession.california.documents.at(-1).id;
possession=step(possession,'request_enforcement_authorization',{kind:'Possession',propertyDescription:'Fictional unit 1',
  authorityReference:'Court order',reason:'Possession authorized by reviewed order',evidenceDocumentId});
const authorizationId=possession.california.enforcementAuthorizations.at(-1).id;
fails(possession,'approve_enforcement_authorization',{authorizationId,reviewReference:'Supervisor-1',noticeReviewReference:'Notice checked'},ctx,/separate authorized reviewer/);
possession=step(possession,'approve_enforcement_authorization',{authorizationId,reviewReference:'Supervisor-1',
  noticeReviewReference:'Court notices verified'},{...ctx,userId:'independent-supervisor'});
fails(possession,'enforcement_event',{authorizationId,kind:'Possession',date:'2026-10-17',
  description:'Fictional possession',authorityReference:'Order',approvalReference:'wrong-reference'},ctx,/independent authorization reference/);
possession=step(possession,'enforcement_event',{authorizationId,kind:'Possession',date:'2026-10-17',
  description:'Fictional possession',authorityReference:'Order',approvalReference:'Supervisor-1'});
assert.equal(possession.california.enforcementAuthorizations[0].status,'Completed');
assert.equal(possession.california.enforcement.at(-1).evidenceDocumentId,evidenceDocumentId);
fails(possession,'enforcement_event',{authorizationId,kind:'Possession',date:'2026-10-17',
  description:'Duplicate event',authorityReference:'Order',approvalReference:'Supervisor-1'},ctx,/unconsumed enforcement authorization/);
let expired=ready('possession');expired.california.intakeDetails.writExpirationDate='2026-10-16';expired=step(expired,'assign',{personId:ctx.personId});fails(expired,'serve',{date:'2026-10-17',time:'11:00',recipient:'Demo',address:'Fictional',method:'Personal service'},ctx,/expired/);
let unserved=step(ready('summons'),'assign',{personId:ctx.personId});fails(unserved,'unserved');unserved=step(unserved,'attempt',{date:'2026-10-17',time:'09:30',result:'Moved'});fails(unserved,'unserved',{},ctx,/reason/);unserved=step(unserved,'unserved',{reasonCode:'Unable to locate',attemptsSummary:'One attempted visit, subject had moved'});assert.equal(unserved.stage,'Unable to Serve');assert.equal(unserved.california.nonService.reasonCode,'Unable to locate');
// An unsigned generated working copy must never count as a signed proof of service.
let unsignedOnly=step(ready("summons"),"assign",{personId:ctx.personId});
unsignedOnly=step(unsignedOnly,"serve",{date:"2026-10-17",time:"10:00",recipient:"Demo Defendant",address:"123 Fictional Lane",method:"Personal service"});
unsignedOnly=step(unsignedOnly,"attach_document",{name:"POS-010-unsigned.pdf",key:"test/unsigned-draft",kind:"Unsigned return draft"});
assert.equal(unsignedOnly.california.documents[unsignedOnly.california.documents.length-1].kind,"Unsigned return draft");
fails(unsignedOnly,"prepare_return",{formName:"POS-010",reference:"Unsigned draft"},ctx,/completed proof\/return/);
unsignedOnly=step(unsignedOnly,"attach_document",{name:"Signed-POS-010.pdf",key:"test/signed-proof",kind:"Proof of service"});
unsignedOnly=step(unsignedOnly,"prepare_return",{formName:"POS-010",reference:"Reviewed signed proof"});
assert.equal(unsignedOnly.stage,"Return Prepared");
let removeCase=ready('summons');
const oldFile=removeCase.california.documents.find(d=>d.kind==='Court packet');
fails(removeCase,'remove_document',{documentId:oldFile.id,note:''},ctx,/action note/);
removeCase=step(removeCase,'remove_document',{documentId:oldFile.id,note:'Superseded by corrected packet'});
assert.equal(removeCase.stage,'Intake','Removing required document must revoke approval');
assert.equal(removeCase.california.documents.some(d=>d.id===oldFile.id),false);
assert.ok(removeCase.california.removedDocuments.some(d=>d.id===oldFile.id&&d.reason==='Superseded by corrected packet'));
assert.equal(removeCase.attachedDocuments.some(d=>d.id===oldFile.id),false);
fails(removeCase,'approve_intake',{},ctx,/court packet/);
removeCase=step(removeCase,'attach_document',{name:'replacement.pdf',key:'uploaded/replacement',kind:'Court packet'});
removeCase=step(removeCase,'approve_intake');
assert.equal(removeCase.stage,'Ready');
let replaceCase=ready('summons');
const prior=replaceCase.california.documents.find(d=>d.kind==='Court packet');
replaceCase=step(replaceCase,'replace_document',{documentId:prior.id,name:'corrected.pdf',key:'uploaded/corrected',note:'Corrected cover page'});
assert.equal(replaceCase.stage,'Intake');
assert.equal(replaceCase.california.documents.some(d=>d.id===prior.id),false);
assert.equal(replaceCase.california.documents.find(d=>d.kind==='Court packet').name,'corrected.pdf');
assert.equal(replaceCase.california.removedDocuments.find(d=>d.id===prior.id).reason,'Corrected cover page');
replaceCase=step(replaceCase,'approve_intake');
assert.equal(replaceCase.stage,'Ready');
console.log('California domain: 11 workflows, permissions, immutable rejections, dates, returns, holds and accounting passed.');
