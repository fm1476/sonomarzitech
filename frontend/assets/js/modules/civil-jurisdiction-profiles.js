/* SonoMarzi Civil jurisdiction profiles. No automatic activation or changes to STATE. */
(function(root){
  'use strict';
  const profiles = Object.freeze({
    'US-GENERAL': Object.freeze({id:'US-GENERAL',version:'1.0.0',status:'unconfigured',state:null,workflows:[]}),
    'US-CA': Object.freeze({
      id:'US-CA',version:'0.1.0',status:'draft',state:'CA',
      displayName:'California Civil Process',
      workflows:[
        {id:'summons',label:'Summons and Complaint',intakeForms:['SER-001'],reviewRequired:true},
        {id:'earnings-withholding',label:'Earnings Withholding',intakeForms:['WG-001'],reviewRequired:true},
        {id:'writ-execution',label:'Writ of Execution',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'possession',label:'Writ of Possession',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'personal-property-levy',label:'Personal Property Levy',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'real-property-levy',label:'Real Property Levy',intakeForms:['SER-001','SER-001A'],reviewRequired:true}
      ],
      safeguards:{
        statutoryFeesRequireApproval:true,
        serviceMethodEvidenceRequired:true,
        separateWritExpiration:true,
        preserveCaseRuleVersion:true,
        trustAccountingReviewRequired:true
      }
    })
  });
  function get(id){return profiles[id] || null;}
  function prepareSelection(id,county){
    const profile=get(id);
    if(!profile) throw new Error('Unknown civil jurisdiction profile');
    return {profileId:profile.id,profileVersion:profile.version,county:String(county||'').trim(),status:'draft',activatedAt:null,activatedBy:null};
  }
  function validateSelection(selection){
    const errors=[];
    if(!selection || !get(selection.profileId)) errors.push('Choose a recognized jurisdiction profile');
    if(selection?.profileId==='US-CA' && !String(selection.county||'').trim()) errors.push('County is required for California');
    if(selection?.status==='active') errors.push('Jurisdiction activation requires a validated server-side approval process');
    return {valid:errors.length===0,errors};
  }
  function canActivate(_selection){
    // Fail closed until a server-side, auditable activation endpoint is implemented.
    return false;
  }
  // Intake readiness is intentionally conservative: missing evidence blocks completion.
  const REQUIRED_BY_WORKFLOW=Object.freeze({
    summons:['caseNumber','courtOfOrigin','receivedDate','serviceAddresses','signedInstructions'],
    'earnings-withholding':['caseNumber','courtOfOrigin','receivedDate','signedInstructions','writDocument','employerName'],
    'writ-execution':['caseNumber','courtOfOrigin','receivedDate','signedInstructions','writDocument','issuedDate','writExpirationDate'],
    possession:['caseNumber','courtOfOrigin','receivedDate','signedInstructions','writDocument','propertyAddress'],
    'personal-property-levy':['caseNumber','courtOfOrigin','receivedDate','signedInstructions','writDocument','propertyDescription'],
    'real-property-levy':['caseNumber','courtOfOrigin','receivedDate','signedInstructions','writDocument','legalDescription']
  });
  function nonEmpty(value){
    return Array.isArray(value)?value.length>0:value!==undefined && value!==null && String(value).trim()!=='';
  }
  function reviewIntake(workflowId,record){
    const required=REQUIRED_BY_WORKFLOW[workflowId];
    if(!required) return {ready:false,errors:['Unsupported California workflow']};
    const input=record && typeof record==='object'?record:{};
    const errors=required.filter(field=>!nonEmpty(input[field])).map(field=>'Missing required intake information: '+field);
    return {ready:errors.length===0,errors,requiresHumanReview:true,approved:false};
  }
  function reviewService(record){
    const input=record && typeof record==='object'?record:{};
    const errors=[];
    for(const field of ['serviceMethod','servedDate','servedTime','servedOnName','serverIdentity']){
      if(!nonEmpty(input[field])) errors.push('Missing service evidence: '+field);
    }
    if(input.serviceMethod==='Substituted Service'){
      for(const field of ['substituteRecipient','recipientRelationship','followupMailingDate','followupMailingAddress']){
        if(!nonEmpty(input[field])) errors.push('Missing substituted service evidence: '+field);
      }
    }
    if(input.serviceMethod==='Posting (Nail and Mail)'){
      for(const field of ['courtAuthorization','postingDate','mailingDate','mailingAddress']){
        if(!nonEmpty(input[field])) errors.push('Missing posting and mailing evidence: '+field);
      }
    }
    return {ready:errors.length===0,errors,requiresHumanReview:true,approved:false};
  }
  // Immutable workflow routing, independent of legacy paper-type labels.
  const WORKFLOW_BY_PAPER_TYPE=Object.freeze({
    'Summons & Complaint':'summons',
    'Wage Garnishment / Earnings Withholding':'earnings-withholding',
    'Writ of Execution':'writ-execution',
    'Writ of Possession':'possession'
  });
  function resolveWorkflow(paperType){
    return WORKFLOW_BY_PAPER_TYPE[String(paperType||'')] || null;
  }
  function reviewCase(paper){
    const workflowId=resolveWorkflow(paper?.paperType);
    if(!workflowId) return {ready:false,approved:false,requiresHumanReview:true,errors:['Paper type requires California workflow mapping and supervisory review']};
    return reviewIntake(workflowId,paper);
  }
  // Dates are civil calendar dates, not timestamps. Invalid calendar values fail closed.
  function parseCivilDate(value){
    if(typeof value!=='string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
    const [year,month,day]=value.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return null;
    return date;
  }
  function reviewWrit(record,asOfDate){
    const input=record && typeof record==='object'?record:{};
    const errors=[];
    const issued=parseCivilDate(input.issuedDate);
    const expires=parseCivilDate(input.writExpirationDate);
    const today=parseCivilDate(asOfDate);
    if(!issued) errors.push('Valid writ issuance date required (YYYY-MM-DD)');
    if(!expires) errors.push('Valid writ expiration date required (YYYY-MM-DD)');
    if(!today) errors.push('Valid review date required (YYYY-MM-DD)');
    if(issued && expires && expires<issued) errors.push('Writ expiration precedes issuance');
    if(expires && today && expires<today) errors.push('Writ expiration has passed');
    if(!nonEmpty(input.writDocument)) errors.push('Writ document required');
    if(!nonEmpty(input.courtOfOrigin)) errors.push('Issuing court required');
    return {ready:errors.length===0,approved:false,requiresHumanReview:true,errors};
  }
  function reviewDisbursement(record){
    const input=record && typeof record==='object'?record:{};
    const errors=[];
    const amount=Number(input.amount);
    const available=Number(input.availableTrustBalance);
    if(!Number.isFinite(amount)||amount<=0) errors.push('Disbursement amount must be positive');
    if(!Number.isFinite(available)||available<0) errors.push('Verified trust balance required');
    if(Number.isFinite(amount)&&Number.isFinite(available)&&amount>available) errors.push('Disbursement exceeds trust balance');
    if(!nonEmpty(input.payee)) errors.push('Payee required');
    if(!nonEmpty(input.accountingReference)) errors.push('Accounting reference required');
    if(!nonEmpty(input.reconciledBy)) errors.push('Reconciliation reviewer required');
    return {ready:errors.length===0,approved:false,requiresHumanReview:true,errors};
  }
  const api=Object.freeze({get,prepareSelection,validateSelection,canActivate,resolveWorkflow,reviewCase,reviewIntake,reviewService,reviewWrit,reviewDisbursement});
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.SonoMarziCivilProfiles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
