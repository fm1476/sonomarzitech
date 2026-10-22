# Organizational Access Control — implementation contract

## Goal
Any tenant-defined role can be assigned to people authorized for one or more divisions, units, and Scheduling Work Groups. A role answers *what actions*; organizational grants answer *on whose data*. Neither alone is sufficient for access.

## Non-negotiable rules
- Tenant and agency boundaries always apply before role and organizational scope checks.
- An agency System Admin or authorized Platform Admin has agency-wide scope within the active agency.
- Users without organizational grants receive no cross-person organizational data access; self-service is separately granted.
- Grants may include multiple units and divisions. Grant a parent division's descendants only through verified tenant hierarchy identifiers.
- Permissions for sensitive records, exports, attachments, search, and all write operations are evaluated independently.
- Scheduling's existing per-calendar viewers/managers remain intact. A derived division-level access rule must not remove explicit calendar access or expose unrelated calendars.
- Field Training reports must be linked to stable people/enrollments, not matched against display names. Prevent cross-scope report creation, editing, and file access.
- Server responses must be scoped **before** records reach the browser. Hiding UI rows is not authorization.
- Administrator provisioning must use server-controlled writes, tenant-bound IDs, audit trails, effective-access previews, and validation against deleted/inactive units.

## Proposed storage
Use tenant-and-agency-bound member grants (per member, not globally by role name), with optional tenant-defined role defaults and explicit user-specific grants. Define read vs manage scope explicitly, with union within a scope type and no unintended promotions. A dedicated server endpoint must validate membership and admin status and persist audited changes atomically.

## Rollout plan
1. Policy module and regression tests (this PR). No production behavior changed.
2. Tenant schema and admin-only read/update API for organizational assignments with auditing, safe migration defaults, plus role defaults and user exceptions.
3. Server authorization for Personnel list/read/write/export/attachments/search, including legacy `pm.records` and shared `personnel` collections; identity-safe joins between units and person records.
4. Server authorization for Field Training list, reports, enrollment, coverage, documents, and write actions, preserving trainee/trainer self-service.
5. Optional derivation of Scheduling manager reach from organizational units while retaining existing Work Group-level visibility/management and explicit exceptions.
6. Central User Administration editor with multi-select tree and effective-access preview, including actual server-evaluated scope and dangerous broad-access warnings.
7. Cross-unit, multi-role, self-service, mixed-unit user, non-admin, tenant-crossing, request-forgery and direct-API penetration tests before rollout.

## Important
The policy engine added in this PR is a building block, **not enforcement**. Do not present Personnel and Field Training as organizationally isolated until the server endpoint and every relevant route implement and validate its checks.
