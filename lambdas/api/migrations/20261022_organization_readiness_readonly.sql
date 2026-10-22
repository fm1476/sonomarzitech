-- Read-only readiness report before enabling canonical organizational authorization.
-- Intended for an authenticated psql session. Does not expose employee details.
BEGIN READ ONLY;
SELECT 'organization_nodes' AS object_name, to_regclass('public.suite_organization_nodes') IS NOT NULL AS installed
UNION ALL SELECT 'person_assignments',to_regclass('public.suite_person_organization_assignments') IS NOT NULL
UNION ALL SELECT 'access_grants',to_regclass('public.suite_organizational_access') IS NOT NULL;
-- After applying the migration, run the separately parameterized agency
-- coverage checks in the rollout guide. Do not automatically backfill blanks.
ROLLBACK;
