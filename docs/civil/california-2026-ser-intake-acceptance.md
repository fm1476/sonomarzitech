# California Civil intake source matrix and acceptance guide

Version: 2026-10-18 draft. Status: **Operational engineering draft, not counsel-approved legal rules**.

## Judicial Council source documents
- [SER-001, Request for Sheriff to Serve Court Papers](https://selfhelp.courts.ca.gov/jcc-form/SER-001), effective January 1, 2026.
- [SER-001A, Special Instructions for Writs and Levies](https://selfhelp.courts.ca.gov/jcc-form/SER-001A), effective January 1, 2026.
- [California Courts: sheriff serves](https://selfhelp.courts.ca.gov/sheriff-serves).

The 2026 SER-001 generally requests separate instructions for each person and each set of court papers. SER-001A applies to applicable writs and levies. Wage withholding uses the relevant WG forms and is not automatically treated as an ordinary SER-001 case. Both sheriff-instruction forms are confidential and **must not be filed with the court**.

## Implemented intake coverage

| Source element | SonoMarzi field | Current enforcement |
|---|---|---|
| Case number and court | Core case information | Required |
| Requesting party | ser001.requesterName | Required when SER-001 applies |
| Mailing address for requesting party | ser001.requesterMailingAddress | Required when SER-001 applies |
| Person or entity to serve | ser001.serviceTargetType / serviceTargetName | Required |
| Identity / agent specifics | ser001.serviceTargetDetails | Captured if provided |
| Service place | Case serviceAddresses + ser001.serviceAddressType | Required |
| Best time and access details | ser001.serviceAvailability | Captured if known |
| Documents to serve | ser001.documentsDescription | Required |
| Hearing question | ser001.hearingStatus and intakeDetails.hearingDate | Conditional |
| Reported safety/accessibility | ser001.safetyAccessibilityStatus / safetyAccessibilityDetails | Captured, required details if issues reported; NOT an automatically verified safety flag |
| Requester role | ser001a.requesterRole | Required when SER-001A applies |
| Debtor / third party / occupant role | ser001a.targetRelationship | Required |
| Writ instrument / original or copy | ser001a.writType / writCopyStatus | Required |
| Judgment specifics | ser001a.judgmentDetails | Captured for reviewer |
| Property and place | ser001a.propertyAndLocation | Required |
| Owners and interests | ser001a.ownersAndInterests | Captured for reviewer |
| Dwelling status | ser001a.dwellingStatus | Required |
| Personal debt / address verification | ser001a.personalDebtStatus / addressVerificationReference | Conditional |
| Special enforcement instructions | ser001a.specialInstructions | Captured for reviewer |
| Reviewer identity | ser001ReviewedBy/At, ser001aReviewedBy/At | Automatically stored on save |
| Supporting court packet and signed instructions | Protected agency attachments | Required before approval |

The current structured fields are **not a complete machine-readable reproduction** of every line of the official forms. In particular, multiple service targets, requesting lawyer/firm contact, alternate addresses, property ownership/interest, and some levy exceptions still require field-by-field acceptance and further structured additions. The original signed instruction attachment remains required as the authoritative artifact.

## Mandatory release acceptance

1. Verify source PDFs, version, numbering, annotations, confidentiality handling and field mappings.
2. Validate SER-001/SER-001A against at least one real redacted intake packet per workflow, including person/entity service, attachments, multiple recipients and writ/levy branches.
3. Review conditional documentation such as WG-015/EJ-135, judgment-debtor personal debt, writ copies, property descriptions, dwellings and required notices with California civil operations and counsel.
4. Confirm all critical instructions are actually recorded, including optional-but-provided details, without incorrectly turning unsupported fields into legal conclusions.
5. Check access to confidential instruction attachments separately from public court-return documents, including download, export and tenant isolation.
6. Test corrections, version history, approver changes, dismissal, returns, statutory time periods, fee deposits and exception workflows.
7. Keep the California release-readiness gate closed until legalRules, forms, fees, privacy, uploads, independentReview, concurrency and regression acceptance evidence is collected.

## Action note policy

Every action already records actor, action, timestamp, and status transition in California case history and audit events. Routine actions (intake, assignment, attempts, service, document upload, ordinary return and notifications) do not need an additional prose note.

Required narrative remains for high-discretion or high-risk actions: safety-flag retirement, document replacement/removal, return reopening, cancellation, claim/stay decisions, payment/disbursement approvals, reconciliation, enforcement actions, and expense exceptions. Structured mandatory evidence remains required independent of note optionality.

**Remaining implementation gap:** A full per-line state form replica, form-to-PDF comparison, and sign-off for all 11 California workflow variants are not complete merely because the new intake fields and tests pass.
