/* =========================================================================
   MODULE LAUNCHER + SWITCHING
   ========================================================================= */
let ACTIVE_MODULE = null; // null (launcher) | 'qm' | 'fleet'
let ACTIVE_SHARED_VIEW = null; // null | 'personnel' | 'roles' | 'audit' -- tracks which shared (cross-module) screen is open, if any

const MODULE_META = {
  qm: {
    name:"Quartermaster", ability:"module_quartermaster", icon:"box",
    tagline:"Equipment inventory, assignments, maintenance, requests, and audits.",
  },
  fleet: {
    name:"Fleet Management", ability:"module_fleet", icon:"truck",
    tagline:"Vehicles, inspections, maintenance, and vendor tracking for the fleet.",
  },
  personnel: {
    name:"Personnel Administration", ability:"module_personnel", icon:"idcard",
    tagline:"HR records, disciplinary tracking, training, scheduling, and workforce analytics.",
  },
  k9: {
    name:"K9 Management", ability:"module_k9", icon:"pawprint",
    tagline:"Handler teams, training, certifications, deployments, incidents, and GPS tracking.",
  },
  drone: {
    name:"Drone Management", ability:"module_drone", icon:"drone",
    tagline:"Fleet, certified operators, flight logs, maintenance, and FAA compliance tracking.",
  },
  eod: {
    name:"EOD Management", ability:"module_eod", icon:"bomb",
    tagline:"Bomb technician certifications, explosives inventory, magazine compliance, and ATF/USBDC reporting.",
  },
  subpoena: {
    name:"Subpoena Management", ability:"module_subpoena", icon:"gavel",
    tagline:"Assign, track, and notify staff of subpoenas, with document attachments and calendar integration.",
  },
  grants: {
    name:"Grants & Asset Forfeiture", ability:"module_grants", icon:"dollar",
    tagline:"Seized property, equitable sharing, and grant-funded equipment, with a fully configurable analytics dashboard.",
  },
  civil: {
    name:"Civil Process", ability:"module_civil", icon:"scale",
    tagline:"Intake, assign, and track civil paper service through a visual workflow board, with generated Returns of Service.",
  },
  permits: {
    name:"Licensing & Permits", ability:"module_permits", icon:"checklist",
    tagline:"Applications, fees, investigations, inspections, approvals, issued credentials, and renewals.",
  },
};

function accessibleModules(){
  const enabled = Array.isArray(STATE.enabledModules) ? STATE.enabledModules : [];
  return Object.keys(MODULE_META)
    .filter(key => can(MODULE_META[key].ability))
    .filter(key => enabled.length===0 || enabled.includes(key))
    .sort((a,b)=>MODULE_META[a].name.localeCompare(MODULE_META[b].name));
}

function renderSuiteNav(){
  const nav = document.getElementById('suiteNav');
  const items = [];
  items.push({label:"All Modules", icon:"grid", action:showLauncher});
  items.push({label:'Staff Notices',icon:'chat',action:()=>SuiteUX.navigate('shared/notices')});
  if(authoritativeRoleAdmin()) items.push({label:"Roles & Abilities", icon:"shield", action:()=>enterSharedView('roles', 'Roles & Abilities', "Define unlimited roles and control exactly what each one can do, across every module")});
  const canSeeAudit = can('qm_admin_audit') || can('fleet_admin_audit') || can('pm_admin_audit') || can('k9_admin_audit') || can('drone_admin_audit') || can('eod_admin_audit') || can('subpoena_admin_audit') || can('grants_admin_audit') || can('civil_admin_audit') || can('permits_admin_audit');
  if(canSeeAudit) items.push({label:"Audit Log", icon:"history", action:()=>enterSharedView('audit', 'Platform Audit Log', "Every logged action across every module, in one place, filterable by module, user, date, and entity type")});
  if(can('manage_field_labels')) items.push({label:"Field Labels", icon:"edit", action:()=>enterSharedView('fieldlabels', 'Field Display Names', "Rename how a field appears across the suite, without touching the underlying data")});
  if(can('manage_branding')) items.push({label:"Branding", icon:"image", action:()=>enterSharedView('branding', 'Agency Branding', "Customize the logo, title, and tagline shown in the sidebar for this deployment")});
  nav.innerHTML = items.map((it,i)=>`
    <button class="navitem" data-suite-nav="${i}">${ICONS[it.icon]}<span>${it.label}</span></button>
  `).join('');
  nav.querySelectorAll('[data-suite-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> items[Number(btn.dataset.suiteNav)].action());
  });
}

// Captured once, before any custom branding is ever applied, so "Reset to Default" always has the
// real original SonoMarzi logo to fall back to without needing to duplicate that base64 string in JS.
const DEFAULT_LOGO_SRC = (document.querySelector('#brandMark img')||{}).src || '';
function applyAgencyBranding(){
  const b = STATE.agencyBranding || {};
  const titleEl = document.getElementById('brandTitle');
  const subEl = document.getElementById('brandSub');
  const img = document.querySelector('#brandMark img');
  if(titleEl) titleEl.textContent = b.title || "SonoMarzi PS Management Suite";
  if(subEl) subEl.textContent = b.subtitle || "Choose a module to begin";
  if(img) img.src = b.logoDataUrl || DEFAULT_LOGO_SRC;
  document.title = b.title || "SonoMarzi PS Management Suite";
  applyPwaIcon(b.logoDataUrl, b.title);
}

// Home-screen/install icon: iOS reads a static <link rel="apple-touch-icon"> at the moment
// someone taps "Add to Home Screen"; Android/Chrome's install prompt reads the icons array from
// whatever the <link rel="manifest"> currently points to. Both are ordinarily fixed, one-per-
// deployment files -- but since every tenant shares this same deployed file, "the same icon for
// everyone" would mean an agency's own uploaded logo can never be what shows up on a user's home
// screen. Swapping both dynamically, right after this tenant's branding loads, means each agency
// genuinely gets its own icon without needing its own separate deployment.
let PWA_ICON_BLOB_URL = null;
const PWA_DEFAULT_ICON_HREFS = {}; // captured once, so a logo reset can restore the real defaults
function applyPwaIcon(logoDataUrl, appName){
  const iconLinks = [...document.querySelectorAll('link[rel="icon"]')];
  const appleLink = document.querySelector('link[rel="apple-touch-icon"]');
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if(!PWA_DEFAULT_ICON_HREFS.captured){
    PWA_DEFAULT_ICON_HREFS.icons = iconLinks.map(l=>l.getAttribute('href'));
    PWA_DEFAULT_ICON_HREFS.apple = appleLink ? appleLink.getAttribute('href') : null;
    PWA_DEFAULT_ICON_HREFS.manifest = manifestLink ? manifestLink.getAttribute('href') : null;
    PWA_DEFAULT_ICON_HREFS.captured = true;
  }
  if(PWA_ICON_BLOB_URL){ URL.revokeObjectURL(PWA_ICON_BLOB_URL); PWA_ICON_BLOB_URL = null; }
  if(!logoDataUrl){
    // No custom logo on this tenant -- make sure we're showing the real default files, in case
    // a previous tenant's logo (in this same browser tab) had already swapped them out.
    iconLinks.forEach((l,i)=>{ if(PWA_DEFAULT_ICON_HREFS.icons[i]) l.setAttribute('href', PWA_DEFAULT_ICON_HREFS.icons[i]); });
    if(appleLink && PWA_DEFAULT_ICON_HREFS.apple) appleLink.setAttribute('href', PWA_DEFAULT_ICON_HREFS.apple);
    if(manifestLink && PWA_DEFAULT_ICON_HREFS.manifest) manifestLink.setAttribute('href', PWA_DEFAULT_ICON_HREFS.manifest);
    return;
  }
  // iOS: a data URL works directly as the apple-touch-icon href.
  if(appleLink) appleLink.setAttribute('href', logoDataUrl);
  iconLinks.forEach(l=>l.setAttribute('href', logoDataUrl));
  // Android/Chrome: build a manifest that mirrors the real one but points every icon entry at
  // this tenant's logo, then swap the <link rel="manifest"> to a blob URL of it. The "sizes"
  // values are left as-is (Chrome treats them as a hint, not a hard requirement) since we only
  // have the one uploaded image, not pre-resized variants at each declared size.
  const manifestBody = {
    name: appName || "SonoMarzi PS Management Suite",
    short_name: (appName || "SonoMarzi").slice(0,12),
    description: "Public safety management suite: personnel, scheduling, quartermaster, fleet, K9, UAS, EOD, subpoenas, civil process, and grants.",
    // Absolute, not relative: this manifest is served from a blob: URL, which has no real origin
    // for a relative "/" to resolve against, unlike the static manifest.webmanifest file, which is
    // served from the real page origin. A relative start_url/scope here gets silently rejected as
    // invalid by the browser -- using location.origin keeps this correct even if the site is ever
    // served from a different domain.
    start_url: location.origin + "/", scope: location.origin + "/", display: "standalone", display_override: ["standalone","minimal-ui"],
    orientation: "any", background_color: "#131316", theme_color: "#24364E", lang: "en-US", dir: "ltr",
    icons: [
      { src: logoDataUrl, sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: logoDataUrl, sizes: "512x512", type: "image/jpeg", purpose: "any" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifestBody)], {type:'application/manifest+json'});
  PWA_ICON_BLOB_URL = URL.createObjectURL(blob);
  if(manifestLink) manifestLink.setAttribute('href', PWA_ICON_BLOB_URL);
}

function renderBrandingAdmin(){
  const canManage = can('manage_branding');
  if(!canManage){
    document.getElementById('view-branding').innerHTML = permissionBlockedView("You don't have permission to customize agency branding in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
    return;
  }
  const b = STATE.agencyBranding;
  document.getElementById('view-branding').innerHTML = `
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
  const dropZone = document.getElementById('brandingPhotoDropZone');
  const input = document.getElementById('brandingPhotoFileInput');
  const processLogo = (file)=>{
    if(!file || !file.type || !file.type.startsWith('image/')){ toast("Please choose an image file.", true); return; }
    resizeImageForStorage(file, 300, 0.9, (dataUrl)=>{
      STATE.agencyBranding.logoDataUrl = dataUrl;
      logAuditEntry('Shared', 'Updated the agency sidebar logo.', 'branding');
      persist();
      applyAgencyBranding();
      toast("Logo updated.");
      renderBrandingAdmin();
    });
  };
  dropZone.addEventListener('click', ()=>input.click());
  input.addEventListener('change', (e)=>processLogo(e.target.files[0]));
  dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--blue)'; });
  dropZone.addEventListener('dragleave', ()=>{ dropZone.style.borderColor='var(--border)'; });
  dropZone.addEventListener('drop', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--border)'; if(e.dataTransfer.files[0]) processLogo(e.dataTransfer.files[0]); });
  const resetLogoBtn = document.getElementById('btnResetLogo');
  if(resetLogoBtn) resetLogoBtn.addEventListener('click', ()=>{
    STATE.agencyBranding.logoDataUrl = null;
    logAuditEntry('Shared', 'Reset the agency sidebar logo to default.', 'branding');
    persist();
    applyAgencyBranding();
    toast("Logo reset to default.");
    renderBrandingAdmin();
  });
  document.getElementById('btnSaveBranding').addEventListener('click', async ()=>{
    STATE.agencyBranding.title = document.getElementById('fBrandTitle').value.trim() || "SonoMarzi PS Management Suite";
    STATE.agencyBranding.subtitle = document.getElementById('fBrandSub').value.trim() || "Choose a module to begin";
    logAuditEntry('Shared', 'Updated the agency title/tagline.', 'branding');
    persist();
    applyAgencyBranding();

    const saved = await SuiteStore.flush();
    if(!saved){
      toast("Branding change is still pending. AWS did not confirm the save.", true);
      return;
    }

    toast("Branding saved to AWS.");

    if(typeof SuiteStore!=='undefined' && SuiteStore.mode()==='shared'){
      const ctx = SuiteStore.remoteContext();
      SuiteStore.api('/tenant-admin',{method:'POST',body:JSON.stringify({
        action:'update_agency_branding', tenantId:ctx.tenantId, agencyId:ctx.agencyId,
        branding:{title:STATE.agencyBranding.title, subtitle:STATE.agencyBranding.subtitle}
      })}).catch(error=>toast(`Branding saved, but the tenant overview copy could not be updated: ${error.message}`,true));
    }
  });
  document.getElementById('btnResetBranding').addEventListener('click', ()=>{
    if(!confirm("Reset the logo, title, and tagline back to the SonoMarzi defaults?")) return;
    STATE.agencyBranding = { logoDataUrl: null, title: "SonoMarzi PS Management Suite", subtitle: "Choose a module to begin" };
    logAuditEntry('Shared', 'Reset all agency branding to default.', 'branding');
    persist();
    applyAgencyBranding();
    toast("Branding reset to default.");
    renderBrandingAdmin();
    if(typeof SuiteStore!=='undefined' && SuiteStore.mode()==='shared'){
      const ctx = SuiteStore.remoteContext();
      SuiteStore.api('/tenant-admin',{method:'POST',body:JSON.stringify({
        action:'update_agency_branding', tenantId:ctx.tenantId, agencyId:ctx.agencyId,
        branding:{title:STATE.agencyBranding.title, subtitle:STATE.agencyBranding.subtitle}
      })}).catch(error=>console.error('Could not mirror reset branding to tenant overview:',error));
    }
  });
}

function renderSSOAdmin(){
  if(!can('admin_sso')){
    document.getElementById('view-sso').innerHTML = permissionBlockedView("You don't have permission to configure Single Sign-On in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
    return;
  }
  if(!STATE.ssoConfig) STATE.ssoConfig = {enabled:false};
  const sso = STATE.ssoConfig;
  const configured = !!sso.connectionName;
  document.getElementById('view-sso').innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div><h2>Single Sign-On</h2><span class="hint">${sso.enabled ? 'Enabled \u2014 users can sign in through your identity provider' : 'Not set up \u2014 users sign in with email and password'}</span></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;cursor:${configured?'pointer':'not-allowed'};opacity:${configured?'1':'0.5'};">
          <input type="checkbox" id="fSsoEnabled" style="width:auto;" ${sso.enabled?'checked':''} ${!configured?'disabled':''}>
          Enabled
        </label>
      </div>
      <div class="panel-body">
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:18px;max-width:640px;">
          Off by default. Set up a connection below, then switch it on when you\u2019re ready \u2014 nothing changes for your users until you do.
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Connection Name</label><input type="text" id="fSsoConnName" value="${escapeHtml(sso.connectionName||'')}" placeholder="e.g. Okta \u2014 Reno PD"></div>
          <div class="form-row"><label>Domain Hint</label><input type="text" id="fSsoDomainHint" value="${escapeHtml(sso.domainHint||'')}" placeholder="e.g. renopd.gov"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Client ID</label><input type="text" id="fSsoClientId" value="${escapeHtml(sso.clientId||'')}" placeholder="Provided by your identity provider"></div>
          <div class="form-row"><label>Client Secret</label><input type="password" id="fSsoClientSecret" value="" autocomplete="new-password" placeholder="${sso.hasSecret ? 'Configured \u2014 leave blank to keep it' : 'Provided by your identity provider'}"></div>
        </div>
        <div class="form-row"><label style="display:flex;align-items:center;gap:8px;font-weight:400;"><input type="checkbox" id="fSsoFederatedLogout" style="width:auto;" ${sso.federatedLogout?'checked':''}> Federated logout \u2014 also sign the user out of their identity provider</label></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-primary" id="btnSaveSso">${configured?'Update Connection':'Save Connection'}</button>
          ${configured ? `<button class="btn btn-outline" id="btnDeleteSso" style="color:var(--red);border-color:var(--red);">Delete Connection</button>` : ''}
        </div>
      </div>
    </div>
  `;
  document.getElementById('btnSaveSso').addEventListener('click', ()=>{
    const connectionName = document.getElementById('fSsoConnName').value.trim();
    const domainHint = document.getElementById('fSsoDomainHint').value.trim();
    const clientId = document.getElementById('fSsoClientId').value.trim();
    const clientSecretInput = document.getElementById('fSsoClientSecret').value;
    const federatedLogout = document.getElementById('fSsoFederatedLogout').checked;
    if(!connectionName || !clientId){ toast("Connection name and Client ID are required.", true); return; }
    // The secret itself is deliberately never kept in readable app state, only whether one has
    // been set. In a real deployment this value would go straight to a server-side secret store
    // and never be persisted or echoed back to the browser at all.
    STATE.ssoConfig = { ...sso, connectionName, domainHint, clientId, federatedLogout, hasSecret: sso.hasSecret || !!clientSecretInput };
    logAuditEntry('Shared', `Saved the Single Sign-On connection "${connectionName}".`, 'sso');
    persist();
    toast("SSO connection saved.");
    renderSSOAdmin();
  });
  const delBtn = document.getElementById('btnDeleteSso');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm("Delete this SSO connection? Users will no longer be able to sign in with it, and will need to use email and password instead.")) return;
    STATE.ssoConfig = { enabled:false };
    logAuditEntry('Shared', 'Deleted the Single Sign-On connection.', 'sso');
    persist();
    toast("SSO connection deleted.");
    renderSSOAdmin();
  });
  const enabledToggle = document.getElementById('fSsoEnabled');
  if(enabledToggle) enabledToggle.addEventListener('change', ()=>{
    STATE.ssoConfig.enabled = enabledToggle.checked;
    logAuditEntry('Shared', `${enabledToggle.checked?'Enabled':'Disabled'} Single Sign-On.`, 'sso');
    persist();
    toast(enabledToggle.checked ? "Single Sign-On enabled." : "Single Sign-On disabled.");
    renderSSOAdmin();
  });
}

function renderFieldLabelsAdmin(){
  const canManage = can('manage_field_labels');
  if(!canManage){
    document.getElementById('view-fieldlabels').innerHTML = permissionBlockedView("You don't have permission to customize field display names in this role. This is restricted to System Admin and SonoMarzi Platform Admin.");
    return;
  }
  const groups = {};
  Object.entries(DEFAULT_FIELD_LABELS).forEach(([key,label])=>{
    const prefix = key.split('.')[0];
    (groups[prefix] = groups[prefix]||[]).push([key,label]);
  });
  const prefixNames = {pm:"Personnel Management", qm:"Quartermaster", fleet:"Fleet Management", eod:"EOD Management", subpoena:"Subpoena Management", grants:"Grants & Asset Forfeiture", audit:"Platform Audit Log", k9:"K9 Management", drone:"Drone Management (UAS)", civil:"Civil Process"};

  document.getElementById('view-fieldlabels').innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.edit}<div>Renaming a field here changes what it's <em>called</em> throughout the suite \u2014 column headers, form labels \u2014 without touching any underlying data. Covers the primary, most-visible fields; changes take effect the next time you open the affected screen.</div>
    </div>
    ${Object.entries(groups).map(([prefix,fields])=>`
      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-head"><h2>${prefixNames[prefix]||prefix}</h2></div>
        <div class="panel-body" style="padding:0;overflow-x:auto;">
          <table><thead><tr><th>Field</th><th>Display Name</th><th></th></tr></thead><tbody>
          ${fields.map(([key,defaultLabel])=>{
            const current = (STATE.fieldLabels && STATE.fieldLabels[key]) || defaultLabel;
            const isCustomized = STATE.fieldLabels && STATE.fieldLabels[key] && STATE.fieldLabels[key]!==defaultLabel;
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
  document.querySelectorAll('.fieldLabelInput').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      if(!STATE.fieldLabels) STATE.fieldLabels = {};
      const key = inp.dataset.fieldKey;
      const val = inp.value.trim() || inp.dataset.default;
      inp.value = val;
      STATE.fieldLabels[key] = val;
      logAuditEntry('Shared', `Renamed field "${key}" to "${val}".`, 'field_label');
      persist();
      toast("Field display name saved.");
      renderFieldLabelsAdmin();
    });
  });
  document.querySelectorAll('[data-reset-label]').forEach(b=>b.addEventListener('click', ()=>{
    const key = b.dataset.resetLabel;
    delete STATE.fieldLabels[key];
    logAuditEntry('Shared', `Reset field "${key}" to its default display name.`, 'field_label');
    persist();
    toast("Reset to default.");
    renderFieldLabelsAdmin();
  }));
}

function enterSharedView(viewId, title, sub){
  if(viewId==='roles' && !authoritativeRoleAdmin()){
    toast("System Admin or Platform Admin access is required.", true);
    showLauncher();
    return;
  }
  ACTIVE_MODULE = null;
  ACTIVE_SHARED_VIEW = viewId;
  document.getElementById('moduleSwitchBar').style.display = '';
  document.getElementById('qmTenantFooter').style.display = 'none';
  document.getElementById('defaultFooter').style.display = '';
  document.getElementById('activeModuleName').textContent = 'Shared';
  document.getElementById('navlist').innerHTML = '';
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+viewId).classList.add('active');
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-sub').textContent = sub;
  if(viewId==='roles') renderRoles();
  if(viewId==='audit') renderPlatformAuditLogTab(document.getElementById('view-audit'));
  if(viewId==='fieldlabels') renderFieldLabelsAdmin();
  if(viewId==='branding') renderBrandingAdmin();
  if(viewId==='sso') renderSSOAdmin();
  if(viewId==='notices') StaffNotices.render();
}

// Staff notices are persisted by dedicated RPCs, independently of SuiteStore.flush().
const StaffNotices=(()=>{
  const context=()=>SuiteStore.remoteContext();
  let attemptId=null,attemptSpec=null,lastUnread=-1,items=[],queuedOffer=null;
  const expandedNotices=new Set();
  // The signed-in membership identifies these built-in sender roles. The create RPC
  // remains the authority for every send, including configurable future roles.
  const canCompose=()=>authoritativeRoleAdmin()||can('staff_notify_send');
  function withTimeout(promise,ms,message){
    let timer;
    return Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error(message)),ms);
    })]).finally(()=>clearTimeout(timer));
  }
  async function awsNotice(action,payload={}){
    const {tenantId,agencyId}=context();
    const result=await SuiteStore.api('/staff-notices',{
      method:'POST',
      body:JSON.stringify({
        tenant_id:tenantId,
        agency_id:agencyId,
        action,
        payload
      })
    });
    return result?.data;
  }
  function updateNavBadge(unread=lastUnread){
    const nav=document.getElementById('staffNoticesNav'),count=document.getElementById('staffNoticeCount');
    if(!nav||!count)return;
    const number=Math.max(0,unread);
    count.hidden=number===0;
    count.textContent=number>99?'99+':String(number);
    nav.classList.toggle('has-unread',number>0);
    nav.setAttribute('aria-label',number?'Staff Notices, '+number+' unread':'Staff Notices');
    nav.title=number?number+' unread staff notice'+(number===1?'':'s'):'Staff Notices';
  }
  const selected=selector=>[...document.querySelectorAll(selector+':checked')].map(x=>x.value);
  const activeAssignments=onDate=>STATE.pm.scheduleAssignments.filter(a=>a.startDate<=onDate&&(!a.endDate||a.endDate>=onDate));
  const recipients=(people,units,shifts,onDate)=>{
    const ids=new Set(people);
    for(const p of STATE.personnel)if(units.includes(p.unit))ids.add(p.id);
    for(const a of activeAssignments(onDate))if(shifts.includes(a.shiftId))ids.add(a.personId);
    return STATE.personnel.filter(p=>ids.has(p.id)&&p.status!=='Inactive');
  };
  function selection(){
    const people=selected('[data-notice-person]'),units=selected('[data-notice-unit]'),
      shifts=selected('[data-notice-shift]'),onDate=document.getElementById('noticeDate').value;
    return {people,units,shifts,onDate,recipients:recipients(people,units,shifts,onDate)};
  }
  function preview(){
    const box=document.getElementById('noticePreview');if(!box)return;
    const s=selection();
    box.textContent=s.recipients.length?
      `${s.recipients.length} selected: ${s.recipients.map(p=>p.name).join(', ')}. Only staff with an active app account will receive a notice.`:
      'Choose at least one person, unit, or shift pattern.';
  }
  async function loadInbox(){
    if(SuiteStore.mode()!=='shared')return [];
    items=(await withTimeout(awsNotice('inbox'),12000,'Notice inbox timed out. Tap Refresh to try again.'))||[];
    const unread=items.filter(n=>!n.read_at).length;
    let badge=document.getElementById('staffNoticeBadge');
    if(!badge){
      badge=document.createElement('button');badge.id='staffNoticeBadge';badge.type='button';
      badge.className='btn btn-primary';badge.style.cssText='position:fixed;right:16px;bottom:16px;z-index:80;box-shadow:0 8px 24px #0005';
      badge.onclick=()=>SuiteUX.navigate('shared/notices');document.body.append(badge);
    }
    badge.hidden=unread===0||!CURRENT_USER_ID;
    badge.textContent=`Notices · ${unread} new`;
    if(lastUnread>=0&&unread>lastUnread&&document.visibilityState==='visible')toast(`${unread} unread staff notice${unread===1?'':'s'}.`);
    lastUnread=unread;
    updateNavBadge(unread);
    if(document.getElementById('noticeInbox'))drawInbox();
    return items;
  }
  function drawInbox(){
    const root=document.getElementById('noticeInbox');if(!root)return;
    root.replaceChildren();
    if(!items.length){root.textContent='No staff notices yet.';return;}
    for(const item of items){
      const row=document.createElement('details');row.className='panel-body';
      row.style.cssText='border-bottom:1px solid var(--border);padding:12px 16px';
      row.open=expandedNotices.has(item.id)||!item.read_at;
      const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;display:list-item;padding:4px 0';
      const status=document.createElement('strong');status.textContent=item.response?
        `Responded: ${item.response}`:(item.read_at?'Read':'New');
      const label=document.createElement('span');label.textContent=` · ${new Date(item.created_at).toLocaleString()} · ${item.body.replace(/\s+/g,' ').slice(0,90)}${item.body.length>90?'…':''}`;
      summary.append(status,label);row.append(summary);
      const body=document.createElement('p');body.textContent=item.body;body.style.whiteSpace='pre-wrap';row.append(body);
      row.addEventListener('toggle',()=>{
        if(row.open){expandedNotices.add(item.id);if(!item.read_at)respond(item.id,'read',false).catch(console.error);}
        else expandedNotices.delete(item.id);
      });
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
      for(const [value,label] of [['acknowledged','Acknowledge'],['interested','Interested'],['declined','Decline']]){
        const button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-sm';
        button.textContent=label;button.disabled=item.response===value;
        button.onclick=()=>respond(item.id,value,true);actions.append(button);
      }
      if(item.response){
        const clear=document.createElement('button');clear.type='button';clear.className='btn btn-outline btn-sm';
        clear.textContent='Clear from my notices';
        clear.onclick=async()=>{
          clear.disabled=true;
          try{
            await withTimeout(awsNotice('clear',{noticeId:item.id}),12000,'Clear timed out. Refresh and try again.');
            expandedNotices.delete(item.id);await loadInbox();toast('Notice cleared from your list.');
          }catch(error){toast(error.message,true);clear.disabled=false;}
        };
        actions.append(clear);
      }
      row.append(actions);root.append(row);
    }
  }
  async function respond(id,value,redraw){
    let data;
    try{data=await awsNotice('respond',{noticeId:id,value});}
    catch(error){toast(error.message,true);return;}
    const item=items.find(n=>n.id===id);if(item){item.read_at=data.read_at;item.response=data.response;}
    if(redraw){await loadInbox();toast(value==='interested'?'Interest recorded. A supervisor must still assign the shift.':'Response recorded.');}
    else{lastUnread=items.filter(n=>!n.read_at).length;const badge=document.getElementById('staffNoticeBadge');if(badge){badge.hidden=lastUnread===0;badge.textContent=`Notices · ${lastUnread} new`;}updateNavBadge(lastUnread);}
  }
  async function loadHistory(){
    const box=document.getElementById('noticeHistory');if(!box)return;
    let data;
    try{data=await withTimeout(awsNotice('history'),12000,'Recent notices timed out. Tap Refresh to try again.');}
    catch(error){box.replaceChildren();box.textContent=error.message;return;}
    box.replaceChildren();
    if(!data?.length){box.textContent='No notices sent yet.';return;}
    for(const n of data){
      const row=document.createElement('div');row.className='panel-body';row.style.borderBottom='1px solid var(--border)';
      const summary=document.createElement('strong');summary.textContent=
        `${new Date(n.created_at).toLocaleString()} · ${n.recipients} recipients · ${n.read_count} read · ${n.interested} interested · ${n.declined} declined · ${n.pushed} push accepted`;
      const body=document.createElement('p');body.textContent=n.body;
      const detail=document.createElement('div');
      const button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-sm';
      button.textContent='View recipients and responses';
      button.onclick=async()=>{
        if(detail.childNodes.length){detail.replaceChildren();return;}
        button.disabled=true;
        let data;
        try{data=await awsNotice('responses',{noticeId:n.id});}
        catch(error){button.disabled=false;toast(error.message,true);return;}
        button.disabled=false;
        if(!(data||[]).length){
          const line=document.createElement('p');
          line.textContent='No recipients were recorded for this notice.';
          detail.append(line);
        }else{
          for(const recipient of data||[]){
            const line=document.createElement('p');
            line.textContent=`${recipient.name}: ${recipient.response|| (recipient.read_at?'Read, no response':'Unread')}`;
            detail.append(line);
          }
        }
      };
      row.append(summary,body,button,detail);box.append(row);
    }
  }
  async function pushState(){
    const box=document.getElementById('pushState');
    if(!box)return;
    box.textContent='In-app notices are active on AWS. Device push delivery is not enabled in this environment yet.';
    const on=document.getElementById('pushEnable'),off=document.getElementById('pushDisable');
    if(on)on.disabled=true;if(off)off.disabled=true;
  }
  async function enablePush(){
    toast('In-app notices are active. Device push will be enabled during notification hardening.');
  }
  async function disablePush(){
    toast('Device push is not enabled in this environment.');
  }
  async function beforeSignOut(){
    document.getElementById('staffNoticeBadge')?.remove();
    items=[];expandedNotices.clear();lastUnread=-1;updateNavBadge(0);
  }
  function render(){
    if(SuiteStore.mode()!=='shared'){toast('Agency sign-in is required for staff notices.',true);return;}
    const root=document.getElementById('view-notices');
    if(!root)return;
    try{
    const canSend=canCompose();
    const personnel=STATE.personnel.filter(p=>p.status!=='Inactive').sort((a,b)=>a.name.localeCompare(b.name));
    const units=[...new Set(personnel.map(p=>p.unit).filter(Boolean))].sort();
    const today=fmt(new Date());
    const shifts=STATE.pm.scheduleShifts.filter(s=>s.published!==false&&(!s.endDate||s.endDate>=today));
    root.innerHTML=`<section class="panel"><div class="panel-head"><h2>My notices</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${canSend?'<button type="button" id="noticeComposeJump" class="btn btn-primary btn-sm">Send staff notice</button>':''}<button type="button" id="noticeRefresh" class="btn btn-outline btn-sm">Refresh</button></div></div>
      <div id="noticeInbox" aria-live="polite" class="panel-body">Loading…</div></section>
      ${canSend?`<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Send staff notice</h2>${sessionStorage.getItem('sonomarzi.staffNotice.return')?'<button type="button" id="noticeReturn" class="btn btn-outline btn-sm">← Back to Duty Roster</button>':''}</div><div class="panel-body">
       <p>Choose individuals, units, or shift patterns. Each signed-in member receives one notice.</p>
       <div class="form-row"><label for="noticeBody">Message</label><textarea id="noticeBody" rows="4" maxlength="1000" placeholder="Coverage is needed for…"></textarea><small id="noticeCount">0 / 1000 characters</small></div>
       <div class="form-row"><label for="noticeDate">Shift assignment date</label><input type="date" id="noticeDate" value="${fmt(new Date())}"><small>Used when targeting a shift pattern.</small></div>
       <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px">
        <fieldset><legend>Individuals</legend><input type="search" id="noticeSearch" placeholder="Find staff" aria-label="Find staff" style="width:100%;margin-bottom:8px"><div id="noticePeople" style="max-height:220px;overflow:auto">${personnel.map(p=>`<label style="display:block"><input type="checkbox" data-notice-person value="${escapeHtml(p.id)}"> ${escapeHtml(p.name)}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Units</legend><div style="max-height:220px;overflow:auto">${units.map(u=>`<label style="display:block"><input type="checkbox" data-notice-unit value="${escapeHtml(u)}"> ${escapeHtml(u)}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Shift patterns</legend><div style="max-height:220px;overflow:auto">${shifts.map(s=>`<label style="display:block"><input type="checkbox" data-notice-shift value="${escapeHtml(s.id)}"> ${escapeHtml(s.name)}</label>`).join('')}</div></fieldset>
       </div><p id="noticePreview" role="status"></p>
       <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="noticeSend" class="btn btn-primary">Send notice</button><button type="button" id="noticeClear" class="btn btn-outline">Clear</button></div>
       <p id="noticeResult" role="status"></p>
      </div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Recent notices</h2><button type="button" id="noticeHistoryRefresh" class="btn btn-outline btn-sm">Refresh</button></div><div id="noticeHistory" class="panel-body">Loading…</div></section>`:''}`;
    root.querySelector('#noticeRefresh').onclick=()=>loadInbox().catch(e=>toast(e.message,true));
    loadInbox().catch(e=>{document.getElementById('noticeInbox').textContent=e.message;});
    if(canSend){
      root.querySelector('#noticeReturn')?.addEventListener('click',()=>{
        const destination=sessionStorage.getItem('sonomarzi.staffNotice.return');
        sessionStorage.removeItem('sonomarzi.staffNotice.return');
        if(destination==='personnel/scheduling'){
          enterModule('personnel');
          PM.switchView('pm-scheduling');
        }
      });
      root.querySelector('#noticeComposeJump').onclick=()=>{root.querySelector('#noticeBody').scrollIntoView({behavior:'smooth',block:'center'});root.querySelector('#noticeBody').focus({preventScroll:true});};
      root.querySelectorAll('input[type="checkbox"],#noticeDate').forEach(x=>x.addEventListener('change',preview));
      root.querySelector('#noticeSearch').oninput=e=>{const q=e.target.value.toLowerCase();root.querySelectorAll('#noticePeople label').forEach(l=>l.hidden=!l.textContent.toLowerCase().includes(q));};
      root.querySelector('#noticeBody').oninput=e=>root.querySelector('#noticeCount').textContent=`${e.target.value.length} / 1000 characters`;
      root.querySelector('#noticeSend').onclick=send;
      root.querySelector('#noticeClear').onclick=clearCompose;
      root.querySelector('#noticeHistoryRefresh').onclick=()=>loadHistory().catch(e=>{const box=document.getElementById('noticeHistory');if(box)box.textContent=e.message;});
      if(queuedOffer){
        const {people,shift,date}=queuedOffer;queuedOffer=null;
        root.querySelector('#noticeDate').value=date;
        root.querySelector('#noticeBody').value=`${STATE.agencyBranding?.title||'Agency'}: Overtime coverage is available for ${shift.name} on ${SuiteUX.displayDate(date)}. Open this notice and select Interested if you are available. A supervisor must confirm the assignment.`;
        root.querySelector('#noticeCount').textContent=`${root.querySelector('#noticeBody').value.length} / 1000 characters`;
        for(const id of people){const box=[...root.querySelectorAll('[data-notice-person]')].find(x=>x.value===id);if(box)box.checked=true;}
      }
      preview();loadHistory().catch(e=>{const box=document.getElementById('noticeHistory');if(box)box.textContent=e.message;});
    }
    }catch(error){
      console.error('Staff notices could not render',error);
      root.innerHTML=`<section class="panel"><div class="panel-body" role="alert">Staff notices could not open: ${escapeHtml(error.message||'Unknown error')}</div></section>`;
    }
  }
  function clearCompose(){
    const root=document.getElementById('view-notices');
    if(!root)return;
    const body=root.querySelector('#noticeBody');
    const date=root.querySelector('#noticeDate');
    const search=root.querySelector('#noticeSearch');
    if(body)body.value='';
    if(date)date.value=fmt(new Date());
    if(search)search.value='';
    root.querySelectorAll('[data-notice-person],[data-notice-unit],[data-notice-shift]').forEach(box=>{box.checked=false;});
    root.querySelectorAll('#noticePeople label').forEach(label=>{label.hidden=false;});
    const count=root.querySelector('#noticeCount');if(count)count.textContent='0 / 1000 characters';
    const result=root.querySelector('#noticeResult');if(result)result.textContent='';
    attemptId=null;attemptSpec=null;
    preview();
    body?.focus();
  }
  async function send(){
    const body=document.getElementById('noticeBody').value.trim(),s=selection(),out=document.getElementById('noticeResult');
    if(!body||body.length>1000||!s.recipients.length){out.textContent='Enter a message and choose recipients.';return;}
    if(!confirm(`Send an in-app notice to up to ${s.recipients.length} staff members? Push will be attempted for devices that enabled it.`))return;
    const spec=JSON.stringify([body,s.people,s.units,s.shifts,s.onDate]);
    if(attemptId&&attemptSpec!==spec&&!confirm('Check the recent notices before starting a different request. Continue?'))return;
    if(attemptSpec!==spec){attemptId=crypto.randomUUID();attemptSpec=spec;}
    const button=document.getElementById('noticeSend');button.disabled=true;out.textContent='Saving notice…';
    const {tenantId,agencyId}=context();
    try{
      const data=await withTimeout(awsNotice('create',{
        body,
        clientId:attemptId,
        recipients:s.recipients.map(p=>({
          personId:p.id,
          email:p.email||'',
          name:p.name||''
        }))
      }),15000,'Save status is unknown. Check Recent notices, then retry this same message if needed.');
      attemptId=null;attemptSpec=null;
      out.textContent=data.recipients?
        `Saved for ${data.recipients} signed-in staff. The notice is available in SonoMarzi now.`:
        'No selected staff had an active app account. No notice was delivered.';
      loadHistory().catch(e=>console.warn('Notice history refresh failed',e));
      loadInbox().catch(e=>console.warn('Notice inbox refresh failed',e));
    }catch(error){out.textContent=error.message||'The notice could not be saved. Retry uses the same request ID.';toast(out.textContent,true);}
    finally{button.disabled=false;}
  }
  function offer(people,shift,date){
    queuedOffer={people,shift,date};
    closeModal();SuiteUX.navigate('shared/notices');
  }
  // Keep unread indicators responsive in multi-user use. Staff notices live in their
  // own tables, so they do not participate in the general workspace revision check.
  setInterval(()=>{if(SuiteStore.mode()==='shared'&&CURRENT_USER_ID&&document.visibilityState==='visible')
    loadInbox().catch(e=>console.warn('Notice refresh failed',e));},15000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&SuiteStore.mode()==='shared'&&CURRENT_USER_ID)
    loadInbox().catch(()=>{});});
  return {render,offer,enablePush,disablePush,beforeSignOut,loadInbox,updateNavBadge,canCompose};
})();




function showLauncher(){
  ACTIVE_MODULE = null;
  ACTIVE_SHARED_VIEW = null;
  document.getElementById('moduleSwitchBar').style.display = 'none';
  document.getElementById('qmTenantFooter').style.display = 'none';
  document.getElementById('defaultFooter').style.display = '';
  document.getElementById('navlist').innerHTML = '';
  document.getElementById('navSeparator').style.display = 'none';
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-launcher').classList.add('active');
  document.getElementById('page-title').textContent = 'Choose a Module';
  document.getElementById('page-sub').textContent = 'Pick a module to get started';
  const accessible = accessibleModules();
  const cardsHtml = accessible.map(key=>{
    const m = MODULE_META[key];
    return `
      <button type="button" class="module-card" data-enter-module="${key}">
        <div class="icon">${ICONS[m.icon]}</div>
        <h3>${m.name}</h3>
        <p>${m.tagline}</p>
      </button>`;
  }).join('') || `<div class="empty-state">${ICONS.lock}<div class="msg">No modules available</div><div class="sub">This role doesn't have access to any module yet. Your assigned role has no workspaces enabled.</div></div>`;
  document.getElementById('view-launcher').innerHTML = `
    <div class="module-launcher">
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:4px;">Logged in as <strong>${escapeHtml((STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name||'')}</strong> — viewing as <strong>${escapeHtml(currentRole().name)}</strong></div>
      <div class="module-grid">${cardsHtml}</div>
    </div>
  `;
  document.querySelectorAll('[data-enter-module]').forEach(el=>{
    el.addEventListener('click', ()=> enterModule(el.dataset.enterModule));
  });
}

function enterModule(key){
  if(!can(MODULE_META[key].ability)){ toast("This role doesn't have access to that module.", true); showLauncher(); return; }
  ACTIVE_MODULE = key;
  document.getElementById('moduleSwitchBar').style.display = '';
  const activeModuleName = document.getElementById('activeModuleName');
  activeModuleName.textContent = MODULE_META[key].name;
  const dashboardModule = key==='fleet' || key==='drone' || key==='k9';
  activeModuleName.style.cursor = dashboardModule ? 'pointer' : '';
  activeModuleName.title = key==='fleet' ? 'Open Fleet Dashboard' : (key==='drone' ? 'Open Drone Dashboard' : (key==='k9' ? 'Open K9 Dashboard' : ''));
  activeModuleName.onclick = key==='fleet' ? ()=>FLEET.switchView('fleet-dashboard') : (key==='drone' ? ()=>DRONE.switchView('drone-dashboard') : (key==='k9' ? ()=>K9.switchView('k9-dashboard') : null));
  document.getElementById('qmTenantFooter').style.display = key==='qm' ? '' : 'none';
  document.getElementById('defaultFooter').style.display = key==='qm' ? 'none' : '';
  document.getElementById('navSeparator').style.display = '';
  if(key==='qm') QM.start();
  else if(key==='fleet') FLEET.start();
  else if(key==='personnel') PM.start();
  else if(key==='k9') K9.start();
  else if(key==='drone') DRONE.start();
  else if(key==='eod') EOD.start();
  else if(key==='subpoena') SUBPOENA.start();
  else if(key==='grants') GRANTS.start();
  else if(key==='civil') CIVIL.start();
}

/* =========================================================================
   SHARED ROLE SWITCHER
   ========================================================================= */
function renderModuleGate(){
  // called after an ability change affecting the currently-active role, to react live
  if(ACTIVE_MODULE && !can(MODULE_META[ACTIVE_MODULE].ability)){
    toast("This role no longer has access to that module.", true);
    showLauncher();
  }
}

function roleSwitcherSummary(){
  const ids = STATE.currentRoleIds || [];
  if(ids.length===0) return '—';
  if(ids.length===1) return roleName(ids[0]);
  return `${ids.length} roles`;
}

function authoritativeRoleAdmin(){
  return (HOME_ROLE_IDS||[]).some(id=>['role_admin','role_platform_admin'].includes(id));
}

function renderRoleSwitcher(){
  const btn = document.getElementById('btnRoleSwitcher');
  const loggedInEl = document.getElementById('loggedInAs');
  const label = document.getElementById('roleSwitcherLabel');
  const person = STATE.personnel.find(p=>p.id===CURRENT_USER_ID);
  const allowed = authoritativeRoleAdmin();
  loggedInEl.textContent = person ? `Logged in as ${person.name}` : '';
  if(label) label.style.display = allowed ? '' : 'none';
  btn.style.display = allowed ? '' : 'none';
  if(!allowed){
    const panel = document.getElementById('roleSwitcherPanel');
    if(panel) panel.style.display='none';
    return;
  }
  btn.textContent = roleSwitcherSummary();
  document.getElementById('abilityCountPill').textContent = countAbilities(currentRole())+" abilities";

  btn.onclick = (e)=>{
    e.stopPropagation();
    const panel = document.getElementById('roleSwitcherPanel');
    if(panel.style.display==='none' || !panel.innerHTML){ renderRoleSwitcherPanel(); panel.style.display=''; }
    else { panel.style.display = 'none'; }
  };
}

function renderRoleSwitcherPanel(){
  const panel = document.getElementById('roleSwitcherPanel');
  if(!authoritativeRoleAdmin()){
    panel.innerHTML='';
    panel.style.display='none';
    return;
  }
  const active = STATE.currentRoleIds || [];
  panel.innerHTML = `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-weight:800;color:var(--heading);font-size:12.5px;">Viewing as (select one or more)</div>
    <div style="padding:8px 14px;">
      ${STATE.roles.filter(r=>!r.hidden || loggedInPersonHasRole(r.id)).map(r=>`
        <label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;cursor:pointer;">
          <input type="checkbox" class="roleSwitcherCheck" value="${r.id}" ${active.includes(r.id)?'checked':''} style="width:auto;">
          ${escapeHtml(r.name)}
        </label>
      `).join('')}
    </div>
    <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
      <button class="btn btn-sm btn-primary" id="btnApplyRoleSwitch">Apply</button>
    </div>
  `;
  document.getElementById('btnApplyRoleSwitch').addEventListener('click', ()=>{
    const chosen = Array.from(document.querySelectorAll('.roleSwitcherCheck:checked')).map(el=>el.value);
    if(chosen.length===0){ toast("Select at least one role.", true); return; }
    STATE.currentRoleIds = chosen;
    document.getElementById('roleSwitcherPanel').style.display = 'none';
    renderRoleSwitcher();
    renderSuiteNav();
    const SHARED_VIEW_ABILITY = { roles:'admin_roles', personnel:'personnel_view', fieldlabels:'manage_field_labels', branding:'manage_branding',
      audit: ()=>can('qm_admin_audit')||can('fleet_admin_audit')||can('pm_admin_audit')||can('k9_admin_audit')||can('drone_admin_audit')||can('eod_admin_audit')||can('subpoena_admin_audit')||can('grants_admin_audit')||can('civil_admin_audit') };
    if(ACTIVE_MODULE && !can(MODULE_META[ACTIVE_MODULE].ability)){
      toast("Switched to a role combination without access to this module.");
      showLauncher();
    } else if(ACTIVE_MODULE==='qm'){ QM.start(); }
    else if(ACTIVE_MODULE==='fleet'){ FLEET.start(); }
    else if(ACTIVE_MODULE==='personnel'){ PM.start(); }
    else if(ACTIVE_MODULE==='k9'){ K9.start(); }
    else if(ACTIVE_MODULE==='drone'){ DRONE.start(); }
    else if(ACTIVE_MODULE==='eod'){ EOD.start(); }
    else if(ACTIVE_MODULE==='subpoena'){ SUBPOENA.start(); }
    else if(ACTIVE_MODULE==='grants'){ GRANTS.start(); }
    else if(ACTIVE_MODULE==='civil'){ CIVIL.start(); }
    else if(ACTIVE_SHARED_VIEW){
      const req = SHARED_VIEW_ABILITY[ACTIVE_SHARED_VIEW];
      const stillAllowed = typeof req==='function' ? req() : can(req);
      if(!stillAllowed){
        toast("Switched to a role combination without access to this screen.");
        showLauncher();
      } else {
        if(ACTIVE_SHARED_VIEW==='personnel') renderPersonnel();
        else if(ACTIVE_SHARED_VIEW==='roles') renderRoles();
        else if(ACTIVE_SHARED_VIEW==='audit') renderPlatformAuditLogTab(document.getElementById('view-audit'));
        else if(ACTIVE_SHARED_VIEW==='fieldlabels') renderFieldLabelsAdmin();
        else if(ACTIVE_SHARED_VIEW==='branding') renderBrandingAdmin();
      }
    }
    else { showLauncher(); }
    renderNotifBell();
  });
}
document.addEventListener('click', (e)=>{
  const panel = document.getElementById('roleSwitcherPanel');
  if(panel && panel.style.display!=='none' && !panel.contains(e.target) && e.target.id!=='btnRoleSwitcher'){
    panel.style.display = 'none';
  }
});

/* =========================================================================
   SHARED NOTIFICATION BELL (aggregates both modules)
   ========================================================================= */
function renderNotifBell(){
  function safely(label, fn){ try{ return fn(); }catch(e){ console.error(`renderNotifBell: "${label}" failed (skipping):`, e); return []; } }
  safely('QM.recalcNotifications', ()=>QM.recalcNotifications());
  safely('FLEET.recalcNotifications', ()=>FLEET.recalcNotifications());
  safely('PM.recalcNotifications', ()=>PM.recalcNotifications());
  safely('K9.recalcNotifications', ()=>K9.recalcNotifications());
  safely('DRONE.recalcNotifications', ()=>DRONE.recalcNotifications());
  safely('EOD.recalcNotifications', ()=>EOD.recalcNotifications());
  safely('SUBPOENA.recalcNotifications', ()=>SUBPOENA.recalcNotifications());
  safely('GRANTS.recalcNotifications', ()=>GRANTS.recalcNotifications());
  safely('CIVIL.recalcNotifications', ()=>CIVIL.recalcNotifications());
  const mine = [
    ...safely('qm notifications', ()=>STATE.qm.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Quartermaster'}))),
    ...safely('fleet notifications', ()=>STATE.fleet.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Fleet'}))),
    ...safely('pm notifications', ()=>STATE.pm.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Personnel'}))),
    ...safely('k9 notifications', ()=>STATE.k9.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'K9'}))),
    ...safely('drone notifications', ()=>STATE.drone.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Drone'}))),
    ...safely('eod notifications', ()=>STATE.eod.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'EOD'}))),
    ...safely('subpoena notifications', ()=>STATE.subpoena.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Subpoena'}))),
    ...safely('grants notifications', ()=>STATE.grants.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Grants'}))),
    ...safely('civil notifications', ()=>STATE.civil.notifications.filter(n=>STATE.currentRoleIds.includes(n.recipientRoleId)).map(n=>({...n, module:'Civil'}))),
  ];
  const isRead = n=>(n.readBy||[]).includes(CURRENT_USER_ID) || (typeof SuiteStore!=='undefined' && SuiteStore.isNotificationRead(n.module,n.id));
  const unread = mine.filter(n=>!isRead(n)).length;
  const badge = document.getElementById('notifBadge');
  badge.style.display = unread ? '' : 'none';
  badge.textContent = unread>9 ? '9+' : String(unread);
  window.__SUITE_NOTIFS = mine;
}
function toggleNotifPanel(){
  const panel = document.getElementById('notifPanel');
  if(panel.style.display==='none' || !panel.innerHTML){
    renderNotifPanel();
    panel.style.display = '';
  } else {
    panel.style.display = 'none';
  }
}
function renderNotifPanel(){
  const panel = document.getElementById('notifPanel');
  const all = window.__SUITE_NOTIFS||[];
  const mine = all.filter(n=>!(n.readBy||[]).includes(CURRENT_USER_ID) && !SuiteStore.isNotificationRead(n.module,n.id));
  const rows = mine.map(n=>`
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
  document.getElementById('btnNotifClose').addEventListener('click', ()=>{ panel.style.display='none'; });
  document.querySelectorAll('[data-mark-read]').forEach(b=>b.addEventListener('click', async ()=>{
    const [mod, id] = b.dataset.markRead.split('|');
    b.disabled=true;
    if(!await SuiteStore.markNotificationsRead([{module:mod,id}])){toast('Could not save the read status. Try again when connected.',true);b.disabled=false;return;}
    renderNotifBell();
    renderNotifPanel();
  }));
  const markAll = document.getElementById('btnMarkAllRead');
  if(markAll) markAll.addEventListener('click', async ()=>{
    markAll.disabled=true;
    if(!await SuiteStore.markNotificationsRead(mine.map(n=>({module:n.module,id:n.id})))){toast('Some read statuses could not be saved. Try again when connected.',true);markAll.disabled=false;return;}
    renderNotifBell();
    renderNotifPanel();
  });
}

/* =========================================================================
   SHELL STARTUP
   ========================================================================= */
function startShell(){
  if((!Array.isArray(STATE.currentRoleIds) || STATE.currentRoleIds.length===0) && Array.isArray(HOME_ROLE_IDS) && HOME_ROLE_IDS.length){
    STATE.currentRoleIds = [...HOME_ROLE_IDS];
  }
  applyAgencyBranding();
  renderRoleSwitcher();
  renderSuiteNav();
  showLauncher();
  document.getElementById('btnSwitchModule').addEventListener('click', showLauncher);
  document.getElementById('btnResetDemo').addEventListener('click', resetDemoData);
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnChangePassword').addEventListener('click', openChangePasswordModal);
  document.getElementById('btnNotifBell').addEventListener('click', (e)=>{ e.stopPropagation(); toggleNotifPanel(); });
  document.addEventListener('click', (e)=>{
    const panel = document.getElementById('notifPanel');
    if(panel.style.display!=='none' && !panel.contains(e.target) && e.target.id!=='btnNotifBell'){
      panel.style.display = 'none';
    }
  });
  renderNotifBell();
}

