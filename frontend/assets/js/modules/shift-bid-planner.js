// Shared deterministic shift award planning. Assignment end dates are exclusive.
function planShiftBidAward(cycle, records, shifts, assignments, today) {
  const fail = message => { throw new Error(message); };
  const date = cycle.effectiveDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || date < today) fail('Choose an effective date today or later before awarding shifts.');
  if (cycle.status !== 'open') fail('This bid cycle has already been awarded or closed.');
  const submissions = cycle.submissions || [];
  if (new Set(submissions.map(s=>s.personId)).size !== submissions.length) fail('Each employee may submit only one bid.');
  const remaining = {...cycle.shiftSlots};
  if (!Object.keys(remaining).length || Object.values(remaining).some(n=>!Number.isSafeInteger(n)||n<1)) fail('Shift slots must be positive whole numbers.');
  const seniority = id => records.find(r=>r.personId===id)?.hireDate || '9999-99-99';
  const sorted = [...submissions].sort((a,b)=>seniority(a.personId).localeCompare(seniority(b.personId)) || a.personId.localeCompare(b.personId));
  const awards=[], updates=[];
  for (const sub of sorted) {
    if (!Array.isArray(sub.prefs)) fail('Invalid shift preferences.');
    const shiftId=sub.prefs.find(id=>(remaining[id] || 0)>0);
    if (!shiftId) { awards.push({personId:sub.personId,shiftId:null}); continue; }
    const shift=shifts.find(s=>s.id===shiftId);
    if (!shift || (shift.workGroupId || 'wg_patrol')!==cycle.workGroupId || shift.startDate && shift.startDate>date || shift.endDate && shift.endDate<date) fail('Every awarded shift must be active in the selected calendar on the effective date.');
    const prior=assignments.filter(a=>a.personId===sub.personId && (!a.endDate || a.endDate>date));
    if (prior.some(a=>!a.startDate || a.startDate>=date)) fail('An employee has an assignment starting on or after the effective date. Resolve it before awarding.');
    const id='bidAssignment:'+cycle.id+':'+sub.personId;
    if (assignments.some(a=>a.id===id)) fail('This shift award has already been applied.');
    prior.forEach(a=>updates.push({...a,endDate:date}));
    const names=[...new Set(prior.map(a=>(shifts.find(s=>s.id===a.shiftId)?.staffingRequirements || []).find(r=>r.id===a.staffingCategoryId)?.name?.trim().toLowerCase()).filter(Boolean))];
    const matching=names.length===1?(shift.staffingRequirements || []).find(r=>r.name.trim().toLowerCase()===names[0]):null;
    const skills=records.find(r=>r.personId===sub.personId)?.specialSkills||[];
    const category=matching&&skills.some(skill=>skill.trim().toLowerCase()===(matching.requiredSkill||matching.name).trim().toLowerCase())?matching:null;
    updates.push({id,personId:sub.personId,shiftId,unit:shift.unit || '',location:shift.location || '',startDate:date,endDate:shift.endDate ? new Date(Date.parse(shift.endDate)+86400000).toISOString().slice(0,10) : null,bidCycleId:cycle.id,...(category?{staffingCategoryId:category.id}:{})});
    awards.push({personId:sub.personId,shiftId,assignmentId:id});
    remaining[shiftId]--;
  }
  return {awards,updates};
}
