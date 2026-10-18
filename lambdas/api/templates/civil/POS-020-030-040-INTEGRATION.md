# California POS-020 / POS-030 / POS-040: approved-template intake

These forms are not yet PDF-generatable in SonoMarzi. The user-facing catalog links to official California Courts resources:

- POS-020: https://selfhelp.courts.ca.gov/jcc-form/POS-020
- POS-030: https://selfhelp.courts.ca.gov/jcc-form/POS-030
- POS-040: https://selfhelp.courts.ca.gov/jcc-form/POS-040

Do not reuse POS-010 or its internal AcroForm field names. These forms cover different legal declarations, service methods, and continuation attachments.

## Release gate for each form

1. Obtain the current fillable PDF from the official Judicial Council source, recording source URL, retrieval date, published revision, source SHA-256, and normalized template SHA-256 in manifest.json.
2. Visually examine each printed page and map every field against its visible label (not its internal name alone): parties, court and case details, specific papers served, recipient, service date/time/location, server identity and capacity, mailing details where relevant, signatures and declarations.
3. Require affirmative, service-method-specific case evidence. Never infer first-class mail from a generic mailed status or infer personal delivery merely from a Served case stage.
4. Leave perjury declarations, certifications, filing/acceptance, handwritten signatures and dates of signature blank. Never claim completed court filing for a generated draft.
5. Reject wrong template SHA-256, missing facts, unsupported service methods, overlong fields, non-renderable characters, and recipients that require an unsupported continuation page.
6. Download or archive only an explicitly labeled UNSIGNED DRAFT. A signed, completed court return must be uploaded separately and reviewed under existing workflow permissions.
7. Add automated tests of individual mapped fields, missing-data and unsupported-method conditions, template integrity, and human-reviewed full-page renders on all form pages.
8. Obtain review by Civil subject-matter experts and agency counsel for the chosen service methods before enabling in live customer tenants.

## Present support

Only eligible personally served POS-010 and SC-104 cases currently support automatic drafts. POS-020, POS-030 and POS-040 must remain manual until their official, version-verified templates and full validations are ready.