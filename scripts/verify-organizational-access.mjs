import assert from 'node:assert/strict';
import { normalizeOrganizationalScope, effectiveOrganizationalScope, canAccessOrganizationalRecord, effectiveAccessSummary } from '../lambdas/api/lib/organizational-access.mjs';

assert.deepEqual(normalizeOrganizationalScope().mode,'none');
assert.equal(canAccessOrganizationalRecord({}, {personId:'a',unitId:'patrol'}),false);
assert.equal(canAccessOrganizationalRecord({mode:'agency'}, {unitId:'patrol'}),true);
assert.equal(canAccessOrganizationalRecord({mode:'self'}, {personId:'u1'}, {actorPersonId:'u1'}),true);
assert.equal(canAccessOrganizationalRecord({mode:'self'}, {personId:'u2'}, {actorPersonId:'u1'}),false);
const combined=effectiveOrganizationalScope({grants:[
 {mode:'selected',unitIds:['communications'],divisionIds:['support']},
 {mode:'selected',unitIds:['records','communications'],workGroupIds:['dispatch']}
]});
assert.deepEqual(combined.unitIds,['communications','records']);
assert.equal(canAccessOrganizationalRecord(combined,{unitId:'communications'}),true);
assert.equal(canAccessOrganizationalRecord(combined,{unitId:'records'}),true);
assert.equal(canAccessOrganizationalRecord(combined,{unitId:'patrol'}),false);
assert.equal(canAccessOrganizationalRecord(combined,{unitId:'dispatch-night'}),false);
assert.equal(canAccessOrganizationalRecord(combined,{workGroupId:'dispatch'}),true);
assert.equal(canAccessOrganizationalRecord(combined,{unitId:'dispatch-night'},{unitDivisionMap:{'dispatch-night':'support'}}),true);
assert.equal(canAccessOrganizationalRecord({mode:'selected',unitIds:['communications']},{unitId:'comms-2'},{unitDescendants:{communications:['comms-2']}}),true);
assert.equal(effectiveOrganizationalScope({grants:[{mode:'selected',unitIds:['communications']},{mode:'agency'}]}).mode,'agency');
assert.equal(effectiveOrganizationalScope({administrator:true}).mode,'agency');
assert.equal(effectiveOrganizationalScope({grants:[]}).mode,'none');
assert.equal(effectiveAccessSummary({scope:combined,capabilities:['pm_records_view']}).capabilities[0],'pm_records_view');
console.log('Organizational access policy checks passed.');

// One manager may hold multiple independently granted organizational areas.
const multi=effectiveOrganizationalScope({grants:[
 {mode:'selected',unitIds:['dispatch-day','dispatch-night']},
 {mode:'selected',unitIds:['patrol-special'],divisionIds:['support-services'],workGroupIds:['communications-admin']}
]});
for(const id of ['dispatch-day','dispatch-night','patrol-special'])assert.equal(canAccessOrganizationalRecord(multi,{unitId:id}),true);
assert.equal(canAccessOrganizationalRecord(multi,{unitId:'patrol-other'}),false);
assert.equal(canAccessOrganizationalRecord(multi,{unitId:'forensics',divisionId:'support-services'}),true);
assert.equal(canAccessOrganizationalRecord(multi,{workGroupId:'communications-admin'}),true);
assert.equal(canAccessOrganizationalRecord(multi,{workGroupId:'fire-admin'}),false);
console.log('Multiple independent organization grant combinations passed.');
