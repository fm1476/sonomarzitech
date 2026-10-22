import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/tenant-admin.mjs',import.meta.url),'utf8');
const start=source.indexOf("if (action === 'list_organizational_access' || action === 'set_organizational_access')");
const end=source.indexOf("if (action === 'update_agency_branding')",start);
assert.ok(start>0 && end>start,'Organizational administration endpoint exists');
const block=source.slice(start,end);
for (const pattern of [
 /suite_organizational_access/, /suite_memberships/, /agency_id=\$2/,
 /role_admin/, /auth\.platformAdmin/, /appendAuditEvent/,
 /ON CONFLICT/, /tenant_id/, /set_organizational_access/, /list_organizational_access/
]) assert.match(block,pattern);
assert.match(block,/\['none','self','selected'\]/,'Do not permit custom administrators to grant unrestricted agency mode');
assert.doesNotMatch(block,/\['none','self','selected','agency'\]/);
console.log('Organizational administration API structural checks passed.');

// Selected IDs must be resolved from records in the requested agency, not trusted from request input.
assert.match(block,/SELECT key,value FROM suite_records WHERE tenant_id=\$1 AND agency_id=\$2 AND deleted=false/);
assert.match(block,/collection==='pm\.records'/);
assert.match(block,/collection==='pm\.divisions'/);
assert.match(block,/collection==='pm\.scheduleWorkGroups'/);
assert.match(block,/clean\[kind\]\.filter\(id=>!known\[kind\]\.has\(id\)\)/);
assert.match(block,/if\(unknown\.length\) return response\(400/);
console.log('Organizational grant ID catalog validation checks passed.');
