import {readFile} from 'node:fs/promises';
import {renderMappedCaliforniaCourtDraft} from './civil-california-mapped-pdf.mjs';
import {prepareCaliforniaEnforcementFormData} from './civil-california-form-preparation.mjs';
import {CA_ENFORCEMENT_FORM_REGISTRY} from './civil-california-enforcement-forms.mjs';

// Use exact, uploaded court binaries. No stand-in pages or simulated court forms.
// Enabled for unsigned testing only after source files exist and hash checks pass.
const manifestUrl=new URL('../templates/civil/enforcement-uploaded-manifest.json',import.meta.url);
const mappingUrl=new URL('../templates/civil/enforcement-field-map.json',import.meta.url);
const basename={'WG-002':'wg002','WG-005':'wg005','EJ-150':'ej150','WG-006':'wg006'};
const money=(cents,key)=>{
 if(!Number.isSafeInteger(cents)||cents<0)throw Error(key+' must be an integer number of cents.');
 return (cents/100).toFixed(2);
};
const requireText=(v,key)=>{
 if(typeof v!=='string'||!v.trim()||v.length>250)throw Error(key+' is required.');
 return v.trim();
};
export async function generateCaliforniaEnforcementUnsignedDraft(record,formCode,params={}){
 if(!Object.hasOwn(basename,formCode))throw Error('Selected form is not supported for unsigned generation.');
 const permitted=CA_ENFORCEMENT_FORM_REGISTRY[formCode]?.workflowIds||[];
 if(!permitted.includes(record?.california?.workflowId))throw Error('Form is not valid for this Civil workflow.');
 const manifest=JSON.parse(await readFile(manifestUrl,'utf8'));
 const mappings=JSON.parse(await readFile(mappingUrl,'utf8'));
 const info=manifest[formCode],mapping=mappings[formCode];
 if(!info?.templateSha256||!mapping)throw Error('Official PDF template approval is missing.');
 const templateBytes=await readFile(new URL('../templates/civil/'+basename[formCode]+'-normalized.pdf',import.meta.url));
 const fields={
  caseNumber:requireText(record.caseNumber,'Case number'),
  plaintiff:requireText(record.plaintiff,'Plaintiff'),
  defendant:requireText(record.defendant,'Defendant'),
  county:requireText(record.california.county,'California county')
 };
 if(formCode==='EJ-150'){
  const prepared=prepareCaliforniaEnforcementFormData(record,formCode,{notice:params.notice});
  const n=params.notice||{};
  fields.levyingOfficer=requireText(n.levyingOfficer,'Levying officer identity and address');
  fields.debtor=requireText(n.judgmentDebtor,'Judgment debtor');
  fields.personNotified=requireText(n.personNotified,'Person notified');
  fields.propertyDescription=requireText(n.propertyDescription,'Property description');
  fields.totalDue=money(n.totalDueCents,'Total due from court-issued writ');
  fields.levyFee=money(n.levyFeeCents,'Levy fee');
  fields.sheriffDisbursementFee=money(n.sheriffDisbursementFeeCents,'Sheriff disbursement fee');
  fields.recoverableCosts=money(n.recoverableCostsCents,'Recoverable costs');
  fields.dailyInterest=money(n.dailyInterestCents,'Daily interest from issued writ');
  const add=[n.totalDueCents,n.levyFeeCents,n.sheriffDisbursementFeeCents,n.recoverableCostsCents];
  if(!add.every(Number.isSafeInteger)||add.some(v=>v<0))throw Error('Levy amount components must be nonnegative integer cents.');
  const sum=add.reduce((a,b)=>a+b,0);
  if(!Number.isSafeInteger(sum))throw Error('Levy amount total exceeds supported range.');
  fields.totalWithFees=money(sum,'Total with fees');
  if(!prepared.fields.issuedWritReference)throw Error('A court-issued writ reference is required.');
 } else if(formCode==='WG-002'){
  const d=params.order||{};
  fields.levyingOfficer=requireText(d.levyingOfficer,'Levying officer identity and address');
  fields.employer=requireText(d.employer,'Employer identity and address');
  fields.employee=requireText(d.employee,'Employee identity and address');
  fields.totalDue=money(d.totalDueCents,'Total due');
  fields.judgmentDate=requireText(d.judgmentDate,'Judgment date');
  const date=new Date(fields.judgmentDate+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fields.judgmentDate)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==fields.judgmentDate)throw Error('Valid judgment date is required.');
  const [year,month,day]=fields.judgmentDate.split('-');
  fields.judgmentDate=month+'/'+day+'/'+year;
  // Signed order remains a separate human authorization, never generated here.
 } else {
  // WG-005 and WG-006 are declarant forms. Caption-only working copies.
  fields.levyingOfficer=requireText(params.levyingOfficer,'Levying officer');
 }
 return renderMappedCaliforniaCourtDraft({
  templateBytes,expectedTemplateSha256:info.normalizedSha256,
  fields,mapping,formCode
 });
}
