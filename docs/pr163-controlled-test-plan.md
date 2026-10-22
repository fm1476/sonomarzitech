# PR 163 authorization verification checkpoint

Date: October 22, 2026. PR remains open and unmerged. Agency-wide organizational rollout remains disabled.

## Deployed build and defects corrected

The operator deployed API commit b7526d629107b4da812a034d98edff89d4b87a23 and verified the Lambda package hash. API Gateway GET /workspace maps to sonomarzi-api-dev with index.handler.

Corrections:
- Bulk Personnel ancestry now stops at inactive organization ancestors, matching item/attachment checks.
- Nonadministrator templates no longer repopulate hidden Personnel, accounts or Field Training state.
- resolveWorkspaceMembership now preserves authenticated auth.userId. Previously the undefined user ID missed a configured scope and fell back to legacy access.
- A missing actor ID now denies Personnel scope access.
- Explicit selected UUID grants use canonical assignments for that actor. Missing-grant defaults still depend on agency rollout. No rollout row was activated.

The actual membership-to-scope-to-Personnel pipeline has a connected regression. Local source checks passed. CI #714 passed for the deployed code. CI #719 passed for the later fixture harness source.

## Live identity and configuration evidence

SES Test (fred+ses@sonomarzi.com) is active, non-platform-admin, with custom Dispatch Manager role and selected canonical Dispatch unit and Work Group grants. The operator enabled Field Training participation and management capabilities for that role.

aws test (test@test1.com) retains Officer role with selected Patrol grants. It can see scoped shared directory identities, but has no general Personnel HR-view permission. A positive HR-search assertion was corrected to honor the actual stored role permission; the correction did not grant additional access.

## Results supplied by operator

| Surface | Evidence | Result |
| --- | --- | --- |
| Dispatch shared directory and HR rows | One canonical Dispatch person returned; other-unit identities and ordering IDs absent; templates empty | Passed for fixture |
| Patrol directory and HR capability | Three scoped directory people returned; zero HR rows; no admin bypass | Passed for fixture |
| Direct handler search | Dispatch known hidden badges denied and allowed HR subject found; Patrol hidden Dispatch badge denied and HR role denial retained | Passed for fixture |
| Field Training list filtering | Only scoped members/files/reports/shifts returned | Passed for existing and controlled fixtures |
| Authorized trainee/report/attachment reads | Both actors saw their controlled fixture, not the opposite unit fixture | Passed |
| Authorized attachment delivery | Signed URL returned and exact S3 fixture bytes downloaded for both actors | Passed |
| Hidden attachment URL | Both actors received denial without signed URL for opposite-unit fixture | Passed |
| Cross-unit evaluation edit | Both actors denied edits to opposite-unit disposable report | Passed |
| Cleanup | Run-owned database fixtures and S3 objects removed; original trainee files retained; temporary files absent | Passed |
| Agency rollout | Read before/after tests | Disabled |

Read-only probe summary: failures=0, fixture gaps=4.
Controlled fixture probe closed the trainee/attachment gaps: failures=0.
Operator evidence directory: /home/cloudshell-user/sonomarzi-security-evidence/training-qa.EZtmyU.

The controlled fixture run needed a temporary additional Patrol assignment for the Patrol test identity. That assignment was removed. Positive own-trainee behavior is demonstrated under that controlled mapping; the permanent test identity's canonical mapping is not yet reconciled.

## Test boundary and remaining release gates

These deployed-handler tests used operator IAM Lambda invocation with stored Cognito subjects. They exercise the live handler, membership, role, scope, RDS and S3 paths, but do not prove API Gateway JWT authorizer behavior, Cognito login, or browser rendering. The operator reported SES browser results looked correct after the fix; this is narrower than a fully recorded browser test matrix.

Still required:
1. Reconcile permanent canonical personnel assignments before real use or agency rollout, including the Patrol test identity; do not infer from display labels.
2. Actual CSV export content verification and browser checks for Patrol, Field Training and attachments.
3. Complete Scheduling live allow/deny mutation checks while preserving existing calendar permissions. Only a Dispatch browser visibility baseline has been observed; local scheduling regressions pass.
4. API Gateway route inventory supplied by the operator has no POST /global-search although the frontend calls that endpoint. Configure and verify the route with the existing JWT authorizer and API integration; direct handler search tests do not close this deployment gap.
5. Live cross-agency and hierarchy/multi-assignment scenarios remain outside these two-unit fixture results.

No merge, agency activation, or production readiness signoff is authorized by this checkpoint.
