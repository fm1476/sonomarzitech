# California Judicial Council proof of service forms: implementation

Three official, fillable court templates are bundled, pinned by original source and normalized-template SHA-256, and supported for **unsigned working drafts**:

| Form | Current supported workflow | Source |
| --- | --- | --- |
| POS-020 | Non-summons, non-small-claims cases with recorded personal service | https://selfhelp.courts.ca.gov/jcc-form/POS-020 |
| POS-030 | Non-summons, non-small-claims cases with explicitly recorded first-class mail service | https://selfhelp.courts.ca.gov/jcc-form/POS-030 |
| POS-040 | Non-summons, non-small-claims cases with recorded personal service (other POS-040 methods require manual completion) | https://selfhelp.courts.ca.gov/jcc-form/POS-040 |

POS-010 and SC-104 continue to support eligible summons and small-claims personal service cases.

## Integration, audit and review

* PDFs were downloaded from California Courts, visually inspected and normalized to editable, unencrypted AcroForms. The manifest records source hash, normalized template hash, revision, source URL and retrieval date; the generator refuses changed template bytes.
* Recorded court case, parties, service date, served recipient, address, selected method and user-supplied document description populate the corresponding official fields.
* POS-030 requires user-selected USPS deposit vs business collection and the location of mailing, and the underlying case must actually record first-class mail service.
* POS-020 and POS-040 do not silently substitute personal delivery for substituted, electronic, or alternative court-authorized methods.
* The forms are explicitly labeled **DRAFT – UNSIGNED**. They do not auto-select penalty-of-perjury declarations or certification, and do not sign, date a signature, notarize, transmit to court, or represent a filing.
* The downloaded copy may be retained in case Documents as an *Unsigned return draft*. It does not satisfy the signed Proof of service / Court return requirement, which still requires a separate upload and supervisory review.
* All generators enforce source data and document descriptions, field length limits, approved template SHA-256, role controls and recorded service method.
* Tests validate all three official PDFs, populated fields, wrong service methods and missing documents; real Chromium tests validate application navigation. Samples of generated PDFs are preserved as CI artifacts for inspection.

## Deliberate limitations

* If service involved multiple recipients, more documents than fit, or methods requiring separate official attachments, staff must complete the official continuation forms POS-020(D/P), POS-030(D/P), or POS-040(D/P) manually before signing.
* POS-040 overnight delivery, messenger, fax, and mail options, and any court-specific requirements, are not automatically populated. Use the official PDF manually for those methods until explicit case evidence and a validated field map are implemented.
* Court-specific requirements, server capacity/registration classification, perjury declarations, signing and filing must be verified by trained staff. Do not treat generated documents as legally reviewed or filed.
