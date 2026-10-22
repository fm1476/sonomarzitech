import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/core.mjs',import.meta.url),'utf8');
for(const fragment of [
 'loadPersonnelScope(client,workspaceAuth)',
 "PERSONNEL_SCOPED_COLLECTIONS.has(collection)",
 'personnelScopeAllows(personnelScope,record.value,workspaceAuth,personnelUnits)',
 "collection==='pm.records'&&!roleHasAbility(abilityMap,workspaceAuth.roleIds,'pm_records_view')",
 "scope && (!personnelScopeAllows(scope,afterValue||beforeValue,workspaceAuth)"
]) assert.ok(source.includes(fragment),fragment);
assert.match(source,/The record is outside your authorized organizational scope/);
console.log('Personnel organizational authorization integration checks passed.');

const attachments=source.slice(source.indexOf('async function fieldTrainingAttachmentScopeAllowed('),source.indexOf('async function attachmentParentWriteAllowed('));
assert.match(attachments,/suite_memberships/);
assert.match(attachments,/canAccessOrganizationalRecord\(scope/);
assert.match(attachments,/if\(!await fieldTrainingAttachmentScopeAllowed\(client,workspaceAuth,enrollment\)\)continue/);
console.log('Field Training signed URL scope checks passed.');

for(const name of ['pm.trainingRecords','pm.trainingRequests','pm.disciplinaryActions','pm.inquiries','pm.instructors'])assert.ok(source.includes("'"+name+"'"),name);
assert.match(source,/PERSONNEL_SCOPED_COLLECTIONS\.has\(collection\)/);
console.log('Related employee collection organizational checks passed.');

const gated=source.slice(source.indexOf('const { collection, itemId } = parsed;',source.indexOf('const personnelScope=await loadPersonnelScope')),source.indexOf('if(personnelScope && PERSONNEL_SCOPED_COLLECTIONS.has(collection))'));
assert.match(gated,/moduleLicensed\(workspaceAuth\.enabledModules, collection\)/,'Licensed modules must be checked before scoped aggregate projections');
