/* Multi-tenant platform control plane. Agency records remain in SuiteStore. */
const TenantPlatform=(()=>{
  const CATALOG_KEY='pss.platform.catalog.v1';
  const CONTEXT_KEY='pss.platform.context.v1';
  const MODULE_KEYS=['qm','fleet','personnel','scheduling','k9','drone','eod','subpoena','grants','civil','permits'];
  const MODULE_LABELS={qm:'Quartermaster',fleet:'Fleet',personnel:'Personnel',scheduling:'Scheduling',k9:'K9',drone:'UAS',eod:'EOD',subpoena:'Subpoenas',grants:'Grants & Forfeiture',civil:'Civil Process',permits:'Licensing & Permits'};
  const STATUS_LABELS={provisioning:'Provisioning',setup:'Setup',active:'Active',suspended:'Suspended'};
  let catalog=null,current=null,wizard=null,detailTenantId=null;
  const esc=s=>escapeHtml(s??'');
  const uuid=prefix=>prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now=()=>new Date().toISOString();
  async function platformApi(action,payload={}){
    const res=await SuiteStore.api('/tenant-admin',{method:'POST',body:JSON.stringify({action,...payload})});
    if(res?.success===false) throw Error(res.error||'Platform administration request failed.');
    return res?.data??res;
  }
  async function identityPlatformApi(action,payload={}){
    const res=await SuiteStore.api('/identity-admin',{method:'POST',body:JSON.stringify({action,...payload})});
    if(res?.success===false) throw Error(res.error||'Identity administration request failed.');
    return res?.data??res;
  }
  async function registerAgencySubdomain(payload={}){
    const token=sessionStorage.getItem('sonomarzi.aws.id_token');
    if(!token) throw Error('Your secure sign-in session is not available. Sign in again and retry.');
    const res=await fetch('https://7debzkoq7k.execute-api.us-east-2.amazonaws.com/identity-admin',{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({action:'register_subdomain',...payload})
    });
    const text=await res.text();
    let body={};
    try{body=text?JSON.parse(text):{}}catch{body={raw:text}}
    if(!res.ok||body?.success===false) throw Error(body?.error||body?.message||`Agency URL registration failed (${res.status}).`);
    return body?.data??body;
  }
  const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const put=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('Tenant settings could not be saved on this device.',true)}};
  function seedCatalog(){return {version:1,tenants:[{id:'tenant_demo',slug:'reno-public-safety',name:'Reno Public Safety',timezone:'America/Los_Angeles',status:'active',plan:'Enterprise',enabledModules:[...MODULE_KEYS],createdAt:now(),updatedAt:now(),agencies:[{id:'agency_reno',name:'Reno Police Department',abbreviation:'RPD',type:'Municipal Police',ori:'NV0160100',status:'active',branding:{title:'Reno Public Safety Management Suite',subtitle:'Operational readiness in one workspace'}}],admins:[{id:'admin_fred',personId:'p9',name:'Fred Marziano',email:'fred.marziano@mark43.com',roleIds:['role_admin','role_platform_admin'],status:'active'}],invites:[],regionalWorkspaces:[],supportSessions:[],audit:[{id:uuid('ta'),at:now(),actor:'Platform bootstrap',action:'Tenant activated'}]}],current:{tenantId:'tenant_demo',agencyId:'agency_reno'}};}
  function load(){catalog=stored(CATALOG_KEY,null)||seedCatalog();current=stored(CONTEXT_KEY,null)||catalog.current||{tenantId:catalog.tenants[0]?.id,agencyId:catalog.tenants[0]?.agencies[0]?.id};normalize();save();}
  function normalize(){catalog.tenants=Array.isArray(catalog.tenants)?catalog.tenants:[];for(const t of catalog.tenants){t.enabledModules=t.enabledModules||[];t.mfaPolicy=['off','admins','all_users'].includes(t.mfaPolicy)?t.mfaPolicy:'off';t.agencies=t.agencies||[];t.admins=t.admins||[];t.invites=t.invites||[];t.regionalWorkspaces=t.regionalWorkspaces||[];t.supportSessions=t.supportSessions||[];t.audit=t.audit||[];}if(!tenant(current?.tenantId)||!agency(current?.tenantId,current?.agencyId)){const t=catalog.tenants.find(t=>t.status!=='suspended')||catalog.tenants[0];current=t?{tenantId:t.id,agencyId:t.agencies[0]?.id}:null;}}
  function save(){catalog.current=current;put(CATALOG_KEY,catalog);put(CONTEXT_KEY,current);}
  function tenant(id=current?.tenantId){return catalog?.tenants.find(t=>t.id===id)}
  function agency(tenantId=current?.tenantId,agencyId=current?.agencyId){return tenant(tenantId)?.agencies.find(a=>a.id===agencyId)}
  function actualRoles(){return SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[])}
  function isPlatformAdmin(){return actualRoles().includes('role_platform_admin')}
  function isSystemAdmin(){return actualRoles().includes('role_admin')}
  function contexts(){if(isPlatformAdmin())return catalog.tenants.flatMap(t=>t.agencies.map(a=>({tenant:t,agency:a})));const memberships=currentPersonMemberships();return memberships.map(m=>({tenant:tenant(m.tenantId),agency:agency(m.tenantId,m.agencyId)})).filter(x=>x.tenant&&x.agency)}
  function currentPersonMemberships(){const p=STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID);return p?.tenantMemberships||[{tenantId:current.tenantId,agencyId:current.agencyId,roleIds:p?.roleIds||[]}];}
  function activeModules(){const t=tenant();return t?.enabledModules||[]}
  function moduleEnabled(key){
    // The tenant catalog behind this is only readable by admins (suite_list_contexts). For an
    // ordinary user it comes back empty, and treating that "I don't know" as "not licensed"
    // hides every module from them permanently, no matter what their role grants. Module
    // licensing is a vendor/billing concern, not the per-user security boundary -- that's the
    // role ability check, which is applied separately and is unaffected by this. So when the
    // catalog genuinely isn't available to this user, defer to their role instead of denying.
    const t = tenant();
    if(!t || !Array.isArray(t.enabledModules) || !t.enabledModules.length) return true;
    return t.enabledModules.includes(key)||(key==='scheduling'&&t.enabledModules.includes('personnel'));
  }
  function audit(t,action){t.audit.unshift({id:uuid('ta'),at:now(),actor:STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID)?.name||'Platform Admin',action});t.updatedAt=now();save();}
  function contextLabel(){const t=tenant(),a=agency();return a?`${a.abbreviation||a.name} · ${t?.name||''}`:'No agency selected'}
  function renderContext(){const host=document.getElementById('tenantContextHost');if(!host)return;const list=contexts();host.hidden=list.length<2&&!isPlatformAdmin();host.innerHTML=`<div style="position:relative"><button class="btn btn-outline btn-sm" id="tenantContextButton" aria-haspopup="menu" aria-expanded="false"><span class="tenant-context-name">${esc(contextLabel())}</span> ▾</button><div class="tenant-menu" id="tenantContextMenu" role="menu" hidden></div></div>`;const btn=host.querySelector('#tenantContextButton'),menu=host.querySelector('#tenantContextMenu');btn.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)renderMenu(menu)};}
  function renderMenu(menu){const list=contexts();menu.innerHTML='<div style="padding:9px 12px;font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Agency workspace</div>';for(const c of list){const b=document.createElement('button');b.className='tenant-option';b.role='menuitem';b.innerHTML=`<span><strong>${esc(c.agency.name)}</strong><small>${esc(c.tenant.name)} · ${esc(STATUS_LABELS[c.tenant.status])}</small></span><span class="check">${c.tenant.id===current.tenantId&&c.agency.id===current.agencyId?'✓':''}</span>`;b.disabled=c.tenant.status==='suspended';b.onclick=()=>switchContext(c.tenant.id,c.agency.id);menu.append(b)}if(isPlatformAdmin()){const manage=document.createElement('button');manage.className='tenant-option';manage.innerHTML='<span><strong>Tenant Management</strong><small>Provision and administer customers</small></span><span>→</span>';manage.onclick=showTenantManagement;menu.append(manage)}}
  async function switchContext(tenantId,agencyId){const t=tenant(tenantId),a=agency(tenantId,agencyId);if(!t||!a||t.status==='suspended'){toast('That tenant is not available.',true);return}if(!isPlatformAdmin()&&!currentPersonMemberships().some(m=>m.tenantId===tenantId&&m.agencyId===agencyId)){toast('You are not assigned to that agency.',true);return}if(!hasAccess(t,a)){toast('That agency membership is not active.',true);return}if(!SuiteUX.guard())return;const subdomain=(a.subdomain||'').trim().toLowerCase();if(SuiteStore.mode()==='shared'&&subdomain){const targetHost=`${subdomain}.sonomarzi.com`;if(location.hostname.toLowerCase()!==targetHost){location.assign(`https://${targetHost}/`);return}}try{if(SuiteStore.mode()==='shared')await SuiteStore.loadRemoteContext(tenantId,agencyId);else{if(!await SuiteStore.flush())throw Error('Save pending changes before switching agencies.');snapshotCurrent();let next=stored(workspaceKey(tenantId,agencyId),null);if(!next)next=await newAgencyState(t,a);await SuiteStore.adopt(next);STATE.currentRoleIds=[...actualRolesForContext(next)]}}catch(error){toast(error.message,true);return}current={tenantId,agencyId};save();applyAgencyBranding();renderRoleSwitcher();renderContext();renderBanner();try{history.replaceState({},'','#/agency/'+encodeURIComponent(t.slug));}catch{}SuiteUX.home();toast(`Switched to ${a.name}.`)}
  function hasAccess(t,a){return t.status==='active'||t.status==='setup'||isPlatformAdmin()}
  function actualRolesForContext(state){if(SuiteStore.mode()==='shared')return HOME_ROLE_IDS||[];return state.personnel?.find(p=>p.id===CURRENT_USER_ID)?.roleIds||['role_admin','role_platform_admin']}
  function workspaceKey(tid,aid){return `pss.workspace.${tid}.${aid}.v1`}
  function snapshotCurrent(){if(SuiteStore.mode()!=='local'||!current||!STATE)return;put(workspaceKey(current.tenantId,current.agencyId),STATE)}
  async function newAgencyState(t,a){const state=await buildSeedState();for(const [root,data] of Object.entries(state)){if(!['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil','permits'].includes(root)||!data||typeof data!=='object')continue;for(const [k,v] of Object.entries(data))if(Array.isArray(v)&&!['refData'].includes(k))data[k]=[];}
    const fred=state.personnel.find(p=>p.name==='Fred Marziano')||state.personnel[0];state.personnel=[fred];state.accounts=state.accounts.filter(ac=>ac.personId===fred.id);fred.roleIds=['role_admin','role_platform_admin'];state.currentRoleIds=[...fred.roleIds];state.agencyBranding={logoDataUrl:null,title:a.branding?.title||`${a.name} Public Safety Suite`,subtitle:a.branding?.subtitle||'Operational readiness in one workspace'};state.tenantContext={tenantId:t.id,agencyId:a.id,tenantName:t.name,agencyName:a.name,enabledModules:t.enabledModules};return state}
  function init(){load();const remote=SuiteStore.remoteContext?.();if(remote?.tenantId&&remote?.agencyId)current=remote;if(!document.getElementById('tenantContextHost')){const toolbar=document.querySelector('#topbar .role-switch');const host=document.createElement('div');host.id='tenantContextHost';host.className='tenant-switcher';toolbar.prepend(host)}if(!document.getElementById('tenantIdentityBanner')){const banner=document.createElement('div');banner.className='tenant-banner';banner.id='tenantIdentityBanner';document.getElementById('topbar').after(banner)}renderContext();renderBanner();if(!document.documentElement.dataset.tenantMenuBound){document.documentElement.dataset.tenantMenuBound='true';document.addEventListener('click',e=>{const menu=document.getElementById('tenantContextMenu');if(menu&&!e.target.closest('#tenantContextHost'))menu.hidden=true})}if(SuiteStore.mode()==='shared')refreshRemote().catch(e=>toast(e.message||'Tenant catalog could not be loaded.',true));}
  function renderBanner(){const b=document.getElementById('tenantIdentityBanner'),t=tenant(),a=agency();if(!b||!t||!a)return;b.innerHTML=`<strong>${esc(a.name)}</strong><span>${esc(t.name)}</span><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span>`}
  function refresh(){renderContext();renderBanner();}
  function showTenantManagement(){if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}const el=SuiteUX.showPlatformView?SuiteUX.showPlatformView('tenant-management','Tenant Management','Provision agencies, control modules, and manage tenant lifecycle'):null;if(!el){const target=document.getElementById('view-home');return}renderTenantList(el)}
  function renderTenantList(el){detailTenantId=null;const counts={active:catalog.tenants.filter(t=>t.status==='active').length,setup:catalog.tenants.filter(t=>['setup','provisioning'].includes(t.status)).length,suspended:catalog.tenants.filter(t=>t.status==='suspended').length,agencies:catalog.tenants.reduce((n,t)=>n+t.agencies.length,0)};el.innerHTML=`<div class="tenant-toolbar"><div><div class="work-eyebrow">Platform control plane</div><h2 style="margin:0;color:var(--heading)">Customer tenants</h2></div><div style="display:flex;gap:8px"><button class="btn btn-outline" id="platformAdmins">Platform Admins</button><button class="btn btn-outline" id="addAgencyExisting">Add agency</button><button class="btn btn-primary" id="createTenant">Create tenant</button></div></div><div class="tenant-summary"><div class="tenant-stat"><strong>${counts.active}</strong><span>Active tenants</span></div><div class="tenant-stat"><strong>${counts.setup}</strong><span>In setup</span></div><div class="tenant-stat"><strong>${counts.agencies}</strong><span>Total agencies</span></div><div class="tenant-stat"><strong>${counts.suspended}</strong><span>Suspended</span></div></div><div class="tenant-table-wrap"><table><thead><tr><th>Tenant</th><th>Status</th><th>Agencies</th><th>Modules</th><th>Plan</th><th></th></tr></thead><tbody>${catalog.tenants.map(t=>`<tr><td><div class="tenant-name">${esc(t.name)}</div><div class="tenant-slug">${esc(t.slug)}</div></td><td><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></td><td>${t.agencies.length}</td><td><div class="tenant-module-list">${t.enabledModules.slice(0,4).map(m=>`<span class="tenant-module">${esc(MODULE_LABELS[m])}</span>`).join('')}${t.enabledModules.length>4?`<span class="tenant-module">+${t.enabledModules.length-4}</span>`:''}</div></td><td>${esc(t.plan)}</td><td><button class="btn btn-outline btn-sm" data-open-tenant="${esc(t.id)}">Manage</button></td></tr>`).join('')}</tbody></table></div>`;el.querySelector('#platformAdmins').onclick=showPlatformAdmins;el.querySelector('#createTenant').onclick=()=>startWizard('tenant');el.querySelector('#addAgencyExisting').onclick=()=>startWizard('agency');el.querySelectorAll('[data-open-tenant]').forEach(b=>b.onclick=()=>showTenantDetail(b.dataset.openTenant))}
  function defaultWizard(kind){const baseTenant=tenant();return {kind,step:0,tenantId:kind==='agency'?baseTenant?.id:null,name:'',slug:'',timezone:'America/Los_Angeles',plan:'Enterprise',agencyName:'',abbreviation:'',agencyType:'Municipal Police',ori:'',subdomain:'',modules:kind==='agency'?[...(baseTenant?.enabledModules||MODULE_KEYS)]:[...MODULE_KEYS],template:'Standard Law Enforcement',adminName:'',adminEmail:'',importMode:'empty',status:'setup'}}
  function startWizard(kind){if(!isPlatformAdmin())return;wizard=defaultWizard(kind);renderWizard()}
  const STEPS=['Tenant','Agency','Modules','Template','Administrator','Data','Review'];
  function renderWizard(){const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><div><h3>${wizard.kind==='tenant'?'Create New Tenant':'Add Agency to Tenant'}</h3><div style="font-size:12px;color:var(--text-dim)">Guided onboarding · no code deployment required</div></div><button class="modal-close" id="wizardClose">×</button></div><div class="modal-body" style="padding:0"><div class="onboarding-shell"><aside class="onboarding-steps">${STEPS.map((s,i)=>`<div class="onboarding-step ${i===wizard.step?'active':i<wizard.step?'done':''}"><span class="num">${i<wizard.step?'✓':i+1}</span><span>${s}</span></div>`).join('')}</aside><main class="onboarding-main" id="wizardMain"></main></div></div>`;SuiteUX.openModal();box.querySelector('#wizardClose').onclick=e=>SuiteUX.closeModal(e);renderWizardStep()}
  function field(id,label,value,type='text',extra=''){return `<div class="form-row"><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`}
  function renderWizardStep(){const main=document.getElementById('wizardMain');let body='',title='',sub='';switch(wizard.step){case 0:title=wizard.kind==='tenant'?'Define the customer tenant':'Select the customer tenant';sub='The tenant is the customer boundary for licensing, lifecycle, and billing.';body=wizard.kind==='tenant'?`<div class="onboarding-fields">${field('wTenantName','Customer or tenant name',wizard.name)}${field('wTenantSlug','Tenant URL identifier',wizard.slug,'text','pattern="[a-z0-9-]+"')}${field('wTimezone','Time zone',wizard.timezone)}<div class="form-row"><label for="wPlan">Subscription plan</label><select id="wPlan"><option>Enterprise</option><option>Professional</option><option>Pilot</option></select></div></div>`:`<div class="form-row"><label for="wExistingTenant">Existing tenant</label><select id="wExistingTenant">${catalog.tenants.filter(t=>t.status!=='suspended').map(t=>`<option value="${t.id}" ${t.id===wizard.tenantId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>`;break;case 1:title='Add the first agency';sub='An agency is the operational data boundary within the tenant.';body=`<div class="onboarding-fields">${field('wAgencyName','Agency name',wizard.agencyName)}${field('wAbbreviation','Abbreviation',wizard.abbreviation)}<div class="form-row"><label for="wAgencyType">Agency type</label><select id="wAgencyType">${['Municipal Police','Sheriff’s Office','Fire / EMS','Regional Authority','Prosecutor','Other Public Safety'].map(x=>`<option ${x===wizard.agencyType?'selected':''}>${x}</option>`).join('')}</select></div>${field('wOri','ORI or agency identifier',wizard.ori)}${field('wSubdomain','Agency URL',wizard.subdomain,'text','placeholder="agencyname" pattern="[a-z0-9-]+"')}<div style="font-size:12px;color:var(--text-dim);margin-top:-8px">This agency will use <strong>${esc(wizard.subdomain||'agencyname')}.sonomarzi.com</strong>.</div></div>`;break;case 2:title='Enable licensed modules';sub='Users see only modules that are enabled here and allowed by their roles.';body=`<div class="module-select-grid">${MODULE_KEYS.map(k=>`<label class="module-choice"><input type="checkbox" data-module="${k}" ${wizard.modules.includes(k)?'checked':''}><span><strong>${MODULE_LABELS[k]}</strong><span>${esc(MODULE_META[k].tagline)}</span></span></label>`).join('')}</div>`;break;case 3:title='Apply a configuration template';sub='Templates establish reference values and baseline workflows. Agency administrators can refine them later.';body=`<div class="onboarding-fields"><div class="form-row full"><label for="wTemplate">Starting template</label><select id="wTemplate">${['Standard Law Enforcement','Sheriff / Countywide','Regional Multi-Agency','Fire / EMS','Blank Configuration'].map(x=>`<option ${x===wizard.template?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="setup-checklist" style="margin-top:18px"><div class="setup-check">${ICONS.check}<span>Standard roles and abilities</span></div><div class="setup-check">${ICONS.check}<span>Module reference lists and notification routes</span></div><div class="setup-check">${ICONS.check}<span>Agency branding defaults and audit controls</span></div></div>`;break;case 4:title='Invite the agency System Admin';sub='The first agency administrator can configure this agency but cannot enter other tenants.';body=`<div class="onboarding-fields">${field('wAdminName','Administrator name',wizard.adminName)}${field('wAdminEmail','Government email',wizard.adminEmail,'email')}</div><div class="callout callout-blue" style="margin-top:18px">The invitation creates an agency-scoped System Admin membership. Platform Admin access cannot be granted from this workflow.</div>`;break;case 5:title='Choose the initial data path';sub='Start empty or prepare a validated import after tenant creation.';body=`<div class="module-select-grid"><label class="module-choice"><input type="radio" name="importMode" value="empty" ${wizard.importMode==='empty'?'checked':''}><span><strong>Start empty</strong><span>Use the selected template and enter data through the application.</span></span></label><label class="module-choice"><input type="radio" name="importMode" value="import" ${wizard.importMode==='import'?'checked':''}><span><strong>Prepare validated import</strong><span>Create the tenant now and hold activation until an import is verified.</span></span></label></div>`;break;case 6:title='Review and create';sub='The new tenant begins in Setup so Platform and Agency administrators can validate it before activation.';body=`<div class="review-grid"><div class="review-card"><h3>Tenant</h3><p><strong>${esc(wizard.kind==='tenant'?wizard.name:tenant(wizard.tenantId)?.name)}</strong></p><p>${esc(wizard.kind==='tenant'?wizard.slug:tenant(wizard.tenantId)?.slug)}</p><p>${esc(wizard.kind==='tenant'?wizard.timezone:tenant(wizard.tenantId)?.timezone)}</p></div><div class="review-card"><h3>Agency</h3><p><strong>${esc(wizard.agencyName)}</strong> (${esc(wizard.abbreviation)})</p><p>${esc(wizard.agencyType)}</p><p>${esc(wizard.ori||'No identifier provided')}</p><p><strong>URL:</strong> ${esc(wizard.subdomain)}.sonomarzi.com</p></div><div class="review-card"><h3>Modules</h3><p>${wizard.modules.map(m=>esc(MODULE_LABELS[m])).join(', ')}</p></div><div class="review-card"><h3>Administrator</h3><p>${esc(wizard.adminName)}</p><p>${esc(wizard.adminEmail)}</p><p>System Admin · Invitation pending</p></div></div>`;}
    main.innerHTML=`<h2>${title}</h2><div class="sub">${sub}</div>${body}<div id="wizardError" class="field-error" role="alert" style="margin-top:14px"></div><div class="onboarding-actions"><button class="btn btn-outline" id="wizardBack" ${wizard.step===0?'disabled':''}>Back</button><button class="btn btn-primary" id="wizardNext">${wizard.step===6?'Create tenant':'Continue'}</button></div>`;main.querySelector('#wizardBack').onclick=()=>{captureStep();wizard.step--;renderWizard()};main.querySelector('#wizardNext').onclick=async()=>{if(!captureStep(true))return;if(wizard.step<6){wizard.step++;renderWizard();}else await provision()};SuiteUX.enhance()}
  function captureStep(validate=false){const value=id=>document.getElementById(id)?.value.trim();const error=msg=>{const e=document.getElementById('wizardError');if(e)e.textContent=msg;return false};switch(wizard.step){case 0:if(wizard.kind==='tenant'){wizard.name=value('wTenantName');wizard.slug=value('wTenantSlug').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');wizard.timezone=value('wTimezone');wizard.plan=document.getElementById('wPlan')?.value||wizard.plan;if(validate&&(!wizard.name||wizard.slug.length<3||!wizard.timezone))return error('Enter a tenant name, URL identifier, and time zone.');if(validate&&catalog.tenants.some(t=>t.slug===wizard.slug))return error('That internal tenant key is already in use.')}else{wizard.tenantId=document.getElementById('wExistingTenant')?.value;if(validate&&!wizard.tenantId)return error('Select a tenant.')}break;case 1:wizard.agencyName=value('wAgencyName');wizard.abbreviation=value('wAbbreviation').toUpperCase();wizard.agencyType=document.getElementById('wAgencyType')?.value||wizard.agencyType;wizard.ori=value('wOri');wizard.subdomain=(value('wSubdomain')||'').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(validate&&(!wizard.agencyName||!wizard.abbreviation||!wizard.subdomain))return error('Enter an agency name, abbreviation, and agency URL.');if(validate&&(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(wizard.subdomain)||['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(wizard.subdomain)))return error('Choose a valid, non-reserved agency URL using lowercase letters, numbers, and hyphens.');if(validate&&catalog.tenants.some(t=>t.agencies.some(a=>(a.subdomain||'').toLowerCase()===wizard.subdomain)))return error('That agency URL is already in use.');{const t=wizard.kind==='tenant'?null:tenant(wizard.tenantId);if(validate&&t?.agencies.some(a=>a.name.toLowerCase()===wizard.agencyName.toLowerCase()))return error('That agency already exists in this tenant.')}break;case 2:wizard.modules=[...document.querySelectorAll('[data-module]:checked')].map(x=>x.dataset.module);if(validate&&!wizard.modules.length)return error('Enable at least one module.');break;case 3:wizard.template=document.getElementById('wTemplate')?.value||wizard.template;break;case 4:wizard.adminName=value('wAdminName');wizard.adminEmail=value('wAdminEmail').toLowerCase();if(validate&&(!wizard.adminName||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wizard.adminEmail)))return error('Enter the administrator’s name and a valid email address.');break;case 5:wizard.importMode=document.querySelector('[name=importMode]:checked')?.value||'empty';}return true}
  async function provision(){const next=document.getElementById('wizardNext');next.disabled=true;next.textContent='Creating…';try{let result;if(SuiteStore.mode()==='shared')result=await provisionRemote();else result=await provisionLocal();SuiteUX.clearDirty();SuiteUX.closeModal();toast(`${result.agency.name} created in Setup.${wizard.adminEmail?' Secure administrator activation email requested.':''}`);showTenantDetail(result.tenant.id)}catch(e){next.disabled=false;next.textContent='Create tenant';document.getElementById('wizardError').textContent=e.message||'Tenant creation failed.'}}
  async function provisionLocal(){let t;if(wizard.kind==='tenant'){t={id:uuid('tenant'),slug:wizard.slug,name:wizard.name,timezone:wizard.timezone,status:'setup',plan:wizard.plan,enabledModules:[...wizard.modules],createdAt:now(),updatedAt:now(),agencies:[],admins:[],invites:[],regionalWorkspaces:[],supportSessions:[],audit:[]};catalog.tenants.push(t)}else{t=tenant(wizard.tenantId);t.enabledModules=[...new Set([...t.enabledModules,...wizard.modules])]}
    const a={id:uuid('agency'),name:wizard.agencyName,abbreviation:wizard.abbreviation,type:wizard.agencyType,ori:wizard.ori,subdomain:wizard.subdomain,status:'setup',branding:{title:`${wizard.agencyName} Public Safety Suite`,subtitle:'Operational readiness in one workspace'}};t.agencies.push(a);t.invites.push({id:uuid('invite'),agencyId:a.id,name:wizard.adminName,email:wizard.adminEmail,roleIds:['role_admin'],status:'pending',createdAt:now()});audit(t,`Created ${a.name} in ${t.name}; System Admin invitation queued for ${wizard.adminEmail}`);const state=await newAgencyState(t,a);state.tenantContext={tenantId:t.id,agencyId:a.id,tenantName:t.name,agencyName:a.name,enabledModules:wizard.modules,template:wizard.template,importMode:wizard.importMode};put(workspaceKey(t.id,a.id),state);save();return {tenant:t,agency:a}}
  async function provisionRemote(){
    const templateState=await buildSeedState();
    templateState.accounts=[];templateState.personnel=[];templateState.currentRoleIds=[];templateState.auditLog=[];
    for(const root of ['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil'])for(const [k,v] of Object.entries(templateState[root]||{}))if(Array.isArray(v)&&k!=='refData')templateState[root][k]=[];
    for(const root of ['qm','fleet','pm'])if(templateState[root]?.refData?.agencies)templateState[root].refData.agencies=[wizard.agencyName];
    const data=await platformApi(wizard.kind==='tenant'?'create_tenant':'add_agency',{tenantId:wizard.tenantId,tenant:{name:wizard.name,slug:wizard.slug,timezone:wizard.timezone,plan:wizard.plan},agency:{name:wizard.agencyName,abbreviation:wizard.abbreviation,type:wizard.agencyType,ori:wizard.ori,subdomain:wizard.subdomain},enabledModules:wizard.modules,template:wizard.template,templateState,importMode:wizard.importMode});
    await registerAgencySubdomain({tenantId:data.tenantId,agencyId:data.agencyId,subdomain:wizard.subdomain});
    if(wizard.adminName&&wizard.adminEmail){
      const invite=await SuiteStore.api('/identity-admin',{method:'POST',body:JSON.stringify({action:'invite_user',tenantId:data.tenantId,agencyId:data.agencyId,name:wizard.adminName,email:wizard.adminEmail,roleIds:['role_admin']})});
    }
    await refreshRemote();
    return {tenant:tenant(data.tenantId),agency:agency(data.tenantId,data.agencyId)};
  }
  async function refreshRemote(){
    if(SuiteStore.mode()!=='shared')return;
    const data=await platformApi('list_contexts',{currentTenantId:current?.tenantId||null,currentAgencyId:current?.agencyId||null});
    catalog={version:1,tenants:data.tenants||[],current:data.current||current};
    current=data.current||current;normalize();save();refresh();
  }
  async function insertSampleData(tenantId, agencyId, enabledModules, button){
    if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}
    if(!confirm('Add sample equipment, vehicles, civil papers, and training courses to this agency? Nothing will be assigned to any specific person. This writes directly to the live agency.')) return;
    if(button){button.disabled=true;button.textContent='Adding sample data…';}
    try{
      // Read this SPECIFIC tenant/agency's current data directly, rather than assuming it
      // matches whatever the admin's own active session happens to be signed into. Platform
      // Admins routinely view a different tenant than their own -- using the admin's local
      // STATE here would silently write sample data into the wrong agency, the exact class of
      // bug found and reverted earlier tonight in the invite flow.
      const data = await SuiteStore.api(`/workspace?tenantId=${encodeURIComponent(tenantId)}&agencyId=${encodeURIComponent(agencyId)}`);
      const versions = {}; const existing = {};
      for(const r of data.records){ versions[r.key] = r.version; existing[r.key] = r.value; }
      const patches = [];
      const addRecord = (path, id, value) => {
        const key = JSON.stringify([path, id]);
        patches.push({ key, value, deleted: false, expected_version: versions[key] || 0 });
      };
      // Merges new ids into whatever this collection's existing $order list already contains,
      // rather than replacing it -- overwriting it outright would silently delete every
      // existing equipment item, vehicle, paper, or course this agency already had.
      const addOrder = (path, newIds) => {
        const key = JSON.stringify([path, '$order']);
        const current = Array.isArray(existing[key]) ? existing[key] : [];
        patches.push({ key, value: [...current, ...newIds.filter(id=>!current.includes(id))], deleted: false, expected_version: versions[key] || 0 });
      };

      const stamp = Date.now();
      const added = [];

      if(enabledModules.includes('qm')){
        const eqItems = [
          ["Aegis II Ballistic Vest - Size M","Body Armor","Good","Main Armory",680],
          ["Glock 22 Duty Sidearm","Firearms","Good","Main Armory",520],
          ["Motorola APX 8000 Radio","Radios & Electronics","Good","Patrol Division Cage",5200],
          ["Body-Worn Camera","Radios & Electronics","New","Patrol Division Cage",699],
          ["IFAK Trauma Kit","Medical / Trauma","Good","Supply Room B",120],
          ["Duty Belt - Nylon","Duty Gear","Good","Supply Room B",145],
          ["Patrol Uniform Set (2)","Uniforms","Good","Supply Room B",180],
          ["TASER 10 CEW","Less-Lethal","Good","Patrol Division Cage",1650],
        ];
        const eqIds = eqItems.map((it,i)=>{
          const id = 'sample_eq'+stamp+i;
          addRecord(['qm','equipment'], id, {
            id, assetId:'QM-S'+(1000+i), name:it[0], category:it[1], condition:it[2], location:it[3],
            value:it[4], purchaseDate: fmt(new Date()), inServiceDate: fmt(new Date()), replacementDate: null,
            serialNumber:null, manufacturer:null, model:null, equipmentType:'Tool / Kit', vendorId:null,
            agency: agencyId, ownershipType:'Agency', personalWeaponAuth:null, isSharedAsset:false,
            isConsumable:false, quantity:1, minQuantity:null,
            status:'Available', assignedTo:null, assignedToType:null, disposal:null,
            notes:'Sample record for demo/testing purposes.',
          });
          return id;
        });
        addOrder(['qm','equipment'], eqIds);
        added.push(`${eqIds.length} equipment item(s)`);
      }

      if(enabledModules.includes('fleet')){
        const vehItems = [
          ["Sample Unit 90","Ford","Police Interceptor Utility",2023,"Patrol SUV",5000,"Unleaded"],
          ["Sample Unit 91","Dodge","Charger Pursuit",2022,"Patrol Sedan",12000,"Unleaded"],
          ["Sample Moto 90","Harley-Davidson","Road King Police",2023,"Motorcycle",1500,"Unleaded"],
          ["Sample Admin 90","Chevrolet","Impala",2020,"Administrative Sedan",30000,"Unleaded"],
        ];
        const vehIds = vehItems.map((it,i)=>{
          const id = 'sample_veh'+stamp+i;
          addRecord(['fleet','vehicles'], id, {
            id, unitNumber:it[0], make:it[1], model:it[2], year:it[3],
            vin: 'SAMPLE'+String(stamp).slice(-8)+i, licensePlate:'SAMP-'+(100+i),
            vehicleType:it[4], status:'In Service', mileage:it[5], fuelType:it[6],
            currentFuelLevel:80, purchaseDate: fmt(new Date()), inServiceDate: fmt(new Date()),
            agency: agencyId, location:'Main Fleet Garage', isSharedAsset:false,
            assignedToType:null, assignedTo:null,
            equipmentChecklist:[], photoDataUrl:null, notes:'Sample record for demo/testing purposes.', disposal:null,
          });
          return id;
        });
        addOrder(['fleet','vehicles'], vehIds);
        added.push(`${vehIds.length} vehicle(s)`);
      }

      if(enabledModules.includes('civil')){
        const paperItems = [
          ["SAMPLE-CV-0001","Sample Superior Court","Summons & Complaint","Sample Plaintiff LLC","Sample Defendant"],
          ["SAMPLE-CV-0002","Sample Superior Court","Writ of Garnishment","Sample Creditor Inc.","Sample Debtor"],
          ["SAMPLE-SC-0001","Sample Justice Court","Small Claims","Sample Claimant","Sample Respondent"],
        ];
        const paperIds = paperItems.map((it,i)=>{
          const id = 'sample_cp'+stamp+i;
          addRecord(['civil','papers'], id, {
            id, caseNumber:it[0], courtOfOrigin:it[1], paperType:it[2], plaintiff:it[3], defendant:it[4], attorneyOfRecord:'',
            priority:'Standard', receivedDate: fmt(new Date()), returnByDate: fmt(addDays(new Date(),21)),
            serviceAddresses:[], assignedServerId:null, stage:'Unassigned',
            serviceMethod:null, attempts:[], servedDate:null, servedTime:null, servedOnName:null,
            feeLineItems:[], feePayments:[], deposits:[], mileage:0, returnFiledDate:null, generatedDocuments:[],
            photos:[], safetyFlags:[], additionalPlaintiffs:[], additionalDefendants:[], witnesses:[],
            fieldHistory:[], notes:'Sample record for demo/testing purposes.',
          });
          return id;
        });
        addOrder(['civil','papers'], paperIds);
        added.push(`${paperIds.length} civil paper(s)`);
      }

      if(enabledModules.includes('personnel')){
        const courseItems = [
          ["Sample Training Course: Radio Procedures","Technology / RMS","Recommended"],
          ["Sample Training Course: De-escalation Techniques","Specialty / Tactical","Recommended"],
        ];
        const courseIds = courseItems.map((it,i)=>{
          const id = 'sample_crs'+stamp+i;
          addRecord(['pm','trainingCourses'], id, {
            id, name:it[0], category:it[1], classification:it[2], isRequired:false, recertRequired:false, recertIntervalMonths:null,
          });
          return id;
        });
        addOrder(['pm','trainingCourses'], courseIds);
        // A couple of scheduled sessions for those courses -- empty roster, no attendees signed
        // up, no instructor named, so nothing here is tied to any specific person either.
        const sessionIds = courseIds.map((courseId,i)=>{
          const id = 'sample_sess'+stamp+i;
          addRecord(['pm','trainingSessions'], id, {
            id, courseId, instructorId:null, location:'TBD',
            date: fmt(addDays(new Date(), 14+i*7)), startTime:'09:00', endTime:'12:00', capacity:20,
            status:'Scheduled', notes:'Sample record for demo/testing purposes.', roster:[],
          });
          return id;
        });
        addOrder(['pm','trainingSessions'], sessionIds);
        added.push(`${courseIds.length} training course(s) with ${sessionIds.length} scheduled session(s)`);
      }

      if(!patches.length){ toast('None of this agency\u2019s licensed modules have sample data defined for them yet.', true); return; }

      await SuiteStore.api('/apply-changes',{method:'POST',body:JSON.stringify({tenant_id:tenantId,agency_id:agencyId,changes:patches})});
      toast(`Added ${added.join(', ')} -- nothing assigned to any person.`);
    }catch(err){
      toast(`Could not add sample data: ${err.message}`, true);
    }finally{
      if(button){button.disabled=false;button.textContent='Insert Sample Data';}
    }
  }

  async function showPlatformAdmins(){
    if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}
    const el=SuiteUX.showPlatformView('platform-admins','Platform Admins','SonoMarzi-wide administrator access');if(!el)return;
    el.innerHTML=`<div class="tenant-toolbar"><button class="btn btn-outline" id="backPlatformTenants">← Tenant Management</button><div><div class="work-eyebrow">Platform security</div><h2 style="margin:0;color:var(--heading)">Platform Administrators</h2></div><button class="btn btn-primary" id="addPlatformAdmin">Add Platform Admin</button></div><div class="callout callout-blue" style="margin-bottom:18px"><strong>Platform Admin is SonoMarzi-level access.</strong><div style="margin-top:4px">Only current Platform Admins are shown here. New Platform Admins can only be selected from users who belong to the internal Demo tenant.</div></div><section class="panel"><div class="panel-head"><h2>Current Platform Admins</h2><span class="hint">Loading…</span></div><div class="panel-body" id="platformAdminList"><div class="empty-state"><div class="msg">Loading Platform Admins…</div></div></div></section>`;
    el.querySelector('#backPlatformTenants').onclick=showTenantManagement;
    el.querySelector('#addPlatformAdmin').onclick=openAddPlatformAdmin;
    try{
      const data=await platformApi('list_platform_admins');const users=data?.users||[];const list=el.querySelector('#platformAdminList');
      el.querySelector('.panel-head .hint').textContent=`${users.length} enabled`;
      list.innerHTML=users.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--border)"><div><strong style="color:var(--heading)">${esc(u.name||u.email)}</strong><div class="hint" style="margin-top:3px">${esc(u.email)}</div></div><button class="btn btn-danger btn-sm" data-platform-user="${esc(u.user_id)}">Revoke Platform Admin</button></div>`).join('')||'<div class="empty-state"><div class="msg">No Platform Admins found</div></div>';
      list.querySelectorAll('[data-platform-user]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke Platform Admin access from this user?'))return;b.disabled=true;try{await platformApi('set_platform_admin',{userId:b.dataset.platformUser,enabled:false});toast('Platform Admin revoked.');await refreshRemote();showPlatformAdmins()}catch(error){b.disabled=false;toast(error.message,true)}});
    }catch(error){el.querySelector('#platformAdminList').innerHTML=`<div class="callout callout-red">${esc(error.message)}</div>`}
  }

  function openAddPlatformAdmin(){
    const box=document.getElementById('modalBox');box.className='modal';
    box.innerHTML=`<div class="modal-head"><div><h3>Add Platform Admin</h3><div style="font-size:12px;color:var(--text-dim)">Search users in the internal Demo tenant only</div></div><button class="modal-close" id="platformAdminAddClose">×</button></div><div class="modal-body"><div class="form-row"><label for="platformAdminSearch">Name or email</label><div style="display:flex;gap:8px"><input id="platformAdminSearch" placeholder="Search Demo users"><button class="btn btn-outline" id="platformAdminSearchButton">Search</button></div></div><div class="callout callout-blue" style="margin:12px 0">A person must first be added as a user in the Demo tenant before they can receive SonoMarzi Platform Admin access.</div><div id="platformAdminCandidates"><div class="empty-state"><div class="sub">Search for a Demo tenant user to promote.</div></div></div></div><div class="modal-foot"><button class="btn btn-outline" id="platformAdminAddCancel">Close</button></div>`;
    SuiteUX.openModal();
    box.querySelector('#platformAdminAddClose').onclick=box.querySelector('#platformAdminAddCancel').onclick=event=>SuiteUX.closeModal(event);
    const runSearch=async()=>{
      const q=box.querySelector('#platformAdminSearch').value.trim();const host=box.querySelector('#platformAdminCandidates');host.innerHTML='<div class="empty-state"><div class="sub">Searching…</div></div>';
      try{
        const data=await platformApi('search_platform_admin_candidates',{search:q});const users=data?.users||[];
        host.innerHTML=users.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)"><div><strong>${esc(u.name||u.email)}</strong><div class="hint">${esc(u.email)} · ${esc(u.agency_name||'Demo')}</div></div><button class="btn btn-primary btn-sm" data-grant-platform="${esc(u.user_id)}">Grant</button></div>`).join('')||'<div class="empty-state"><div class="msg">No matching Demo users</div><div class="sub">Add the person to the Demo tenant first, then search again.</div></div>';
        host.querySelectorAll('[data-grant-platform]').forEach(b=>b.onclick=async()=>{if(!confirm('Grant SonoMarzi Platform Admin access to this user?'))return;b.disabled=true;try{await platformApi('set_platform_admin',{userId:b.dataset.grantPlatform,enabled:true});toast('Platform Admin granted.');SuiteUX.closeModal();await refreshRemote();showPlatformAdmins()}catch(error){b.disabled=false;toast(error.message,true)}});
      }catch(error){host.innerHTML=`<div class="callout callout-red">${esc(error.message)}</div>`}
    };
    box.querySelector('#platformAdminSearchButton').onclick=runSearch;
    box.querySelector('#platformAdminSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runSearch();}});
  }

  function showTenantDetail(id){if(!isPlatformAdmin())return;detailTenantId=id;const t=tenant(id),el=SuiteUX.showPlatformView('tenant-detail',t.name,'Tenant lifecycle, agencies, modules, and access');if(!el)return;el.innerHTML=`<div class="tenant-toolbar"><button class="btn btn-outline" id="backTenants">← All tenants</button><div style="display:flex;gap:8px"><button class="btn btn-outline" id="exportTenant">Export manifest</button><button class="btn btn-outline" id="addAgencyHere">Add agency</button><button class="btn btn-primary" id="saveTenant">Save changes</button></div></div><div class="tenant-detail-grid"><div><section class="panel"><div class="panel-head"><h2>Tenant profile</h2><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></div><div class="panel-body"><div class="onboarding-fields">${field('tdName','Tenant name',t.name)}${field('tdSlug','Internal tenant key',t.slug)}${field('tdTimezone','Time zone',t.timezone)}<div class="form-row"><label for="tdPlan">Plan</label><select id="tdPlan">${['Enterprise','Professional','Pilot'].map(x=>`<option ${x===t.plan?'selected':''}>${x}</option>`).join('')}</select></div></div></div></section><section class="panel"><div class="panel-head"><h2>Authentication security</h2></div><div class="panel-body"><div class="form-row"><label for="tdMfaPolicy">Multi-factor authentication requirement</label><select id="tdMfaPolicy"><option value="off" ${t.mfaPolicy==='off'?'selected':''}>Off</option><option value="admins" ${t.mfaPolicy==='admins'?'selected':''}>Required for administrators</option><option value="all_users" ${t.mfaPolicy==='all_users'?'selected':''}>Required for all users</option></select><div class="hint" style="margin-top:6px;line-height:1.45">MFA is enforced when users enter this tenant. TOTP authenticator apps are used. Once a person enrolls an authenticator, that factor remains attached to their SonoMarzi account, even if they also have access to another tenant that does not require enrollment.</div></div></div></section><section class="panel"><div class="panel-head"><h2>Licensed modules</h2></div><div class="panel-body module-select-grid">${MODULE_KEYS.map(k=>`<label class="module-choice"><input type="checkbox" data-tenant-module="${k}" ${t.enabledModules.includes(k)?'checked':''}><span><strong>${MODULE_LABELS[k]}</strong></span></label>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Agencies</h2></div><div class="panel-body">${t.agencies.map(a=>`<div class="agency-card"><div class="agency-card-head"><div><h3>${esc(a.name)}</h3><div class="agency-meta">${esc(a.abbreviation)} · ${esc(a.type)} · ${esc(a.ori||'No identifier')}</div><div style="margin-top:8px;font-size:12px;color:var(--text-dim)">Agency URL</div><div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap"><input id="agencySubdomain-${esc(a.id)}" value="${esc(a.subdomain||'')}" placeholder="agencyname" style="max-width:180px"><span style="font-size:12px;color:var(--text-dim)">.sonomarzi.com</span><button class="btn btn-outline btn-sm" data-save-subdomain="${esc(a.id)}">Save URL</button>${a.subdomain?`<a class="btn btn-outline btn-sm" href="https://${esc(a.subdomain)}.sonomarzi.com" target="_blank" rel="noopener">Open</a>`:''}</div></div><span class="tenant-status ${esc(a.status)}">${esc(STATUS_LABELS[a.status]||a.status)}</span></div><div style="margin-top:10px"><button class="btn btn-outline btn-sm" data-insert-sample="${esc(a.id)}" title="Adds sample equipment, vehicles, civil papers, and training courses to this specific agency, with nothing assigned to any person. Only visible to Platform Admins.">Insert Sample Data</button></div></div>`).join('')}</div></section><section class="panel" id="mark43Panel"><div class="panel-head"><h2>Mark43 RMS Integration</h2><span class="hint" id="mark43StatusHint">Loading…</span></div><div class="panel-body" id="mark43PanelBody"><div style="text-align:center;color:var(--text-dim);padding:20px;font-size:12.5px;">Loading connection status…</div></div></section></div><aside><section class="panel"><div class="panel-head"><h2>Administrators & invitations</h2></div><div class="panel-body">${t.admins.map(a=>`<div class="support-session"><span><strong>${esc(a.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(a.email)}</small></span><span class="badge badge-available">Active</span></div>`).join('')}${t.invites.map(i=>`<div class="support-session"><span><strong>${esc(i.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(i.email)}</small></span><span class="badge badge-maintenance">Pending</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Regional workspaces</h2><button class="btn btn-outline btn-sm" id="createRegional">Create</button></div><div class="panel-body">${t.regionalWorkspaces.map(w=>`<div class="support-session"><span><strong>${esc(w.name)}</strong><small style="display:block;color:var(--text-dim)">${w.agencyIds.length} agencies · ${w.modules.length} modules</small></span><span class="badge badge-available">Explicit</span></div>`).join('')||'<p style="font-size:12px;color:var(--text-dim)">No cross-agency workspace has been authorized.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Support access</h2><button class="btn btn-outline btn-sm" id="grantSupport">Grant</button></div><div class="panel-body">${t.supportSessions.filter(x=>!x.revokedAt&&new Date(x.expiresAt)>new Date()).map(x=>`<div class="support-session"><span><strong>${esc(x.reason)}</strong><small style="display:block;color:var(--text-dim)">Expires ${esc(new Date(x.expiresAt).toLocaleString())}</small></span><button class="btn btn-outline btn-sm" data-revoke-support="${x.id}">Revoke</button></div>`).join('')||'<p style="font-size:12px;color:var(--text-dim)">No active support session.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Recent tenant activity</h2></div><div class="panel-body">${t.audit.slice(0,8).map(a=>`<div class="tenant-audit-row">${esc(a.action)}<small>${esc(new Date(a.at).toLocaleString())} · ${esc(a.actor)}</small></div>`).join('')||'<p>No activity yet.</p>'}</div></section><section class="danger-zone"><h3>Tenant status</h3><p style="font-size:12px">Suspension blocks ordinary agency access while retaining data.</p><button class="btn ${t.status==='suspended'?'btn-primary':'btn-danger'}" id="toggleTenantStatus">${t.status==='suspended'?'Reactivate tenant':t.status==='setup'?'Activate tenant':'Suspend tenant'}</button></section></aside></div>`;el.querySelector('#backTenants').onclick=showTenantManagement;el.querySelector('#addAgencyHere').onclick=()=>{wizard=defaultWizard('agency');wizard.tenantId=t.id;renderWizard()};el.querySelector('#saveTenant').onclick=()=>saveTenantDetail(t);el.querySelector('#exportTenant').onclick=()=>exportManifest(t);el.querySelector('#createRegional').onclick=()=>openRegional(t);el.querySelector('#grantSupport').onclick=()=>openSupport(t);el.querySelectorAll('[data-revoke-support]').forEach(b=>b.onclick=()=>revokeSupport(t,b.dataset.revokeSupport));el.querySelector('#toggleTenantStatus').onclick=()=>toggleStatus(t);el.querySelectorAll('[data-insert-sample]').forEach(b=>b.onclick=()=>insertSampleData(t.id,b.dataset.insertSample,t.enabledModules,b));el.querySelectorAll('[data-save-subdomain]').forEach(b=>b.onclick=()=>saveAgencySubdomain(t,b.dataset.saveSubdomain));loadMark43Panel(t)}
  function exportManifest(t){const manifest={exportedAt:now(),tenant:{id:t.id,slug:t.slug,name:t.name,timezone:t.timezone,plan:t.plan,status:t.status,enabledModules:t.enabledModules},agencies:t.agencies,regionalWorkspaces:t.regionalWorkspaces,activeSupportSessions:t.supportSessions.filter(x=>!x.revokedAt&&new Date(x.expiresAt)>new Date())};const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${t.slug}-tenant-manifest.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);audit(t,'Exported tenant configuration manifest')}
  function openRegional(t){if(t.agencies.length<2){toast('Add at least two agencies before creating a regional workspace.',true);return}const box=document.getElementById('modalBox');box.className='modal';box.innerHTML=`<div class="modal-head"><h3>Create regional workspace</h3><button class="modal-close" id="rwClose">×</button></div><div class="modal-body"><div class="form-row"><label for="rwName">Workspace name</label><input id="rwName"></div><div class="form-row"><label>Authorized agencies</label>${t.agencies.map(a=>`<label class="check-row"><input type="checkbox" data-rw-agency="${a.id}"> ${esc(a.name)}</label>`).join('')}</div><div class="form-row"><label>Authorized modules</label>${t.enabledModules.map(m=>`<label class="check-row"><input type="checkbox" data-rw-module="${m}"> ${esc(MODULE_LABELS[m])}</label>`).join('')}</div><div id="rwError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="rwCancel">Cancel</button><button class="btn btn-primary" id="rwCreate">Authorize workspace</button></div></div>`;SuiteUX.openModal();box.querySelector('#rwClose').onclick=box.querySelector('#rwCancel').onclick=e=>SuiteUX.closeModal(e);box.querySelector('#rwCreate').onclick=async()=>{const name=box.querySelector('#rwName').value.trim(),agencyIds=[...box.querySelectorAll('[data-rw-agency]:checked')].map(x=>x.dataset.rwAgency),modules=[...box.querySelectorAll('[data-rw-module]:checked')].map(x=>x.dataset.rwModule);if(!name||agencyIds.length<2||!modules.length){box.querySelector('#rwError').textContent='Enter a name, select at least two agencies, and select a module.';return}if(SuiteStore.mode()==='shared'){try{await platformApi('create_regional_workspace',{tenantId:t.id,name,agencyIds,modules})}catch(error){box.querySelector('#rwError').textContent=error.message;return}}enableRegionalWorkspace(t.id,name,agencyIds,modules);SuiteUX.closeModal();showTenantDetail(t.id);toast('Regional workspace authorized and audited.')}}
  function openSupport(t){const box=document.getElementById('modalBox');box.className='modal';box.innerHTML=`<div class="modal-head"><h3>Grant temporary support access</h3><button class="modal-close" id="saClose">×</button></div><div class="modal-body"><div class="callout callout-blue">Access is time-limited, scoped, and written to the tenant audit log.</div>${field('saUser','Support user UUID','')}${field('saReason','Business reason','')}<div class="form-row"><label for="saHours">Duration</label><select id="saHours"><option value="1">1 hour</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="24">24 hours</option></select></div><div class="form-row"><label>Scope</label>${['configuration','audit','diagnostics'].map(x=>`<label class="check-row"><input type="checkbox" data-sa-scope="${x}"> ${x}</label>`).join('')}</div><div id="saError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="saCancel">Cancel</button><button class="btn btn-primary" id="saGrant">Grant access</button></div></div>`;SuiteUX.openModal();box.querySelector('#saClose').onclick=box.querySelector('#saCancel').onclick=e=>SuiteUX.closeModal(e);box.querySelector('#saGrant').onclick=async()=>{const supportUserId=box.querySelector('#saUser').value.trim(),reason=box.querySelector('#saReason').value.trim(),hours=Number(box.querySelector('#saHours').value),scope=[...box.querySelectorAll('[data-sa-scope]:checked')].map(x=>x.dataset.saScope);if(!/^[0-9a-f-]{36}$/i.test(supportUserId)||reason.length<10||!scope.length){box.querySelector('#saError').textContent='Enter a valid support user UUID, a specific reason, and at least one scope.';return}let session={id:uuid('support'),supportUserId,reason,scope,expiresAt:new Date(Date.now()+hours*3600000).toISOString()};if(SuiteStore.mode()==='shared'){try{const data=await platformApi('grant_support',{tenantId:t.id,supportUserId,reason,hours,scope});session=data.supportSession}catch(error){box.querySelector('#saError').textContent=error.message;return}}t.supportSessions.push(session);audit(t,`Granted temporary support access: ${reason}`);SuiteUX.closeModal();showTenantDetail(t.id);toast('Temporary support access granted.')}}
  async function revokeSupport(t,id){if(SuiteStore.mode()==='shared'){try{await platformApi('revoke_support',{tenantId:t.id,sessionId:id})}catch(error){toast(error.message,true);return}}const x=t.supportSessions.find(x=>x.id===id);if(x)x.revokedAt=now();audit(t,'Revoked temporary support access');showTenantDetail(t.id)}
  async function saveTenantDetail(t){
    const name=document.getElementById('tdName').value.trim(),slug=document.getElementById('tdSlug').value.trim().toLowerCase(),timezone=document.getElementById('tdTimezone').value.trim(),plan=document.getElementById('tdPlan').value,mfaPolicy=document.getElementById('tdMfaPolicy')?.value||'off',modules=[...document.querySelectorAll('[data-tenant-module]:checked')].map(x=>x.dataset.tenantModule);
    if(!name||!slug||!timezone||!modules.length){toast('Tenant name, internal tenant key, time zone, and at least one module are required.',true);return}
    if(SuiteStore.mode()==='shared'){
      try{
        if(mfaPolicy!=='off') await identityPlatformApi('ensure_mfa_capability');
        await platformApi('update_tenant',{tenantId:t.id,tenant:{name,slug,timezone,plan},enabledModules:modules});
        if(mfaPolicy!==t.mfaPolicy) await platformApi('set_tenant_mfa_policy',{tenantId:t.id,mfaPolicy});
      }catch(error){toast(error.message,true);return}
    }
    t.name=name;t.slug=slug;t.timezone=timezone;t.plan=plan;t.enabledModules=modules;t.mfaPolicy=mfaPolicy;audit(t,`Updated tenant profile, modules, and MFA policy (${mfaPolicy})`);refresh();showTenantDetail(t.id);toast('Tenant settings saved.');
  }

  // ---- Mark43 RMS Integration panel ----
  // The connection is only ever real (not a demo toast) when running in shared mode against a
  // deployed tenant-admin Edge Function with the get/save/test/sync_mark43_connection actions
  // added -- see the code + SQL migration provided alongside this file. In local/demo mode this
  // renders as an explained, inert preview so the screen still looks and reads correctly.
  async function loadMark43Panel(t){
    const hint=document.getElementById('mark43StatusHint'),body=document.getElementById('mark43PanelBody');
    if(!hint||!body)return;
    hint.textContent='Connector not configured';
    renderMark43Panel(t,{enabled:false,tenantSubdomain:'',authMode:'basic',hasToken:false,lastSyncAt:null,lastSyncStatus:null,lastSyncMessage:'Mark43 outbound connectivity is not configured for this agency.'},true);
  }

  async function saveAgencySubdomain(t,agencyId){const a=t.agencies.find(x=>x.id===agencyId);if(!a)return;const input=document.getElementById(`agencySubdomain-${agencyId}`);const previousSubdomain=(a.subdomain||'').trim().toLowerCase();const subdomain=(input?.value||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(!subdomain||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)||['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(subdomain)){toast('Choose a valid, non-reserved agency URL using lowercase letters, numbers, and hyphens.',true);return}if(catalog.tenants.some(other=>other.agencies.some(x=>x.id!==agencyId&&(x.subdomain||'').toLowerCase()===subdomain))){toast('That agency URL is already in use.',true);return}try{if(SuiteStore.mode()==='shared')await platformApi('update_agency_subdomain',{tenantId:t.id,agencyId,subdomain});const token=sessionStorage.getItem('sonomarzi.aws.id_token');if(token)await registerAgencySubdomain({tenantId:t.id,agencyId,subdomain,previousSubdomain})}catch(error){toast(error.message,true);return}a.subdomain=subdomain;audit(t,`Updated ${a.name} agency URL to ${subdomain}.sonomarzi.com`);refresh();showTenantDetail(t.id);toast(`Agency URL saved: ${subdomain}.sonomarzi.com`) }

  function renderMark43Panel(t, conn, isPreview){
    const body = document.getElementById('mark43PanelBody');
    body.innerHTML = `
      ${isPreview ? `<div class="locked-note" style="margin-bottom:14px;">${ICONS.alert}<div>This panel only does something real when connected to a live agency workspace with the matching Edge Function actions deployed. Switch to a shared session to configure a real connection.</div></div>` : ''}
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:${conn.hasToken?'pointer':'not-allowed'};opacity:${conn.hasToken?'1':'0.5'};">
        <input type="checkbox" id="fMark43Enabled" style="width:auto;" ${conn.enabled?'checked':''} ${!conn.hasToken?'disabled':''}> Pull personnel from Mark43 automatically
      </label></div>
      <div class="form-row"><label>Mark43 tenant name <span style="font-weight:400;color:var(--text-dim);">(the subdomain in your Mark43 URL)</span></label>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="text" id="fMark43Tenant" value="${escapeHtml(conn.tenantSubdomain||'')}" placeholder="e.g. reno-nv-demo" style="flex:1;">
          <span style="color:var(--text-dim);font-size:12.5px;white-space:nowrap;">.mark43.com</span>
        </div>
      </div>
      <div class="form-row"><label>Auth style</label>
        <select id="fMark43AuthMode">
          <option value="basic" ${conn.authMode==='basic'?'selected':''}>HTTP Basic (token:x-api-token)</option>
          <option value="apikey" ${conn.authMode==='apikey'?'selected':''}>X-Api-Key header</option>
        </select>
      </div>
      <div class="form-row"><label>API token <span style="font-weight:400;color:var(--text-dim);">(from your Mark43 Technical Services Representative)</span></label>
        <input type="password" id="fMark43Token" value="" autocomplete="new-password" placeholder="${conn.hasToken ? 'Configured — leave blank to keep it' : 'Paste the API token'}">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        <button class="btn btn-primary btn-sm" id="btnSaveMark43">Save Connection</button>
        <button class="btn btn-outline btn-sm" id="btnTestMark43" ${conn.hasToken?'':'disabled'}>Test Connection</button>
        <button class="btn btn-outline btn-sm" id="btnSyncMark43" ${conn.enabled && conn.hasToken?'':'disabled'}>Sync Now</button>
      </div>
      <div id="mark43Result" style="font-size:12.5px;line-height:1.5;margin-top:10px;"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
        ${conn.lastSyncAt ? `Last sync ${escapeHtml(new Date(conn.lastSyncAt).toLocaleString())} \u2014 ${escapeHtml(conn.lastSyncStatus||'')}${conn.lastSyncMessage?': '+escapeHtml(conn.lastSyncMessage):''}` : 'Never synced yet.'}
        Switching this off stops any sync from running, on demand or scheduled, without deleting the saved connection.
      </div>
    `;
    document.getElementById('btnSaveMark43').onclick = ()=>saveMark43Connection(t);
    const testBtn = document.getElementById('btnTestMark43');
    if(testBtn) testBtn.onclick = ()=>testMark43Connection(t);
    const syncBtn = document.getElementById('btnSyncMark43');
    if(syncBtn) syncBtn.onclick = ()=>syncMark43Now(t);
    const enabledToggle = document.getElementById('fMark43Enabled');
    if(enabledToggle) enabledToggle.onchange = ()=>saveMark43Connection(t, {enabledOnly:true});
  }

  async function saveMark43Connection(t,opts){
    const resultBox=document.getElementById('mark43Result');
    if(resultBox) resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> Mark43 credentials are not stored in the browser or the tenant database.';
  }

  async function testMark43Connection(t){
    const resultBox=document.getElementById('mark43Result');if(resultBox)resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> Live outbound testing is intentionally disabled until the dedicated connector is deployed.';
  }

  async function syncMark43Now(t){
    const resultBox=document.getElementById('mark43Result');if(resultBox)resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> No Supabase fallback is used.';
  }
  async function toggleStatus(t){const next=t.status==='suspended'||t.status==='setup'?'active':'suspended';if(next==='suspended'&&!confirm(`Suspend ${t.name}? Ordinary agency users will be blocked, but data will be retained.`))return;if(SuiteStore.mode()==='shared'){try{await platformApi('set_tenant_status',{tenantId:t.id,status:next})}catch(error){toast(error.message,true);return}}t.status=next;audit(t,`${next==='active'?'Reactivated':'Suspended'} tenant`);refresh();showTenantDetail(t.id)}
  function enableRegionalWorkspace(tenantId,name,agencyIds,modules){const t=tenant(tenantId);if(!t||!isPlatformAdmin())throw Error('Platform Admin required.');const ws={id:uuid('regional'),name,agencyIds:[...new Set(agencyIds)],modules:modules.filter(m=>t.enabledModules.includes(m)),status:'active',createdAt:now()};t.regionalWorkspaces.push(ws);audit(t,`Created regional workspace ${name}`);return ws}
  function seedForTests(data){catalog=data;current=data.current;normalize();save();refresh()}
  return {init,load,refresh,renderContext,renderBanner,showTenantManagement,showPlatformAdmins,showTenantDetail,startWizard,switchContext,snapshotCurrent,moduleEnabled,activeModules,isPlatformAdmin,isSystemAdmin,tenant,agency,contexts,enableRegionalWorkspace,seedForTests,workspaceKey,get catalog(){return catalog},get current(){return current}};
})();

// Expose a stable platform page helper without widening module permissions.
SuiteUX.showPlatformView=function(id,title,subtitle){if(!TenantPlatform.isPlatformAdmin())return null;const el=document.getElementById('view-'+id)||(()=>{const x=document.createElement('div');x.id='view-'+id;x.className='view';document.getElementById('content').append(x);return x})();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el.classList.add('active');document.getElementById('page-title').textContent=title;document.getElementById('page-sub').textContent=subtitle;history.pushState({suite:id},'','#/'+id);return el};

const originalAccessibleModules=accessibleModules;
accessibleModules=function(){return originalAccessibleModules().filter(key=>TenantPlatform.moduleEnabled(key))};
const originalCan=can;
can=function(abilityId){if(abilityId.startsWith('module_')){const key={module_quartermaster:'qm',module_fleet:'fleet',module_personnel:'personnel',module_k9:'k9',module_drone:'drone',module_eod:'eod',module_subpoena:'subpoena',module_grants:'grants',module_civil:'civil'}[abilityId];if(key&&!TenantPlatform.moduleEnabled(key))return false}return originalCan(abilityId)};
const originalStartShell=startShell;
function addPlatformAdminButtons(){const p=document.getElementById('suiteProfile');if(!p)return;if(TenantPlatform.isPlatformAdmin()&&!p.querySelector('#btnTenantManagement'))p.append(Object.assign(document.createElement('button'),{id:'btnTenantManagement',className:'btn btn-outline',textContent:'Tenant Management',onclick:TenantPlatform.showTenantManagement}));if((TenantPlatform.isPlatformAdmin()||TenantPlatform.isSystemAdmin())&&SuiteStore.mode()==='shared'&&!p.querySelector('#btnUserAdministration'))p.append(Object.assign(document.createElement('button'),{id:'btnUserAdministration',className:'btn btn-outline',textContent:'User Administration',onclick:()=>TenantUserAdmin.show()}));}
startShell=function(){try{TenantPlatform.init();originalStartShell();TenantPlatform.refresh();}catch(e){console.error('startShell error (continuing so admin buttons still get added):',e);}addPlatformAdminButtons();setTimeout(addPlatformAdminButtons,600);setTimeout(addPlatformAdminButtons,1500);
  // Module visibility depends on three independent things, and when a module is missing it is
  // otherwise impossible to tell which one is at fault from the UI alone. Logging all three at
  // login turns "no modules are showing" from guesswork into a single readable answer.
  try{
    const assigned = STATE.currentRoleIds||[];
    const knownRoleIds = (STATE.roles||[]).map(r=>r.id);
    const missingRoles = assigned.filter(id=>!knownRoleIds.includes(id));
    debugLog('[access] signed in as:', CURRENT_USER_ID);
    debugLog('[access] roles assigned to this login:', assigned);
    debugLog('[access] roles that exist in this workspace:', knownRoleIds);
    if(missingRoles.length) console.warn('[access] PROBLEM: these assigned roles do not exist in this workspace, so they grant nothing:', missingRoles);
    debugLog('[access] modules licensed for this tenant:', TenantPlatform.activeModules());
    debugLog('[access] RAW tenant() lookup for this session:', TenantPlatform.tenant());
    debugLog('[access] current tenant/agency context:', TenantPlatform.current);
    debugLog('[access] full tenant catalog this session can see:', TenantPlatform.catalog);
    debugLog('[access] modules visible to you:', accessibleModules());
    const moduleAbilities = ['module_quartermaster','module_fleet','module_personnel','module_k9','module_drone','module_eod','module_subpoena','module_grants','module_civil'];
    debugLog('[access] per-module check (needs BOTH tenant-licensed AND granted-by-your-role):',
      Object.fromEntries(moduleAbilities.map(a=>{
        const key = a.replace('module_','').replace('quartermaster','qm');
        const grantedByRole = assigned.some(rid=>(STATE.roles.find(r=>r.id===rid)||{}).abilities?.[a]);
        return [a, {licensedForTenant: TenantPlatform.moduleEnabled(key), grantedByYourRole: grantedByRole}];
      }))
    );
  }catch(e){ console.error('[access] diagnostic failed:', e); }
};

const AUTH_LINK_TYPE=new URLSearchParams(location.hash.replace(/^#/,'')).get('type')||new URLSearchParams(location.search).get('type');

function openInvitationPassword(){
  if(window.SONOMARZI_AWS_DEV){
    toast('This invitation flow has moved to AWS Cognito. Sign in through Cognito to continue.',true);
    return;
  }
}


