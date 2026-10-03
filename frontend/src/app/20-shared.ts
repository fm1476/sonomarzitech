// Expose a stable platform page helper without widening module permissions.
SuiteUX.showPlatformView = function (id?: any, title?: any, subtitle?: any): any { if (!TenantPlatform.isPlatformAdmin())
    return null; const el: any = (document as any).getElementById('view-' + id) || ((): any => { const x: any = (document as any).createElement('div'); x.id = 'view-' + id; x.className = 'view'; (document as any).getElementById('content').append(x); return x; })(); (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active')); el.classList.add('active'); (document as any).getElementById('page-title').textContent = title; (document as any).getElementById('page-sub').textContent = subtitle; history.pushState({ suite: id } as any, '', '#/' + id); return el; };
const originalAccessibleModules: any = accessibleModules;
(accessibleModules as any) = function (): any { return originalAccessibleModules().filter((key?: any): any => TenantPlatform.moduleEnabled(key)); };
const originalCan: any = can;
(can as any) = function (abilityId?: any): any { if (abilityId.startsWith('module_')) {
    const key: any = ({ module_quartermaster: 'qm', module_fleet: 'fleet', module_personnel: 'personnel', module_k9: 'k9', module_drone: 'drone', module_eod: 'eod', module_subpoena: 'subpoena', module_grants: 'grants', module_civil: 'civil' } as any)[abilityId];
    if (key && !TenantPlatform.moduleEnabled(key))
        return false;
} return originalCan(abilityId); };
const originalStartShell: any = startShell;
function addPlatformAdminButtons(): any { const p: any = (document as any).getElementById('suiteProfile'); if (!p)
    return; if (TenantPlatform.isPlatformAdmin() && !p.querySelector('#btnTenantManagement'))
    p.append(Object.assign((document as any).createElement('button'), { id: 'btnTenantManagement', className: 'btn btn-outline', textContent: 'Tenant Management', onclick: TenantPlatform.showTenantManagement } as any)); if ((TenantPlatform.isPlatformAdmin() || TenantPlatform.isSystemAdmin()) && SuiteStore.mode() === 'shared' && !p.querySelector('#btnUserAdministration'))
    p.append(Object.assign((document as any).createElement('button'), { id: 'btnUserAdministration', className: 'btn btn-outline', textContent: 'User Administration', onclick: (): any => TenantUserAdmin.show() } as any)); }
(startShell as any) = function (): any {
    try {
        TenantPlatform.init();
        originalStartShell();
        TenantPlatform.refresh();
    }
    catch (e: any) {
        console.error('startShell error (continuing so admin buttons still get added):', e);
    }
    addPlatformAdminButtons();
    setTimeout(addPlatformAdminButtons, 600);
    setTimeout(addPlatformAdminButtons, 1500);
    // Module visibility depends on three independent things, and when a module is missing it is
    // otherwise impossible to tell which one is at fault from the UI alone. Logging all three at
    // login turns "no modules are showing" from guesswork into a single readable answer.
    try {
        const assigned: any = STATE.currentRoleIds || [];
        const knownRoleIds: any = (STATE.roles || []).map((r?: any): any => r.id);
        const missingRoles: any = assigned.filter((id?: any): any => !knownRoleIds.includes(id));
        debugLog('[access] signed in as:', CURRENT_USER_ID);
        debugLog('[access] roles assigned to this login:', assigned);
        debugLog('[access] roles that exist in this workspace:', knownRoleIds);
        if (missingRoles.length)
            console.warn('[access] PROBLEM: these assigned roles do not exist in this workspace, so they grant nothing:', missingRoles);
        debugLog('[access] modules licensed for this tenant:', TenantPlatform.activeModules());
        debugLog('[access] RAW tenant() lookup for this session:', TenantPlatform.tenant());
        debugLog('[access] current tenant/agency context:', TenantPlatform.current);
        debugLog('[access] full tenant catalog this session can see:', TenantPlatform.catalog);
        debugLog('[access] modules visible to you:', accessibleModules());
        const moduleAbilities: any = ['module_quartermaster', 'module_fleet', 'module_personnel', 'module_k9', 'module_drone', 'module_eod', 'module_subpoena', 'module_grants', 'module_civil'];
        debugLog('[access] per-module check (needs BOTH tenant-licensed AND granted-by-your-role):', Object.fromEntries(moduleAbilities.map((a?: any): any => {
            const key: any = a.replace('module_', '').replace('quartermaster', 'qm');
            const grantedByRole: any = assigned.some((rid?: any): any => (STATE.roles.find((r?: any): any => r.id === rid) || {} as any).abilities?.[a]);
            return [a, { licensedForTenant: TenantPlatform.moduleEnabled(key), grantedByYourRole: grantedByRole } as any];
        })));
    }
    catch (e: any) {
        console.error('[access] diagnostic failed:', e);
    }
};
const AUTH_LINK_TYPE: any = new URLSearchParams(location.hash.replace(/^#/, '')).get('type') || new URLSearchParams(location.search).get('type');
function openInvitationPassword(): any {
    const box: any = (document as any).getElementById('modalBox');
    box.className = 'modal';
    box.innerHTML = '<div class="modal-head"><div><h3>Secure your account</h3><div style="font-size:12px;color:var(--text-dim)">Create your password to finish accepting the agency invitation.</div></div></div><div class="modal-body"><div class="callout callout-blue">Use at least 8 characters, with an uppercase letter, a lowercase letter, and a special character.</div><div class="form-row"><label for="inviteNewPassword">New password</label><input id="inviteNewPassword" type="password" autocomplete="new-password" minlength="8"></div><div class="form-row"><label for="inviteConfirmPassword">Confirm password</label><input id="inviteConfirmPassword" type="password" autocomplete="new-password" minlength="8"></div><div id="invitePasswordError" class="field-error" role="alert"></div></div><div class="modal-foot"><button id="invitePasswordSave" class="btn btn-primary">Set password and continue</button></div>';
    SuiteUX.openModal();
    box.querySelector('#invitePasswordSave').onclick = async (): Promise<any> => {
        const password: any = box.querySelector('#inviteNewPassword').value, confirmation: any = box.querySelector('#inviteConfirmPassword').value, error: any = box.querySelector('#invitePasswordError'), button: any = box.querySelector('#invitePasswordSave');
        const { data: { user } }: any = await backendClient.auth.getUser();
        const check: any = passwordMeetsPolicy(password, user?.email);
        if (!check.ok) {
            error.textContent = check.message;
            return;
        }
        if (password !== confirmation) {
            error.textContent = 'The passwords do not match.';
            return;
        }
        button.disabled = true;
        button.textContent = 'Saving\u2026';
        const { error: updateError }: any = await backendClient.auth.updateUser({ password } as any);
        if (updateError) {
            error.textContent = updateError.message;
            button.disabled = false;
            button.textContent = 'Set password and continue';
            return;
        }
        history.replaceState({} as any, '', location.pathname);
        SuiteUX.clearDirty();
        SuiteUX.closeModal();
        toast('Your account is active and your password has been set.');
    };
}
const TenantUserAdmin: any = ((): any => {
    let selectedTenantId: any = null, loading: any = false;
    const escape: any = (value?: any): any => String(value ?? '').replace(/[&<>'"]/g, (ch?: any): any => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } as any)[ch]));
    function contexts(): any { const list: any = TenantPlatform.contexts(); const seen: any = new Map(); for (const item of list)
        if (item.tenant && !seen.has(item.tenant.id))
            seen.set(item.tenant.id, item.tenant); return [...seen.values()]; }
    function host(): any { let el: any = (document as any).getElementById('view-user-administration'); if (!el) {
        el = (document as any).createElement('div');
        el.id = 'view-user-administration';
        el.className = 'view';
        (document as any).getElementById('content').append(el);
    } (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active')); el.classList.add('active'); (document as any).getElementById('page-title').textContent = 'User Administration'; (document as any).getElementById('page-sub').textContent = 'Invite users, review authentication status, resend invitations, and remove access'; history.pushState({ suite: 'user-administration' } as any, '', '#/user-administration'); return el; }
    async function invoke(action?: any, body: any = {} as any): Promise<any> { const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action, ...body } as any } as any); if (error)
        throw Error(data?.error || await functionErrorMessage(error, 'User administration request failed.')); if (data?.error)
        throw Error(data.error); return data; }
    async function show(tenantId?: any): Promise<any> {
        if (SuiteStore.mode() !== 'shared' || (!TenantPlatform.isPlatformAdmin() && !TenantPlatform.isSystemAdmin())) {
            toast('System Admin or Platform Admin access is required.', true);
            return;
        }
        const tenants: any = contexts();
        selectedTenantId = tenantId || selectedTenantId || TenantPlatform.current?.tenantId || tenants[0]?.id;
        const el: any = host();
        el.innerHTML = '<section class="panel"><div class="panel-body"><div class="empty-state"><div class="msg">Loading user access…</div><div class="sub">Confirming tenant memberships and authentication status.</div></div></div></section>';
        if (!selectedTenantId) {
            el.innerHTML = '<div class="empty-state"><div class="msg">No authorized tenant</div></div>';
            return;
        }
        if (loading)
            return;
        loading = true;
        try {
            const data: any = await invoke('list_users', { tenantId: selectedTenantId } as any);
            render(el, tenants, data.users || [], data.invitations || []);
        }
        catch (error: any) {
            el.innerHTML = `<div class="callout" style="border-color:var(--red)"><strong>User administration could not load.</strong><div style="margin-top:6px">${escape(error.message)}</div><button id="retryUsers" class="btn btn-outline" style="margin-top:12px">Retry</button></div>`;
            el.querySelector('#retryUsers').onclick = (): any => show(selectedTenantId);
        }
        finally {
            loading = false;
        }
    }
    function render(el?: any, tenants?: any, users?: any, invitations?: any): any {
        const tenant: any = tenants.find((t?: any): any => t.id === selectedTenantId), agencies: any = tenant?.agencies || [];
        const pendingByUser: any = new Map(invitations.filter((i?: any): any => i.auth_user_id).map((i?: any): any => [i.auth_user_id, i]));
        const rows: any = users.map((user?: any): any => { const agency: any = agencies.find((a?: any): any => a.id === user.agency_id), pending: any = pendingByUser.get(user.user_id), status: any = user.confirmedAt ? 'Active' : 'Invitation pending', roleNames: any = (user.role_ids || []).map((id?: any): any => STATE.roles.find((r?: any): any => r.id === id)?.name || id).join(', '); return `<tr><td><strong>${escape(user.name)}</strong><small style="display:block;color:var(--text-dim)">${escape(user.email)}</small></td><td>${escape(agency?.name || user.agency_id)}</td><td>${escape(roleNames)}</td><td><span class="badge ${user.confirmedAt ? 'badge-available' : 'badge-maintenance'}">${status}</span>${user.mustChangePassword ? '<span class="badge badge-maintenance" style="margin-left:4px">Must change password</span>' : ''}<small style="display:block;color:var(--text-dim);margin-top:4px">${user.lastSignInAt ? 'Last sign-in ' + SuiteUX.displayInstant(user.lastSignInAt) : 'No sign-in recorded'}</small></td><td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-edit-user="${escape(user.user_id)}">Edit</button>${!user.confirmedAt && pending ? `<button class="btn btn-outline btn-sm" data-resend-user="${escape(user.user_id)}" data-email="${escape(user.email)}">Resend invite</button>` : ''}<button class="btn btn-outline btn-sm" data-reset-password="${escape(user.user_id)}" data-user-name="${escape(user.name)}" ${user.isPlatformAdmin ? 'disabled title="Platform Admins require the protected platform process"' : ''}>Reset password</button><button class="btn btn-danger btn-sm" data-delete-user="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin ? 'disabled title="Platform Admins require the protected platform process"' : ''}>Delete user</button></div></td></tr>`; }).join('');
        el.innerHTML = `<div class="tenant-toolbar"><div><div class="work-eyebrow">Authenticated access control</div><h2 style="margin:0;color:var(--heading)">${escape(tenant?.name || 'Tenant users')}</h2></div><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${tenants.length > 1 ? `<div class="form-row" style="margin:0"><label for="userTenantSelect">Tenant</label><select id="userTenantSelect">${tenants.map((t?: any): any => `<option value="${escape(t.id)}" ${t.id === selectedTenantId ? 'selected' : ''}>${escape(t.name)}</option>`).join('')}</select></div>` : ''}<button class="btn btn-outline" id="refreshUsers">Refresh</button><button class="btn btn-danger" id="resetAllPasswords">Reset all passwords…</button><button class="btn btn-primary" id="inviteUser">Create user</button></div></div><div class="callout callout-blue" style="margin-bottom:16px"><strong>No-email account creation</strong><div style="margin-top:4px">New accounts are created immediately with the agency default password and are never emailed. Each person is required to choose their own password the first time they sign in. Use Reset password at any time to put an account back to the default. Deleting a user preserves operational history and audit records.</div></div><section class="panel"><div class="panel-head"><h2>Users and invitations</h2><span class="hint">${users.length} agency membership${users.length === 1 ? '' : 's'}</span></div><div class="panel-body" style="padding:0;overflow:auto"><table><thead><tr><th>User</th><th>Agency</th><th>Roles</th><th>Authentication</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows || '<tr><td colspan="5"><div class="empty-state"><div class="msg">No users have been added</div><div class="sub">Create the first agency user to begin.</div></div></td></tr>'}</tbody></table></div></section>`;
        el.querySelector('#userTenantSelect')?.addEventListener('change', (event?: any): any => { selectedTenantId = event.target.value; show(selectedTenantId); });
        el.querySelector('#refreshUsers').onclick = (): any => show(selectedTenantId);
        el.querySelector('#inviteUser').onclick = (): any => openInvite(tenant, agencies);
        el.querySelector('#resetAllPasswords').onclick = (): any => openResetAllPasswords();
        el.querySelectorAll('[data-edit-user]').forEach((button?: any): any => button.onclick = (): any => { const user: any = users.find((u?: any): any => u.user_id === button.dataset.editUser); if (user)
            openEditUser(user, tenant, agencies); });
        el.querySelectorAll('[data-resend-user]').forEach((button?: any): any => button.onclick = (): any => resend(button.dataset.email));
        el.querySelectorAll('[data-reset-password]').forEach((button?: any): any => button.onclick = (): any => resetPassword(button.dataset.resetPassword, button.dataset.userName));
        el.querySelectorAll('[data-delete-user]').forEach((button?: any): any => button.onclick = (): any => remove(button.dataset.deleteUser, button.dataset.userName, button.dataset.email, button.dataset.agency));
    }
    function openInvite(tenant?: any, agencies?: any): any {
        const roles: any = STATE.roles.filter((role?: any): any => role.id !== 'role_platform_admin' && !role.hidden), defaultRole: any = roles.find((role?: any): any => role.id === 'role_officer') || roles.at(-1);
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-xl';
        box.innerHTML = `<div class="modal-head"><div><h3>Create user</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="inviteClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label for="newUserFirstName">First name</label><input id="newUserFirstName" autocomplete="given-name"></div><div class="form-row"><label for="newUserLastName">Last name</label><input id="newUserLastName" autocomplete="family-name"></div></div><div class="form-row"><label for="newUserEmail">Email address</label><input id="newUserEmail" type="email" autocomplete="email"></div><div class="form-row"><label for="newUserAgency">Agency</label><select id="newUserAgency">${agencies.filter((a?: any): any => a.status !== 'suspended').map((a?: any): any => `<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('')}</select></div><div class="form-row"><label for="newUserBadge">Badge or employee number</label><input id="newUserBadge"></div><div class="form-row"><label for="newUserUnit">Unit or assignment</label><input id="newUserUnit"></div><div class="form-row full"><label>Authorized roles</label><div class="module-select-grid">${roles.map((role?: any): any => `<label class="module-choice"><input type="checkbox" data-new-user-role="${escape(role.id)}" ${role.id === defaultRole?.id ? 'checked' : ''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description || 'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px"><strong>No email is sent.</strong> The account is created immediately with the agency default password. They'll be required to choose their own password the first time they sign in.</div><div id="newUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="inviteCancel">Cancel</button><button class="btn btn-primary" id="sendInvite">Create account</button></div>`;
        SuiteUX.openModal();
        box.querySelector('#inviteClose').onclick = box.querySelector('#inviteCancel').onclick = (event?: any): any => SuiteUX.closeModal(event);
        box.querySelector('#sendInvite').onclick = async (): Promise<any> => {
            const firstName: any = box.querySelector('#newUserFirstName').value.trim(), lastName: any = box.querySelector('#newUserLastName').value.trim(), name: any = `${firstName} ${lastName}`.trim(), email: any = box.querySelector('#newUserEmail').value.trim().toLowerCase(), agencyId: any = box.querySelector('#newUserAgency').value, badge: any = box.querySelector('#newUserBadge').value.trim(), unit: any = box.querySelector('#newUserUnit').value.trim(), roleIds: any = [...box.querySelectorAll('[data-new-user-role]:checked')].map((input?: any): any => input.dataset.newUserRole), error: any = box.querySelector('#newUserError'), button: any = box.querySelector('#sendInvite');
            if (!firstName || !lastName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !agencyId || !roleIds.length) {
                error.textContent = 'Enter a first and last name, valid email, agency, and at least one role.';
                return;
            }
            button.disabled = true;
            button.textContent = 'Creating…';
            try {
                const inviteResult: any = await invoke('invite_user', { tenantId: selectedTenantId, agencyId, name, email, badge, unit, roleIds } as any);
                // invite_user already creates this person's roster record server-side (its writePersonnel
                // step) and, in doing so, bumps the shared [["personnel"],"$order"] row's version. Creating
                // it again from here would target that exact same just-incremented row using the version      // this tab has been holding since login -- stale by definition, and a guaranteed 40001
                // conflict on every single invite. So: don't write, just re-read. Only refresh when the
                // invite targeted the same tenant/agency this session is actually signed into, since a
                // Platform Admin can invite into a different tenant and refreshing then would swap this
                // session's data out from under them.
                const ctx: any = SuiteStore.remoteContext();
                if (ctx.tenantId === selectedTenantId && ctx.agencyId === agencyId) {
                    try {
                        if (!await SuiteStore.reload(true))
                            throw Error('Account created, but this tab has pending edits. Save or download them and reload before editing the new account.');
                        // invite_user creates the roster entry [["personnel"],id] but NOT the Personnel
                        // Records HR entry [["pm","records"],id] -- different key, different $order row,
                        // and nothing server-side ever writes it. Fill just that gap here. This is safe
                        // where the old duplicate write was not: the roster $order row (which invite_user
                        // just incremented) is untouched, so there's no stale-version collision.
                        const person: any = STATE.personnel.find((p?: any): any => p.email && p.email.toLowerCase() === email);
                        if (person) {
                            if (!STATE.pm)
                                STATE.pm = {} as any;
                            if (!STATE.pm.records)
                                STATE.pm.records = [];
                            if (!STATE.pm.records.some((r?: any): any => r.personId === person.id)) {
                                // Same default shape ensureRecord() builds -- inlined because that function lives
                                // inside the Personnel module's own private scope and isn't reachable from here.
                                STATE.pm.records.push({
                                    personId: person.id,
                                    agency: (STATE.pm.refData && STATE.pm.refData.agencies) ? STATE.pm.refData.agencies[0] : '',
                                    employeeId: '', unitId: '', driversLicense: { number: '', licenseClass: '', state: '', expiration: '' } as any,
                                    hireDate: '', terminationDate: null, promotionHistory: [], bloodType: 'Unknown', phones: [],
                                    address: { street: '', city: '', state: '', zip: '' } as any,
                                    sex: 'Undisclosed', race: 'Undisclosed', maritalStatus: 'Undisclosed', rank: '',
                                    badgeNumber: person.badge || '', employmentStatus: 'Active', specialSkills: [], assignment: '',
                                    medical: { bloodType: 'Unknown', vaccinations: [], medicalNotes: '', injuryHistory: [], exposureHistory: [] } as any,
                                    lodd: { wishes: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', notes: '' } as any,
                                    supervisorIds: [], education: [], swornDate: '', photoDataUrl: null, documents: [], fieldHistory: []
                                } as any);
                                const saved: any = await SuiteStore.flush();
                                if (!saved)
                                    toast('The invite succeeded, but their Personnel Record could not be saved. Use Retry in the sidebar.', true);
                            }
                        }
                    }
                    catch (reloadErr: any) {
                        console.error('Post-invite refresh failed (the invite itself succeeded):', reloadErr);
                    }
                }
                if (inviteResult?.temporaryPassword) {
                    alert(`Account created for ${name} (${email}).\n\nTemporary password: ${inviteResult.temporaryPassword}\n\nGive this to them directly -- no email was sent. They'll be required to choose their own password the first time they sign in.`);
                }
                else {
                    toast(`${name} (${email}) already had an account -- added to this agency with no password change.`);
                }
                SuiteUX.clearDirty();
                SuiteUX.closeModal();
                await show(selectedTenantId);
            }
            catch (inviteError: any) {
                error.textContent = inviteError.message;
                button.disabled = false;
                button.textContent = 'Create account';
            }
        };
    }
    function openEditUser(user?: any, tenant?: any, agencies?: any): any {
        // The invite/auth side (name shown here, agency, login status) lives entirely server-side --
        // this app has no direct write access to it beyond the specific dedicated actions the
        // tenant-admin function already exposes (update_roles being the one relevant here). Badge and
        // Unit are purely local roster fields, so those are read from and written straight back to
        // this tenant's own Personnel data, same as everywhere else in the app.
        let localPerson: any = STATE.personnel.find((p?: any): any => (p.email && p.email.toLowerCase() === user.email.toLowerCase()) ||
            p.name.trim().toLowerCase() === user.name.trim().toLowerCase());
        if (!localPerson) {
            // Someone was invited before this reconciliation existed, or their local record was
            // otherwise never created -- don't block editing on that; create it now instead.
            const created: any = createPersonAndRecord({ name: user.name, badge: '', email: user.email, unit: '', roleIds: user.role_ids || [] } as any);
            localPerson = created.person;
            persist();
        }
        const roles: any = STATE.roles.filter((role?: any): any => role.id !== 'role_platform_admin' && !role.hidden);
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-xl';
        box.innerHTML = `<div class="modal-head"><div><h3>Edit ${escape(user.name)}</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="editUserClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label>Name</label><input id="editUserName" value="${escape(user.name)}"></div><div class="form-row"><label>Email address</label><input id="editUserEmail" type="email" value="${escape(user.email)}"></div></div><div class="form-2col"><div class="form-row"><label>Badge or employee number</label><input id="editUserBadge" value="${escape(localPerson.badge || '')}"></div><div class="form-row"><label>Unit or assignment</label><input id="editUserUnit" value="${escape(localPerson.unit || '')}"></div></div><div class="form-row full"><label>Authorized roles (permissions)</label><div class="module-select-grid">${roles.map((role?: any): any => `<label class="module-choice"><input type="checkbox" data-edit-user-role="${escape(role.id)}" ${(user.role_ids || []).includes(role.id) ? 'checked' : ''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description || 'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px">Agency is fixed once a user is added -- remove access and re-invite to move someone to a different agency.</div><div id="editUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="editUserCancel">Cancel</button><button class="btn btn-primary" id="saveEditUser">Save changes</button></div>`;
        SuiteUX.openModal();
        box.querySelector('#editUserClose').onclick = box.querySelector('#editUserCancel').onclick = (event?: any): any => SuiteUX.closeModal(event);
        box.querySelector('#saveEditUser').onclick = async (): Promise<any> => {
            const roleIds: any = [...box.querySelectorAll('[data-edit-user-role]:checked')].map((input?: any): any => input.dataset.editUserRole);
            const newName: any = box.querySelector('#editUserName').value.trim();
            const newEmail: any = box.querySelector('#editUserEmail').value.trim().toLowerCase();
            const error: any = box.querySelector('#editUserError'), button: any = box.querySelector('#saveEditUser');
            if (!roleIds.length) {
                error.textContent = 'At least one role is required.';
                return;
            }
            if (!newName) {
                error.textContent = 'Enter a name.';
                return;
            }
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
                error.textContent = 'Enter a valid email address.';
                return;
            }
            button.disabled = true;
            button.textContent = 'Saving…';
            try {
                // Badge and unit are local-only fields -- neither update_user_profile nor update_roles
                // ever touches them server-side -- so they're safe to save through the normal versioned
                // path. Flushing this first and waiting for it to land means this write is settled before
                // the edge function calls below, instead of racing whatever comes after them.
                const newBadge: any = box.querySelector('#editUserBadge').value.trim();
                const newUnit: any = box.querySelector('#editUserUnit').value.trim();
                localPerson.badge = newBadge;
                localPerson.unit = newUnit;
                const record: any = STATE.pm.records && STATE.pm.records.find((r?: any): any => r.personId === localPerson.id);
                if (record)
                    record.badgeNumber = newBadge;
                persist();
                await SuiteStore.flush();
                const profileChanged: any = (newName !== user.name) || (newEmail !== user.email.toLowerCase());
                if (profileChanged)
                    await invoke('update_user_profile', { tenantId: selectedTenantId, userId: user.user_id, name: newName, email: newEmail } as any);
                await invoke('update_roles', { tenantId: selectedTenantId, agencyId: user.agency_id, personId: localPerson.id, roleIds } as any);
                // update_user_profile and update_roles both write straight into this same versioned
                // personnel record server-side, exactly like invite_user's writePersonnel step does for
                // new users. Setting localPerson.name/email/roleIds here and persisting again would target
                // that same just-incremented row using the version this tab was holding before those calls
                // -- a guaranteed 40001 conflict. Reloading instead brings this tab's copy, and
                // serverVersions, back in line with what the server actually has now.
                if (!await SuiteStore.reload(true))
                    throw Error('The server update succeeded, but this tab has pending edits. Save or download them and reload before making another change.');
                logAuditEntry('Shared', `Updated permissions and roster details for "${newName}" (roles: ${roleIds.map((id?: any): any => STATE.roles.find((r?: any): any => r.id === id)?.name || id).join(', ')}).`, 'personnel');
                if (localPerson.id === CURRENT_USER_ID) {
                    HOME_ROLE_IDS = roleIds.slice();
                    STATE.currentRoleIds = roleIds.slice();
                    renderRoleSwitcher();
                }
                SuiteUX.clearDirty();
                SuiteUX.closeModal();
                toast('User updated.');
                await show(selectedTenantId);
            }
            catch (saveError: any) {
                error.textContent = saveError.message;
                button.disabled = false;
                button.textContent = 'Save changes';
            }
        };
    }
    async function resend(email?: any): Promise<any> { if (!confirm(`Send a new invitation email to ${email}?`))
        return; try {
        await invoke('resend_invitation', { tenantId: selectedTenantId, email } as any);
        toast(`Invitation email resent to ${email}.`);
    }
    catch (error: any) {
        toast(error.message, true);
    } }
    async function resetPassword(userId?: any, name?: any): Promise<any> {
        if (!confirm(`Reset ${name}'s password back to the agency default?\n\nThey will be required to choose a new password the next time they sign in.`))
            return;
        try {
            const result: any = await invoke('reset_password', { tenantId: selectedTenantId, userId } as any);
            alert(`${name}'s password has been reset.\n\nTemporary password: ${result.temporaryPassword}\n\nGive this to them directly -- no email was sent.`);
            await show(selectedTenantId);
        }
        catch (error: any) {
            toast(error.message, true);
        }
    }
    function openResetAllPasswords(): any {
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal';
        box.innerHTML = `<div class="modal-head"><h3>Reset All Passwords</h3><button class="modal-close" id="resetAllClose">×</button></div>
      <div class="modal-body">
        <div class="callout" style="border-color:var(--red);margin-bottom:14px;"><strong>This resets every active account in this tenant to the agency default password</strong>, except the emails listed below. Each affected person will be required to choose a new password the next time they sign in. This cannot be undone.</div>
        <div class="form-row"><label for="resetAllExclude">Emails to leave unchanged (one per line)</label><textarea id="resetAllExclude" rows="5" placeholder="someone@example.com">fm1476@gmail.com
fred@sonomarzi.com
fm1476+john@gmail.com</textarea></div>
        <p id="resetAllError" class="field-error" role="alert"></p>
      </div>
      <div class="modal-foot"><button class="btn btn-outline" id="resetAllCancel">Cancel</button><button class="btn btn-danger" id="resetAllConfirm">Reset All Passwords</button></div>`;
        SuiteUX.openModal();
        box.querySelector('#resetAllClose').onclick = box.querySelector('#resetAllCancel').onclick = (event?: any): any => SuiteUX.closeModal(event);
        box.querySelector('#resetAllConfirm').onclick = async (): Promise<any> => {
            const excludeEmails: any = box.querySelector('#resetAllExclude').value.split('\n').map((s?: any): any => s.trim().toLowerCase()).filter(Boolean);
            const errorEl: any = box.querySelector('#resetAllError'), button: any = box.querySelector('#resetAllConfirm');
            if (!confirm(`Final confirmation: reset every account's password in this tenant except ${excludeEmails.length} excluded email(s)?`))
                return;
            button.disabled = true;
            button.textContent = 'Resetting…';
            try {
                const result: any = await invoke('reset_all_passwords', { tenantId: selectedTenantId, confirm: true, excludeEmails } as any);
                SuiteUX.closeModal();
                alert(`Done.\n\nReset: ${result.resetCount}\nSkipped (excluded): ${result.skipped.join(', ') || 'none'}\n${result.failed.length ? `Failed: ${result.failed.join(', ')}` : ''}\n\nEach reset account received its own new one-time password. This bulk tool doesn't surface them here -- use "Reset Password" on one person at a time if you need to hand someone their new password directly.`);
                await show(selectedTenantId);
            }
            catch (error: any) {
                errorEl.textContent = error.message;
                button.disabled = false;
                button.textContent = 'Reset All Passwords';
            }
        };
    }
    async function remove(userId?: any, name?: any, email?: any, agencyId?: any): Promise<any> { const warning: any = `Delete ${name} (${email}) from this agency?\n\nThe login and tenant access will be removed. Operational records, historical assignments, and audit history will be preserved. This cannot be undone.`; if (!confirm(warning))
        return; try {
        const result: any = await invoke('delete_user', { tenantId: selectedTenantId, agencyId, userId } as any);
        toast(result.authDeleted ? 'User access and authentication account deleted.' : 'Agency access deleted. The authentication account remains because it is used by another tenant.');
        await show(selectedTenantId);
    }
    catch (error: any) {
        toast(error.message, true);
    } }
    return { show } as any;
})();
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
const IDLE_TIMEOUT_MS: any = 15 * 60 * 1000; // full sign-out after this long with no activity

const IDLE_WARNING_MS: any = 60 * 1000; // show the countdown this long before that happens

let idleLastActivity: any = Date.now();
let idleWarningShown: any = false;
function idleOverlayEl(): any {
    let el: any = (document as any).getElementById('idleLockOverlay');
    if (!el) {
        el = (document as any).createElement('div');
        el.id = 'idleLockOverlay';
        el.setAttribute('role', 'alertdialog');
        el.setAttribute('aria-modal', 'true');
        el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(6,15,29,.72);';
        el.innerHTML = `
      <div style="background:#1E1E22;color:#D6D6D9;border-radius:12px;padding:28px 30px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit;">
        <h2 style="margin:0 0 10px;font-size:17px;color:#ECECEE;">Still there?</h2>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;">For security, this session will sign out automatically after a period of inactivity.
        You'll be signed out in <span id="idleCountdown" style="font-weight:700;">60</span> seconds.</p>
        <button type="button" id="idleStayBtn" style="width:100%;min-height:40px;border:0;border-radius:6px;background:#134DD1;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Stay signed in</button>
      </div>`;
        (document as any).body.appendChild(el);
        (document as any).getElementById('idleStayBtn').addEventListener('click', (): any => { idleRegisterActivity(); });
    }
    return el;
}
function idleRegisterActivity(): any {
    idleLastActivity = Date.now();
    if (idleWarningShown) {
        idleWarningShown = false;
        const overlay: any = (document as any).getElementById('idleLockOverlay');
        if (overlay)
            overlay.style.display = 'none';
    }
}
['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach((evt?: any): any => {
    (window as any).addEventListener(evt, idleRegisterActivity, { passive: true, capture: true } as any);
});
setInterval((): any => {
    const authed: any = (document as any).getElementById('app')?.classList.contains('authenticated');
    if (!authed) {
        idleWarningShown = false;
        const ov: any = (document as any).getElementById('idleLockOverlay');
        if (ov)
            ov.style.display = 'none';
        return;
    }
    const idleFor: any = Date.now() - idleLastActivity;
    if (idleFor >= IDLE_TIMEOUT_MS) {
        idleWarningShown = false;
        const ov: any = (document as any).getElementById('idleLockOverlay');
        if (ov)
            ov.style.display = 'none';
        logout().then((): any => { try {
            toast('You were signed out after a period of inactivity.');
        }
        catch (e: any) { } });
        return;
    }
    if (idleFor >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) {
        idleWarningShown = true;
        const overlay: any = idleOverlayEl();
        overlay.style.display = 'flex';
        const remaining: any = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleFor) / 1000));
        const span: any = (document as any).getElementById('idleCountdown');
        if (span)
            span.textContent = String(remaining);
    }
}, 1000);
(window as any).SonoMarziReady = (async function init(): Promise<any> {
    SuiteUX.init();
    enhanceAllSelects(document as any); // catch anything already in the DOM before the observer starts watching
    loadTheme(); // defaults to dark (night mode); restores a saved preference if one exists
    (document as any).getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
    loadTextZoom(); // defaults to 115%; restores a saved (device or, once signed in, account) preference if one exists
    // Mobile sidebar drawer: harmless no-op on desktop since the CSS transform/position rules
    // that make this visible are scoped to the narrow-viewport media query.
    function toggleSidebar(forceOpen?: any): any {
        const sidebar: any = (document as any).getElementById('sidebar');
        const backdrop: any = (document as any).getElementById('sidebarBackdrop');
        const open: any = forceOpen !== undefined ? forceOpen : !sidebar.classList.contains('sidebar-open');
        sidebar.classList.toggle('sidebar-open', open);
        backdrop.classList.toggle('open', open);
    }
    (document as any).getElementById('btnSidebarToggle').addEventListener('click', (): any => toggleSidebar());
    (document as any).getElementById('sidebarBackdrop').addEventListener('click', (): any => toggleSidebar(false));
    (document as any).getElementById('sidebar').addEventListener('click', (e?: any): any => {
        if (e.target.closest('.navitem') || e.target.closest('#btnSwitchModule'))
            toggleSidebar(false);
    });
    await loadState();
    let resumedAgencySession: any = false;
    try {
        resumedAgencySession = await SuiteStore.resumeSession();
    }
    catch (e: any) {
        // Whatever went wrong (a bad stored session, a migration hitting unexpected real-world
        // data, a network hiccup) must never leave someone stuck on this spinner forever -- fall
        // through to a normal login screen instead of hanging indefinitely.
        console.error('Session resume failed, falling back to manual login:', e);
        resumedAgencySession = false;
    }
    (document as any).getElementById('loginLoading').style.display = 'none';
    (document as any).getElementById('loginFormFields').style.display = '';
    if (STATE.ssoConfig && STATE.ssoConfig.enabled && STATE.ssoConfig.connectionName) {
        const ssoBox: any = (document as any).getElementById('ssoLoginOption');
        ssoBox.innerHTML = `<button type="button" class="btn btn-outline" id="btnSsoLogin" style="width:100%;justify-content:center;">Sign in with ${escapeHtml(STATE.ssoConfig.connectionName)}</button><div style="display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--text-dim);font-size:11px;"><div style="flex:1;height:1px;background:var(--border);"></div>or sign in with a password<div style="flex:1;height:1px;background:var(--border);"></div></div>`;
        ssoBox.style.display = '';
        (document as any).getElementById('btnSsoLogin').addEventListener('click', (): any => {
            toast(`This would redirect to "${STATE.ssoConfig.connectionName}" to finish signing in.`);
        });
    }
    (document as any).getElementById('btnLogin').addEventListener('click', attemptLogin);
    (document as any).getElementById('loginPassword').addEventListener('keydown', (e?: any): any => { if (e.key === 'Enter')
        attemptLogin(); });
    (document as any).getElementById('loginUsername').addEventListener('keydown', (e?: any): any => { if (e.key === 'Enter')
        (document as any).getElementById('loginPassword').focus(); });
    (document as any).getElementById('btnForgotPassword').addEventListener('click', openForgotPasswordModal);
    if (resumedAgencySession) {
        (document as any).getElementById('loginScreen').classList.add('hidden');
        (document as any).getElementById('app').classList.add('authenticated');
        startShell();
        if (AUTH_LINK_TYPE === 'invite' || AUTH_LINK_TYPE === 'recovery')
            setTimeout(openInvitationPassword, 0);
        maybeForcePasswordChange();
        syncTextZoomFromProfile();
    }
})();
(window as any).SonoMarziLegacy = {
    signIn: async (): Promise<any> => { await SuiteStore.signIn('', ''); (document as any).getElementById('loginScreen').classList.add('hidden'); (document as any).getElementById('app').classList.add('authenticated'); startShell(); },
    signOut: (): any => logout(), state: (): any => STATE, seed: (): any => buildSeedState(), flush: (): any => SuiteStore.flush(), persist: (): any => SuiteStore.persist(), flatKeys: (): any => [...SuiteStore.flatten(STATE).keys()],
    navigate: (route?: any): any => SuiteUX.navigate(route), context: (): any => SuiteStore.remoteContext(), changeContext: async (tenant?: any, agency?: any): Promise<any> => {await SuiteStore.loadRemoteContext(tenant, agency);startShell();}
} as any;
