'use strict';
const assert = require('node:assert/strict');
const profiles = require('../frontend/assets/js/modules/civil-jurisdiction-profiles.js');
const ca = profiles.get('US-CA');
assert.equal(ca.state, 'CA');
assert.equal(ca.status, 'draft');
assert.equal(profiles.get('US-GENERAL').status, 'unconfigured');
assert.equal(profiles.get('unknown'), null);
const selection = profiles.prepareSelection('US-CA', 'Sonoma');
assert.deepEqual(selection, {
  profileId:'US-CA', profileVersion:ca.version, county:'Sonoma',
  status:'draft', activatedAt:null, activatedBy:null
});
assert.equal(profiles.canActivate(selection), false);
assert.throws(()=>profiles.prepareSelection('unknown','Sonoma'), /Unknown/);
assert.equal(ca.workflows.some(w=>w.id==='possession'),true);
assert.equal(ca.safeguards.statutoryFeesRequireApproval,true);
console.log('Civil jurisdiction profile safety checks passed');
