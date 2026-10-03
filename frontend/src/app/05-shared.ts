function showLauncher(): any {
    ACTIVE_MODULE = null;
    ACTIVE_SHARED_VIEW = null;
    (document as any).getElementById('moduleSwitchBar').style.display = 'none';
    (document as any).getElementById('qmTenantFooter').style.display = 'none';
    (document as any).getElementById('defaultFooter').style.display = '';
    (document as any).getElementById('navlist').innerHTML = '';
    (document as any).getElementById('navSeparator').style.display = 'none';
    (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active'));
    (document as any).getElementById('view-launcher').classList.add('active');
    (document as any).getElementById('page-title').textContent = 'Choose a Module';
    (document as any).getElementById('page-sub').textContent = 'Pick a module to get started';
    const accessible: any = accessibleModules();
    const cardsHtml: any = accessible.map((key?: any): any => {
        const m: any = MODULE_META[key];
        return `
      <button type="button" class="module-card" data-enter-module="${key}">
        <div class="icon">${ICONS[m.icon]}</div>
        <h3>${m.name}</h3>
        <p>${m.tagline}</p>
      </button>`;
    }).join('') || `<div class="empty-state">${ICONS.lock}<div class="msg">No modules available</div><div class="sub">This role doesn't have access to any module yet. Your assigned role has no workspaces enabled.</div></div>`;
    (document as any).getElementById('view-launcher').innerHTML = `
    <div class="module-launcher">
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:4px;">Logged in as <strong>${escapeHtml((STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || '')}</strong> — viewing as <strong>${escapeHtml(currentRole().name)}</strong></div>
      <div class="module-grid">${cardsHtml}</div>
    </div>
  `;
    (document as any).querySelectorAll('[data-enter-module]').forEach((el?: any): any => {
        el.addEventListener('click', (): any => enterModule(el.dataset.enterModule));
    });
}
function enterModule(key?: any): any {
    if (!can(MODULE_META[key].ability)) {
        toast("This role doesn't have access to that module.", true);
        showLauncher();
        return;
    }
    ACTIVE_MODULE = key;
    (document as any).getElementById('moduleSwitchBar').style.display = '';
    (document as any).getElementById('activeModuleName').textContent = MODULE_META[key].name;
    (document as any).getElementById('qmTenantFooter').style.display = key === 'qm' ? '' : 'none';
    (document as any).getElementById('defaultFooter').style.display = key === 'qm' ? 'none' : '';
    (document as any).getElementById('navSeparator').style.display = '';
    if (key === 'qm')
        QM.start();
    else if (key === 'fleet')
        FLEET.start();
    else if (key === 'personnel')
        PM.start();
    else if (key === 'k9')
        K9.start();
    else if (key === 'drone')
        DRONE.start();
    else if (key === 'eod')
        EOD.start();
    else if (key === 'subpoena')
        SUBPOENA.start();
    else if (key === 'grants')
        GRANTS.start();
    else if (key === 'civil')
        CIVIL.start();
}
/* =========================================================================
   SHARED ROLE SWITCHER
   ========================================================================= */
function renderModuleGate(): any {
    // called after an ability change affecting the currently-active role, to react live
    if (ACTIVE_MODULE && !can(MODULE_META[ACTIVE_MODULE].ability)) {
        toast("This role no longer has access to that module.", true);
        showLauncher();
    }
}
function roleSwitcherSummary(): any {
    const ids: any = STATE.currentRoleIds || [];
    if (ids.length === 0)
        return '—';
    if (ids.length === 1)
        return roleName(ids[0]);
    return `${ids.length} roles`;
}
function renderRoleSwitcher(): any {
    const btn: any = (document as any).getElementById('btnRoleSwitcher');
    const loggedInEl: any = (document as any).getElementById('loggedInAs');
    const person: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID);
    loggedInEl.textContent = person ? `Logged in as ${person.name}` : '';
    btn.textContent = roleSwitcherSummary();
    (document as any).getElementById('abilityCountPill').textContent = countAbilities(currentRole()) + " abilities";
    btn.onclick = (e?: any): any => {
        e.stopPropagation();
        const panel: any = (document as any).getElementById('roleSwitcherPanel');
        if (panel.style.display === 'none' || !panel.innerHTML) {
            renderRoleSwitcherPanel();
            panel.style.display = '';
        }
        else {
            panel.style.display = 'none';
        }
    };
}
function renderRoleSwitcherPanel(): any {
    const panel: any = (document as any).getElementById('roleSwitcherPanel');
    const active: any = STATE.currentRoleIds || [];
    panel.innerHTML = `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-weight:800;color:var(--heading);font-size:12.5px;">Viewing as (select one or more)</div>
    <div style="padding:8px 14px;">
      ${STATE.roles.filter((r?: any): any => !r.hidden || loggedInPersonHasRole(r.id)).map((r?: any): any => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;cursor:pointer;">
          <input type="checkbox" class="roleSwitcherCheck" value="${r.id}" ${active.includes(r.id) ? 'checked' : ''} style="width:auto;">
          ${escapeHtml(r.name)}
        </label>
      `).join('')}
    </div>
    <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
      <button class="btn btn-sm btn-primary" id="btnApplyRoleSwitch">Apply</button>
    </div>
  `;
    (document as any).getElementById('btnApplyRoleSwitch').addEventListener('click', (): any => {
        const chosen: any = Array.from((document as any).querySelectorAll('.roleSwitcherCheck:checked')).map((el?: any): any => el.value);
        if (chosen.length === 0) {
            toast("Select at least one role.", true);
            return;
        }
        STATE.currentRoleIds = chosen;
        (document as any).getElementById('roleSwitcherPanel').style.display = 'none';
        renderRoleSwitcher();
        renderSuiteNav();
        const SHARED_VIEW_ABILITY: any = { roles: 'admin_roles', personnel: 'personnel_view', fieldlabels: 'manage_field_labels', branding: 'manage_branding',
            audit: (): any => can('qm_admin_audit') || can('fleet_admin_audit') || can('pm_admin_audit') || can('k9_admin_audit') || can('drone_admin_audit') || can('eod_admin_audit') || can('subpoena_admin_audit') || can('grants_admin_audit') || can('civil_admin_audit') } as any;
        if (ACTIVE_MODULE && !can(MODULE_META[ACTIVE_MODULE].ability)) {
            toast("Switched to a role combination without access to this module.");
            showLauncher();
        }
        else if (ACTIVE_MODULE === 'qm') {
            QM.start();
        }
        else if (ACTIVE_MODULE === 'fleet') {
            FLEET.start();
        }
        else if (ACTIVE_MODULE === 'personnel') {
            PM.start();
        }
        else if (ACTIVE_MODULE === 'k9') {
            K9.start();
        }
        else if (ACTIVE_MODULE === 'drone') {
            DRONE.start();
        }
        else if (ACTIVE_MODULE === 'eod') {
            EOD.start();
        }
        else if (ACTIVE_MODULE === 'subpoena') {
            SUBPOENA.start();
        }
        else if (ACTIVE_MODULE === 'grants') {
            GRANTS.start();
        }
        else if (ACTIVE_MODULE === 'civil') {
            CIVIL.start();
        }
        else if (ACTIVE_SHARED_VIEW) {
            const req: any = SHARED_VIEW_ABILITY[ACTIVE_SHARED_VIEW];
            const stillAllowed: any = typeof req === 'function' ? req() : can(req);
            if (!stillAllowed) {
                toast("Switched to a role combination without access to this screen.");
                showLauncher();
            }
            else {
                if (ACTIVE_SHARED_VIEW === 'personnel')
                    PM.switchView('pm-records');
                else if (ACTIVE_SHARED_VIEW === 'roles')
                    renderRoles();
                else if (ACTIVE_SHARED_VIEW === 'audit')
                    renderPlatformAuditLogTab((document as any).getElementById('view-audit'));
                else if (ACTIVE_SHARED_VIEW === 'fieldlabels')
                    renderFieldLabelsAdmin();
                else if (ACTIVE_SHARED_VIEW === 'branding')
                    renderBrandingAdmin();
            }
        }
        else {
            showLauncher();
        }
        renderNotifBell();
    });
}
(document as any).addEventListener('click', (e?: any): any => {
    const panel: any = (document as any).getElementById('roleSwitcherPanel');
    if (panel && panel.style.display !== 'none' && !panel.contains(e.target) && e.target.id !== 'btnRoleSwitcher') {
        panel.style.display = 'none';
    }
});
/* =========================================================================
   SHARED NOTIFICATION BELL (aggregates both modules)
   ========================================================================= */
function renderNotifBell(): any {
    function safely(label?: any, fn?: any): any { try {
        return fn();
    }
    catch (e: any) {
        console.error(`renderNotifBell: "${label}" failed (skipping):`, e);
        return [];
    } }
    safely('QM.recalcNotifications', (): any => QM.recalcNotifications());
    safely('FLEET.recalcNotifications', (): any => FLEET.recalcNotifications());
    safely('PM.recalcNotifications', (): any => PM.recalcNotifications());
    safely('K9.recalcNotifications', (): any => K9.recalcNotifications());
    safely('DRONE.recalcNotifications', (): any => DRONE.recalcNotifications());
    safely('EOD.recalcNotifications', (): any => EOD.recalcNotifications());
    safely('SUBPOENA.recalcNotifications', (): any => SUBPOENA.recalcNotifications());
    safely('GRANTS.recalcNotifications', (): any => GRANTS.recalcNotifications());
    safely('CIVIL.recalcNotifications', (): any => CIVIL.recalcNotifications());
    const mine: any = [
        ...safely('qm notifications', (): any => STATE.qm.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Quartermaster' } as any))),
        ...safely('fleet notifications', (): any => STATE.fleet.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Fleet' } as any))),
        ...safely('pm notifications', (): any => STATE.pm.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Personnel' } as any))),
        ...safely('k9 notifications', (): any => STATE.k9.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'K9' } as any))),
        ...safely('drone notifications', (): any => STATE.drone.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Drone' } as any))),
        ...safely('eod notifications', (): any => STATE.eod.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'EOD' } as any))),
        ...safely('subpoena notifications', (): any => STATE.subpoena.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Subpoena' } as any))),
        ...safely('grants notifications', (): any => STATE.grants.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Grants' } as any))),
        ...safely('civil notifications', (): any => STATE.civil.notifications.filter((n?: any): any => STATE.currentRoleIds.includes(n.recipientRoleId)).map((n?: any): any => ({ ...n, module: 'Civil' } as any))),
    ];
    const isRead: any = (n?: any): any => (n.readBy || []).includes(CURRENT_USER_ID) || (typeof SuiteStore !== 'undefined' && SuiteStore.isNotificationRead(n.module, n.id));
    const unread: any = mine.filter((n?: any): any => !isRead(n)).length;
    const badge: any = (document as any).getElementById('notifBadge');
    badge.style.display = unread ? '' : 'none';
    badge.textContent = unread > 9 ? '9+' : String(unread);
    (window as any).__SUITE_NOTIFS = mine;
}
function toggleNotifPanel(): any {
    const panel: any = (document as any).getElementById('notifPanel');
    if (panel.style.display === 'none' || !panel.innerHTML) {
        renderNotifPanel();
        panel.style.display = '';
    }
    else {
        panel.style.display = 'none';
    }
}
function renderNotifPanel(): any {
    const panel: any = (document as any).getElementById('notifPanel');
    const all: any = (window as any).__SUITE_NOTIFS || [];
    const mine: any = all.filter((n?: any): any => !(n.readBy || []).includes(CURRENT_USER_ID) && !SuiteStore.isNotificationRead(n.module, n.id));
    const rows: any = mine.map((n?: any): any => `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;">
      <span class="badge badge-role" style="flex-shrink:0;">${n.module}</span>
      <div style="flex:1;font-size:12.5px;line-height:1.4;">
        ${escapeHtml(n.message)}
        <div style="margin-top:4px;"><button class="btn btn-sm btn-outline" data-mark-read="${n.module}|${n.id}" style="padding:2px 8px;font-size:11px;">Mark read</button></div>
      </div>
    </div>
  `).join('') || `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">You're all caught up. Nothing needs your attention right now.</div>`;
    panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div>
        <div style="font-weight:800;color:var(--heading);font-size:13.5px;">Notifications for ${escapeHtml(currentRole().name)}</div>
        ${mine.length ? `<button class="btn btn-sm btn-outline" id="btnMarkAllRead" style="padding:3px 8px;font-size:11px;margin-top:6px;">Mark all read</button>` : ''}
      </div>
      <button class="modal-close" id="btnNotifClose" title="Close" aria-label="Close notifications" style="flex-shrink:0;">&times;</button>
    </div>
    ${rows}
  `;
    (document as any).getElementById('btnNotifClose').addEventListener('click', (): any => { panel.style.display = 'none'; });
    (document as any).querySelectorAll('[data-mark-read]').forEach((b?: any): any => b.addEventListener('click', async (): Promise<any> => {
        const [mod, id]: any = b.dataset.markRead.split('|');
        b.disabled = true;
        if (!await SuiteStore.markNotificationsRead([{ module: mod, id } as any])) {
            toast('Could not save the read status. Try again when connected.', true);
            b.disabled = false;
            return;
        }
        renderNotifBell();
        renderNotifPanel();
    }));
    const markAll: any = (document as any).getElementById('btnMarkAllRead');
    if (markAll)
        markAll.addEventListener('click', async (): Promise<any> => {
            markAll.disabled = true;
            if (!await SuiteStore.markNotificationsRead(mine.map((n?: any): any => ({ module: n.module, id: n.id } as any)))) {
                toast('Some read statuses could not be saved. Try again when connected.', true);
                markAll.disabled = false;
                return;
            }
            renderNotifBell();
            renderNotifPanel();
        });
}
/* =========================================================================
   SHELL STARTUP
   ========================================================================= */
function startShell(): any {
    applyAgencyBranding();
    renderRoleSwitcher();
    renderSuiteNav();
    showLauncher();
    (document as any).getElementById('btnSwitchModule').addEventListener('click', showLauncher);
    (document as any).getElementById('btnResetDemo').addEventListener('click', resetDemoData);
    (document as any).getElementById('btnLogout').addEventListener('click', logout);
    (document as any).getElementById('btnChangePassword').addEventListener('click', openChangePasswordModal);
    (document as any).getElementById('btnNotifBell').addEventListener('click', (e?: any): any => { e.stopPropagation(); toggleNotifPanel(); });
    (document as any).addEventListener('click', (e?: any): any => {
        const panel: any = (document as any).getElementById('notifPanel');
        if (panel.style.display !== 'none' && !panel.contains(e.target) && e.target.id !== 'btnNotifBell') {
            panel.style.display = 'none';
        }
    });
    renderNotifBell();
}
