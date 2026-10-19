// California sheriff-intake structured evidence. Revision references are informational;
// legal acceptance of mandatory fields and workflow exceptions is a separate release gate.
export const CA_SER_INTAKE_VERSION='2026-01';
export const CA_SER_SOURCES=Object.freeze({
  'SER-001':'https://selfhelp.courts.ca.gov/jcc-form/SER-001',
  'SER-001A':'https://selfhelp.courts.ca.gov/jcc-form/SER-001A'
});
export const SER001_FIELDS=Object.freeze([
  ['requesterName','Requesting party name','text'],
  ['requesterMailingAddress','Requester mailing address','text'],
  ['serviceTargetType','Who is being served?','choice',['Person','Entity']],
  ['serviceTargetName','Name of person or entity to serve','text'],
  ['serviceTargetDetails','Identifying information / agent / recipient details','text'],
  ['serviceAddressType','Primary service location','choice',['Home','Business','Other']],
  ['serviceAvailability','Best service hours or access instructions','text'],
  ['documentsDescription','Papers to serve, including all required documents','text'],
  ['hearingStatus','Hearing scheduled?','choice',['Yes','No','Unknown']],
  ['safetyAccessibilityStatus','Safety or accessibility information provided?','choice',['No issues reported','Issues reported','Not established']],
  ['safetyAccessibilityDetails','Reported safety/accessibility details (unverified)','text']
]);
export const SER001A_FIELDS=Object.freeze([
  ['requesterRole','Requesting party role / creditor status','text'],
  ['targetRelationship','Target relationship to judgment / property','choice',['Judgment debtor','Third party property holder','Property occupant','Other']],
  ['writType','Writ / enforcement document being presented','text'],
  ['writCopyStatus','Writ copy status','choice',['Original','Electronic certified copy','Previously lodged copy','Other']],
  ['judgmentDetails','Judgment date, amount and creditor/debtor details','text'],
  ['propertyAndLocation','Property / account description and location','text'],
  ['ownersAndInterests','Other owners or interests, if applicable','text'],
  ['dwellingStatus','Dwelling involved?','choice',['Yes','No','Unknown']],
  ['personalDebtStatus','Personal-debt judgment?','choice',['Yes','No','Undetermined']],
  ['addressVerificationReference','WG-015/EJ-135 attachment reference if applicable','text'],
  ['specialInstructions','Special sheriff enforcement instructions','text']
]);
export function serReviewRequiredForms(workflowForms=[]){
  return {ser001:workflowForms.includes('SER-001'),ser001a:workflowForms.includes('SER-001A')};
}
export function validateSerIntake(details={},workflowForms=[],documents=[]){
  const {ser001,ser001a}=serReviewRequiredForms(workflowForms);
  const present=v=>typeof v==='string'&&v.trim().length>0;
  const errors=[];
  const one=details.ser001||{},two=details.ser001a||{};
  if(ser001){
    for(const key of ['requesterName','requesterMailingAddress','serviceTargetType','serviceTargetName','serviceAddressType','documentsDescription','hearingStatus','safetyAccessibilityStatus'])
      if(!present(one[key]))errors.push('SER-001: '+(SER001_FIELDS.find(f=>f[0]===key)?.[1]||key)+' is missing.');
    if(one.safetyAccessibilityStatus==='Issues reported'&&!present(one.safetyAccessibilityDetails))
      errors.push('SER-001: Record reported safety/accessibility information (do not automatically verify safety flags).');
    if(one.hearingStatus==='Yes'&&!present(details.hearingDate))
      errors.push('SER-001: A scheduled hearing needs a recorded date.');
    if(!documents.some(d=>d.kind==='Signed instructions'))
      errors.push('SER-001: Attach confidential signed sheriff instructions.');
  }
  if(ser001a){
    for(const key of ['requesterRole','targetRelationship','writType','writCopyStatus','propertyAndLocation','dwellingStatus','personalDebtStatus'])
      if(!present(two[key]))errors.push('SER-001A: '+(SER001A_FIELDS.find(f=>f[0]===key)?.[1]||key)+' is missing.');
    if(two.personalDebtStatus==='Yes'&&!present(two.addressVerificationReference))
      errors.push('SER-001A: Record attached address-verification declaration reference.');
    if(two.personalDebtStatus==='Undetermined')
      errors.push('SER-001A: Determine whether personal-debt address verification applies.');
  }
  return errors;
}
export function normalizeSerIntake(input){
  if(input===undefined)return undefined;
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid structured sheriff intake review.');
  const fields=[...SER001_FIELDS,...SER001A_FIELDS];
  const valid=new Set(fields.map(f=>f[0]));
  if(Object.keys(input).some(k=>!valid.has(k)))throw Error('Unknown sheriff intake field.');
  const clean={};
  for(const [key,val] of Object.entries(input)){
    if(typeof val!=='string'||val.length>2000)throw Error('Invalid sheriff intake field: '+key);
    const def=fields.find(f=>f[0]===key);
    if(def?.[2]==='choice'&&val&&!def[3].includes(val))throw Error('Invalid sheriff intake selection: '+key);
    clean[key]=val.trim();
  }
  return clean;
}
