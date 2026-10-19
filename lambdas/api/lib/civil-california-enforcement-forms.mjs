// Current official-form release registry. This is NOT a generation success signal.
// An entry becomes generatable only after an approved binary, mapped fields,
// and independent visual and behavioral tests have been committed.
export const CA_ENFORCEMENT_FORM_REGISTRY=Object.freeze({
  "WG-002":Object.freeze({title:"Earnings Withholding Order",effective:"2026-01-01",workflowIds:["earnings-withholding"],issuer:"levying-officer",official:"https://selfhelp.courts.ca.gov/jcc-form/WG-002",status:"mapping-required",requiredEvidence:["current-writ","levying-officer-authorization","employer","employee","judgment-balance"],signatureAuthority:"levying-officer"}),
  "WG-005":Object.freeze({title:"Employer's Return (Wage Garnishment)",effective:"2026-07-01",workflowIds:["earnings-withholding"],issuer:"employer",official:"https://selfhelp.courts.ca.gov/jcc-form/WG-005",status:"mapping-required",requiredEvidence:["employer-response","employer-declaration"],signatureAuthority:"employer"}),
  "EJ-150":Object.freeze({title:"Notice of Levy",effective:"2026-07-01",workflowIds:["bank-levy","personal-property-levy","real-property-levy","execution"],issuer:"levying-officer",official:"https://selfhelp.courts.ca.gov/jcc-form/EJ-150",status:"mapping-required",requiredEvidence:["writ","levy-target","amount-breakdown","debtor"],signatureAuthority:"levying-officer"}),
  "EJ-130":Object.freeze({title:"Writ of Execution",effective:"2026-07-01",workflowIds:["execution","bank-levy","personal-property-levy","real-property-levy","earnings-withholding"],issuer:"court",official:"https://selfhelp.courts.ca.gov/jcc-form/EJ-130",status:"court-issued-only",requiredEvidence:["court-issued-writ"],signatureAuthority:"court"}),
  "WG-006":Object.freeze({title:"Claim of Exemption",effective:"2026-01-01",workflowIds:["earnings-withholding"],issuer:"claimant",official:"https://selfhelp.courts.ca.gov/jcc-form/WG-006",status:"mapping-required",requiredEvidence:["claimant-declaration"],signatureAuthority:"claimant"})
});
const err=(message)=>{const e=new Error(message);e.code="CIVIL_FORM_VALIDATION";throw e;};
export function californiaEnforcementFormReadiness(record,formCode,options={}){
 const form=CA_ENFORCEMENT_FORM_REGISTRY[formCode];
 if(!form)err("Unknown California enforcement form.");
 const c=record?.california;
 if(!c||!form.workflowIds.includes(c.workflowId))err("Form does not apply to this California Civil workflow.");
 const evidence=options.evidence??{};
 const missing=form.requiredEvidence.filter(k=>evidence[k]!==true);
 const ready=false; // Fail closed until the official binary+mapping are approved.
 return {code:formCode,title:form.title,effective:form.effective,official:form.official,issuer:form.issuer,signatureAuthority:form.signatureAuthority,missingEvidence:missing,generationEnabled:ready,status:form.status,
   reason:form.issuer==="court"?"Upload the issued court writ. Do not manufacture an issued writ from case data.":"Official template field mapping, statutory checks and rendering acceptance remain required before generation can be enabled."};
}
