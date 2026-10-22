import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateStaffingRequirements,staffingSummary,staffingPersonHasSkill,suggestStaffingReassignments} from '../lambdas/api/lib/staffing-categories.mjs';
import {validateSchedulingBatch,assignmentOnDuty,schedulingSkillsProjection} from '../lambdas/api/lib/scheduling-access.mjs';
const requirements=[{id:'law',name:'Law Dispatcher',requiredSkill:'Law Dispatch',count:2},{id:'fire',name:'Fire Dispatcher',requiredSkill:'Fire Dispatch',count:2},{id:'call',name:'Call Taker',requiredSkill:'Call Taking',count:1}];
const skills=['Law Dispatch','Fire Dispatch','Call Taking'];
const records=[{id:'r1',personId:'multi',specialSkills:[' law dispatch ','Call Taking'],ssn:'private'},{id:'r2',personId:'law2',specialSkills:['Law Dispatch']},{id:'r3',personId:'fire1',specialSkills:['Fire Dispatch']},{id:'r4',personId:'fire2',specialSkills:['Fire Dispatch']},{id:'r5',personId:'call1',specialSkills:['Call Taking']},{id:'r6',personId:'wrong',specialSkills:['Law Dispatch']}];
assert.doesNotThrow(()=>validateStaffingRequirements(requirements));
assert.throws(()=>validateStaffingRequirements([{...requirements[0],count:1.5}]),/whole-number/);
assert.throws(()=>validateStaffingRequirements([requirements[0],{...requirements[1],name:'law dispatcher'}]),/unique/);
assert.throws(()=>validateStaffingRequirements([{...requirements[0],requiredSkill:''}]),/required skill/);
assert.equal(staffingPersonHasSkill(records,'multi',requirements[0]),true);assert.equal(staffingPersonHasSkill(records,'multi',requirements[2]),true);
assert.equal(staffingPersonHasSkill(records,'multi',requirements[1]),false);assert.equal(staffingPersonHasSkill(records,'missing',requirements[0]),false);
const rows=[{personId:'multi',staffingCategoryId:'law'},{personId:'law2',staffingCategoryId:'law'},{personId:'fire1',staffingCategoryId:'fire'},{personId:'fire2',staffingCategoryId:'fire'},{personId:'call1',staffingCategoryId:'call'}];
assert.equal(staffingSummary(requirements,rows,5,records).ok,true);
const wrongMix=[...rows.slice(0,4),{personId:'wrong',staffingCategoryId:'law'}];
const short=staffingSummary(requirements,wrongMix,5,records);assert.equal(short.staffed,5);assert.equal(short.ok,false);assert.equal(short.categories[2].needed,1);
assert.equal(staffingSummary(requirements,[...rows,{personId:'multi',staffingCategoryId:'call'}],5,records).staffed,5); // Multi-skilled does not count twice.
const revoked=records.map(r=>r.personId==='fire1'?{...r,specialSkills:[]}:r);
assert.equal(staffingSummary(requirements,rows,5,revoked).categories[1].needed,0);
assert.equal(staffingSummary(requirements,rows,5,revoked).advisories.length,1);
assert.doesNotThrow(()=>validateStaffingRequirements([{id:'sup',name:'Patrol Supervisor',requiredSkill:'rank:Sergeant',count:1}]));
assert.equal(staffingPersonHasSkill([{personId:'s1',rank:'Sergeant'}],'s1',{requiredSkill:'rank:Sergeant'}),true);
assert.equal(staffingPersonHasSkill([{personId:'s1',rank:'Deputy'}],'s1',{requiredSkill:'rank:Sergeant'}),false);
assert.equal(staffingPersonHasSkill([],'s1',{requiredSkill:'any'}),true);
const group={id:'g',managerIds:['manager'],visibility:'unit',unitNames:['Dispatch'],active:true};
const shift={id:'s',workGroupId:'g',minStaff:5,staffingRequirements:requirements,patternType:'weekly',weekdays:[0,1,2,3,4,5,6],published:true};
const personnel=records.map(r=>({id:r.personId,name:r.personId,unit:'Dispatch'}));
const assignments=rows.map((r,i)=>({id:'a'+i,...r,shiftId:'s',startDate:'2000-01-01',endDate:'2999-01-01'}));
const snapshot={personnel,'pm.records':records,'pm.refData':[{skillsCatalog:skills}],'pm.scheduleWorkGroups':[group],'pm.scheduleShifts':[shift],'pm.scheduleAssignments':assignments,'pm.scheduleExceptions':[],'pm.scheduleCoverages':[]};
const change=(collection,value)=>({path:collection.split('.'),itemId:value.id,value,deleted:false});
assert.doesNotThrow(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleShifts',shift)]));
assert.throws(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleShifts',{...shift,minStaff:6})]),/total staffing/);
assert.throws(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleShifts',{...shift,staffingRequirements:[{...requirements[0],requiredSkill:'Unknown'}],minStaff:2})]),/Catalog/);
assert.doesNotThrow(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleAssignments',{...assignments[0],staffingCategoryId:'fire'})])); // Advisory only
assert.doesNotThrow(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleCoverages',{id:'cov',shiftId:'s',personId:'multi',date:'2099-01-01',staffingCategoryId:'fire'})]));
assert.throws(()=>validateSchedulingBatch(snapshot,[change('pm.scheduleAssignments',{...assignments[0],staffingCategoryId:''})]),/required staffing category/);
const legacyBad={...assignments[0],staffingCategoryId:'fire',endDate:null};
const legacySnapshot={...snapshot,'pm.scheduleAssignments':[legacyBad]};
assert.doesNotThrow(()=>validateSchedulingBatch(legacySnapshot,[change('pm.scheduleAssignments',{...legacyBad,endDate:'2099-01-01'})]));
assert.doesNotThrow(()=>validateSchedulingBatch(legacySnapshot,[change('pm.scheduleAssignments',{...legacyBad,endDate:'2099-01-01',personId:'wrong'})]));
const event={id:'event',eligibleWorkGroupIds:['g'],startDate:'2099-01-01',endDate:'2099-01-02',status:'published',staffNeeded:5,staffingRequirements:requirements,requests:[{personId:'multi',status:'awarded',staffingCategoryId:'law'}]};
const off={...snapshot,'pm.scheduleAssignments':[]};
assert.doesNotThrow(()=>validateSchedulingBatch(off,[change('pm.specialEvents',event)]));
assert.doesNotThrow(()=>validateSchedulingBatch(off,[change('pm.specialEvents',{...event,requests:[{personId:'multi',status:'awarded',staffingCategoryId:'fire'}]})]));
assert.doesNotThrow(()=>validateSchedulingBatch(off,[change('pm.specialEvents',{...event,requests:[{personId:'multi',status:'pending',staffingCategoryId:'fire'}]})]));
assert.throws(()=>validateSchedulingBatch(off,[change('pm.specialEvents',{...event,requests:[{personId:'multi',status:'awarded',staffingCategoryId:'law'},{personId:'law2',status:'awarded',staffingCategoryId:'law'},{personId:'wrong',status:'awarded',staffingCategoryId:'law'}]})]),/category is already fully staffed/);
assert.doesNotThrow(()=>validateSchedulingBatch(off,[change('pm.overtimeOpportunities',{id:'ot',shiftId:'s',date:'2099-01-01',staffingCategoryId:'fire',status:'open',requests:[{personId:'multi',status:'pending'}]})]));
// Actual browser daily staffing and gaps honor class shortages and exclusive assignment ends.
const source=fs.readFileSync('frontend/assets/js/modules/personnel.js','utf8');
const context={STATE:{personnel,pm:{records,scheduleWorkGroups:[group],scheduleShifts:[shift],scheduleAssignments:structuredClone(assignments),scheduleExceptions:[],scheduleCoverages:[],specialEvents:[],refData:{skillsCatalog:skills}}},staffingSummary,validateStaffingRequirements,staffingPersonHasSkill,isOnDutyOnDate:assignmentOnDuty,fmt:d=>d.toISOString().slice(0,10),addDays:(d,n)=>new Date(d.getTime()+n*86400000),shiftPatternStatus:()=> 'current',CURRENT_USER_ID:'manager',currentRole:()=>({id:'role_scheduler'}),can:a=>a==='pm_schedule_manage',personName:id=>id,toast:()=>{},logActivity:()=>{},persist:()=>{},openSpecialEventDetail:()=>{},renderSpecialEventsSub:()=>{}};
vm.createContext(context);vm.runInContext(fs.readFileSync('frontend/assets/js/modules/staffing-categories.js','utf8'),context);
vm.runInContext(source.slice(source.indexOf('function activeExceptionFor('),source.indexOf('const SHIFT_COLOR_PALETTE')),context);
vm.runInContext(source.slice(source.indexOf('function currentPerson()'),source.indexOf('function visibleScheduleWorkGroups()')),context);
vm.runInContext(source.slice(source.indexOf('function staffingSkillOptions('),source.indexOf('function calendarUnitOptions(')),context);
vm.runInContext(source.slice(source.indexOf('function onDutyRoster('),source.indexOf('// Overtime hours a person',source.indexOf('function onDutyRoster('))),context);
const flexibleShift={...shift,staffingOverrides:[
  {id:'fri',type:'weekday',value:'5',counts:{law:1,fire:1,call:1}},
  {id:'special',type:'date',value:'2099-01-02',counts:{law:2,fire:1,call:0}}
]};
assert.equal(context.effectiveStaffingRequirements(flexibleShift,'2099-01-02').find(r=>r.id==='call'),undefined);
assert.equal(context.effectiveStaffingRequirements(flexibleShift,'2099-01-02').reduce((n,r)=>n+r.count,0),3);
assert.equal(context.effectiveStaffingRequirements(flexibleShift,'2099-01-09').reduce((n,r)=>n+r.count,0),3);
assert.equal(context.shiftStaffingSummary(shift,'2099-01-01').ok,true);assert.equal(context.onDutyRoster(shift,'2099-01-01').length,5);assert.equal(context.onDutyRoster(shift,'2999-01-01').length,0);
context.STATE.pm.scheduleExceptions=[{id:'off',personId:'fire1',startDate:context.fmt(new Date()),endDate:context.fmt(new Date()),code:'VDO'}];
const gaps=context.computeCoverageGaps(1);assert.equal(gaps.length,1);assert.equal(gaps[0].staffingCategoryId,'fire');assert.equal(gaps[0].needed,1);
context.STATE.pm.scheduleCoverages=[{id:'fill',personId:'newFire',shiftId:'s',date:context.fmt(new Date()),staffingCategoryId:'fire'}];context.STATE.pm.records.push({personId:'newFire',specialSkills:['Fire Dispatch']});
assert.equal(context.computeCoverageGaps(1).length,0);
vm.runInContext(source.slice(source.indexOf('function canManageSpecialEvent('),source.indexOf('function openSpecialEventAssignmentModal(')),context);
context.STATE.pm.scheduleAssignments=[];context.STATE.pm.scheduleExceptions=[];context.STATE.pm.scheduleCoverages=[];
assert.equal(context.planSpecialEventAssignments(event,['law2'],false,true,'fire').requests.find(r=>r.personId==='law2').staffingCategoryId,'fire');
assert.equal(context.planSpecialEventAssignments(event,['law2'],false,true,'law').requests.find(r=>r.personId==='law2').staffingCategoryId,'law');
// Operational projection contains skills only; ordinary staff cannot read coworkers' skills.
const key=(collection,id)=>JSON.stringify([collection.split('.'),id]);
const persisted=Object.entries(snapshot).flatMap(([collection,values])=>values.map(value=>({key:key(collection,value.id||'refs'),value})));
const own=schedulingSkillsProjection(persisted,'multi',false);assert.equal(own.length,1);assert.deepEqual(Object.keys(own[0].value),['id','personId','specialSkills']);
const manager=schedulingSkillsProjection(persisted,'manager',true);assert.equal(manager.length,personnel.length);
const foreign=schedulingSkillsProjection(persisted,'outsideManager',true);assert.equal(foreign.length,0);
console.log('Definable staffing categories: advisory qualification warnings, multi-skill matching, wrong-mix shortages, duplicate people, leave/coverage, history, browser/API category slots, and scoped HR projection passed.');

// Existing variable rotations and effective windows must remain backwards-compatible.
const variable={id:'rotation',patternType:'rotation',daysOn:3,daysOff:4,startDate:'2099-01-01',endDate:'2099-01-14'};
const roAssignment={personId:'multi',shiftId:'rotation',startDate:'2099-01-01',endDate:null};
assert.equal(assignmentOnDuty(roAssignment,variable,'2098-12-31'),false);
assert.equal(assignmentOnDuty(roAssignment,variable,'2099-01-01'),true);
assert.equal(assignmentOnDuty(roAssignment,variable,'2099-01-03'),true);
assert.equal(assignmentOnDuty(roAssignment,variable,'2099-01-04'),false);
assert.equal(assignmentOnDuty(roAssignment,variable,'2099-01-08'),true);
assert.equal(assignmentOnDuty(roAssignment,variable,'2099-01-15'),false);
// Preferred coverage never changes the minimum staffing pass/fail decision.
const preferred=[{id:'law',name:'Law Dispatcher',requiredSkill:'Law Dispatch',count:1,preferredCount:2},{id:'fire',name:'Fire Dispatcher',requiredSkill:'Fire Dispatch',count:1,preferredCount:2}];
assert.equal(staffingSummary(preferred,[{personId:'multi',staffingCategoryId:'law'},{personId:'fire1',staffingCategoryId:'fire'}],2,records).ok,true);
assert.equal(staffingSummary(preferred,[{personId:'multi',staffingCategoryId:'law'},{personId:'fire1',staffingCategoryId:'fire'}],2,records).preferredNeeded,2);
assert.throws(()=>validateStaffingRequirements([{...preferred[0],preferredCount:0}]),/Preferred staffing/);
const surplus=[{personId:'multi',staffingCategoryId:'law'},{personId:'law2',staffingCategoryId:'law'},{personId:'fire1',staffingCategoryId:'fire'}];
const proposals=suggestStaffingReassignments([{id:'law',name:'Law',requiredSkill:'Law Dispatch',count:1},{id:'call',name:'Call',requiredSkill:'Call Taking',count:1},{id:'fire',name:'Fire',requiredSkill:'Fire Dispatch',count:1}],surplus,records);
assert.equal(proposals.length,1);
assert.equal(proposals[0].personId,'multi');
assert.equal(proposals[0].toCategoryId,'call');
assert.equal(proposals[0].requiresApproval,true);
assert.equal(surplus[0].staffingCategoryId,'law'); // Planning never mutates assignments.
assert.equal(suggestStaffingReassignments(preferred,[{personId:'multi',staffingCategoryId:'law'},{personId:'fire1',staffingCategoryId:'fire'}],records).length,0);
// Verify critical UX wiring remains present in the browser module.
assert.match(source,/data-sched-day/);
assert.match(source,/function openSchedulingDayDetail\(/);
assert.match(source,/pm-calendar-detail-sheet/);
assert.match(source,/data-sched-review-assignment/);
assert.match(source,/canManageScheduleShift\(shift\)/);
assert.match(source,/staffingTemplateName/);
assert.match(source,/fShiftStaffNeedsTemplateName/);
assert.match(source,/fShiftStartDate/);
assert.match(source,/fShiftEndDate/);
assert.match(source,/pmStepBack/);
assert.match(source,/pmStepNext/);
console.log('Preferred thresholds and non-mutating, approval-required backfill proposals passed.');
