import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lambdas/api/field-training.mjs',import.meta.url),'utf8');
for(const expected of [
  "ftLoadOrgScope(client,ctx)",
  "tenant_id=$1 AND agency_id=$2 AND user_id=$3",
  "canAccessOrganizationalRecord(scope",
  "ctx.orgScope=org.scope;ctx.orgAllowed=org.allowed",
  "members.filter(m=>org.allowed.has(m.user_id))",
  "if(!ftOrgAllowsEnrollment(ctx,e))return false",
  "if(enrollmentId)ftAssertOrgEnrollment(ctx,ftEnrollmentFor(state,enrollmentId))",
  "action==='save_config'",
  "[payload.traineeUser,payload.trainerUser,payload.supervisorUser].every",
  "[e.trainee_user,payload.trainerUser,payload.supervisorUser].every",
  "org.allowed.has(payload.coverUser)"
])assert.ok(source.includes(expected),expected);
assert.match(source,/This trainee file is outside your authorized organizational scope/);
console.log('Field Training organizational scope route checks passed.');
