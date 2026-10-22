import assert from 'node:assert/strict';
import {personnelSafeTemplate} from '../lambdas/api/lib/workspace-template.mjs';
const hidden={id:'hidden-patrol',personId:'hidden-patrol',unitId:'Patrol',name:'Hidden Patrol'};
const template={agencyName:'Demo',roles:[{id:'dispatch-manager'}],personnel:[hidden],accounts:[{password:'must-not-leak'}],pm:{records:[hidden],trainingRecords:[hidden],trainingRequests:[hidden],disciplinaryActions:[hidden],inquiries:[hidden],instructors:[hidden],extraDutySignups:[hidden],settings:{label:'Settings'}},fieldTraining:{$state:{reports:[hidden]}}};
const safe=personnelSafeTemplate(template,false);
assert.ok(!JSON.stringify(safe).includes('hidden-patrol'),'Template must not disclose filtered-out personnel identities');
assert.ok(!JSON.stringify(safe).includes('must-not-leak'),'Template must not disclose accounts');
assert.equal(safe.roles[0].id,'dispatch-manager');
assert.equal(safe.pm.settings.label,'Settings');
assert.equal(template.pm.records.length,1,'Sanitization must not mutate stored template');
assert.equal(personnelSafeTemplate(template,true),template,'Trusted administrator retains template');
// Reproduce browser defaults merged with an absent collection and with an
// authorized collection: defaults must never repopulate the hidden directory.
assert.deepEqual({...safe.pm}.records,[]);
const allowed={personId:'dispatch-only',unitId:'Dispatch'};
assert.deepEqual({...safe.pm,records:[allowed]}.records,[allowed]);
console.log('Workspace template Personnel, account and Field Training disclosure regression passed.');
