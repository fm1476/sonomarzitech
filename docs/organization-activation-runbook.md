# Canonical organization rollout: activation is a separate security release

This checklist applies to PR #163. CI's source-level tests are not equivalent to live permission testing.

## Deployment prerequisites

1. Review `20261022_organizational_assignments.sql` against the actual DB schema, indexes and tenancy rules. Take and verify a recoverable backup before migration.
2. Apply the DDL in a reviewed maintenance window. Creating empty tables intentionally changes **no agency** to canonical authorization: `suite_organization_rollout.enabled` defaults false.
3. Load per-agency canonical organization nodes with **stable UUIDs**. Confirm a clear ID mapping from existing unit names, division IDs, and Scheduling Work Groups. A name such as “Dispatch” is not a UUID and must never be used as an implicit match.
4. Reconcile Personnel Administration `personId`, Shared Personnel `id`, and the `suite_memberships.person_id` join *within each tenant and agency*. Some demo data intentionally has empty unit fields and no application logins. No automatic deletion or auto-creation of users.
5. Populate only verified `suite_person_organization_assignments` with agency-scoped nodes. Confirm primary/secondary assignments, date windows and effective active status; unknown legacy units stay unresolved.
6. Convert stored selected-scope organization grants to the validated UUID catalog **before activation**. The existing administration UI currently derives unit IDs from legacy PM records. Update its catalog / admin API to canonical node IDs before operational rollout.
7. Confirm all supported module operations (Personnel reads/writes, Field Training, presigned attachments), roles and cross-tenant denial using authenticated Dispatch Manager, Dispatcher, Patrol, and System Admin demo accounts. Also inventory search, export and indirect collection reads.
8. Activate an agency only once the above checks pass, by inserting or updating that agency's `suite_organization_rollout` row under a transaction, with `activated_at` and `activated_by`. Never activate globally by wildcard.
9. After cutover, rerun denied-access tests and examine audit events, then expand agency by agency. Retain legacy data for rollback and historical consistency.

## Emergency rollback

A transactional `UPDATE suite_organization_rollout SET enabled=false, updated_at=now() WHERE tenant_id=... AND agency_id=...` disables canonical resolution for **one** agency. This restores the pre-cutover legacy guarded path, so rollback authorization must itself be security-reviewed. This does **not** roll back the PR #163 code, nor does it destroy assignments.

## Release gate

The API's canonical evaluator assumes selected grants already contain stable IDs. Do not enable any agency until the administrator selection screen and `set_organizational_access` catalog validation are updated accordingly. PR #163 is not safe to merge or deploy on the strength of schema creation alone.
