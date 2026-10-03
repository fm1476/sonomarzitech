/* Install unified shell without duplicating domain workflows. */
(renderSuiteNav as any) = (): any => SuiteUX.navigation();
(showLauncher as any) = (): any => SuiteUX.home();
(enterModule as any) = function (key?: any): any { if (!MODULE_META[key] || !can(MODULE_META[key].ability))
    return; const module: any = SuiteUX.modules()[key]; const remembered: any = SuiteUX.lastViews[key]; const dest: any = remembered && SuiteUX.allowedView(remembered) ? remembered : module.NAV_ITEMS.find((n?: any): any => SuiteUX.allowedView(n.id))?.id; if (dest)
    SuiteUX.go(dest); };
(loadState as any) = (): any => SuiteStore.load();
(persist as any) = (): any => SuiteStore.persist();
(setSyncStatus as any) = function (): any { }; // Status is owned by confirmed storage outcomes in SuiteStore.

const previousRoleRender: any = renderRoleSwitcher;
(renderRoleSwitcher as any) = function (): any { previousRoleRender(); SuiteUX.roleUI(); };
(renderRoleSwitcherPanel as any) = function (): any { if (!SuiteUX.isAdmin()) {
    (document as any).getElementById('roleSwitcherPanel').style.display = 'none';
    return;
} const panel: any = (document as any).getElementById('roleSwitcherPanel'); const allowed: any = STATE.roles.filter((r?: any): any => !r.hidden || loggedInPersonHasRole('role_platform_admin')); panel.innerHTML = '<div style="padding:16px"><strong>View as other roles</strong><p style="font-size:12px;color:var(--text-dim)">Preview the workspace permissions. Actions remain attributed to your signed-in account.</p><div id="rolePreviewOptions"></div><button id="applyPreview" class="btn btn-primary" style="margin-top:12px">Apply preview</button></div>'; const options: any = panel.querySelector('#rolePreviewOptions'); allowed.forEach((r?: any): any => { const label: any = (document as any).createElement('label'); label.style.cssText = 'display:flex;gap:10px;align-items:center;padding:7px 0;font-size:13px'; const input: any = (document as any).createElement('input'); input.type = 'checkbox'; input.value = r.id; input.checked = STATE.currentRoleIds.includes(r.id); label.append(input, (document as any).createTextNode(r.name)); options.append(label); }); panel.querySelector('#applyPreview').onclick = (): any => { if (!SuiteUX.isAdmin())
    return; const ids: any = [...options.querySelectorAll('input:checked')].map((i?: any): any => i.value); if (!ids.length) {
    toast('Select at least one role.', true);
    return;
} if (!SuiteUX.guard())
    return; SuiteUX.clearDirty(); STATE.currentRoleIds = ids; panel.style.display = 'none'; logAuditEntry('Shared', 'Role preview changed to ' + ids.join(', '), 'auth'); renderRoleSwitcher(); SuiteUX.home(); }; };
(startShell as any) = function (): any { applyAgencyBranding(); renderRoleSwitcher(); renderSuiteNav(); (document as any).getElementById('btnSwitchModule').onclick = showLauncher; (document as any).getElementById('btnResetDemo').onclick = async (): Promise<any> => { if (!SuiteUX.isAdmin() || SuiteStore.mode() !== 'local') {
    toast('Demo reset is available only to administrators in the local demo.', true);
    return;
} if (!confirm('Reset the demo records on this device? Export a backup first if you need these changes.'))
    return; STATE = await buildSeedState(); STATE.currentRoleIds = [...(STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || [])]; persist(); await SuiteStore.flush(); SuiteUX.home(); }; (document as any).getElementById('btnLogout').onclick = async (): Promise<any> => { const btn: any = (document as any).getElementById('btnLogout'); if (btn.disabled)
    return; btn.disabled = true; try {
    await logout();
}
finally {
    btn.disabled = false;
} }; (document as any).getElementById('btnChangePassword').onclick = (): any => { if (SuiteStore.mode() === 'shared') {
    openSharedPassword();
    return;
} openChangePasswordModal(); }; (document as any).getElementById('btnNotifBell').onclick = (e?: any): any => { e.stopPropagation(); toggleNotifPanel(); }; renderNotifBell(); StaffNotices.loadInbox().catch((e?: any): any => console.warn('Notice inbox unavailable', e)); FieldTraining.load().catch((e?: any): any => console.warn('Field Training unavailable', e)); const destination: any = location.hash.replace(/^#\//, ''); if (destination && destination !== 'content')
    SuiteUX.navigate(destination);
else
    SuiteUX.home(); };
(attemptLogin as any) = async function (): Promise<any> { const error: any = (document as any).getElementById('loginError'), login: any = (document as any).getElementById('btnLogin'); login.disabled = true; try {
    await SuiteStore.signIn((document as any).getElementById('loginUsername').value.trim(), (document as any).getElementById('loginPassword').value);
    (document as any).getElementById('loginScreen').classList.add('hidden');
    (document as any).getElementById('app').classList.add('authenticated');
    startShell();
    await maybeForcePasswordChange();
    await syncTextZoomFromProfile();
}
catch (e: any) {
    error.textContent = e.message;
    error.style.display = '';
}
finally {
    login.disabled = false;
} };
(logout as any) = async function (): Promise<any> {
    if (!SuiteUX.guard())
        return;
    let saved: any;
    const pendingBeforeAttempt: any = SuiteStore.pending();
    if (pendingBeforeAttempt)
        toast('Trying to save your changes before signing out…');
    try {
        saved = !pendingBeforeAttempt || await Promise.race([
            SuiteStore.flush(),
            new Promise((_?: any, reject?: any): any => setTimeout((): any => reject(Error('timeout')), 5000)),
        ]);
    }
    catch (e: any) {
        // Timed out (or threw outright) -- treat exactly like a failed save. Nothing else gets
        // sent as a result of this; the real attempt may still be running in the background, but
        // logging out doesn't depend on its outcome and starts no competing request of its own.
        saved = false;
    }
    if (!saved && SuiteStore.pending()) {
        const proceed: any = confirm('Your latest changes could not be saved to the server (the connection may still be having trouble). Log out anyway and lose those unsaved changes? Choose Cancel to stay and try saving again, or download a backup first from Data & Connection.');
        if (!proceed)
            return;
    }
    try {
        if (CURRENT_USER_ID)
            logAuditEntry('Shared', `${personName(CURRENT_USER_ID)} signed out.`, 'auth');
    }
    catch (e: any) {
        console.error('Audit log entry on sign-out failed (logging out anyway):', e);
    }
    try {
        await SuiteStore.signOut();
    }
    catch (e: any) {
        console.error('Sign-out failed (clearing this tab anyway):', e);
    }
    // Everything below here is the actual, visible effect of "logging out" -- it must run
    // unconditionally, even if every step above failed, or clicking Log Out can silently do
    // nothing at all from the person's point of view, which is exactly the bug this replaces.
    SuiteUX.clearDirty();
    (document as any).getElementById('modalOverlay').classList.remove('open');
    (document as any).getElementById('suiteProfile').hidden = true;
    (document as any).getElementById('roleSwitcherPanel').style.display = 'none';
    (document as any).getElementById('notifPanel').style.display = 'none';
    CURRENT_USER_ID = null;
    HOME_ROLE_IDS = null;
    ACTIVE_MODULE = null;
    (document as any).getElementById('app').classList.remove('authenticated');
    (document as any).getElementById('loginScreen').classList.remove('hidden');
    (document as any).getElementById('loginPassword').value = '';
};
// DOJ-style complexity: 8+ characters, at least one uppercase, one lowercase, one special
// character. The two named accounts are explicitly exempt -- existing passwords set before this
// rule existed, deliberately not force-invalidated by a policy that came later.
const PASSWORD_POLICY_EXEMPT_EMAILS: any = ['fm1476@gmail.com', 'fred@sonomarzi.com'];
function passwordMeetsPolicy(password?: any, email?: any): any {
    if (email && PASSWORD_POLICY_EXEMPT_EMAILS.includes(String(email).trim().toLowerCase()))
        return { ok: true } as any;
    if (!password || password.length < 8)
        return { ok: false, message: 'Use at least 8 characters.' } as any;
    if (!/[A-Z]/.test(password))
        return { ok: false, message: 'Include at least one uppercase letter.' } as any;
    if (!/[a-z]/.test(password))
        return { ok: false, message: 'Include at least one lowercase letter.' } as any;
    if (!/[^A-Za-z0-9]/.test(password))
        return { ok: false, message: 'Include at least one special character.' } as any;
    return { ok: true } as any;
}
function openSharedPassword(): any { const box: any = (document as any).getElementById('modalBox'); box.className = 'modal'; box.innerHTML = '<div class="modal-head"><h3>Change password</h3><button id="pwClose" class="modal-close">×</button></div><div class="modal-body"><div class="form-row"><label for="agencyNewPassword">New password (at least 8 characters, with an uppercase letter, a lowercase letter, and a special character)</label><input id="agencyNewPassword" type="password" autocomplete="new-password" minlength="8"></div><p id="pwError" role="alert"></p></div><div class="modal-foot"><button id="pwSave" class="btn btn-primary">Update password</button></div>'; SuiteUX.openModal(); (document as any).getElementById('pwClose').onclick = closeModal; (document as any).getElementById('pwSave').onclick = async (): Promise<any> => { const password: any = (document as any).getElementById('agencyNewPassword').value; const email: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.email; const check: any = passwordMeetsPolicy(password, email); if (!check.ok) {
    (document as any).getElementById('pwError').textContent = check.message;
    return;
} const { error }: any = await backendClient.auth.updateUser({ password, data: { must_change_password: false } as any } as any); if (error) {
    (document as any).getElementById('pwError').textContent = error.message;
    return;
} SuiteUX.clearDirty(); closeModal(); toast('Password updated.'); }; }
// A full-screen overlay outside the normal modal system on purpose: the standard modal can
// always be dismissed via Escape or a backdrop click once its dirty-tracking hasn't kicked in
// yet (i.e. before anything's been typed), which would let someone skip past this entirely.
// This one has no close affordance at all and isn't wired into that system, so there's no way
// past it except successfully setting a new password.
function openForcedPasswordChangeModal(): any {
    if ((document as any).getElementById('forcedPwOverlay'))
        return;
    const overlay: any = (document as any).createElement('div');
    overlay.id = 'forcedPwOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,15,29,.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;padding:28px;">
      <h3 style="margin:0 0 8px;color:var(--heading);">Set a New Password</h3>
      <p style="font-size:13px;color:var(--text-dim);margin:0 0 18px;">Your password was reset to the agency default. For security, choose a new password before continuing.</p>
      <div class="form-row"><label for="forcedNewPassword">New password (at least 8 characters, with an uppercase letter, a lowercase letter, and a special character)</label><input id="forcedNewPassword" type="password" autocomplete="new-password" minlength="8"></div>
      <p id="forcedPwError" role="alert" style="color:var(--red);font-size:12px;min-height:16px;"></p>
      <button id="forcedPwSave" class="btn btn-primary" style="width:100%;margin-top:8px;">Set Password &amp; Continue</button>
    </div>`;
    (document as any).body.append(overlay);
    (document as any).getElementById('forcedNewPassword').focus();
    (document as any).getElementById('forcedPwSave').onclick = async (): Promise<any> => {
        const password: any = (document as any).getElementById('forcedNewPassword').value;
        const email: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.email;
        const check: any = passwordMeetsPolicy(password, email);
        if (!check.ok) {
            (document as any).getElementById('forcedPwError').textContent = check.message;
            return;
        }
        const btn: any = (document as any).getElementById('forcedPwSave');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        const { error }: any = await backendClient.auth.updateUser({ password, data: { must_change_password: false } as any } as any);
        if (error) {
            (document as any).getElementById('forcedPwError').textContent = error.message;
            btn.disabled = false;
            btn.textContent = 'Set Password & Continue';
            return;
        }
        overlay.remove();
        toast('Password updated.');
    };
    (document as any).getElementById('forcedNewPassword').addEventListener('keydown', (e?: any): any => { if (e.key === 'Enter')
        (document as any).getElementById('forcedPwSave').click(); });
}
// Checked right after a successful sign-in (and again after resuming a stored session, in case
// an admin reset this same account's password mid-session). Only meaningful in shared/live mode
// -- the local demo has no Supabase auth user to check metadata on.
async function maybeForcePasswordChange(): Promise<any> {
    if (SuiteStore.mode() !== 'shared')
        return;
    try {
        const { data: { user } }: any = await backendClient.auth.getUser();
        if (user?.user_metadata?.must_change_password)
            openForcedPasswordChangeModal();
    }
    catch (e: any) {
        console.error('Could not check forced-password-change status:', e);
    }
}
// Explicitly distinguish demonstration data from authenticated agency data.
{
}
/* Saved filter views and table paging use device preferences, never agency records. */
((): any => {
    const base: any = SuiteUX.enhance;
    SuiteUX.enhance = function (): any {
        base();
        const active: any = (document as any).querySelector('.view.active');
        if (!active)
            return;
        const filters: any = [...active.querySelectorAll('.toolbar .filters input[id]:not(.searchable-select-input),.toolbar .filters select[id]')];
        if (filters.length && !active.querySelector('.saved-view-tools')) {
            const bar: any = (document as any).createElement('div');
            bar.className = 'saved-view-tools';
            bar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px';
            const key: any = 'saved-filters.' + active.id;
            const saved: any = SuiteUX.preferences.get(key, []);
            const select: any = (document as any).createElement('select');
            select.setAttribute('aria-label', 'Saved filter view');
            select.innerHTML = '<option value="">Saved views</option>';
            saved.forEach((s?: any, i?: any): any => { const o: any = (document as any).createElement('option'); o.value = String(i); o.textContent = s.name; select.append(o); });
            select.onchange = (): any => { const s: any = saved[Number(select.value)]; if (select.value === '' || !s)
                return; for (const [id, value] of Object.entries(s.values) as any) {
                const field: any = (document as any).getElementById(id);
                if (field) {
                    field.value = value;
                    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true } as any));
                }
            } };
            bar.append(select);
            const btn: any = (document as any).createElement('button');
            btn.className = 'btn btn-outline btn-sm';
            btn.textContent = 'Save current filters';
            btn.onclick = (): any => { const values: any = Object.fromEntries(filters.map((f?: any): any => [f.id, f.value])); const box: any = (document as any).getElementById('modalBox'); box.className = 'modal'; box.innerHTML = '<div class="modal-head"><h3>Save filter view</h3><button class="modal-close" id="savedViewClose">×</button></div><div class="modal-body"><div class="form-row"><label for="savedViewName">View name</label><input id="savedViewName" type="text" maxlength="60" placeholder="e.g. Patrol equipment overdue"></div></div><div class="modal-foot"><button class="btn btn-primary" id="savedViewSave">Save view</button></div>'; SuiteUX.openModal(); (document as any).getElementById('savedViewClose').onclick = closeModal; (document as any).getElementById('savedViewSave').onclick = (): any => { const name: any = (document as any).getElementById('savedViewName').value.trim(); if (!name) {
                (document as any).getElementById('savedViewName').focus();
                return;
            } SuiteUX.preferences.set(key, [{ name, values } as any, ...saved.filter((s?: any): any => s.name !== name)].slice(0, 12)); SuiteUX.clearDirty(); closeModal(); bar.remove(); SuiteUX.enhance(); toast('Filter view saved on this device.'); }; };
            bar.append(btn);
            active.prepend(bar);
        }
        active.querySelectorAll('table').forEach((table?: any): any => { if (table.dataset.paged)
            return; table.dataset.paged = '1'; const rows: any = [...table.querySelectorAll('tbody>tr')]; if (rows.length <= 50)
            return; let page: any = 0, size: any = 50; const bar: any = (document as any).createElement('div'); bar.className = 'table-pagination'; bar.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px;font-size:12px'; const prev: any = (document as any).createElement('button'), next: any = (document as any).createElement('button'), label: any = (document as any).createElement('span'); prev.className = next.className = 'btn btn-outline btn-sm'; prev.textContent = 'Previous'; next.textContent = 'Next'; const show: any = (): any => { rows.forEach((r?: any, i?: any): any => r.hidden = i < page * size || i >= (page + 1) * size); label.textContent = `${page * size + 1}–${Math.min((page + 1) * size, rows.length)} of ${rows.length}`; prev.disabled = page === 0; next.disabled = (page + 1) * size >= rows.length; }; prev.onclick = (): any => { page--; show(); }; next.onclick = (): any => { page++; show(); }; bar.append(prev, label, next); table.after(bar); show(); });
    };
})();
