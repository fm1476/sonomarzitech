// California case-management workflow. Legal dates and fee authority are entered
// from reviewed court packets; this engine never invents statutory deadlines.
export const CA_RULE_VERSION='2026.01.0';
export const CA_WORKFLOWS=Object.freeze({
  summons:{label:'Summons and Complaint',forms:['SER-001'],returns:['POS-010']},
  'small-claims':{label:'Small Claims',forms:['SER-001'],returns:['SC-104']},
  subpoena:{label:'Civil Subpoena',forms:['SER-001'],returns:['Issued subpoena proof of service']},
  'restraining-order':{label:'Restraining Order',forms:['SER-001'],returns:['Order-specific proof of personal service']},
  'earnings-withholding':{label:'Earnings Withholding',forms:['WG-001','WG-015/EJ-135'],writ:true,returns:['WG-002 packet / service return']},
  'writ-execution':{label:'Writ of Execution',forms:['SER-001','SER-001A','WG-015/EJ-135'],writ:true,returns:['Levy-specific return']},
  'bank-levy':{label:'Bank Levy',forms:['SER-001','SER-001A','WG-015/EJ-135'],writ:true,returns:['Levy-specific return']},
  possession:{label:'Writ of Possession',forms:['SER-001','SER-001A'],writ:true,returns:['Possession return']},
  'personal-property-levy':{label:'Personal Property Levy',forms:['SER-001','SER-001A','WG-015/EJ-135'],writ:true,returns:['Levy / sale return']},
  'real-property-levy':{label:'Real Property Levy',forms:['SER-001','SER-001A','WG-015/EJ-135'],writ:true,returns:['Real property levy / sale return']},
  'sheriff-sale':{label:'Sheriff Sale',forms:['SER-001','SER-001A','WG-015/EJ-135'],writ:true,returns:['Sale-specific return']}
});
export class CivilError extends Error{constructor(message,status=400){super(message);this.statusCode=status;}}
const requireValue=(condition,message,status=400)=>{if(!condition)throw new CivilError(message,status);};
const text=(value,max=2000)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
export function civilDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
const cents=value=>{requireValue(Number.isSafeInteger(value)&&value>0,'Amount must be a positive number of cents.');return value;};
export function ledgerBalance(record){return (record.california.ledger||[]).reduce((sum,e)=>sum+(e.direction==='in'?e.amountCents:-e.amountCents),0);}
const unclosedHold=r=>r.california.holds.some(h=>!h.resolvedAt);
const can=(ctx,ability)=>ctx.admin||ctx.abilities?.includes(ability);
function permission(ctx,ability){requireValue(can(ctx,ability),'This Civil action is not permitted for your role.',403);}
export function createCaliforniaCase(input,ctx){
  permission(ctx,'civil_paper_intake');requireValue(CA_WORKFLOWS[input.workflowId],'Choose a supported California workflow.');
  for(const key of ['caseNumber','courtOfOrigin','plaintiff','defendant'])requireValue(text(input[key],250),'Required intake field: '+key);
  requireValue(civilDate(input.receivedDate)&&input.receivedDate<=ctx.today,'A valid received date on or before today is required.');
  requireValue(Array.isArray(input.serviceAddresses)&&input.serviceAddresses.length&&input.serviceAddresses.every(a=>text(a.address,1000)),'At least one complete service address is required.');
  return {id:ctx.id,caseNumber:input.caseNumber.trim(),paperType:CA_WORKFLOWS[input.workflowId].label,courtOfOrigin:input.courtOfOrigin.trim(),plaintiff:input.plaintiff.trim(),defendant:input.defendant.trim(),receivedDate:input.receivedDate,returnByDate:input.returnByDate||'',serviceAddresses:structuredClone(input.serviceAddresses),assignedServerId:null,stage:'Intake',attempts:[],attachedDocuments:[],generatedDocuments:[],feePayments:[],feeLineItems:[],fieldHistory:[],testOnly:ctx.testOnly,california:{workflowId:input.workflowId,ruleVersion:CA_RULE_VERSION,county:ctx.county,history:[],documents:[],holds:[],ledger:[],disbursements:[],enforcement:[],intakeDetails:{},returnPacket:null}};
}
function intakeReady(record){
  const c=record.california,workflow=CA_WORKFLOWS[c.workflowId],details=c.intakeDetails;
  requireValue(civilDate(record.returnByDate),'Enter the reviewed court return deadline.');
  requireValue(text(details.instructionsReference),'Signed instructions reference is required.');
  requireValue(text(details.deadlineAuthority),'Record the court/rule authority used for the deadline.');
  requireValue(c.documents.some(d=>d.kind==='Court packet'),'Upload the court packet before approving intake.');
  requireValue(c.documents.some(d=>d.kind==='Signed instructions'),'Upload signed instructions before approving intake.');
  requireValue(Array.isArray(details.reviewedForms)&&workflow.forms.every(f=>details.reviewedForms.includes(f)),'Review all applicable instruction/declaration forms: '+workflow.forms.join(', '));
  requireValue(text(details.formReviewReference),'Record the packet/form review reference.');
  if(workflow.writ){requireValue(civilDate(details.issuedDate)&&civilDate(details.writExpirationDate),'Reviewed writ issuance and expiration dates are required.');requireValue(details.writExpirationDate>=details.issuedDate,'Writ expiration cannot precede issuance.');requireValue(c.documents.some(d=>d.kind==='Writ'),'Upload the writ.');}
  if(c.workflowId==='earnings-withholding')requireValue(text(details.employerName),'Employer name is required.');
  if(['possession','real-property-levy','sheriff-sale'].includes(c.workflowId))requireValue(text(details.propertyDescription),'Property address and legal description are required.');
  if(c.workflowId==='personal-property-levy')requireValue(text(details.propertyDescription),'Identify the personal property to levy.');
  if(c.workflowId==='bank-levy')requireValue(text(details.financialInstitution),'Financial institution and levy location are required.');
}
export function applyCaliforniaCommand(before,command,payload,ctx){
  requireValue(before?.california,'California case not found.',404);
  requireValue(payload&&typeof payload==='object'&&!Array.isArray(payload),'Command details are required.');
  requireValue(JSON.stringify(payload).length<=60000,'Command is too large.',413);
  const r=structuredClone(before),c=r.california;
  requireValue(!['Closed','Cancelled'].includes(r.stage),'This case is closed. No further changes are permitted.',409);
  const own=r.assignedServerId===ctx.personId;
  const mayWork=ctx.admin||can(ctx,'civil_paper_view_all')||own;
  requireValue(mayWork,'This case is not assigned to you.',403);
  const note=()=>requireValue(text(payload.note),'A documented action note is required.');
  const liveWrit=()=>{requireValue(!unclosedHold(r),'An unresolved claim/stay blocks service and enforcement.',409);if(CA_WORKFLOWS[c.workflowId].writ)requireValue(civilDate(c.intakeDetails.writExpirationDate)&&c.intakeDetails.writExpirationDate>=ctx.today,'Writ is expired or its expiration is missing.',409);};
  if(command==='intake_details'){
    permission(ctx,'civil_paper_intake');requireValue(['Intake','Ready'].includes(r.stage),'Intake is locked after assignment.',409);note();
    for(const key of ['instructionsReference','deadlineAuthority','formReviewReference','issuedDate','writExpirationDate','employerName','propertyDescription','financialInstitution'])if(payload[key]!==undefined){requireValue(typeof payload[key]==='string'&&payload[key].length<=3000,'Invalid '+key);c.intakeDetails[key]=payload[key].trim();}
    if(payload.reviewedForms!==undefined){requireValue(Array.isArray(payload.reviewedForms)&&payload.reviewedForms.every(f=>typeof f==='string'&&f.length<150),'Invalid reviewed forms.');c.intakeDetails.reviewedForms=[...new Set(payload.reviewedForms)];}
    requireValue(civilDate(payload.returnByDate),'Valid court return deadline required.');r.returnByDate=payload.returnByDate;r.stage='Intake';delete c.intakeApproval;
  }else if(command==='attach_document'){
    permission(ctx,'civil_document_generate');note();requireValue(!['Return Prepared','Reviewed','Returned to Court'].includes(r.stage),'Document changes require return review to be reopened.',409);requireValue(text(payload.name,255)&&text(payload.key,1500),'Document name and uploaded object key required.');
    requireValue(['Court packet','Signed instructions','Writ','Court order','Proof of service','Court return','Fee authority','Other'].includes(payload.kind),'Choose a recognized document kind.');
    requireValue(!c.documents.some(d=>d.key===payload.key),'Document is already attached.',409);
    const d={id:ctx.eventId,name:payload.name,key:payload.key,kind:payload.kind,uploadedBy:ctx.userId,at:ctx.at};c.documents.push(d);r.attachedDocuments.push(d);
  }else if(command==='approve_intake'){
    permission(ctx,'civil_paper_intake');requireValue(r.stage==='Intake','Only intake cases can be approved.',409);note();intakeReady(r);liveWrit();r.stage='Ready';c.intakeApproval={by:ctx.userId,at:ctx.at,reference:payload.note};
  }else if(command==='assign'){
    permission(ctx,'civil_paper_intake');requireValue(['Ready','Assigned','Attempting'].includes(r.stage),'Approve intake before assigning a server.',409);note();requireValue(text(payload.personId,150),'Choose an active server.');r.assignedServerId=payload.personId;r.stage='Assigned';
  }else if(command==='attempt'){
    permission(ctx,'civil_paper_log_attempt');requireValue(own||ctx.admin||can(ctx,'civil_paper_intake'),'Only the assigned server or supervisor may log an attempt.',403);requireValue(['Assigned','Attempting'].includes(r.stage),'Assign the case before logging attempts.',409);note();liveWrit();requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time||''),'Valid attempt date/time required.');requireValue(['Not home','No contact','Refused','Moved','Bad address','Business closed','Evading','Other'].includes(payload.result),'Select an attempt result.');r.attempts.push({id:ctx.eventId,date:payload.date,time:payload.time,result:payload.result,notes:payload.note,deputyId:ctx.personId});r.stage='Attempting';
  }else if(command==='serve'){
    permission(ctx,'civil_paper_log_attempt');requireValue(own||ctx.admin||can(ctx,'civil_paper_intake'),'Only the assigned server or supervisor may record service.',403);requireValue(['Assigned','Attempting'].includes(r.stage),'Case must be assigned before service.',409);note();liveWrit();
    requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time||''),'Valid service date/time required.');requireValue(text(payload.recipient)&&text(payload.address),'Recipient and service location are required.');
    requireValue(['Personal service','Substituted service','Court-authorized alternative'].includes(payload.method),'Choose a service method.');
    const required=payload.method==='Substituted service'?['recipientRelationship','diligenceReference','mailingDate','mailingAddress']:payload.method==='Court-authorized alternative'?['courtOrderReference','methodDescription']:[];
    for(const field of required)requireValue(text(payload[field]),'Missing service evidence: '+field);
    if(payload.mailingDate)requireValue(civilDate(payload.mailingDate)&&payload.mailingDate>=payload.date,'Mailing date must be valid and cannot precede service.');
    c.service={...payload,by:ctx.userId,personId:ctx.personId,at:ctx.at};r.servedDate=payload.date;r.servedTime=payload.time;r.servedOnName=payload.recipient;r.serviceMethod=payload.method;r.stage='Served';
  }else if(command==='unserved'){
    permission(ctx,'civil_paper_log_attempt');requireValue(own||ctx.admin||can(ctx,'civil_paper_intake'),'Only the assigned server or supervisor may return unserved.',403);requireValue(['Assigned','Attempting'].includes(r.stage),'Case must be assigned.',409);note();requireValue(r.attempts.length>0,'Log at least one attempt before returning unserved.');r.stage='Unable to Serve';c.nonService={by:ctx.userId,reason:payload.note};
  }else if(command==='prepare_return'){
    permission(ctx,'civil_document_generate');requireValue(['Served','Unable to Serve'].includes(r.stage),'Record service or non-service before preparing a return.',409);note();requireValue(text(payload.formName)&&text(payload.reference),'Court return form and reference are required.');requireValue(c.documents.some(d=>d.kind==='Proof of service'||d.kind==='Court return'),'Upload the completed proof/return document.');c.returnPacket={formName:payload.formName,reference:payload.reference,preparedBy:ctx.userId,at:ctx.at,serviceOutcome:r.stage};r.stage='Return Prepared';
  }else if(command==='review_return'){
    permission(ctx,'civil_paper_intake');requireValue(r.stage==='Return Prepared','Prepare the return before review.',409);note();requireValue(c.returnPacket.preparedBy!==ctx.userId&&c.service?.by!==ctx.userId&&c.nonService?.by!==ctx.userId,'A different supervisor must review the service and return.',409);c.returnPacket.reviewedBy=ctx.userId;c.returnPacket.reviewedAt=ctx.at;c.returnPacket.reviewReference=payload.note;r.stage='Reviewed';
  }else if(command==='record_return'){
    permission(ctx,'civil_document_generate');requireValue(r.stage==='Reviewed','Supervisor review is required before recording court return.',409);note();requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&(!c.service||payload.date>=c.service.date)&&text(payload.reference),'Return date and court transmission/receipt reference are required.');c.returnPacket.returnedAt=payload.date;c.returnPacket.receiptReference=payload.reference;r.returnFiledDate=payload.date;r.stage='Returned to Court';
  }else if(command==='hold'){
    permission(ctx,'civil_paper_intake');note();requireValue(['Exemption claim','Third-party claim','Bankruptcy','Court stay','Other'].includes(payload.kind)&&text(payload.reference),'Hold type and legal/reference number required.');c.holds.push({id:ctx.eventId,kind:payload.kind,reference:payload.reference,note:payload.note,by:ctx.userId,at:ctx.at});
  }else if(command==='resolve_hold'){
    permission(ctx,'civil_paper_intake');note();const hold=c.holds.find(h=>h.id===payload.holdId&&!h.resolvedAt);requireValue(hold,'Open hold not found.',404);requireValue(text(payload.orderReference),'Court order/resolution reference required.');Object.assign(hold,{resolvedAt:ctx.at,resolvedBy:ctx.userId,orderReference:payload.orderReference,resolution:payload.note});
  }else if(command==='enforcement_event'){
    permission(ctx,'civil_paper_intake');note();liveWrit();requireValue(CA_WORKFLOWS[c.workflowId].writ,'This case is not an enforcement workflow.');requireValue(!unclosedHold(r),'An unresolved claim/stay blocks enforcement.',409);requireValue(['Levy','Notice','Inventory','Custody','Release','Sale','Possession','Employer response','Remittance'].includes(payload.kind),'Choose an enforcement action.');requireValue(text(payload.authorityReference)&&civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&text(payload.description),'Action date, property/action details and authority reference required.');
    if(['Sale','Possession','Release'].includes(payload.kind))requireValue(text(payload.approvalReference),'Supervisory/court authorization reference required.');
    c.enforcement.push({kind:payload.kind,date:payload.date,description:payload.description,authorityReference:payload.authorityReference,approvalReference:payload.approvalReference||'',note:payload.note,id:ctx.eventId,by:ctx.userId,at:ctx.at});
  }else if(command==='receipt'){
    permission(ctx,'civil_fee_manage');note();requireValue(['Service fee','Creditor deposit','Levy collection'].includes(payload.kind)&&text(payload.reference)&&text(payload.payer),'Receipt category, payer and reference required.');const amount=cents(payload.amountCents);requireValue(Number.isSafeInteger(ledgerBalance(r)+amount),'Case balance exceeds the supported accounting range.');requireValue(!c.ledger.some(e=>e.direction==='in'&&e.reference===payload.reference),'Receipt reference already recorded.',409);c.ledger.push({id:ctx.eventId,direction:'in',amountCents:amount,kind:payload.kind,reference:payload.reference,party:payload.payer,by:ctx.userId,at:ctx.at});
  }else if(command==='expense'){
    permission(ctx,'civil_fee_manage');note();requireValue(text(payload.authority)&&text(payload.reference),'Reviewed fee/expense authority and accounting reference required.');const amount=cents(payload.amountCents);requireValue(amount<=ledgerBalance(r),'Expense exceeds available case funds.',409);c.ledger.push({id:ctx.eventId,direction:'out',amountCents:amount,kind:'Authorized expense',authority:payload.authority,reference:payload.reference,by:ctx.userId,at:ctx.at});
  }else if(command==='request_disbursement'){
    permission(ctx,'civil_fee_manage');note();requireValue(!unclosedHold(r),'Resolve all claims/stays before disbursement.',409);const amount=cents(payload.amountCents);requireValue(amount<=ledgerBalance(r),'Disbursement exceeds available case funds.',409);requireValue(text(payload.payee)&&text(payload.authority)&&text(payload.reference),'Payee, authority and accounting reference required.');c.disbursements.push({id:ctx.eventId,amountCents:amount,payee:payload.payee,authority:payload.authority,reference:payload.reference,requestedBy:ctx.userId,status:'pending',at:ctx.at});
  }else if(command==='approve_disbursement'){
    permission(ctx,'civil_fee_manage');note();const d=c.disbursements.find(d=>d.id===payload.disbursementId&&d.status==='pending');requireValue(d,'Pending disbursement not found.',404);requireValue(d.requestedBy!==ctx.userId,'A different finance reviewer must approve disbursement.',409);requireValue(!unclosedHold(r)&&d.amountCents<=ledgerBalance(r),'Hold or insufficient case balance blocks disbursement.',409);d.status='approved';d.approvedBy=ctx.userId;d.approvalReference=payload.note;
  }else if(command==='record_disbursement'){
    permission(ctx,'civil_fee_manage');note();const d=c.disbursements.find(d=>d.id===payload.disbursementId&&d.status==='approved');requireValue(d,'Approved disbursement not found.',404);requireValue(!unclosedHold(r)&&d.amountCents<=ledgerBalance(r),'Hold or insufficient case balance blocks disbursement.',409);requireValue(text(payload.paymentReference),'External payment/check reference is required.');d.status='recorded';d.paymentReference=payload.paymentReference;d.recordedBy=ctx.userId;c.ledger.push({id:ctx.eventId,direction:'out',kind:'Disbursement',amountCents:d.amountCents,party:d.payee,reference:payload.paymentReference,by:ctx.userId,at:ctx.at});
  }else if(command==='reconcile'){
    permission(ctx,'civil_fee_manage');note();requireValue(text(payload.reference),'Reconciliation reference required.');requireValue(Number.isSafeInteger(payload.verifiedBalanceCents)&&payload.verifiedBalanceCents===ledgerBalance(r),'Verified balance does not match the ledger.');c.reconciliation={reference:payload.reference,balanceCents:payload.verifiedBalanceCents,by:ctx.userId,at:ctx.at,ledgerCount:c.ledger.length};
  }else if(command==='close'){
    permission(ctx,'civil_paper_intake');note();requireValue(r.stage==='Returned to Court','Record the reviewed court return before closure.',409);requireValue(!unclosedHold(r),'Resolve all claims/stays before closure.',409);requireValue(!c.disbursements.some(d=>d.status!=='recorded'),'Complete pending disbursements before closure.',409);requireValue(ledgerBalance(r)===0,'Refund/disburse remaining case funds before closure.',409);if(c.ledger.length)requireValue(c.reconciliation?.ledgerCount===c.ledger.length&&c.reconciliation.balanceCents===0,'Reconcile the final ledger before closure.',409);r.stage='Closed';c.closedBy=ctx.userId;c.closedAt=ctx.at;
  }else if(command==='cancel'){
    permission(ctx,'civil_paper_intake');note();requireValue(ledgerBalance(r)===0&&!unclosedHold(r)&&!c.disbursements.some(d=>d.status!=='recorded'),'Resolve claims and case funds before cancelling.',409);if(c.ledger.length)requireValue(c.reconciliation?.ledgerCount===c.ledger.length&&c.reconciliation.balanceCents===0,'Reconcile the final ledger before cancelling.',409);r.stage='Cancelled';
  }else throw new CivilError('Unknown Civil command.');
  c.history.push({id:ctx.eventId,command,note:payload.note||'',actor:ctx.userId,personId:ctx.personId,at:ctx.at,fromStage:before.stage,toStage:r.stage});
  return r;
}
