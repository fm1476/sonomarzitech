(()=>{
  const AWS_AUTH = {
    clientId: 'no3ovb8d8qda221qnh1qomf1e',
    cognitoDomain: 'https://us-east-2zulbalcue.auth.us-east-2.amazoncognito.com',
    redirectUri: location.origin,
    apiBase: 'https://7debzkoq7k.execute-api.us-east-2.amazonaws.com',
    verifierKey: 'sonomarzi.aws.pkce.verifier',
    stateKey: 'sonomarzi.aws.pkce.state',
    idTokenKey: 'sonomarzi.aws.id_token',
    accessTokenKey: 'sonomarzi.aws.access_token',
    migrateIntentKey: 'sonomarzi.aws.migrate_demo_pd'
  };

  const DEMO_PD = {
    tenantId: 'f15865be-cf46-41e0-9d60-7cd753437501',
    agencyId: '64624bcc-232d-4af5-bae6-a8e621cde447',
    importPath: '/migration/demo-pd/records',
    batchSize: 40
  };

  // Enable Cognito authentication on the CloudFront hostname and SonoMarzi tenant subdomains.
  const authHost = location.hostname.toLowerCase();
  const isSonoMarziAppHost = authHost === 'd1b97r2bbw5qld.cloudfront.net' || authHost.endsWith('.sonomarzi.com');
  if(!isSonoMarziAppHost) return;

  const base64url = bytes => btoa(String.fromCharCode(...bytes))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

  const randomToken = (length=32) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64url(bytes);
  };

  async function sha256Base64url(value){
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return base64url(new Uint8Array(digest));
  }

  async function currentIdToken(){
    try{
      const helper=window.SonoMarziAwsAuth;
      if(typeof helper?.ensureIdToken==='function'){
        const refreshed=await helper.ensureIdToken();
        if(refreshed) return refreshed;
      }
      if(typeof helper?.getIdToken==='function'){
        const token=helper.getIdToken();
        if(token) return token;
      }
    }catch(error){
      console.warn('[auth] Cognito session refresh failed:',error);
    }
    return sessionStorage.getItem(AWS_AUTH.idTokenKey);
  }

  function requireNormalSignIn(message='Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry.'){
    setStatus(message);
    try{ window.SonoMarziAwsAuth?.startLogin?.(); }catch{}
    return null;
  }

  function setStatus(message, good=false){
    let box=document.getElementById('awsAuthBridgeStatus');
    if(!box){
      box=document.createElement('div');
      box.id='awsAuthBridgeStatus';
      Object.assign(box.style,{
        position:'fixed',right:'18px',bottom:'206px',zIndex:'99999',maxWidth:'430px',
        padding:'12px 14px',borderRadius:'10px',background:'#111827',color:'#fff',
        font:'13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        boxShadow:'0 8px 28px rgba(0,0,0,.28)'
      });
      document.body.appendChild(box);
    }
    box.textContent=message;
    box.style.border=good?'1px solid #22c55e':'1px solid #64748b';
  }

  function buttonStyle(bottom){
    return {
      position:'fixed',right:'18px',bottom,zIndex:'99999',padding:'10px 14px',
      borderRadius:'9px',border:'1px solid #64748b',background:'#fff',color:'#111827',
      font:'600 13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      cursor:'pointer',boxShadow:'0 5px 18px rgba(0,0,0,.18)'
    };
  }


  function configureAwsDevLogin(){
    const fields=document.getElementById('loginFormFields');
    if(!fields) return;

    // Hide the legacy username/password controls while AWS/Cognito is the active dev auth path.
    const username=document.getElementById('loginUsername');
    const password=document.getElementById('loginPassword');
    const legacySignIn=document.getElementById('btnLogin');
    const forgot=document.getElementById('btnForgotPassword');

    username?.closest('.form-row')?.setAttribute('style','display:none;');
    password?.closest('.form-row')?.setAttribute('style','display:none;');
    if(legacySignIn) legacySignIn.style.display='none';
    if(forgot?.parentElement) forgot.parentElement.style.display='none';

    const error=document.getElementById('loginError');
    if(error){
      error.style.display='none';
      error.textContent='';
    }

    let button=document.getElementById('awsCognitoLoginButton');
    if(!button){
      button=document.createElement('button');
      button.id='awsCognitoLoginButton';
      button.type='button';
      button.className='btn btn-primary';
      button.style.cssText='width:100%;justify-content:center;font-size:14px;padding:12px 16px;';
      button.textContent='Sign in securely';
      button.onclick=startLogin;
      fields.insertBefore(button, fields.firstChild);
    }

    let note=document.getElementById('awsCognitoLoginNote');
    if(!note){
      note=document.createElement('div');
      note.id='awsCognitoLoginNote';
      note.style.cssText='margin-top:10px;color:var(--text-dim);font-size:12px;line-height:1.45;text-align:center;';
      note.textContent='';
      note.style.display='none';
      button.insertAdjacentElement('afterend',note);
    }

    const subtitle=document.querySelector('#loginScreen .brand-text .t2');
    if(subtitle) subtitle.textContent='Secure sign in';

    // Remove the old prototype/security disclaimer from the dev login card.
    const card=document.querySelector('#loginScreen .login-card');
    if(card){
      [...card.children].forEach(child=>{
        if(
          child !== fields &&
          child.id !== 'loginLoading' &&
          child.classList?.contains('brand') === false &&
          child.textContent?.includes('This login demonstrates the concept')
        ){
          child.style.display='none';
        }
      });
    }
  }

  function addTestButton(){
    if(document.getElementById('awsAuthBridgeButton')) return;
    const btn=document.createElement('button');
    btn.id='awsAuthBridgeButton';
    btn.type='button';
    btn.textContent='Test AWS Login';
    Object.assign(btn.style,buttonStyle('18px'));
    btn.onclick=startLogin;
    document.body.appendChild(btn);
  }

  function addMigrationButton(){
    if(document.getElementById('awsDemoMigrationButton')) return;
    const btn=document.createElement('button');
    btn.id='awsDemoMigrationButton';
    btn.type='button';
    btn.textContent='Copy Demo PD to AWS';
    Object.assign(btn.style,buttonStyle('62px'));
    btn.onclick=migrateDemoPd;
    document.body.appendChild(btn);
  }



  
async function migrateDemoPdAccessRules() {
  const status = document.getElementById('aws-auth-status');
  const token = await currentIdToken();

  if (!token) {
    const msg = 'Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry.';
    if (status) status.textContent = msg;
    alert(msg);
    return;
  }

  if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
    alert('Supabase client is not available on this page.');
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData?.session) {
    alert('Your normal SonoMarzi/Supabase session is required. Sign in to SonoMarzi first.');
    return;
  }

  if (status) status.textContent = 'Reading Demo PD access rules from Supabase...';

  try {
    const { data: rules, error: sourceError } = await supabaseClient
      .rpc('suite_export_demo_pd_access_rules');

    if (sourceError) throw sourceError;

    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('Supabase returned no Demo PD access rules.');
    }

    if (rules.length !== 99) {
      throw new Error(
        `Safety check stopped the migration: expected 99 Demo PD access rules from Supabase, but received ${rules.length}. Nothing was sent to AWS.`
      );
    }

    const seen = new Set();
    for (const rule of rules) {
      const key = `${rule.role_id}\u0000${rule.collection}`;
      if (seen.has(key)) {
        throw new Error(
          `Safety check stopped the migration: duplicate rule ${rule.role_id}/${rule.collection}. Nothing was sent to AWS.`
        );
      }
      seen.add(key);
    }

    if (status) status.textContent = `Sending ${rules.length} Demo PD access rules to AWS...`;

    const res = await fetch(
      `${AWS_AUTH.apiBase}/migration/demo-pd/access-rules`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rules })
      }
    );

    const raw = await res.text();
    let result;
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      result = { error: raw || `HTTP ${res.status}` };
    }

    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      throw new Error(
        result?.error ||
        'Your secure SonoMarzi session expired. Sign out and sign back in normally, then retry.'
      );
    }

    if (!res.ok || !result?.success) {
      throw new Error(
        result?.error ||
        `AWS access-rule migration failed with HTTP ${res.status}.`
      );
    }

    if (
      result.verified !== true ||
      Number(result.awsAccessRuleCount) !== rules.length
    ) {
      throw new Error(
        `AWS verification was unexpected. Source: ${rules.length}; AWS: ${result.awsAccessRuleCount ?? 'unknown'}; verified: ${String(result.verified)}.`
      );
    }

    const message =
      `DEMO PD ACCESS RULE COPY COMPLETE: ${rules.length}/${rules.length} rules sent. ` +
      `AWS reports ${result.awsAccessRuleCount} rules and verified every stored rule. ` +
      `Supabase was not changed.`;

    if (status) status.textContent = message;
    console.log('Demo PD AWS access-rule migration result:', result);
    console.table(rules);
    alert(message);
  } catch (error) {
    console.error('Demo PD AWS access-rule migration failed:', error);
    const message = `ACCESS RULE COPY STOPPED: ${error.message}`;
    if (status) status.textContent = message;
    alert(message);
  }
}



async function inspectSupabaseMemberships(){
  const button=document.getElementById('supabaseMembershipInspectButton');
  if(button) button.disabled=true;
  try{
    if(typeof supabaseClient==='undefined' || !supabaseClient?.auth){
      throw new Error('Supabase client is not available on this page.');
    }

    const {data:{session},error:sessionError}=await supabaseClient.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session){
      throw new Error('Sign in to the normal SonoMarzi/Supabase session first, then retry.');
    }

    setStatus('Inspecting Demo PD memberships in Supabase...');

    const {data:memberships,error}=await supabaseClient
      .rpc('suite_export_demo_pd_memberships');

    if(error) throw error;
    if(!Array.isArray(memberships)){
      throw new Error('Supabase did not return a membership array.');
    }

    console.log('Supabase Demo PD membership inspection:',memberships);
    console.table(memberships);

    const rows=memberships.map((r,i)=>{
      const roles=Array.isArray(r.role_ids)?r.role_ids.join(', '):(r.role_ids??'');
      return `${i+1}. person_id=${r.person_id??'(null)'} | email=${r.user_email??'(null)'} | name=${r.user_display_name??'(null)'} | membership_status=${r.membership_status??'(null)'} | user_status=${r.user_status??'(null)'} | roles=${roles} | cognito_sub=${r.user_cognito_sub??'(null)'}`;
    }).join('\n');

    const message=
      `SUPABASE MEMBERSHIP INSPECTION COMPLETE\n\n`+
      `Demo PD memberships returned: ${memberships.length}\n\n`+
      `${rows||'(none)'}\n\n`+
      `READ ONLY. Nothing was changed in Supabase or AWS.\n\n`+
      `The full rows were also written to the browser console.`;

    setStatus(`Supabase membership inspection complete. Demo PD returned ${memberships.length} membership row(s).`);
    alert(message);
  }catch(error){
    console.error('Supabase membership inspection failed:',error);
    setStatus(`Supabase membership inspection failed: ${error.message}`);
    alert(`SUPABASE MEMBERSHIP INSPECTION FAILED: ${error.message}`);
  }finally{
    if(button) button.disabled=false;
  }
}


async function migrateDemoPdMemberships(){
  const button=document.getElementById('awsMembershipImportButton');
  if(button) button.disabled=true;

  try{
    if(typeof supabaseClient==='undefined' || !supabaseClient?.auth){
      throw new Error('Supabase client is not available on this page.');
    }

    const {data:{session},error:sessionError}=await supabaseClient.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session){
      throw new Error('Sign in to the normal SonoMarzi/Supabase session first, then retry.');
    }

    const idToken=await currentIdToken();
    if(!idToken){
      throw new Error('Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry the membership copy.');
    }

    setStatus('Reading Demo PD memberships from Supabase...');

    const {data:memberships,error}=await supabaseClient
      .rpc('suite_export_demo_pd_memberships');

    if(error) throw error;
    if(!Array.isArray(memberships)){
      throw new Error('Supabase did not return a membership array.');
    }
    if(memberships.length!==9){
      throw new Error(`Expected exactly 9 Demo PD memberships from Supabase, but received ${memberships.length}. Nothing was sent to AWS.`);
    }

    const confirmed=confirm(
      `Ready to copy ${memberships.length} Demo PD memberships from Supabase to AWS.\n\n`+
      `This will preserve person IDs, roles, and membership status; reconcile the existing Cognito-linked platform administrator; and create no new Cognito users.\n\n`+
      `Supabase will not be changed.\n\nContinue?`
    );
    if(!confirmed){
      setStatus('Demo PD membership copy cancelled. Nothing was changed.');
      return;
    }

    setStatus(`Sending ${memberships.length} Demo PD memberships to AWS for transactional import and verification...`);

    const response=await fetch(`${AWS_AUTH.apiBase}/migration/demo-pd/memberships`,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${idToken}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({memberships})
    });

    const responseText=await response.text();
    let result;
    try{result=JSON.parse(responseText);}catch{result={raw:responseText};}

    if(response.status===401 || response.status===403){
      sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      throw new Error(
        result?.error ||
        'Your secure SonoMarzi session expired. Sign out and sign back in normally, then retry.'
      );
    }

    if(!response.ok || !result?.success){
      throw new Error(
        result?.error ||
        `AWS membership migration failed with HTTP ${response.status}.`
      );
    }

    if(
      result.verified!==true ||
      Number(result.awsMembershipCount)!==memberships.length ||
      Number(result.cognitoUsersCreated)!==0
    ){
      throw new Error(
        `AWS verification was unexpected. Source: ${memberships.length}; AWS: ${result.awsMembershipCount ?? 'unknown'}; verified: ${String(result.verified)}; Cognito users created: ${result.cognitoUsersCreated ?? 'unknown'}.`
      );
    }

    const message=
      `DEMO PD MEMBERSHIP COPY COMPLETE: ${memberships.length}/${memberships.length} memberships sent. `+
      `AWS reports ${result.awsMembershipCount} memberships and verified the stored membership identities, roles, and statuses. `+
      `${result.createdUsers} non-Cognito suite user(s) created; ${result.cognitoUsersCreated} Cognito users created. `+
      `Supabase was not changed.`;

    setStatus(message);
    console.log('Demo PD AWS membership migration result:',result);
    console.table(memberships);
    alert(message);
  }catch(error){
    console.error('Demo PD AWS membership migration failed:',error);
    const message=`MEMBERSHIP COPY STOPPED: ${error.message}`;
    setStatus(message);
    alert(message);
  }finally{
    if(button) button.disabled=false;
  }
}

async function inspectAwsMemberships(){
  const button=document.getElementById('awsMembershipInspectButton');
  if(button) button.disabled=true;
  try{
    const idToken=await currentIdToken();
    if(!idToken){
      throw new Error('Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry the inspection.');
    }

    setStatus('Inspecting the AWS suite_memberships table...');

    const response=await fetch(`${AWS_AUTH.apiBase}/migration/demo-pd/memberships/inspect`,{
      method:'GET',
      headers:{Authorization:`Bearer ${idToken}`}
    });

    const responseText=await response.text();
    let result;
    try{result=JSON.parse(responseText);}catch{result={raw:responseText};}

    if(!response.ok){
      if(response.status===401 || response.status===403){
        sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      }
      throw new Error(`AWS membership inspection returned ${response.status}: ${result.error||result.message||responseText}`);
    }

    console.log('AWS Demo PD membership inspection:',result);
    console.table(result.demoPdMemberships||[]);
    console.table(result.schema||[]);
    console.table(result.constraints||[]);
    console.table(result.indexes||[]);

    const rows=(result.demoPdMemberships||[]).map(r=>{
      const roles=Array.isArray(r.role_ids)?r.role_ids.join(', '):(r.role_ids??'');
      return `person_id=${r.person_id??'(null)'} | user_id=${r.user_id??'(null)'} | status=${r.status??'(null)'} | roles=${roles}`;
    }).join('\n');

    const message=
      `AWS MEMBERSHIP INSPECTION COMPLETE\n\n`+
      `Demo PD memberships already in AWS: ${result.demoPdMembershipCount}\n`+
      `Columns: ${(result.schema||[]).length}\n`+
      `Constraints: ${(result.constraints||[]).length}\n`+
      `Indexes: ${(result.indexes||[]).length}\n\n`+
      `Existing Demo PD memberships:\n${rows||'(none)'}\n\n`+
      `Full details are also in the browser console.`;

    setStatus(`AWS membership inspection complete. Demo PD has ${result.demoPdMembershipCount} membership row(s) in AWS.`);
    alert(message);
  }catch(error){
    console.error('AWS membership inspection failed:',error);
    setStatus(`AWS membership inspection failed: ${error.message}`);
    alert(`MEMBERSHIP INSPECTION FAILED: ${error.message}`);
  }finally{
    if(button) button.disabled=false;
  }
}

async function inspectAwsAccessRules(){
    const button=document.getElementById('awsAccessRulesInspectButton');
    if(button) button.disabled=true;
    try{
      const idToken=await currentIdToken();
      if(!idToken){
        throw new Error('Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry the inspection.');
      }

      setStatus('Inspecting the AWS suite_access_rules table...');

      const response=await fetch(`${AWS_AUTH.apiBase}/migration/demo-pd/access-rules/inspect`,{
        method:'GET',
        headers:{Authorization:`Bearer ${idToken}`}
      });

      const responseText=await response.text();
      let result;
      try{result=JSON.parse(responseText);}catch{result={raw:responseText};}

      if(!response.ok){
        if(response.status===401 || response.status===403){
          sessionStorage.removeItem(AWS_AUTH.idTokenKey);
        }
        throw new Error(`AWS access-rule inspection returned ${response.status}: ${result.error||result.message||responseText}`);
      }

      const columns=Array.isArray(result.schema)?result.schema:[];
      const summary=columns.map(c =>
        `${c.column_name} (${c.data_type}${c.udt_name && c.udt_name!==c.data_type ? `/${c.udt_name}` : ''}, ${c.is_nullable==='YES'?'nullable':'required'}${c.column_default?`, default ${c.column_default}`:''})`
      ).join('\n');

      const count=result.demoPdExistingRuleCount ?? 'unknown';
      setStatus(`AWS ACCESS RULE INSPECTION COMPLETE: ${columns.length} columns found; ${count} existing Demo PD rules. Full schema written to the browser console.`,true);
      console.log('[AWS access rules inspector] full result',result);
      console.table(columns);
      alert(
        `AWS suite_access_rules inspection complete.\n\n` +
        `Demo PD rules already in AWS: ${count}\n` +
        `Columns: ${columns.length}\n\n` +
        summary
      );
    }catch(error){
      console.error('[AWS access rules inspector] failed:',error);
      setStatus(`AWS ACCESS RULE INSPECTION FAILED: ${error.message}`);
    }finally{
      if(button) button.disabled=false;
    }
  }

  async function migrateDemoPdTemplate(){
    const button=document.getElementById('awsDemoTemplateButton');
    if(button) button.disabled=true;
    try{
      const idToken=await currentIdToken();
      if(!idToken){
        throw new Error('Your secure SonoMarzi session is missing or expired. Sign out and sign back in normally, then retry the template copy.');
      }

      if(typeof supabaseClient==='undefined' || !supabaseClient){
        throw new Error('The Supabase connection is not available in this page.');
      }

      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){
        throw new Error('Sign in to the existing SonoMarzi workspace first, then retry the template copy.');
      }

      setStatus('Reading the Demo PD template from Supabase...');
      const {data,error}=await supabaseClient.rpc('suite_load_workspace',{
        p_tenant_id:DEMO_PD.tenantId,
        p_agency_id:DEMO_PD.agencyId
      });
      if(error) throw new Error(error.message||'Supabase workspace load failed.');

      const template=data?.template;
      if(!template || typeof template!=='object' || Array.isArray(template)){
        throw new Error('Supabase did not return a Demo PD template object.');
      }

      setStatus('Copying the Demo PD template to AWS...');
      const response=await fetch(`${AWS_AUTH.apiBase}/migration/demo-pd/template`,{
        method:'POST',
        headers:{
          Authorization:`Bearer ${idToken}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({template})
      });

      const responseText=await response.text();
      let result;
      try{result=JSON.parse(responseText);}catch{result={raw:responseText};}

      if(!response.ok){
        if(response.status===401 || response.status===403){
          sessionStorage.removeItem(AWS_AUTH.idTokenKey);
        }
        const detail=result.error||result.message||responseText;
        const schema=result.schema?` Schema: ${JSON.stringify(result.schema)}`:'';
        throw new Error(`AWS template import returned ${response.status}: ${detail}${schema}`);
      }

      const keys=Array.isArray(result.topLevelKeys)?result.topLevelKeys.length:0;
      setStatus(`DEMO PD TEMPLATE COPY COMPLETE: AWS stored the template successfully (${keys} top-level keys reported). Supabase was not changed.`,true);
      console.log('[AWS template migration bridge] completed',result);
    }catch(error){
      console.error('[AWS template migration bridge] failed:',error);
      setStatus(`DEMO PD TEMPLATE COPY FAILED: ${error.message}`);
    }finally{
      if(button) button.disabled=false;
    }
  }

  async function migrateDemoPd(){
    const button=document.getElementById('awsDemoMigrationButton');
    if(button) button.disabled=true;
    try{
      const idToken=await currentIdToken();
      if(!idToken){
        sessionStorage.setItem(AWS_AUTH.migrateIntentKey,'1');
        setStatus('AWS sign-in is required before the Demo PD copy. Opening Cognito...');
        await startLogin();
        return;
      }

      if(typeof supabaseClient==='undefined' || !supabaseClient){
        throw new Error('The Supabase connection is not available in this page.');
      }

      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){
        throw new Error('Sign in to the existing SonoMarzi/Supabase workspace first, then run Copy Demo PD to AWS.');
      }

      setStatus('Reading Demo PD records from the existing Supabase workspace...');
      const {data,error}=await supabaseClient.rpc('suite_load_workspace',{
        p_tenant_id:DEMO_PD.tenantId,
        p_agency_id:DEMO_PD.agencyId
      });
      if(error) throw new Error(error.message||'Supabase workspace load failed.');

      const records=Array.isArray(data?.records)?data.records:[];
      if(!records.length) throw new Error('Supabase returned no Demo PD records. Nothing was copied.');

      let sent=0;
      let lastAwsCount=null;
      for(let i=0;i<records.length;i+=DEMO_PD.batchSize){
        const batch=records.slice(i,i+DEMO_PD.batchSize).map(row=>({
          key:row.key,
          value:row.value,
          version:row.version,
          deleted:row.deleted===true,
          ...(row.updated_at?{updated_at:row.updated_at}:{})
        }));

        const response=await fetch(`${AWS_AUTH.apiBase}${DEMO_PD.importPath}`,{
          method:'POST',
          headers:{
            Authorization:`Bearer ${idToken}`,
            'Content-Type':'application/json'
          },
          body:JSON.stringify({records:batch})
        });

        const responseText=await response.text();
        let result;
        try{result=JSON.parse(responseText);}catch{result={raw:responseText};}
        if(!response.ok){
          if(response.status===401 || response.status===403){
            sessionStorage.removeItem(AWS_AUTH.idTokenKey);
          }
          throw new Error(`AWS import returned ${response.status}: ${result.error||result.message||responseText}`);
        }

        sent+=batch.length;
        lastAwsCount=result.awsRecordCount??lastAwsCount;
        setStatus(`Copying Demo PD to AWS: ${sent}/${records.length} records...`);
      }

      setStatus(`DEMO PD COPY COMPLETE: ${sent}/${records.length} records sent. AWS reports ${lastAwsCount ?? 'an unknown number of'} Demo PD records. Supabase was not changed.`,true);
      console.log('[AWS migration bridge] completed',{sourceRecordCount:records.length,awsRecordCount:lastAwsCount});
    }catch(error){
      console.error('[AWS migration bridge] failed:',error);
      setStatus(`DEMO PD COPY FAILED: ${error.message}`);
    }finally{
      if(button) button.disabled=false;
    }
  }

  async function forgotPassword(){
    const verifier=randomToken(64), challenge=await sha256Base64url(verifier), state=randomToken(24);
    sessionStorage.setItem(AWS_AUTH.verifierKey,verifier);sessionStorage.setItem(AWS_AUTH.stateKey,state);
    const params=new URLSearchParams({client_id:AWS_AUTH.clientId,response_type:'code',scope:'openid email phone',redirect_uri:AWS_AUTH.redirectUri,code_challenge_method:'S256',code_challenge:challenge,state});
    location.assign(`${AWS_AUTH.cognitoDomain}/forgotPassword?${params}`);
  }

  function logoutCognito(){
    try{
      sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      sessionStorage.removeItem(AWS_AUTH.accessTokenKey);
      sessionStorage.removeItem(AWS_AUTH.verifierKey);
      sessionStorage.removeItem(AWS_AUTH.stateKey);
      sessionStorage.removeItem(AWS_AUTH.migrateIntentKey);
    }catch{}
    const params=new URLSearchParams({
      client_id:AWS_AUTH.clientId,
      logout_uri:AWS_AUTH.redirectUri
    });
    location.assign(`${AWS_AUTH.cognitoDomain}/logout?${params}`);
  }

  // Expose only the small bridge surface the main shell needs.
  window.SonoMarziAwsAuth={...(window.SonoMarziAwsAuth||{}),startLogin,forgotPassword,logout:logoutCognito};

  async function startLogin(requireUserAdmin=false){
    const verifier=randomToken(64);
    const challenge=await sha256Base64url(verifier);
    const state=randomToken(24);
    sessionStorage.setItem(AWS_AUTH.verifierKey,verifier);
    sessionStorage.setItem(AWS_AUTH.stateKey,state);

    const params=new URLSearchParams({
      client_id:AWS_AUTH.clientId,
      response_type:'code',
      scope:requireUserAdmin?'openid email phone aws.cognito.signin.user.admin':'openid email phone',
      redirect_uri:AWS_AUTH.redirectUri,
      code_challenge_method:'S256',
      code_challenge:challenge,
      state
    });
    location.assign(`${AWS_AUTH.cognitoDomain}/oauth2/authorize?${params}`);
  }

  async function exchangeCode(code){
    const verifier=sessionStorage.getItem(AWS_AUTH.verifierKey);
    if(!verifier) throw new Error('PKCE verifier is missing. Click Test AWS Login and try again.');

    const body=new URLSearchParams({
      grant_type:'authorization_code',
      client_id:AWS_AUTH.clientId,
      code,
      redirect_uri:AWS_AUTH.redirectUri,
      code_verifier:verifier
    });

    const tokenResponse=await fetch(`${AWS_AUTH.cognitoDomain}/oauth2/token`,{
      method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body
    });
    if(!tokenResponse.ok) throw new Error(`Cognito token exchange failed (${tokenResponse.status}).`);
    return tokenResponse.json();
  }

  async function callMe(idToken){
    const result=await fetch(`${AWS_AUTH.apiBase}/me`,{
      headers:{Authorization:`Bearer ${idToken}`}
    });
    const text=await result.text();
    let body;
    try{body=JSON.parse(text);}catch{body={raw:text};}
    if(!result.ok) throw new Error(`AWS /me returned ${result.status}: ${body.error||body.message||text}`);
    return body;
  }

  async function testAwsMe(){
    try{
      const token=await currentIdToken();
      if(!token){
        requireNormalSignIn();
        return;
      }

      setStatus('Calling protected AWS /me...');
      const me=await callMe(token);

      const email=me.email ?? me.user?.email ?? 'not returned';
      const userId=me.user_id ?? me.userId ?? me.user?.id ?? 'not returned';
      const platformAdmin=
        me.platform_admin ??
        me.platformAdmin ??
        me.user?.platform_admin ??
        me.user?.platformAdmin ??
        'not returned';
      const memberships=Array.isArray(me.memberships)
        ? me.memberships.length
        : (me.membership_count ?? 'not returned');

      setStatus('AWS /me SUCCESS: protected identity endpoint responded.',true);
      console.log('AWS /me result:',me);

      alert(
        `AWS /me SUCCESS\n\n`+
        `Email: ${email}\n`+
        `User ID: ${userId}\n`+
        `Platform admin: ${String(platformAdmin)}\n`+
        `Memberships: ${memberships}`
      );
    }catch(error){
      console.error('[AWS /me test] failed:',error);

      if(
        /401|403|token|expired/i.test(
          String(error?.message||'')
        )
      ){
        sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      }

      const message=`AWS /me FAILED: ${error.message}`;
      setStatus(message);
      alert(message);
    }
  }

  function addMeTestButton(){
    if(document.getElementById('awsMeTestButton')) return;

    const btn=document.createElement('button');
    btn.id='awsMeTestButton';
    btn.type='button';
    btn.textContent='Test AWS /me';
    Object.assign(btn.style,buttonStyle('418px'));
    btn.onclick=testAwsMe;
    document.body.appendChild(btn);
  }


  async function callWorkspace(idToken){
    const params=new URLSearchParams({
      tenantId:DEMO_PD.tenantId,
      agencyId:DEMO_PD.agencyId
    });

    const result=await fetch(
      `${AWS_AUTH.apiBase}/workspace?${params.toString()}`,
      {
        headers:{
          Authorization:`Bearer ${idToken}`
        }
      }
    );

    const text=await result.text();
    let body;
    try{
      body=JSON.parse(text);
    }catch{
      body={raw:text};
    }

    if(!result.ok){
      throw new Error(
        `AWS /workspace returned ${result.status}: ${body.error||body.message||text}`
      );
    }

    return body;
  }

  async function testAwsWorkspace(){
    try{
      const token=await currentIdToken();

      if(!token){
        requireNormalSignIn();
        return;
      }

      setStatus('Loading Demo PD workspace from AWS...');
      const workspace=await callWorkspace(token);

      const records=workspace?.records;
      const recordCount=Array.isArray(records)
        ? records.length
        : (
            records && typeof records==='object'
              ? Object.keys(records).length
              : 0
          );

      const template=workspace?.template;
      const templateTopLevelKeys=
        template && typeof template==='object'
          ? Object.keys(template).length
          : 0;

      const roles=Array.isArray(workspace?.role_ids)
        ? workspace.role_ids
        : [];

      const summary=
        `AWS /workspace SUCCESS\n\n`+
        `Tenant: ${workspace?.tenant_id ?? 'not returned'}\n`+
        `Agency: ${workspace?.agency_id ?? 'not returned'}\n`+
        `Person: ${workspace?.person_id ?? 'not returned'}\n`+
        `Roles: ${roles.length ? roles.join(', ') : 'none returned'}\n`+
        `Records returned: ${recordCount}\n`+
        `Template top-level keys: ${templateTopLevelKeys}`;

      setStatus(
        `AWS WORKSPACE SUCCESS: Demo PD loaded from AWS (${recordCount} records returned).`,
        true
      );

      console.log('AWS /workspace result:',workspace);
      alert(summary);
    }catch(error){
      console.error('[AWS workspace test] failed:',error);

      if(
        /401|403|token|expired/i.test(
          String(error?.message||'')
        )
      ){
        sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      }

      const message=`AWS WORKSPACE FAILED: ${error.message}`;
      setStatus(message);
      alert(message);
    }
  }

  function addWorkspaceTestButton(){
    if(document.getElementById('awsWorkspaceTestButton')) return;

    const btn=document.createElement('button');
    btn.id='awsWorkspaceTestButton';
    btn.type='button';
    btn.textContent='Test AWS Workspace';
    Object.assign(btn.style,buttonStyle('462px'));
    btn.onclick=testAwsWorkspace;
    document.body.appendChild(btn);
  }


  async function callWriteTest(idToken){
    const result=await fetch(
      `${AWS_AUTH.apiBase}/write-test`,
      {
        method:'POST',
        headers:{
          Authorization:`Bearer ${idToken}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          tenantId:DEMO_PD.tenantId,
          agencyId:DEMO_PD.agencyId
        })
      }
    );

    const text=await result.text();
    let body;
    try{
      body=JSON.parse(text);
    }catch{
      body={raw:text};
    }

    if(!result.ok){
      throw new Error(
        `AWS /write-test returned ${result.status}: ${body.error||body.message||text}`
      );
    }

    return body;
  }

  async function testAwsWritePath(){
    try{
      const token=await currentIdToken();

      if(!token){
        requireNormalSignIn();
        return;
      }

      setStatus('Running controlled AWS write-path proof...');
      const result=await callWriteTest(token);

      const passed =
        result?.success === true ||
        result?.verification === 'PASSED' ||
        result?.verification?.passed === true;

      console.log('AWS /write-test result:',result);

      const summary =
        `AWS WRITE TEST ${passed ? 'SUCCESS' : 'COMPLETED'}\n\n`+
        `Success: ${String(result?.success ?? 'not returned')}\n`+
        `Verification: ${
          typeof result?.verification === 'object'
            ? JSON.stringify(result.verification)
            : (result?.verification ?? 'not returned')
        }\n`+
        `Test record count after cleanup: ${
          result?.testRecordCountAfterCleanup ??
          result?.test_record_count_after_cleanup ??
          result?.cleanupCount ??
          result?.cleanup_count ??
          'see console/result'
        }`;

      setStatus(
        passed
          ? 'AWS WRITE TEST SUCCESS: create, version conflict, update, delete and cleanup completed.'
          : 'AWS write test completed. Review returned verification details.',
        passed
      );

      alert(summary);
    }catch(error){
      console.error('[AWS write test] failed:',error);

      if(/401|403|token|expired/i.test(String(error?.message||''))){
        sessionStorage.removeItem(AWS_AUTH.idTokenKey);
      }

      const message=`AWS WRITE TEST FAILED: ${error.message}`;
      setStatus(message);
      alert(message);
    }
  }

  function addWriteTestButton(){
    if(document.getElementById('awsWriteTestButton')) return;

    const btn=document.createElement('button');
    btn.id='awsWriteTestButton';
    btn.type='button';
    btn.textContent='Test AWS Write Path';
    Object.assign(btn.style,buttonStyle('506px'));
    btn.onclick=testAwsWritePath;
    document.body.appendChild(btn);
  }

  async function handleCallback(){
    const params=new URLSearchParams(location.search);
    const code=params.get('code');
    if(!code) return;

    const returnedState=params.get('state');
    const expectedState=sessionStorage.getItem(AWS_AUTH.stateKey);
    if(!expectedState || returnedState!==expectedState){
      setStatus('AWS login callback was not started by this app. Click Test AWS Login to run a clean PKCE test.');
      return;
    }

    try{
      setStatus('AWS login accepted. Verifying SonoMarzi identity...');
      const tokens=await exchangeCode(code);
      if(!tokens?.id_token) throw new Error('Cognito did not return an ID token.');
      sessionStorage.setItem(AWS_AUTH.idTokenKey,tokens.id_token);
      if(tokens?.access_token) sessionStorage.setItem(AWS_AUTH.accessTokenKey,tokens.access_token);
      sessionStorage.removeItem(AWS_AUTH.verifierKey);
      sessionStorage.removeItem(AWS_AUTH.stateKey);
      history.replaceState({},document.title,location.pathname+location.hash);
      setStatus('AWS AUTH SUCCESS: Cognito token received.',true);
      location.replace(AWS_AUTH.redirectUri);
      return;
      if(sessionStorage.getItem(AWS_AUTH.migrateIntentKey)==='1'){
        sessionStorage.removeItem(AWS_AUTH.migrateIntentKey);
        setTimeout(()=>migrateDemoPd(),250);
      }
    }catch(error){
      console.error('[AWS auth bridge] failed:',error);
      setStatus(`AWS AUTH FAILED: ${error.message}`);
    }
  }

  // The production SonoMarzi login form is owned by custom-auth.js.
  // Keep this bridge available for legacy hosted-UI callbacks and migration helpers,
  // but do not rewrite the sign-in controls on normal tenant hosts.
  handleCallback();
})();
