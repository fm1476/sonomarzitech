// ---------------------------------------------------------------------------------------
// Idle-session lock. CJIS Security Policy requires a session lock (up to and including a
// full sign-out) after a defined period of inactivity, and nothing in this app previously
// enforced one -- a signed-in device left unattended stayed signed in indefinitely. This
// watches for real user activity (mouse, keyboard, touch, scroll) and, once the account has
// been idle past the warning threshold, shows a dismissible countdown; if nobody responds
// before the full timeout, it calls the app's own logout() so the session is fully cleared,
// not just visually hidden. Only acts once the app is actually authenticated, so it's a
// no-op on the login screen or in an unauthenticated tab.
// ---------------------------------------------------------------------------------------
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // full sign-out after this long with no activity
const IDLE_WARNING_MS = 60 * 1000;        // show the countdown this long before that happens
let idleLastActivity = Date.now();
let idleWarningShown = false;

function idlePlatformAdminExempt(){
  // Use assigned roles, never the roles selected in View As.
  const roles=SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[]);
  return roles.includes('role_platform_admin');
}
function idlePauseBackgroundSync(){return idlePlatformAdminExempt()&&Date.now()-idleLastActivity>=IDLE_TIMEOUT_MS;}

function idleOverlayEl(){
  let el = document.getElementById('idleLockOverlay');
  if(!el){
    el = document.createElement('div');
    el.id = 'idleLockOverlay';
    el.setAttribute('role','alertdialog');
    el.setAttribute('aria-modal','true');
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(6,15,29,.72);';
    el.innerHTML = `
      <div style="background:#1E1E22;color:#D6D6D9;border-radius:12px;padding:28px 30px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit;">
        <h2 style="margin:0 0 10px;font-size:17px;color:#ECECEE;">Still there?</h2>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;">For security, this session will sign out automatically after a period of inactivity.
        You'll be signed out in <span id="idleCountdown" style="font-weight:700;">60</span> seconds.</p>
        <button type="button" id="idleStayBtn" style="width:100%;min-height:40px;border:0;border-radius:6px;background:#134DD1;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Stay signed in</button>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('idleStayBtn').addEventListener('click', ()=>{ idleRegisterActivity(); });
  }
  return el;
}

function idleRegisterActivity(){
  idleLastActivity = Date.now();
  if(idleWarningShown){
    idleWarningShown = false;
    const overlay = document.getElementById('idleLockOverlay');
    if(overlay) overlay.style.display = 'none';
  }
}

['mousemove','mousedown','keydown','touchstart','scroll','wheel'].forEach(evt=>{
  window.addEventListener(evt, idleRegisterActivity, {passive:true, capture:true});
});

setInterval(()=>{
  const authed = document.getElementById('app')?.classList.contains('authenticated');
  if(!authed||idlePlatformAdminExempt()){ idleWarningShown = false; const ov = document.getElementById('idleLockOverlay'); if(ov) ov.style.display='none'; return; }
  const idleFor = Date.now() - idleLastActivity;
  if(idleFor >= IDLE_TIMEOUT_MS){
    idleWarningShown = false;
    const ov = document.getElementById('idleLockOverlay'); if(ov) ov.style.display = 'none';
    logout().then(()=>{ try{ toast('You were signed out after a period of inactivity.'); }catch(e){} });
    return;
  }
  if(idleFor >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS){
    idleWarningShown = true;
    const overlay = idleOverlayEl();
    overlay.style.display = 'flex';
    const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleFor)/1000));
    const span = document.getElementById('idleCountdown');
    if(span) span.textContent = String(remaining);
  }
}, 1000);


const SonoMarziSecurity=(()=>{
  const apiBase='https://7debzkoq7k.execute-api.us-east-2.amazonaws.com',accessTokenKey='sonomarzi.aws.access_token',idTokenKey='sonomarzi.aws.id_token',cognitoEndpoint='https://cognito-idp.us-east-2.amazonaws.com/';
  function activationParam(){return new URLSearchParams(location.search).get('activation')||'';}
  function cleanActivationUrl(){const u=new URL(location.href);u.searchParams.delete('activation');history.replaceState({},document.title,u.pathname+(u.search?u.search:'')+u.hash);}
  async function jsonFetch(url,options={}){const r=await fetch(url,options),text=await r.text();let b={};try{b=text?JSON.parse(text):{}}catch{b={raw:text}}if(!r.ok||b?.success===false)throw Error(b?.error||b?.message||`Request failed (${r.status}).`);return b?.data??b;}
  async function showActivation(){
    const token=activationParam();if(!token)return false;
    document.getElementById('loginLoading').style.display='none';document.getElementById('loginFormFields').style.display='none';
    const card=document.querySelector('#loginScreen .login-card')||document.getElementById('loginScreen');let host=document.getElementById('secureActivationPanel');if(host)host.remove();host=document.createElement('div');host.id='secureActivationPanel';host.style.marginTop='18px';
    host.innerHTML=`<div style="text-align:left"><h3 style="margin:0 0 8px;color:var(--heading)">Activate your SonoMarzi account</h3><p style="font-size:13px;color:var(--text-dim);line-height:1.5">Create your own password to activate this account. Your invitation link is single-use. No password was sent by email or provided to your administrator.</p><div class="form-row"><label for="activatePassword">New password</label><input id="activatePassword" type="password" autocomplete="new-password" minlength="8"></div><div class="form-row"><label for="activatePassword2">Confirm password</label><input id="activatePassword2" type="password" autocomplete="new-password" minlength="8"></div><div id="activateError" class="field-error" role="alert"></div><button id="activateSubmit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px">Activate account</button></div>`;
    card.append(host);document.getElementById('activatePassword').focus();document.getElementById('activateSubmit').onclick=async()=>{const p=document.getElementById('activatePassword').value,p2=document.getElementById('activatePassword2').value,err=document.getElementById('activateError'),btn=document.getElementById('activateSubmit');err.textContent='';if(p.length<8){err.textContent='Use at least 8 characters.';return}if(!/[A-Z]/.test(p)){err.textContent='Include at least one uppercase letter.';return}if(!/[a-z]/.test(p)){err.textContent='Include at least one lowercase letter.';return}if(!/[0-9]/.test(p)){err.textContent='Include at least one number.';return}if(!/[^A-Za-z0-9]/.test(p)){err.textContent='Include at least one special character.';return}if(p!==p2){err.textContent='The passwords do not match.';return}btn.disabled=true;btn.textContent='Activating…';try{await jsonFetch(`${apiBase}/activation`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:p})});cleanActivationUrl();host.innerHTML=`<div class="callout callout-blue"><strong>Account activated.</strong><div style="margin-top:6px">Your password is set. You can now sign in to this agency.</div></div><button id="activateSignIn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px">Sign in securely</button>`;document.getElementById('activateSignIn').onclick=()=>window.SonoMarziAwsAuth?.startLogin();}catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent='Activate account'}};return true;
  }
  async function cognito(action,payload){const r=await fetch(cognitoEndpoint,{method:'POST',headers:{'content-type':'application/x-amz-json-1.1','x-amz-target':`AWSCognitoIdentityProviderService.${action}`},body:JSON.stringify(payload)});const text=await r.text();let b={};try{b=text?JSON.parse(text):{}}catch{}if(!r.ok)throw Error(b?.message||b?.Message||`Cognito ${action} failed (${r.status}).`);return b;}
  function decodeJwt(token){try{const part=(token||'').split('.')[1]||'',json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));return JSON.parse(json)}catch{return {}}}
  function jwtEmail(){return decodeJwt(sessionStorage.getItem(idTokenKey)||'').email||'SonoMarzi user'}
  function hasUserAdminScope(token){const scope=String(decodeJwt(token).scope||'');return scope.split(/\s+/).includes('aws.cognito.signin.user.admin')}
  function policyApplies(policy){if(policy==='all_users')return true;if(policy==='admins')return (HOME_ROLE_IDS||[]).some(r=>['role_admin','role_platform_admin'].includes(r));return false;}
  async function enforceMfa(){
    const policy=window.SonoMarziCurrentTenantSecurity?.mfaPolicy||'off';if(!policyApplies(policy))return true;const accessToken=sessionStorage.getItem(accessTokenKey);if(!accessToken||!hasUserAdminScope(accessToken)){alert('This agency requires multi-factor authentication. SonoMarzi will securely sign you in again once to enable authenticator setup.');try{sessionStorage.removeItem(idTokenKey);sessionStorage.removeItem(accessTokenKey);}catch{}window.SonoMarziAwsAuth?.startLogin(true);return false;}
    const me=await cognito('GetUser',{AccessToken:accessToken});if((me.UserMFASettingList||[]).includes('SOFTWARE_TOKEN_MFA'))return true;const assoc=await cognito('AssociateSoftwareToken',{AccessToken:accessToken}),secret=assoc.SecretCode;if(!secret)throw Error('Cognito did not return an authenticator secret.');
    return await new Promise(resolve=>{const overlay=document.createElement('div');overlay.id='tenantMfaOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;background:rgba(6,15,29,.88);padding:20px';overlay.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;padding:28px"><h3 style="margin:0 0 8px;color:var(--heading)">Set up multi-factor authentication</h3><p style="font-size:13px;line-height:1.5;color:var(--text-dim)">${escapeHtml(window.SonoMarziCurrentTenantSecurity?.tenantName||'This agency')} requires an authenticator app for this account. Scan the QR code with Microsoft Authenticator, Google Authenticator, 1Password, Authy, or another TOTP app.</p><div id="tenantMfaQr" style="display:flex;justify-content:center;margin:18px 0"></div><details style="font-size:12px;color:var(--text-dim);margin-bottom:14px"><summary>Can't scan the QR code?</summary><div style="margin-top:8px;word-break:break-all">Setup key: <strong>${escapeHtml(secret)}</strong></div></details><div class="form-row"><label for="tenantMfaCode">6-digit code</label><input id="tenantMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*"></div><div id="tenantMfaError" class="field-error"></div><button id="tenantMfaVerify" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px">Verify & enable MFA</button><button id="tenantMfaSignOut" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px">Sign out</button></div>`;document.body.append(overlay);const otp=`otpauth://totp/${encodeURIComponent('SonoMarzi:'+jwtEmail())}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('SonoMarzi')}`;try{new QRCode(document.getElementById('tenantMfaQr'),{text:otp,width:180,height:180});}catch{}document.getElementById('tenantMfaSignOut').onclick=()=>window.SonoMarziAwsAuth?.logout();document.getElementById('tenantMfaVerify').onclick=async()=>{const code=document.getElementById('tenantMfaCode').value.trim(),err=document.getElementById('tenantMfaError'),btn=document.getElementById('tenantMfaVerify');if(!/^\d{6}$/.test(code)){err.textContent='Enter the 6-digit code from your authenticator app.';return}btn.disabled=true;btn.textContent='Verifying…';try{const verify=await cognito('VerifySoftwareToken',{AccessToken:accessToken,UserCode:code,FriendlyDeviceName:'SonoMarzi'});if(verify.Status!=='SUCCESS')throw Error('The authenticator code could not be verified.');await cognito('SetUserMFAPreference',{AccessToken:accessToken,SoftwareTokenMfaSettings:{Enabled:true,PreferredMfa:true}});overlay.remove();resolve(true)}catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent='Verify & enable MFA'}};});
  }
  return {showActivation,enforceMfa};
})();

(async function init(){
  SuiteUX.init();
  if(await SonoMarziSecurity.showActivation()) return;
  enhanceAllSelects(document); // catch anything already in the DOM before the observer starts watching
  loadTheme(); // defaults to dark (night mode); restores a saved preference if one exists
  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
  loadTextZoom(); // defaults to 115%; restores a saved (device or, once signed in, account) preference if one exists
  // Mobile sidebar drawer: harmless no-op on desktop since the CSS transform/position rules
  // that make this visible are scoped to the narrow-viewport media query.
  function toggleSidebar(forceOpen){
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const open = forceOpen !== undefined ? forceOpen : !sidebar.classList.contains('sidebar-open');
    sidebar.classList.toggle('sidebar-open', open);
    backdrop.classList.toggle('open', open);
  }
  const tabletLayout=window.matchMedia('(pointer:coarse) and (max-width:1366px)');
  tabletLayout.addEventListener('change',()=>{toggleSidebar(false);SuiteUX.navigation();});
  document.getElementById('btnSidebarToggle').addEventListener('click', ()=>toggleSidebar());
  document.getElementById('sidebarBackdrop').addEventListener('click', ()=>toggleSidebar(false));
  document.getElementById('sidebar').addEventListener('click', (e)=>{
    if(e.target.closest('.navitem') || e.target.closest('#btnSwitchModule')) toggleSidebar(false);
  });
  await loadState();
  let resumedAgencySession = false;
  try{
    resumedAgencySession = await SuiteStore.resumeSession();
  }catch(e){
    // Whatever went wrong (a bad stored session, a migration hitting unexpected real-world
    // data, a network hiccup) must never leave someone stuck on this spinner forever -- fall
    // through to a normal login screen instead of hanging indefinitely.
    console.error('Session resume failed, falling back to manual login:', e);
    resumedAgencySession = false;
  }
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('loginFormFields').style.display = '';
  if(STATE.ssoConfig && STATE.ssoConfig.enabled && STATE.ssoConfig.connectionName){
    const ssoBox = document.getElementById('ssoLoginOption');
    ssoBox.innerHTML = `<button type="button" class="btn btn-outline" id="btnSsoLogin" style="width:100%;justify-content:center;">Sign in with ${escapeHtml(STATE.ssoConfig.connectionName)}</button><div style="display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--text-dim);font-size:11px;"><div style="flex:1;height:1px;background:var(--border);"></div>or sign in with a password<div style="flex:1;height:1px;background:var(--border);"></div></div>`;
    ssoBox.style.display = '';
    document.getElementById('btnSsoLogin').addEventListener('click', ()=>{
      toast(`This would redirect to "${STATE.ssoConfig.connectionName}" to finish signing in.`);
    });
  }
  document.getElementById('btnLogin').addEventListener('click', attemptLogin);
  document.getElementById('loginPassword').addEventListener('keydown', (e)=>{ if(e.key==='Enter') attemptLogin(); });
  document.getElementById('loginUsername').addEventListener('keydown', (e)=>{ if(e.key==='Enter') document.getElementById('loginPassword').focus(); });
  document.getElementById('btnForgotPassword').addEventListener('click', openForgotPasswordModal);
  if(resumedAgencySession){document.getElementById('loginScreen').classList.add('hidden');document.getElementById('app').classList.add('authenticated');try{if(!await SonoMarziSecurity.enforceMfa())return;}catch(e){console.error('MFA enforcement failed',e);document.getElementById('loginScreen').classList.remove('hidden');document.getElementById('app').classList.remove('authenticated');toast('This agency requires MFA, but setup could not be completed: '+e.message,true);return;}startShell();if(AUTH_LINK_TYPE==='invite'||AUTH_LINK_TYPE==='recovery')setTimeout(openInvitationPassword,0);maybeForcePasswordChange();syncTextZoomFromProfile();}
})();

