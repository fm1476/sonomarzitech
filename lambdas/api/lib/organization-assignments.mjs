import { canAccessOrganizationalRecord, normalizeOrganizationalScope } from './organizational-access.mjs';

/**
 * Evaluate only canonical server-loaded organizational assignments. Legacy unit
 * labels are deliberately not accepted as evidence of organizational membership.
 * Callers must independently verify the actor's role/capability and agency.
 */
export function activePersonAssignments(rows, {tenantId, agencyId, personId, onDate = new Date().toISOString().slice(0,10)} = {}) {
  if (!tenantId || !agencyId || !personId || !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) return [];
  return (Array.isArray(rows) ? rows : []).filter(row =>
    row && String(row.tenant_id) === String(tenantId) &&
    String(row.agency_id) === String(agencyId) &&
    String(row.person_id) === String(personId) &&
    row.active === true && row.node_active === true &&
    (!row.effective_from || String(row.effective_from).slice(0,10) <= onDate) &&
    (!row.effective_to || String(row.effective_to).slice(0,10) >= onDate) &&
    typeof row.organization_id === 'string' && row.organization_id.length > 0
  );
}

export function authorizedPersonFromAssignments(scopeInput, rows, context = {}) {
  const scope = normalizeOrganizationalScope(scopeInput);
  const {tenantId, agencyId, personId, actorPersonId} = context;
  if (!tenantId || !agencyId || !personId) return false;
  if (scope.mode === 'none') return false;
  // Admin authority must be computed by an authenticated server-side role
  // decision, never by a client-supplied or stored agency scope.
  if (scope.mode === 'agency') return context.verifiedAdministrator === true;
  if (scope.mode === 'self') return Boolean(actorPersonId && String(actorPersonId) === String(personId));
  const assignments = activePersonAssignments(rows, context);
  return assignments.some(row => {
    const divisions = row.node_kind === 'division' ? [row.organization_id] :
      (Array.isArray(row.ancestor_division_ids) ? row.ancestor_division_ids : []);
    return canAccessOrganizationalRecord(scope, {
      personId: String(personId),
      unitId: row.node_kind === 'unit' ? row.organization_id : '',
      divisionId: row.node_kind === 'division' ? row.organization_id : '',
      workGroupId: row.node_kind === 'work_group' ? row.organization_id : ''
    }, {actorPersonId}) || (scope.mode === 'selected' &&
      divisions.some(id => scope.divisionIds.includes(String(id))));
  });
}

/**
 * Query model used by API integration. The caller is responsible for passing a
 * trusted authenticated tenant and agency, never request-supplied identifiers.
 */
export const PERSON_ORGANIZATION_QUERY = `
SELECT a.tenant_id, a.agency_id, a.person_id, a.organization_id,
       a.active, a.effective_from, a.effective_to,
       n.kind AS node_kind, n.active AS node_active,
       ARRAY(
         WITH RECURSIVE ancestor_chain AS (
           SELECT parent.id, parent.parent_id, parent.kind, parent.active,
                  ARRAY[n.id, parent.id]::uuid[] AS visited
           FROM suite_organization_nodes parent
           WHERE parent.tenant_id=a.tenant_id
             AND parent.agency_id=a.agency_id AND parent.id=n.parent_id AND parent.active=true
           UNION ALL
           SELECT parent.id, parent.parent_id, parent.kind, parent.active,
                  child.visited || parent.id
           FROM ancestor_chain child
           JOIN suite_organization_nodes parent
             ON parent.tenant_id=a.tenant_id AND parent.agency_id=a.agency_id
            AND parent.id=child.parent_id
           WHERE child.active=true AND parent.active=true AND NOT parent.id=ANY(child.visited)
         )
         SELECT id FROM ancestor_chain WHERE kind='division' AND active=true
       ) AS ancestor_division_ids
FROM suite_person_organization_assignments a
JOIN suite_organization_nodes n
  ON n.tenant_id=a.tenant_id
 AND n.agency_id=a.agency_id
 AND n.id=a.organization_id
WHERE a.tenant_id=$1 AND a.agency_id=$2 AND a.person_id=$3
`;

/** Tenant/agency-bound bulk query for filtering Personnel lists without N+1 DB calls. */
export const AGENCY_PERSON_ORGANIZATION_QUERY = `
SELECT a.tenant_id, a.agency_id, a.person_id, a.organization_id,
       a.active, a.effective_from, a.effective_to,
       n.kind AS node_kind, n.active AS node_active,
       ARRAY(
         WITH RECURSIVE ancestor_chain AS (
           SELECT parent.id, parent.parent_id, parent.kind, parent.active,
                  ARRAY[n.id, parent.id]::uuid[] AS visited
           FROM suite_organization_nodes parent
           WHERE parent.tenant_id=a.tenant_id
             AND parent.agency_id=a.agency_id AND parent.id=n.parent_id
           UNION ALL
           SELECT parent.id, parent.parent_id, parent.kind, parent.active,
                  child.visited || parent.id
           FROM ancestor_chain child
           JOIN suite_organization_nodes parent
             ON parent.tenant_id=a.tenant_id AND parent.agency_id=a.agency_id
            AND parent.id=child.parent_id
           WHERE NOT parent.id=ANY(child.visited)
         )
         SELECT id FROM ancestor_chain WHERE kind='division' AND active=true
       ) AS ancestor_division_ids
FROM suite_person_organization_assignments a
JOIN suite_organization_nodes n
  ON n.tenant_id=a.tenant_id
 AND n.agency_id=a.agency_id
 AND n.id=a.organization_id
WHERE a.tenant_id=$1 AND a.agency_id=$2
`;

/**
 * The presence of empty schema tables is NOT evidence that migration finished.
 * Organizational grants are only switched to canonical resolution once an
 * agency-scoped explicit activation record is set by a reviewed migration.
 * A missing activation table/row always stays on the legacy guarded path.
 */
export const CANONICAL_ORGANIZATION_ACTIVE_QUERY = `
SELECT EXISTS (
  SELECT 1 FROM suite_organization_rollout
  WHERE tenant_id=$1 AND agency_id=$2
    AND enabled=true AND activated_at IS NOT NULL
) AS enabled
`;

export async function canonicalOrganizationReady(client, tenantId, agencyId) {
  if (!tenantId || !agencyId) return false;
  const existing = await client.query(`
    SELECT to_regclass('suite_person_organization_assignments') AS assignments,
           to_regclass('suite_organization_nodes') AS nodes,
           to_regclass('suite_organization_rollout') AS rollout
  `);
  const row=existing.rows[0];
  if(!row?.assignments || !row?.nodes || !row?.rollout)return false;
  const active=await client.query(CANONICAL_ORGANIZATION_ACTIVE_QUERY,[tenantId,agencyId]);
  return active.rows[0]?.enabled === true;
}
