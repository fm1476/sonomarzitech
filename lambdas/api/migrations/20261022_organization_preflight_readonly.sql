-- SonoMarzi organization migration preflight (READ ONLY)
-- Safe on the current schema. Reports counts, not personal information.
\pset pager off
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS connected_as,
       current_setting('server_version') AS postgres_version;
SELECT a.subdomain AS agency,
       COUNT(DISTINCT m.user_id) FILTER (WHERE m.status='active') AS active_login_memberships
FROM suite_agencies a
LEFT JOIN suite_memberships m
  ON m.tenant_id=a.tenant_id AND m.agency_id=a.id
GROUP BY a.tenant_id,a.id,a.subdomain
ORDER BY a.subdomain;
WITH expanded AS (
 SELECT r.tenant_id,r.agency_id,
        CASE WHEN r.key LIKE '%"pm","records"%' THEN 'pm.records'
             ELSE 'personnel' END AS collection,
        item AS record
 FROM suite_records r
 CROSS JOIN LATERAL jsonb_array_elements(
   CASE WHEN jsonb_typeof(r.value)='array' THEN r.value
        ELSE jsonb_build_array(r.value) END
 ) AS item
 WHERE r.deleted=false
   AND (r.key LIKE '%"pm","records"%' OR r.key LIKE '%"personnel"%')
   AND jsonb_typeof(item)='object'
)
SELECT a.subdomain AS agency,e.collection,
       COUNT(*) AS records,
       COUNT(*) FILTER (WHERE COALESCE(
         NULLIF(btrim(e.record->>'unitId'),''),
         NULLIF(btrim(e.record->>'unit'),'')
       ) IS NULL) AS missing_unit,
       COUNT(DISTINCT COALESCE(
         NULLIF(btrim(e.record->>'unitId'),''),
         NULLIF(btrim(e.record->>'unit'),'')
       )) AS distinct_populated_units
FROM expanded e JOIN suite_agencies a
  ON a.tenant_id=e.tenant_id AND a.id=e.agency_id
GROUP BY a.subdomain,e.collection
ORDER BY a.subdomain,e.collection;
SELECT 'suite_organization_nodes' AS table_name,
       to_regclass('public.suite_organization_nodes') IS NOT NULL AS installed
UNION ALL SELECT 'suite_person_organization_assignments',
       to_regclass('public.suite_person_organization_assignments') IS NOT NULL
UNION ALL SELECT 'suite_organization_rollout',
       to_regclass('public.suite_organization_rollout') IS NOT NULL
UNION ALL SELECT 'suite_organizational_access',
       to_regclass('public.suite_organizational_access') IS NOT NULL;
ROLLBACK;
