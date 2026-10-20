# SonoMarzi California Civil | post-deployment acceptance runbook

**Baseline:** `main` at `bd94618928b98ca6b6a209962c7a731a68935b31` (PR #134), as inspected October 18, 2026 Pacific.  
**Purpose:** Repeatable, evidence-based end-to-end acceptance, not a claim that live operations or legal compliance have been certified.  
**Test tenant:** Demo PD / Sonoma, California, **test profile only**. Use fictional names, addresses, employers, writs, amounts, and court references. Never transmit documents to real courts, employers, recipients, or banks. Do not switch on operational activation.

## A. Preflight

1. Record deployed UI version and API/Lambda version. Verify both match the intended commit. A successful GitHub merge is *not* proof CloudFront/API deployments are current.
2. Verify Demo PD jurisdiction displays **California / Sonoma / test**. Confirm non-California agency profiles are unchanged.
3. Prepare distinct users: clerk/intake, serving officer, independent supervisor/reviewer, and finance authorizer. Record their role abilities. **Do not approve your own returns or releases.**
4. In a clean case, verify signed-file retrieval, S3 attachment protection, and correct recipient association. Capture file key, version, hash and audit event IDs where exposed.
5. Record baseline CloudWatch failures, source verification job outcome and relevant tenant audit counts. No secrets or real PII in test artifacts.
6. For each run, retain case ID, workflow type, expected result, actual result, screenshot or redacted audit reference, tester, date and disposition.

## B. Common service workflow, run separately for every applicable case type

| Step | Operator action | Required assertion |
|---|---|---|
| 1 | Create Civil case, select **Workflow Type**, enter court/case and party information | Saved workflow is selectable, reopens correctly after refresh, and enforces required fields |
| 2 | Attach reviewed writ/order/packet and all conditional required forms | Wrong case, missing attachment, incorrect type or mismatched party prevents advancement |
| 3 | Record service target(s) independently with distinguishable identities | Targets persist separately and do not silently merge |
| 4 | Assign officer and log one unsuccessful attempt with reason, date/time, location and notes | A structured nonservice reason is retained; attempt does not count as successful service |
| 5 | Record supported successful service method and its method-specific evidence | Service is attributed to correct recipient and officer; invalid method/evidence is rejected |
| 6 | Produce editable **unsigned** official draft, if supported for this method | Draft has correct target information, template identification, hash and audit link; unsigned draft alone cannot satisfy signed-return requirement |
| 7 | Attach signed completed proof for *one named recipient* | Attachment is associated with this target and cannot be substituted, replaced or removed after linking to an accepted return |
| 8 | Attempt officer's own review, then review using a different permitted user | Self-review denied; independent review requires evidence reference and is audited |
| 9 | Record delivery/filing using actual external court reference, where applicable | Date and proof reference survive refresh; recording is not represented as actual electronic filing |
| 10 | Repeat for second recipient with a different outcome or service method | One recipient's proof, review and court delivery cannot fulfill another's |
| 11 | Reopen/reload, navigate away, retry stale version and complete eligible closeout | Completed data persists; version conflict rejects stale change; holds and open financial obligations prevent closure |

**Negative checks:** missing/invalid dates and times, service before assignment where prohibited, wrong recipient ID, duplicate proof, unsigned proof mistaken for signed, unpermitted reviewer, audit outage rollback, other-tenant file access, own-assignment access boundaries, canceled dialog persistence and double-submit/replay.

## C. Workflow-by-workflow acceptance matrix

Execute B for every relevant workflow. Also execute the specific checkpoints below.

| Workflow Type | Distinct checkpoints |
|---|---|
| Summons and Complaint | Named defendant; valid supported service method; POS-010 only when appropriate; personal/agent mismatch rejection |
| Small Claims | SC-104 where eligible; separate defendants; no automatic assumption that service of one constitutes all |
| Subpoena | Witness/recipient identity; applicable method and proof; due-date and attempted-service behavior |
| Restraining Order | Order/packet, protected-party restrictions and method-specific proof; independent review |
| Earnings Withholding | Conditional intake/document validation, wage-debt determination, employer/wage order evidence, **WG-005** employer response and advisory timing |
| Execution / Money Judgment | Valid writ and referenced dates; enforceable amount and ledger controls; no execution with unresolved stay or claim |
| Bank Levy | Institution/target, service evidence, collection receipt, claim/exemption tracking, county/court authority attachment and independently approved release |
| Possession | Independent authorization and linked court evidence required before possession/property-release action |
| Personal Property Levy | Itemized property, immutable custody event chain, supporting documents and independent authorization |
| Real Property Levy | Property legal description and evidence, notice requirements, tracked deadlines, no premature disposition |
| Sheriff Sale | Scheduled sale, notice evidence, separate approval, documented outcome, receipt/proceeds reconciliation and court return |

**Scope note:** Presence of a workflow label does not prove every statutory scenario is automated. Resolve legal method/form acceptance against current California rules and county/court practice before signing off on a particular live workflow.

## D. Finance, property and sale adversarial sequences

1. Enter a lawful fictional collection receipt; check integer-cent arithmetic, posting history, reconciliation and duplicate reference rejection.
2. Attempt release **without** county/court evidence, with wrong-case evidence and using the same requestor as approver. Each should be rejected.
3. Attach authoritative evidence; request release; approve with a different authorized user. Verify audit trail includes attached evidence ID, actor and decision. Confirm an unresolved stay, claim or tracked deadline still blocks disbursement.
4. Attempt payment exceeding available released funds; reject without modifying the ledger. Record permitted payout and verify balances.
5. Inventory two items; transfer custody twice; confirm immutable chronological custody history and relevant linked files. Reject unsupported property release.
6. Sheriff sale: try outcome before scheduling, before notice proof and before independent approval; verify failures. Complete prerequisites, record result/proceeds and reconcile; verify return is not allowed early.
7. WG-005: record employer receipt/response; verify evidence association, advisory due-date display and that a late or missing response is visible without fabricating compliance.

## E. Security, concurrency and resilience

- **Tenant isolation:** user in agency B cannot list, search, fetch, download or mutate agency A's cases or attachments, even with guessed case/recipient IDs.
- **Abilities:** test clerk, officer, supervisor and finance authorizer separately; remove privileges and confirm actions immediately deny.
- **Two browsers:** users edit same case with identical starting version; first write wins, second receives a conflict and does not silently overwrite; attachments remain consistent.
- **Audit atomicity:** controlled test fixture injects audit failure and asserts business mutation rolls back. Do **not** inject destructive failures into live RDS.
- **Navigation and refresh:** leave unsaved intake/attempt/return open, trigger background refresh and switch tabs; no unannounced data loss.
- **Exports/reporting:** compare case count, financial totals, date filters, permissions, pagination and CSV across >1,000 fixture cases where practical.
- **Rollback:** confirm published prior build/rollback method and schema compatibility; confirm other SonoMarzi modules still navigate and read normally.

## F. Forms acceptance

Test both offered form and unsupported form routes. For each generated document, verify authoritative source/version, expected case/recipient values, editable fields, blank signature/certification before human signing, no cross-recipient contamination, byte/hash linkage, unsigned status and archival category. Physically open the PDF in a real viewer as well as in browser preview. Confirm the form catalog distinguishes: (1) link/reference, (2) editable official unsigned draft, (3) uploaded signed final proof. Never treat (1) or (2) as (3).

## G. Release criteria

Use the nine saved county/rule-version scoped release checks in `civil-california-readiness.mjs`: legal rules, forms, fees, permissions, uploads, independent review, concurrency, refresh and rollback. Each needs a dated evidentiary reference, named reviewer and disposition. Explicitly approve supported workflows one by one; do not fill all automatically. **Operational activation remains hard-disabled in code** and should not be described as enabled by passing a checklist.

## H. Evidence recording template

| Field | Entry |
|---|---|
| Run / deployment SHA / API SHA | |
| Tenant / county / profile | |
| Case / recipient / workflow | |
| Tester and reviewer (distinct) | |
| Test ID and expected result | |
| Actual result and timestamp | |
| Screenshot, attachment hash, audit or CI reference | |
| Defect, severity, reproduction and retest | |
| PASS / FAIL / BLOCKED | |

## I. Go/no-go

**Demo-ready** requires successful fictional complete walkthroughs, clean forms, visible correct case labels and no critical unauthorized transitions or lost changes.  
**Production-ready** additionally requires live S3 and two-user tests, real concurrent edit tests, local sheriff/county and court signoff for the enabled workflows, accounting procedure signoff, rollback drill, privacy/security review and evidence in the version/county-specific release checklist. Unverified steps stay **BLOCKED**, never assumed passed.

References in repository: `docs/civil/QA_2026-10-17.md`; `lambdas/api/lib/civil-california-readiness.mjs`; `lambdas/api/lib/civil-california-domain.mjs`; `lambdas/api/lib/civil-california-returns.mjs`; `scripts/verify-source.sh`.
