import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {schedulingSnapshot,scheduleWriteDecision,scopedScheduleCollections,validateSchedulingBatch} from '../lambdas/api/lib/scheduling-access.mjs';
const key=(collection,id)=>JSON.stringify([collection.split('.'),id]);
const record=(collection,value,version=1)=>({key:key(collection,value.id),value,version,deleted:false});
const groups=[{id:'patrol',visibility:'unit',unitNames:['Patrol'],managerIds:['scheduler']},{id:'dispatch',visibility:'unit',unitNames:['Dispatch'],managerIds:['dispatcherScheduler']}];
const seed=[...groups.map(g=>record('pm.scheduleWorkGroups',g)),record('personnel',{id:'officer',unit:'Patrol'}),record('personnel',{id:'dispatcher',unit:'Dispatch'}),record('pm.scheduleShifts',{id:'p',workGroupId:'patrol',daysOn:4,daysOff:4}),record('pm.scheduleShifts',{id:'d',workGroupId:'dispatch',daysOn:4,daysOff:4}),record('pm.overtimeOpportunities',{id:'ot',shiftId:'p',date:'2026-10-10',status:'open',requests:[]}),record('pm.extraDutyJobs',{id:'job',workGroupId:'patrol',status:'open',slots:1}),record('pm.extraDutySignups',{id:'s1',jobId:'job',personId:'officer',status:'pending'}),record('pm.extraDutySignups',{id:'s2',jobId:'job',personId:'dispatcher',status:'pending'})];
let database=new Map(seed.map(r=>[r.key,r])),working=null,workspace,abilities,commands=[],auditEntries=[];
const clone=rows=>new Map([...rows].map(([k,v])=>[k,structuredClone(v)]));
const client={query:async(sql,parameters=[])=>{
  commands.push(sql);
  if(sql==='BEGIN'){working=clone(database);return {rows:[]};}
  if(sql==='COMMIT'){database=working;working=null;return {rows:[]};}
  if(sql==='ROLLBACK'){working=null;return {rows:[]};}
  if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
  if(sql.includes('SELECT key,value FROM suite_records'))return {rows:[...working.values()].filter(r=>!r.deleted)};
  if(sql.includes('CREATE TABLE IF NOT EXISTS suite_activity_log'))return {rows:[]};
  if(sql.includes('INSERT INTO suite_activity_log')){auditEntries.push(parameters);return {rows:[]};}
  if(sql.includes('SELECT key, value, deleted'))return {rows:[...working.values()].filter(r=>!r.deleted)};
  if(sql.includes('SELECT version, deleted, value'))return {rows:working.has(parameters[2])?[working.get(parameters[2])]:[]};
  if(sql.includes('INSERT INTO suite_records')||sql.includes('UPDATE suite_records')){
    working.set(parameters[2],{key:parameters[2],value:JSON.parse(parameters[3]),version:parameters[4],deleted:parameters[5]});return {rows:[]};
  }
  throw Error('Unexpected SQL in scheduling API regression: '+sql);
}};
const context={schedulingSnapshot,scheduleWriteDecision,scopedScheduleCollections,validateSchedulingBatch,DEMO_TENANT_ID:'unused',DEMO_AGENCY_ID:'unused',response:(status,body)=>({status,body}),resolveWorkspaceMembership:async()=>workspace,loadRoleAbilityMap:async()=>new Map([['assigned',Object.fromEntries(abilities.map(a=>[a,true]))]]),authorizeOfficerSelfServiceChange:async()=>({allowed:false}),authorizeFleetQmChange:async()=>null,authorizeK9SubpoenaCivilChange:async()=>null,authorizeDroneEodGrantsChange:async()=>null,authorizePersonnelSharedChange:async()=>null,authorizePermitsChange:async()=>null};
vm.createContext(context);
const apiSource=fs.readFileSync('lambdas/api/apply-changes.mjs','utf8').replace(/import[\s\S]*?from "\.\/[^"\n]+";\n/g,'').replace('export { applyChanges };','globalThis.applySchedulingChanges=applyChanges;');
vm.runInContext(apiSource,context);
const act=async(personId,grants,changes,admin=false)=>{
  workspace={tenantId:'tenant',agencyId:'agency',personId,roleIds:['assigned'],admin};abilities=grants;commands=[];
  return context.applySchedulingChanges(client,{userId:personId},{tenant_id:'tenant',agency_id:'agency',changes:changes.map(c=>({...c,expected_version:database.get(c.key)?.version||0}))});
};
const change=(collection,value)=>({key:key(collection,value.id),value,deleted:false});
let result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleShifts',{id:'d',workGroupId:'dispatch',name:'Unauthorized edit'})]);
assert.equal(result.status,403);assert(!database.get(key('pm.scheduleShifts','d')).value.name);assert.equal(commands.at(-1),'ROLLBACK');
const ot=database.get(key('pm.overtimeOpportunities','ot')).value;
result=await act('officer',['pm_overtime_optin'],[change('pm.overtimeOpportunities',{...ot,requests:[{personId:'officer',status:'pending',requestedAt:'now'}]})]);
assert.equal(result.status,200);assert.equal(database.get(key('pm.overtimeOpportunities','ot')).value.requests.length,1);
result=await act('officer',['pm_overtime_optin'],[change('pm.overtimeOpportunities',{...ot,status:'closed'})]);
assert.equal(result.status,403);assert.equal(database.get(key('pm.overtimeOpportunities','ot')).value.status,'open');
// A restricted manager sees only their collection order; appending must preserve hidden IDs.
database.set(key('pm.scheduleAssignments','$order'),{key:key('pm.scheduleAssignments','$order'),value:['hiddenAssignment'],version:1,deleted:false});
result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleAssignments',{id:'newAssignment',personId:'officer',shiftId:'p',startDate:'2026-10-01'}),{key:key('pm.scheduleAssignments','$order'),value:['newAssignment'],deleted:false}]);
assert.equal(result.status,200);assert.deepEqual(Array.from(database.get(key('pm.scheduleAssignments','$order')).value),['hiddenAssignment','newAssignment']);
// Replay two approvals against refreshed database snapshots. The second cannot overfill the job.
result=await act('scheduler',['pm_extraduty_manage'],[change('pm.extraDutySignups',{...database.get(key('pm.extraDutySignups','s1')).value,status:'approved'})]);
assert.equal(result.status,200);
assert(commands.findIndex(c=>c.includes('pg_advisory_xact_lock'))<commands.findIndex(c=>c.includes('SELECT key, value, deleted')));
result=await act('scheduler',['pm_extraduty_manage'],[change('pm.extraDutySignups',{...database.get(key('pm.extraDutySignups','s2')).value,status:'approved'})]);
assert.equal(result.status,403);assert.equal(database.get(key('pm.extraDutySignups','s2')).value.status,'pending');assert.equal(commands.at(-1),'ROLLBACK');
// An otherwise allowed write bundled with a cross-group write rolls back as one transaction.
result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleShifts',{id:'p',workGroupId:'patrol',name:'Allowed but rolled back'}),change('pm.scheduleShifts',{id:'d',workGroupId:'dispatch',name:'Denied'})]);
assert.equal(result.status,403);assert(!database.get(key('pm.scheduleShifts','p')).value.name);
// Agency administrators retain cross-group management, while capacity validation still applies.
result=await act('admin',[],[change('pm.scheduleShifts',{id:'d',workGroupId:'dispatch',name:'Administrator edit'})],true);
assert.equal(result.status,200);assert.equal(database.get(key('pm.scheduleShifts','d')).value.name,'Administrator edit');
console.log('Scheduling API pipeline, order preservation, transaction rollback, and serialized approval checks passed.');

// Actual API save: bidding-only manager applies awards, closes history, preserves hidden order.
const {planShiftBidAward}=await import('../lambdas/api/lib/shift-bid-planner.mjs');
const bid={id:'bid',workGroupId:'patrol',type:'shift',status:'open',effectiveDate:'2099-01-01',shiftSlots:{p:1},submissions:[{personId:'officer',prefs:['p']}]};
database.set(key('pm.bidCycles','bid'),record('pm.bidCycles',bid));
const state=schedulingSnapshot([...database.values()]);
const plan=planShiftBidAward(bid,[],state['pm.scheduleShifts'],state['pm.scheduleAssignments'],'2098-01-01');
const award={...bid,status:'awarded',awards:plan.awards};
const bidChanges=[change('pm.bidCycles',award),...plan.updates.map(a=>change('pm.scheduleAssignments',a)),{key:key('pm.scheduleAssignments','$order'),value:plan.updates.map(a=>a.id),deleted:false}];
result=await act('scheduler',['pm_bidding_manage'],bidChanges.filter(c=>JSON.parse(c.key)[1]!=='newAssignment'));
assert.equal(result.status,403);assert.equal(database.get(key('pm.bidCycles','bid')).value.status,'open');assert.equal(database.get(key('pm.scheduleAssignments','newAssignment')).value.endDate,undefined);
result=await act('scheduler',['pm_bidding_manage'],bidChanges);
assert.equal(result.status,200,JSON.stringify(result.body));
assert.equal(database.get(key('pm.scheduleAssignments','newAssignment')).value.endDate,bid.effectiveDate);
assert.equal(database.get(key('pm.scheduleAssignments',plan.awards[0].assignmentId)).value.bidCycleId,'bid');
assert(database.get(key('pm.scheduleAssignments','$order')).value.includes('hiddenAssignment'));
result=await act('scheduler',['pm_bidding_manage'],[change('pm.bidCycles',{...award,status:'open'})]);
assert.equal(result.status,403);assert.equal(database.get(key('pm.bidCycles','bid')).value.status,'awarded');
console.log('Bidding-only API award, linked order writes, history, and repeat rejection passed.');

// Direct multi-person event assignment persists without staff opt-in requests.
const directEvent={id:'directEvent',name:'Parade',eligibleWorkGroupIds:['patrol'],status:'published',staffNeeded:2,startDate:'2099-03-01',endDate:'2099-03-02',requests:[]};
database.set(key('pm.specialEvents',directEvent.id),record('pm.specialEvents',directEvent));
database.set(key('personnel','partner'),record('personnel',{id:'partner',unit:'Patrol'}));
const directAward={...directEvent,requests:[{personId:'officer',status:'awarded',source:'manual',awardedBy:'scheduler'},{personId:'partner',status:'awarded',source:'manual',awardedBy:'scheduler'}]};
const eventException={id:'manualEventException',personId:'officer',code:'EVT',sourceEventId:directEvent.id,startDate:directEvent.startDate,endDate:directEvent.endDate};
result=await act('officer',['pm_overtime_optin'],[change('pm.specialEvents',directAward),change('pm.scheduleExceptions',eventException)]);
assert.equal(result.status,403);assert.equal(database.get(key('pm.specialEvents',directEvent.id)).value.requests.length,0);
result=await act('scheduler',['pm_schedule_manage'],[change('pm.specialEvents',directAward),change('pm.scheduleExceptions',eventException)]);
assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(database.get(key('pm.specialEvents',directEvent.id)).value.requests.length,2);
assert.equal(database.get(key('pm.scheduleExceptions',eventException.id)).value.sourceEventId,directEvent.id);
result=await act('scheduler',['pm_schedule_manage'],[change('pm.specialEvents',{...directAward,requests:[...directAward.requests,{personId:'dispatcher',status:'awarded',source:'manual'}]})]);
assert.equal(result.status,403);assert.equal(database.get(key('pm.specialEvents',directEvent.id)).value.requests.length,2);
console.log('API direct multi-person special assignments, staff denial, linked exception, and overcapacity rollback passed.');

// Authoritative skill matching in the actual API pipeline, including a forged staff skill grant.
const classNeeds=[{id:'law',name:'Law Dispatcher',requiredSkill:'Law Dispatch',count:2},{id:'fire',name:'Fire Dispatcher',requiredSkill:'Fire Dispatch',count:2},{id:'call',name:'Call Taker',requiredSkill:'Call Taking',count:1}];
result=await act('admin',[],[change('pm.refData',{id:'refs',skillsCatalog:['Law Dispatch','Fire Dispatch','Call Taking']}),change('pm.records',{id:'officerSkills',personId:'officer',specialSkills:['Law Dispatch','Call Taking']})],true);
assert.equal(result.status,200);assert(commands.some(c=>c.includes('pg_advisory_xact_lock')));
const classShift={id:'classShift',workGroupId:'patrol',minStaff:5,staffingRequirements:classNeeds,patternType:'weekly',weekdays:[0,1,2,3,4,5,6]};
result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleShifts',classShift)]);assert.equal(result.status,200,JSON.stringify(result.body));
const classAssignment={id:'classAssignment',personId:'officer',shiftId:classShift.id,startDate:'2102-01-01',staffingCategoryId:'fire'};
result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleAssignments',classAssignment)]);assert.equal(result.status,403);assert(!database.has(key('pm.scheduleAssignments',classAssignment.id)));
result=await act('scheduler',['pm_schedule_manage'],[change('pm.scheduleAssignments',{...classAssignment,staffingCategoryId:'call'})]);assert.equal(result.status,200,JSON.stringify(result.body));
const typedOt={id:'typedOt',shiftId:classShift.id,date:'2101-01-01',staffingCategoryId:'fire',status:'open',requests:[]};
database.set(key('pm.overtimeOpportunities',typedOt.id),record('pm.overtimeOpportunities',typedOt));
result=await act('officer',['pm_overtime_optin'],[change('pm.overtimeOpportunities',{...typedOt,requests:[{personId:'officer',status:'pending'}]})]);assert.equal(result.status,403);
result=await act('officer',['pm_overtime_optin'],[change('pm.records',{id:'officerSkills',personId:'officer',specialSkills:['Fire Dispatch']}),change('pm.overtimeOpportunities',{...typedOt,requests:[{personId:'officer',status:'pending'}]})]);
assert.equal(result.status,403);assert.deepEqual(Array.from(database.get(key('pm.records','officerSkills')).value.specialSkills),['Law Dispatch','Call Taking']);assert.equal(database.get(key('pm.overtimeOpportunities',typedOt.id)).value.requests.length,0);
console.log('API category assignments, multi-skill eligibility, skill-write locking, ineligible overtime, and forged skill-grant rollback passed.');

// Court/leave validation executes inside the real API transaction.
const court={id:'court1',personId:'officer',courtDate:'2105-04-10',status:'Active'};
const leave={id:'leave1',personId:'officer',startDate:'2105-04-10',endDate:'2105-04-11',code:'VAC',status:'pending'};
database.set(key('subpoena.subpoenas',court.id),record('subpoena.subpoenas',court));
database.set(key('pm.leaveRequests',leave.id),record('pm.leaveRequests',leave));
result=await act('admin',[],[change('pm.leaveRequests',{...leave,status:'approved'})],true);
assert.equal(result.status,403);assert.equal(database.get(key('pm.leaveRequests',leave.id)).value.status,'pending');
const exception={id:'courtLeaveException',personId:'officer',code:'VAC',startDate:leave.startDate,endDate:leave.endDate};
const override={reason:'Court coordinator approved alternate coverage',approvedBy:'admin',subpoenas:[{id:court.id}]};
result=await act('admin',[],[change('pm.leaveRequests',{...leave,status:'approved',exceptionId:exception.id,courtConflictOverride:{...override,approvedBy:'forged'}}),change('pm.scheduleExceptions',exception)],true);
assert.equal(result.status,403);assert(!database.has(key('pm.scheduleExceptions',exception.id)));
result=await act('admin',[],[change('pm.leaveRequests',{...leave,status:'approved',exceptionId:exception.id,courtConflictOverride:override}),change('pm.scheduleExceptions',exception)],true);
assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(auditEntries.length,1);assert(auditEntries[0][8].includes(court.id));assert(auditEntries[0][8].includes(override.reason));
assert(commands.findIndex(c=>c.includes('court-leave')||c.includes('pg_advisory_xact_lock'))<commands.findIndex(c=>c.includes('SELECT key,value')));
const newCourt={...court,id:'court2'};
result=await act('admin',[],[change('subpoena.subpoenas',newCourt)],true);assert.equal(result.status,403);assert(!database.has(key('subpoena.subpoenas',newCourt.id)));
result=await act('admin',[],[change('subpoena.subpoenas',{...newCourt,assignmentConflictPending:true})],true);assert.equal(result.status,200,JSON.stringify(result.body));
result=await act('admin',[],[change('pm.scheduleExceptions',{...exception,id:'bypass'})],true);assert.equal(result.status,403);assert(!database.has(key('pm.scheduleExceptions','bypass')));
console.log('Court conflict rejection, documented approval override, audit recording, subpoena intake flag, and direct exception bypass checks passed.');

// Calendar deletion is scoped to assigned managers and rejects linked history.
const emptyCalendar={id:'emptyCalendar',name:'Unused',active:true,managerIds:['scheduler'],visibility:'selected'};
const inactiveCalendar={...emptyCalendar,id:'inactiveCalendar',active:false};
for(const calendar of [emptyCalendar,inactiveCalendar])database.set(key('pm.scheduleWorkGroups',calendar.id),record('pm.scheduleWorkGroups',calendar));
const removeCalendar=calendar=>({...change('pm.scheduleWorkGroups',calendar),deleted:true});
result=await act('dispatcherScheduler',['pm_schedule_manage'],[removeCalendar(emptyCalendar)]);assert.equal(result.status,403);assert(database.has(key('pm.scheduleWorkGroups',emptyCalendar.id)));
result=await act('scheduler',[],[removeCalendar(emptyCalendar)]);assert.equal(result.status,403);
result=await act('scheduler',['pm_schedule_manage'],[removeCalendar(groups[0])]);assert.equal(result.status,403);assert(!database.get(key('pm.scheduleWorkGroups','patrol')).deleted);
database.set(key('pm.scheduleWorkGroups','$order'),{key:key('pm.scheduleWorkGroups','$order'),value:['patrol','dispatch','emptyCalendar','inactiveCalendar'],version:1,deleted:false});
result=await act('scheduler',['pm_schedule_manage'],[removeCalendar(emptyCalendar),{key:key('pm.scheduleWorkGroups','$order'),value:['patrol','inactiveCalendar'],deleted:false}]);
assert.equal(result.status,200,JSON.stringify(result.body));assert(database.get(key('pm.scheduleWorkGroups',emptyCalendar.id)).deleted);assert(database.get(key('pm.scheduleWorkGroups','$order')).value.includes('dispatch'));
result=await act('scheduler',['pm_schedule_manage'],[removeCalendar(inactiveCalendar)]);assert.equal(result.status,200,JSON.stringify(result.body));
const adminCalendar={...emptyCalendar,id:'adminCalendar',managerIds:[]};database.set(key('pm.scheduleWorkGroups',adminCalendar.id),record('pm.scheduleWorkGroups',adminCalendar));
result=await act('admin',[],[removeCalendar(adminCalendar)],true);assert.equal(result.status,200,JSON.stringify(result.body));
result=await act('admin',[],[change('pm.scheduleShifts',{id:'lateShift',workGroupId:adminCalendar.id})],true);assert.equal(result.status,403);assert(!database.has(key('pm.scheduleShifts','lateShift')));
console.log('Calendar deletion: assigned manager and admin access, other-manager denial, linked-history protection, inactive calendars, hidden order preservation, and stale calendar reference rejection passed.');
