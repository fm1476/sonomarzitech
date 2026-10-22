# PR 163 controlled authorization test deployment

Status: deployment preparation. The user removed the requirement to protect Lyle from shared deployment impact. No merge, rollout activation, or AWS deployment performed in this review. CI run 711 passed on e9beee3b4446b973ab79c0d99777269fd3b5af13.

## Reviewed source
Original head: 242c2e45ad5a0cb000a4e874060d4f6d8ca61f20.
Fix: bulk Personnel ancestor traversal now stops at inactive parents, matching single-person and attachment resolution.
Regression: bulk and individual hierarchy SQL must remain identical.
Local scripts/verify-source.sh passed before and after the correction.

## Deployment boundary
The existing deploy-aws.yml updates sonomarzi-api-dev, sonomarzi-identity-admin-dev, a shared frontend S3 bucket, and CloudFront distribution EA4Z48KSEJBUU. It does not isolate Demo. The documented OIDC trust accepts main only. Do not dispatch this workflow from the PR, widen that trust, or merge to obtain deployment access.

A shared AWS test deployment is now acceptable under the user's revised scope. Demo-only infrastructure is no longer a release prerequisite. Preserve current API/frontend artifacts and function configuration for rollback, verify the exact PR commit, and package that source through the existing validation and packaging steps. Use an already authorized AWS session, such as CloudShell, for a manual branch deployment because the documented GitHub OIDC role only trusts main. Do not widen IAM trust or merge merely to obtain deployment access. Confirm deployed artifact hashes before acceptance testing. Do not run migrations or change suite_organization_rollout. Keep all agency rollout flags disabled. No AWS CLI or authenticated AWS session is available in the current execution workspace; the GitHub connector does not expose workflow dispatch.

## Authentication and fixture prerequisites
Use real separate existing Dispatch Manager and Patrol accounts, not an administrator's role preview. Verify tenant, agency, active membership, person mapping, roles, organizational scope and legacy/canonical identifier mode for each. No admin bypass may apply to restricted test identities. Confirm test subjects and documents are fictional.
Canonical UUID grants cannot prove legacy-unit isolation while canonical rollout is disabled. Exercise existing legacy configured scopes separately; canonical-cutover tests remain blocked pending explicit activation approval or an isolated non-live fixture environment.

## Acceptance matrix
| Surface | Positive | Negative | Current evidence |
| --- | --- | --- | --- |
| Personnel | Assigned Dispatch/Patrol subjects | Opposite unit, blank/missing mapping, foreign agency, identity rebinding | Local verification passes; live restricted account test pending |
| Field Training | Authorized trainee, reports, shifts | Hidden trainee/trainer, reassigned membership, aggregate counts | Local verification passes; admin page loads, restricted test pending |
| Scheduling | Existing calendar visibility and management grants | Hidden calendars and unauthorized mutation | Local verification passes; live test pending |
| Attachments | Authorized parent download/upload | Hidden parent, stale trainee, direct signed URL request | Local verification passes; live test pending |
| Global search | Authorized subject | Hidden names, counts and metadata | Restricted live test pending |
| Exports | Authorized rows only | Hidden subjects, totals and identifiers | Restricted live test pending |

Record allowed/denied HTTP outcomes and response bodies through a supported authenticated test facility; UI absence alone is insufficient. Recheck after fixes. Never record authentication secrets. Current Cloud Browser session verified Demo PD and System Admin plus Platform Admin roles, so it is only an administrator baseline, not isolation evidence.

## Live SES failure and connected regression

Operator's IAM-controlled invocation of /workspace for the stored SES Cognito subject returned HTTP 200 with role_1792682993431, empty Personnel template arrays, but all shared and HR personnel rows including Patrol and ordering IDs. The stored membership was active, non-platform-admin, with selected canonical Dispatch UUID grants and rollout disabled. This proves remaining server-side disclosure after the template fix.

Root cause: resolveWorkspaceMembership omitted authenticated auth.userId. Personnel scope lookup received an undefined user ID, missed the configured grant and used pre-rollout legacy behavior. The fix preserves the authenticated actor ID and fails closed if absent. Explicit selected UUID grants now use canonical assignment evaluation for that actor while unconfigured account defaults continue to depend solely on agency rollout. No rollout record is modified.

scripts/verify-workspace-identity-scope.mjs executes the actual membership resolver, scope loader, canonical evaluator and Personnel filter together, checking Dispatch allow, Patrol/unassigned deny, ordering suppression, missing-actor denial and separation of explicit UUID scopes from agency rollout. A rerun of the live SES response and browser/search/export/attachment/Field Training/Patrol tests remains required after deploying this fix. No release signoff.
