import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const backend=readFileSync('lambdas/api/apply-changes.mjs','utf8');
const admin=readFileSync('lambdas/api/tenant-admin.mjs','utf8');
const frontend=readFileSync('frontend/assets/js/modules/civil.js','utf8');

function includes(source,part,message){assert.ok(source.includes(part),message);}
includes(backend,"const civilChanges=validated.filter(change=>String(change.path[0])==='civil')",'Civil write guard must inspect validated changes');
includes(backend,"metadata->'civilJurisdictionProfile' AS jurisdiction",'Civil write guard must use server tenant metadata');
includes(backend,"jurisdiction?.profileId==='US-CA'",'California profile must trigger server gate');
includes(backend,"change.path[1]==='jurisdictionProfile'",'Generic record API must reject jurisdiction injection');
includes(admin,"action === 'set_civil_jurisdiction_draft'",'Draft endpoint must exist');
includes(admin,"const denied = platformOnly(auth); if (denied) return denied;",'Platform admin guard must exist');
includes(admin,"current.status==='active'",'Draft endpoint must reject active profile changes');
includes(admin,"body?.status === 'active' || body?.activate === true",'Draft endpoint must reject activation injection');
includes(admin,"await platformEvent(client,auth,targetTenantId,",'Draft update must be audited');
includes(frontend,"remoteProfileRequest('get_civil_jurisdiction_profile')",'Frontend must read saved tenant profile');
includes(frontend,"remoteProfileRequest('set_civil_jurisdiction_draft'",'Frontend must write draft via tenant API');
includes(frontend,"caProfile?.profileId==='US-CA'",'Civil intake must gate California profile');
console.log('Civil jurisdiction integration invariants passed.');
