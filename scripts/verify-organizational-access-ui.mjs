import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../frontend/assets/js/modules/tenant-user-admin.js',import.meta.url),'utf8');
for(const pattern of [/data-org-access/,/openOrganizationalAccess/,/list_organizational_access/,/set_organizational_access/,/data-org-kind/,/orgPreview/,/TenantPlatform\.current\?\.agencyId/,/undisplayed/])assert.match(src,pattern);
assert.match(src,/not yet enforced in Personnel or Field Training/);
console.log('Organizational access user editor checks passed.');
