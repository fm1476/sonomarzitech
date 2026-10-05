import fs from 'node:fs';

const shared = fs.readFileSync('frontend/assets/js/modules/shared.js','utf8');
const core = fs.readFileSync('lambdas/api/core.mjs','utf8');
const tenantAdmin = fs.readFileSync('lambdas/api/tenant-admin.mjs','utf8');

const requiredModuleAdmins = [
  'role_qm_admin',
  'role_fleet_admin',
  'role_k9_admin',
  'role_drone_admin',
  'role_eod_admin',
  'role_subpoena_admin',
  'role_grants_admin',
  'role_civil_admin',
  'role_permits_admin'
];

for (const id of requiredModuleAdmins) {
  if (!shared.includes(`id:"${id}"`)) {
    throw new Error(`Missing default module administrator role: ${id}`);
  }
}

if (!core.includes('abilities.admin_roles = false')) {
  throw new Error('Server-side admin_roles hardening is missing.');
}

for (const id of requiredModuleAdmins) {
  if (!core.includes(`"${id}"`)) {
    throw new Error(`Server-side personnel hardening is missing role: ${id}`);
  }
}

if (!tenantAdmin.includes('roleIds.includes("role_platform_admin")')) {
  throw new Error('Platform Admin agency-assignment block is missing.');
}

console.log('Role invariants passed.');
