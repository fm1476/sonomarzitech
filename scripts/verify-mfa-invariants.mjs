import fs from 'node:fs';

function read(path){ return fs.readFileSync(path,'utf8'); }
function must(haystack, needle, label){
  if(!haystack.includes(needle)){
    console.error(`ERROR: MFA invariant failed: ${label}`);
    process.exit(1);
  }
}

const core=read('lambdas/api/core.mjs');
const auth=read('frontend/assets/js/custom-auth.js');
const identity=read('lambdas/identity-admin/index.mjs');

must(core, 't.metadata,', 'workspace membership query must load tenant metadata');
must(core, 'mfa_policy: workspaceAuth.mfaPolicy', 'workspace response must expose MFA policy');
must(auth, "AssociateSoftwareToken", 'frontend must support TOTP enrollment');
must(auth, "VerifySoftwareToken", 'frontend must verify TOTP enrollment');
must(auth, "SetUserMFAPreference", 'frontend must enable and prefer TOTP');
must(auth, "SOFTWARE_TOKEN_MFA", 'frontend must support MFA sign-in challenge');
must(auth, "enforceWorkspaceMfa", 'frontend must enforce tenant MFA policy before starting the app');
must(identity, "MfaConfiguration:'OPTIONAL'", 'Cognito pool must remain optional for tenant-specific policy enforcement');
must(identity, 'SoftwareTokenMfaConfiguration:{Enabled:true}', 'Cognito TOTP capability must remain enabled');

console.log('MFA invariants passed.');
