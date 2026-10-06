// Staffing positions are independent of application permission roles.
function validateStaffingRequirements(requirements=[]) {
  if(!Array.isArray(requirements)||requirements.length>50)throw new Error('Use no more than 50 staffing categories.');
  const ids=new Set(),names=new Set();
  for(const row of requirements){
    const name=String(row?.name||'').trim(),key=name.toLowerCase();
    if(!row?.id||typeof row.id!=='string'||row.id.length>120||!name||name.length>100||(!row.requiredSkill||typeof row.requiredSkill!=='string'||!row.requiredSkill.trim()||row.requiredSkill.length>100)||!Number.isSafeInteger(row.count)||row.count<1||row.count>5000||ids.has(row.id)||names.has(key))throw new Error('Each staffing category needs a unique name, required skill, and a positive whole-number requirement.');
    ids.add(row.id);names.add(key);
  }
  return requirements;
}
function staffingPersonHasSkill(records,personId,requirement){
  if(!requirement)return true;
  const skill=String(requirement.requiredSkill||requirement.name||'').trim().toLowerCase();
  const record=(records||[]).find(r=>r.personId===personId);
  return !!skill&&Array.isArray(record?.specialSkills)&&record.specialSkills.some(value=>String(value).trim().toLowerCase()===skill);
}
function staffingSummary(requirements,rows,minimum=0,records){
  const positions=requirements||[],people=new Map();
  for(const row of rows||[])if(row?.personId&&!people.has(row.personId)){const category=positions.find(c=>c.id===row.staffingCategoryId);people.set(row.personId,records&&category&&!staffingPersonHasSkill(records,row.personId,category)?'':row.staffingCategoryId||'');}
  const categories=positions.map(position=>({...position,staffed:[...people.values()].filter(id=>id===position.id).length})).map(row=>({...row,needed:Math.max(0,row.count-row.staffed)}));
  const minStaff=Math.max(Number(minimum)||0,positions.reduce((sum,r)=>sum+r.count,0)),staffed=people.size;
  const unclassified=[...people.values()].filter(id=>!positions.some(r=>r.id===id)).length;
  const needed=Math.max(Math.max(0,minStaff-staffed),categories.reduce((sum,r)=>sum+r.needed,0));
  return {categories,minStaff,staffed,unclassified,needed,ok:needed===0};
}
