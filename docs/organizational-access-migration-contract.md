# Organizational access: database findings and safe migration contract

Status: design and integration checklist for PR #163. **Not deployed.** This document records a read-only inspection of the current RDS schema and counts supplied from CloudShell on 2026-10-22; these counts are snapshots, not invariants.

## Verified data model

- `suite_memberships (tenant_id, agency_id, user_id, person_id, role_ids, status)` links an **optional application login** to a person in an agency.
- `suite_records (tenant_id, agency_id, key, value, ...)` stores much of Personnel in JSONB.
- `pm.records`: 16 person objects with `personId`; 16 contain `unitId` (some blank).
- `personnel`: 19 shared-person objects with `id`; 19 contain `unit` (some blank).
- Across these records, 16 identifiers match between the two collections. Per-agency join: demo 16 shared, 13 matched PM, 10 active memberships, 3 shared-only, 6 without active membership; lyle 3 shared, 3 matched PM, 3 active memberships.
- Unit strings include Administration, Dispatch, Patrol, Professional Standards, SWAT, Traffic Unit, and blank. These are labels, not guaranteed canonical organization IDs. Blank legacy fields are common in old demo data.
- `suite_ft_enrollments`, `suite_ft_reports`, `suite_ft_shifts`, `suite_ft_attachments`, and other Field Training relational tables exist. The present `field-training.mjs` API also persists a `fieldTraining/$state` aggregate in `suite_records`. Determine authoritative runtime path for each endpoint before implementing a migration.
- A dedicated organizational assignment table was not identified in the inspected schema. Existing `suite_organizational_access` is created lazily by the API if invoked, so absence in inspection is not proof of a defect.

## Required model

1. **Person**: immutable identity scoped to tenant and agency. A person need not have a login; do not auto-provision logins for personnel records.
2. **Organization nodes**: stable agency-local IDs, name, type (division/unit/work group), parent relationship where applicable, active state. Never authorize by display name.
3. **Person assignments**: person ID + organization ID + assignment type + primary flag + active/effective dates + change audit. Multiple concurrently active assignments are valid, including secondary assignments.
4. **User grants**: tenant + agency + user + action capabilities (role-based) + selected organization IDs. Selected grants may cover multiple divisions, units, and work groups. Administrator bypass requires trusted server-computed admin status, not a JSON scope mode.
5. **Calendar grants**: retain existing Scheduling-specific authorization and visibility. Do not rewrite Scheduling's calendar rules.

## Migration and security constraints

- Backfill only assignments with an unambiguous tenant/agency/person mapping and an organizational node validated within the same agency.
- Legacy `unitId`/`unit` may contain display names; resolve against authoritative agency catalog. Record ambiguous/blank/inconsistent mappings for administrator review; **do not infer additional memberships**.
- Do not delete the demo personnel, erase history, or overwrite unrelated fields. Reconcile existing shared vs PM records per agency, never across tenants.
- For an account with configured restricted scope, fail closed if the person has no verified in-scope assignment. Never treat blank unit as all units.
- A user's own personnel identity and active membership must be bound to the same tenant/agency when evaluating 'self'. Deactivated memberships must not retain active access.
- Check organizational and role permissions at the server for every list, item, aggregate, mutation, search, export, report, attachment upload/download, and presigned URL. Filter before emitting metadata or signed URLs.
- Verify Field Training assignment against the **trainee's person ID**, not only a mutable user ID. Managers may view authorized trainee records even when the personnel subject has no application login, where workflows support it.
- Transactional changes must verify old and new assignment ownership (no moving a hidden employee into an authorized unit to gain access).
- Legacy unconfigured users currently retain existing behavior in PR #163. Before wider release, design an explicit rollout flag, audit and remediation of unconfigured accounts; do not mistake an absent scope as a restrictive grant.
- Store an agency-scoped assignment migration state and support rollback without loss of legacy source data.

## Minimum acceptance matrix

| Scenario | Expected outcome |
| --- | --- |
| Dispatch manager + Dispatch division, all Dispatch units | See/manage authorized Dispatch records only, subject to roles |
| Dispatch manager searches Patrol | No Patrol person, counts, exports, attachments, or metadata |
| Employee simultaneously assigned Dispatch and authorized second unit | Visible to a manager of either assigned area |
| Employee's primary unit is Patrol, secondary assignment Dispatch | Dispatch access only when explicit second assignment is verified |
| Employee has blank legacy unit | Not visible to selected-unit manager until reconciled |
| Shared-person record has conflicting PM unit | Deny until reconciled, no favorable last-write-wins |
| Employee without app login | Still manageable as an employee within authorized organization |
| Inactive/deleted assignment | Cannot confer access |
| Stale Field Training enrollment membership mapping | Deny read and attachment URL |
| Cross-agency same `personId`/display unit | No cross-agency access |
| Nonadmin requests `mode: agency` | Deny; role/admin authority determined on server |
| Scheduling calendar permission | Behavior unchanged |
| Existing incomplete demo profiles | Preserved for admin review, not silently deleted |

## Release gate

Do not merge PR #163 based only on structural/source tests. Require migrations and rollback plan, schema/index review, negative integration tests with actual tenant-scoped fixtures, API route inventory, authenticated demo account penetration tests (Dispatch Manager, Dispatcher, Patrol, System Admin), CI success, and explicit deployment approval.
