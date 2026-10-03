/* Multi-tenant platform control plane. Agency records remain in SuiteStore. */
const TenantPlatform: any = ((): any => {
    const CATALOG_KEY: any = 'pss.platform.catalog.v1';
    const CONTEXT_KEY: any = 'pss.platform.context.v1';
    const MODULE_KEYS: any = ['qm', 'fleet', 'personnel', 'k9', 'drone', 'eod', 'subpoena', 'grants', 'civil'];
    const MODULE_LABELS: any = { qm: 'Quartermaster', fleet: 'Fleet', personnel: 'Personnel', k9: 'K9', drone: 'UAS', eod: 'EOD', subpoena: 'Subpoenas', grants: 'Grants & Forfeiture', civil: 'Civil Process' } as any;
    const STATUS_LABELS: any = { provisioning: 'Provisioning', setup: 'Setup', active: 'Active', suspended: 'Suspended' } as any;
    let catalog: any = null, current: any = null, wizard: any = null, detailTenantId: any = null;
    const esc: any = (s?: any): any => escapeHtml(s ?? '');
    const uuid: any = (prefix?: any): any => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const now: any = (): any => (new Date() as any).toISOString();
    const stored: any = (key?: any, fallback?: any): any => { try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    }
    catch {
        return fallback;
    } };
    const put: any = (key?: any, value?: any): any => { try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch {
        toast('Tenant settings could not be saved on this device.', true);
    } };
    function seedCatalog(): any { return { version: 1, tenants: [{ id: 'tenant_demo', slug: 'reno-public-safety', name: 'Reno Public Safety', timezone: 'America/Los_Angeles', status: 'active', plan: 'Enterprise', enabledModules: [...MODULE_KEYS], createdAt: now(), updatedAt: now(), agencies: [{ id: 'agency_reno', name: 'Reno Police Department', abbreviation: 'RPD', type: 'Municipal Police', ori: 'NV0160100', status: 'active', branding: { title: 'Reno Public Safety Management Suite', subtitle: 'Operational readiness in one workspace' } as any } as any], admins: [{ id: 'admin_fred', personId: 'p9', name: 'Fred Marziano', email: 'fred.marziano@mark43.com', roleIds: ['role_admin', 'role_platform_admin'], status: 'active' } as any], invites: [], regionalWorkspaces: [], supportSessions: [], audit: [{ id: uuid('ta'), at: now(), actor: 'Platform bootstrap', action: 'Tenant activated' } as any] } as any], current: { tenantId: 'tenant_demo', agencyId: 'agency_reno' } as any } as any; }
    function load(): any { catalog = stored(CATALOG_KEY, null) || seedCatalog(); current = stored(CONTEXT_KEY, null) || catalog.current || { tenantId: catalog.tenants[0]?.id, agencyId: catalog.tenants[0]?.agencies[0]?.id } as any; normalize(); save(); }
    function normalize(): any { catalog.tenants = Array.isArray(catalog.tenants) ? catalog.tenants : []; for (const t of catalog.tenants) {
        t.enabledModules = t.enabledModules || [];
        t.agencies = t.agencies || [];
        t.admins = t.admins || [];
        t.invites = t.invites || [];
        t.regionalWorkspaces = t.regionalWorkspaces || [];
        t.supportSessions = t.supportSessions || [];
        t.audit = t.audit || [];
    } if (!tenant(current?.tenantId) || !agency(current?.tenantId, current?.agencyId)) {
        const t: any = catalog.tenants.find((t?: any): any => t.status !== 'suspended') || catalog.tenants[0];
        current = t ? { tenantId: t.id, agencyId: t.agencies[0]?.id } as any : null;
    } }
    function save(): any { catalog.current = current; put(CATALOG_KEY, catalog); put(CONTEXT_KEY, current); }
    function tenant(id: any = current?.tenantId): any { return catalog?.tenants.find((t?: any): any => t.id === id); }
    function agency(tenantId: any = current?.tenantId, agencyId: any = current?.agencyId): any { return tenant(tenantId)?.agencies.find((a?: any): any => a.id === agencyId); }
    function actualRoles(): any { return SuiteStore.mode() === 'shared' ? (HOME_ROLE_IDS || []) : (STATE?.personnel?.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || []); }
    function isPlatformAdmin(): any { return actualRoles().includes('role_platform_admin'); }
    function isSystemAdmin(): any { return actualRoles().includes('role_admin'); }
    function contexts(): any { if (isPlatformAdmin())
        return catalog.tenants.flatMap((t?: any): any => t.agencies.map((a?: any): any => ({ tenant: t, agency: a } as any))); const memberships: any = currentPersonMemberships(); return memberships.map((m?: any): any => ({ tenant: tenant(m.tenantId), agency: agency(m.tenantId, m.agencyId) } as any)).filter((x?: any): any => x.tenant && x.agency); }
    function currentPersonMemberships(): any { const p: any = STATE?.personnel?.find((p?: any): any => p.id === CURRENT_USER_ID); return p?.tenantMemberships || [{ tenantId: current.tenantId, agencyId: current.agencyId, roleIds: p?.roleIds || [] } as any]; }
    function activeModules(): any { const t: any = tenant(); return t?.enabledModules || []; }
    function moduleEnabled(key?: any): any {
        // The catalog may be temporarily unavailable while the workspace is loading. Role abilities
        // remain the security boundary; an absent catalog must not hide every module.
        const t: any = tenant();
        if (!t || !Array.isArray(t.enabledModules) || !t.enabledModules.length)
            return true;
        return t.enabledModules.includes(key);
    }
    function audit(t?: any, action?: any): any { t.audit.unshift({ id: uuid('ta'), at: now(), actor: STATE?.personnel?.find((p?: any): any => p.id === CURRENT_USER_ID)?.name || 'Platform Admin', action } as any); t.updatedAt = now(); save(); }
    function contextLabel(): any { const t: any = tenant(), a: any = agency(); return a ? `${a.abbreviation || a.name} · ${t?.name || ''}` : 'No agency selected'; }
    function renderContext(): any { const host: any = (document as any).getElementById('tenantContextHost'); if (!host)
        return; const list: any = contexts(); host.hidden = list.length < 2 && !isPlatformAdmin(); host.innerHTML = `<div style="position:relative"><button class="btn btn-outline btn-sm" id="tenantContextButton" aria-haspopup="menu" aria-expanded="false"><span class="tenant-context-name">${esc(contextLabel())}</span> ▾</button><div class="tenant-menu" id="tenantContextMenu" role="menu" hidden></div></div>`; const btn: any = host.querySelector('#tenantContextButton'), menu: any = host.querySelector('#tenantContextMenu'); btn.onclick = (e?: any): any => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden)
        renderMenu(menu); }; }
    function renderMenu(menu?: any): any { const list: any = contexts(); menu.innerHTML = '<div style="padding:9px 12px;font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Agency workspace</div>'; for (const c of list) {
        const b: any = (document as any).createElement('button');
        b.className = 'tenant-option';
        b.role = 'menuitem';
        b.innerHTML = `<span><strong>${esc(c.agency.name)}</strong><small>${esc(c.tenant.name)} · ${esc(STATUS_LABELS[c.tenant.status])}</small></span><span class="check">${c.tenant.id === current.tenantId && c.agency.id === current.agencyId ? '✓' : ''}</span>`;
        b.disabled = c.tenant.status === 'suspended';
        b.onclick = (): any => switchContext(c.tenant.id, c.agency.id);
        menu.append(b);
    } if (isPlatformAdmin()) {
        const manage: any = (document as any).createElement('button');
        manage.className = 'tenant-option';
        manage.innerHTML = '<span><strong>Tenant Management</strong><small>Provision and administer customers</small></span><span>→</span>';
        manage.onclick = showTenantManagement;
        menu.append(manage);
    } }
    async function switchContext(tenantId?: any, agencyId?: any): Promise<any> { const t: any = tenant(tenantId), a: any = agency(tenantId, agencyId); if (!t || !a || t.status === 'suspended') {
        toast('That tenant is not available.', true);
        return;
    } if (!isPlatformAdmin() && !currentPersonMemberships().some((m?: any): any => m.tenantId === tenantId && m.agencyId === agencyId)) {
        toast('You are not assigned to that agency.', true);
        return;
    } if (!hasAccess(t, a)) {
        toast('That agency membership is not active.', true);
        return;
    } if (!SuiteUX.guard())
        return; try {
        if (SuiteStore.mode() === 'shared')
            await SuiteStore.loadRemoteContext(tenantId, agencyId);
        else {
            if (!await SuiteStore.flush())
                throw Error('Save pending changes before switching agencies.');
            snapshotCurrent();
            let next: any = stored(workspaceKey(tenantId, agencyId), null);
            if (!next)
                next = await newAgencyState(t, a);
            await SuiteStore.adopt(next);
            STATE.currentRoleIds = [...actualRolesForContext(next)];
        }
    }
    catch (error: any) {
        toast(error.message, true);
        return;
    } current = { tenantId, agencyId } as any; save(); applyAgencyBranding(); renderRoleSwitcher(); renderContext(); renderBanner(); try {
        history.replaceState({} as any, '', '#/agency/' + encodeURIComponent(t.slug));
    }
    catch { } SuiteUX.home(); toast(`Switched to ${a.name}.`); }
    function hasAccess(t?: any, a?: any): any { return t.status === 'active' || t.status === 'setup' || isPlatformAdmin(); }
    function actualRolesForContext(state?: any): any { if (SuiteStore.mode() === 'shared')
        return HOME_ROLE_IDS || []; return state.personnel?.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || ['role_admin', 'role_platform_admin']; }
    function workspaceKey(tid?: any, aid?: any): any { return `pss.workspace.${tid}.${aid}.v1`; }
    function snapshotCurrent(): any { if (SuiteStore.mode() !== 'local' || !current || !STATE)
        return; put(workspaceKey(current.tenantId, current.agencyId), STATE); }
    async function newAgencyState(t?: any, a?: any): Promise<any> {
        const state: any = await buildSeedState();
        for (const [root, data] of Object.entries(state) as any) {
            if (!['qm', 'fleet', 'pm', 'k9', 'drone', 'eod', 'subpoena', 'grants', 'civil'].includes(root) || !data || typeof data !== 'object')
                continue;
            for (const [k, v] of Object.entries(data) as any)
                if (Array.isArray(v) && !['refData'].includes(k))
                    data[k] = [];
        }
        const fred: any = state.personnel.find((p?: any): any => p.name === 'Fred Marziano') || state.personnel[0];
        state.personnel = [fred];
        state.accounts = state.accounts.filter((ac?: any): any => ac.personId === fred.id);
        fred.roleIds = ['role_admin', 'role_platform_admin'];
        state.currentRoleIds = [...fred.roleIds];
        state.agencyBranding = { logoDataUrl: null, title: a.branding?.title || `${a.name} Public Safety Suite`, subtitle: a.branding?.subtitle || 'Operational readiness in one workspace' } as any;
        state.tenantContext = { tenantId: t.id, agencyId: a.id, tenantName: t.name, agencyName: a.name, enabledModules: t.enabledModules } as any;
        return state;
    }
    function init(): any { load(); const remote: any = SuiteStore.remoteContext?.(); if (remote?.tenantId && remote?.agencyId)
        current = remote; if (!(document as any).getElementById('tenantContextHost')) {
        const toolbar: any = (document as any).querySelector('#topbar .role-switch');
        const host: any = (document as any).createElement('div');
        host.id = 'tenantContextHost';
        host.className = 'tenant-switcher';
        toolbar.prepend(host);
    } if (!(document as any).getElementById('tenantIdentityBanner')) {
        const banner: any = (document as any).createElement('div');
        banner.className = 'tenant-banner';
        banner.id = 'tenantIdentityBanner';
        (document as any).getElementById('topbar').after(banner);
    } renderContext(); renderBanner(); if (!(document as any).documentElement.dataset.tenantMenuBound) {
        (document as any).documentElement.dataset.tenantMenuBound = 'true';
        (document as any).addEventListener('click', (e?: any): any => { const menu: any = (document as any).getElementById('tenantContextMenu'); if (menu && !e.target.closest('#tenantContextHost'))
            menu.hidden = true; });
    } if (SuiteStore.mode() === 'shared')
        refreshRemote().catch((e?: any): any => toast(e.message || 'Tenant catalog could not be loaded.', true)); }
    function renderBanner(): any { const b: any = (document as any).getElementById('tenantIdentityBanner'), t: any = tenant(), a: any = agency(); if (!b || !t || !a)
        return; b.innerHTML = `<strong>${esc(a.name)}</strong><span>${esc(t.name)}</span><span>${esc(t.timezone)}</span><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span>`; }
    function refresh(): any { renderContext(); renderBanner(); }
    function showTenantManagement(): any { if (!isPlatformAdmin()) {
        toast('Platform Admin access is required.', true);
        return;
    } const el: any = SuiteUX.showPlatformView ? SuiteUX.showPlatformView('tenant-management', 'Tenant Management', 'Provision agencies, control modules, and manage tenant lifecycle') : null; if (!el) {
        const target: any = (document as any).getElementById('view-home');
        return;
    } renderTenantList(el); }
    function renderTenantList(el?: any): any { detailTenantId = null; const counts: any = { active: catalog.tenants.filter((t?: any): any => t.status === 'active').length, setup: catalog.tenants.filter((t?: any): any => ['setup', 'provisioning'].includes(t.status)).length, suspended: catalog.tenants.filter((t?: any): any => t.status === 'suspended').length, agencies: catalog.tenants.reduce((n?: any, t?: any): any => n + t.agencies.length, 0) } as any; el.innerHTML = `<div class="tenant-toolbar"><div><div class="work-eyebrow">Platform control plane</div><h2 style="margin:0;color:var(--heading)">Customer tenants</h2></div><div style="display:flex;gap:8px"><button class="btn btn-outline" id="addAgencyExisting">Add agency</button><button class="btn btn-primary" id="createTenant">Create tenant</button></div></div><div class="tenant-summary"><div class="tenant-stat"><strong>${counts.active}</strong><span>Active tenants</span></div><div class="tenant-stat"><strong>${counts.setup}</strong><span>In setup</span></div><div class="tenant-stat"><strong>${counts.agencies}</strong><span>Total agencies</span></div><div class="tenant-stat"><strong>${counts.suspended}</strong><span>Suspended</span></div></div><div class="tenant-table-wrap"><table><thead><tr><th>Tenant</th><th>Status</th><th>Agencies</th><th>Modules</th><th>Plan</th><th></th></tr></thead><tbody>${catalog.tenants.map((t?: any): any => `<tr><td><div class="tenant-name">${esc(t.name)}</div><div class="tenant-slug">${esc(t.slug)}</div></td><td><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></td><td>${t.agencies.length}</td><td><div class="tenant-module-list">${t.enabledModules.slice(0, 4).map((m?: any): any => `<span class="tenant-module">${esc(MODULE_LABELS[m])}</span>`).join('')}${t.enabledModules.length > 4 ? `<span class="tenant-module">+${t.enabledModules.length - 4}</span>` : ''}</div></td><td>${esc(t.plan)}</td><td><button class="btn btn-outline btn-sm" data-open-tenant="${esc(t.id)}">Manage</button></td></tr>`).join('')}</tbody></table></div>`; el.querySelector('#createTenant').onclick = (): any => startWizard('tenant'); el.querySelector('#addAgencyExisting').onclick = (): any => startWizard('agency'); el.querySelectorAll('[data-open-tenant]').forEach((b?: any): any => b.onclick = (): any => showTenantDetail(b.dataset.openTenant)); }
    function defaultWizard(kind?: any): any { const baseTenant: any = tenant(); return { kind, step: 0, tenantId: kind === 'agency' ? baseTenant?.id : null, name: '', slug: '', timezone: 'America/Los_Angeles', plan: 'Enterprise', agencyName: '', abbreviation: '', agencyType: 'Municipal Police', ori: '', modules: kind === 'agency' ? [...(baseTenant?.enabledModules || MODULE_KEYS)] : [...MODULE_KEYS], template: 'Standard Law Enforcement', adminName: '', adminEmail: '', importMode: 'empty', status: 'setup' } as any; }
    function startWizard(kind?: any): any { if (!isPlatformAdmin())
        return; wizard = defaultWizard(kind); renderWizard(); }
    const STEPS: any = ['Tenant', 'Agency', 'Modules', 'Template', 'Administrator', 'Data', 'Review'];
    function renderWizard(): any { const box: any = (document as any).getElementById('modalBox'); box.className = 'modal modal-xl'; box.innerHTML = `<div class="modal-head"><div><h3>${wizard.kind === 'tenant' ? 'Create New Tenant' : 'Add Agency to Tenant'}</h3><div style="font-size:12px;color:var(--text-dim)">Guided onboarding · no code deployment required</div></div><button class="modal-close" id="wizardClose">×</button></div><div class="modal-body" style="padding:0"><div class="onboarding-shell"><aside class="onboarding-steps">${STEPS.map((s?: any, i?: any): any => `<div class="onboarding-step ${i === wizard.step ? 'active' : i < wizard.step ? 'done' : ''}"><span class="num">${i < wizard.step ? '✓' : i + 1}</span><span>${s}</span></div>`).join('')}</aside><main class="onboarding-main" id="wizardMain"></main></div></div>`; SuiteUX.openModal(); box.querySelector('#wizardClose').onclick = (e?: any): any => SuiteUX.closeModal(e); renderWizardStep(); }
    function field(id?: any, label?: any, value?: any, type: any = 'text', extra: any = ''): any { return `<div class="form-row"><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`; }
    function renderWizardStep(): any {
        const main: any = (document as any).getElementById('wizardMain');
        let body: any = '', title: any = '', sub: any = '';
        switch (wizard.step) {
            case 0:
                title = wizard.kind === 'tenant' ? 'Define the customer tenant' : 'Select the customer tenant';
                sub = 'The tenant is the customer boundary for licensing, lifecycle, and billing.';
                body = wizard.kind === 'tenant' ? `<div class="onboarding-fields">${field('wTenantName', 'Customer or tenant name', wizard.name)}${field('wTenantSlug', 'Tenant URL identifier', wizard.slug, 'text', 'pattern="[a-z0-9-]+"')}${field('wTimezone', 'Time zone', wizard.timezone)}<div class="form-row"><label for="wPlan">Subscription plan</label><select id="wPlan"><option>Enterprise</option><option>Professional</option><option>Pilot</option></select></div></div>` : `<div class="form-row"><label for="wExistingTenant">Existing tenant</label><select id="wExistingTenant">${catalog.tenants.filter((t?: any): any => t.status !== 'suspended').map((t?: any): any => `<option value="${t.id}" ${t.id === wizard.tenantId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>`;
                break;
            case 1:
                title = 'Add the first agency';
                sub = 'An agency is the operational data boundary within the tenant.';
                body = `<div class="onboarding-fields">${field('wAgencyName', 'Agency name', wizard.agencyName)}${field('wAbbreviation', 'Abbreviation', wizard.abbreviation)}<div class="form-row"><label for="wAgencyType">Agency type</label><select id="wAgencyType">${['Municipal Police', 'Sheriff’s Office', 'Fire / EMS', 'Regional Authority', 'Prosecutor', 'Other Public Safety'].map((x?: any): any => `<option ${x === wizard.agencyType ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${field('wOri', 'ORI or agency identifier', wizard.ori)}</div>`;
                break;
            case 2:
                title = 'Enable licensed modules';
                sub = 'Users see only modules that are enabled here and allowed by their roles.';
                body = `<div class="module-select-grid">${MODULE_KEYS.map((k?: any): any => `<label class="module-choice"><input type="checkbox" data-module="${k}" ${wizard.modules.includes(k) ? 'checked' : ''}><span><strong>${MODULE_LABELS[k]}</strong><span>${esc(MODULE_META[k].tagline)}</span></span></label>`).join('')}</div>`;
                break;
            case 3:
                title = 'Apply a configuration template';
                sub = 'Templates establish reference values and baseline workflows. Agency administrators can refine them later.';
                body = `<div class="onboarding-fields"><div class="form-row full"><label for="wTemplate">Starting template</label><select id="wTemplate">${['Standard Law Enforcement', 'Sheriff / Countywide', 'Regional Multi-Agency', 'Fire / EMS', 'Blank Configuration'].map((x?: any): any => `<option ${x === wizard.template ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div><div class="setup-checklist" style="margin-top:18px"><div class="setup-check">${ICONS.check}<span>Standard roles and abilities</span></div><div class="setup-check">${ICONS.check}<span>Module reference lists and notification routes</span></div><div class="setup-check">${ICONS.check}<span>Agency branding defaults and audit controls</span></div></div>`;
                break;
            case 4:
                title = 'Invite the agency System Admin';
                sub = 'The first agency administrator can configure this agency but cannot enter other tenants.';
                body = `<div class="onboarding-fields">${field('wAdminName', 'Administrator name', wizard.adminName)}${field('wAdminEmail', 'Government email', wizard.adminEmail, 'email')}</div><div class="callout callout-blue" style="margin-top:18px">The invitation creates an agency-scoped System Admin membership. Platform Admin access cannot be granted from this workflow.</div>`;
                break;
            case 5:
                title = 'Choose the initial data path';
                sub = 'Start empty or prepare a validated import after tenant creation.';
                body = `<div class="module-select-grid"><label class="module-choice"><input type="radio" name="importMode" value="empty" ${wizard.importMode === 'empty' ? 'checked' : ''}><span><strong>Start empty</strong><span>Use the selected template and enter data through the application.</span></span></label><label class="module-choice"><input type="radio" name="importMode" value="import" ${wizard.importMode === 'import' ? 'checked' : ''}><span><strong>Prepare validated import</strong><span>Create the tenant now and hold activation until an import is verified.</span></span></label></div>`;
                break;
            case 6:
                title = 'Review and create';
                sub = 'The new tenant begins in Setup so Platform and Agency administrators can validate it before activation.';
                body = `<div class="review-grid"><div class="review-card"><h3>Tenant</h3><p><strong>${esc(wizard.kind === 'tenant' ? wizard.name : tenant(wizard.tenantId)?.name)}</strong></p><p>${esc(wizard.kind === 'tenant' ? wizard.slug : tenant(wizard.tenantId)?.slug)}</p><p>${esc(wizard.kind === 'tenant' ? wizard.timezone : tenant(wizard.tenantId)?.timezone)}</p></div><div class="review-card"><h3>Agency</h3><p><strong>${esc(wizard.agencyName)}</strong> (${esc(wizard.abbreviation)})</p><p>${esc(wizard.agencyType)}</p><p>${esc(wizard.ori || 'No identifier provided')}</p></div><div class="review-card"><h3>Modules</h3><p>${wizard.modules.map((m?: any): any => esc(MODULE_LABELS[m])).join(', ')}</p></div><div class="review-card"><h3>Administrator</h3><p>${esc(wizard.adminName)}</p><p>${esc(wizard.adminEmail)}</p><p>System Admin · Invitation pending</p></div></div>`;
        }
        main.innerHTML = `<h2>${title}</h2><div class="sub">${sub}</div>${body}<div id="wizardError" class="field-error" role="alert" style="margin-top:14px"></div><div class="onboarding-actions"><button class="btn btn-outline" id="wizardBack" ${wizard.step === 0 ? 'disabled' : ''}>Back</button><button class="btn btn-primary" id="wizardNext">${wizard.step === 6 ? 'Create tenant' : 'Continue'}</button></div>`;
        main.querySelector('#wizardBack').onclick = (): any => { captureStep(); wizard.step--; renderWizard(); };
        main.querySelector('#wizardNext').onclick = async (): Promise<any> => { if (!captureStep(true))
            return; if (wizard.step < 6) {
            wizard.step++;
            renderWizard();
        }
        else
            await provision(); };
        SuiteUX.enhance();
    }
    function captureStep(validate: any = false): any { const value: any = (id?: any): any => (document as any).getElementById(id)?.value.trim(); const error: any = (msg?: any): any => { const e: any = (document as any).getElementById('wizardError'); if (e)
        e.textContent = msg; return false; }; switch (wizard.step) {
        case 0:
            if (wizard.kind === 'tenant') {
                wizard.name = value('wTenantName');
                wizard.slug = value('wTenantSlug').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                wizard.timezone = value('wTimezone');
                wizard.plan = (document as any).getElementById('wPlan')?.value || wizard.plan;
                if (validate && (!wizard.name || wizard.slug.length < 3 || !wizard.timezone))
                    return error('Enter a tenant name, URL identifier, and time zone.');
                if (validate && catalog.tenants.some((t?: any): any => t.slug === wizard.slug))
                    return error('That tenant URL identifier is already in use.');
            }
            else {
                wizard.tenantId = (document as any).getElementById('wExistingTenant')?.value;
                if (validate && !wizard.tenantId)
                    return error('Select a tenant.');
            }
            break;
        case 1:
            wizard.agencyName = value('wAgencyName');
            wizard.abbreviation = value('wAbbreviation').toUpperCase();
            wizard.agencyType = (document as any).getElementById('wAgencyType')?.value || wizard.agencyType;
            wizard.ori = value('wOri');
            if (validate && (!wizard.agencyName || !wizard.abbreviation))
                return error('Enter an agency name and abbreviation.');
            {
                const t: any = wizard.kind === 'tenant' ? null : tenant(wizard.tenantId);
                if (validate && t?.agencies.some((a?: any): any => a.name.toLowerCase() === wizard.agencyName.toLowerCase()))
                    return error('That agency already exists in this tenant.');
            }
            break;
        case 2:
            wizard.modules = [...(document as any).querySelectorAll('[data-module]:checked')].map((x?: any): any => x.dataset.module);
            if (validate && !wizard.modules.length)
                return error('Enable at least one module.');
            break;
        case 3:
            wizard.template = (document as any).getElementById('wTemplate')?.value || wizard.template;
            break;
        case 4:
            wizard.adminName = value('wAdminName');
            wizard.adminEmail = value('wAdminEmail').toLowerCase();
            if (validate && (!wizard.adminName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wizard.adminEmail)))
                return error('Enter the administrator’s name and a valid email address.');
            break;
        case 5: wizard.importMode = (document as any).querySelector('[name=importMode]:checked')?.value || 'empty';
    } return true; }
    async function provision(): Promise<any> { const next: any = (document as any).getElementById('wizardNext'); next.disabled = true; next.textContent = 'Creating…'; try {
        let result: any;
        if (SuiteStore.mode() === 'shared')
            result = await provisionRemote();
        else
            result = await provisionLocal();
        SuiteUX.clearDirty();
        SuiteUX.closeModal();
        toast(`${result.agency.name} created in Setup.`);
        showTenantDetail(result.tenant.id);
    }
    catch (e: any) {
        next.disabled = false;
        next.textContent = 'Create tenant';
        (document as any).getElementById('wizardError').textContent = e.message || 'Tenant creation failed.';
    } }
    async function provisionLocal(): Promise<any> {
        let t: any;
        if (wizard.kind === 'tenant') {
            t = { id: uuid('tenant'), slug: wizard.slug, name: wizard.name, timezone: wizard.timezone, status: 'setup', plan: wizard.plan, enabledModules: [...wizard.modules], createdAt: now(), updatedAt: now(), agencies: [], admins: [], invites: [], regionalWorkspaces: [], supportSessions: [], audit: [] } as any;
            catalog.tenants.push(t);
        }
        else {
            t = tenant(wizard.tenantId);
            t.enabledModules = [...new Set([...t.enabledModules, ...wizard.modules])];
        }
        const a: any = { id: uuid('agency'), name: wizard.agencyName, abbreviation: wizard.abbreviation, type: wizard.agencyType, ori: wizard.ori, status: 'setup', branding: { title: `${wizard.agencyName} Public Safety Suite`, subtitle: 'Operational readiness in one workspace' } as any } as any;
        t.agencies.push(a);
        t.invites.push({ id: uuid('invite'), agencyId: a.id, name: wizard.adminName, email: wizard.adminEmail, roleIds: ['role_admin'], status: 'pending', createdAt: now() } as any);
        audit(t, `Created ${a.name} in ${t.name}; System Admin invitation queued for ${wizard.adminEmail}`);
        const state: any = await newAgencyState(t, a);
        state.tenantContext = { tenantId: t.id, agencyId: a.id, tenantName: t.name, agencyName: a.name, enabledModules: wizard.modules, template: wizard.template, importMode: wizard.importMode } as any;
        put(workspaceKey(t.id, a.id), state);
        save();
        return { tenant: t, agency: a } as any;
    }
    async function provisionRemote(): Promise<any> {
        if (!backendClient)
            throw Error('The agency connection is unavailable.');
        const templateState: any = await buildSeedState();
        templateState.accounts = [];
        templateState.personnel = [];
        templateState.currentRoleIds = [];
        templateState.auditLog = [];
        for (const root of ['qm', 'fleet', 'pm', 'k9', 'drone', 'eod', 'subpoena', 'grants', 'civil'])
            for (const [k, v] of Object.entries(templateState[root] || {} as any) as any)
                if (Array.isArray(v) && k !== 'refData')
                    templateState[root][k] = [];
        // The demo seed data's refData.agencies lists are sample "Reno PD" divisions -- fine as
        // starter reference data for equipment types, locations, etc., but the agency list itself
        // needs to reflect the real agency being provisioned, not the leftover demo department.
        for (const root of ['qm', 'fleet', 'pm'])
            if (templateState[root]?.refData?.agencies)
                templateState[root].refData.agencies = [wizard.agencyName];
        const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: wizard.kind === 'tenant' ? 'create_tenant' : 'add_agency', tenantId: wizard.tenantId, tenant: { name: wizard.name, slug: wizard.slug, timezone: wizard.timezone, plan: wizard.plan } as any, agency: { name: wizard.agencyName, abbreviation: wizard.abbreviation, type: wizard.agencyType, ori: wizard.ori } as any, enabledModules: wizard.modules, template: wizard.template, templateState, admin: { name: wizard.adminName, email: wizard.adminEmail } as any, importMode: wizard.importMode } as any } as any);
        if (error)
            throw Error(await functionErrorMessage(error, 'Tenant provisioning failed.'));
        await refreshRemote();
        return { tenant: tenant(data.tenantId), agency: agency(data.tenantId, data.agencyId) } as any;
    }
    async function refreshRemote(): Promise<any> { if (SuiteStore.mode() !== 'shared')
        return; const { data, error }: any = await backendClient.rpc('suite_list_contexts'); if (error)
        throw error; catalog = { version: 1, tenants: data.tenants, current: data.current } as any; current = data.current; normalize(); save(); refresh(); }
    async function insertSampleData(tenantId?: any, agencyId?: any, enabledModules?: any, button?: any): Promise<any> {
        if (!isPlatformAdmin()) {
            toast('Platform Admin access is required.', true);
            return;
        }
        if (!confirm('Add sample equipment, vehicles, civil papers, and training courses to this agency? Nothing will be assigned to any specific person. This writes directly to the live agency.'))
            return;
        if (button) {
            button.disabled = true;
            button.textContent = 'Adding sample data…';
        }
        try {
            // Read this SPECIFIC tenant/agency's current data directly, rather than assuming it
            // matches whatever the admin's own active session happens to be signed into. Platform
            // Admins routinely view a different tenant than their own -- using the admin's local
            // STATE here would silently write sample data into the wrong agency, the exact class of
            // bug found and reverted earlier tonight in the invite flow.
            const { data, error }: any = await backendClient.rpc('suite_load_workspace', { p_tenant_id: tenantId, p_agency_id: agencyId } as any);
            if (error)
                throw error;
            const versions: any = {} as any;
            const existing: any = {} as any;
            for (const r of data.records) {
                versions[r.key] = r.version;
                existing[r.key] = r.value;
            }
            const patches: any = [];
            const addRecord: any = (path?: any, id?: any, value?: any): any => {
                const key: any = JSON.stringify([path, id]);
                patches.push({ key, value, deleted: false, expected_version: versions[key] || 0 } as any);
            };
            // Merges new ids into whatever this collection's existing $order list already contains,
            // rather than replacing it -- overwriting it outright would silently delete every
            // existing equipment item, vehicle, paper, or course this agency already had.
            const addOrder: any = (path?: any, newIds?: any): any => {
                const key: any = JSON.stringify([path, '$order']);
                const current: any = Array.isArray(existing[key]) ? existing[key] : [];
                patches.push({ key, value: [...current, ...newIds.filter((id?: any): any => !current.includes(id))], deleted: false, expected_version: versions[key] || 0 } as any);
            };
            const stamp: any = Date.now();
            const added: any = [];
            if (enabledModules.includes('qm')) {
                const eqItems: any = [
                    ["Aegis II Ballistic Vest - Size M", "Body Armor", "Good", "Main Armory", 680],
                    ["Glock 22 Duty Sidearm", "Firearms", "Good", "Main Armory", 520],
                    ["Motorola APX 8000 Radio", "Radios & Electronics", "Good", "Patrol Division Cage", 5200],
                    ["Body-Worn Camera", "Radios & Electronics", "New", "Patrol Division Cage", 699],
                    ["IFAK Trauma Kit", "Medical / Trauma", "Good", "Supply Room B", 120],
                    ["Duty Belt - Nylon", "Duty Gear", "Good", "Supply Room B", 145],
                    ["Patrol Uniform Set (2)", "Uniforms", "Good", "Supply Room B", 180],
                    ["TASER 10 CEW", "Less-Lethal", "Good", "Patrol Division Cage", 1650],
                ];
                const eqIds: any = eqItems.map((it?: any, i?: any): any => {
                    const id: any = 'sample_eq' + stamp + i;
                    addRecord(['qm', 'equipment'], id, {
                        id, assetId: 'QM-S' + (1000 + i), name: it[0], category: it[1], condition: it[2], location: it[3],
                        value: it[4], purchaseDate: fmt(new Date() as any), inServiceDate: fmt(new Date() as any), replacementDate: null,
                        serialNumber: null, manufacturer: null, model: null, equipmentType: 'Tool / Kit', vendorId: null,
                        agency: agencyId, ownershipType: 'Agency', personalWeaponAuth: null, isSharedAsset: false,
                        isConsumable: false, quantity: 1, minQuantity: null,
                        status: 'Available', assignedTo: null, assignedToType: null, disposal: null,
                        notes: 'Sample record for demo/testing purposes.'
                    } as any);
                    return id;
                });
                addOrder(['qm', 'equipment'], eqIds);
                added.push(`${eqIds.length} equipment item(s)`);
            }
            if (enabledModules.includes('fleet')) {
                const vehItems: any = [
                    ["Sample Unit 90", "Ford", "Police Interceptor Utility", 2023, "Patrol SUV", 5000, "Unleaded"],
                    ["Sample Unit 91", "Dodge", "Charger Pursuit", 2022, "Patrol Sedan", 12000, "Unleaded"],
                    ["Sample Moto 90", "Harley-Davidson", "Road King Police", 2023, "Motorcycle", 1500, "Unleaded"],
                    ["Sample Admin 90", "Chevrolet", "Impala", 2020, "Administrative Sedan", 30000, "Unleaded"],
                ];
                const vehIds: any = vehItems.map((it?: any, i?: any): any => {
                    const id: any = 'sample_veh' + stamp + i;
                    addRecord(['fleet', 'vehicles'], id, {
                        id, unitNumber: it[0], make: it[1], model: it[2], year: it[3],
                        vin: 'SAMPLE' + String(stamp).slice(-8) + i, licensePlate: 'SAMP-' + (100 + i),
                        vehicleType: it[4], status: 'In Service', mileage: it[5], fuelType: it[6],
                        currentFuelLevel: 80, purchaseDate: fmt(new Date() as any), inServiceDate: fmt(new Date() as any),
                        agency: agencyId, location: 'Main Fleet Garage', isSharedAsset: false,
                        assignedToType: null, assignedTo: null,
                        equipmentChecklist: [], photoDataUrl: null, notes: 'Sample record for demo/testing purposes.', disposal: null
                    } as any);
                    return id;
                });
                addOrder(['fleet', 'vehicles'], vehIds);
                added.push(`${vehIds.length} vehicle(s)`);
            }
            if (enabledModules.includes('civil')) {
                const paperItems: any = [
                    ["SAMPLE-CV-0001", "Sample Superior Court", "Summons & Complaint", "Sample Plaintiff LLC", "Sample Defendant"],
                    ["SAMPLE-CV-0002", "Sample Superior Court", "Writ of Garnishment", "Sample Creditor Inc.", "Sample Debtor"],
                    ["SAMPLE-SC-0001", "Sample Justice Court", "Small Claims", "Sample Claimant", "Sample Respondent"],
                ];
                const paperIds: any = paperItems.map((it?: any, i?: any): any => {
                    const id: any = 'sample_cp' + stamp + i;
                    addRecord(['civil', 'papers'], id, {
                        id, caseNumber: it[0], courtOfOrigin: it[1], paperType: it[2], plaintiff: it[3], defendant: it[4], attorneyOfRecord: '',
                        priority: 'Standard', receivedDate: fmt(new Date() as any), returnByDate: fmt(addDays(new Date() as any, 21)),
                        serviceAddresses: [], assignedServerId: null, stage: 'Unassigned',
                        serviceMethod: null, attempts: [], servedDate: null, servedTime: null, servedOnName: null,
                        feeLineItems: [], feePayments: [], deposits: [], mileage: 0, returnFiledDate: null, generatedDocuments: [],
                        photos: [], safetyFlags: [], additionalPlaintiffs: [], additionalDefendants: [], witnesses: [],
                        fieldHistory: [], notes: 'Sample record for demo/testing purposes.'
                    } as any);
                    return id;
                });
                addOrder(['civil', 'papers'], paperIds);
                added.push(`${paperIds.length} civil paper(s)`);
            }
            if (enabledModules.includes('personnel')) {
                const courseItems: any = [
                    ["Sample Training Course: Radio Procedures", "Technology / RMS", "Recommended"],
                    ["Sample Training Course: De-escalation Techniques", "Specialty / Tactical", "Recommended"],
                ];
                const courseIds: any = courseItems.map((it?: any, i?: any): any => {
                    const id: any = 'sample_crs' + stamp + i;
                    addRecord(['pm', 'trainingCourses'], id, {
                        id, name: it[0], category: it[1], classification: it[2], isRequired: false, recertRequired: false, recertIntervalMonths: null
                    } as any);
                    return id;
                });
                addOrder(['pm', 'trainingCourses'], courseIds);
                // A couple of scheduled sessions for those courses -- empty roster, no attendees signed
                // up, no instructor named, so nothing here is tied to any specific person either.
                const sessionIds: any = courseIds.map((courseId?: any, i?: any): any => {
                    const id: any = 'sample_sess' + stamp + i;
                    addRecord(['pm', 'trainingSessions'], id, {
                        id, courseId, instructorId: null, location: 'TBD',
                        date: fmt(addDays(new Date() as any, 14 + i * 7)), startTime: '09:00', endTime: '12:00', capacity: 20,
                        status: 'Scheduled', notes: 'Sample record for demo/testing purposes.', roster: []
                    } as any);
                    return id;
                });
                addOrder(['pm', 'trainingSessions'], sessionIds);
                added.push(`${courseIds.length} training course(s) with ${sessionIds.length} scheduled session(s)`);
            }
            if (!patches.length) {
                toast('None of this agency\u2019s licensed modules have sample data defined for them yet.', true);
                return;
            }
            const { error: applyError }: any = await backendClient.rpc('suite_apply_changes', { p_tenant_id: tenantId, p_agency_id: agencyId, p_changes: patches } as any);
            if (applyError)
                throw applyError;
            toast(`Added ${added.join(', ')} -- nothing assigned to any person.`);
        }
        catch (err: any) {
            toast(`Could not add sample data: ${err.message}`, true);
        }
        finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Insert Sample Data';
            }
        }
    }
    function showTenantDetail(id?: any): any { if (!isPlatformAdmin())
        return; detailTenantId = id; const t: any = tenant(id), el: any = SuiteUX.showPlatformView('tenant-detail', t.name, 'Tenant lifecycle, agencies, modules, and access'); if (!el)
        return; el.innerHTML = `<div class="tenant-toolbar"><button class="btn btn-outline" id="backTenants">← All tenants</button><div style="display:flex;gap:8px"><button class="btn btn-outline" id="exportTenant">Export manifest</button><button class="btn btn-outline" id="addAgencyHere">Add agency</button><button class="btn btn-primary" id="saveTenant">Save changes</button></div></div><div class="tenant-detail-grid"><div><section class="panel"><div class="panel-head"><h2>Tenant profile</h2><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></div><div class="panel-body"><div class="onboarding-fields">${field('tdName', 'Tenant name', t.name)}${field('tdSlug', 'Tenant identifier', t.slug)}${field('tdTimezone', 'Time zone', t.timezone)}<div class="form-row"><label for="tdPlan">Plan</label><select id="tdPlan">${['Enterprise', 'Professional', 'Pilot'].map((x?: any): any => `<option ${x === t.plan ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div></div></section><section class="panel"><div class="panel-head"><h2>Licensed modules</h2></div><div class="panel-body module-select-grid">${MODULE_KEYS.map((k?: any): any => `<label class="module-choice"><input type="checkbox" data-tenant-module="${k}" ${t.enabledModules.includes(k) ? 'checked' : ''}><span><strong>${MODULE_LABELS[k]}</strong></span></label>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Agencies</h2></div><div class="panel-body">${t.agencies.map((a?: any): any => `<div class="agency-card"><div class="agency-card-head"><div><h3>${esc(a.name)}</h3><div class="agency-meta">${esc(a.abbreviation)} · ${esc(a.type)} · ${esc(a.ori || 'No identifier')}</div></div><span class="tenant-status ${esc(a.status)}">${esc(STATUS_LABELS[a.status] || a.status)}</span></div><div style="margin-top:10px"><button class="btn btn-outline btn-sm" data-insert-sample="${esc(a.id)}" title="Adds sample equipment, vehicles, civil papers, and training courses to this specific agency, with nothing assigned to any person. Only visible to Platform Admins.">Insert Sample Data</button></div></div>`).join('')}</div></section><section class="panel" id="mark43Panel"><div class="panel-head"><h2>Mark43 RMS Integration</h2><span class="hint" id="mark43StatusHint">Loading…</span></div><div class="panel-body" id="mark43PanelBody"><div style="text-align:center;color:var(--text-dim);padding:20px;font-size:12.5px;">Loading connection status…</div></div></section></div><aside><section class="panel"><div class="panel-head"><h2>Administrators & invitations</h2></div><div class="panel-body">${t.admins.map((a?: any): any => `<div class="support-session"><span><strong>${esc(a.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(a.email)}</small></span><span class="badge badge-available">Active</span></div>`).join('')}${t.invites.map((i?: any): any => `<div class="support-session"><span><strong>${esc(i.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(i.email)}</small></span><span class="badge badge-maintenance">Pending</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Regional workspaces</h2><button class="btn btn-outline btn-sm" id="createRegional">Create</button></div><div class="panel-body">${t.regionalWorkspaces.map((w?: any): any => `<div class="support-session"><span><strong>${esc(w.name)}</strong><small style="display:block;color:var(--text-dim)">${w.agencyIds.length} agencies · ${w.modules.length} modules</small></span><span class="badge badge-available">Explicit</span></div>`).join('') || '<p style="font-size:12px;color:var(--text-dim)">No cross-agency workspace has been authorized.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Support access</h2><button class="btn btn-outline btn-sm" id="grantSupport">Grant</button></div><div class="panel-body">${t.supportSessions.filter((x?: any): any => !x.revokedAt && new Date(x.expiresAt) as any > (new Date() as any)).map((x?: any): any => `<div class="support-session"><span><strong>${esc(x.reason)}</strong><small style="display:block;color:var(--text-dim)">Expires ${esc((new Date(x.expiresAt) as any).toLocaleString())}</small></span><button class="btn btn-outline btn-sm" data-revoke-support="${x.id}">Revoke</button></div>`).join('') || '<p style="font-size:12px;color:var(--text-dim)">No active support session.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Recent tenant activity</h2></div><div class="panel-body">${t.audit.slice(0, 8).map((a?: any): any => `<div class="tenant-audit-row">${esc(a.action)}<small>${esc((new Date(a.at) as any).toLocaleString())} · ${esc(a.actor)}</small></div>`).join('') || '<p>No activity yet.</p>'}</div></section><section class="danger-zone"><h3>Tenant status</h3><p style="font-size:12px">Suspension blocks ordinary agency access while retaining data.</p><button class="btn ${t.status === 'suspended' ? 'btn-primary' : 'btn-danger'}" id="toggleTenantStatus">${t.status === 'suspended' ? 'Reactivate tenant' : t.status === 'setup' ? 'Activate tenant' : 'Suspend tenant'}</button></section></aside></div>`; el.querySelector('#backTenants').onclick = showTenantManagement; el.querySelector('#addAgencyHere').onclick = (): any => { wizard = defaultWizard('agency'); wizard.tenantId = t.id; renderWizard(); }; el.querySelector('#saveTenant').onclick = (): any => saveTenantDetail(t); el.querySelector('#exportTenant').onclick = (): any => exportManifest(t); el.querySelector('#createRegional').onclick = (): any => openRegional(t); el.querySelector('#grantSupport').onclick = (): any => openSupport(t); el.querySelectorAll('[data-revoke-support]').forEach((b?: any): any => b.onclick = (): any => revokeSupport(t, b.dataset.revokeSupport)); el.querySelector('#toggleTenantStatus').onclick = (): any => toggleStatus(t); el.querySelectorAll('[data-insert-sample]').forEach((b?: any): any => b.onclick = (): any => insertSampleData(t.id, b.dataset.insertSample, t.enabledModules, b)); loadMark43Panel(t); }
    function exportManifest(t?: any): any { const manifest: any = { exportedAt: now(), tenant: { id: t.id, slug: t.slug, name: t.name, timezone: t.timezone, plan: t.plan, status: t.status, enabledModules: t.enabledModules } as any, agencies: t.agencies, regionalWorkspaces: t.regionalWorkspaces, activeSupportSessions: t.supportSessions.filter((x?: any): any => !x.revokedAt && new Date(x.expiresAt) as any > (new Date() as any)) } as any; const url: any = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' } as any)), a: any = (document as any).createElement('a'); a.href = url; a.download = `${t.slug}-tenant-manifest.json`; a.click(); setTimeout((): any => URL.revokeObjectURL(url), 1000); audit(t, 'Exported tenant configuration manifest'); }
    function openRegional(t?: any): any { if (t.agencies.length < 2) {
        toast('Add at least two agencies before creating a regional workspace.', true);
        return;
    } const box: any = (document as any).getElementById('modalBox'); box.className = 'modal'; box.innerHTML = `<div class="modal-head"><h3>Create regional workspace</h3><button class="modal-close" id="rwClose">×</button></div><div class="modal-body"><div class="form-row"><label for="rwName">Workspace name</label><input id="rwName"></div><div class="form-row"><label>Authorized agencies</label>${t.agencies.map((a?: any): any => `<label class="check-row"><input type="checkbox" data-rw-agency="${a.id}"> ${esc(a.name)}</label>`).join('')}</div><div class="form-row"><label>Authorized modules</label>${t.enabledModules.map((m?: any): any => `<label class="check-row"><input type="checkbox" data-rw-module="${m}"> ${esc(MODULE_LABELS[m])}</label>`).join('')}</div><div id="rwError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="rwCancel">Cancel</button><button class="btn btn-primary" id="rwCreate">Authorize workspace</button></div></div>`; SuiteUX.openModal(); box.querySelector('#rwClose').onclick = box.querySelector('#rwCancel').onclick = (e?: any): any => SuiteUX.closeModal(e); box.querySelector('#rwCreate').onclick = async (): Promise<any> => { const name: any = box.querySelector('#rwName').value.trim(), agencyIds: any = [...box.querySelectorAll('[data-rw-agency]:checked')].map((x?: any): any => x.dataset.rwAgency), modules: any = [...box.querySelectorAll('[data-rw-module]:checked')].map((x?: any): any => x.dataset.rwModule); if (!name || agencyIds.length < 2 || !modules.length) {
        box.querySelector('#rwError').textContent = 'Enter a name, select at least two agencies, and select a module.';
        return;
    } if (SuiteStore.mode() === 'shared') {
        const { error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'create_regional_workspace', tenantId: t.id, name, agencyIds, modules } as any } as any);
        if (error) {
            box.querySelector('#rwError').textContent = await functionErrorMessage(error);
            return;
        }
    } enableRegionalWorkspace(t.id, name, agencyIds, modules); SuiteUX.closeModal(); showTenantDetail(t.id); toast('Regional workspace authorized and audited.'); }; }
    function openSupport(t?: any): any { const box: any = (document as any).getElementById('modalBox'); box.className = 'modal'; box.innerHTML = `<div class="modal-head"><h3>Grant temporary support access</h3><button class="modal-close" id="saClose">×</button></div><div class="modal-body"><div class="callout callout-blue">Access is time-limited, scoped, and written to the tenant audit log.</div>${field('saUser', 'Support user UUID', '')}${field('saReason', 'Business reason', '')}<div class="form-row"><label for="saHours">Duration</label><select id="saHours"><option value="1">1 hour</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="24">24 hours</option></select></div><div class="form-row"><label>Scope</label>${['configuration', 'audit', 'diagnostics'].map((x?: any): any => `<label class="check-row"><input type="checkbox" data-sa-scope="${x}"> ${x}</label>`).join('')}</div><div id="saError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="saCancel">Cancel</button><button class="btn btn-primary" id="saGrant">Grant access</button></div></div>`; SuiteUX.openModal(); box.querySelector('#saClose').onclick = box.querySelector('#saCancel').onclick = (e?: any): any => SuiteUX.closeModal(e); box.querySelector('#saGrant').onclick = async (): Promise<any> => { const supportUserId: any = box.querySelector('#saUser').value.trim(), reason: any = box.querySelector('#saReason').value.trim(), hours: any = Number(box.querySelector('#saHours').value), scope: any = [...box.querySelectorAll('[data-sa-scope]:checked')].map((x?: any): any => x.dataset.saScope); if (!/^[0-9a-f-]{36}$/i.test(supportUserId) || reason.length < 10 || !scope.length) {
        box.querySelector('#saError').textContent = 'Enter a valid support user UUID, a specific reason, and at least one scope.';
        return;
    } let session: any = { id: uuid('support'), supportUserId, reason, scope, expiresAt: (new Date(Date.now() + hours * 3600000) as any).toISOString() } as any; if (SuiteStore.mode() === 'shared') {
        const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'grant_support', tenantId: t.id, supportUserId, reason, hours, scope } as any } as any);
        if (error) {
            box.querySelector('#saError').textContent = await functionErrorMessage(error);
            return;
        }
        session = data.supportSession;
    } t.supportSessions.push(session); audit(t, `Granted temporary support access: ${reason}`); SuiteUX.closeModal(); showTenantDetail(t.id); toast('Temporary support access granted.'); }; }
    async function revokeSupport(t?: any, id?: any): Promise<any> { if (SuiteStore.mode() === 'shared') {
        const { error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'revoke_support', tenantId: t.id, sessionId: id } as any } as any);
        if (error) {
            toast(await functionErrorMessage(error), true);
            return;
        }
    } const x: any = t.supportSessions.find((x?: any): any => x.id === id); if (x)
        x.revokedAt = now(); audit(t, 'Revoked temporary support access'); showTenantDetail(t.id); }
    async function saveTenantDetail(t?: any): Promise<any> { const name: any = (document as any).getElementById('tdName').value.trim(), slug: any = (document as any).getElementById('tdSlug').value.trim().toLowerCase(), timezone: any = (document as any).getElementById('tdTimezone').value.trim(), plan: any = (document as any).getElementById('tdPlan').value, modules: any = [...(document as any).querySelectorAll('[data-tenant-module]:checked')].map((x?: any): any => x.dataset.tenantModule); if (!name || !slug || !timezone || !modules.length) {
        toast('Tenant name, identifier, time zone, and at least one module are required.', true);
        return;
    } if (SuiteStore.mode() === 'shared') {
        const { error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'update_tenant', tenantId: t.id, tenant: { name, slug, timezone, plan } as any, enabledModules: modules } as any } as any);
        if (error) {
            toast(await functionErrorMessage(error), true);
            return;
        }
    } t.name = name; t.slug = slug; t.timezone = timezone; t.plan = plan; t.enabledModules = modules; audit(t, 'Updated tenant profile and module entitlements'); refresh(); showTenantDetail(t.id); toast('Tenant settings saved.'); }
    // ---- Mark43 RMS Integration panel ----
    // The connection is only ever real (not a demo toast) when running in shared mode against a
    // deployed tenant-admin Edge Function with the get/save/test/sync_mark43_connection actions
    // added -- see the code + SQL migration provided alongside this file. In local/demo mode this
    // renders as an explained, inert preview so the screen still looks and reads correctly.
    async function loadMark43Panel(t?: any): Promise<any> {
        const hint: any = (document as any).getElementById('mark43StatusHint');
        const body: any = (document as any).getElementById('mark43PanelBody');
        if (!hint || !body)
            return;
        if (SuiteStore.mode() !== 'shared') {
            hint.textContent = 'Preview only in this local/demo session';
            renderMark43Panel(t, { enabled: false, tenantSubdomain: '', authMode: 'basic', hasToken: false, lastSyncAt: null, lastSyncStatus: null, lastSyncMessage: null } as any, true);
            return;
        }
        try {
            const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'get_mark43_connection', tenantId: t.id } as any } as any);
            if (error)
                throw Error(await functionErrorMessage(error, 'Could not load the Mark43 connection.'));
            hint.textContent = data.enabled ? 'Enabled' : 'Not set up';
            renderMark43Panel(t, data, false);
        }
        catch (err: any) {
            hint.textContent = 'Could not load';
            body.innerHTML = `<div style="color:var(--red);font-size:12.5px;padding:10px 0;">${escapeHtml(err.message)}</div>`;
        }
    }
    function renderMark43Panel(t?: any, conn?: any, isPreview?: any): any {
        const body: any = (document as any).getElementById('mark43PanelBody');
        body.innerHTML = `
      ${isPreview ? `<div class="locked-note" style="margin-bottom:14px;">${ICONS.alert}<div>This panel only does something real when connected to a live agency workspace with the matching Edge Function actions deployed. Switch to a shared session to configure a real connection.</div></div>` : ''}
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:${conn.hasToken ? 'pointer' : 'not-allowed'};opacity:${conn.hasToken ? '1' : '0.5'};">
        <input type="checkbox" id="fMark43Enabled" style="width:auto;" ${conn.enabled ? 'checked' : ''} ${!conn.hasToken ? 'disabled' : ''}> Pull personnel from Mark43 automatically
      </label></div>
      <div class="form-row"><label>Mark43 tenant name <span style="font-weight:400;color:var(--text-dim);">(the subdomain in your Mark43 URL)</span></label>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="text" id="fMark43Tenant" value="${escapeHtml(conn.tenantSubdomain || '')}" placeholder="e.g. reno-nv-demo" style="flex:1;">
          <span style="color:var(--text-dim);font-size:12.5px;white-space:nowrap;">.mark43.com</span>
        </div>
      </div>
      <div class="form-row"><label>Auth style</label>
        <select id="fMark43AuthMode">
          <option value="basic" ${conn.authMode === 'basic' ? 'selected' : ''}>HTTP Basic (token:x-api-token)</option>
          <option value="apikey" ${conn.authMode === 'apikey' ? 'selected' : ''}>X-Api-Key header</option>
        </select>
      </div>
      <div class="form-row"><label>API token <span style="font-weight:400;color:var(--text-dim);">(from your Mark43 Technical Services Representative)</span></label>
        <input type="password" id="fMark43Token" value="" autocomplete="new-password" placeholder="${conn.hasToken ? 'Configured — leave blank to keep it' : 'Paste the API token'}">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        <button class="btn btn-primary btn-sm" id="btnSaveMark43">Save Connection</button>
        <button class="btn btn-outline btn-sm" id="btnTestMark43" ${conn.hasToken ? '' : 'disabled'}>Test Connection</button>
        <button class="btn btn-outline btn-sm" id="btnSyncMark43" ${conn.enabled && conn.hasToken ? '' : 'disabled'}>Sync Now</button>
      </div>
      <div id="mark43Result" style="font-size:12.5px;line-height:1.5;margin-top:10px;"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
        ${conn.lastSyncAt ? `Last sync ${escapeHtml((new Date(conn.lastSyncAt) as any).toLocaleString())} \u2014 ${escapeHtml(conn.lastSyncStatus || '')}${conn.lastSyncMessage ? ': ' + escapeHtml(conn.lastSyncMessage) : ''}` : 'Never synced yet.'}
        Switching this off stops any sync from running, on demand or scheduled, without deleting the saved connection.
      </div>
    `;
        (document as any).getElementById('btnSaveMark43').onclick = (): any => saveMark43Connection(t);
        const testBtn: any = (document as any).getElementById('btnTestMark43');
        if (testBtn)
            testBtn.onclick = (): any => testMark43Connection(t);
        const syncBtn: any = (document as any).getElementById('btnSyncMark43');
        if (syncBtn)
            syncBtn.onclick = (): any => syncMark43Now(t);
        const enabledToggle: any = (document as any).getElementById('fMark43Enabled');
        if (enabledToggle)
            enabledToggle.onchange = (): any => saveMark43Connection(t, { enabledOnly: true } as any);
    }
    async function saveMark43Connection(t?: any, opts?: any): Promise<any> {
        opts = opts || {} as any;
        const resultBox: any = (document as any).getElementById('mark43Result');
        if (SuiteStore.mode() !== 'shared') {
            if (resultBox)
                resultBox.innerHTML = `<span style="color:var(--red);">This is a preview in the local/demo session \u2014 connect to a real agency workspace to save a live connection.</span>`;
            return;
        }
        const tenantSubdomain: any = (document as any).getElementById('fMark43Tenant').value.trim().toLowerCase();
        const authMode: any = (document as any).getElementById('fMark43AuthMode').value;
        const apiToken: any = (document as any).getElementById('fMark43Token').value;
        const enabled: any = (document as any).getElementById('fMark43Enabled').checked;
        if (!opts.enabledOnly && !tenantSubdomain) {
            if (resultBox)
                resultBox.innerHTML = `<span style="color:var(--red);">Enter the Mark43 tenant name first.</span>`;
            return;
        }
        try {
            const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'save_mark43_connection', tenantId: t.id, tenantSubdomain, authMode, apiToken: apiToken || undefined, enabled } as any } as any);
            if (error)
                throw Error(await functionErrorMessage(error, 'Could not save the connection.'));
            audit(t, 'Updated the Mark43 RMS integration connection.');
            toast('Mark43 connection saved.');
            loadMark43Panel(t);
        }
        catch (err: any) {
            if (resultBox)
                resultBox.innerHTML = `<span style="color:var(--red);">${escapeHtml(err.message)}</span>`;
        }
    }
    async function testMark43Connection(t?: any): Promise<any> {
        const resultBox: any = (document as any).getElementById('mark43Result');
        if (SuiteStore.mode() !== 'shared') {
            resultBox.innerHTML = `<span style="color:var(--red);">Preview only \u2014 connect to a real agency workspace to test a live connection.</span>`;
            return;
        }
        resultBox.innerHTML = `<span style="color:var(--text-dim);">Testing\u2026</span>`;
        try {
            const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'test_mark43_connection', tenantId: t.id } as any } as any);
            if (error)
                throw Error(await functionErrorMessage(error, 'Test failed.'));
            resultBox.innerHTML = `<span style="color:#3FB56C;font-weight:700;">Connected.</span> Mark43 returned ${data.count != null ? data.count : 'a'} personnel record${data.count === 1 ? '' : 's'}.`;
        }
        catch (err: any) {
            resultBox.innerHTML = `<span style="color:var(--red);font-weight:700;">Failed.</span> ${escapeHtml(err.message)}`;
        }
    }
    async function syncMark43Now(t?: any): Promise<any> {
        const resultBox: any = (document as any).getElementById('mark43Result');
        if (SuiteStore.mode() !== 'shared') {
            resultBox.innerHTML = `<span style="color:var(--red);">Preview only \u2014 connect to a real agency workspace to run a live sync.</span>`;
            return;
        }
        resultBox.innerHTML = `<span style="color:var(--text-dim);">Syncing\u2026</span>`;
        try {
            const { data, error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'sync_mark43_personnel', tenantId: t.id } as any } as any);
            if (error)
                throw Error(await functionErrorMessage(error, 'Sync failed.'));
            audit(t, `Synced personnel from Mark43 (${data.added || 0} added, ${data.updated || 0} updated${data.matchedExisting ? `, ${data.matchedExisting} matched to existing accounts` : ''}).`);
            toast(`Sync complete: ${data.added || 0} added, ${data.updated || 0} updated.`);
            loadMark43Panel(t);
            // The sync just wrote directly to this tenant's data from the server side, which leaves
            // this tab's own cached copy (and its version-tracking for future saves) stale the moment
            // it happens -- exactly the kind of gap that caused an unrelated save to fail right after a
            // sync last time. If this is the same tenant/agency currently signed into, refresh it now
            // rather than waiting for that to bite on the next edit someone makes in this tab.
            if (SuiteStore.remoteContext().tenantId === t.id) {
                if (!await SuiteStore.reload(true))
                    toast('The sync finished. Save or download pending edits, then reload to see the new roster.', true);
            }
        }
        catch (err: any) {
            resultBox.innerHTML = `<span style="color:var(--red);font-weight:700;">Failed.</span> ${escapeHtml(err.message)}`;
        }
    }
    async function toggleStatus(t?: any): Promise<any> { const next: any = t.status === 'suspended' || t.status === 'setup' ? 'active' : 'suspended'; if (next === 'suspended' && !confirm(`Suspend ${t.name}? Ordinary agency users will be blocked, but data will be retained.`))
        return; if (SuiteStore.mode() === 'shared') {
        const { error }: any = await backendClient.functions.invoke('tenant-admin', { body: { action: 'set_tenant_status', tenantId: t.id, status: next } as any } as any);
        if (error) {
            toast(await functionErrorMessage(error), true);
            return;
        }
    } t.status = next; audit(t, `${next === 'active' ? 'Reactivated' : 'Suspended'} tenant`); refresh(); showTenantDetail(t.id); }
    function enableRegionalWorkspace(tenantId?: any, name?: any, agencyIds?: any, modules?: any): any { const t: any = tenant(tenantId); if (!t || !isPlatformAdmin())
        throw Error('Platform Admin required.'); const ws: any = { id: uuid('regional'), name, agencyIds: [...new Set(agencyIds)], modules: modules.filter((m?: any): any => t.enabledModules.includes(m)), status: 'active', createdAt: now() } as any; t.regionalWorkspaces.push(ws); audit(t, `Created regional workspace ${name}`); return ws; }
    function seedForTests(data?: any): any { catalog = data; current = data.current; normalize(); save(); refresh(); }
    return { init, load, refresh, renderContext, renderBanner, showTenantManagement, showTenantDetail, startWizard, switchContext, snapshotCurrent, moduleEnabled, activeModules, isPlatformAdmin, isSystemAdmin, tenant, agency, contexts, enableRegionalWorkspace, seedForTests, workspaceKey, get catalog() { return catalog; }, get current() { return current; } } as any;
})();
