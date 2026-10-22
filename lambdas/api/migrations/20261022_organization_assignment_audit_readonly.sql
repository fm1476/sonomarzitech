-- PR #163 canonical assignment and grant audit.
-- READ ONLY. Requires the organizational tables already installed.
-- Output is aggregate counts per agency; no names, emails, or Cognito IDs.
BEGIN READ ONLY;

WITH agency AS (
 SELECT a.tenant_id,a.id AS agency_id,a.subdomain,
        COALESCE(r.enabled,false) AS enabled
 FROM suite_agencies a
 LEFT JOIN suite_organization_rollout r ON r.tenant_id=a.tenant_id AND r.agency_id=a.id
), active_members AS (
 SELECT m.tenant_id,m.agency_id,m.user_id,m.person_id
 FROM suite_memberships m WHERE m.status='active'
), usable_assignments AS (
 SELECT DISTINCT p.tenant_id,p.agency_id,p.person_id
 FROM suite_person_organization_assignments p
 JOIN suite_organization_nodes n ON n.tenant_id=p.tenant_id AND n.agency_id=p.agency_id AND n.id=p.organization_id
 WHERE p.active=true AND n.active=true
   AND (p.effective_from IS NULL OR p.effective_from<=CURRENT_DATE)
   AND (p.effective_to IS NULL OR p.effective_to>=CURRENT_DATE)
), grant_values AS (
 SELECT g.tenant_id,g.agency_id,g.user_id,g.scope,
        jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(g.scope->'unitIds')='array' THEN g.scope->'unitIds' ELSE '[]'::jsonb END
        ) AS value,'unit'::text AS kind
 FROM suite_organizational_access g
 UNION ALL
 SELECT g.tenant_id,g.agency_id,g.user_id,g.scope,
        jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(g.scope->'divisionIds')='array' THEN g.scope->'divisionIds' ELSE '[]'::jsonb END
        ),'division'::text
 FROM suite_organizational_access g
 UNION ALL
 SELECT g.tenant_id,g.agency_id,g.user_id,g.scope,
        jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(g.scope->'workGroupIds')='array' THEN g.scope->'workGroupIds' ELSE '[]'::jsonb END
        ),'work_group'::text
 FROM suite_organizational_access g
), unrecognized_grants AS (
 SELECT DISTINCT v.tenant_id,v.agency_id,v.user_id,v.kind,v.value
 FROM grant_values v
 WHERE NOT EXISTS (
  SELECT 1 FROM suite_organization_nodes n
  WHERE n.tenant_id=v.tenant_id AND n.agency_id=v.agency_id
    AND n.kind=v.kind AND n.id::text=v.value AND n.active=true
 )
)
SELECT a.subdomain AS agency,a.enabled AS canonical_enforcement_enabled,
 COUNT(DISTINCT m.user_id) AS active_users,
 COUNT(DISTINCT m.user_id) FILTER (WHERE NULLIF(btrim(m.person_id),'') IS NULL) AS missing_person_link,
 COUNT(DISTINCT m.user_id) FILTER (
   WHERE NULLIF(btrim(m.person_id),'') IS NOT NULL AND x.person_id IS NULL
 ) AS missing_valid_canonical_assignment,
 COUNT(DISTINCT g.user_id) FILTER (WHERE g.scope IS NULL) AS null_scope_rows,
 COUNT(DISTINCT u.user_id) AS accounts_with_unrecognized_scope_ids,
 COUNT(DISTINCT (u.kind,u.value)) AS distinct_unrecognized_scope_ids
FROM agency a
LEFT JOIN active_members m ON m.tenant_id=a.tenant_id AND m.agency_id=a.agency_id
LEFT JOIN usable_assignments x ON x.tenant_id=m.tenant_id AND x.agency_id=m.agency_id AND x.person_id=m.person_id
LEFT JOIN suite_organizational_access g ON g.tenant_id=m.tenant_id AND g.agency_id=m.agency_id AND g.user_id=m.user_id
LEFT JOIN unrecognized_grants u ON u.tenant_id=m.tenant_id AND u.agency_id=m.agency_id AND u.user_id=m.user_id
GROUP BY a.tenant_id,a.agency_id,a.subdomain,a.enabled
ORDER BY a.subdomain;
ROLLBACK;
