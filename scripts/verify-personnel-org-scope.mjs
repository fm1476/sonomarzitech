import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/core.mjs',import.meta.url),'utf8');
for(const fragment of [
 'loadPersonnelScope(client,workspaceAuth)',
 "collection==='pm.records'||collection==='personnel'",
 'personnelScopeAllows(personnelScope,record.value,workspaceAuth,personnelUnits)',
 "collection==='pm.records'&&!roleHasAbility(abilityMap,workspaceAuth.roleIds,'pm_records_view')",
 "scope && (!personnelScopeAllows(scope,afterValue||beforeValue,workspaceAuth)"
]) assert.ok(source.includes(fragment),fragment);
assert.match(source,/The record is outside your authorized organizational scope/);
console.log('Personnel organizational authorization integration checks passed.');
