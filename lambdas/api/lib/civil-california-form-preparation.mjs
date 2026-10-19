import {californiaEnforcementFormReadiness} from './civil-california-enforcement-forms.mjs';

// Strictly non-signing case-data extraction for official PDF field mapping.
// Employer statements, judicial issuance and declarations must NEVER be inferred.
const fail=message=>{const e=new Error(message);e.code='CIVIL_FORM_VALIDATION';throw e;};
const value=(v,max=250)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():'';
const safeDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v))?v:'';
export function prepareCaliforniaEnforcementFormData(record,formCode,options={}){
 const readiness=californiaEnforcementFormReadiness(record,formCode,options);
 const c=record.california;
 if(!value(record.caseNumber)||!value(record.plaintiff)||!value(record.defendant))
   fail('Case number and parties are required before preparing an official court form.');
 const common={formCode,caseNumber:record.caseNumber,plaintiff:record.plaintiff,
   defendant:record.defendant,county:value(c.county),court:value(record.courtOfOrigin),
   signature:'',signingDate:'',certified:false,generatedPdf:false};
 if(formCode==='WG-005'){
  // Only the court caption can be prepopulated. Responses must come from the
  // employer's own completed return, not a sheriff office inference.
  return { ...common,preparedFor:'employer',fields:{...common,employerName:'',employmentStatus:'',employeeStatement:'',employerSignature:''},
    readiness:{...readiness,generationEnabled:false},
    warnings:['Employer response and signature must be provided by the employer.','This preview is not an Employer\'s Return.']};
 }
 if(formCode==='EJ-150'){
  const levy=c.enforcement||{};
  const notice=options.notice||{};
  const target=value(notice.levyTarget);
  const writ=value(notice.issuedWritReference);
  const noticeDate=safeDate(notice.noticeDate);
  if(!target||!writ||!noticeDate)fail('Levy target, court-issued writ reference and notice date are required.');
  if(c.holds?.some(h=>!h.resolvedAt&&!h.closedAt))fail('Unresolved hold requires review before preparing a levy notice.');
  return {...common,preparedFor:'levying-officer',
    fields:{caseNumber:record.caseNumber,plaintiff:record.plaintiff,defendant:record.defendant,
      county:common.county,levyTarget:target,issuedWritReference:writ,noticeDate,
      amountCents:null,noticeSigner:'',signedDate:''},
    readiness:{...readiness,generationEnabled:false},
    warnings:['Verify writ, levy amounts, notice recipients and statutory service requirements before issuance.']};
 }
 if(formCode==='EJ-130')return {...common,preparedFor:'court',fields:{...common},
   readiness:{...readiness,generationEnabled:false},
   warnings:['Only a court-issued writ is authoritative. Upload the official issued instrument.']};
 return {...common,preparedFor:readiness.issuer,fields:{...common},
   readiness:{...readiness,generationEnabled:false},warnings:['Independent declarant review and official field mapping are required.']};
}
