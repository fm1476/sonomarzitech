// Calendar membership is independent of role-wide scheduling abilities.
export function schedulingSnapshot(records) {
  const result = {};
  for (const row of records) {
    if (row.deleted) continue;
    let path, id;
    try { [path, id] = JSON.parse(row.key); } catch { continue; }
    const collection = path.join('.');
    if (id === '$order') continue;
    const values = id === '$value' && Array.isArray(row.value) ? row.value : [row.value];
    (result[collection] ||= []).push(...values.filter(v => v && typeof v === 'object'));
  }
  return result;
}
const normalize = value => String(value || '').trim().toLowerCase();
export function viewsGroup(group, person, personId) {
  if (!group) return false;
  if (group.visibility === 'agency') return true;
  if ((group.viewerIds || []).includes(personId) || (group.managerIds || []).includes(personId)) return true;
  const unit = normalize(person?.unit || person?.department);
  return group.visibility === 'unit' && !!unit && (group.unitNames || []).some(u => normalize(u) === unit);
}
export function managesGroup(group, personId) {
  return !!group && group.active !== false && (group.managerIds || []).includes(personId);
}
export function recordGroupIds(collection, value, snapshot) {
  if (!value || typeof value !== 'object') return [];
  if (collection === 'pm.scheduleWorkGroups') return [value.id];
  if (collection === 'pm.specialEvents') return value.eligibleWorkGroupIds || [];
  if (collection === 'pm.scheduleShifts') return [value.workGroupId || snapshot['pm.scheduleWorkGroups']?.[0]?.id || 'wg_patrol'];
  const shift = (snapshot['pm.scheduleShifts'] || []).find(s => s.id === value.shiftId);
  return shift ? recordGroupIds('pm.scheduleShifts', shift, snapshot) : [];
}
export const scopedScheduleCollections = new Set(['pm.scheduleShifts', 'pm.scheduleAssignments', 'pm.scheduleCoverages', 'pm.overtimeOpportunities', 'pm.specialEvents']);
export function scheduleWriteDecision(collection, change, before, snapshot, personId, hasAbility, batch = []) {
  if (collection === 'pm.scheduleWorkGroups') return {allowed:false, error:'Only an agency or platform administrator can configure calendar access.'};
  if (!scopedScheduleCollections.has(collection)) return null;
  const groups = snapshot['pm.scheduleWorkGroups'] || [];
  if (change.itemId === '$order') {
    if (change.deleted || !Array.isArray(change.value)) return {allowed:false};
    const oldIds = Array.isArray(before) ? before : [];
    const touchedIds = new Set([...oldIds.filter(id => !change.value.includes(id) && batch.some(c => c.path.join('.') === collection && c.itemId === id && c.deleted)), ...change.value.filter(id => !oldIds.includes(id))]);
    const allowed = [...touchedIds].every(id => {
      const candidate = batch.find(c => c.path.join('.') === collection && c.itemId === id);
      if (!candidate) return false;
      const prior = (snapshot[collection] || []).find(v => v.id === id);
      return scheduleWriteDecision(collection,candidate,prior,snapshot,personId,hasAbility,[]).allowed;
    });
    return {allowed:allowed && (touchedIds.size > 0 || groups.some(g => managesGroup(g,personId)))};
  }
  if (change.itemId === '$value' && Array.isArray(before) && before.length === 0 && change.deleted) {
    return {allowed:groups.some(g => managesGroup(g,personId)) && hasAbility('pm_schedule_manage')};
  }
  const manages = value => {
    const ids = recordGroupIds(collection, value, snapshot);
    // An event with no scope is agency-wide and must be managed by an administrator.
    return ids.length > 0 && ids.every(id => managesGroup(groups.find(g => g.id === id), personId));
  };
  const managerAbility = collection === 'pm.scheduleCoverages' || collection === 'pm.overtimeOpportunities'
    ? hasAbility('pm_schedule_manage') || hasAbility('pm_overtime_manage')
    : hasAbility('pm_schedule_manage');
  if (managerAbility && (!before || manages(before)) && (change.deleted || manages(change.value))) return {allowed:true};
  // Staff may append their own request without modifying the opportunity or anyone else's request.
  if (['pm.overtimeOpportunities','pm.specialEvents'].includes(collection) && before && !change.deleted && hasAbility('pm_overtime_optin')) {
    const after = change.value;
    const {requests: oldRequests = [], ...oldFields} = before;
    const {requests: newRequests = [], ...newFields} = after || {};
    const person = (snapshot.personnel || []).find(p => p.id === personId);
    const ids = recordGroupIds(collection, before, snapshot);
    const visible = ids.length ? ids.some(id => viewsGroup(groups.find(g => g.id === id), person, personId)) : collection === 'pm.specialEvents';
    const expectedStatus = collection === 'pm.specialEvents' ? 'published' : 'open';
    if (!Array.isArray(oldRequests) || !Array.isArray(newRequests)) return {allowed:false};
    const request = newRequests.at(-1);
    const allowed = visible && before.status === expectedStatus &&
      JSON.stringify(oldFields) === JSON.stringify(newFields) &&
      Array.isArray(newRequests) && newRequests.length === oldRequests.length + 1 &&
      JSON.stringify(newRequests.slice(0,-1)) === JSON.stringify(oldRequests) &&
      !oldRequests.some(r => r.personId === personId) && request?.personId === personId && request.status === 'pending' &&
      Object.keys(request).every(k => ['personId','status','requestedAt','conflict'].includes(k));
    return {allowed, error:'You may only submit your own pending request to an accessible open opportunity.'};
  }
  return {allowed:false, error:'You are not assigned to manage this work group calendar.'};
}

export function filterSchedulingRecords(records, personId, canViewSchedule) {
  const snapshot = schedulingSnapshot(records);
  const groups = snapshot['pm.scheduleWorkGroups'] || [];
  const person = (snapshot.personnel || []).find(p => p.id === personId);
  const ownShiftIds = new Set((snapshot['pm.scheduleAssignments'] || []).filter(a => a.personId === personId).map(a => a.shiftId));
  const visibleIds = new Map();
  const allowed = (collection, value) => {
    if (collection === 'pm.scheduleWorkGroups') return viewsGroup(value, person, personId);
    if (collection === 'pm.scheduleAssignments' && value.personId === personId) return true;
    if (collection === 'pm.scheduleShifts' && ownShiftIds.has(value.id)) return true;
    if (collection === 'pm.scheduleCoverages' && value.personId === personId) return true;
    if (!canViewSchedule) return false;
    const ids = recordGroupIds(collection, value, snapshot);
    return ids.length ? ids.some(id => viewsGroup(groups.find(g => g.id === id), person, personId)) : collection === 'pm.specialEvents';
  };
  const scoped = collection => scopedScheduleCollections.has(collection) || collection === 'pm.scheduleWorkGroups';
  const filtered = [];
  const orders = [];
  for (const row of records) {
    let path, id;
    try { [path, id] = JSON.parse(row.key); } catch { continue; }
    const collection = path.join('.');
    if (!scoped(collection)) { filtered.push(row); continue; }
    if (id === '$order') { orders.push({row, collection}); continue; }
    if (row.deleted) continue;
    if (id === '$value' && Array.isArray(row.value)) {
      filtered.push({...row, value:row.value.filter(value => allowed(collection,value))});
    } else if (row.value && allowed(collection,row.value)) {
      filtered.push(row);
      if (!visibleIds.has(collection)) visibleIds.set(collection,new Set());
      visibleIds.get(collection).add(id);
    }
  }
  for (const {row,collection} of orders) filtered.push({...row,value:(row.value || []).filter(id => visibleIds.get(collection)?.has(id))});
  return filtered;
}
