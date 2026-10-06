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
export function personGroupIds(personId, value, snapshot) {
  const start=value.startDate || value.date || '0000-00-00';
  const end=value.endDate || value.date || '9999-99-99';
  const assignments=(snapshot['pm.scheduleAssignments'] || []).filter(a=>a.personId===personId && (!a.startDate || a.startDate<=end) && (!a.endDate || a.endDate>=start));
  const ids=assignments.flatMap(a=>recordGroupIds('pm.scheduleAssignments',a,snapshot));
  if(ids.length)return [...new Set(ids)];
  const person=(snapshot.personnel || []).find(p=>p.id===personId);
  const unit=normalize(person?.unit || person?.department);
  return (snapshot['pm.scheduleWorkGroups'] || []).filter(g=>unit && (g.unitNames || []).some(u=>normalize(u)===unit)).map(g=>g.id);
}
const sameExcept = (before, after, fields) => Object.keys({...before,...after}).every(key=>fields.includes(key)||JSON.stringify(before?.[key])===JSON.stringify(after?.[key]));
const validDates = value => {
  const start=value?.startDate || value?.date, end=value?.endDate || value?.date;
  const valid = date => typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
  return valid(start) && valid(end) && start<=end;
};
export function recordGroupIds(collection, value, snapshot) {
  if (!value || typeof value !== 'object') return [];
  if (collection === 'pm.scheduleWorkGroups') return [value.id];
  if (collection === 'pm.specialEvents') return value.eligibleWorkGroupIds || [];
  if (['pm.leaveRequests','pm.scheduleExceptions'].includes(collection)) return personGroupIds(value.personId,value,snapshot);
  if (collection === 'pm.shiftSwapRequests') return [...new Set([...personGroupIds(value.requesterId,value,snapshot),...personGroupIds(value.coveringId,value,snapshot)])];
  if (collection === 'pm.scheduleShifts') return [value.workGroupId || snapshot['pm.scheduleWorkGroups']?.[0]?.id || 'wg_patrol'];
  const shift = (snapshot['pm.scheduleShifts'] || []).find(s => s.id === value.shiftId);
  return shift ? recordGroupIds('pm.scheduleShifts', shift, snapshot) : [];
}
export const scopedScheduleCollections = new Set(['pm.scheduleShifts', 'pm.scheduleAssignments', 'pm.scheduleCoverages', 'pm.overtimeOpportunities', 'pm.specialEvents','pm.leaveRequests','pm.scheduleExceptions','pm.shiftSwapRequests','pm.rollCalls','pm.otCallbackOptIns']);
export function scheduleWriteDecision(collection, change, before, snapshot, personId, hasAbility, batch = []) {
  if (collection === 'pm.scheduleWorkGroups') return {allowed:false, error:'Only an agency or platform administrator can configure calendar access.'};
  if (!scopedScheduleCollections.has(collection)) return null;
  const groups = snapshot['pm.scheduleWorkGroups'] || [];
  if(collection==='pm.otCallbackOptIns') {
    if(change.deleted || change.itemId!=='$value' || !Array.isArray(change.value) || !change.value.every(id=>typeof id==='string') || new Set(change.value).size!==change.value.length)return {allowed:false};
    const prior=Array.isArray(before)?before:[];
    const person=(snapshot.personnel || []).find(p=>p.id===personId);
    const visible=id=>id===personId || personGroupIds(id,{},snapshot).some(groupId=>viewsGroup(groups.find(g=>g.id===groupId),person,personId));
    // The client receives a scoped list. Preserve entries it cannot see.
    change.value=[...new Set([...prior.filter(id=>!visible(id)),...change.value])];
    const changed=[...prior.filter(id=>!change.value.includes(id)),...change.value.filter(id=>!prior.includes(id))];
    const allowed=changed.every(id=>id===personId&&hasAbility('pm_overtime_optin') || (hasAbility('pm_overtime_manage')&&personGroupIds(id,{},snapshot).length>0&&personGroupIds(id,{},snapshot).every(groupId=>managesGroup(groups.find(g=>g.id===groupId),personId))));
    return {allowed:allowed && change.value.every(id=>(snapshot.personnel || []).some(p=>p.id===id))};
  }
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
    const candidates=batch.filter(c=>c.path.join('.')===collection && !c.deleted && !c.itemId.startsWith('$'));
    return {allowed:candidates.length>0 && candidates.every(c=>scheduleWriteDecision(collection,c,null,snapshot,personId,hasAbility).allowed)};
  }
  const manages = value => {
    const ids = recordGroupIds(collection, value, snapshot);
    // An event with no scope is agency-wide and must be managed by an administrator.
    return ids.length > 0 && ids.every(id => managesGroup(groups.find(g => g.id === id), personId));
  };
  const managerAbilities = {
    'pm.scheduleCoverages':['pm_schedule_manage','pm_overtime_manage','pm_leave_request_approve'],
    'pm.overtimeOpportunities':['pm_schedule_manage','pm_overtime_manage'],
    'pm.leaveRequests':['pm_leave_request_approve'],
    'pm.scheduleExceptions':['pm_schedule_manage','pm_leave_request_approve'],
    'pm.rollCalls':['pm_rollcall_manage'],
  };
  const managerAbility = (managerAbilities[collection] || ['pm_schedule_manage']).some(hasAbility);
  if (managerAbility && (!before || manages(before)) && (change.deleted || manages(change.value))) return {allowed:true};
  if(collection==='pm.leaveRequests' && !change.deleted && hasAbility('pm_leave_request_submit')) {
    const after=change.value;
    if(!before) {
      const keys=['id','personId','code','startDate','endDate','reason','status','submittedAt','submittedBy'];
      const codes=(snapshot['pm.refData'] || []).flatMap(r=>r.exceptionCodes || []);
      return {allowed:after?.personId===personId && after.submittedBy===personId && after.status==='pending' && validDates(after) && codes.some(c=>c.code===after.code && c.active!==false && c.requestable) && Object.keys(after).every(k=>keys.includes(k))};
    }
    return {allowed:before.personId===personId && after?.personId===personId && before.status==='pending' && after.status==='cancelled' && after.rescindedBy===personId && sameExcept(before,after,['status','rescindedAt','rescindedBy'])};
  }
  if(collection==='pm.shiftSwapRequests' && !change.deleted && hasAbility('pm_leave_request_submit')) {
    const after=change.value;
    if(!before) {
      const keys=['id','requesterId','coveringId','date','reason','status','requestedAt','requestedBy'];
      return {allowed:after?.requesterId===personId && after.requestedBy===personId && after.coveringId!==personId && (snapshot.personnel || []).some(p=>p.id===after.coveringId) && after.status==='pending' && validDates(after) && Object.keys(after).every(k=>keys.includes(k))};
    }
    return {allowed:before.requesterId===personId && before.status==='pending' && after?.status==='cancelled' && sameExcept(before,after,['status','decidedAt'])};
  }
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

export function filterSchedulingRecords(records, personId, canViewSchedule, abilities = {}) {
  const snapshot = schedulingSnapshot(records);
  const groups = snapshot['pm.scheduleWorkGroups'] || [];
  const person = (snapshot.personnel || []).find(p => p.id === personId);
  const ownShiftIds = new Set([...(snapshot['pm.scheduleAssignments'] || []),...(snapshot['pm.scheduleCoverages'] || [])].filter(a => a.personId === personId).map(a => a.shiftId));
  for (const [collection, permitted] of [['pm.overtimeOpportunities',abilities.overtime],['pm.rollCalls',abilities.rollcall]]) {
    if(!permitted)continue;
    for(const value of snapshot[collection] || []) {
      if(recordGroupIds(collection,value,snapshot).some(id=>viewsGroup(groups.find(g=>g.id===id),person,personId)))ownShiftIds.add(value.shiftId);
    }
  }
  const visibleIds = new Map();
  const allowed = (collection, value) => {
    if (collection === 'pm.scheduleWorkGroups') return viewsGroup(value, person, personId);
    if (collection === 'pm.scheduleAssignments' && value.personId === personId) return true;
    if (collection === 'pm.scheduleShifts' && ownShiftIds.has(value.id)) return true;
    if (collection === 'pm.scheduleCoverages' && value.personId === personId) return true;
    if (['pm.leaveRequests','pm.scheduleExceptions'].includes(collection) && value.personId===personId) return true;
    if (collection==='pm.shiftSwapRequests' && [value.requesterId,value.coveringId].includes(personId))return true;
    const canRead=canViewSchedule || (['pm.overtimeOpportunities','pm.specialEvents'].includes(collection)&&abilities.overtime) || (collection==='pm.rollCalls'&&abilities.rollcall) || (collection==='pm.leaveRequests'&&abilities.leaveApprove);
    if (!canRead) return false;
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
    if(collection==='pm.otCallbackOptIns' && id==='$value' && Array.isArray(row.value)) {
      const canRead=canViewSchedule || abilities.overtime;
      filtered.push({...row,value:row.value.filter(id=>id===personId || canRead&&personGroupIds(id,{},snapshot).some(groupId=>viewsGroup(groups.find(g=>g.id===groupId),person,personId)))});
      continue;
    }
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
