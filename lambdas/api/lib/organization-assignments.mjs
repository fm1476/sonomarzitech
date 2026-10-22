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
  return assignments.some(row => canAccessOrganizationalRecord(scope, {
    personId: String(personId),
    unitId: row.node_kind === 'unit' ? row.organization_id : '',
    divisionId: row.node_kind === 'division' ? row.organization_id : '',
    workGroupId: row.node_kind === 'work_group' ? row.organization_id : ''
  }, {actorPersonId}));
}

/**
 * Query model used by API integration. The caller is responsible for passing a
 * trusted authenticated tenant and agency, never request-supplied identifiers.
 */
export const PERSON_ORGANIZATION_QUERY = `
SELECT a.tenant_id, a.agency_id, a.person_id, a.organization_id,
       a.active, a.effective_from, a.effective_to,
       n.kind AS node_kind, n.active AS node_active
FROM suite_person_organization_assignments a
JOIN suite_organization_nodes n
  ON n.tenant_id=a.tenant_id
 AND n.agency_id=a.agency_id
 AND n.id=a.organization_id
WHERE a.tenant_id=$1 AND a.agency_id=$2 AND a.person_id=$3
`;
