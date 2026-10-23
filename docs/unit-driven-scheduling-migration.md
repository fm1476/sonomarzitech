# Unit-driven Scheduling migration contract

Status: design and migration gate only. No runtime behavior changes in this commit.

## Product decision
Organizational units are the single administrator-facing membership authority for Scheduling. Assigning a person to Patrol makes that person eligible for Patrol Scheduling automatically; Dispatch likewise. A person assigned to multiple units is eligible in each. Calendar-view and calendar-management grants remain separate from personnel membership. Agency administrators must not be asked to maintain a duplicate Patrol Work Group solely to establish roster membership.

## Compatibility requirements
Existing `pm.scheduleWorkGroups` records and IDs are in active use by scheduling authorization, shifts, assignments, leave and exceptions, shift bidding, overtime, extra duty, roll calls, and special events. These references MUST continue working until explicit audited migration, rather than deleting Work Groups or renaming IDs opportunistically. Work Groups become an internal calendar compatibility concept where still required, not a separate administrative membership catalog.

Canonical person assignments must be resolved by tenant and agency, limited to active/effective memberships and active organization nodes. No string matching alone for production authorization and no fallback from an unresolved canonical person to agency-wide access.

## Staged implementation
1. Add tenant-aware projection of effective scheduling unit membership from canonical person-to-organization assignments. Handle multiple unit assignments and effective dates; enforce tenant isolation.
2. Associate existing scheduling calendars/groups with exactly one parent canonical unit through an explicit mapping; do not infer when ambiguous. Preserve IDs, existing calendar policies and all shift/coverage/bid/assignment references.
3. Derive eligibility, roster membership, and default unit-scoped calendar *viewing* from the canonical unit; preserve individual explicit viewer/manager grants and no privilege escalation. Work Group selection must not confer new management rights.
4. Update Scheduling UI to present organizational units as the primary grouping; calendars, teams and patterns remain configurable within units. Hide redundant user-maintained Work Group membership. In User Administration, do not require redundant Unit + Work Group checkboxes for ordinary scope; preserve existing grants during transition and display effective permissions.
5. Perform pre-migration dry-run audit on Demo. Compare eligible personnel counts per unit and work group; report orphaned or ambiguous groups, missing canonical assignments, references across other scheduling collections, user overrides, and calendars with explicit viewers/managers. Stop on ambiguity.
6. Run a reversible data migration, tenant by tenant, only after backups and dry-run. No automatic activation for Lyle or other agency.
7. Add automated tests: single-unit, multi-unit, inactive/historical assignments, rename, missing parent, cross-tenant isolation, calendar view-only vs manage, explicit exceptions, shifts/bids/overtime/leave/special events, rollback, and legacy data.
8. Preserve the successful PR #163 enforcement behavior. Test against the deployed Demo contract before any production migration.

## Deployment gates
- Github unit/integration CI passes.
- Automated snapshot tests prove pre/post scheduling visibility and write-denials are equivalent except intended unit-based personnel eligibility.
- Demo dry-run has zero unresolved mismatches; migration and rollback scripts are idempotent.
- Existing Demo organizational enforcement remains enabled, no changes to Lyle.
- Rollout requires explicit deployment action after merge. Neither a GitHub merge nor frontend deploy alone can validate live database data.

## AWS decision
GitHub is sufficient for application code, isolated fixtures, CI, and PR review. AWS/VPC database access is required if canonical associations or stored scheduling records need to be created/migrated or verified against live Demo data. AWS access can be postponed until the code and dry-run scripts pass CI. No external manual user testing is required as a substitute for automated testing, but production behavior should not be claimed verified without a deploy and real smoke evidence.
