# California Civil official enforcement PDFs

## Upload placement for PR #136

Five official Judicial Council PDFs were supplied for the development pass and
individually inspected. Place **unchanged original bytes** at:

- `lambdas/api/templates/civil/wg002.pdf`
- `lambdas/api/templates/civil/wg005.pdf`
- `lambdas/api/templates/civil/ej150.pdf`
- `lambdas/api/templates/civil/ej130.pdf`
- `lambdas/api/templates/civil/wg006.pdf`

The original SHA-256 values are pinned in `enforcement-uploaded-manifest.json`.
Do not rename or optimize the uploaded files; hash mismatch MUST fail closed.

`enforcement-field-map.json` documents the exact inspected field names.
`civil-california-enforcement-pdf-service.mjs` supplies an **unsigned** PDF
generator for WG-002 and EJ-150, and case-caption-only PDFs for WG-005 and WG-006.
EJ-130 is **court-issued only** and is excluded from draft generation.

### Work remaining before application release
1. Commit original court PDF binaries unchanged. The authenticated GitHub
   connector in this environment supports text file updates and Git-object
   contents but does not accept local file paths. The source copies exist as
   conversation attachments, but **are not yet in the PR**.
2. Verify template hashes in CI and render all draft permutations.
3. Add authorized application command routing, download/archival actions,
   actor/recipient association, audit evidence and staff-facing controls.
4. Test conditional statutory paths and county fee/notice rules.
5. Independent human inspection and agency acceptance of each generated form.

Do not claim implementation in the live app until these checks pass.
