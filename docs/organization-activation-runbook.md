# Canonical organization rollout: activation is a separate security release

This checklist applies to PR #163. CI's source-level tests are not equivalent to live permission testing.

## Deployment prerequisites

1. Review `20261022_organizational_assignments.sql` against the actual DB schema, indexes and tenancy rules. Take and verify a recoverable backup before migration.
2. Apply the DDL in a reviewed maintenance window. Creating empty tables intentionally changes **no agency** to canonical authorization: `suite_organization_rollout.enabled` defaults false.
3. Load per-agency canonical organization nodes with **stable UUIDs**. Confirm a clear ID mapping from existing unit names, division IDs, and Scheduling Work Groups. A name such as “Dispatch” is not a UUID and must never be used as an implicit match.
4. Reconcile Personnel Administration `personId`, Shared Personnel `id`, and the `suite_memberships.person_id` join *within each tenant and agency*. Some demo data intentionally has empty unit fields and no application logins. No automatic deletion or auto-creation of users.
5. Populate only verified `suite_person_organization_assignments` with agency-scoped nodes. Confirm primary/secondary assignments, date windows and effective active status; unknown legacy units stay unresolved.
6. Convert stored selected-scope organization grants to the validated UUID catalog **before activation**. The administrator UI and API now expose canonical organization UUIDs when an agency-local node catalog exists, independently of `suite_organization_rollout.enabled`. Existing selected legacy label grants are NOT automatically converted, and the UI blocks saving grants containing unmatched IDs. Explicitly reconcile each grant before activation.
7. Confirm all supported module operations (Personnel reads/writes, Field Training, presigned attachments), roles and cross-tenant denial using authenticated Dispatch Manager, Dispatcher, Patrol, and System Admin demo accounts. Also inventory search, export and indirect collection reads.
8. Activate an agency only once the above checks pass, by inserting or updating that agency's `suite_organization_rollout` row under a transaction, with `activated_at` and `activated_by`. Never activate globally by wildcard.
9. After cutover, rerun denied-access tests and examine audit events, then expand agency by agency. Retain legacy data for rollback and historical consistency.

## Emergency rollback

A transactional `UPDATE suite_organization_rollout SET enabled=false, updated_at=now() WHERE tenant_id=... AND agency_id=...` disables canonical resolution for **one** agency. This restores the pre-cutover legacy guarded path, so rollback authorization must itself be security-reviewed. This does **not** roll back the PR #163 code, nor does it destroy assignments.

## Release gate

The API's canonical evaluator assumes selected grants already contain stable UUIDs. The pre-activation canonical catalog editor is implemented in this PR, but this alone is NOT a completed cutover: existing legacy grants must be reconciled, role/ability enforcement audited across all module routes, and authenticated denied-access tests completed. Do not merge/deploy merely because schema and source CI are green.

## Demo migration checkpoint — October 22, 2026

From operator-verified psql output: 8 canonical organization nodes (6 units: Administration, Dispatch, Patrol, Professional Standards, SWAT, Traffic Unit; 2 Work Groups: Dispatch, Patrol). There are 10 active canonical personnel assignments in Demo; one additional Patrol user was populated from an unambiguous Shared Personnel record. The remaining 6 of 12 active Demo membership identities have no canonical assignment (3 PM without unit, 1 Shared Personnel without unit, 2 with no personnel record). These six are deliberately unresolved. There were zero activated agencies after insertion; no assignments were made in Lyle. Legacy Scheduling Work Group IDs remain `wg1791328561870w1dj` (Dispatch) and `wg_patrol` (Patrol); the new UUID nodes do not silently replace these IDs.

Before activation, audit stored `suite_organizational_access.scope` for all active members of Demo, using agency-bound joins. Do not assume old string values such as `Dispatch` or `wg_patrol` match canonical node UUIDs. Assign a scope to each restricted test account via the revised editor and explicitly verify both allow and deny behavior in authenticated Personnel, Field Training, attachments, global search, exports, and Scheduling UI/API. Preserve the verified RDS snapshot `sonomarzi-pre-org-access-20261022` for recovery.
