import {validateStaffingRequirements,staffingSummary,staffingPersonHasSkill} from './staffing-categories.mjs';
import {planShiftBidAward} from './shift-bid-planner.mjs';
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
// A bidding manager needs seniority, not the rest of an employee's HR record.
export function biddingSeniorityProjection(records,personId) {
  const snapshot=schedulingSnapshot(records);
  const groups=(snapshot['pm.scheduleWorkGroups'] || []).filter(g=>managesGroup(g,personId));
  const participants=new Set((snapshot['pm.bidCycles'] || []).filter(c=>groups.some(g=>g.id===c.workGroupId)).flatMap(c=>(c.submissions || []).map(sub=>sub.personId)));
  const eligible=id=>participants.has(id) || personGroupIds(id,{},snapshot).some(id=>groups.some(g=>g.id===id));
  const limited=v=>({id:v.id,personId:v.personId,hireDate:v.hireDate || ''});
  const output=[];
  for(const record of records) {
    let path,itemId;
    try {[path,itemId]=JSON.parse(record.key);}catch{continue;}
    if(path.join('.')!=='pm.records'||record.deleted)continue;
    if(itemId==='$order')continue;
    if(itemId==='$value'&&Array.isArray(record.value))output.push({...record,value:record.value.filter(v=>eligible(v.personId)).map(limited)});
    else if(record.value&&eligible(record.value.personId))output.push({...record,value:limited(record.value)});
  }
  return output;
}
export function schedulingSkillsProjection(records,personId,canManage){
  const snapshot=schedulingSnapshot(records),groups=(snapshot['pm.scheduleWorkGroups']||[]).filter(g=>managesGroup(g,personId));
  const participants=new Set([...groups.flatMap(g=>[...(g.viewerIds||[]),...(g.managerIds||[])]),...(snapshot['pm.specialEvents']||[]).filter(e=>(e.eligibleWorkGroupIds||[]).length&&(e.eligibleWorkGroupIds||[]).every(id=>groups.some(g=>g.id===id))).flatMap(e=>(e.requests||[]).map(r=>r.personId))]);
  const eligible=id=>id===personId||canManage&&(participants.has(id)||groups.some(g=>g.visibility==='agency')||personGroupIds(id,{},snapshot).some(id=>groups.some(g=>g.id===id)));
  const limited=v=>({id:v.id,personId:v.personId,specialSkills:Array.isArray(v.specialSkills)?v.specialSkills:[]});
  return records.flatMap(row=>{let path,id;try{[path,id]=JSON.parse(row.key);}catch{return [];}if(path.join('.')!=='pm.records'||row.deleted||id==='$order')return [];if(id==='$value'&&Array.isArray(row.value))return [{...row,value:row.value.filter(v=>eligible(v.personId)).map(limited)}];return row.value&&eligible(row.value.personId)?[{...row,value:limited(row.value)}]:[];});
}
const normalize = value => String(value || '').trim().toLowerCase();
export function viewsGroup(group, person, personId) {
  if (!group || group.active===false) return false;
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
  if (collection === 'pm.extraDutyJobs') return value.workGroupId ? [value.workGroupId] : [];
  if (collection === 'pm.extraDutySignups') {
    const job=(snapshot['pm.extraDutyJobs'] || []).find(j=>j.id===value.jobId);
    return job ? recordGroupIds('pm.extraDutyJobs',job,snapshot) : [];
  }
  if (collection === 'pm.bidCycles') {
    const ids=Object.keys(value.shiftSlots || {}).flatMap(id=>{
      const shift=(snapshot['pm.scheduleShifts'] || []).find(s=>s.id===id);
      return shift?recordGroupIds('pm.scheduleShifts',shift,snapshot):[];
    });
    return [...new Set([...(value.workGroupId?[value.workGroupId]:[]),...ids])];
  }
  if (['pm.leaveRequests','pm.scheduleExceptions'].includes(collection)) return personGroupIds(value.personId,value,snapshot);
  if (collection === 'pm.shiftSwapRequests') return [...new Set([...personGroupIds(value.requesterId,value,snapshot),...personGroupIds(value.coveringId,value,snapshot)])];
  if (collection === 'pm.scheduleShifts') return [value.workGroupId || 'wg_patrol'];
  const shift = (snapshot['pm.scheduleShifts'] || []).find(s => s.id === value.shiftId);
  return shift ? recordGroupIds('pm.scheduleShifts', shift, snapshot) : [];
}
export const scopedScheduleCollections = new Set(['pm.scheduleShifts', 'pm.scheduleAssignments', 'pm.scheduleCoverages', 'pm.overtimeOpportunities', 'pm.specialEvents','pm.leaveRequests','pm.scheduleExceptions','pm.shiftSwapRequests','pm.rollCalls','pm.otCallbackOptIns','pm.bidCycles','pm.extraDutyJobs','pm.extraDutySignups']);
export function scheduleWriteDecision(collection, change, before, snapshot, personId, hasAbility, batch = []) {
  if (['pm.scheduleWorkGroups','pm.schedulingSettings'].includes(collection)) return {allowed:false, error:'Only an agency or platform administrator can configure calendar access.'};
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
      return scheduleWriteDecision(collection,candidate,prior,snapshot,personId,hasAbility,batch).allowed;
    });
    return {allowed:allowed && (touchedIds.size > 0 || groups.some(g => managesGroup(g,personId)))};
  }
  if (change.itemId === '$value' && Array.isArray(before) && before.length === 0 && change.deleted) {
    const candidates=batch.filter(c=>c.path.join('.')===collection && !c.deleted && !c.itemId.startsWith('$'));
    return {allowed:candidates.length>0 && candidates.every(c=>scheduleWriteDecision(collection,c,null,snapshot,personId,hasAbility,batch).allowed)};
  }
  const manages = value => {
    const ids = recordGroupIds(collection, value, snapshot);
    // An event with no scope is agency-wide and must be managed by an administrator.
    return ids.length > 0 && ids.every(id => managesGroup(groups.find(g => g.id === id), personId));
  };
  if(collection==='pm.scheduleAssignments' && hasAbility('pm_bidding_manage') && !change.deleted && (!before || manages(before)) && manages(change.value)) {
    const allowed=batch.some(c=>{
      if(c.path.join('.')!=='pm.bidCycles'||c.deleted||c.itemId.startsWith('$')||c.value?.type!=='shift'||c.value.status!=='awarded')return false;
      const previous=(snapshot['pm.bidCycles'] || []).find(v=>v.id===c.itemId);
      const scope=recordGroupIds('pm.bidCycles',c.value,snapshot);
      if(!previous||previous.status!=='open'||!scope.length||!scope.every(id=>managesGroup(groups.find(g=>g.id===id),personId)))return false;
      try {
        const plan=planShiftBidAward({...previous,effectiveDate:c.value.effectiveDate},snapshot['pm.records'] || [],snapshot['pm.scheduleShifts'] || [],snapshot['pm.scheduleAssignments'] || [],new Date().toISOString().slice(0,10));
        return plan.updates.some(row=>row.id===change.itemId && sameExcept(row,change.value,[]));
      } catch { return false; }
    });
    if(allowed)return {allowed:true};
  }
  const managerAbilities = {
    'pm.scheduleCoverages':['pm_schedule_manage','pm_overtime_manage','pm_leave_request_approve'],
    'pm.overtimeOpportunities':['pm_schedule_manage','pm_overtime_manage'],
    'pm.leaveRequests':['pm_leave_request_approve'],
    'pm.scheduleExceptions':['pm_schedule_manage','pm_leave_request_approve','pm_bidding_manage'],
    'pm.rollCalls':['pm_rollcall_manage'],
    'pm.bidCycles':['pm_bidding_manage'],
    'pm.extraDutyJobs':['pm_extraduty_manage'],
    'pm.extraDutySignups':['pm_extraduty_manage'],
  };
  const managerAbility = (managerAbilities[collection] || ['pm_schedule_manage']).some(hasAbility);
  if (managerAbility && (!before || manages(before)) && (change.deleted || manages(change.value))) return {allowed:true};
  if(collection==='pm.extraDutySignups' && !before && !change.deleted && hasAbility('pm_extraduty_signup')) {
    const value=change.value,job=(snapshot['pm.extraDutyJobs'] || []).find(j=>j.id===value?.jobId);
    const person=(snapshot.personnel || []).find(p=>p.id===personId);
    const ids=job?recordGroupIds('pm.extraDutyJobs',job,snapshot):[];
    const visible=job && (!ids.length||ids.some(id=>viewsGroup(groups.find(g=>g.id===id),person,personId)));
    return {allowed:!!visible && job.status==='open' && value.personId===personId && value.status==='pending' && !Object.keys(value).some(k=>!['id','jobId','personId','status','signedUpAt'].includes(k)) && !(snapshot['pm.extraDutySignups'] || []).some(s=>s.jobId===job.id&&s.personId===personId)};
  }
  if(collection==='pm.bidCycles' && before && !change.deleted && hasAbility('pm_bidding_submit')) {
    const after=change.value,today=new Date().toISOString().slice(0,10);
    const person=(snapshot.personnel || []).find(p=>p.id===personId),ids=recordGroupIds(collection,before,snapshot);
    const visible=ids.length?ids.some(id=>viewsGroup(groups.find(g=>g.id===id),person,personId)):before.type==='vacation';
    if(!visible||before.status!=='open'||today<before.opensDate||today>before.closesDate||!sameExcept(before,after,['submissions'])||!Array.isArray(after?.submissions))return {allowed:false};
    const oldOthers=(before.submissions || []).filter(s=>s.personId!==personId),newOthers=after.submissions.filter(s=>s.personId!==personId);
    const own=after.submissions.filter(s=>s.personId===personId);
    if(JSON.stringify(oldOthers)!==JSON.stringify(newOthers)||own.length!==1)return {allowed:false};
    const submission=own[0];
    const valid=Object.keys(submission).every(k=>['personId','submittedAt','prefs'].includes(k))&&Array.isArray(submission.prefs)&&submission.prefs.length>0&&(
      before.type==='shift'?new Set(submission.prefs).size===submission.prefs.length&&submission.prefs.every(id=>Object.hasOwn(before.shiftSlots || {},id)):
      submission.prefs.length<=3&&submission.prefs.every(p=>validDates({startDate:p.start,endDate:p.end})&&p.start>=before.vacationWindowStart&&p.end<=before.vacationWindowEnd)
    );
    return {allowed:valid};
  }
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
      Object.keys(request).every(k => ['personId','status','requestedAt','conflict',...(collection==='pm.specialEvents'?['staffingCategoryId']:[])].includes(k));
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
  if(abilities.bidding)for(const cycle of snapshot['pm.bidCycles'] || []) {
    if(recordGroupIds('pm.bidCycles',cycle,snapshot).some(id=>viewsGroup(groups.find(g=>g.id===id),person,personId)))Object.keys(cycle.shiftSlots || {}).forEach(id=>ownShiftIds.add(id));
  }
  const visibleIds = new Map();
  const allowed = (collection, value) => {
    if (collection === 'pm.scheduleWorkGroups') return viewsGroup(value, person, personId);
    if(collection==='pm.specialEvents'&&(value.requests || []).some(r=>r.personId===personId&&r.status==='awarded'))return true;
    if (collection === 'pm.scheduleAssignments' && value.personId === personId) return true;
    if(['pm.scheduleAssignments','pm.scheduleShifts'].includes(collection) && abilities.biddingManage && recordGroupIds(collection,value,snapshot).some(id=>managesGroup(groups.find(g=>g.id===id),personId)))return true;
    if (collection === 'pm.scheduleShifts' && ownShiftIds.has(value.id)) return true;
    if (collection === 'pm.scheduleCoverages' && value.personId === personId) return true;
    if (['pm.leaveRequests','pm.scheduleExceptions'].includes(collection) && value.personId===personId) return true;
    if (collection==='pm.shiftSwapRequests' && [value.requesterId,value.coveringId].includes(personId))return true;
    if(collection==='pm.extraDutySignups'&&value.personId===personId)return true;
    const canRead=canViewSchedule || (['pm.overtimeOpportunities','pm.specialEvents'].includes(collection)&&abilities.overtime) || (collection==='pm.rollCalls'&&abilities.rollcall) || (collection==='pm.leaveRequests'&&abilities.leaveApprove) || (collection==='pm.bidCycles'&&abilities.bidding) || (['pm.extraDutyJobs','pm.extraDutySignups'].includes(collection)&&abilities.extraDuty);
    if (!canRead) return false;
    const ids = recordGroupIds(collection, value, snapshot);
    return ids.length ? ids.some(id => viewsGroup(groups.find(g => g.id === id), person, personId)) : ['pm.specialEvents','pm.extraDutyJobs','pm.extraDutySignups'].includes(collection)||collection==='pm.bidCycles'&&value.type==='vacation';
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

const dayDifference=(start,end)=>Math.round((Date.parse(end)-Date.parse(start))/86400000);
export function assignmentOnDuty(assignment,shift,date) {
  if(!shift || shift.startDate && shift.startDate>date || shift.endDate && shift.endDate<date || assignment.startDate>date || assignment.endDate && assignment.endDate<=date)return false;
  if(shift.patternType==='weekly') {
    const weekday=new Date(date+'T00:00:00Z').getUTCDay();
    if((shift.weekdays || []).includes(weekday))return true;
    return (shift.altWeekdays || []).includes(weekday)&&!!shift.altAnchorDate&&((Math.floor(dayDifference(shift.altAnchorDate,date)/7)%2)+2)%2===0;
  }
  const daysOn=Number(shift.daysOn)||0,cycle=daysOn+(Number(shift.daysOff)||0);
  if(cycle<=0)return true;
  return ((dayDifference(assignment.startDate,date)%cycle)+cycle)%cycle<daysOn;
}
function regularDuty(personId,date,snapshot) {
  if((snapshot['pm.scheduleExceptions'] || []).some(e=>e.personId===personId&&e.startDate<=date&&e.endDate>=date))return false;
  return (snapshot['pm.scheduleAssignments'] || []).some(a=>a.personId===personId&&assignmentOnDuty(a,(snapshot['pm.scheduleShifts'] || []).find(s=>s.id===a.shiftId),date));
}
export function validateSchedulingBatch(snapshot,changes) {
  const final=Object.fromEntries(Object.entries(snapshot).map(([k,v])=>[k,[...v]]));
  for(const change of changes) {
    const collection=change.path.join('.');
    if(change.itemId.startsWith('$'))continue;
    final[collection]=(final[collection] || []).filter(v=>v.id!==change.itemId);
    if(!change.deleted)final[collection].push(change.value);
  }
  const fail=message=>{const error=new Error(message);error.code='42501';throw error;};
  const uniquePeople=rows=>new Set(rows.map(r=>r.personId)).size===rows.length;
  for(const change of changes) {
    const collection=change.path.join('.'),value=change.value;
    if(collection==='pm.bidCycles' && !change.itemId.startsWith('$')) {
      const previous=(snapshot[collection] || []).find(c=>c.id===change.itemId);
      if(previous?.type==='shift' && previous.status==='awarded' && (change.deleted || !sameExcept(previous,value,[])))fail('Awarded shift cycles cannot be changed or deleted.');
    }
    if(change.deleted||change.itemId.startsWith('$'))continue;
    if(collection==='pm.bidCycles' && value.type==='shift' && value.status==='awarded') {
      const previous=(snapshot[collection] || []).find(c=>c.id===value.id);
      if(!previous)fail('Save the bid cycle before awarding it.');
      if(previous.status==='awarded') {
        if(!sameExcept(previous,value,[]))fail('Awarded shift cycles cannot be changed.');
      } else {
        if(!sameExcept(previous,value,['effectiveDate','awards','status']))fail('Save cycle changes before awarding.');
        let plan;
        try { plan=planShiftBidAward({...previous,effectiveDate:value.effectiveDate},snapshot['pm.records'] || [],snapshot['pm.scheduleShifts'] || [],snapshot['pm.scheduleAssignments'] || [],new Date().toISOString().slice(0,10)); }
        catch(error){fail(error.message);}
        if(JSON.stringify(plan.awards)!==JSON.stringify(value.awards))fail('Shift awards must follow persisted seniority and slot capacity. Reload before awarding.');
        for(const row of plan.updates) {
          const saved=(final['pm.scheduleAssignments'] || []).find(a=>a.id===row.id);
          if(!saved || !sameExcept(row,saved,[]))fail('A shift award requires all matching roster updates in the same save.');
        }
      }
    }
    if(collection==='pm.extraDutyJobs'||collection==='pm.extraDutySignups') {
      const job=collection==='pm.extraDutyJobs'?value:(final['pm.extraDutyJobs'] || []).find(j=>j.id===value.jobId);
      if(!job)fail('The extra-duty job no longer exists.');
      if(!Number.isSafeInteger(job.slots)||job.slots<1)fail('Extra-duty slots must be a positive whole number.');
      const signups=(final['pm.extraDutySignups'] || []).filter(s=>s.jobId===job.id);
      if(!uniquePeople(signups))fail('An employee can sign up for a job only once.');
      if(signups.filter(s=>s.status==='approved').length>job.slots)fail('This extra-duty job is already fully staffed. Reload before approving.');
    }
    if(['pm.scheduleShifts','pm.specialEvents'].includes(collection)) {
      try{validateStaffingRequirements(value.staffingRequirements||[]);}catch(error){fail(error.message);}
      const minimum=(value.staffingRequirements||[]).reduce((sum,r)=>sum+r.count,0);
      const catalog=(final['pm.refData']||[]).flatMap(r=>r.skillsCatalog||[]);
      if((value.staffingRequirements||[]).some(r=>!catalog.some(skill=>normalize(skill)===normalize(r.requiredSkill))))fail('Choose a required skill from the Personnel Special Skills Catalog.');
      if(minimum>0&&Number(collection==='pm.specialEvents'?value.staffNeeded:value.minStaff)!==minimum)fail('The total staffing requirement must equal the category requirements.');
    }
    const previousAssignment=(snapshot[collection]||[]).find(row=>row.id===change.itemId);
    const endingAssignment=collection==='pm.scheduleAssignments'&&previousAssignment&&value.endDate&&!previousAssignment.endDate&&sameExcept(previousAssignment,value,['endDate']);
    if(['pm.scheduleAssignments','pm.scheduleCoverages','pm.overtimeOpportunities'].includes(collection)&&!endingAssignment){
      const shift=(final['pm.scheduleShifts']||[]).find(s=>s.id===value.shiftId);
      const category=(shift?.staffingRequirements||[]).find(c=>c.id===value.staffingCategoryId);
      if((shift?.staffingRequirements||[]).length&&!category)fail('Select a required staffing category before assigning personnel.');
      if(category&&value.personId&&!staffingPersonHasSkill(final['pm.records'],value.personId,category))fail('This employee does not have the required staffing skill.');
      if(!shift||(shift.staffingRequirements||[]).length&&!shift.staffingRequirements.some(r=>r.id===value.staffingCategoryId))fail('Select a staffing category defined for this shift.');
    }
    if(collection==='pm.specialEvents') {
      if(!validDates(value)||dayDifference(value.startDate,value.endDate)>366)fail('Enter a valid special-event date range of no more than one year.');
      if(!Number.isSafeInteger(value.staffNeeded)||value.staffNeeded<1)fail('Event staffing must be a positive whole number.');
      const requests=value.requests || [];
      if(!Array.isArray(requests)||!uniquePeople(requests))fail('Each employee may request an event only once.');
      if(requests.filter(r=>r.status==='awarded').length>value.staffNeeded)fail('The special event is already fully staffed.');
      const requirements=value.staffingRequirements||[],summary=staffingSummary(requirements,requests.filter(r=>r.status==='awarded'),value.staffNeeded);
      if(requirements.length&&requests.some(r=>r.status==='awarded'&&!requirements.some(c=>c.id===r.staffingCategoryId)))fail('Each assigned employee must fill a defined staffing category.');
      if(requirements.length&&requests.some(r=>r.status==='pending'&&r.staffingCategoryId&&!requirements.some(c=>c.id===r.staffingCategoryId)))fail('Select a defined event staffing category.');
      for(const request of requests.filter(r=>r.status==='awarded'||r.status==='pending'&&r.staffingCategoryId)){const category=requirements.find(c=>c.id===request.staffingCategoryId);if(category&&!staffingPersonHasSkill(final['pm.records'],request.personId,category))fail('This employee does not have the required event staffing skill.');}
      if(summary.categories.some(r=>r.staffed>r.count))fail('The selected staffing category is already fully staffed.');
      const previous=(snapshot[collection] || []).find(e=>e.id===value.id);
      for(const request of requests.filter(r=>r.status==='awarded'&&!(previous?.requests || []).some(old=>old.personId===r.personId&&old.status==='awarded'))) {
        const person=(final.personnel || []).find(p=>p.id===request.personId);
        if(!person)fail('The assigned employee no longer exists.');
        const groups=final['pm.scheduleWorkGroups'] || [],scope=value.eligibleWorkGroupIds || [];
        const membership=personGroupIds(request.personId,value,final);
        if(scope.length&&!scope.some(id=>membership.includes(id)||viewsGroup(groups.find(g=>g.id===id),person,request.personId)))fail("This employee is outside the event's eligible Work Groups.");
        if(value.status!=='published')fail('Only published events can receive new assignments.');
        for(let offset=0;offset<=dayDifference(value.startDate,value.endDate);offset++) {
          const date=new Date(Date.parse(value.startDate)+offset*86400000).toISOString().slice(0,10);
          const blocked=(final['pm.scheduleExceptions'] || []).some(e=>e.personId===request.personId&&e.startDate<=date&&e.endDate>=date&&!(e.code==='EVT'&&e.sourceEventId===value.id));
          if(blocked)fail('This employee has time off or another schedule exception during the event. Resolve it before assigning.');
          const covered=(final['pm.scheduleCoverages'] || []).some(c=>c.personId===request.personId&&c.date===date);
          const otherEvent=(final[collection] || []).some(e=>e.id!==value.id&&e.status!=='cancelled'&&e.startDate<=date&&e.endDate>=date&&(e.requests || []).some(r=>r.personId===request.personId&&r.status==='awarded'));
          if(regularDuty(request.personId,date,final)||covered||otherEvent)fail('This employee has a conflicting assignment during the event. Reassign or resolve the conflict first.');
        }
      }
    }
    if(collection==='pm.scheduleCoverages') {
      const duplicates=(final[collection] || []).filter(c=>c.personId===value.personId&&c.shiftId===value.shiftId&&c.date===value.date);
      if(duplicates.length>1)fail('This employee is already assigned to this shift on that date.');
      if(value.source==='overtime') {
        const otherCoverage=(final[collection] || []).some(c=>c.id!==value.id&&c.personId===value.personId&&c.date===value.date);
        const event=(final['pm.specialEvents'] || []).some(e=>e.status!=='cancelled'&&e.startDate<=value.date&&e.endDate>=value.date&&(e.requests || []).some(r=>r.personId===value.personId&&r.status==='awarded'));
        if(regularDuty(value.personId,value.date,final)||otherCoverage||event)fail('This employee has a schedule conflict. Reload before awarding overtime.');
      }
    }
    if(collection==='pm.overtimeOpportunities') {
      const shift=(final['pm.scheduleShifts']||[]).find(s=>s.id===value.shiftId),category=(shift?.staffingRequirements||[]).find(c=>c.id===value.staffingCategoryId);
      if(category&&(value.requests||[]).some(r=>['pending','awarded'].includes(r.status)&&!staffingPersonHasSkill(final['pm.records'],r.personId,category)))fail('This employee does not have the required overtime staffing skill.');
      const requests=value.requests || [];
      if(!Array.isArray(requests)||!uniquePeople(requests)||requests.filter(r=>r.status==='awarded').length>1)fail('An overtime opportunity can award only one employee.');
      const awarded=requests.find(r=>r.status==='awarded');
      if(awarded&&!((final['pm.scheduleCoverages'] || []).some(c=>c.overtimeOpportunityId===value.id && (c.staffingCategoryId||'')===(value.staffingCategoryId||'')&&c.personId===awarded.personId&&c.shiftId===value.shiftId&&c.date===value.date)))fail('An overtime award must include its Duty Roster coverage record.');
    }
    if(collection==='pm.leaveRequests'&&value.status==='approved') {
      const exception=(final['pm.scheduleExceptions'] || []).find(e=>e.id===value.exceptionId);
      if(!exception||exception.personId!==value.personId||exception.code!==value.code||exception.startDate!==value.startDate||exception.endDate!==value.endDate)fail('A leave approval must include the matching schedule exception.');
    }
  }
  return final;
}

export function schedulingSafeTemplate(template,admin){
  if(admin)return template;
  const safe=structuredClone(template || {});
  safe.pm ||= {};
  for(const collection of [...scopedScheduleCollections,'pm.scheduleWorkGroups'])safe.pm[collection.split('.')[1]]=[];
  return safe;
}
