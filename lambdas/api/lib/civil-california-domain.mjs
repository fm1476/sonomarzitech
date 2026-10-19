import {validateSerIntake,normalizeSerIntake,serReviewRequiredForms,CA_SER_INTAKE_VERSION} from './civil-california-ser-review.mjs';
// California case-management workflow. Legal dates and fee authority are entered
// from reviewed court packets; this engine never invents statutory deadlines.
export const CA_RULE_VERSION = "2026.01.0";
export const CA_WORKFLOWS = Object.freeze({
  summons: {
    label: "Summons and Complaint",
    forms: ["SER-001"],
    returns: ["POS-010"],
  },
  "small-claims": {
    label: "Small Claims",
    forms: ["SER-001"],
    returns: ["SC-104"],
  },
  subpoena: {
    label: "Civil Subpoena",
    forms: ["SER-001"],
    returns: ["Issued subpoena proof of service"],
  },
  "restraining-order": {
    label: "Restraining Order",
    forms: ["SER-001"],
    returns: ["Order-specific proof of personal service"],
  },
  "earnings-withholding": {
    label: "Earnings Withholding",
    forms: ["WG-001", "WG-002", "WG-005", "WG-015/EJ-135"],
    writ: true,
    returns: ["WG-002 packet / service return"],
  },
  "writ-execution": {
    label: "Writ of Execution",
    forms: ["SER-001", "SER-001A", "WG-015/EJ-135"],
    writ: true,
    returns: ["Levy-specific return"],
  },
  "bank-levy": {
    label: "Bank Levy",
    forms: ["SER-001", "SER-001A", "WG-015/EJ-135"],
    writ: true,
    returns: ["Levy-specific return"],
  },
  possession: {
    label: "Writ of Possession",
    forms: ["SER-001", "SER-001A"],
    writ: true,
    returns: ["Possession return"],
  },
  "personal-property-levy": {
    label: "Personal Property Levy",
    forms: ["SER-001", "SER-001A", "WG-015/EJ-135"],
    writ: true,
    returns: ["Levy / sale return"],
  },
  "real-property-levy": {
    label: "Real Property Levy",
    forms: ["SER-001", "SER-001A", "WG-015/EJ-135"],
    writ: true,
    returns: ["Real property levy / sale return"],
  },
  "sheriff-sale": {
    label: "Sheriff Sale",
    forms: ["SER-001", "SER-001A", "WG-015/EJ-135"],
    writ: true,
    returns: ["Sale-specific return"],
  },
});
export class CivilError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.statusCode = status;
  }
}
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new CivilError(message, status);
};
const text = (value, max = 2000) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
export function civilDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
const cents = (value) => {
  requireValue(
    Number.isSafeInteger(value) && value > 0,
    "Amount must be a positive number of cents.",
  );
  return value;
};
export function ledgerBalance(record) {
  return (record.california.ledger || []).reduce(
    (sum, e) => sum + (e.direction === "in" ? e.amountCents : -e.amountCents),
    0,
  );
}
export function addCivilDays(date, days) {
  requireValue(
    civilDate(date) && Number.isSafeInteger(days) && Math.abs(days) < 36600,
    "Valid date and day interval required.",
  );
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function availableCaseFunds(record, today) {
  requireValue(civilDate(today), "Valid accounting date required.");
  const held = (record.california.ledger || [])
    .filter(
      (e) => e.direction === "in" && (
        (e.requiresReleaseReview && !e.releaseReviewedAt) ||
        (e.availableOn && e.availableOn > today)
      ),
    )
    .reduce((n, e) => n + e.amountCents, 0);
  return Math.max(0, ledgerBalance(record) - held);
}
const unclosedHold = (r) => r.california.holds.some((h) => !h.resolvedAt);
const can = (ctx, ability) => ctx.admin || ctx.abilities?.includes(ability);
function permission(ctx, ability) {
  requireValue(
    can(ctx, ability),
    "This Civil action is not permitted for your role.",
    403,
  );
}
export function createCaliforniaCase(input, ctx) {
  permission(ctx, "civil_paper_intake");
  requireValue(
    Object.hasOwn(CA_WORKFLOWS, input.workflowId),
    "Choose a supported California workflow.",
  );
  for (const key of ["caseNumber", "courtOfOrigin", "plaintiff", "defendant"])
    requireValue(text(input[key], 250), "Required intake field: " + key);
  requireValue(
    civilDate(input.receivedDate) && input.receivedDate <= ctx.today,
    "A valid received date on or before today is required.",
  );
  requireValue(
    Array.isArray(input.serviceAddresses) &&
      input.serviceAddresses.length &&
      input.serviceAddresses.every((a) => text(a.address, 1000)),
    "At least one complete service address is required.",
  );
  return {
    id: ctx.id,
    caseNumber: input.caseNumber.trim(),
    paperType: CA_WORKFLOWS[input.workflowId].label,
    courtOfOrigin: input.courtOfOrigin.trim(),
    plaintiff: input.plaintiff.trim(),
    defendant: input.defendant.trim(),
    receivedDate: input.receivedDate,
    returnByDate: input.returnByDate || "",
    serviceAddresses: structuredClone(input.serviceAddresses),
    assignedServerId: null,
    stage: "Intake",
    attempts: [],
    safetyFlags: [],
    attachedDocuments: [],
    generatedDocuments: [],
    feePayments: [],
    feeLineItems: [],
    fieldHistory: [],
    testOnly: ctx.testOnly,
    california: {
      workflowId: input.workflowId,
      ruleVersion: CA_RULE_VERSION,
      county: ctx.county,
      history: [],
      documents: [],
      holds: [],
      ledger: [],
      disbursements: [],
      enforcement: [],
      intakeDetails: {},
      returnPacket: null,
      serviceTargets: [],
      deadlines: [],
      notices: [],
    },
  };
}
function intakeReady(record) {
  const c = record.california,
    workflow = CA_WORKFLOWS[c.workflowId],
    details = c.intakeDetails;
  requireValue(
    civilDate(record.returnByDate),
    "Enter the reviewed court return deadline.",
  );
  requireValue(
    text(details.instructionsReference),
    "Signed instructions reference is required.",
  );
  requireValue(
    text(details.deadlineAuthority),
    "Record the court/rule authority used for the deadline.",
  );
  requireValue(
    c.documents.some((d) => d.kind === "Court packet"),
    "Upload the court packet before approving intake.",
  );
  requireValue(
    c.documents.some((d) => d.kind === "Signed instructions"),
    "Upload signed instructions before approving intake.",
  );
  requireValue(
    Array.isArray(details.reviewedForms) &&
      workflow.forms.filter(f=>f!=='WG-015/EJ-135'||(c.workflowId==='earnings-withholding'?details.personalDebtStatus==='Yes':details.ser001a?.personalDebtStatus==='Yes')).every(f=>details.reviewedForms.includes(f)),
    "Review all required instruction/declaration forms for this case, including personal-debt address verification if applicable: " +
      workflow.forms.filter(f=>f!=='WG-015/EJ-135'||(c.workflowId==='earnings-withholding'?details.personalDebtStatus==='Yes':details.ser001a?.personalDebtStatus==='Yes')).join(", "),
  );
  requireValue(
    text(details.formReviewReference),
    "Record the packet/form review reference.",
  );
  // Required source data is retained and validated, not just a "forms reviewed" checkbox.
  // Existing approved cases remain unchanged; new approvals require completed evidence.
  const missingSer=validateSerIntake(details,workflow.forms,c.documents);
  requireValue(missingSer.length===0,missingSer[0]||"Structured sheriff intake review is incomplete.");
  if (workflow.writ) {
    requireValue(
      civilDate(details.issuedDate) && civilDate(details.writExpirationDate),
      "Reviewed writ issuance and expiration dates are required.",
    );
    requireValue(
      details.writExpirationDate >= details.issuedDate,
      "Writ expiration cannot precede issuance.",
    );
    requireValue(
      c.documents.some((d) => d.kind === "Writ"),
      "Upload the writ.",
    );
  }
  if (c.workflowId === "earnings-withholding") {
    requireValue(text(details.employerName), "Employer name is required.");
    requireValue(["Yes","No"].includes(details.personalDebtStatus),
      "Determine whether the earnings withholding judgment is for personal debt.");
    if(details.personalDebtStatus==="Yes"){
      requireValue(text(details.addressVerificationReference),
        "Personal-debt garnishment requires an address-verification declaration reference.");
      requireValue(c.documents.some(d=>d.kind==="Other" && /(?:WG-015|EJ-135)/i.test(d.name)),
        "Attach the WG-015 or EJ-135 address-verification declaration.");
    }
  }
  if (
    ["possession", "real-property-levy", "sheriff-sale"].includes(c.workflowId)
  )
    requireValue(
      text(details.propertyDescription),
      "Property address and legal description are required.",
    );
  if (c.workflowId === "personal-property-levy")
    requireValue(
      text(details.propertyDescription),
      "Identify the personal property to levy.",
    );
  if (c.workflowId === "bank-levy")
    requireValue(
      text(details.financialInstitution),
      "Financial institution and levy location are required.",
    );
}
export function applyCaliforniaCommand(before, command, payload, ctx) {
  requireValue(before?.california, "California case not found.", 404);
  requireValue(
    payload && typeof payload === "object" && !Array.isArray(payload),
    "Command details are required.",
  );
  requireValue(
    JSON.stringify(payload).length <= 60000,
    "Command is too large.",
    413,
  );
  payload = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
  const r = structuredClone(before),
    c = r.california;
  requireValue(
    !["Closed", "Cancelled"].includes(r.stage),
    "This case is closed. No further changes are permitted.",
    409,
  );
  const own = r.assignedServerId === ctx.personId;
  const mayWork = ctx.admin || can(ctx, "civil_paper_view_all") || own;
  requireValue(mayWork, "This case is not assigned to you.", 403);
  // Structured actions already have actor, timestamp, before/after stage and entered facts
  // in the audit log. Require narrative only for sensitive discretionary decisions.
  const noteRequiredFor=new Set([
    'retire_safety_flag','remove_document','replace_document','reopen_return',
    'cancel','hold','resolve_hold','approve_disbursement','record_disbursement',
    'reconcile','enforcement_event','expense'
  ]);
  const note=()=>{
    if(payload.note!==undefined)
      requireValue(typeof payload.note==='string'&&payload.note.length<=2000,
        'Action note must be no longer than 2,000 characters.');
    if(noteRequiredFor.has(command))
      requireValue(text(payload.note), 'A documented action note is required for this decision or exception.');
  };
  c.deadlines ??= [];
  c.notices ??= [];
  const disbursementReady = () =>
    requireValue(
      !unclosedHold(r) &&
        !c.deadlines.some(
          (d) => d.kind === "Exemption/claim" && !d.completedAt,
        ),
      "Resolve claims, stays and tracked exemption deadlines before disbursement.",
      409,
    );
  const liveWrit = () => {
    requireValue(
      !unclosedHold(r),
      "An unresolved claim/stay blocks service and enforcement.",
      409,
    );
    if (CA_WORKFLOWS[c.workflowId].writ)
      requireValue(
        civilDate(c.intakeDetails.writExpirationDate) &&
          c.intakeDetails.writExpirationDate >= ctx.today,
        "Writ is expired or its expiration is missing.",
        409,
      );
  };
  const targets=c.serviceTargets||[];
  const targetFor=id=>{
    const target=targets.find(t=>t.id===id);
    requireValue(target,"Service recipient not found on this case.",404);
    return target;
  };
  if(command==="add_service_target"){
    permission(ctx,"civil_paper_intake");
    requireValue(r.stage==="Intake","Add individual service recipients before approving intake.",409);
    requireValue(targets.length<50,"A case supports at most 50 separately tracked recipients.",409);
    requireValue(text(payload.name,250)&&text(payload.address,1000)&&text(payload.documentsDescription,2000),
      "Recipient name, service address and documents to be served are required.");
    requireValue(!targets.some(t=>t.name.toLowerCase()===payload.name.toLowerCase()&&t.address.toLowerCase()===payload.address.toLowerCase()),
      "That recipient and service address are already listed.",409);
    targets.push({id:ctx.eventId,name:payload.name,address:payload.address,
      documentsDescription:payload.documentsDescription,status:"Pending",attempts:[],
      outcome:null,returnPacket:null,createdBy:ctx.userId,createdAt:ctx.at});
    c.serviceTargets=targets;
  }else if(command==="remove_service_target"){
    permission(ctx,"civil_paper_intake");
    requireValue(r.stage==="Intake","Service recipients are locked after intake approval.",409);
    const target=targetFor(payload.targetId);
    requireValue(target.status==="Pending"&&target.attempts.length===0,"Cannot remove a recipient with recorded service activity.",409);
    c.serviceTargets=targets.filter(t=>t.id!==target.id);
  }else if(command==="target_attempt"){
    permission(ctx,"civil_paper_log_attempt");
    requireValue(own||ctx.admin||can(ctx,"civil_paper_intake"),"Only assigned staff or a supervisor may record an attempt.",403);
    requireValue(["Assigned","Attempting"].includes(r.stage),"Assign the case before recording service.",409);
    liveWrit();
    const target=targetFor(payload.targetId);
    requireValue(["Pending","Attempting"].includes(target.status),"This recipient already has a recorded outcome.",409);
    requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(payload.time||""),
      "Valid attempt date and time are required.");
    requireValue(["Not home","No contact","Refused","Moved","Bad address","Business closed","Evading","Other"].includes(payload.result),
      "Select a recognized attempt result.");
    target.attempts.push({id:ctx.eventId,date:payload.date,time:payload.time,result:payload.result,
      note:payload.note||"",by:ctx.userId,personId:ctx.personId});
    target.status="Attempting";
    r.stage="Attempting";
  }else if(command==="target_serve"||command==="target_unserved"){
    permission(ctx,"civil_paper_log_attempt");
    requireValue(own||ctx.admin||can(ctx,"civil_paper_intake"),"Only assigned staff or a supervisor may record an outcome.",403);
    requireValue(["Assigned","Attempting"].includes(r.stage),"Assign the case before recording service.",409);
    liveWrit();
    const target=targetFor(payload.targetId);
    requireValue(["Pending","Attempting"].includes(target.status),"This recipient already has a recorded outcome.",409);
    if(command==="target_serve"){
      requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(payload.time||""),
        "Service date and time are required.");
      requireValue(text(payload.recipient)&&text(payload.address)&&text(payload.method),"Recipient, location and method required.");
      requireValue(["Personal service","Substituted service","Court-authorized alternative","First-class mail"].includes(payload.method),
        "Use an approved service method value.");
      if(payload.method==="Substituted service"){
        requireValue(["summons","small-claims"].includes(c.workflowId),"This workflow does not permit generic substituted service.");
        for(const k of ["recipientRelationship","diligenceReference","mailingDate","mailingAddress"])
          requireValue(text(payload[k]),"Substituted service requires "+k+".");
      }
      if(payload.method==="Court-authorized alternative")
        requireValue(text(payload.courtOrderReference)&&text(payload.methodDescription),
          "Court order and method description required.");
      if(payload.method==="First-class mail")
        requireValue(!["summons","small-claims"].includes(c.workflowId),"Mail alone cannot substitute for the court-approved summons method.");
      target.outcome={status:"Served",date:payload.date,time:payload.time,recipient:payload.recipient,
        address:payload.address,method:payload.method,recipientRelationship:payload.recipientRelationship||"",
        diligenceReference:payload.diligenceReference||"",mailingDate:payload.mailingDate||"",
        mailingAddress:payload.mailingAddress||"",courtOrderReference:payload.courtOrderReference||"",
        methodDescription:payload.methodDescription||"",by:ctx.userId,personId:ctx.personId};
      target.status="Served";
    }else{
      requireValue(target.attempts.length>0,"Record an attempt for this recipient before marking unserved.");
      requireValue(["Unable to locate","No valid service address","Service window expired","Court instructions prevent service","Other"].includes(payload.reasonCode),
        "Choose the recipient's non-service reason.");
      if(payload.reasonCode==="Other")requireValue(text(payload.reasonDetail),"Explain the other non-service reason.");
      requireValue(text(payload.attemptsSummary),"Summarize attempts for this recipient.");
      target.outcome={status:"Unable to Serve",reasonCode:payload.reasonCode,
        reasonDetail:payload.reasonDetail||"",attemptsSummary:payload.attemptsSummary,
        by:ctx.userId,personId:ctx.personId};
      target.status="Unable to Serve";
    }
    r.stage="Attempting";
  }else if(command==="prepare_target_return"){
    permission(ctx,"civil_document_generate");
    const target=targetFor(payload.targetId);
    requireValue(["Served","Unable to Serve"].includes(target.status),"Record a recipient-specific service outcome first.",409);
    requireValue(!target.returnPacket,"This recipient already has a return packet.",409);
    requireValue(text(payload.formName)&&text(payload.reference),"Record the applicable return form and reference.");
    const document=c.documents.find(d=>d.id===payload.documentId&&d.targetId===target.id&&
      ["Proof of service","Court return"].includes(d.kind));
    requireValue(document,"Attach the signed, recipient-linked proof of service or return.",409);
    target.returnPacket={status:"Return Prepared",documentId:document.id,formName:payload.formName,
      reference:payload.reference,preparedBy:ctx.userId,preparedAt:ctx.at};
  }else if(command==="review_target_return"){
    permission(ctx,"civil_paper_intake");
    const target=targetFor(payload.targetId);
    requireValue(target.returnPacket?.status==="Return Prepared","Prepare this recipient's return first.",409);
    requireValue(target.returnPacket.preparedBy!==ctx.userId&&target.outcome?.by!==ctx.userId,
      "An independent reviewer must review this recipient's return.",409);
    requireValue(text(payload.reviewReference,500),"Enter an independent recipient-return review reference.");
    target.returnPacket.status="Reviewed";
    target.returnPacket.reviewedBy=ctx.userId;
    target.returnPacket.reviewedAt=ctx.at;
    target.returnPacket.reviewReference=payload.reviewReference;
  }else if(command==="record_target_return"){
    permission(ctx,"civil_document_generate");
    const target=targetFor(payload.targetId);
    requireValue(target.returnPacket?.status==="Reviewed","Recipient return requires independent review.",409);
    requireValue(civilDate(payload.date)&&payload.date>=r.receivedDate&&payload.date<=ctx.today&&
      (!target.outcome?.date||payload.date>=target.outcome.date)&&text(payload.reference),
      "Court delivery date and independent receipt reference required.");
    target.returnPacket.status="Returned to Court";
    target.returnPacket.returnedAt=payload.date;
    target.returnPacket.receiptReference=payload.reference;
    if(targets.length&&targets.every(t=>t.returnPacket?.status==="Returned to Court")){
      requireValue(!c.deadlines.some(d=>!d.completedAt),
        "Complete or resolve all tracked deadlines before final court return.",409);
      r.stage="Returned to Court";
      r.returnFiledDate=payload.date;
    }
  }else   if (command === "add_safety_flag") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(text(payload.reason, 1000), "Describe the officer-safety concern.");
    requireValue(["Person","Address","Case"].includes(payload.scope), "Select what the safety flag applies to.");
    requireValue(text(payload.verificationReference, 500), "Record the source or verification reference.");
    r.safetyFlags ??= [];
    requireValue(r.safetyFlags.length < 100, "This case has too many safety flag entries.", 409);
    r.safetyFlags.push({
      id: ctx.eventId, scope: payload.scope, reason: payload.reason,
      verificationReference: payload.verificationReference,
      active: true, createdBy: ctx.userId, createdAt: ctx.at,
    });
  } else if (command === "retire_safety_flag") {
    permission(ctx, "civil_paper_intake");
    note();
    const item=(r.safetyFlags||[]).find(flag=>flag.id===payload.flagId);
    requireValue(item && item.active && !item.retiredAt, "Active safety flag not found.", 404);
    item.active=false;
    item.retiredBy=ctx.userId;
    item.retiredAt=ctx.at;
    item.retirementReason=payload.note;
  } else   if (command === "intake_details") {
    permission(ctx, "civil_paper_intake");
    requireValue(
      ["Intake", "Ready"].includes(r.stage),
      "Intake is locked after assignment.",
      409,
    );
    note();
    for (const key of [
      "instructionsReference",
      "deadlineAuthority",
      "formReviewReference",
      "issuedDate",
      "writExpirationDate",
      "employerName",
      "propertyDescription",
      "financialInstitution",
      "hearingDate",
      "hearingTime",
      "department",
      "personalDebtStatus",
      "addressVerificationReference",
    ])
      if (payload[key] !== undefined) {
        requireValue(
          typeof payload[key] === "string" && payload[key].length <= 3000,
          "Invalid " + key,
        );
        c.intakeDetails[key] = payload[key].trim();
      }
    const requiredSer=serReviewRequiredForms(CA_WORKFLOWS[c.workflowId].forms);
    for(const section of ['ser001','ser001a']){
      if(payload[section]===undefined)continue;
      requireValue(section==='ser001'?requiredSer.ser001:requiredSer.ser001a,
        'This sheriff instruction form does not apply to the selected workflow.');
      let sanitized;
      try{sanitized=normalizeSerIntake(payload[section]);}
      catch(e){throw new CivilError(e.message);}
      c.intakeDetails[section]={...(c.intakeDetails[section]||{}),...sanitized};
      c.intakeDetails[section+'ReviewedBy']=ctx.userId;
      c.intakeDetails[section+'ReviewedAt']=ctx.at;
      c.intakeDetails[section+'SourceVersion']=CA_SER_INTAKE_VERSION;
    }
    if (payload.reviewedForms !== undefined) {
      requireValue(
        Array.isArray(payload.reviewedForms) &&
          payload.reviewedForms.every(
            (f) => typeof f === "string" && f.length < 150,
          ),
        "Invalid reviewed forms.",
      );
      c.intakeDetails.reviewedForms = [...new Set(payload.reviewedForms)];
    }
    requireValue(
      civilDate(payload.returnByDate),
      "Valid court return deadline required.",
    );
    r.returnByDate = payload.returnByDate;
    r.stage = "Intake";
    delete c.intakeApproval;
  } else if (command === "attach_document") {
    permission(ctx, "civil_document_generate");
    note();
    requireValue(
      !["Return Prepared", "Reviewed", "Returned to Court"].includes(r.stage),
      "Document changes require return review to be reopened.",
      409,
    );
    requireValue(
      text(payload.name, 255) && text(payload.key, 1500),
      "Document name and uploaded object key required.",
    );
    requireValue(
      [
        "Court packet",
        "Signed instructions",
        "Writ",
        "Court order",
        "Proof of service",
        "Court return",
        "Unsigned return draft",
        "Fee authority",
        "Other",
      ].includes(payload.kind),
      "Choose a recognized document kind.",
    );
    requireValue(
      !c.documents.some((d) => d.key === payload.key),
      "Document is already attached.",
      409,
    );
    if(targets.length&&["Proof of service","Court return"].includes(payload.kind))
      targetFor(payload.targetId);
    const d = {
      id: ctx.eventId,
      name: payload.name,
      key: payload.key,
      kind: payload.kind,
      targetId:targets.length&&["Proof of service","Court return"].includes(payload.kind)?payload.targetId:null,
      uploadedBy: ctx.userId,
      at: ctx.at,
    };
    c.documents.push(d);
    r.attachedDocuments.push(d);
  } else if (command === "replace_document") {
    permission(ctx, "civil_document_generate");
    note();
    requireValue(!["Return Prepared","Reviewed","Returned to Court"].includes(r.stage),
      "Reopen the court return review before replacing supporting documents.",409);
    const index=c.documents.findIndex(d=>d.id===payload.documentId);
    requireValue(index>=0,"Document not found.",404);
    const previous=c.documents[index];
    requireValue(!c.returnPacket?.documentId || c.returnPacket.documentId!==previous.id,
      "This document is linked to the court return and cannot be replaced.",409);
    requireValue(text(payload.name,255)&&text(payload.key,1500),"Replacement filename and uploaded object key are required.");
    requireValue(!c.documents.some(d=>d.key===payload.key),"Document is already attached.",409);
    const next={id:ctx.eventId,name:payload.name,key:payload.key,kind:previous.kind,uploadedBy:ctx.userId,at:ctx.at,replacesDocumentId:previous.id};
    c.documents[index]=next;
    r.attachedDocuments=(r.attachedDocuments||[]).filter(d=>d.id!==previous.id);
    r.attachedDocuments.push(next);
    c.removedDocuments??=[];
    c.removedDocuments.push({...previous,removedAt:ctx.at,removedBy:ctx.userId,reason:payload.note,replacedBy:next.id});
    if(r.stage==="Ready"&&["Court packet","Signed instructions","Writ"].includes(previous.kind)){
      r.stage="Intake";
      delete c.intakeApproval;
    }
  } else if (command === "remove_document") {
    permission(ctx, "civil_document_generate");
    note();
    requireValue(!["Return Prepared","Reviewed","Returned to Court"].includes(r.stage),
      "Reopen the court return review before modifying supporting documents.",409);
    const index=c.documents.findIndex(d=>d.id===payload.documentId);
    requireValue(index>=0,"Document not found.",404);
    const previous=c.documents[index];
    requireValue(!c.returnPacket?.documentId || c.returnPacket.documentId!==previous.id,
      "This document is linked to the court return and cannot be removed.",409);
    c.documents.splice(index,1);
    r.attachedDocuments=(r.attachedDocuments||[]).filter(d=>d.id!==previous.id);
    c.removedDocuments??=[];
    c.removedDocuments.push({...previous,removedAt:ctx.at,removedBy:ctx.userId,reason:payload.note});
    if(r.stage==="Ready" && ["Court packet","Signed instructions","Writ"].includes(previous.kind)){
      r.stage="Intake";
      delete c.intakeApproval;
    }
  } else if (command === "approve_intake") {
    permission(ctx, "civil_paper_intake");
    requireValue(
      r.stage === "Intake",
      "Only intake cases can be approved.",
      409,
    );
    note();
    intakeReady(r);
    liveWrit();
    r.stage = "Ready";
    c.intakeApproval = { by: ctx.userId, at: ctx.at, reference: payload.note };
  } else if (command === "assign") {
    permission(ctx, "civil_paper_intake");
    requireValue(
      ["Ready", "Assigned", "Attempting"].includes(r.stage),
      "Approve intake before assigning a server.",
      409,
    );
    note();
    requireValue(text(payload.personId, 150), "Choose an active server.");
    r.assignedServerId = payload.personId;
    r.stage = "Assigned";
  } else if (command === "attempt") {
    requireValue(!targets.length,"Use recipient-specific attempts for this case.",409);
    permission(ctx, "civil_paper_log_attempt");
    requireValue(
      own || ctx.admin || can(ctx, "civil_paper_intake"),
      "Only the assigned server or supervisor may log an attempt.",
      403,
    );
    requireValue(
      ["Assigned", "Attempting"].includes(r.stage),
      "Assign the case before logging attempts.",
      409,
    );
    note();
    liveWrit();
    requireValue(
      civilDate(payload.date) &&
        payload.date >= r.receivedDate &&
        payload.date <= ctx.today &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time || ""),
      "Valid attempt date/time required.",
    );
    requireValue(
      [
        "Not home",
        "No contact",
        "Refused",
        "Moved",
        "Bad address",
        "Business closed",
        "Evading",
        "Other",
      ].includes(payload.result),
      "Select an attempt result.",
    );
    r.attempts.push({
      id: ctx.eventId,
      date: payload.date,
      time: payload.time,
      result: payload.result,
      notes: payload.note,
      deputyId: ctx.personId,
    });
    r.stage = "Attempting";
  } else if (command === "serve") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_paper_log_attempt");
    requireValue(
      own || ctx.admin || can(ctx, "civil_paper_intake"),
      "Only the assigned server or supervisor may record service.",
      403,
    );
    requireValue(
      ["Assigned", "Attempting"].includes(r.stage),
      "Case must be assigned before service.",
      409,
    );
    note();
    liveWrit();
    requireValue(
      civilDate(payload.date) &&
        payload.date >= r.receivedDate &&
        payload.date <= ctx.today &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time || ""),
      "Valid service date/time required.",
    );
    requireValue(
      text(payload.recipient) && text(payload.address),
      "Recipient and service location are required.",
    );
    requireValue(
      [
        "Personal service",
        "Substituted service",
        "Court-authorized alternative",
        "First-class mail",
      ].includes(payload.method),
      "Choose a service method.",
    );
    const required =
      payload.method === "Substituted service"
        ? [
            "recipientRelationship",
            "diligenceReference",
            "mailingDate",
            "mailingAddress",
          ]
        : payload.method === "Court-authorized alternative"
          ? ["courtOrderReference", "methodDescription"]
          : [];
    for (const field of required)
      requireValue(text(payload[field]), "Missing service evidence: " + field);
    if(payload.method==="First-class mail")
      requireValue(!["summons","small-claims"].includes(c.workflowId),
        "First-class mail cannot substitute for court-approved summons or small-claims personal service.");
    if (payload.method === "Substituted service")
      requireValue(
        ["summons", "small-claims"].includes(c.workflowId),
        "Use the workflow-specific service method approved for this packet.",
      );
    if (payload.mailingDate)
      requireValue(
        civilDate(payload.mailingDate) &&
          payload.mailingDate >= payload.date &&
          payload.mailingDate <= ctx.today,
        "Mailing date must be valid and cannot precede service.",
      );
    c.service = {
      ...payload,
      by: ctx.userId,
      personId: ctx.personId,
      at: ctx.at,
    };
    r.servedDate = payload.date;
    r.servedTime = payload.time;
    r.servedOnName = payload.recipient;
    r.serviceMethod = payload.method;
    r.stage = "Served";
  } else if (command === "unserved") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_paper_log_attempt");
    requireValue(
      own || ctx.admin || can(ctx, "civil_paper_intake"),
      "Only the assigned server or supervisor may return unserved.",
      403,
    );
    requireValue(
      ["Assigned", "Attempting"].includes(r.stage),
      "Case must be assigned.",
      409,
    );
    note();
    requireValue(r.attempts.length > 0,
      "Log at least one attempt before returning unserved.");
    requireValue(["Unable to locate","No valid service address","Service window expired","Court instructions prevent service","Other"].includes(payload.reasonCode),
      "Select a reason why the papers could not be served.");
    if(payload.reasonCode==="Other") requireValue(text(payload.reasonDetail),
      "Explain the other non-service reason.");
    requireValue(text(payload.attemptsSummary),
      "Summarize the documented attempts supporting non-service.");
    r.stage = "Unable to Serve";
    c.nonService = {
      by:ctx.userId,reasonCode:payload.reasonCode,reasonDetail:payload.reasonDetail||"",
      attemptsSummary:payload.attemptsSummary,at:ctx.at,note:payload.note||""
    };
  } else if (command === "generate_return_draft") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_document_generate");
    note();
    requireValue(
      r.stage === "Served" && (
        (["summons","small-claims"].includes(c.workflowId) && !["POS-020","POS-030","POS-040"].includes(payload.formCode)) ||
        (!["summons","small-claims"].includes(c.workflowId) && ["POS-020","POS-030","POS-040"].includes(payload.formCode))
      ),
      "Choose an allowed court form for this served case.",
      409,
    );
    requireValue(
      /^[a-f0-9]{64}$/.test(payload.pdfHash || "") &&
        /^[a-f0-9]{64}$/.test(payload.templateHash || ""),
      "A server-generated draft is required.",
    );
    c.draftReturns ??= [];
    c.draftReturns.push({
      id: ctx.eventId,
      formName: payload.formCode || (c.workflowId === "summons" ? "POS-010" : "SC-104"),
      sha256: payload.pdfHash,
      templateSha256: payload.templateHash,
      unsigned: true,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "prepare_return") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_document_generate");
    requireValue(
      ["Served", "Unable to Serve"].includes(r.stage),
      "Record service or non-service before preparing a return.",
      409,
    );
    note();
    requireValue(
      text(payload.formName) && text(payload.reference),
      "Court return form and reference are required.",
    );
    requireValue(
      c.documents.some(
        (d) => d.kind === "Proof of service" || d.kind === "Court return",
      ),
      "Upload the completed proof/return document.",
    );
    c.returnPacket = {
      formName: payload.formName,
      reference: payload.reference,
      preparedBy: ctx.userId,
      at: ctx.at,
      serviceOutcome: r.stage,
    };
    r.stage = "Return Prepared";
  } else if (command === "review_return") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_paper_intake");
    requireValue(
      r.stage === "Return Prepared",
      "Prepare the return before review.",
      409,
    );
    note();
    requireValue(
      c.returnPacket.preparedBy !== ctx.userId &&
        c.service?.by !== ctx.userId &&
        c.nonService?.by !== ctx.userId,
      "A different supervisor must review the service and return.",
      409,
    );
    c.returnPacket.reviewedBy = ctx.userId;
    c.returnPacket.reviewedAt = ctx.at;
    requireValue(text(payload.reviewReference,500),
      "Independent review requires a separate review reference.");
    c.returnPacket.reviewReference = payload.reviewReference;
    c.returnPacket.reviewNote=payload.note||"";
    r.stage = "Reviewed";
  } else if (command === "record_return") {
    requireValue(!targets.length,
      "This case tracks recipients separately. Use recipient-specific service and court-return actions.",409);
    permission(ctx, "civil_document_generate");
    requireValue(
      r.stage === "Reviewed",
      "Supervisor review is required before recording court return.",
      409,
    );
    note();
    requireValue(
      civilDate(payload.date) &&
        payload.date >= r.receivedDate &&
        payload.date <= ctx.today &&
        (!c.service || payload.date >= c.service.date) &&
        text(payload.reference),
      "Return date and court transmission/receipt reference are required.",
    );
    c.returnPacket.returnedAt = payload.date;
    c.returnPacket.receiptReference = payload.reference;
    r.returnFiledDate = payload.date;
    requireValue(
      !c.deadlines.some((d) => !d.completedAt),
      "Complete or resolve all tracked deadlines before recording final court return.",
      409,
    );
    r.stage = "Returned to Court";
  } else if (command === "reopen_return") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      ["Return Prepared", "Reviewed"].includes(r.stage),
      "Only an undelivered return can be reopened.",
      409,
    );
    c.returnRevisions ??= [];
    c.returnRevisions.push({
      ...c.returnPacket,
      reopenedBy: ctx.userId,
      reopenedAt: ctx.at,
      reason: payload.note,
    });
    r.stage = c.returnPacket.serviceOutcome;
    c.returnPacket = null;
  } else if (command === "deadline") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      text(payload.title, 250) &&
        civilDate(payload.dueDate) &&
        text(payload.authorityReference),
      "Deadline title, reviewed due date and authority are required.",
    );
    requireValue(
      [
        "Service",
        "Hearing",
        "Notice",
        "Exemption/claim",
        "Employer return",
        "Sale",
        "Possession",
        "Other",
      ].includes(payload.kind),
      "Choose a deadline type.",
    );
    c.deadlines.push({
      id: ctx.eventId,
      title: payload.title,
      kind: payload.kind,
      dueDate: payload.dueDate,
      authorityReference: payload.authorityReference,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "complete_deadline") {
    permission(ctx, "civil_paper_intake");
    note();
    const d = c.deadlines.find(
      (d) => d.id === payload.deadlineId && !d.completedAt,
    );
    requireValue(d, "Open deadline not found.", 404);
    requireValue(
      text(payload.reference),
      "Completion or court-authorized resolution reference required.",
    );
    Object.assign(d, {
      completedAt: ctx.at,
      completedBy: ctx.userId,
      completionReference: payload.reference,
      completionNote: payload.note,
    });
  } else if (command === "notice") {
    permission(ctx, "civil_document_generate");
    note();
    requireValue(
      text(payload.title, 250) &&
        text(payload.recipient) &&
        text(payload.method) &&
        text(payload.authorityReference) &&
        text(payload.documentId) &&
        civilDate(payload.date) &&
        payload.date >= r.receivedDate &&
        payload.date <= ctx.today,
      "Notice title, recipient, method, date, authority and uploaded document required.",
    );
    requireValue(
      [
        "Personal service",
        "Mail",
        "Posting",
        "Electronic delivery",
        "Other",
      ].includes(payload.method),
      "Choose a recognized notice method.",
    );
    requireValue(
      c.documents.some((d) => d.id === payload.documentId),
      "Notice document must be attached to this case.",
    );
    c.notices.push({
      id: ctx.eventId,
      title: payload.title,
      recipient: payload.recipient,
      method: payload.method,
      date: payload.date,
      authorityReference: payload.authorityReference,
      documentId: payload.documentId,
      by: ctx.userId,
      at: ctx.at,
      note: payload.note,
    });
  } else if (command === "hold") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      [
        "Exemption claim",
        "Third-party claim",
        "Bankruptcy",
        "Court stay",
        "Other",
      ].includes(payload.kind) && text(payload.reference),
      "Hold type and legal/reference number required.",
    );
    c.holds.push({
      id: ctx.eventId,
      kind: payload.kind,
      reference: payload.reference,
      note: payload.note,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "resolve_hold") {
    permission(ctx, "civil_paper_intake");
    note();
    const hold = c.holds.find((h) => h.id === payload.holdId && !h.resolvedAt);
    requireValue(hold, "Open hold not found.", 404);
    requireValue(
      text(payload.orderReference),
      "Court order/resolution reference required.",
    );
    Object.assign(hold, {
      resolvedAt: ctx.at,
      resolvedBy: ctx.userId,
      orderReference: payload.orderReference,
      resolution: payload.note,
    });
  } else if (command === "enforcement_event") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      ["Ready", "Assigned", "Attempting", "Served"].includes(r.stage),
      "Approve intake before enforcement, and finish enforcement before preparing the final return.",
      409,
    );
    liveWrit();
    requireValue(
      CA_WORKFLOWS[c.workflowId].writ,
      "This case is not an enforcement workflow.",
    );
    requireValue(
      !unclosedHold(r),
      "An unresolved claim/stay blocks enforcement.",
      409,
    );
    requireValue(
      [
        "Levy",
        "Notice",
        "Inventory",
        "Custody",
        "Release",
        "Sale",
        "Possession",
        "Employer response",
        "Remittance",
      ].includes(payload.kind),
      "Choose an enforcement action.",
    );
    requireValue(
      text(payload.authorityReference) &&
        civilDate(payload.date) &&
        payload.date >= r.receivedDate &&
        payload.date <= ctx.today &&
        text(payload.description),
      "Action date, property/action details and authority reference required.",
    );
    if (["Sale", "Possession", "Release"].includes(payload.kind)) {
      requireValue(
        text(payload.approvalReference),
        "Supervisory/court authorization reference required.",
      );
      requireValue(
        !c.deadlines.some(
          (d) =>
            !d.completedAt &&
            ["Notice", "Sale", "Possession", "Exemption/claim"].includes(
              d.kind,
            ),
        ),
        "Resolve required notices, claim periods and enforcement deadlines first.",
        409,
      );
    }
    c.enforcement.push({
      kind: payload.kind,
      date: payload.date,
      description: payload.description,
      authorityReference: payload.authorityReference,
      approvalReference: payload.approvalReference || "",
      note: payload.note,
      id: ctx.eventId,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "receipt") {
    permission(ctx, "civil_fee_manage");
    note();
    requireValue(
      ["Service fee", "Creditor deposit", "Levy collection"].includes(
        payload.kind,
      ) &&
        text(payload.reference) &&
        text(payload.payer),
      "Receipt category, payer and reference required.",
    );
    const amount = cents(payload.amountCents);
    requireValue(
      Number.isSafeInteger(ledgerBalance(r) + amount),
      "Case balance exceeds the supported accounting range.",
    );
    requireValue(
      !c.ledger.some(
        (e) => e.direction === "in" && e.reference === payload.reference,
      ),
      "Receipt reference already recorded.",
      409,
    );
    c.ledger.push({
      id: ctx.eventId,
      direction: "in",
      amountCents: amount,
      kind: payload.kind,
      reference: payload.reference,
      party: payload.payer,
      accountingDate: ctx.today,
      // Collection proceeds never become payable solely because a hard-coded
      // county timer elapsed. A second authorized reviewer must record the
      // applicable county/order authority, waiting period and actual release.
      availableOn: payload.kind === "Levy collection" ? null : ctx.today,
      requiresReleaseReview: payload.kind === "Levy collection",
      receiptCounty: c.county,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "release_collection") {
    permission(ctx,"civil_fee_manage");
    note();
    const entry=c.ledger.find(e=>e.id===payload.collectionId &&
      e.kind==="Levy collection" && e.direction==="in" &&
      e.requiresReleaseReview && !e.releaseReviewedAt);
    requireValue(entry,"Pending levy collection release not found.",404);
    requireValue(entry.by!==ctx.userId,
      "A separate finance reviewer must authorize a collection release.",409);
    requireValue(!unclosedHold(r) &&
      !c.deadlines.some(d=>!d.completedAt&&d.kind==="Exemption/claim"),
      "Resolve active claims, stays and exemption deadlines before releasing collection funds.",409);
    requireValue(text(payload.authorityReference,500) &&
      text(payload.policyVersion,100) &&
      text(payload.reviewNote,1000),
      "Record the county/order authority, policy version and release review rationale.");
    requireValue(civilDate(payload.earliestReleaseDate) &&
      payload.earliestReleaseDate>=entry.accountingDate &&
      payload.earliestReleaseDate<=ctx.today,
      "Enter the reviewed lawful release date; funds cannot be released early.");
    requireValue(text(payload.county,150) &&
      payload.county.toLowerCase()===String(entry.receiptCounty).toLowerCase(),
      "Holding policy must match the agency county.");
    entry.availableOn=payload.earliestReleaseDate;
    entry.releaseReviewedAt=ctx.at;
    entry.releaseReviewedBy=ctx.userId;
    entry.releaseAuthority=payload.authorityReference;
    entry.releasePolicyVersion=payload.policyVersion;
    entry.releaseReviewNote=payload.reviewNote;
  } else if (command === "expense") {
    permission(ctx, "civil_fee_manage");
    note();
    requireValue(
      text(payload.authority) && text(payload.reference),
      "Reviewed fee/expense authority and accounting reference required.",
    );
    requireValue(
      !c.ledger.some(
        (e) => e.direction === "out" && e.reference === payload.reference,
      ),
      "Accounting reference already recorded.",
      409,
    );
    const amount = cents(payload.amountCents);
    requireValue(
      amount <= availableCaseFunds(r, ctx.today),
      "Expense exceeds released case funds; funds in a holding period are unavailable.",
      409,
    );
    c.ledger.push({
      id: ctx.eventId,
      direction: "out",
      amountCents: amount,
      kind: "Authorized expense",
      authority: payload.authority,
      reference: payload.reference,
      accountingDate: ctx.today,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "request_disbursement") {
    permission(ctx, "civil_fee_manage");
    note();
    disbursementReady();
    const amount = cents(payload.amountCents);
    requireValue(
      amount <= availableCaseFunds(r, ctx.today),
      "Disbursement exceeds released case funds; funds in a holding period are unavailable.",
      409,
    );
    requireValue(
      text(payload.payee) && text(payload.authority) && text(payload.reference),
      "Payee, authority and accounting reference required.",
    );
    c.disbursements.push({
      id: ctx.eventId,
      amountCents: amount,
      payee: payload.payee,
      authority: payload.authority,
      reference: payload.reference,
      requestedBy: ctx.userId,
      status: "pending",
      at: ctx.at,
    });
  } else if (command === "approve_disbursement") {
    permission(ctx, "civil_fee_manage");
    note();
    disbursementReady();
    const d = c.disbursements.find(
      (d) => d.id === payload.disbursementId && d.status === "pending",
    );
    requireValue(d, "Pending disbursement not found.", 404);
    requireValue(
      d.requestedBy !== ctx.userId,
      "A different finance reviewer must approve disbursement.",
      409,
    );
    requireValue(
      !unclosedHold(r) && d.amountCents <= availableCaseFunds(r, ctx.today),
      "Claim, holding period or insufficient released funds blocks disbursement.",
      409,
    );
    d.status = "approved";
    d.approvedBy = ctx.userId;
    d.approvalReference = payload.note;
  } else if (command === "record_disbursement") {
    permission(ctx, "civil_fee_manage");
    note();
    disbursementReady();
    const d = c.disbursements.find(
      (d) => d.id === payload.disbursementId && d.status === "approved",
    );
    requireValue(d, "Approved disbursement not found.", 404);
    requireValue(
      !unclosedHold(r) && d.amountCents <= availableCaseFunds(r, ctx.today),
      "Claim, holding period or insufficient released funds blocks disbursement.",
      409,
    );
    requireValue(
      text(payload.paymentReference),
      "External payment/check reference is required.",
    );
    requireValue(
      !c.ledger.some(
        (e) =>
          e.direction === "out" && e.reference === payload.paymentReference,
      ),
      "Payment reference already recorded.",
      409,
    );
    d.status = "recorded";
    d.paymentReference = payload.paymentReference;
    d.recordedBy = ctx.userId;
    c.ledger.push({
      id: ctx.eventId,
      direction: "out",
      kind: "Disbursement",
      amountCents: d.amountCents,
      party: d.payee,
      reference: payload.paymentReference,
      accountingDate: ctx.today,
      by: ctx.userId,
      at: ctx.at,
    });
  } else if (command === "reconcile") {
    permission(ctx, "civil_fee_manage");
    note();
    requireValue(text(payload.reference), "Reconciliation reference required.");
    requireValue(
      Number.isSafeInteger(payload.verifiedBalanceCents) &&
        payload.verifiedBalanceCents === ledgerBalance(r),
      "Verified balance does not match the ledger.",
    );
    c.reconciliation = {
      reference: payload.reference,
      balanceCents: payload.verifiedBalanceCents,
      by: ctx.userId,
      at: ctx.at,
      ledgerCount: c.ledger.length,
    };
  } else if (command === "close") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      r.stage === "Returned to Court",
      "Record the reviewed court return before closure.",
      409,
    );
    requireValue(
      !unclosedHold(r),
      "Resolve all claims/stays before closure.",
      409,
    );
    requireValue(
      !c.disbursements.some((d) => d.status !== "recorded"),
      "Complete pending disbursements before closure.",
      409,
    );
    requireValue(
      ledgerBalance(r) === 0,
      "Refund/disburse remaining case funds before closure.",
      409,
    );
    requireValue(
      !c.deadlines.some((d) => !d.completedAt),
      "Resolve tracked deadlines before closing or cancelling.",
      409,
    );
    if (c.ledger.length)
      requireValue(
        c.reconciliation?.ledgerCount === c.ledger.length &&
          c.reconciliation.balanceCents === 0,
        "Reconcile the final ledger before closure.",
        409,
      );
    r.stage = "Closed";
    c.closedBy = ctx.userId;
    c.closedAt = ctx.at;
  } else if (command === "cancel") {
    permission(ctx, "civil_paper_intake");
    note();
    requireValue(
      ledgerBalance(r) === 0 &&
        !unclosedHold(r) &&
        !c.disbursements.some((d) => d.status !== "recorded"),
      "Resolve claims and case funds before cancelling.",
      409,
    );
    requireValue(
      !c.deadlines.some((d) => !d.completedAt),
      "Resolve tracked deadlines before closing or cancelling.",
      409,
    );
    if (c.ledger.length)
      requireValue(
        c.reconciliation?.ledgerCount === c.ledger.length &&
          c.reconciliation.balanceCents === 0,
        "Reconcile the final ledger before cancelling.",
        409,
      );
    r.stage = "Cancelled";
  } else throw new CivilError("Unknown Civil command.");
  c.history.push({
    id: ctx.eventId,
    command,
    note: payload.note || "",
    actor: ctx.userId,
    personId: ctx.personId,
    at: ctx.at,
    fromStage: before.stage,
    toStage: r.stage,
  });
  return r;
}
