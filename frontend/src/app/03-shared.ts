/* =========================================================================
   MODULE LAUNCHER + SWITCHING
   ========================================================================= */ let ACTIVE_MODULE: any = null; // null (launcher) | 'qm' | 'fleet'

let ACTIVE_SHARED_VIEW: any = null; // null | 'personnel' | 'roles' | 'audit' -- tracks which shared (cross-module) screen is open, if any

const MODULE_META: any = {
    qm: {
        name: "Quartermaster", ability: "module_quartermaster", icon: "box",
        tagline: "Equipment inventory, assignments, maintenance, requests, and audits."
    } as any,
    fleet: {
        name: "Fleet Management", ability: "module_fleet", icon: "truck",
        tagline: "Vehicles, inspections, maintenance, and vendor tracking for the fleet."
    } as any,
    personnel: {
        name: "Personnel Administration", ability: "module_personnel", icon: "idcard",
        tagline: "HR records, disciplinary tracking, training, scheduling, and workforce analytics."
    } as any,
    k9: {
        name: "K9 Management", ability: "module_k9", icon: "pawprint",
        tagline: "Handler teams, training, certifications, deployments, incidents, and GPS tracking."
    } as any,
    drone: {
        name: "Drone Management", ability: "module_drone", icon: "drone",
        tagline: "Fleet, certified operators, flight logs, maintenance, and FAA compliance tracking."
    } as any,
    eod: {
        name: "EOD Management", ability: "module_eod", icon: "bomb",
        tagline: "Bomb technician certifications, explosives inventory, magazine compliance, and ATF/USBDC reporting."
    } as any,
    subpoena: {
        name: "Subpoena Management", ability: "module_subpoena", icon: "gavel",
        tagline: "Assign, track, and notify staff of subpoenas, with document attachments and calendar integration."
    } as any,
    grants: {
        name: "Grants & Asset Forfeiture", ability: "module_grants", icon: "dollar",
        tagline: "Seized property, equitable sharing, and grant-funded equipment, with a fully configurable analytics dashboard."
    } as any,
    civil: {
        name: "Civil Process", ability: "module_civil", icon: "scale",
        tagline: "Intake, assign, and track civil paper service through a visual workflow board, with generated Returns of Service."
    } as any
} as any;
function accessibleModules(): any {
    return (Object.keys(MODULE_META) as any).filter((key?: any): any => can(MODULE_META[key].ability));
}
function renderSuiteNav(): any {
    const nav: any = (document as any).getElementById('suiteNav');
    const items: any = [];
    items.push({ label: "All Modules", icon: "grid", action: showLauncher } as any);
    items.push({ label: 'Staff Notices', icon: 'chat', action: (): any => SuiteUX.navigate('shared/notices') } as any);
    if (can('admin_roles'))
        items.push({ label: "Roles & Abilities", icon: "shield", action: (): any => enterSharedView('roles', 'Roles & Abilities', "Define unlimited roles and control exactly what each one can do, across every module") } as any);
    const canSeeAudit: any = can('qm_admin_audit') || can('fleet_admin_audit') || can('pm_admin_audit') || can('k9_admin_audit') || can('drone_admin_audit') || can('eod_admin_audit') || can('subpoena_admin_audit') || can('grants_admin_audit') || can('civil_admin_audit');
    if (canSeeAudit)
        items.push({ label: "Audit Log", icon: "history", action: (): any => enterSharedView('audit', 'Platform Audit Log', "Every logged action across every module, in one place, filterable by module, user, date, and entity type") } as any);
    if (can('manage_field_labels'))
        items.push({ label: "Field Labels", icon: "edit", action: (): any => enterSharedView('fieldlabels', 'Field Display Names', "Rename how a field appears across the suite, without touching the underlying data") } as any);
    if (can('manage_branding'))
        items.push({ label: "Branding", icon: "image", action: (): any => enterSharedView('branding', 'Agency Branding', "Customize the logo, title, and tagline shown in the sidebar for this deployment") } as any);
    nav.innerHTML = items.map((it?: any, i?: any): any => `
    <button class="navitem" data-suite-nav="${i}">${ICONS[it.icon]}<span>${it.label}</span></button>
  `).join('');
    nav.querySelectorAll('[data-suite-nav]').forEach((btn?: any): any => {
        btn.addEventListener('click', (): any => items[Number(btn.dataset.suiteNav)].action());
    });
}
// Captured once, before any custom branding is ever applied, so "Reset to Default" always has the
// real original SonoMarzi logo to fall back to without needing to duplicate that base64 string in JS.
const DEFAULT_LOGO_SRC: any = ((document as any).querySelector('#brandMark img') || {} as any).src || '';
function applyAgencyBranding(): any {
    const b: any = STATE.agencyBranding || {} as any;
    const titleEl: any = (document as any).getElementById('brandTitle');
    const subEl: any = (document as any).getElementById('brandSub');
    const img: any = (document as any).querySelector('#brandMark img');
    if (titleEl)
        titleEl.textContent = b.title || "SonoMarzi PS Management Suite";
    if (subEl)
        subEl.textContent = b.subtitle || "Choose a module to begin";
    if (img)
        img.src = b.logoDataUrl || DEFAULT_LOGO_SRC;
    (document as any).title = b.title || "SonoMarzi PS Management Suite";
    applyPwaIcon(b.logoDataUrl, b.title);
}
// Home-screen/install icon: iOS reads a static <link rel="apple-touch-icon"> at the moment
// someone taps "Add to Home Screen"; Android/Chrome's install prompt reads the icons array from
// whatever the <link rel="manifest"> currently points to. Both are ordinarily fixed, one-per-
// deployment files -- but since every tenant shares this same deployed file, "the same icon for
// everyone" would mean an agency's own uploaded logo can never be what shows up on a user's home
// screen. Swapping both dynamically, right after this tenant's branding loads, means each agency
// genuinely gets its own icon without needing its own separate deployment.
let PWA_ICON_BLOB_URL: any = null;
const PWA_DEFAULT_ICON_HREFS: any = {} as any; // captured once, so a logo reset can restore the real defaults

function applyPwaIcon(logoDataUrl?: any, appName?: any): any {
    const iconLinks: any = [...(document as any).querySelectorAll('link[rel="icon"]')];
    const appleLink: any = (document as any).querySelector('link[rel="apple-touch-icon"]');
    const manifestLink: any = (document as any).querySelector('link[rel="manifest"]');
    if (!PWA_DEFAULT_ICON_HREFS.captured) {
        PWA_DEFAULT_ICON_HREFS.icons = iconLinks.map((l?: any): any => l.getAttribute('href'));
        PWA_DEFAULT_ICON_HREFS.apple = appleLink ? appleLink.getAttribute('href') : null;
        PWA_DEFAULT_ICON_HREFS.manifest = manifestLink ? manifestLink.getAttribute('href') : null;
        PWA_DEFAULT_ICON_HREFS.captured = true;
    }
    if (PWA_ICON_BLOB_URL) {
        URL.revokeObjectURL(PWA_ICON_BLOB_URL);
        PWA_ICON_BLOB_URL = null;
    }
    if (!logoDataUrl) {
        // No custom logo on this tenant -- make sure we're showing the real default files, in case
        // a previous tenant's logo (in this same browser tab) had already swapped them out.
        iconLinks.forEach((l?: any, i?: any): any => { if (PWA_DEFAULT_ICON_HREFS.icons[i])
            l.setAttribute('href', PWA_DEFAULT_ICON_HREFS.icons[i]); });
        if (appleLink && PWA_DEFAULT_ICON_HREFS.apple)
            appleLink.setAttribute('href', PWA_DEFAULT_ICON_HREFS.apple);
        if (manifestLink && PWA_DEFAULT_ICON_HREFS.manifest)
            manifestLink.setAttribute('href', PWA_DEFAULT_ICON_HREFS.manifest);
        return;
    }
    // iOS: a data URL works directly as the apple-touch-icon href.
    if (appleLink)
        appleLink.setAttribute('href', logoDataUrl);
    iconLinks.forEach((l?: any): any => l.setAttribute('href', logoDataUrl));
    // Android/Chrome: build a manifest that mirrors the real one but points every icon entry at
    // this tenant's logo, then swap the <link rel="manifest"> to a blob URL of it. The "sizes"
    // values are left as-is (Chrome treats them as a hint, not a hard requirement) since we only
    // have the one uploaded image, not pre-resized variants at each declared size.
    const manifestBody: any = {
        name: appName || "SonoMarzi PS Management Suite",
        short_name: (appName || "SonoMarzi").slice(0, 12),
        description: "Public safety management suite: personnel, scheduling, quartermaster, fleet, K9, UAS, EOD, subpoenas, civil process, and grants.",
        // Absolute, not relative: this manifest is served from a blob: URL, which has no real origin
        // for a relative "/" to resolve against, unlike the static manifest.webmanifest file, which is
        // served from the real page origin. A relative start_url/scope here gets silently rejected as
        // invalid by the browser -- using location.origin keeps this correct even if the site is ever
        // served from a different domain.
        start_url: location.origin + "/", scope: location.origin + "/", display: "standalone", display_override: ["standalone", "minimal-ui"],
        orientation: "any", background_color: "#131316", theme_color: "#24364E", lang: "en-US", dir: "ltr",
        icons: [
            { src: logoDataUrl, sizes: "192x192", type: "image/jpeg", purpose: "any" } as any,
            { src: logoDataUrl, sizes: "512x512", type: "image/jpeg", purpose: "any" } as any,
        ]
    } as any;
    const blob: any = new Blob([JSON.stringify(manifestBody)], { type: 'application/manifest+json' } as any);
    PWA_ICON_BLOB_URL = URL.createObjectURL(blob);
    if (manifestLink)
        manifestLink.setAttribute('href', PWA_ICON_BLOB_URL);
}
function renderBrandingAdmin(): any {
    const canManage: any = can('manage_branding');
    if (!canManage) {
        (document as any).getElementById('view-branding').innerHTML = permissionBlockedView("You don't have permission to customize agency branding in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
        return;
    }
    const b: any = STATE.agencyBranding;
    (document as any).getElementById('view-branding').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Sidebar Branding</h2><span class="hint">Shown to every user, in the top-left corner</span></div>
      <div class="panel-body">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div style="flex:1;min-width:260px;">
            <div class="form-row"><label>Logo</label></div>
            <div id="brandingPhotoDropZone" style="border:2px dashed var(--border);border-radius:10px;padding:16px;text-align:center;cursor:pointer;margin-bottom:10px;display:flex;flex-direction:column;align-items:center;gap:8px;">
              <img src="${b.logoDataUrl || DEFAULT_LOGO_SRC}" style="width:64px;height:64px;object-fit:contain;background:var(--white);border-radius:8px;border:1px solid var(--border);">
              <div style="font-size:12.5px;font-weight:700;">Drag &amp; drop a logo here, or click to browse</div>
              <div style="font-size:11px;color:var(--text-dim);">A roughly square image works best. Also usable from a phone's camera or photo library.</div>
              <input type="file" id="brandingPhotoFileInput" accept="image/*" style="display:none;">
            </div>
            ${b.logoDataUrl ? `<button class="btn btn-sm btn-outline" id="btnResetLogo">Reset to Default Logo</button>` : ''}
          </div>
          <div style="flex:2;min-width:280px;">
            <div class="form-row"><label>Title</label><input type="text" id="fBrandTitle" value="${escapeHtml(b.title)}" placeholder="SonoMarzi PS Management Suite"></div>
            <div class="form-row"><label>Tagline</label><input type="text" id="fBrandSub" value="${escapeHtml(b.subtitle)}" placeholder="Choose a module to begin"></div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary" id="btnSaveBranding">Save Branding</button>
              <button class="btn btn-outline" id="btnResetBranding">Reset All to Default</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
    const dropZone: any = (document as any).getElementById('brandingPhotoDropZone');
    const input: any = (document as any).getElementById('brandingPhotoFileInput');
    const processLogo: any = (file?: any): any => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            toast("Please choose an image file.", true);
            return;
        }
        resizeImageForStorage(file, 300, 0.9, (dataUrl?: any): any => {
            STATE.agencyBranding.logoDataUrl = dataUrl;
            logAuditEntry('Shared', 'Updated the agency sidebar logo.', 'branding');
            persist();
            applyAgencyBranding();
            toast("Logo updated.");
            renderBrandingAdmin();
        });
    };
    dropZone.addEventListener('click', (): any => input.click());
    input.addEventListener('change', (e?: any): any => processLogo(e.target.files[0]));
    dropZone.addEventListener('dragover', (e?: any): any => { e.preventDefault(); dropZone.style.borderColor = 'var(--blue)'; });
    dropZone.addEventListener('dragleave', (): any => { dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', (e?: any): any => { e.preventDefault(); dropZone.style.borderColor = 'var(--border)'; if (e.dataTransfer.files[0])
        processLogo(e.dataTransfer.files[0]); });
    const resetLogoBtn: any = (document as any).getElementById('btnResetLogo');
    if (resetLogoBtn)
        resetLogoBtn.addEventListener('click', (): any => {
            STATE.agencyBranding.logoDataUrl = null;
            logAuditEntry('Shared', 'Reset the agency sidebar logo to default.', 'branding');
            persist();
            applyAgencyBranding();
            toast("Logo reset to default.");
            renderBrandingAdmin();
        });
    (document as any).getElementById('btnSaveBranding').addEventListener('click', async (): Promise<any> => {
        STATE.agencyBranding.title = (document as any).getElementById('fBrandTitle').value.trim() || "SonoMarzi PS Management Suite";
        STATE.agencyBranding.subtitle = (document as any).getElementById('fBrandSub').value.trim() || "Choose a module to begin";
        logAuditEntry('Shared', 'Updated the agency title/tagline.', 'branding');
        persist();
        applyAgencyBranding();
        const saved: any = await SuiteStore.flush();
        if (!saved) {
            toast("Branding change is still pending. AWS did not confirm the save.", true);
            return;
        }
        toast("Branding saved to AWS.");
        // The legacy tenant-admin mirror is intentionally skipped in AWS dev.
        // The authoritative day-to-day branding record is now suite_records in RDS.
        if (!(window as any).SONOMARZI_AWS_DEV && typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared') {
            const ctx: any = SuiteStore.remoteContext();
            backendClient.functions.invoke('tenant-admin', { body: { action: 'update_agency_branding', tenantId: ctx.tenantId, agencyId: ctx.agencyId,
                    branding: { title: STATE.agencyBranding.title, subtitle: STATE.agencyBranding.subtitle } as any } as any } as any).then(async ({ error }: any): Promise<any> => {
                if (error)
                    toast(`Branding saved, but the tenant overview copy could not be updated: ${await functionErrorMessage(error)}`, true);
            });
        }
    });
    (document as any).getElementById('btnResetBranding').addEventListener('click', (): any => {
        if (!confirm("Reset the logo, title, and tagline back to the SonoMarzi defaults?"))
            return;
        STATE.agencyBranding = { logoDataUrl: null, title: "SonoMarzi PS Management Suite", subtitle: "Choose a module to begin" } as any;
        logAuditEntry('Shared', 'Reset all agency branding to default.', 'branding');
        persist();
        applyAgencyBranding();
        toast("Branding reset to default.");
        renderBrandingAdmin();
        if (!(window as any).SONOMARZI_AWS_DEV && typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared') {
            const ctx: any = SuiteStore.remoteContext();
            backendClient.functions.invoke('tenant-admin', { body: { action: 'update_agency_branding', tenantId: ctx.tenantId, agencyId: ctx.agencyId,
                    branding: { title: STATE.agencyBranding.title, subtitle: STATE.agencyBranding.subtitle } as any } as any } as any).catch((): any => { });
        }
    });
}
function renderSSOAdmin(): any {
    if (!can('admin_sso')) {
        (document as any).getElementById('view-sso').innerHTML = permissionBlockedView("You don't have permission to configure Single Sign-On in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
        return;
    }
    if (!STATE.ssoConfig)
        STATE.ssoConfig = { enabled: false } as any;
    const sso: any = STATE.ssoConfig;
    const configured: any = !!sso.connectionName;
    (document as any).getElementById('view-sso').innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div><h2>Single Sign-On</h2><span class="hint">${sso.enabled ? 'Enabled \u2014 users can sign in through your identity provider' : 'Not set up \u2014 users sign in with email and password'}</span></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:${configured ? 'pointer' : 'not-allowed'};opacity:${configured ? '1' : '0.5'};">
          <input type="checkbox" id="fSsoEnabled" style="width:auto;" ${sso.enabled ? 'checked' : ''} ${!configured ? 'disabled' : ''}>
          Enabled
        </label>
      </div>
      <div class="panel-body">
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:18px;max-width:640px;">
          Off by default. Set up a connection below, then switch it on when you\u2019re ready \u2014 nothing changes for your users until you do.
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Connection Name</label><input type="text" id="fSsoConnName" value="${escapeHtml(sso.connectionName || '')}" placeholder="e.g. Okta \u2014 Reno PD"></div>
          <div class="form-row"><label>Domain Hint</label><input type="text" id="fSsoDomainHint" value="${escapeHtml(sso.domainHint || '')}" placeholder="e.g. renopd.gov"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Client ID</label><input type="text" id="fSsoClientId" value="${escapeHtml(sso.clientId || '')}" placeholder="Provided by your identity provider"></div>
          <div class="form-row"><label>Client Secret</label><input type="password" id="fSsoClientSecret" value="" autocomplete="new-password" placeholder="${sso.hasSecret ? 'Configured \u2014 leave blank to keep it' : 'Provided by your identity provider'}"></div>
        </div>
        <div class="form-row"><label style="display:flex;align-items:center;gap:8px;font-weight:400;"><input type="checkbox" id="fSsoFederatedLogout" style="width:auto;" ${sso.federatedLogout ? 'checked' : ''}> Federated logout \u2014 also sign the user out of their identity provider</label></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-primary" id="btnSaveSso">${configured ? 'Update Connection' : 'Save Connection'}</button>
          ${configured ? `<button class="btn btn-outline" id="btnDeleteSso" style="color:var(--red);border-color:var(--red);">Delete Connection</button>` : ''}
        </div>
      </div>
    </div>
  `;
    (document as any).getElementById('btnSaveSso').addEventListener('click', (): any => {
        const connectionName: any = (document as any).getElementById('fSsoConnName').value.trim();
        const domainHint: any = (document as any).getElementById('fSsoDomainHint').value.trim();
        const clientId: any = (document as any).getElementById('fSsoClientId').value.trim();
        const clientSecretInput: any = (document as any).getElementById('fSsoClientSecret').value;
        const federatedLogout: any = (document as any).getElementById('fSsoFederatedLogout').checked;
        if (!connectionName || !clientId) {
            toast("Connection name and Client ID are required.", true);
            return;
        }
        // The secret itself is deliberately never kept in readable app state, only whether one has
        // been set. In a real deployment this value would go straight to a server-side secret store
        // and never be persisted or echoed back to the browser at all.
        STATE.ssoConfig = { ...sso, connectionName, domainHint, clientId, federatedLogout, hasSecret: sso.hasSecret || !!clientSecretInput } as any;
        logAuditEntry('Shared', `Saved the Single Sign-On connection "${connectionName}".`, 'sso');
        persist();
        toast("SSO connection saved.");
        renderSSOAdmin();
    });
    const delBtn: any = (document as any).getElementById('btnDeleteSso');
    if (delBtn)
        delBtn.addEventListener('click', (): any => {
            if (!confirm("Delete this SSO connection? Users will no longer be able to sign in with it, and will need to use email and password instead."))
                return;
            STATE.ssoConfig = { enabled: false } as any;
            logAuditEntry('Shared', 'Deleted the Single Sign-On connection.', 'sso');
            persist();
            toast("SSO connection deleted.");
            renderSSOAdmin();
        });
    const enabledToggle: any = (document as any).getElementById('fSsoEnabled');
    if (enabledToggle)
        enabledToggle.addEventListener('change', (): any => {
            STATE.ssoConfig.enabled = enabledToggle.checked;
            logAuditEntry('Shared', `${enabledToggle.checked ? 'Enabled' : 'Disabled'} Single Sign-On.`, 'sso');
            persist();
            toast(enabledToggle.checked ? "Single Sign-On enabled." : "Single Sign-On disabled.");
            renderSSOAdmin();
        });
}
function renderFieldLabelsAdmin(): any {
    const canManage: any = can('manage_field_labels');
    if (!canManage) {
        (document as any).getElementById('view-fieldlabels').innerHTML = permissionBlockedView("You don't have permission to customize field display names in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
        return;
    }
    const groups: any = {} as any;
    (Object.entries(DEFAULT_FIELD_LABELS) as any).forEach(([key, label]: any): any => {
        const prefix: any = key.split('.')[0];
        (groups[prefix] = groups[prefix] || []).push([key, label]);
    });
    const prefixNames: any = { pm: "Personnel Management", qm: "Quartermaster", fleet: "Fleet Management", eod: "EOD Management", subpoena: "Subpoena Management", grants: "Grants & Asset Forfeiture", audit: "Platform Audit Log", k9: "K9 Management", drone: "Drone Management (UAS)", civil: "Civil Process" } as any;
    (document as any).getElementById('view-fieldlabels').innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.edit}<div>Renaming a field here changes what it's <em>called</em> throughout the suite \u2014 column headers, form labels \u2014 without touching any underlying data. Covers the primary, most-visible fields; changes take effect the next time you open the affected screen.</div>
    </div>
    ${(Object.entries(groups) as any).map(([prefix, fields]: any): any => `
      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-head"><h2>${prefixNames[prefix] || prefix}</h2></div>
        <div class="panel-body" style="padding:0;overflow-x:auto;">
          <table><thead><tr><th>Field</th><th>Display Name</th><th></th></tr></thead><tbody>
          ${fields.map(([key, defaultLabel]: any): any => {
        const current: any = (STATE.fieldLabels && STATE.fieldLabels[key]) || defaultLabel;
        const isCustomized: any = STATE.fieldLabels && STATE.fieldLabels[key] && STATE.fieldLabels[key] !== defaultLabel;
        return `<tr><td class="mono" style="font-size:11px;color:var(--text-dim);">${key}</td>
              <td><input type="text" class="fieldLabelInput" data-field-key="${key}" data-default="${escapeHtml(defaultLabel)}" value="${escapeHtml(current)}" style="width:240px;"></td>
              <td>${isCustomized ? `<button class="btn-icon" data-reset-label="${key}" title="Reset to default: ${escapeHtml(defaultLabel)}">${ICONS.history}</button>` : ''}</td>
            </tr>`;
    }).join('')}
          </tbody></table>
        </div>
      </div>
    `).join('')}
  `;
    (document as any).querySelectorAll('.fieldLabelInput').forEach((inp?: any): any => {
        inp.addEventListener('change', (): any => {
            if (!STATE.fieldLabels)
                STATE.fieldLabels = {} as any;
            const key: any = inp.dataset.fieldKey;
            const val: any = inp.value.trim() || inp.dataset.default;
            inp.value = val;
            STATE.fieldLabels[key] = val;
            logAuditEntry('Shared', `Renamed field "${key}" to "${val}".`, 'field_label');
            persist();
            toast("Field display name saved.");
            renderFieldLabelsAdmin();
        });
    });
    (document as any).querySelectorAll('[data-reset-label]').forEach((b?: any): any => b.addEventListener('click', (): any => {
        const key: any = b.dataset.resetLabel;
        delete STATE.fieldLabels[key];
        logAuditEntry('Shared', `Reset field "${key}" to its default display name.`, 'field_label');
        persist();
        toast("Reset to default.");
        renderFieldLabelsAdmin();
    }));
}
function enterSharedView(viewId?: any, title?: any, sub?: any): any {
    ACTIVE_MODULE = null;
    ACTIVE_SHARED_VIEW = viewId;
    (document as any).getElementById('moduleSwitchBar').style.display = '';
    (document as any).getElementById('qmTenantFooter').style.display = 'none';
    (document as any).getElementById('defaultFooter').style.display = '';
    (document as any).getElementById('activeModuleName').textContent = 'Shared';
    (document as any).getElementById('navlist').innerHTML = '';
    (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active'));
    (document as any).getElementById('view-' + viewId).classList.add('active');
    (document as any).getElementById('page-title').textContent = title;
    (document as any).getElementById('page-sub').textContent = sub;
    if (viewId === 'roles')
        renderRoles();
    if (viewId === 'audit')
        renderPlatformAuditLogTab((document as any).getElementById('view-audit'));
    if (viewId === 'fieldlabels')
        renderFieldLabelsAdmin();
    if (viewId === 'branding')
        renderBrandingAdmin();
    if (viewId === 'sso')
        renderSSOAdmin();
    if (viewId === 'notices')
        StaffNotices.render();
}
