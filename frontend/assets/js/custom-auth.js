(()=>{
  const authHost=location.hostname.toLowerCase();
  const isSonoMarziAwsHost=authHost==='d1b97r2bbw5qld.cloudfront.net'||authHost.endsWith('.sonomarzi.com');
  if(!isSonoMarziAwsHost) return;
  window.SONOMARZI_AWS_DEV=true;
  const CLIENT_ID='no3ovb8d8qda221qnh1qomf1e', API_BASE='https://7debzkoq7k.execute-api.us-east-2.amazonaws.com';
  const ID='sonomarzi.aws.id_token', ACCESS='sonomarzi.aws.access_token', REFRESH='sonomarzi.aws.refresh_token';
  async function cognito(action,payload){
    const r=await fetch(`${API_BASE}/activation`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'public_auth',operation:action,payload})});
    const raw=await r.text();let b={};try{b=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok||b?.success===false){const e=new Error(b?.error||b?.message||`Authentication failed (${r.status}).`);e.name=(b?.name||b?.code||'CognitoError').split('#').pop();throw e}
    return b?.data??b;
  }
  function error(msg=''){const e=document.getElementById('loginError');if(e){e.textContent=msg;e.style.display=msg?'block':'none'}}
  function save(a){if(!a?.IdToken)throw Error('Cognito did not return an ID token.');sessionStorage.setItem(ID,a.IdToken);if(a.AccessToken)sessionStorage.setItem(ACCESS,a.AccessToken);if(a.RefreshToken)sessionStorage.setItem(REFRESH,a.RefreshToken)}
  function jwtPayload(token){try{const part=String(token||'').split('.')[1];if(!part)return null;const normalized=part.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);return JSON.parse(atob(padded))}catch{return null}}
  function tokenUsable(token){const payload=jwtPayload(token);return !!token && (!payload?.exp || payload.exp>(Date.now()/1000)+60)}
  async function ensureIdToken(){
    const existing=sessionStorage.getItem(ID);
    if(tokenUsable(existing)) return existing;
    const refresh=sessionStorage.getItem(REFRESH);
    if(!refresh){sessionStorage.removeItem(ID);sessionStorage.removeItem(ACCESS);return null}
    try{
      const r=await cognito('InitiateAuth',{AuthFlow:'REFRESH_TOKEN_AUTH',ClientId:CLIENT_ID,AuthParameters:{REFRESH_TOKEN:refresh}});
      if(!r?.AuthenticationResult?.IdToken) return null;
      save(r.AuthenticationResult);
      return sessionStorage.getItem(ID);
    }catch(e){
      sessionStorage.removeItem(ID);sessionStorage.removeItem(ACCESS);sessionStorage.removeItem(REFRESH);
      return null;
    }
  }
  function policy(p){if(p.length<8)return'Use at least 8 characters.';if(!/[A-Z]/.test(p))return'Include at least one uppercase letter.';if(!/[a-z]/.test(p))return'Include at least one lowercase letter.';if(!/[0-9]/.test(p))return'Include at least one number.';if(!/[^A-Za-z0-9]/.test(p))return'Include at least one special character.';return''}
  function overlay(title,html){document.getElementById('customAuthOverlay')?.remove();const o=document.createElement('div');o.id='customAuthOverlay';o.style.cssText='position:fixed;inset:0;z-index:2147483645;background:rgba(6,15,29,.86);display:flex;align-items:center;justify-content:center;padding:20px';o.innerHTML=`<div style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;padding:26px;box-shadow:0 18px 60px rgba(0,0,0,.35)"><h3 style="margin:0 0 14px;color:var(--heading)">${title}</h3>${html}</div>`;document.body.appendChild(o);return o}
  async function newPassword(username,session){return new Promise(resolve=>{const o=overlay('Create your password','<p style="font-size:13px;color:var(--text-dim)">Choose your permanent SonoMarzi password.</p><div class="form-row"><label>New password</label><input id="authNewPassword" type="password" autocomplete="new-password"></div><div class="form-row"><label>Confirm password</label><input id="authNewPassword2" type="password" autocomplete="new-password"></div><p id="authChallengeError" class="field-error"></p><button id="authChallengeGo" class="btn btn-primary" style="width:100%;justify-content:center">Continue</button>');o.querySelector('#authChallengeGo').onclick=async()=>{const p=o.querySelector('#authNewPassword').value,p2=o.querySelector('#authNewPassword2').value,e=o.querySelector('#authChallengeError');e.textContent=policy(p);if(e.textContent)return;if(p!==p2){e.textContent='The passwords do not match.';return}try{const r=await cognito('RespondToAuthChallenge',{ClientId:CLIENT_ID,ChallengeName:'NEW_PASSWORD_REQUIRED',Session:session,ChallengeResponses:{USERNAME:username,NEW_PASSWORD:p}});o.remove();resolve(r)}catch(x){e.textContent=x.message}}})}
  async function mfa(username,session){return new Promise(resolve=>{const o=overlay('Security verification','<p style="font-size:13px;color:var(--text-dim)">Enter the 6-digit code from your authenticator app.</p><div class="form-row"><label>Authenticator code</label><input id="authMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><p id="authChallengeError" class="field-error"></p><button id="authChallengeGo" class="btn btn-primary" style="width:100%;justify-content:center">Verify</button>');o.querySelector('#authChallengeGo').onclick=async()=>{const code=o.querySelector('#authMfaCode').value.trim(),e=o.querySelector('#authChallengeError');if(!/^\d{6}$/.test(code)){e.textContent='Enter the 6-digit authenticator code.';return}try{const r=await cognito('RespondToAuthChallenge',{ClientId:CLIENT_ID,ChallengeName:'SOFTWARE_TOKEN_MFA',Session:session,ChallengeResponses:{USERNAME:username,SOFTWARE_TOKEN_MFA_CODE:code}});o.remove();resolve(r)}catch(x){e.textContent=x.message}}})}
  async function getMfaState(accessToken){const u=await cognito('GetUser',{AccessToken:accessToken});const methods=Array.isArray(u?.UserMFASettingList)?u.UserMFASettingList:[];return{enabled:methods.includes('SOFTWARE_TOKEN_MFA'),preferred:u?.PreferredMfaSetting==='SOFTWARE_TOKEN_MFA'}}
  async function enrollMfa(username,accessToken){
    const assoc=await cognito('AssociateSoftwareToken',{AccessToken:accessToken});
    const secret=String(assoc?.SecretCode||'').trim();
    if(!secret) throw Error('Cognito did not return an authenticator setup key.');
    const label=encodeURIComponent(`SonoMarzi:${username}`),issuer=encodeURIComponent('SonoMarzi');
    const uri=`otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${issuer}`;
    return new Promise((resolve,reject)=>{
      const o=overlay('Set up multi-factor authentication',`<p style="font-size:13px;color:var(--text-dim)">Your agency requires an authenticator app for SonoMarzi. Add this account in Microsoft Authenticator, Google Authenticator, 1Password, or another TOTP app.</p><div class="form-row"><label>Setup key</label><input id="authMfaSecret" value="${secret.replace(/"/g,'&quot;')}" readonly></div><p style="font-size:12px;color:var(--text-dim);word-break:break-all">Authenticator URI: ${uri.replace(/[&<>]/g,'')}</p><div class="form-row"><label>6-digit code</label><input id="authMfaSetupCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><p id="authChallengeError" class="field-error"></p><button id="authMfaSetupGo" class="btn btn-primary" style="width:100%;justify-content:center">Enable MFA</button>`);
      o.querySelector('#authMfaSetupGo').onclick=async()=>{
        const code=o.querySelector('#authMfaSetupCode').value.trim(),e=o.querySelector('#authChallengeError');
        if(!/^\d{6}$/.test(code)){e.textContent='Enter the 6-digit code from your authenticator app.';return}
        try{
          const v=await cognito('VerifySoftwareToken',{AccessToken:accessToken,UserCode:code,FriendlyDeviceName:'SonoMarzi'});
          if(v?.Status!=='SUCCESS') throw Error('Authenticator verification did not complete.');
          await cognito('SetUserMFAPreference',{AccessToken:accessToken,SoftwareTokenMfaSettings:{Enabled:true,PreferredMfa:true}});
          o.remove(); resolve(true);
        }catch(x){e.textContent=x.message||'Unable to enable MFA.'}
      };
    });
  }
  async function enforceWorkspaceMfa(ws,username){
    const policy=String(ws?.mfa_policy||'off');
    const roles=Array.isArray(ws?.role_ids)?ws.role_ids:[];
    const required=policy==='all_users'||(policy==='admins'&&(roles.includes('role_admin')||roles.includes('role_platform_admin')));
    if(!required) return true;
    const accessToken=sessionStorage.getItem(ACCESS);
    if(!accessToken) throw Error('MFA verification requires a Cognito access token.');
    const state=await getMfaState(accessToken);
    if(state.enabled&&state.preferred) return true;
    if(state.enabled&&!state.preferred){
      await cognito('SetUserMFAPreference',{AccessToken:accessToken,SoftwareTokenMfaSettings:{Enabled:true,PreferredMfa:true}});
    }else{
      await enrollMfa(username,accessToken);
    }
    try{await cognito('GlobalSignOut',{AccessToken:accessToken})}catch{}
    [ID,ACCESS,REFRESH].forEach(k=>sessionStorage.removeItem(k));
    const o=overlay('MFA enabled','<p style="font-size:13px;color:var(--text-dim)">Multi-factor authentication is now enabled. Sign in again to verify your authenticator code and continue.</p><button id="authMfaRelogin" class="btn btn-primary" style="width:100%;justify-content:center">Return to sign in</button>');
    o.querySelector('#authMfaRelogin').onclick=()=>location.replace(location.origin);
    return false;
  }
  async function bootstrapAwsSession(){
    const token=sessionStorage.getItem(ID);
    if(!token) return false;
    const apiBase='https://7debzkoq7k.execute-api.us-east-2.amazonaws.com';
    const host=location.hostname.toLowerCase();
    const subdomain=host.endsWith('.sonomarzi.com') ? host.split('.')[0] : '';
    const headers={Authorization:`Bearer ${token}`};

    const meRes=await fetch(`${apiBase}/me`,{headers});
    const me=await meRes.json().catch(()=>({}));
    if(!meRes.ok||!me?.success) throw Error(me?.error||`Unable to load SonoMarzi identity (${meRes.status}).`);

    let workspaceUrl=`${apiBase}/workspace`;
    if(subdomain) workspaceUrl += `?subdomain=${encodeURIComponent(subdomain)}`;
    else if(Array.isArray(me.memberships)&&me.memberships.length===1){
      const m=me.memberships[0];
      workspaceUrl += `?tenantId=${encodeURIComponent(m.tenant_id)}&agencyId=${encodeURIComponent(m.agency_id)}`;
    }

    const wsRes=await fetch(workspaceUrl,{headers});
    const ws=await wsRes.json().catch(()=>({}));
    if(!wsRes.ok||!ws?.success) throw Error(ws?.error||`Unable to load SonoMarzi workspace (${wsRes.status}).`);
    const authUser=me?.user?.email||me?.user?.display_name||'user';
    if(!(await enforceWorkspaceMfa(ws,authUser))) return false;

    if(typeof STATE==='undefined') throw Error('SonoMarzi application state is not available.');
    const template=(ws.template&&typeof ws.template==='object')?ws.template:{};

    // Rebuild the application state from the normalized AWS record format:
    //   [[path...],"$value"] = value/container metadata
    //   [[path...],"$order"] = ordered collection member IDs
    //   [[path...],"record-id"] = an individual collection member
    // This mirrors the record model stored in RDS instead of treating the
    // JSON record key as a slash-delimited object path.
    STATE=JSON.parse(JSON.stringify(template));

    const getAtPath=(root,path)=>{
      let cur=root;
      for(const segment of path){
        if(cur==null || typeof cur!=='object') return undefined;
        cur=cur[segment];
      }
      return cur;
    };
    const setAtPath=(root,path,value)=>{
      if(!path.length) return;
      let cur=root;
      for(let i=0;i<path.length-1;i++){
        const segment=path[i];
        if(cur[segment]==null || typeof cur[segment]!=='object') cur[segment]={};
        cur=cur[segment];
      }
      cur[path[path.length-1]]=value;
    };

    const groups=new Map();
    for(const row of (Array.isArray(ws.records)?ws.records:[])){
      if(!row || row.deleted) continue;
      let decoded;
      try{decoded=JSON.parse(row.key)}catch{continue}
      if(!Array.isArray(decoded)||decoded.length!==2||!Array.isArray(decoded[0])) continue;
      const path=decoded[0], itemId=decoded[1];
      const groupKey=JSON.stringify(path);
      if(!groups.has(groupKey)) groups.set(groupKey,{path,valueSet:false,value:null,order:null,items:new Map()});
      const group=groups.get(groupKey);
      if(itemId==='$value'){group.valueSet=true;group.value=row.value}
      else if(itemId==='$order'){group.order=Array.isArray(row.value)?row.value:[]}
      else group.items.set(String(itemId),row.value);
    }

    // Parents first so a parent "$value" cannot wipe out children rebuilt earlier.
    const orderedGroups=[...groups.values()].sort((a,b)=>a.path.length-b.path.length);
    for(const group of orderedGroups){
      const existing=getAtPath(STATE,group.path);
      if(Array.isArray(group.order)){
        const ids=group.order.map(String);
        const rebuilt=[];
        const used=new Set();
        for(const id of ids){
          if(group.items.has(id)){rebuilt.push(group.items.get(id));used.add(id)}
        }
        for(const [id,value] of group.items){
          if(!used.has(id)) rebuilt.push(value);
        }
        if(group.valueSet && group.value && typeof group.value==='object' && !Array.isArray(group.value)){
          Object.assign(rebuilt,group.value);
        }
        setAtPath(STATE,group.path,rebuilt);
      }else if(group.items.size){
        if(Array.isArray(existing)){
          setAtPath(STATE,group.path,[...group.items.values()]);
        }else{
          const rebuilt=(group.valueSet && group.value && typeof group.value==='object' && !Array.isArray(group.value))
            ? {...group.value}
            : {};
          for(const [id,value] of group.items) rebuilt[id]=value;
          setAtPath(STATE,group.path,rebuilt);
        }
      }else if(group.valueSet){
        setAtPath(STATE,group.path,group.value);
      }
    }

    if(typeof runCoreMigrations==='function') runCoreMigrations();
    if(ws.agency?.branding) STATE.agencyBranding={...(STATE.agencyBranding||{}),...ws.agency.branding};
    STATE.enabledModules=Array.isArray(ws?.tenant?.enabled_modules)?[...ws.tenant.enabled_modules]:(Array.isArray(ws.enabled_modules)?[...ws.enabled_modules]:[]);

    CURRENT_USER_ID=ws.person_id||me.user?.id||null;
    HOME_ROLE_IDS=Array.isArray(ws.role_ids)?[...ws.role_ids]:[];
    STATE.currentRoleIds=[...HOME_ROLE_IDS];

    // Put SuiteStore into the same authenticated shared-workspace state used by
    // a resumed session. Without this, a freshly completed Cognito login leaves
    // SuiteStore in local mode until the browser is hard-refreshed, which suppresses
    // durable audit writes and makes module/navigation state initialize incorrectly.
    if(typeof SuiteStore!=='undefined' && typeof SuiteStore.useWorkspace==='function'){
      await SuiteStore.useWorkspace(ws);
      STATE.enabledModules=Array.isArray(ws?.tenant?.enabled_modules)?[...ws.tenant.enabled_modules]:(Array.isArray(ws.enabled_modules)?[...ws.enabled_modules]:[]);
    }

    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('app')?.classList.add('authenticated');
    if(typeof startShell==='function') startShell();
    return true;
  }

  async function finish(r,username){for(let i=0;i<4&&!r?.AuthenticationResult;i++){if(r?.ChallengeName==='NEW_PASSWORD_REQUIRED')r=await newPassword(username,r.Session);else if(r?.ChallengeName==='SOFTWARE_TOKEN_MFA')r=await mfa(username,r.Session);else throw Error(`Additional sign-in step "${r?.ChallengeName||'unknown'}" is not supported yet.`)}if(!r?.AuthenticationResult)throw Error('Sign-in could not be completed.');save(r.AuthenticationResult);await bootstrapAwsSession()}
  async function signIn(){const username=document.getElementById('loginUsername')?.value.trim().toLowerCase()||'',password=document.getElementById('loginPassword')?.value||'',b=document.getElementById('btnLogin');error('');if(!username||!password){error('Enter your email address and password.');return}if(b){b.disabled=true;b.textContent='Signing in…'}try{const r=await cognito('InitiateAuth',{AuthFlow:'USER_PASSWORD_AUTH',ClientId:CLIENT_ID,AuthParameters:{USERNAME:username,PASSWORD:password}});await finish(r,username)}catch(e){const msg=/USER_PASSWORD_AUTH flow not enabled|Auth flow not enabled/i.test(e.message)?'SonoMarzi custom sign-in is not enabled yet. A Platform Admin must send one access email from User Administration, then retry.':(e.name==='NotAuthorizedException'?'Email or password is incorrect.':e.message);error(msg);if(b){b.disabled=false;b.textContent='Sign In'}}}
  function forgot(){const preset=document.getElementById('loginUsername')?.value.trim().toLowerCase()||'',o=overlay('Reset your password',`<p style="font-size:13px;color:var(--text-dim)">Enter your SonoMarzi email address. We'll send a verification code.</p><div class="form-row"><label>Email address</label><input id="recoveryEmail" type="email" autocomplete="email" value="${preset.replace(/"/g,'&quot;')}"></div><p id="recoveryError" class="field-error"></p><button id="recoverySend" class="btn btn-primary" style="width:100%;justify-content:center">Send verification code</button><button id="recoveryCancel" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px">Cancel</button>`);o.querySelector('#recoveryCancel').onclick=()=>o.remove();o.querySelector('#recoverySend').onclick=async()=>{const email=o.querySelector('#recoveryEmail').value.trim().toLowerCase(),e=o.querySelector('#recoveryError');e.textContent='';try{await cognito('ForgotPassword',{ClientId:CLIENT_ID,Username:email});o.firstElementChild.innerHTML=`<h3 style="margin:0 0 14px;color:var(--heading)">Check your email</h3><p style="font-size:13px;color:var(--text-dim)">Enter the verification code sent to <strong>${email.replace(/[&<>]/g,'')}</strong>, then choose a new password.</p><div class="form-row"><label>Verification code</label><input id="recoveryCode" inputmode="numeric" autocomplete="one-time-code"></div><div class="form-row"><label>New password</label><input id="recoveryPassword" type="password" autocomplete="new-password"></div><div class="form-row"><label>Confirm password</label><input id="recoveryPassword2" type="password" autocomplete="new-password"></div><p id="recoveryError" class="field-error"></p><button id="recoveryConfirm" class="btn btn-primary" style="width:100%;justify-content:center">Set new password</button><button id="recoveryCancel" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px">Cancel</button>`;o.querySelector('#recoveryCancel').onclick=()=>o.remove();o.querySelector('#recoveryConfirm').onclick=async()=>{const code=o.querySelector('#recoveryCode').value.trim(),p=o.querySelector('#recoveryPassword').value,p2=o.querySelector('#recoveryPassword2').value,ee=o.querySelector('#recoveryError');ee.textContent=policy(p);if(ee.textContent)return;if(p!==p2){ee.textContent='The passwords do not match.';return}try{await cognito('ConfirmForgotPassword',{ClientId:CLIENT_ID,Username:email,ConfirmationCode:code,Password:p});o.remove();document.getElementById('loginUsername').value=email;document.getElementById('loginPassword').focus();window.toast?.('Password updated. Sign in with your new password.')}catch(x){ee.textContent=x.message}}}catch(x){e.textContent=x.message}}}
  async function logout(){const a=sessionStorage.getItem(ACCESS);if(a){try{await cognito('GlobalSignOut',{AccessToken:a})}catch{}}[ID,ACCESS,REFRESH,'sonomarzi.aws.pkce.verifier','sonomarzi.aws.pkce.state'].forEach(k=>sessionStorage.removeItem(k));location.replace(location.origin)}
  function configure(){const fields=document.getElementById('loginFormFields');if(!fields)return;const loading=document.getElementById('loginLoading');if(loading)loading.style.display='none';document.getElementById('awsCognitoLoginButton')?.remove();document.getElementById('awsCognitoLoginNote')?.remove();fields.style.display='';for(const id of ['loginUsername','loginPassword','btnLogin','btnForgotPassword']){const old=document.getElementById(id);if(old){const c=old.cloneNode(true);old.replaceWith(c)}}const u=document.getElementById('loginUsername'),p=document.getElementById('loginPassword'),b=document.getElementById('btnLogin'),fp=document.getElementById('btnForgotPassword');if(u){u.closest('.form-row').style.display='';u.type='email';u.placeholder='you@agency.gov'}if(p)p.closest('.form-row').style.display='';if(b){b.style.display='';b.textContent='Sign In';b.onclick=signIn}if(fp){if(fp.parentElement)fp.parentElement.style.display='';fp.onclick=forgot}u?.addEventListener('keydown',e=>{if(e.key==='Enter')p?.focus()});p?.addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});const s=document.querySelector('#loginScreen .brand-text .t2');if(s)s.textContent='Secure agency sign in'}
  window.SonoMarziAwsAuth={...(window.SonoMarziAwsAuth||{}),startLogin:()=>{configure();document.getElementById('loginUsername')?.focus()},signIn,forgotPassword:forgot,logout,getIdToken:()=>sessionStorage.getItem(ID),getAccessToken:()=>sessionStorage.getItem(ACCESS),ensureIdToken};
  configure();
  if(sessionStorage.getItem(ID)){
    bootstrapAwsSession().catch(e=>{error(e.message);document.getElementById('loginScreen')?.classList.remove('hidden');document.getElementById('app')?.classList.remove('authenticated')});
  }
})();
