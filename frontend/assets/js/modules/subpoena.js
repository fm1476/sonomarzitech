/* =========================================================================
   SUBPOENA MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.subpoena and shared roles/personnel)
   Handles assigning, tracking, modifying, and cancelling subpoenas for staff members,
   with document attachments, a notify + acknowledge-receipt workflow, and calendar
   integration (a personal view feeding into Personnel Management's "My Calendar", plus
   its own department-wide master calendar for the module admin).
   ========================================================================= */
(function(){

const SUBPOENA_STATUSES = ["Active","Rescheduled","Cancelled","Completed"];
const DEFAULT_COURT_LOCATIONS = [
  "Washoe County District Court - Dept 1, 75 Court St, Reno NV 89501",
  "Washoe County District Court - Dept 4, 75 Court St, Reno NV 89501",
  "Reno Justice Court - Dept 2, 1 S Sierra St, Reno NV 89501",
  "Sparks Justice Court, 1675 E Prater Way, Sparks NV 89434",
  "U.S. District Court, District of Nevada, 400 S Virginia St, Reno NV 89501",
  "Second Judicial District Court - Family Division, 1 S Sierra St, Reno NV 89501",
];

function defaultRefDataSubpoena(){
  return { courtLocations: [...DEFAULT_COURT_LOCATIONS] };
}

/* =========================================================================
   SEED DATA
   ========================================================================= */
function seedSubpoenas(){
  const today = new Date();
  const rows = [
    // [personId, caseNumber, daysFromToday, time, locationIdx, courtroom, subject, status, notified, acknowledged, attachments]
    ["p2","CR26-01894",14,"09:00",0,"Dept 1","State v. Harmon \u2014 Officer testimony re: traffic stop and search incident to arrest","Active",true,true,1],
    ["p3","CR26-02011",21,"13:30",2,"Dept 2","State v. Delgado \u2014 Arresting officer testimony","Active",true,false,1],
    ["p1","CV26-00447",35,"10:00",5,"Family Division","Torres v. Torres \u2014 Records custodian testimony","Active",true,true,0],
    ["p6","CR26-01772",-10,"09:00",1,"Dept 4","State v. Whitfield (no relation) \u2014 K9 deployment testimony","Completed",true,true,1],
    ["p4","CR26-02150",7,"08:30",0,"Dept 1","State v. Reyes \u2014 Evidence chain of custody","Active",false,false,0],
    ["p5","CR26-01699",-25,"14:00",3,"Sparks JC","State v. Boone \u2014 Traffic citation testimony","Cancelled",true,false,0],
    ["p2","CR26-02203",45,"09:30",4,"Federal Ct","U.S. v. Kessler \u2014 Federal task force operation testimony","Active",true,false,0],
  ];
  return rows.map(([personId,caseNumber,daysFromToday,time,locIdx,courtroom,subject,status,notified,acknowledged,attCount],i)=>{
    const courtDate = fmt(addDays(today, daysFromToday));
    return {
      id:"sub"+(i+1), personId, caseNumber, courtDate, courtTime:time,
      courtLocation: DEFAULT_COURT_LOCATIONS[locIdx], courtroom, subject, status,
      issuedDate: fmt(addDays(today, daysFromToday-30)), issuedBy:"District Attorney's Office",
      notifiedDate: notified ? fmt(addDays(today, daysFromToday-25)) : null, notifiedBy: notified ? "Fred Marziano" : null,
      acknowledgedDate: acknowledged ? fmt(addDays(today, daysFromToday-24)) : null, acknowledgedBy: acknowledged ? personId : null,
      attachments: attCount>0 ? [{id:"att_"+i+"_1", filename:"Subpoena_"+caseNumber+".pdf", dataUrl:null, sizeKb:184, uploadedDate: fmt(addDays(today,daysFromToday-30)), uploadedBy:"Fred Marziano"}] : [],
      fieldHistory: [], notes:"",
    };
  });
}

/* =========================================================================
   STATE LIFECYCLE
   ========================================================================= */
function buildData(){
  return {
    subpoenas: seedSubpoenas(),
    refData: defaultRefDataSubpoena(),
    notifications: [],
    notifySettings: { courtDateApproachingRoleId: "role_admin", unacknowledgedRoleId: "role_admin" },
    activity: [],
    dashboardPrefs: {}, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
  };
}

function migrateData(){
  if(!STATE.subpoena.refData) STATE.subpoena.refData = defaultRefDataSubpoena();
  if(!STATE.subpoena.notifications) STATE.subpoena.notifications = [];
  if(!STATE.subpoena.dashboardPrefs) STATE.subpoena.dashboardPrefs = {};
  if(!STATE.subpoena.notifySettings) STATE.subpoena.notifySettings = { courtDateApproachingRoleId: STATE.roles[0].id, unacknowledgedRoleId: STATE.roles[0].id };
  STATE.subpoena.subpoenas.forEach(s=>{
    if(!s.attachments) s.attachments = [];
    if(!s.fieldHistory) s.fieldHistory = [];
    if(s.courtroom===undefined) s.courtroom = "";
  });
}

function logActivity(text, entityType, entityId){
  STATE.subpoena.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('Subpoena', text, entityType);
}

function subpoenaFor(id){ return STATE.subpoena.subpoenas.find(s=>s.id===id); }
function recordFieldChangeSubpoena(entity, field, oldVal, newVal){
  if(JSON.stringify(oldVal)===JSON.stringify(newVal)) return;
  entity.fieldHistory.push({
    date: fmt(new Date()), field, before: oldVal, after: newVal,
    changedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System',
  });
}
function subpoenaStatusColor(status){
  return {"Active":"var(--blue)","Rescheduled":"var(--gold)","Cancelled":"var(--red)","Completed":"var(--green)"}[status] || "var(--text-dim)";
}
function subpoenaStatusBadgeClass(status){
  return {"Active":"badge-assigned","Rescheduled":"badge-role","Cancelled":"badge-missing","Completed":"badge-available"}[status] || "badge-role";
}

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  {id:"subpoena-dashboard", label:"Dashboard", icon:"dashboard", title:"Dashboard", sub:"Subpoena activity and compliance at a glance", requiredAbility:null},
  {id:"subpoena-list", label:"All Subpoenas", icon:"gavel", title:"All Subpoenas", sub:"Every subpoena across the department", requiredAbility:"subpoena_view_all"},
  {id:"subpoena-mine", label:"My Subpoenas", icon:"filetext", title:"My Subpoenas", sub:"Subpoenas assigned to you, with acknowledgment", requiredAbility:"subpoena_view_own"},
  {id:"subpoena-calendar", label:"Master Calendar", icon:"dashboard", title:"Master Calendar", sub:"Every court date across the department, by name", requiredAbility:"subpoena_view_all"},
  {id:"subpoena-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Compliance reporting and a configurable report builder", requiredAbility:"subpoena_reports_view"},
  {id:"subpoena-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Court locations and the system audit log", requiredAbility:["subpoena_admin_categories","subpoena_admin_audit"]},
];
let ACTIVE_VIEW = "subpoena-dashboard";

function navItemVisible(item){
  if(!can('module_subpoena')) return false;
  if(!item) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}
function renderNav(){ document.getElementById('navlist').innerHTML=''; }
function switchView(id){
  const target = NAV_ITEMS.find(n=>n.id===id);
  if(!target || !navItemVisible(target)) return;
  if(!SuiteUX.beforeView(id)) return;
  ACTIVE_VIEW = id;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  const meta = NAV_ITEMS.find(n=>n.id===id);
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-sub').textContent = meta.sub;
  renderNav();
  renderView(id);
  if(id!=='subpoena-dashboard'){
    const root=document.getElementById('view-'+id);
    if(root && !root.querySelector('[data-module-dashboard-back]')){
      const back=document.createElement('button');
      back.type='button'; back.className='btn btn-outline'; back.dataset.moduleDashboardBack='1';
      back.innerHTML='&#8592; Back to Dashboard'; back.style.marginBottom='16px';
      back.onclick=()=>switchView('subpoena-dashboard'); root.prepend(back);
    }
  }
}
function renderView(id){
  if(id==="subpoena-dashboard") renderDashboard();
  else if(id==="subpoena-list") renderSubpoenaList(true);
  else if(id==="subpoena-mine") renderSubpoenaList(false);
  else if(id==="subpoena-calendar") renderMasterCalendarSubpoena();
  else if(id==="subpoena-reports") renderReports();
  else if(id==="subpoena-admin") renderAdmin();
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  STATE.subpoena.subpoenas.filter(s=>s.status==="Active").forEach(s=>{
    const days = daysBetween(fmt(today), s.courtDate);
    if(days>=0 && days<=7 && !s.acknowledgedDate){
      upcoming.push({type:"unacknowledged", entityId:s.id, message:`${personName(s.personId)}'s subpoena for case ${s.caseNumber} has not been acknowledged, and court is in ${days} day(s) (${s.courtDate}).`, recipientRoleId: STATE.subpoena.notifySettings.unacknowledgedRoleId});
    }
    if(days>=0 && days<=3){
      upcoming.push({type:"court_approaching", entityId:s.id, message:`${personName(s.personId)}'s court date for case ${s.caseNumber} is in ${days} day(s) at ${s.courtLocation.split(',')[0]}.`, recipientRoleId: STATE.subpoena.notifySettings.courtDateApproachingRoleId});
    }
  });
  const prevReadBy = {};
  STATE.subpoena.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.subpoena.notifications = upcoming.map(n=>({
    id: n.type+'_'+n.entityId, ts: fmt(today),
    type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
    readBy: prevReadBy[n.type+'|'+n.entityId] || [],
  }));
}

function lockedNote(msg){ return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`; }
function permissionBlockedView(msg){
  return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
}
function subpoenaLink(id){
  const s = subpoenaFor(id);
  return `<a href="#" data-open-subpoena="${id}" class="record-link">${escapeHtml(s?s.caseNumber:'Unknown')}</a>`;
}
function wireSubpoenaLinks(){
  document.querySelectorAll('[data-open-subpoena]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openSubpoenaDetail(a.dataset.openSubpoena); }));
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
let CHART_REFS_SUBPOENA = {};
function destroyChartsSubpoena(){ Object.values(CHART_REFS_SUBPOENA).forEach(c=>c && c.destroy()); CHART_REFS_SUBPOENA = {}; }

const TOP_WIDGETS = [
  {id:"stat_active_subpoenas", label:"Active Subpoenas"},
  {id:"stat_unacknowledged", label:"Unacknowledged"},
  {id:"stat_not_notified", label:"Not Yet Notified"},
  {id:"stat_total_on_file", label:"Total on File"},
];
const EXTRA_WIDGETS = [
  {id:"list_upcoming_court_dates", label:"Upcoming Court Dates", defaultSize:"half"},
  {id:"chart_by_status", label:"By Status", defaultSize:"half"},
];
const DEFAULT_EXTRAS = EXTRA_WIDGETS.map(w=>({id:w.id, size:w.defaultSize}));
function myWidgetPrefs(){
  let p = STATE.subpoena.dashboardPrefs[CURRENT_USER_ID];
  const topIds = TOP_WIDGETS.map(w=>w.id), extraIds = EXTRA_WIDGETS.map(w=>w.id);
  if(!p || (!p.topOrder && !p.extras)){
    p = { topOrder:[...topIds], extras: DEFAULT_EXTRAS.map(e=>({...e})) };
    STATE.subpoena.dashboardPrefs[CURRENT_USER_ID] = p;
  }
  if(!Array.isArray(p.topOrder)) p.topOrder = [...topIds];
  if(!Array.isArray(p.extras)) p.extras = [];
  p.topOrder = [...p.topOrder.filter(id=>topIds.includes(id)), ...topIds.filter(id=>!p.topOrder.includes(id))];
  p.extras = p.extras.filter(e=>e && extraIds.includes(e.id));
  return p;
}
function renderWidget(id){
  const active = STATE.subpoena.subpoenas.filter(s=>s.status==="Active");
  const upcoming30 = active.filter(s=>{ const d = daysBetween(fmt(new Date()), s.courtDate); return d>=0 && d<=30; });
  if(id==='stat_active_subpoenas'){
    return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Active Subpoenas</div><div class="value">${active.length}</div><div class="delta neutral">${upcoming30.length} in the next 30 days</div></button>`;
  }
  if(id==='stat_unacknowledged'){
    const unacknowledged = active.filter(s=>!s.acknowledgedDate);
    return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Unacknowledged</div><div class="value" style="color:${unacknowledged.length?'var(--red)':'var(--heading)'}">${unacknowledged.length}</div><div class="delta ${unacknowledged.length?'warn':'ok'}">Awaiting receipt confirmation</div></button>`;
  }
  if(id==='stat_not_notified'){
    const notNotified = active.filter(s=>!s.notifiedDate);
    return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Not Yet Notified</div><div class="value" style="color:${notNotified.length?'var(--red)':'var(--heading)'}">${notNotified.length}</div><div class="delta neutral">Staff not yet contacted</div></button>`;
  }
  if(id==='stat_total_on_file'){
    return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Total on File</div><div class="value">${STATE.subpoena.subpoenas.length}</div></button>`;
  }
  if(id==='list_upcoming_court_dates'){
    const rows = upcoming30.slice().sort((a,b)=>a.courtDate.localeCompare(b.courtDate)).map(s=>`<tr><td>${escapeHtml(personName(s.personId))}</td><td>${subpoenaLink(s.id)}</td><td>${s.courtDate} ${s.courtTime}</td><td>${s.acknowledgedDate ? '<span class="badge badge-available">Acknowledged</span>' : '<span class="badge badge-missing">Not Acknowledged</span>'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No court dates in the next 30 days.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Upcoming Court Dates</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Staff Member</th><th>Case #</th><th>Court Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='chart_by_status'){
    return `<div class="panel"><div class="panel-head"><h2>By Status</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartSubpoenaStatus"></canvas></div></div></div>`;
  }
  return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
}
const DASH_SIZE_LABELS = {quarter:'\u00bc', half:'\u00bd', threeQuarter:'\u00be', full:'Full'};
function renderTopWidget(id){
  return `<div class="dash-widget" data-widget-id="${id}">
    <div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>
    ${renderWidget(id)}
  </div>`;
}
function renderExtraWidget(id, size){
  return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}">
    <div class="dash-widget-toolbar">
      <span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span>
      <button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size]||'\u00bd'}</button>
      <button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button>
    </div>
    ${renderWidget(id)}
  </div>`;
}
function wireDashDragDrop(zone, orderedArray, isExtras){
  if(!zone) return;
  let draggedId = null;
  zone.querySelectorAll('.dash-drag-handle').forEach(handle=>{
    handle.setAttribute('draggable','true');
    handle.addEventListener('dragstart', e=>{
      const card = handle.closest('[data-widget-id]');
      if(!card) return;
      draggedId = card.dataset.widgetId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setDragImage(card, 24, 24); }catch(err){}
    });
    handle.addEventListener('dragend', ()=>{
      zone.querySelectorAll('.dash-widget').forEach(c=>c.classList.remove('dragging','dash-drop-target'));
      draggedId = null;
    });
  });
  zone.querySelectorAll('[data-widget-id]').forEach(card=>{
    card.addEventListener('dragover', e=>{
      if(!draggedId || draggedId===card.dataset.widgetId) return;
      e.preventDefault();
      card.classList.add('dash-drop-target');
    });
    card.addEventListener('dragleave', ()=>card.classList.remove('dash-drop-target'));
    card.addEventListener('drop', e=>{
      e.preventDefault();
      card.classList.remove('dash-drop-target');
      const targetId = card.dataset.widgetId;
      if(!draggedId || draggedId===targetId) return;
      if(isExtras){
        const fromIdx = orderedArray.findIndex(x=>x.id===draggedId);
        const toIdx = orderedArray.findIndex(x=>x.id===targetId);
        if(fromIdx<0 || toIdx<0) return;
        const [moved] = orderedArray.splice(fromIdx,1);
        orderedArray.splice(toIdx,0,moved);
      }else{
        const fromIdx = orderedArray.indexOf(draggedId);
        const toIdx = orderedArray.indexOf(targetId);
        if(fromIdx<0 || toIdx<0) return;
        orderedArray.splice(fromIdx,1);
        orderedArray.splice(toIdx,0,draggedId);
      }
      persist();
      renderDashboard();
    });
  });
}
function openCustomizeDashboardModal(){
  const prefs = myWidgetPrefs();
  const enabled = new Set(prefs.extras.map(e=>e.id));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add / Remove Widgets</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Check the widgets you want on your dashboard. Once added, drag any widget's handle to reposition it, and use its resize button to change how much room it takes up.</div>
      ${EXTRA_WIDGETS.map(w=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">
        <input type="checkbox" class="widgetCheck" data-widget-id="${w.id}" ${enabled.has(w.id)?'checked':''} style="width:auto;">
        <span style="flex:1;font-size:13px;">${escapeHtml(w.label)}</span>
      </div>`).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const checked = Array.from(document.querySelectorAll('.widgetCheck')).filter(c=>c.checked).map(c=>c.dataset.widgetId);
    const stillThere = prefs.extras.filter(e=>checked.includes(e.id));
    const added = checked.filter(id=>!prefs.extras.some(e=>e.id===id)).map(id=>({id, size:(EXTRA_WIDGETS.find(w=>w.id===id)||{}).defaultSize||'half'}));
    prefs.extras = [...stillThere, ...added];
    logActivity(`Customized personal Subpoena dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
    persist();
    toast("Dashboard saved.");
    closeModal();
    renderDashboard();
  };
}
function renderDashboard(){
  recalcNotifications();
  const prefs = myWidgetPrefs();
  const root = document.getElementById('view-subpoena-dashboard');
  root.innerHTML = `
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Drag the handle on any card to rearrange it. This layout is saved to your account only.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map(id=>renderTopWidget(id)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map(e=>renderExtraWidget(e.id,e.size)).join('')}
    </div>
  `;
  const destinations=NAV_ITEMS.filter(item=>item.id!=='subpoena-dashboard' && navItemVisible(item));
  const hub=document.createElement('div');
  hub.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:14px;margin-bottom:20px';
  hub.innerHTML=destinations.map((item,i)=>`<button data-nav-dest="${item.id}" style="min-height:132px;padding:18px;text-align:left;border:1px solid var(--border);border-radius:12px;background:var(--panel);color:inherit;font:inherit;cursor:pointer"><div style="color:${['#4D8DFF','#43D59B','#B47CFF','#FF9F43','#20C7D9'][i%5]};width:28px;height:28px;margin-bottom:12px">${ICONS[item.icon]||ICONS.filetext}</div><strong style="display:block;color:var(--heading);font-size:16px;margin-bottom:8px">${escapeHtml(item.label)}</strong><span style="font-size:12px;color:var(--text-dim)">${escapeHtml(item.sub)}</span></button>`).join('');
  root.prepend(hub);
  const extras=root.querySelector('#dashExtrasZone');
  if(extras){
    const details=document.createElement('details');
    details.style.cssText='border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-top:14px';
    const summary=document.createElement('summary');
    summary.style.cssText='padding:16px 20px;cursor:pointer;font-weight:800';
    summary.textContent='Court Dates & Subpoena Status';
    extras.parentNode.insertBefore(details,extras);details.append(summary,extras);
  }
  root.querySelectorAll('[data-nav-dest]').forEach(b=>b.addEventListener('click', ()=>switchView(b.dataset.navDest)));
  destroyChartsSubpoena();
  if(prefs.extras.some(e=>e.id==='chart_by_status')){
    const byStatus = {};
    SUBPOENA_STATUSES.forEach(s=>byStatus[s]=0);
    STATE.subpoena.subpoenas.forEach(s=>byStatus[s.status]=(byStatus[s.status]||0)+1);
    CHART_REFS_SUBPOENA.status = safeChart('chartSubpoenaStatus', {
      type:'bar',
      data:{ labels:Object.keys(byStatus), datasets:[{label:'Subpoenas', data:Object.values(byStatus), backgroundColor:'#134DD1'}] },
      options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}},grid:{color:chartGridColor()}}}}
    });
  }
  wireSubpoenaLinks();
  wireDashDragDrop(root.querySelector('#dashTopZone'), prefs.topOrder, false);
  wireDashDragDrop(root.querySelector('#dashExtrasZone'), prefs.extras, true);
  root.querySelectorAll('[data-widget-size-cycle]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    const entry = prefs.extras.find(x=>x.id===b.dataset.widgetSizeCycle);
    if(!entry) return;
    const order = ['quarter','half','threeQuarter','full'];
    entry.size = order[(order.indexOf(entry.size)+1) % order.length];
    persist(); renderDashboard();
  }));
  root.querySelectorAll('[data-widget-remove]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    prefs.extras = prefs.extras.filter(x=>x.id!==b.dataset.widgetRemove);
    persist(); renderDashboard();
  }));
  const custBtn = root.querySelector('#btnCustomizeDashboard');
  if(custBtn) custBtn.addEventListener('click', openCustomizeDashboardModal);
}

/* =========================================================================
   SUBPOENA LIST (shared by "All Subpoenas" and "My Subpoenas")
   ========================================================================= */
let SUBPOENA_FILTER = {q:"", status:"All"};

function renderSubpoenaList(showAll){
  const canViewAll = can('subpoena_view_all');
  const canViewOwn = can('subpoena_view_own');
  if(showAll && !canViewAll){
    document.getElementById('view-subpoena-list').innerHTML = permissionBlockedView("You don't have permission to view every subpoena in this role.");
    return;
  }
  if(!showAll && !canViewOwn){
    document.getElementById('view-subpoena-mine').innerHTML = permissionBlockedView("You don't have permission to view your subpoenas in this role.");
    return;
  }
  const canManage = can('subpoena_manage');
  const targetViewId = showAll ? 'view-subpoena-list' : 'view-subpoena-mine';
  const f = SUBPOENA_FILTER;
  let list = STATE.subpoena.subpoenas.filter(s=>showAll || s.personId===CURRENT_USER_ID);
  list = list.filter(s=>{
    const q = f.q.toLowerCase();
    const matchQ = !q || s.caseNumber.toLowerCase().includes(q) || personName(s.personId).toLowerCase().includes(q) || s.subject.toLowerCase().includes(q);
    const matchStatus = f.status==="All" || s.status===f.status;
    return matchQ && matchStatus;
  });
  list.sort((a,b)=>a.courtDate.localeCompare(b.courtDate));

  const cards = list.map(s=>{
    const daysOut = daysBetween(fmt(new Date()), s.courtDate);
    return `
    <div class="drone-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:16px;font-weight:800;">${subpoenaLink(s.id)}</div>
          <div style="font-size:12px;color:var(--text-dim);margin:2px 0 8px;">${escapeHtml(personName(s.personId))}</div>
        </div>
        <span class="badge ${subpoenaStatusBadgeClass(s.status)}">${s.status}</span>
      </div>
      <div style="font-size:12.5px;margin-bottom:10px;">${escapeHtml(s.subject)}</div>
      <div style="font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-dim);">Court Date</span><span style="font-weight:600;">${s.courtDate} ${s.courtTime}${s.status==='Active'&&daysOut>=0?' ('+daysOut+'d)':''}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-dim);">Location</span><span style="font-weight:600;text-align:right;max-width:60%;">${escapeHtml(s.courtLocation.split(',')[0])}${s.courtroom?' \u2014 '+escapeHtml(s.courtroom):''}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Acknowledged</span><span style="font-weight:600;color:${s.acknowledgedDate?'var(--green)':'var(--red)'};">${s.acknowledgedDate?'Yes, '+s.acknowledgedDate:'Not yet'}</span></div>
      </div>
      ${(!showAll && !s.acknowledgedDate && s.status==='Active' && can('subpoena_acknowledge')) ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        <button class="btn btn-sm btn-primary" data-ack-subpoena="${s.id}">${ICONS.check} Acknowledge Receipt</button>
      </div>` : ''}
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.gavel}<div class="msg">${showAll ? 'No subpoenas match this filter' : "You don't have any subpoenas on file"}</div></div>`;

  document.getElementById(targetViewId).innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="subFilterQ" title="Filters the subpoenas below as you type, matching case number, staff name, or subject" placeholder="Search case #, name, subject..." style="width:220px;" value="${escapeHtml(f.q)}">
        <select id="subFilterStatus" title="Filter subpoenas to a single status"><option ${f.status==='All'?'selected':''}>All</option>${SUBPOENA_STATUSES.map(st=>`<option ${f.status===st?'selected':''}>${st}</option>`).join('')}</select>
      </div>
      ${(showAll && canManage) ? `<button class="btn btn-primary" id="btnAddSubpoena">${ICONS.plus} New Subpoena</button>` : ''}
    </div>
    <div class="k9-card-grid">${cards}</div>
  `;
  document.getElementById('subFilterQ').addEventListener('input', e=>{SUBPOENA_FILTER.q=e.target.value; renderSubpoenaList(showAll); refocusFilterInput('subFilterQ');});
  document.getElementById('subFilterStatus').addEventListener('change', e=>{SUBPOENA_FILTER.status=e.target.value; renderSubpoenaList(showAll);});
  const addBtn = document.getElementById('btnAddSubpoena');
  if(addBtn) addBtn.addEventListener('click', ()=>openSubpoenaFormModal(null));
  document.querySelectorAll('[data-ack-subpoena]').forEach(b=>b.addEventListener('click', ()=>acknowledgeSubpoena(b.dataset.ackSubpoena, showAll)));
  wireSubpoenaLinks();
}

function acknowledgeSubpoena(id, showAll){
  const s = subpoenaFor(id);
  if(!confirm(`Acknowledge receipt of the subpoena for case ${s.caseNumber}?`)) return;
  s.acknowledgedDate = fmt(new Date());
  s.acknowledgedBy = CURRENT_USER_ID;
  logActivity(`${personName(CURRENT_USER_ID)} acknowledged receipt of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
  persist();
  toast("Receipt acknowledged.");
  renderSubpoenaList(showAll);
}

function openSubpoenaFormModal(existingId){
  const editing = !!existingId;
  const s = editing ? subpoenaFor(existingId) : {
    personId: STATE.personnel[0].id, caseNumber:"", courtDate: fmt(addDays(new Date(),14)), courtTime:"09:00",
    courtLocation: STATE.subpoena.refData.courtLocations[0], courtroom:"", subject:"", status:"Active",
    issuedDate: fmt(new Date()), issuedBy:"", notes:"",
  };
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'New'} Subpoena</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Staff Member</label><select id="fSubPerson">${STATE.personnel.map(p=>`<option value="${p.id}" ${s.personId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Case Number</label><input type="text" id="fSubCase" value="${escapeHtml(s.caseNumber)}" placeholder="e.g. CR26-01234"></div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Court Date</label><input type="date" id="fSubDate" value="${s.courtDate}"></div>
        <div class="form-row"><label>Court Time</label><input type="time" id="fSubTime" value="${s.courtTime}"></div>
        <div class="form-row"><label>Status</label><select id="fSubStatus">${SUBPOENA_STATUSES.map(st=>`<option ${s.status===st?'selected':''}>${st}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Court Location</label><select id="fSubLocation">${STATE.subpoena.refData.courtLocations.map(l=>`<option ${s.courtLocation===l?'selected':''}>${escapeHtml(l)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Courtroom / Department</label><input type="text" id="fSubCourtroom" value="${escapeHtml(s.courtroom||'')}" placeholder="e.g. Dept 3"></div>
      </div>
      <div class="form-row"><label>Subject / Description</label><textarea id="fSubSubject" rows="2">${escapeHtml(s.subject)}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Issued Date</label><input type="date" id="fSubIssuedDate" value="${s.issuedDate}"></div>
        <div class="form-row"><label>Issued By</label><input type="text" id="fSubIssuedBy" value="${escapeHtml(s.issuedBy||'')}" placeholder="e.g. District Attorney's Office"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fSubNotes" rows="2">${escapeHtml(s.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Create Subpoena'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const caseNumber = document.getElementById('fSubCase').value.trim();
    if(!caseNumber){ toast("Enter a case number.", true); return; }
    const status = document.getElementById('fSubStatus').value;
    const data = {
      personId: document.getElementById('fSubPerson').value, caseNumber,
      courtDate: document.getElementById('fSubDate').value, courtTime: document.getElementById('fSubTime').value, status,
      courtLocation: document.getElementById('fSubLocation').value, courtroom: document.getElementById('fSubCourtroom').value.trim(),
      subject: document.getElementById('fSubSubject').value.trim(),
      issuedDate: document.getElementById('fSubIssuedDate').value, issuedBy: document.getElementById('fSubIssuedBy').value.trim(),
      notes: document.getElementById('fSubNotes').value.trim(),
    };
    const conflicts=window.SonoMarziCourtLeaveConflicts?.approvedLeaveForCourt(data.personId,data.courtDate)||[];
    if(conflicts.length){
      if(!confirm('COURT / LEAVE CONFLICT: Approved time off ('+conflicts.map(x=>x.code).join(', ')+') overlaps this court date. The subpoena must still be recorded, but assignment requires coordinator resolution. Save as pending conflict?'))return;
      data.assignmentConflictPending=true;
      data.assignmentConflictRecordedAt=new Date().toISOString();
    } else {
      data.assignmentConflictPending=false;
    }
    if(editing){
      recordFieldChangeSubpoena(s, 'courtDate', s.courtDate, data.courtDate);
      recordFieldChangeSubpoena(s, 'status', s.status, status);
      Object.assign(s, data);
      logActivity(`Updated subpoena for case ${caseNumber} (${personName(data.personId)}).`, "subpoena", s.id);
      toast("Subpoena saved.");
    } else {
      const newS = {id:'sub'+Date.now(), notifiedDate:null, notifiedBy:null, acknowledgedDate:null, acknowledgedBy:null, attachments:[], fieldHistory:[], ...data};
      STATE.subpoena.subpoenas.push(newS);
      logActivity(`Created new subpoena for case ${caseNumber} (${personName(data.personId)}).`, "subpoena", newS.id);
      toast("Subpoena created.");
    }
    persist();
    closeModal();
    renderView(ACTIVE_VIEW);
  };
}

/* =========================================================================
   SUBPOENA DETAIL (Overview / Documents / Change History)
   ========================================================================= */
let SUBPOENA_DETAIL_ID = null;
let SUBPOENA_DETAIL_TAB = 'overview';
function openSubpoenaDetail(id){
  if(!SuiteUX.openRecord("subpoena","subpoena",id)) return;
 SUBPOENA_DETAIL_ID = id; SUBPOENA_DETAIL_TAB = 'overview'; renderSubpoenaDetailModal(); }

function renderSubpoenaDetailModal(){
  const s = subpoenaFor(SUBPOENA_DETAIL_ID);
  if(!s){ closeModal(); return; }
  const tabs = [['overview','Overview'],['documents','Documents'],['history','Change History']];
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-xl';
  box.innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(s.caseNumber)} \u2014 ${escapeHtml(personName(s.personId))}</h3>
        <div style="font-size:11.5px;color:var(--text-dim);">${s.courtDate} ${s.courtTime} &bull; ${escapeHtml(s.courtLocation.split(',')[0])}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${SUBPOENA_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-sub-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="subDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-sub-tab]').forEach(b=>b.addEventListener('click', ()=>{ SUBPOENA_DETAIL_TAB=b.dataset.subTab; renderSubpoenaDetailModal(); }));
  renderSubpoenaDetailTabContent(s);
}

function renderSubpoenaDetailTabContent(s){
  const body = document.getElementById('subDetailBody');
  const canManage = can('subpoena_manage');
  const canNotify = can('subpoena_notify');
  const isOwnSubpoena = s.personId === CURRENT_USER_ID;
  const canAckThis = isOwnSubpoena && can('subpoena_acknowledge');

  if(SUBPOENA_DETAIL_TAB==='overview'){
    body.innerHTML = `
      ${canManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditSubFromDetail">${ICONS.edit} Edit</button>` : ''}
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Staff Member</div><div class="v">${escapeHtml(personName(s.personId))}</div></div>
        <div><div class="k">Case Number</div><div class="v">${escapeHtml(s.caseNumber)}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${subpoenaStatusBadgeClass(s.status)}">${s.status}</span></div></div>
        <div><div class="k">Court Date / Time</div><div class="v">${s.courtDate} ${s.courtTime}</div></div>
        <div><div class="k">Court Location</div><div class="v">${escapeHtml(s.courtLocation)}</div></div>
        <div><div class="k">Courtroom / Department</div><div class="v">${(s.courtroom ? escapeHtml(s.courtroom) : '—')}</div></div>
        <div><div class="k">Issued</div><div class="v">${s.issuedDate} by ${(s.issuedBy ? escapeHtml(s.issuedBy) : '—')}</div></div>
        <div><div class="k">Subject</div><div class="v">${escapeHtml(s.subject)}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notification &amp; Acknowledgment</h2></div>
        <div class="panel-body">
          <div class="detail-grid">
            <div><div class="k">Notified</div><div class="v">${s.notifiedDate ? `Yes, ${s.notifiedDate} by ${escapeHtml(s.notifiedBy)}` : '<span style="color:var(--red);">Not yet notified</span>'}</div></div>
            <div><div class="k">Acknowledged</div><div class="v">${s.acknowledgedDate ? `Yes, ${s.acknowledgedDate}` : '<span style="color:var(--red);">Not yet acknowledged</span>'}</div></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            ${canNotify && !s.notifiedDate ? `<button class="btn btn-sm btn-primary" id="btnNotifySub">${ICONS.bell || ''} Notify Staff Member</button>` : ''}
            ${canAckThis && !s.acknowledgedDate ? `<button class="btn btn-sm btn-primary" id="btnAckSubFromDetail">${ICONS.check} Acknowledge Receipt</button>` : ''}
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">Notifying is logged in-app for this prototype; a production deployment would also send an email/SMS to the staff member.</div>
        </div>
      </div>
    `;
    const editBtn = document.getElementById('btnEditSubFromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>{ closeModal(); openSubpoenaFormModal(s.id); });
    const notifyBtn = document.getElementById('btnNotifySub');
    if(notifyBtn) notifyBtn.addEventListener('click', ()=>{
      s.notifiedDate = fmt(new Date()); s.notifiedBy = personName(CURRENT_USER_ID);
      logActivity(`Notified ${personName(s.personId)} of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
      persist(); toast("Staff member notified."); renderSubpoenaDetailModal();
    });
    const ackBtn = document.getElementById('btnAckSubFromDetail');
    if(ackBtn) ackBtn.addEventListener('click', ()=>{
      s.acknowledgedDate = fmt(new Date()); s.acknowledgedBy = CURRENT_USER_ID;
      logActivity(`${personName(CURRENT_USER_ID)} acknowledged receipt of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
      persist(); toast("Receipt acknowledged."); renderSubpoenaDetailModal();
    });

  } else if(SUBPOENA_DETAIL_TAB==='documents'){
    const canUpload = can('subpoena_document_upload');
    body.innerHTML = `
      ${canUpload ? `
      <div class="form-row"><label>Attach a Document</label>
        <div style="border:2px dashed var(--border);border-radius:10px;padding:14px;text-align:center;cursor:pointer;" id="subDocDropZone">
          <span style="width:26px;height:26px;display:inline-block;color:var(--text-dim);">${ICONS.paperclip}</span>
          <div style="font-size:12.5px;font-weight:700;margin-top:6px;">Drag &amp; drop a file here, or click to browse</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">PDF, image, or document up to 25 MB</div>
          <input type="file" id="subDocFileInput" style="display:none;">
        </div>
      </div>` : ''}
      <table><thead><tr><th>File</th><th>Uploaded</th><th>Size</th><th></th></tr></thead><tbody>
      ${s.attachments.map((a,i)=>`<tr><td><button class="btn-link" data-download-doc="${i}" style="padding:0;border:0;background:none;color:var(--blue);cursor:pointer;font:inherit;text-align:left;">${escapeHtml(a.filename)}</button></td><td>${a.uploadedDate} by ${escapeHtml(a.uploadedBy)}</td><td>${a.sizeKb} KB</td>
        <td style="white-space:nowrap;"><button class="btn btn-sm btn-outline" data-download-doc="${i}">Download</button>${canUpload?` <button class="btn-icon" data-remove-doc="${i}" title="Delete attachment">${ICONS.trash}</button>`:''}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No documents attached yet.</td></tr>`}
      </tbody></table>
    `;
    const dropZone = document.getElementById('subDocDropZone');
    if(dropZone){
      const input = document.getElementById('subDocFileInput');
      const processFile = async (file)=>{
        if(!file) return;
        if(file.size > 25*1024*1024){ toast("That file is larger than 25 MB.", true); return; }
        dropZone.style.pointerEvents='none';
        dropZone.style.opacity='.65';
        try{
          const meta = await AWS_ATTACHMENTS.upload(file, {collection:'subpoena.subpoenas', itemId:s.id});
          s.attachments.push({
            id:'att'+Date.now(),
            ...meta
          });
          logActivity(`Attached document "${file.name}" to subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
          persist();
          await SuiteStore.flush();
          toast("Document uploaded to AWS.");
          renderSubpoenaDetailModal();
        }catch(error){
          toast(error.message || "Attachment upload failed.", true);
        }finally{
          dropZone.style.pointerEvents='';
          dropZone.style.opacity='';
        }
      };
      dropZone.addEventListener('click', ()=>input.click());
      input.addEventListener('change', (e)=>processFile(e.target.files[0]));
      dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--blue)'; });
      dropZone.addEventListener('dragleave', ()=>{ dropZone.style.borderColor='var(--border)'; });
      dropZone.addEventListener('drop', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--border)'; if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); });
    }
    document.querySelectorAll('[data-download-doc]').forEach(b=>b.addEventListener('click', async ()=>{
      const idx = Number(b.dataset.downloadDoc);
      const attachment = s.attachments[idx];
      try{
        await AWS_ATTACHMENTS.download(attachment);
      }catch(error){
        toast(error.message || "Attachment download failed.", true);
      }
    }));

    document.querySelectorAll('[data-remove-doc]').forEach(b=>b.addEventListener('click', async ()=>{
      const idx = Number(b.dataset.removeDoc);
      const removed = s.attachments[idx];
      if(!removed) return;
      b.disabled = true;
      try{
        await AWS_ATTACHMENTS.remove(removed, {collection:'subpoena.subpoenas', itemId:s.id});
        s.attachments.splice(idx,1);
        logActivity(`Removed document "${removed.filename}" from subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
        persist();
        await SuiteStore.flush();
        toast("Attachment deleted.");
        renderSubpoenaDetailModal();
      }catch(error){
        b.disabled = false;
        toast(error.message || "Attachment delete failed.", true);
      }
    }));

  } else if(SUBPOENA_DETAIL_TAB==='history'){
    const rows = s.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}


/* =========================================================================
   AWS ATTACHMENTS
   Private S3 objects are accessed only through short-lived signed URLs.
   Record data stores metadata + storageKey, never the file body itself.
   ========================================================================= */


/* =========================================================================
   MASTER CALENDAR (department-wide, admin-facing)
   ========================================================================= */
let SUB_CAL_YEAR = new Date().getFullYear(), SUB_CAL_MONTH = new Date().getMonth();

function renderMasterCalendarSubpoena(){
  const year = SUB_CAL_YEAR, month = SUB_CAL_MONTH;
  const monthStr = String(month+1).padStart(2,'0');
  const inMonth = STATE.subpoena.subpoenas.filter(s=>s.status!=="Cancelled" && s.courtDate.startsWith(`${year}-${monthStr}`));

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const monthName = firstOfMonth.toLocaleString('en-US', {month:'long'});
  const byDate = {};
  inMonth.forEach(s=>{ (byDate[s.courtDate] = byDate[s.courtDate]||[]).push(s); });

  let cells = '';
  for(let i=0;i<startWeekday;i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2,'0')}`;
    const todays = byDate[dateStr] || [];
    const isToday = dateStr === fmt(new Date());
    cells += `<div class="cal-cell ${isToday?'cal-cell-today':''}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday+d-1)%7]}">${d}</div>
      ${todays.map(s=>`<a href="#" data-cal-event="${s.id}" class="cal-event" style="background:${subpoenaStatusColor(s.status)}22;color:${subpoenaStatusColor(s.status)};border-left:3px solid ${subpoenaStatusColor(s.status)};" title="${escapeHtml(personName(s.personId))} \u2014 ${escapeHtml(s.caseNumber)}">${escapeHtml(personName(s.personId))} \u2014 ${escapeHtml(s.caseNumber)}</a>`).join('')}
    </div>`;
  }

  document.getElementById('view-subpoena-calendar').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn btn-sm btn-outline" data-subcal-nav="prev">&larr;</button>
        <h2 style="margin:0;min-width:170px;text-align:center;">${monthName} ${year}</h2>
        <button class="btn btn-sm btn-outline" data-subcal-nav="next">&rarr;</button>
        <button class="btn btn-sm btn-outline" data-subcal-nav="today">Today</button>
      </div>
      ${can('subpoena_manage') ? `<button class="btn btn-primary btn-sm" id="btnNewSubFromCal">${ICONS.plus} New Subpoena</button>` : ''}
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every subpoena court date across the department, labeled by staff member and case number. Click an event for full details.</div>
    <div class="cal-grid-head">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
  document.querySelectorAll('[data-subcal-nav]').forEach(b=>b.addEventListener('click', ()=>{
    const dir = b.dataset.subcalNav;
    if(dir==='prev'){ SUB_CAL_MONTH--; if(SUB_CAL_MONTH<0){SUB_CAL_MONTH=11;SUB_CAL_YEAR--;} }
    else if(dir==='next'){ SUB_CAL_MONTH++; if(SUB_CAL_MONTH>11){SUB_CAL_MONTH=0;SUB_CAL_YEAR++;} }
    else { SUB_CAL_YEAR = new Date().getFullYear(); SUB_CAL_MONTH = new Date().getMonth(); }
    renderMasterCalendarSubpoena();
  }));
  document.querySelectorAll('[data-cal-event]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openSubpoenaDetail(a.dataset.calEvent); }));
  const newBtn = document.getElementById('btnNewSubFromCal');
  if(newBtn) newBtn.addEventListener('click', ()=>openSubpoenaFormModal(null));
}

/* =========================================================================
   REPORTS & ANALYTICS
   ========================================================================= */
let SUBPOENA_REPORT_FILTERS = { dateFrom:'', dateTo:'', status:'All' };
function renderReports(){
  if(!can('subpoena_reports_view')){
    document.getElementById('view-subpoena-reports').innerHTML = permissionBlockedView("You don't have permission to view Subpoena Mgmt reports in this role.");
    return;
  }
  const canExport = can('subpoena_reports_export');
  const f = SUBPOENA_REPORT_FILTERS;
  const filtered = STATE.subpoena.subpoenas.filter(s=>
    (f.status==='All' || s.status===f.status) && withinDateRange(s.courtDate, f.dateFrom, f.dateTo));
  document.getElementById('view-subpoena-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="subpoenaReportFilterHost"></div></div></div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Compliance Summary</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportSubSummary">${ICONS.download} Export (CSV)</button>` : ''}</div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Active Subpoenas</div><div class="v">${filtered.filter(s=>s.status==='Active').length}</div></div>
          <div><div class="k">Acknowledged</div><div class="v">${filtered.filter(s=>s.acknowledgedDate).length} of ${filtered.length}</div></div>
          <div><div class="k">Notified</div><div class="v">${filtered.filter(s=>s.notifiedDate).length} of ${filtered.length}</div></div>
          <div><div class="k">Cancelled</div><div class="v">${filtered.filter(s=>s.status==='Cancelled').length}</div></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Subpoenas${(f.dateFrom||f.dateTo||f.status!=='All')?' (Filtered)':''}</h2><span class="hint">${filtered.length} of ${STATE.subpoena.subpoenas.length}</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Staff Member</th><th>Case #</th><th>Court Date</th><th>Status</th><th>Notified</th><th>Acknowledged</th></tr></thead><tbody>
        ${filtered.slice().sort((a,b)=>b.courtDate.localeCompare(a.courtDate)).map(s=>`
          <tr><td>${escapeHtml(personName(s.personId))}</td><td>${subpoenaLink(s.id)}</td><td>${s.courtDate}</td>
          <td><span class="badge ${subpoenaStatusBadgeClass(s.status)}">${s.status}</span></td>
          <td>${s.notifiedDate?'Yes':'No'}</td><td>${s.acknowledgedDate?'Yes':'No'}</td></tr>
        `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No subpoenas match these filters.</td></tr>`}
        </tbody></table>
      </div>
    </div>
  `;
  wireSubpoenaLinks();
  renderReportFilterBar(document.getElementById('subpoenaReportFilterHost'), [
    {type:'daterange', keyFrom:'dateFrom', keyTo:'dateTo', label:'Court Date Range'},
    {type:'select', key:'status', label:'Status', options: [...new Set(STATE.subpoena.subpoenas.map(s=>s.status))]},
  ], SUBPOENA_REPORT_FILTERS, renderReports);
  const exportBtn = document.getElementById('btnExportSubSummary');
  if(exportBtn) exportBtn.onclick = ()=>{
    const headers = ["Staff Member","Case #","Court Date","Status","Notified","Acknowledged"];
    const rows = filtered.map(s=>[personName(s.personId), s.caseNumber, s.courtDate, s.status, s.notifiedDate?'Yes':'No', s.acknowledgedDate?'Yes':'No']);
    const csv = [headers, ...rows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'subpoena_report.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Report exported.");
  };
}

/* =========================================================================
   ADMIN: court locations, notification routing, audit log
   ========================================================================= */
let ADMIN_TAB = 'courtLocations';

function renderAdmin(){
  const canManage = can('subpoena_admin_categories');
  const canAudit = can('subpoena_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-subpoena-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){ tabs.push(['courtLocations','Court Locations']); tabs.push(['notifications','Notification Routing']); }
  if(can('subpoena_bulk_import')) tabs.push(['bulkImport','Bulk Import']);
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-subpoena-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab-sub="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodySub"></div>
  `;
  document.querySelectorAll('[data-admin-tab-sub]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTabSub; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBodySub');
  if(ADMIN_TAB==='courtLocations') renderCourtLocationsTab(body);
  else if(ADMIN_TAB==='notifications') renderNotificationRoutingTab(body);
  else if(ADMIN_TAB==='bulkImport') renderBulkImportTab(body, 'subpoena');
  else if(ADMIN_TAB==='audit') renderPlatformAuditLogTab(body);
}

function renderCourtLocationsTab(body){
  const list = STATE.subpoena.refData.courtLocations;
  const usageCheck = (v)=>STATE.subpoena.subpoenas.filter(s=>s.courtLocation===v).length;
  const rows = list.map((v,i)=>{
    const inUse = usageCheck(v);
    return `<tr><td>${escapeHtml(v)}</td><td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-loc="${i}">${ICONS.trash}</button></td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No court locations defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Court Locations &amp; Addresses</h2></div>
      <div class="panel-body">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">These appear as the dropdown choices when creating or editing a subpoena. Include the full address so it's ready to use on court paperwork.</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newLocInput" placeholder="e.g. Washoe County District Court - Dept 2, 75 Court St, Reno NV 89501" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddLoc">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>Court Location</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddLoc').addEventListener('click', ()=>{
    const val = document.getElementById('newLocInput').value.trim();
    if(!val){ toast("Enter a court location first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added court location "${val}".`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-loc]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeLoc); const val = list[idx];
    if(usageCheck(val)>0){ toast(`Can't remove "${val}" \u2014 it's in use.`, true); return; }
    if(!confirm(`Remove "${val}"?`)) return;
    list.splice(idx,1);
    logActivity(`Removed court location "${val}".`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function renderNotificationRoutingTab(body){
  const roleOpts = (sel)=>STATE.roles.map(r=>`<option value="${r.id}" ${sel===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Court Date Approaching Alerts</label><select id="fRouteSubApproach">${roleOpts(STATE.subpoena.notifySettings.courtDateApproachingRoleId)}</select></div>
        <div class="form-row"><label>Unacknowledged Subpoena Alerts</label><select id="fRouteSubUnack">${roleOpts(STATE.subpoena.notifySettings.unacknowledgedRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingSub">Save Routing</button>
      </div>
    </div>
  `;
  document.getElementById('btnSaveRoutingSub').addEventListener('click', ()=>{
    STATE.subpoena.notifySettings.courtDateApproachingRoleId = document.getElementById('fRouteSubApproach').value;
    STATE.subpoena.notifySettings.unacknowledgedRoleId = document.getElementById('fRouteSubUnack').value;
    logActivity("Updated Subpoena Mgmt notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

/* =========================================================================
   MODULE ENTRY POINT
   ========================================================================= */
function startSubpoenaModule(){
  renderNav();
  switchView('subpoena-dashboard');
}
window.SUBPOENA = { start: startSubpoenaModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openSubpoenaDetail };

})();

