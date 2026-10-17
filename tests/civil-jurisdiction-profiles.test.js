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

assert.equal(profiles.reviewIntake('possession',{}).ready,false);
assert.equal(profiles.reviewIntake('unsupported',{}).ready,false);
assert.equal(profiles.reviewIntake('possession',{
 caseNumber:'CV-123',courtOfOrigin:'Superior Court',receivedDate:'2026-10-17',
 signedInstructions:'signed',writDocument:'document',propertyAddress:'123 Main St'
}).ready,true);
assert.equal(profiles.reviewService({serviceMethod:'Substituted Service',servedDate:'2026-10-17',servedTime:'09:00',servedOnName:'Person',serverIdentity:'Deputy'}).ready,false);
assert.equal(profiles.reviewService({serviceMethod:'Posting (Nail and Mail)',servedDate:'2026-10-17',servedTime:'09:00',servedOnName:'Person',serverIdentity:'Deputy'}).ready,false);

assert.equal(profiles.resolveWorkflow('Writ of Possession'),'possession');
assert.equal(profiles.resolveWorkflow('Other'),null);
assert.equal(profiles.reviewCase({paperType:'Other'}).ready,false);
assert.equal(profiles.reviewService({serviceMethod:'Personal Service',servedDate:'2026-10-17',servedTime:'09:00',servedOnName:'Person',serverIdentity:'Deputy'}).approved,false);
assert.equal(profiles.validateSelection(profiles.prepareSelection('US-CA','')).valid,false);
assert.equal(profiles.validateSelection({...profiles.prepareSelection('US-CA','Sonoma'),status:'active'}).valid,false);

assert.equal(profiles.reviewWrit({issuedDate:'2026-02-30',writExpirationDate:'2026-12-01',writDocument:'doc',courtOfOrigin:'court'},'2026-10-17').ready,false);
assert.equal(profiles.reviewWrit({issuedDate:'2026-01-01',writExpirationDate:'2026-02-01',writDocument:'doc',courtOfOrigin:'court'},'2026-10-17').ready,false);
assert.equal(profiles.reviewWrit({issuedDate:'2026-01-01',writExpirationDate:'2026-12-01',writDocument:'doc',courtOfOrigin:'court'},'2026-10-17').ready,true);
assert.equal(profiles.reviewDisbursement({amount:200,availableTrustBalance:100,payee:'Payee',accountingReference:'A1',reconciledBy:'Reviewer'}).ready,false);
assert.equal(profiles.reviewDisbursement({amount:50,availableTrustBalance:100,payee:'Payee',accountingReference:'A1',reconciledBy:'Reviewer'}).approved,false);

assert.equal(profiles.reviewDisbursement({amount:'',availableTrustBalance:'',payee:'P',accountingReference:'A',reconciledBy:'R',approvalReference:'S'}).ready,false);
assert.equal(profiles.reviewDisbursement({amount:50,availableTrustBalance:100,payee:'P',accountingReference:'A',reconciledBy:'R'}).ready,false);
assert.equal(profiles.reviewDisbursement({amount:50,availableTrustBalance:100,payee:'P',accountingReference:'A',reconciledBy:'R',approvalReference:'S'}).ready,true);
