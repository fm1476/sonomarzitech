/* Install unified shell without duplicating domain workflows. */
renderSuiteNav=()=>SuiteUX.navigation();
showLauncher=()=>SuiteUX.home();
enterModule=function(key){if(!MODULE_META[key]||!moduleAccess(key))return;const module=SuiteUX.modules()[key];const dest=module.NAV_ITEMS.find(n=>n.id.endsWith('-dashboard')&&SuiteUX.allowedView(n.id))?.id||module.NAV_ITEMS.find(n=>SuiteUX.allowedView(n.id))?.id;if(dest)SuiteUX.go(dest);};
loadState=()=>SuiteStore.load();
persist=()=>SuiteStore.persist();
setSyncStatus=function(){}; // Status is owned by confirmed storage outcomes in SuiteStore.
const previousRoleRender=renderRoleSwitcher;
renderRoleSwitcher=function(){previousRoleRender();SuiteUX.roleUI();};
renderRoleSwitcherPanel=function(){if(!SuiteUX.isAdmin()){document.getElementById('roleSwitcherPanel').style.display='none';return;}const panel=document.getElementById('roleSwitcherPanel');const allowed=STATE.roles.filter(r=>!r.hidden||loggedInPersonHasRole('role_platform_admin'));panel.innerHTML='<div style="padding:16px"><strong>View as other roles</strong><p style="font-size:12px;color:var(--text-dim)">Preview the workspace permissions. Actions remain attributed to your signed-in account.</p><div id="rolePreviewOptions"></div><button id="applyPreview" class="btn btn-primary" style="margin-top:12px">Apply preview</button></div>';const options=panel.querySelector('#rolePreviewOptions');allowed.forEach(r=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:center;padding:7px 0;font-size:13px';const input=document.createElement('input');input.type='checkbox';input.value=r.id;input.checked=STATE.currentRoleIds.includes(r.id);label.append(input,document.createTextNode(r.name));options.append(label);});panel.querySelector('#applyPreview').onclick=()=>{if(!SuiteUX.isAdmin())return;const ids=[...options.querySelectorAll('input:checked')].map(i=>i.value);if(!ids.length){toast('Select at least one role.',true);return;}if(!SuiteUX.guard())return;SuiteUX.clearDirty();STATE.currentRoleIds=ids;panel.style.display='none';logAuditEntry('Shared','Role preview changed to '+ids.join(', '),'auth');renderRoleSwitcher();SuiteUX.home();};};
startShell=function(){applyAgencyBranding();renderRoleSwitcher();renderSuiteNav();document.getElementById('btnSwitchModule').onclick=showLauncher;document.getElementById('btnResetDemo').onclick=async()=>{if(!SuiteUX.isAdmin()||SuiteStore.mode()!=='local'){toast('Demo reset is available only to administrators in the local demo.',true);return;}if(!confirm('Reset the demo records on this device? Export a backup first if you need these changes.'))return;STATE=await buildSeedState();STATE.currentRoleIds=[...(STATE.personnel.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[])];persist();await SuiteStore.flush();SuiteUX.home();};document.getElementById('btnLogout').onclick=async()=>{const btn=document.getElementById('btnLogout');if(btn.disabled)return;btn.disabled=true;try{await logout();}finally{btn.disabled=false;}};document.getElementById('btnChangePassword').onclick=()=>{if(SuiteStore.mode()==='shared'){openSharedPassword();return;}openChangePasswordModal();};document.getElementById('btnNotifBell').onclick=e=>{e.stopPropagation();toggleNotifPanel();};renderNotifBell();StaffNotices.loadInbox().catch(e=>console.warn('Notice inbox unavailable',e));FieldTraining.load().catch(e=>console.warn('Field Training unavailable',e));const destination=location.hash.replace(/^#\//,'');if(destination&&destination!=='content')SuiteUX.navigate(destination);else SuiteUX.home();};
attemptLogin=async function(){const error=document.getElementById('loginError'),login=document.getElementById('btnLogin');if(window.SONOMARZI_AWS_DEV&&typeof window.SonoMarziAwsAuth?.signIn==='function'){return window.SonoMarziAwsAuth.signIn();}login.disabled=true;try{await SuiteStore.signIn(document.getElementById('loginUsername').value.trim(),document.getElementById('loginPassword').value);document.getElementById('loginScreen').classList.add('hidden');document.getElementById('app').classList.add('authenticated');startShell();await maybeForcePasswordChange();await syncTextZoomFromProfile();}catch(e){error.textContent=e.message;error.style.display='';}finally{login.disabled=false;}};
logout=async function(){
  if(!SuiteUX.guard())return;
  let saved;
  const pendingBeforeAttempt = SuiteStore.pending();
  if(pendingBeforeAttempt) toast('Trying to save your changes before signing out…');
  try{
    saved = !pendingBeforeAttempt || await Promise.race([
      SuiteStore.flush(),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),5000)),
    ]);
  }catch(e){
    // Timed out (or threw outright) -- treat exactly like a failed save. Nothing else gets
    // sent as a result of this; the real attempt may still be running in the background, but
    // logging out doesn't depend on its outcome and starts no competing request of its own.
    saved = false;
  }
  if(!saved && SuiteStore.pending()){
    const proceed = confirm('Your latest changes could not be saved to the server (the connection may still be having trouble). Log out anyway and lose those unsaved changes? Choose Cancel to stay and try saving again, or download a backup first from Data & Connection.');
    if(!proceed) return;
  }
  try{ if(CURRENT_USER_ID) await logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed out.`,'auth'); }catch(e){ console.error('Audit log entry on sign-out failed (logging out anyway):', e); }
  try{ await SuiteStore.signOut(); }catch(e){ console.error('Sign-out failed (clearing this tab anyway):', e); }
  // AWS/Cognito keeps its own browser session at the hosted login domain. Clearing the app
  // session alone is not enough to switch users, so end the Cognito hosted session as well.
  const awsHostedLogout = typeof window.SonoMarziAwsAuth?.logout === 'function'
    ? window.SonoMarziAwsAuth.logout
    : null;
  // Everything below here is the actual, visible effect of "logging out" -- it must run
  // unconditionally, even if every step above failed, or clicking Log Out can silently do
  // nothing at all from the person's point of view, which is exactly the bug this replaces.
  SuiteUX.clearDirty();
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('suiteProfile').hidden=true;
  document.getElementById('roleSwitcherPanel').style.display='none';
  document.getElementById('notifPanel').style.display='none';
  CURRENT_USER_ID=null;
  HOME_ROLE_IDS=null;
  ACTIVE_MODULE=null;
  document.getElementById('app').classList.remove('authenticated');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginPassword').value='';
  if(awsHostedLogout){
    awsHostedLogout();
    return;
  }
};
// DOJ-style complexity: 8+ characters, at least one uppercase, one lowercase, one special
// character. The two named accounts are explicitly exempt -- existing passwords set before this
// rule existed, deliberately not force-invalidated by a policy that came later.
const PASSWORD_POLICY_EXEMPT_EMAILS = ['fm1476@gmail.com','fred@sonomarzi.com'];
function passwordMeetsPolicy(password, email){
  if(email && PASSWORD_POLICY_EXEMPT_EMAILS.includes(String(email).trim().toLowerCase())) return {ok:true};
  if(!password || password.length<8) return {ok:false, message:'Use at least 8 characters.'};
  if(!/[A-Z]/.test(password)) return {ok:false, message:'Include at least one uppercase letter.'};
  if(!/[a-z]/.test(password)) return {ok:false, message:'Include at least one lowercase letter.'};
  if(!/[^A-Za-z0-9]/.test(password)) return {ok:false, message:'Include at least one special character.'};
  return {ok:true};
}
function openSharedPassword(){
  const box=document.getElementById('modalBox');
  box.className='modal';
  box.innerHTML=`<div class="modal-head"><h3>Change password</h3><button id="pwClose" class="modal-close">×</button></div><div class="modal-body"><div class="callout callout-blue"><strong>Passwords are managed by AWS Cognito.</strong><div style="margin-top:6px">Sign out, choose <em>Forgot password</em> on the Cognito sign-in screen, and follow the verification flow to set a new password.</div></div></div><div class="modal-foot"><button id="pwCancel" class="btn btn-outline">Close</button><button id="pwCognito" class="btn btn-primary">Sign out to Cognito</button></div>`;
  SuiteUX.openModal();
  box.querySelector('#pwClose').onclick=box.querySelector('#pwCancel').onclick=closeModal;
  box.querySelector('#pwCognito').onclick=()=>{SuiteUX.clearDirty();if(typeof window.SonoMarziAwsAuth?.logout==='function')window.SonoMarziAwsAuth.logout();};
}

// A full-screen overlay outside the normal modal system on purpose: the standard modal can
// always be dismissed via Escape or a backdrop click once its dirty-tracking hasn't kicked in
// yet (i.e. before anything's been typed), which would let someone skip past this entirely.
// This one has no close affordance at all and isn't wired into that system, so there's no way
// past it except successfully setting a new password.
function openForcedPasswordChangeModal(){
  // Retained as a compatibility no-op. Cognito Hosted UI owns first-login password challenges.
}
async function maybeForcePasswordChange(){ return; }

// Explicitly distinguish demonstration data from authenticated agency data.
{

}

