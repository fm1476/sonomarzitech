import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const shell=fs.readFileSync('frontend/assets/js/modules/shell.js','utf8');
const personnel=fs.readFileSync('frontend/assets/js/modules/personnel.js','utf8');
const suiteUx=fs.readFileSync('frontend/assets/js/modules/suite-ux.js','utf8');
let grants=[],licensed=true;
const context={can:ability=>grants.includes(ability),TenantPlatform:{moduleEnabled:()=>licensed},STATE:{enabledModules:['personnel']}};
vm.createContext(context);
vm.runInContext(shell.slice(0,shell.indexOf('function renderSuiteNav(){'))+'\nglobalThis.moduleMeta=MODULE_META;',context);
for(const ability of context.moduleMeta.scheduling.accessAbilities){
  grants=[ability];assert.equal(context.moduleAccess('scheduling'),true,ability);assert.equal(context.moduleAccess('personnel'),false,'Scheduling ability must not grant HR access');assert(context.accessibleModules().includes('scheduling'),'Existing tenant keeps scheduling access');
}
grants=[];assert.equal(context.moduleAccess('scheduling'),false);
grants=['pm_schedule_view'];licensed=false;assert.equal(context.moduleAccess('scheduling'),false);
licensed=true;context.STATE.enabledModules=['fleet'];assert(!context.accessibleModules().includes('scheduling'));
context.STATE.enabledModules=['scheduling'];assert(context.accessibleModules().includes('scheduling'));
const nav=personnel.slice(personnel.indexOf('const NAV_ITEMS = ['),personnel.indexOf('function renderNav(){'));
vm.runInContext(nav+'\nglobalThis.personnelNav=NAV_ITEMS;globalThis.scheduleNav=SCHEDULING_NAV_ITEMS;',context);
vm.runInContext(personnel.slice(personnel.indexOf('const SCHED_TABS = ['),personnel.indexOf('function renderScheduling(){')),context);
vm.runInContext(personnel.slice(personnel.indexOf('function schedulingModuleAccess(){'),personnel.indexOf('function renderSchedulingDashboard(){')),context);
assert(!context.personnelNav.some(item=>item.id==='pm-scheduling'));
assert(context.scheduleNav.some(item=>item.id==='pm-scheduling'));
assert.equal(context.scheduleNav[0].id,'sched-dashboard');
grants=['pm_leave_request_submit'];assert(context.navItemVisible(context.scheduleNav[1]));assert(!context.navItemVisible(context.personnelNav[0]));
grants=[];assert(!context.navItemVisible(context.scheduleNav[0]));
// The old saved URL resolves through Scheduling, while HR routes remain Personnel.
const routeContext={PM:{NAV_ITEMS:context.personnelNav},SCHEDULING:{NAV_ITEMS:context.scheduleNav},QM:{NAV_ITEMS:[]},FLEET:{NAV_ITEMS:[]},K9:{NAV_ITEMS:[]},DRONE:{NAV_ITEMS:[]},EOD:{NAV_ITEMS:[]},SUBPOENA:{NAV_ITEMS:[]},GRANTS:{NAV_ITEMS:[]},CIVIL:{NAV_ITEMS:[]},PERMITS:{NAV_ITEMS:[]}};
vm.createContext(routeContext);
const modulesLine=suiteUx.split('\n').find(line=>line.includes('const modules=()=>'));
const metaLine=suiteUx.split('\n').find(line=>line.includes('function metaFor(id)'));
vm.runInContext(modulesLine+'\n'+metaLine,routeContext);
assert.equal(routeContext.metaFor('pm-scheduling').mod,'scheduling');assert.equal(routeContext.metaFor('pm-records').mod,'personnel');assert.equal(routeContext.metaFor('sched-dashboard').mod,'scheduling');
assert(!personnel.includes("tabs.push(['schedulingSettings'"));assert(!personnel.includes("tabs.push(['exceptionCodes'"));
console.log('Standalone Scheduling access, HR isolation, existing tenant compatibility, disabled licensing, module navigation, and saved URL routing checks passed.');

let permitted=true,saved=true,confirmed=true;
const deleteContext={CURRENT_USER_ID:'tester',STATE:{pm:{scheduleWorkGroups:[{id:'deleteMe',name:'Delete Me'}],scheduleShifts:[],scheduleAssignments:[],specialEvents:[]}},SCHED_CAL_WORKGROUPS:['deleteMe','other'],canManageWorkGroup:()=>permitted,confirm:()=>confirmed,persist:()=>{},SuiteStore:{flush:async()=>saved},toast:()=>{},logActivity:()=>{},renderScheduling:()=>{},closeModal:()=>{}};
vm.createContext(deleteContext);
vm.runInContext(personnel.slice(personnel.indexOf('function calendarDeletionLinks(id){'),personnel.indexOf('function selectedCalendarWorkGroups(){')),deleteContext);
permitted=false;await deleteContext.deleteScheduleCalendar('deleteMe');assert.equal(deleteContext.STATE.pm.scheduleWorkGroups.length,1);
permitted=true;deleteContext.STATE.pm.scheduleShifts=[{id:'linked',workGroupId:'deleteMe'}];deleteContext.STATE.pm.scheduleAssignments=[{id:'assigned',shiftId:'linked'}];
confirmed=false;await deleteContext.deleteScheduleCalendar('deleteMe');assert.equal(deleteContext.STATE.pm.scheduleWorkGroups.length,1);
confirmed=true;saved=false;await deleteContext.deleteScheduleCalendar('deleteMe');assert.equal(deleteContext.STATE.pm.scheduleWorkGroups.length,1);
saved=true;await deleteContext.deleteScheduleCalendar('deleteMe');assert.equal(deleteContext.STATE.pm.scheduleWorkGroups.length,0);assert.equal(deleteContext.STATE.pm.scheduleShifts.length,0);assert.equal(deleteContext.STATE.pm.scheduleAssignments.length,0);
assert.equal(deleteContext.STATE.pm.deletedCalendarArchives.length,1);assert.deepEqual(Array.from(deleteContext.SCHED_CAL_WORKGROUPS),['other']);
console.log('Calendar delete action: permission denial, linked record warning, cancellation, save failure restoration, archived cleanup and filter cleanup passed.');
