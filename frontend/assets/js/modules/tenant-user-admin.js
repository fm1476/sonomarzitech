const TenantUserAdmin=(()=>{
  let selectedTenantId=null,loading=false;
  const escape=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function contexts(){const list=TenantPlatform.contexts();const seen=new Map();for(const item of list)if(item.tenant&&!seen.has(item.tenant.id))seen.set(item.tenant.id,item.tenant);return [...seen.values()]}
  function host(){let el=document.getElementById('view-user-administration');if(!el){el=document.createElement('div');el.id='view-user-administration';el.className='view';document.getElementById('content').append(el)}document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el.classList.add('active');document.getElementById('page-title').textContent='User Administration';document.getElementById('page-sub').textContent='Invite users, review authentication status, resend invitations, and remove access';history.pushState({suite:'user-administration'},'','#/user-administration');return el}
  async function invoke(action,body={}){
    const identityActions=new Set([
      'invite_user',
      'update_user_profile',
      'reset_password',
      'reset_all_passwords',
      'delete_user',
      'resend_invitation',
      'send_access_email',
      'ensure_custom_auth'
    ]);
    const path=identityActions.has(action)?'/identity-admin':'/tenant-admin';
    const result=await SuiteStore.api(path,{
      method:'POST',
      body:JSON.stringify({action,...body})
    });
    if(result?.success===false)throw Error(result.error||'User administration request failed.');
    return result?.data;
  }
  async function show(tenantId){
    if(SuiteStore.mode()!=='shared'||(!TenantPlatform.isPlatformAdmin()&&!TenantPlatform.isSystemAdmin())){toast('System Admin or Platform Admin access is required.',true);return}
    const tenants=contexts();selectedTenantId=tenantId||selectedTenantId||TenantPlatform.current?.tenantId||tenants[0]?.id;
    const el=host();el.innerHTML='<section class="panel"><div class="panel-body"><div class="empty-state"><div class="msg">Loading user access…</div><div class="sub">Confirming tenant memberships and authentication status.</div></div></div></section>';
    if(!selectedTenantId){el.innerHTML='<div class="empty-state"><div class="msg">No authorized tenant</div></div>';return}
    if(loading)return;loading=true;
    try{const data=await invoke('list_users',{tenantId:selectedTenantId});render(el,tenants,data.users||[],data.invitations||[])}catch(error){el.innerHTML=`<div class="callout" style="border-color:var(--red)"><strong>User administration could not load.</strong><div style="margin-top:6px">${escape(error.message)}</div><button id="retryUsers" class="btn btn-outline" style="margin-top:12px">Retry</button></div>`;el.querySelector('#retryUsers').onclick=()=>show(selectedTenantId)}finally{loading=false}
  }
  function render(el,tenants,users,invitations){
    const tenant=tenants.find(t=>t.id===selectedTenantId),agencies=tenant?.agencies||[];
    const pendingByUser=new Map(invitations.filter(i=>i.auth_user_id).map(i=>[i.auth_user_id,i]));
    const rows=users.map(user=>{const agency=agencies.find(a=>a.id===user.agency_id),pending=pendingByUser.get(user.user_id),status=user.confirmedAt?'Active':'Invitation pending',roleNames=(user.role_ids||[]).map(id=>STATE.roles.find(r=>r.id===id)?.name||id).join(', ');return `<tr><td><strong>${escape(user.name)}</strong><small style="display:block;color:var(--text-dim)">${escape(user.email)}</small></td><td>${escape(agency?.name||user.agency_id)}</td><td>${escape(roleNames)}</td><td><span class="badge ${user.confirmedAt?'badge-available':'badge-maintenance'}">${status}</span>${!user.confirmedAt&&user.mustChangePassword?'<span class="badge badge-maintenance" style="margin-left:4px">Activation required</span>':''}<small style="display:block;color:var(--text-dim);margin-top:4px">${user.lastSignInAt?'Last sign-in '+SuiteUX.displayInstant(user.lastSignInAt):'No sign-in recorded'}</small></td><td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-edit-user="${escape(user.user_id)}">Edit</button><button class="btn btn-outline btn-sm" data-send-access="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Send access email</button>${!user.confirmedAt&&user.mustChangePassword?`<button class="btn btn-outline btn-sm" data-resend-user="${escape(user.user_id)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}">Resend invite</button>`:''}<button class="btn btn-outline btn-sm" data-reset-password="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Reset password</button><button class="btn btn-danger btn-sm" data-delete-user="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Delete user</button></div></td></tr>`}).join('');
    el.innerHTML=`<div class="tenant-toolbar"><div><div class="work-eyebrow">Authenticated access control</div><h2 style="margin:0;color:var(--heading)">${escape(tenant?.name||'Tenant users')}</h2></div><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${tenants.length>1?`<div class="form-row" style="margin:0"><label for="userTenantSelect">Tenant</label><select id="userTenantSelect">${tenants.map(t=>`<option value="${escape(t.id)}" ${t.id===selectedTenantId?'selected':''}>${escape(t.name)}</option>`).join('')}</select></div>`:''}<button class="btn btn-outline" id="refreshUsers">Refresh</button><button class="btn btn-danger" id="resetAllPasswords">Send password resets…</button><button class="btn btn-primary" id="inviteUser">Invite user</button></div></div><div class="callout callout-blue" style="margin-bottom:16px"><strong>Secure email invitation onboarding</strong><div style="margin-top:4px">New users receive a single-use activation link for their agency. No temporary password is sent by email or shown to an administrator. The user creates their own permanent password before first sign-in. Existing SonoMarzi users keep their current password when another agency is added.</div></div><section class="panel"><div class="panel-head"><h2>Users and invitations</h2><span class="hint">${users.length} agency membership${users.length===1?'':'s'}</span></div><div class="panel-body" style="padding:0;overflow:auto"><table><thead><tr><th>User</th><th>Agency</th><th>Roles</th><th>Authentication</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows||'<tr><td colspan="5"><div class="empty-state"><div class="msg">No users have been added</div><div class="sub">Create the first agency user to begin.</div></div></td></tr>'}</tbody></table></div></section>`;
    el.querySelector('#userTenantSelect')?.addEventListener('change',event=>{selectedTenantId=event.target.value;show(selectedTenantId)});
    el.querySelector('#refreshUsers').onclick=()=>show(selectedTenantId);
    el.querySelector('#inviteUser').onclick=()=>openInvite(tenant,agencies);
    el.querySelector('#resetAllPasswords').onclick=()=>openResetAllPasswords();
    el.querySelectorAll('[data-edit-user]').forEach(button=>button.onclick=()=>{const user=users.find(u=>u.user_id===button.dataset.editUser);if(user)openEditUser(user,tenant,agencies);});
    el.querySelectorAll('[data-send-access]').forEach(button=>button.onclick=()=>sendAccessEmail(button.dataset.sendAccess,button.dataset.userName,button.dataset.email,button.dataset.agency));
    el.querySelectorAll('[data-resend-user]').forEach(button=>button.onclick=()=>resend(button.dataset.resendUser,button.dataset.email,button.dataset.agency));
    el.querySelectorAll('[data-reset-password]').forEach(button=>button.onclick=()=>resetPassword(button.dataset.resetPassword,button.dataset.userName,button.dataset.agency));
    el.querySelectorAll('[data-delete-user]').forEach(button=>button.onclick=()=>remove(button.dataset.deleteUser,button.dataset.userName,button.dataset.email,button.dataset.agency));
  }
  function openInvite(tenant,agencies){
    const roles=STATE.roles.filter(role=>role.id!=='role_platform_admin'&&!role.hidden),defaultRole=roles.find(role=>role.id==='role_officer')||roles.at(-1);
    const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><div><h3>Invite user</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="inviteClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label for="newUserFirstName">First name</label><input id="newUserFirstName" autocomplete="given-name"></div><div class="form-row"><label for="newUserLastName">Last name</label><input id="newUserLastName" autocomplete="family-name"></div></div><div class="form-row"><label for="newUserEmail">Email address</label><input id="newUserEmail" type="email" autocomplete="email"></div><div class="form-row"><label for="newUserAgency">Agency</label><select id="newUserAgency">${agencies.filter(a=>a.status!=='suspended').map(a=>`<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('')}</select></div><div class="form-row"><label for="newUserBadge">Badge or employee number</label><input id="newUserBadge"></div><div class="form-row"><label for="newUserUnit">Unit or assignment</label><input id="newUserUnit"></div><div class="form-row full"><label>Authorized roles</label><div class="module-select-grid">${roles.map(role=>`<label class="module-choice"><input type="checkbox" data-new-user-role="${escape(role.id)}" ${role.id===defaultRole?.id?'checked':''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description||'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px"><strong>A secure activation email will be sent automatically.</strong> It contains a single-use link to this agency's SonoMarzi site. The user creates their own password. No password is emailed or shown to you.</div><div id="newUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="inviteCancel">Cancel</button><button class="btn btn-primary" id="sendInvite">Send invitation</button></div>`;
    SuiteUX.openModal();box.querySelector('#inviteClose').onclick=box.querySelector('#inviteCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#sendInvite').onclick=async()=>{const firstName=box.querySelector('#newUserFirstName').value.trim(),lastName=box.querySelector('#newUserLastName').value.trim(),name=`${firstName} ${lastName}`.trim(),email=box.querySelector('#newUserEmail').value.trim().toLowerCase(),agencyId=box.querySelector('#newUserAgency').value,badge=box.querySelector('#newUserBadge').value.trim(),unit=box.querySelector('#newUserUnit').value.trim(),roleIds=[...box.querySelectorAll('[data-new-user-role]:checked')].map(input=>input.dataset.newUserRole),error=box.querySelector('#newUserError'),button=box.querySelector('#sendInvite');if(!firstName||!lastName||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!agencyId||!roleIds.length){error.textContent='Enter a first and last name, valid email, agency, and at least one role.';return}button.disabled=true;button.textContent='Sending…';try{const inviteResult=await invoke('invite_user',{tenantId:selectedTenantId,agencyId,name,email,badge,unit,roleIds});
      const ctx = SuiteStore.remoteContext();
      if(ctx.tenantId===selectedTenantId && ctx.agencyId===agencyId){
        try{
          let person = STATE.personnel.find(p=>p.email && p.email.toLowerCase()===email);
          if(!person){
            person={
              id:inviteResult.personId,
              name,
              badge,
              unit,
              roleIds:roleIds.slice(),
              email,
              qualifications:[]
            };
            STATE.personnel.push(person);
          }
          if(!STATE.pm) STATE.pm = {};
          if(!STATE.pm.records) STATE.pm.records = [];
          if(!STATE.pm.records.some(r=>r.personId===person.id)){
            STATE.pm.records.push({
              personId: person.id,
              agency: (STATE.pm.refData && STATE.pm.refData.agencies) ? STATE.pm.refData.agencies[0] : '',
              employeeId:'', unitId:'', driversLicense:{number:'',licenseClass:'',state:'',expiration:''},
              hireDate:'', terminationDate:null, promotionHistory:[], bloodType:'Unknown', phones:[],
              address:{street:'',city:'',state:'',zip:''},
              sex:'Undisclosed', race:'Undisclosed', maritalStatus:'Undisclosed', rank:'',
              badgeNumber: person.badge||'', employmentStatus:'Active', specialSkills:[], assignment:'',
              medical:{bloodType:'Unknown',vaccinations:[],medicalNotes:'',injuryHistory:[],exposureHistory:[]},
              lodd:{wishes:'',emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:'',notes:''},
              supervisorIds:[], education:[], swornDate:'', photoDataUrl:null, documents:[], fieldHistory:[],
            });
          }
          persist();
          const saved=await SuiteStore.flush();
          if(!saved)throw Error('Account created, but the local personnel record could not be saved.');
        }catch(reloadErr){ console.error('Post-create personnel save failed:', reloadErr); }
      }
      if(inviteResult?.emailSent){
        toast(inviteResult?.needsActivation?`Secure activation email sent to ${email}.`:`Agency access email sent to ${email}.`);
      } else {
        toast(`The account/access was created, but email delivery failed: ${inviteResult?.emailError||'unknown delivery error'}. Use Resend invite after email delivery is available.`,true);
      }
      SuiteUX.clearDirty();SuiteUX.closeModal();await show(selectedTenantId)}catch(inviteError){error.textContent=inviteError.message;button.disabled=false;button.textContent='Send invitation'}};
  }
  function openEditUser(user,tenant,agencies){
    // The invite/auth side (name shown here, agency, login status) lives entirely server-side --
    // this app has no direct write access to it beyond the specific dedicated actions the
    // tenant-admin function already exposes (update_roles being the one relevant here). Badge and
    // Unit are purely local roster fields, so those are read from and written straight back to
    // this tenant's own Personnel data, same as everywhere else in the app.
    let localPerson = STATE.personnel.find(p=>
      (p.email && p.email.toLowerCase()===user.email.toLowerCase()) ||
      p.name.trim().toLowerCase()===user.name.trim().toLowerCase()
    );
    if(!localPerson){
      // Someone was invited before this reconciliation existed, or their local record was
      // otherwise never created -- don't block editing on that; create it now instead.
      const created = createPersonAndRecord({name:user.name, badge:'', email:user.email, unit:'', roleIds:user.role_ids||[]});
      localPerson = created.person;
      persist();
    }
    const roles=STATE.roles.filter(role=>role.id!=='role_platform_admin'&&!role.hidden);
    const box=document.getElementById('modalBox');box.className='modal modal-xl';
    box.innerHTML=`<div class="modal-head"><div><h3>Edit ${escape(user.name)}</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="editUserClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label>Name</label><input id="editUserName" value="${escape(user.name)}"></div><div class="form-row"><label>Email address</label><input id="editUserEmail" type="email" value="${escape(user.email)}"></div></div><div class="form-2col"><div class="form-row"><label>Badge or employee number</label><input id="editUserBadge" value="${escape(localPerson.badge||'')}"></div><div class="form-row"><label>Unit or assignment</label><input id="editUserUnit" value="${escape(localPerson.unit||'')}"></div></div><div class="form-row full"><label>Authorized roles (permissions)</label><div class="module-select-grid">${roles.map(role=>`<label class="module-choice"><input type="checkbox" data-edit-user-role="${escape(role.id)}" ${(user.role_ids||[]).includes(role.id)?'checked':''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description||'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px">Agency is fixed once a user is added -- remove access and re-invite to move someone to a different agency.</div><div id="editUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="editUserCancel">Cancel</button><button class="btn btn-primary" id="saveEditUser">Save changes</button></div>`;
    SuiteUX.openModal();box.querySelector('#editUserClose').onclick=box.querySelector('#editUserCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#saveEditUser').onclick=async()=>{
      const roleIds=[...box.querySelectorAll('[data-edit-user-role]:checked')].map(input=>input.dataset.editUserRole);
      const newName=box.querySelector('#editUserName').value.trim();
      const newEmail=box.querySelector('#editUserEmail').value.trim().toLowerCase();
      const error=box.querySelector('#editUserError'),button=box.querySelector('#saveEditUser');
      if(!roleIds.length){error.textContent='At least one role is required.';return}
      if(!newName){error.textContent='Enter a name.';return}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)){error.textContent='Enter a valid email address.';return}
      button.disabled=true;button.textContent='Saving…';
      try{
        // Badge and unit are local-only fields -- neither update_user_profile nor update_roles
        // ever touches them server-side -- so they're safe to save through the normal versioned
        // path. Flushing this first and waiting for it to land means this write is settled before
        // the edge function calls below, instead of racing whatever comes after them.
        const newBadge=box.querySelector('#editUserBadge').value.trim();
        const newUnit=box.querySelector('#editUserUnit').value.trim();
        localPerson.badge=newBadge;
        localPerson.unit=newUnit;
        const record=STATE.pm.records&&STATE.pm.records.find(r=>r.personId===localPerson.id);
        if(record) record.badgeNumber=newBadge;
        persist();
        await SuiteStore.flush();

        const profileChanged=(newName!==user.name)||(newEmail!==user.email.toLowerCase());
        if(profileChanged) await invoke('update_user_profile',{tenantId:selectedTenantId,userId:user.user_id,name:newName,email:newEmail});
        await invoke('update_roles',{tenantId:selectedTenantId,agencyId:user.agency_id,userId:user.user_id,personId:user.person_id||localPerson.id,roleIds});

        localPerson.name=newName;
        localPerson.email=newEmail;
        localPerson.roleIds=roleIds.slice();
        persist();
        if(!await SuiteStore.flush())throw Error('Authentication settings changed, but the personnel record could not be saved.');

        logAuditEntry('Shared',`Updated permissions and roster details for "${newName}" (roles: ${roleIds.map(id=>STATE.roles.find(r=>r.id===id)?.name||id).join(', ')}).`,'personnel');
        if(localPerson.id===CURRENT_USER_ID){HOME_ROLE_IDS=roleIds.slice();STATE.currentRoleIds=roleIds.slice();renderRoleSwitcher();}
        SuiteUX.clearDirty();SuiteUX.closeModal();toast('User updated.');await show(selectedTenantId);
      }catch(saveError){error.textContent=saveError.message;button.disabled=false;button.textContent='Save changes'}
    };
  }
  async function sendAccessEmail(userId,name,email,agencyId){if(!confirm(`Send ${name||email} an account access email for this agency?`))return;try{const result=await invoke('send_access_email',{tenantId:selectedTenantId,agencyId,userId});toast(result?.needsActivation?`Secure activation email sent to ${result.email}.`:`Access email sent to ${result.email}.`);await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  async function resend(userId,email,agencyId){if(!confirm(`Send a new secure invitation email to ${email}?`))return;try{const result=await invoke('resend_invitation',{tenantId:selectedTenantId,agencyId,userId});if(result?.emailSent)toast(`Secure invitation email sent to ${email}.`);else toast(`The invitation was renewed, but email delivery failed: ${result?.emailError||'unknown delivery error'}`,true);await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  async function resetPassword(userId,name,agencyId){
    if(!confirm(`Send ${name} a secure password-reset email?\n\nNo password will be displayed or sent to you.`))return;
    try{
      const result=await invoke('reset_password',{tenantId:selectedTenantId,agencyId,userId});
      toast(`Password-reset instructions were sent to ${result.email}.`);
    }catch(error){toast(error.message,true)}
  }

  function openResetAllPasswords(){
    const box=document.getElementById('modalBox');box.className='modal';
    box.innerHTML=`<div class="modal-head"><h3>Send Password Resets</h3><button class="modal-close" id="resetAllClose">×</button></div>
      <div class="modal-body">
        <div class="callout" style="border-color:var(--red);margin-bottom:14px;"><strong>This sends a secure Cognito password-reset message to every active account in this tenant</strong>, except the emails listed below. No passwords are displayed to administrators. Each person completes their own reset through Cognito.</div>
        <div class="form-row"><label for="resetAllExclude">Emails to leave unchanged (one per line)</label><textarea id="resetAllExclude" rows="5" placeholder="someone@example.com">fm1476@gmail.com
fred@sonomarzi.com
fm1476+john@gmail.com</textarea></div>
        <p id="resetAllError" class="field-error" role="alert"></p>
      </div>
      <div class="modal-foot"><button class="btn btn-outline" id="resetAllCancel">Cancel</button><button class="btn btn-danger" id="resetAllConfirm">Send Password Resets</button></div>`;
    SuiteUX.openModal();
    box.querySelector('#resetAllClose').onclick=box.querySelector('#resetAllCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#resetAllConfirm').onclick=async()=>{
      const excludeEmails=box.querySelector('#resetAllExclude').value.split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);
      const errorEl=box.querySelector('#resetAllError'),button=box.querySelector('#resetAllConfirm');
      if(!confirm(`Final confirmation: send password-reset messages to every account in this tenant except ${excludeEmails.length} excluded email(s)?`))return;
      button.disabled=true;button.textContent='Sending…';
      try{
        const result=await invoke('reset_all_passwords',{tenantId:selectedTenantId,confirm:true,excludeEmails});
        SuiteUX.closeModal();
        alert(`Done.\n\nReset emails sent: ${result.resetCount}\nSkipped (excluded): ${result.skipped.join(', ')||'none'}\n${result.failed.length?`Failed: ${result.failed.join(', ')}`:''}\n\nNo passwords were shown to an administrator.`);
        await show(selectedTenantId);
      }catch(error){errorEl.textContent=error.message;button.disabled=false;button.textContent='Send Password Resets'}
    };
  }
  async function remove(userId,name,email,agencyId){const warning=`Delete ${name} (${email}) from this agency?\n\nThe login and tenant access will be removed. Operational records, historical assignments, and audit history will be preserved. This cannot be undone.`;if(!confirm(warning))return;try{const result=await invoke('delete_user',{tenantId:selectedTenantId,agencyId,userId});toast(result.authDeleted?'User access and authentication account deleted.':'Agency access deleted. The authentication account remains because it is used by another tenant.');await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  return {show};
})();

