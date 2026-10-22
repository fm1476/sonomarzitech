/**
 * Agency organizational access policy. All scopes are tenant-local identifiers.
 * Capabilities (roles) are independent from organizational reach.
 *
 * This pure policy module does not itself grant access: callers must enforce
 * role permissions AND the resulting scope on every read/write/export.
 */
const asIds = values => [...new Set((Array.isArray(values) ? values : [])
  .filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];

export function normalizeOrganizationalScope(raw = {}) {
  if (!raw || typeof raw !== 'object') return { mode: 'none', unitIds: [], divisionIds: [], workGroupIds: [] };
  const mode = ['none', 'self', 'selected', 'agency'].includes(raw.mode) ? raw.mode : 'none';
  return { mode, unitIds: asIds(raw.unitIds), divisionIds: asIds(raw.divisionIds), workGroupIds: asIds(raw.workGroupIds) };
}

export function effectiveOrganizationalScope({ grants = [], administrator = false } = {}) {
  if (administrator) return normalizeOrganizationalScope({mode:'agency'});
  const normalized = grants.map(normalizeOrganizationalScope);
  if (normalized.some(g => g.mode === 'agency')) return normalizeOrganizationalScope({mode:'agency'});
  return {
    mode: normalized.some(g => g.mode === 'selected') ? 'selected' : normalized.some(g => g.mode === 'self') ? 'self' : 'none',
    unitIds: asIds(normalized.flatMap(g => g.mode === 'selected' ? g.unitIds : [])),
    divisionIds: asIds(normalized.flatMap(g => g.mode === 'selected' ? g.divisionIds : [])),
    workGroupIds: asIds(normalized.flatMap(g => g.mode === 'selected' ? g.workGroupIds : []))
  };
}

export function canAccessOrganizationalRecord(scopeInput, record, { actorPersonId, unitDivisionMap = {}, unitDescendants = {} } = {}) {
  const scope = normalizeOrganizationalScope(scopeInput);
  if (scope.mode === 'agency') return true;
  if (!record || typeof record !== 'object') return false;
  if (scope.mode === 'self') return Boolean(actorPersonId && record.personId === actorPersonId);
  if (scope.mode !== 'selected') return false;
  const unitId = record.unitId || '';
  const divisionId = record.divisionId || unitDivisionMap[unitId] || '';
  const groupId = record.workGroupId || '';
  const eligibleUnits = new Set([...scope.unitIds, ...scope.unitIds.flatMap(id => unitDescendants[id] || [])]);
  return Boolean((unitId && eligibleUnits.has(unitId)) ||
    (divisionId && scope.divisionIds.includes(divisionId)) ||
    (groupId && scope.workGroupIds.includes(groupId)));
}

/** Evaluate explicit, independently validated assignments without treating conflicting
 * legacy single-unit fields as proof of additional membership. */
export function canAccessAssignedOrganizationalRecord(scope, personId, assignments, options = {}) {
  if (!personId || !Array.isArray(assignments) || !assignments.length) return false;
  const requestedPersonId=String(personId);
  return assignments.some(a => a && typeof a === 'object' &&
    String(a.personId || '') === requestedPersonId &&
    (a.active === undefined || a.active === true) &&
    canAccessOrganizationalRecord(scope, a, options));
}

export function effectiveAccessSummary({ scope, capabilities = [] } = {}) {
  const s = normalizeOrganizationalScope(scope);
  return { scope: s, capabilities: asIds(capabilities), explanation: s.mode === 'agency'
    ? 'Agency-wide, subject to module permissions'
    : s.mode === 'self' ? 'Own records only, subject to module permissions'
    : s.mode === 'selected'
      ? `Selected: ${s.divisionIds.length} divisions, ${s.unitIds.length} units, ${s.workGroupIds.length} work groups; subject to module permissions`
      : 'No organizational record access' };
}
