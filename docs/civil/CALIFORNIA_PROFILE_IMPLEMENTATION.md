# California Civil Process Profile

Status: implementation specification, NOT an approved compliance profile.

## Safety boundaries
- Do not change other modules, existing tenant data, or global reference defaults.
- Keep existing Civil Process behavior unchanged unless a tenant explicitly activates a validated California profile.
- Never automatically apply this profile to existing tenants, including demo.
- Preserve the current SonoMarzi theme and component styling.
- Do not enable California workflows for live operational use until acceptance tests and statutory review are completed.

## Tenant provisioning
Store jurisdiction state, county, profile ID, immutable profile version, activation status, activated-by and activated-at in tenant-scoped configuration. New California tenant provisions as `draft`, not active. Other tenants continue with existing defaults. Require explicit administrator review and activation; only platform administrators can change state-level rules.

## Rule design
Version rules by effective date. Use a shared civil record model with configurable workflow definitions for summons, protective orders, writs of execution, earnings withholding, possession/eviction, personal property levy, real property levy, and sheriff sale. Capture form requirements, method-specific service prerequisites, court orders, notices, mailing dates, return deadlines, fee authority, exemption/claim holds, financial deposits and disbursements. Separate case due dates from writ expiration dates. Preserve rule version and decision history per case.

## California-specific validations
Validate against California Code of Civil Procedure and Government Code, including applicable Judicial Council SER, POS, EJ, and WG forms. Never assume a generic `Served` result satisfies statutory service requirements. Never derive fee authority from a hardcoded flat-rate default. Agency settings may narrow operational preferences but may not disable mandatory statutory validation.

## Migration and test gates
1. Inventory current Civil UI, persistence, permissions, document generation and audit behavior.
2. Add additive tenant profile schema and versioned rule resolver with no behavior change for legacy tenants.
3. Add California-specific rules, validations, form mappings and case workflows behind a disabled-by-default feature flag.
4. Test each California workflow with fictional data, including negative cases, fees, exemptions, refunds, court returns and approvals.
5. Run existing module regression and tenant-isolation tests.
6. Enable only for demo tenant after explicit verification and rollback rehearsal.
7. Record statutory sources, review dates and signoff in the release checklist.

## Acceptance
No deploy or production activation until automated tests pass, other modules are verified unaffected, and California workflows are reviewed for legal accuracy. This file alone does not implement or activate the profile.
