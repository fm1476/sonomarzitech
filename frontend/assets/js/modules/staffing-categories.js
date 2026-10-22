// Staffing positions are independent of application permission roles.
function validateStaffingRequirements(requirements=[]) {
  if(!Array.isArray(requirements)||requirements.length>50)throw new Error('Use no more than 50 staffing categories.');
  const ids=new Set(),names=new Set();
  for(const row of requirements){
    const name=String(row?.name||'').trim(),key=name.toLowerCase();
    if(!row?.id||typeof row.id!=='string'||row.id.length>120||!name||name.length>100||(!row.requiredSkill||typeof row.requiredSkill!=='string'||!row.requiredSkill.trim()||row.requiredSkill.length>100)||!Number.isSafeInteger(row.count)||row.count<1||row.count>5000||ids.has(row.id)||names.has(key))throw new Error('Each staffing category needs a unique name, required skill, and a positive whole-number requirement.');
    if(row.preferredCount!==undefined&&(!Number.isSafeInteger(row.preferredCount)||row.preferredCount<row.count||row.preferredCount>5000))throw new Error('Preferred staffing must be a whole number at least equal to minimum staffing.');
    if(row.requiredRank!==undefined&&(typeof row.requiredRank!=='string'||row.requiredRank.length>100))throw new Error('Staffing rank must be valid.');
    ids.add(row.id);names.add(key);
  }
  return requirements;
}
function staffingPersonHasSkill(records,personId,requirement){
  if(!requirement)return true;
  const required=String(requirement.requiredSkill||'').trim();
  const record=(records||[]).find(r=>r.personId===personId);
  const rank=String(requirement.requiredRank||'').trim().toLowerCase();
  if(rank&&(!record||String(record.rank||'').trim().toLowerCase()!==rank))return false;
  if(required==='any')return true;
  if(required.startsWith('rank:'))return !!record&&String(record.rank||'').trim().toLowerCase()===required.slice(5).trim().toLowerCase();
  const skill=required.toLowerCase();
  return !!skill&&Array.isArray(record?.specialSkills)&&record.specialSkills.some(value=>String(value).trim().toLowerCase()===skill);
}
function staffingSummary(requirements,rows,minimum=0,records){
  const positions=requirements||[],people=new Map();
  const advisories=[];
  for(const row of rows||[])if(row?.personId&&!people.has(row.personId)){
    const category=positions.find(c=>c.id===row.staffingCategoryId);
    people.set(row.personId,row.staffingCategoryId||'');
    if(records&&category&&!staffingPersonHasSkill(records,row.personId,category))advisories.push({personId:row.personId,staffingCategoryId:row.staffingCategoryId,reason:'Qualification or classification not verified'});
  }
  const categories=positions.map(position=>({...position,staffed:[...people.values()].filter(id=>id===position.id).length})).map(row=>({...row,preferredCount:row.preferredCount??row.count,needed:Math.max(0,row.count-row.staffed),preferredNeeded:Math.max(0,(row.preferredCount??row.count)-row.staffed)}));
  const minStaff=Math.max(Number(minimum)||0,positions.reduce((sum,r)=>sum+r.count,0)),staffed=people.size;
  const unclassified=[...people.values()].filter(id=>!positions.some(r=>r.id===id)).length;
  const needed=Math.max(Math.max(0,minStaff-staffed),categories.reduce((sum,r)=>sum+r.needed,0));
  const preferredNeeded=categories.reduce((sum,r)=>sum+r.preferredNeeded,0);
  return {categories,minStaff,staffed,unclassified,needed,ok:needed===0,preferredNeeded,preferredOk:preferredNeeded===0,advisories};
}

// Advisory proposals only. Never changes an assignment or reallocates a person twice.
function suggestStaffingReassignments(requirements,rows,records){
  const summary=staffingSummary(requirements,rows,0,records);
  const occupancy=new Map(summary.categories.map(c=>[c.id,c.staffed]));
  const seen=new Set(),proposals=[];
  const unique=(rows||[]).filter(row=>row?.personId&&!seen.has(row.personId)&&seen.add(row.personId));
  for(const target of summary.categories.filter(c=>c.needed>0)){
    while((occupancy.get(target.id)||0)<target.count){
      const candidate=unique.find(row=>{
        if(row.staffingCategoryId===target.id||proposals.some(p=>p.personId===row.personId))return false;
        const origin=summary.categories.find(c=>c.id===row.staffingCategoryId);
        return origin&&(occupancy.get(origin.id)||0)>origin.count&&staffingPersonHasSkill(records,row.personId,target);
      });
      if(!candidate)break;
      occupancy.set(candidate.staffingCategoryId,occupancy.get(candidate.staffingCategoryId)-1);
      occupancy.set(target.id,(occupancy.get(target.id)||0)+1);
      proposals.push({personId:candidate.personId,fromCategoryId:candidate.staffingCategoryId,toCategoryId:target.id,reason:'Qualified reassignment from surplus staffing',requiresApproval:true});
    }
  }
  return proposals;
}
