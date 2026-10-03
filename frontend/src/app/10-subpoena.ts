/* =========================================================================
   SUBPOENA MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.subpoena and shared roles/personnel)
   Handles assigning, tracking, modifying, and cancelling subpoenas for staff members,
   with document attachments, a notify + acknowledge-receipt workflow, and calendar
   integration (a personal view feeding into Personnel Management's "My Calendar", plus
   its own department-wide master calendar for the module admin).
   ========================================================================= */
(function (): any {
    const SUBPOENA_STATUSES: any = ["Active", "Rescheduled", "Cancelled", "Completed"];
    const DEFAULT_COURT_LOCATIONS: any = [
        "Washoe County District Court - Dept 1, 75 Court St, Reno NV 89501",
        "Washoe County District Court - Dept 4, 75 Court St, Reno NV 89501",
        "Reno Justice Court - Dept 2, 1 S Sierra St, Reno NV 89501",
        "Sparks Justice Court, 1675 E Prater Way, Sparks NV 89434",
        "U.S. District Court, District of Nevada, 400 S Virginia St, Reno NV 89501",
        "Second Judicial District Court - Family Division, 1 S Sierra St, Reno NV 89501",
    ];
    function defaultRefDataSubpoena(): any {
        return { courtLocations: [...DEFAULT_COURT_LOCATIONS] } as any;
    }
    /* =========================================================================
       SEED DATA
       ========================================================================= */
    function seedSubpoenas(): any {
        const today: any = new Date() as any;
        const rows: any = [
            // [personId, caseNumber, daysFromToday, time, locationIdx, courtroom, subject, status, notified, acknowledged, attachments]
            ["p2", "CR26-01894", 14, "09:00", 0, "Dept 1", "State v. Harmon \u2014 Officer testimony re: traffic stop and search incident to arrest", "Active", true, true, 1],
            ["p3", "CR26-02011", 21, "13:30", 2, "Dept 2", "State v. Delgado \u2014 Arresting officer testimony", "Active", true, false, 1],
            ["p1", "CV26-00447", 35, "10:00", 5, "Family Division", "Torres v. Torres \u2014 Records custodian testimony", "Active", true, true, 0],
            ["p6", "CR26-01772", -10, "09:00", 1, "Dept 4", "State v. Whitfield (no relation) \u2014 K9 deployment testimony", "Completed", true, true, 1],
            ["p4", "CR26-02150", 7, "08:30", 0, "Dept 1", "State v. Reyes \u2014 Evidence chain of custody", "Active", false, false, 0],
            ["p5", "CR26-01699", -25, "14:00", 3, "Sparks JC", "State v. Boone \u2014 Traffic citation testimony", "Cancelled", true, false, 0],
            ["p2", "CR26-02203", 45, "09:30", 4, "Federal Ct", "U.S. v. Kessler \u2014 Federal task force operation testimony", "Active", true, false, 0],
        ];
        return rows.map(([personId, caseNumber, daysFromToday, time, locIdx, courtroom, subject, status, notified, acknowledged, attCount]: any, i?: any): any => {
            const courtDate: any = fmt(addDays(today, daysFromToday));
            return {
                id: "sub" + (i + 1), personId, caseNumber, courtDate, courtTime: time,
                courtLocation: DEFAULT_COURT_LOCATIONS[locIdx], courtroom, subject, status,
                issuedDate: fmt(addDays(today, daysFromToday - 30)), issuedBy: "District Attorney's Office",
                notifiedDate: notified ? fmt(addDays(today, daysFromToday - 25)) : null, notifiedBy: notified ? "Fred Marziano" : null,
                acknowledgedDate: acknowledged ? fmt(addDays(today, daysFromToday - 24)) : null, acknowledgedBy: acknowledged ? personId : null,
                attachments: attCount > 0 ? [{ id: "att_" + i + "_1", filename: "Subpoena_" + caseNumber + ".pdf", dataUrl: null, sizeKb: 184, uploadedDate: fmt(addDays(today, daysFromToday - 30)), uploadedBy: "Fred Marziano" } as any] : [],
                fieldHistory: [], notes: ""
            } as any;
        });
    }
    /* =========================================================================
       STATE LIFECYCLE
       ========================================================================= */
    function buildData(): any {
        return {
            subpoenas: seedSubpoenas(),
            refData: defaultRefDataSubpoena(),
            notifications: [],
            notifySettings: { courtDateApproachingRoleId: "role_admin", unacknowledgedRoleId: "role_admin" } as any,
            activity: [],
            dashboardPrefs: {} as any
        } as any;
    }
    function migrateData(): any {
        if (!STATE.subpoena.refData)
            STATE.subpoena.refData = defaultRefDataSubpoena();
        if (!STATE.subpoena.notifications)
            STATE.subpoena.notifications = [];
        if (!STATE.subpoena.dashboardPrefs)
            STATE.subpoena.dashboardPrefs = {} as any;
        if (!STATE.subpoena.notifySettings)
            STATE.subpoena.notifySettings = { courtDateApproachingRoleId: STATE.roles[0].id, unacknowledgedRoleId: STATE.roles[0].id } as any;
        STATE.subpoena.subpoenas.forEach((s?: any): any => {
            if (!s.attachments)
                s.attachments = [];
            if (!s.fieldHistory)
                s.fieldHistory = [];
            if (s.courtroom === undefined)
                s.courtroom = "";
        });
    }
    function logActivity(text?: any, entityType?: any, entityId?: any): any {
        STATE.subpoena.activity.push({ ts: fmt(new Date() as any), text, entityType: entityType || "general", entityId: entityId || null } as any);
        logAuditEntry('Subpoena', text, entityType);
    }
    function subpoenaFor(id?: any): any { return STATE.subpoena.subpoenas.find((s?: any): any => s.id === id); }
    function recordFieldChangeSubpoena(entity?: any, field?: any, oldVal?: any, newVal?: any): any {
        if (JSON.stringify(oldVal) === JSON.stringify(newVal))
            return;
        entity.fieldHistory.push({
            date: fmt(new Date() as any), field, before: oldVal, after: newVal,
            changedBy: (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || 'System'
        } as any);
    }
    function subpoenaStatusColor(status?: any): any {
        return ({ "Active": "var(--blue)", "Rescheduled": "var(--gold)", "Cancelled": "var(--red)", "Completed": "var(--green)" } as any)[status] || "var(--text-dim)";
    }
    function subpoenaStatusBadgeClass(status?: any): any {
        return ({ "Active": "badge-assigned", "Rescheduled": "badge-role", "Cancelled": "badge-missing", "Completed": "badge-available" } as any)[status] || "badge-role";
    }
    /* =========================================================================
       NAV
       ========================================================================= */
    const NAV_ITEMS: any = [
        { id: "subpoena-dashboard", label: "Dashboard", icon: "dashboard", title: "Dashboard", sub: "Subpoena activity and compliance at a glance", requiredAbility: null } as any,
        { id: "subpoena-list", label: "All Subpoenas", icon: "gavel", title: "All Subpoenas", sub: "Every subpoena across the department", requiredAbility: "subpoena_view_all" } as any,
        { id: "subpoena-mine", label: "My Subpoenas", icon: "filetext", title: "My Subpoenas", sub: "Subpoenas assigned to you, with acknowledgment", requiredAbility: "subpoena_view_own" } as any,
        { id: "subpoena-calendar", label: "Master Calendar", icon: "dashboard", title: "Master Calendar", sub: "Every court date across the department, by name", requiredAbility: "subpoena_view_all" } as any,
        { id: "subpoena-reports", label: "Reports", icon: "chart", title: "Reports & Analytics", sub: "Compliance reporting and a configurable report builder", requiredAbility: "subpoena_reports_view" } as any,
        { id: "subpoena-admin", label: "Admin", icon: "gear", title: "Administration", sub: "Court locations and the system audit log", requiredAbility: ["subpoena_admin_categories", "subpoena_admin_audit"] } as any,
    ];
    let ACTIVE_VIEW: any = "subpoena-dashboard";
    function navItemVisible(item?: any): any {
        if (!can('module_subpoena'))
            return false;
        if (!item)
            return false;
        if (!item.requiredAbility)
            return true;
        if (Array.isArray(item.requiredAbility))
            return item.requiredAbility.some((a?: any): any => can(a));
        return can(item.requiredAbility);
    }
    function renderNav(): any {
        const nav: any = (document as any).getElementById('navlist');
        const visibleItems: any = NAV_ITEMS.filter(navItemVisible);
        nav.innerHTML = visibleItems.map((item?: any): any => `
    <button class="navitem ${item.id === ACTIVE_VIEW ? 'active' : ''}" data-nav="${item.id}">
      ${ICONS[item.icon]}<span>${item.label}</span>
    </button>
  `).join('');
        nav.querySelectorAll('[data-nav]').forEach((btn?: any): any => {
            btn.addEventListener('click', (): any => switchView(btn.dataset.nav));
        });
    }
    function switchView(id?: any): any {
        const target: any = NAV_ITEMS.find((n?: any): any => n.id === id);
        if (!target || !navItemVisible(target))
            return;
        if (!SuiteUX.beforeView(id))
            return;
        ACTIVE_VIEW = id;
        (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active'));
        (document as any).getElementById('view-' + id).classList.add('active');
        const meta: any = NAV_ITEMS.find((n?: any): any => n.id === id);
        (document as any).getElementById('page-title').textContent = meta.title;
        (document as any).getElementById('page-sub').textContent = meta.sub;
        renderNav();
        renderView(id);
    }
    function renderView(id?: any): any {
        if (id === "subpoena-dashboard")
            renderDashboard();
        else if (id === "subpoena-list")
            renderSubpoenaList(true);
        else if (id === "subpoena-mine")
            renderSubpoenaList(false);
        else if (id === "subpoena-calendar")
            renderMasterCalendarSubpoena();
        else if (id === "subpoena-reports")
            renderReports();
        else if (id === "subpoena-admin")
            renderAdmin();
    }
    /* =========================================================================
       NOTIFICATIONS
       ========================================================================= */
    function recalcNotifications(): any {
        const today: any = new Date() as any;
        const upcoming: any = [];
        STATE.subpoena.subpoenas.filter((s?: any): any => s.status === "Active").forEach((s?: any): any => {
            const days: any = daysBetween(fmt(today), s.courtDate);
            if (days >= 0 && days <= 7 && !s.acknowledgedDate) {
                upcoming.push({ type: "unacknowledged", entityId: s.id, message: `${personName(s.personId)}'s subpoena for case ${s.caseNumber} has not been acknowledged, and court is in ${days} day(s) (${s.courtDate}).`, recipientRoleId: STATE.subpoena.notifySettings.unacknowledgedRoleId } as any);
            }
            if (days >= 0 && days <= 3) {
                upcoming.push({ type: "court_approaching", entityId: s.id, message: `${personName(s.personId)}'s court date for case ${s.caseNumber} is in ${days} day(s) at ${s.courtLocation.split(',')[0]}.`, recipientRoleId: STATE.subpoena.notifySettings.courtDateApproachingRoleId } as any);
            }
        });
        const prevReadBy: any = {} as any;
        STATE.subpoena.notifications.forEach((n?: any): any => { prevReadBy[n.type + '|' + n.entityId] = n.readBy || []; });
        STATE.subpoena.notifications = upcoming.map((n?: any): any => ({
            id: n.type + '_' + n.entityId, ts: fmt(today),
            type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
            readBy: prevReadBy[n.type + '|' + n.entityId] || []
        } as any));
    }
    function lockedNote(msg?: any): any { return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`; }
    function permissionBlockedView(msg?: any): any {
        return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
    }
    function subpoenaLink(id?: any): any {
        const s: any = subpoenaFor(id);
        return `<a href="#" data-open-subpoena="${id}" class="record-link">${escapeHtml(s ? s.caseNumber : 'Unknown')}</a>`;
    }
    function wireSubpoenaLinks(): any {
        (document as any).querySelectorAll('[data-open-subpoena]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openSubpoenaDetail(a.dataset.openSubpoena); }));
    }
    /* =========================================================================
       DASHBOARD
       ========================================================================= */
    let CHART_REFS_SUBPOENA: any = {} as any;
    function destroyChartsSubpoena(): any { (Object.values(CHART_REFS_SUBPOENA) as any).forEach((c?: any): any => c && c.destroy()); CHART_REFS_SUBPOENA = {} as any; }
    const TOP_WIDGETS: any = [
        { id: "stat_active_subpoenas", label: "Active Subpoenas" } as any,
        { id: "stat_unacknowledged", label: "Unacknowledged" } as any,
        { id: "stat_not_notified", label: "Not Yet Notified" } as any,
        { id: "stat_total_on_file", label: "Total on File" } as any,
    ];
    const EXTRA_WIDGETS: any = [
        { id: "list_upcoming_court_dates", label: "Upcoming Court Dates", defaultSize: "half" } as any,
        { id: "chart_by_status", label: "By Status", defaultSize: "half" } as any,
    ];
    const DEFAULT_EXTRAS: any = EXTRA_WIDGETS.map((w?: any): any => ({ id: w.id, size: w.defaultSize } as any));
    function myWidgetPrefs(): any {
        let p: any = STATE.subpoena.dashboardPrefs[CURRENT_USER_ID];
        const topIds: any = TOP_WIDGETS.map((w?: any): any => w.id), extraIds: any = EXTRA_WIDGETS.map((w?: any): any => w.id);
        if (!p || (!p.topOrder && !p.extras)) {
            p = { topOrder: [...topIds], extras: DEFAULT_EXTRAS.map((e?: any): any => ({ ...e } as any)) } as any;
            STATE.subpoena.dashboardPrefs[CURRENT_USER_ID] = p;
        }
        if (!Array.isArray(p.topOrder))
            p.topOrder = [...topIds];
        if (!Array.isArray(p.extras))
            p.extras = [];
        p.topOrder = [...p.topOrder.filter((id?: any): any => topIds.includes(id)), ...topIds.filter((id?: any): any => !p.topOrder.includes(id))];
        p.extras = p.extras.filter((e?: any): any => e && extraIds.includes(e.id));
        return p;
    }
    function renderWidget(id?: any): any {
        const active: any = STATE.subpoena.subpoenas.filter((s?: any): any => s.status === "Active");
        const upcoming30: any = active.filter((s?: any): any => { const d: any = daysBetween(fmt(new Date() as any), s.courtDate); return d >= 0 && d <= 30; });
        if (id === 'stat_active_subpoenas') {
            return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Active Subpoenas</div><div class="value">${active.length}</div><div class="delta neutral">${upcoming30.length} in the next 30 days</div></button>`;
        }
        if (id === 'stat_unacknowledged') {
            const unacknowledged: any = active.filter((s?: any): any => !s.acknowledgedDate);
            return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Unacknowledged</div><div class="value" style="color:${unacknowledged.length ? 'var(--red)' : 'var(--heading)'}">${unacknowledged.length}</div><div class="delta ${unacknowledged.length ? 'warn' : 'ok'}">Awaiting receipt confirmation</div></button>`;
        }
        if (id === 'stat_not_notified') {
            const notNotified: any = active.filter((s?: any): any => !s.notifiedDate);
            return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Not Yet Notified</div><div class="value" style="color:${notNotified.length ? 'var(--red)' : 'var(--heading)'}">${notNotified.length}</div><div class="delta neutral">Staff not yet contacted</div></button>`;
        }
        if (id === 'stat_total_on_file') {
            return `<button class="stat-card dash-clickable" data-nav-dest="subpoena-list"><div class="label">Total on File</div><div class="value">${STATE.subpoena.subpoenas.length}</div></button>`;
        }
        if (id === 'list_upcoming_court_dates') {
            const rows: any = upcoming30.slice().sort((a?: any, b?: any): any => a.courtDate.localeCompare(b.courtDate)).map((s?: any): any => `<tr><td>${escapeHtml(personName(s.personId))}</td><td>${subpoenaLink(s.id)}</td><td>${s.courtDate} ${s.courtTime}</td><td>${s.acknowledgedDate ? '<span class="badge badge-available">Acknowledged</span>' : '<span class="badge badge-missing">Not Acknowledged</span>'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No court dates in the next 30 days.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Upcoming Court Dates</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Staff Member</th><th>Case #</th><th>Court Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'chart_by_status') {
            return `<div class="panel"><div class="panel-head"><h2>By Status</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartSubpoenaStatus"></canvas></div></div></div>`;
        }
        return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
    }
    const DASH_SIZE_LABELS: any = { quarter: '\u00bc', half: '\u00bd', threeQuarter: '\u00be', full: 'Full' } as any;
    function renderTopWidget(id?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}">
    <div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>
    ${renderWidget(id)}
  </div>`;
    }
    function renderExtraWidget(id?: any, size?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}">
    <div class="dash-widget-toolbar">
      <span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span>
      <button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size] || '\u00bd'}</button>
      <button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button>
    </div>
    ${renderWidget(id)}
  </div>`;
    }
    function wireDashDragDrop(zone?: any, orderedArray?: any, isExtras?: any): any {
        if (!zone)
            return;
        let draggedId: any = null;
        zone.querySelectorAll('.dash-drag-handle').forEach((handle?: any): any => {
            handle.setAttribute('draggable', 'true');
            handle.addEventListener('dragstart', (e?: any): any => {
                const card: any = handle.closest('[data-widget-id]');
                if (!card)
                    return;
                draggedId = card.dataset.widgetId;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                try {
                    e.dataTransfer.setDragImage(card, 24, 24);
                }
                catch (err: any) { }
            });
            handle.addEventListener('dragend', (): any => {
                zone.querySelectorAll('.dash-widget').forEach((c?: any): any => c.classList.remove('dragging', 'dash-drop-target'));
                draggedId = null;
            });
        });
        zone.querySelectorAll('[data-widget-id]').forEach((card?: any): any => {
            card.addEventListener('dragover', (e?: any): any => {
                if (!draggedId || draggedId === card.dataset.widgetId)
                    return;
                e.preventDefault();
                card.classList.add('dash-drop-target');
            });
            card.addEventListener('dragleave', (): any => card.classList.remove('dash-drop-target'));
            card.addEventListener('drop', (e?: any): any => {
                e.preventDefault();
                card.classList.remove('dash-drop-target');
                const targetId: any = card.dataset.widgetId;
                if (!draggedId || draggedId === targetId)
                    return;
                if (isExtras) {
                    const fromIdx: any = orderedArray.findIndex((x?: any): any => x.id === draggedId);
                    const toIdx: any = orderedArray.findIndex((x?: any): any => x.id === targetId);
                    if (fromIdx < 0 || toIdx < 0)
                        return;
                    const [moved]: any = orderedArray.splice(fromIdx, 1);
                    orderedArray.splice(toIdx, 0, moved);
                }
                else {
                    const fromIdx: any = orderedArray.indexOf(draggedId);
                    const toIdx: any = orderedArray.indexOf(targetId);
                    if (fromIdx < 0 || toIdx < 0)
                        return;
                    orderedArray.splice(fromIdx, 1);
                    orderedArray.splice(toIdx, 0, draggedId);
                }
                persist();
                renderDashboard();
            });
        });
    }
    function openCustomizeDashboardModal(): any {
        const prefs: any = myWidgetPrefs();
        const enabled: any = new Set(prefs.extras.map((e?: any): any => e.id));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add / Remove Widgets</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Check the widgets you want on your dashboard. Once added, drag any widget's handle to reposition it, and use its resize button to change how much room it takes up.</div>
      ${EXTRA_WIDGETS.map((w?: any): any => `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">
        <input type="checkbox" class="widgetCheck" data-widget-id="${w.id}" ${enabled.has(w.id) ? 'checked' : ''} style="width:auto;">
        <span style="flex:1;font-size:13px;">${escapeHtml(w.label)}</span>
      </div>`).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const checked: any = Array.from((document as any).querySelectorAll('.widgetCheck')).filter((c?: any): any => c.checked).map((c?: any): any => c.dataset.widgetId);
            const stillThere: any = prefs.extras.filter((e?: any): any => checked.includes(e.id));
            const added: any = checked.filter((id?: any): any => !prefs.extras.some((e?: any): any => e.id === id)).map((id?: any): any => ({ id, size: (EXTRA_WIDGETS.find((w?: any): any => w.id === id) || {} as any).defaultSize || 'half' } as any));
            prefs.extras = [...stillThere, ...added];
            logActivity(`Customized personal Subpoena dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
            persist();
            toast("Dashboard saved.");
            closeModal();
            renderDashboard();
        };
    }
    function renderDashboard(): any {
        recalcNotifications();
        const prefs: any = myWidgetPrefs();
        const root: any = (document as any).getElementById('view-subpoena-dashboard');
        root.innerHTML = `
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Drag the handle on any card to rearrange it. This layout is saved to your account only.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map((id?: any): any => renderTopWidget(id)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map((e?: any): any => renderExtraWidget(e.id, e.size)).join('')}
    </div>
  `;
        root.querySelectorAll('[data-nav-dest]').forEach((b?: any): any => b.addEventListener('click', (): any => switchView(b.dataset.navDest)));
        destroyChartsSubpoena();
        if (prefs.extras.some((e?: any): any => e.id === 'chart_by_status')) {
            const byStatus: any = {} as any;
            SUBPOENA_STATUSES.forEach((s?: any): any => byStatus[s] = 0);
            STATE.subpoena.subpoenas.forEach((s?: any): any => byStatus[s.status] = (byStatus[s.status] || 0) + 1);
            CHART_REFS_SUBPOENA.status = safeChart('chartSubpoenaStatus', {
                type: 'bar',
                data: { labels: Object.keys(byStatus) as any, datasets: [{ label: 'Subpoenas', data: Object.values(byStatus) as any, backgroundColor: '#134DD1' } as any] } as any,
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any
            } as any);
        }
        wireSubpoenaLinks();
        wireDashDragDrop(root.querySelector('#dashTopZone'), prefs.topOrder, false);
        wireDashDragDrop(root.querySelector('#dashExtrasZone'), prefs.extras, true);
        root.querySelectorAll('[data-widget-size-cycle]').forEach((b?: any): any => b.addEventListener('click', (e?: any): any => {
            e.preventDefault();
            e.stopPropagation();
            const entry: any = prefs.extras.find((x?: any): any => x.id === b.dataset.widgetSizeCycle);
            if (!entry)
                return;
            const order: any = ['quarter', 'half', 'threeQuarter', 'full'];
            entry.size = order[(order.indexOf(entry.size) + 1) % order.length];
            persist();
            renderDashboard();
        }));
        root.querySelectorAll('[data-widget-remove]').forEach((b?: any): any => b.addEventListener('click', (e?: any): any => {
            e.preventDefault();
            e.stopPropagation();
            prefs.extras = prefs.extras.filter((x?: any): any => x.id !== b.dataset.widgetRemove);
            persist();
            renderDashboard();
        }));
        const custBtn: any = root.querySelector('#btnCustomizeDashboard');
        if (custBtn)
            custBtn.addEventListener('click', openCustomizeDashboardModal);
    }
    /* =========================================================================
       SUBPOENA LIST (shared by "All Subpoenas" and "My Subpoenas")
       ========================================================================= */
    let SUBPOENA_FILTER: any = { q: "", status: "All" } as any;
    function renderSubpoenaList(showAll?: any): any {
        const canViewAll: any = can('subpoena_view_all');
        const canViewOwn: any = can('subpoena_view_own');
        if (showAll && !canViewAll) {
            (document as any).getElementById('view-subpoena-list').innerHTML = permissionBlockedView("You don't have permission to view every subpoena in this role.");
            return;
        }
        if (!showAll && !canViewOwn) {
            (document as any).getElementById('view-subpoena-mine').innerHTML = permissionBlockedView("You don't have permission to view your subpoenas in this role.");
            return;
        }
        const canManage: any = can('subpoena_manage');
        const targetViewId: any = showAll ? 'view-subpoena-list' : 'view-subpoena-mine';
        const f: any = SUBPOENA_FILTER;
        let list: any = STATE.subpoena.subpoenas.filter((s?: any): any => showAll || s.personId === CURRENT_USER_ID);
        list = list.filter((s?: any): any => {
            const q: any = f.q.toLowerCase();
            const matchQ: any = !q || s.caseNumber.toLowerCase().includes(q) || personName(s.personId).toLowerCase().includes(q) || s.subject.toLowerCase().includes(q);
            const matchStatus: any = f.status === "All" || s.status === f.status;
            return matchQ && matchStatus;
        });
        list.sort((a?: any, b?: any): any => a.courtDate.localeCompare(b.courtDate));
        const cards: any = list.map((s?: any): any => {
            const daysOut: any = daysBetween(fmt(new Date() as any), s.courtDate);
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
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-dim);">Court Date</span><span style="font-weight:600;">${s.courtDate} ${s.courtTime}${s.status === 'Active' && daysOut >= 0 ? ' (' + daysOut + 'd)' : ''}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-dim);">Location</span><span style="font-weight:600;text-align:right;max-width:60%;">${escapeHtml(s.courtLocation.split(',')[0])}${s.courtroom ? ' \u2014 ' + escapeHtml(s.courtroom) : ''}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Acknowledged</span><span style="font-weight:600;color:${s.acknowledgedDate ? 'var(--green)' : 'var(--red)'};">${s.acknowledgedDate ? 'Yes, ' + s.acknowledgedDate : 'Not yet'}</span></div>
      </div>
      ${(!showAll && !s.acknowledgedDate && s.status === 'Active' && can('subpoena_acknowledge')) ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        <button class="btn btn-sm btn-primary" data-ack-subpoena="${s.id}">${ICONS.check} Acknowledge Receipt</button>
      </div>` : ''}
    </div>`;
        }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.gavel}<div class="msg">${showAll ? 'No subpoenas match this filter' : "You don't have any subpoenas on file"}</div></div>`;
        (document as any).getElementById(targetViewId).innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="subFilterQ" title="Filters the subpoenas below as you type, matching case number, staff name, or subject" placeholder="Search case #, name, subject..." style="width:220px;" value="${escapeHtml(f.q)}">
        <select id="subFilterStatus" title="Filter subpoenas to a single status"><option ${f.status === 'All' ? 'selected' : ''}>All</option>${SUBPOENA_STATUSES.map((st?: any): any => `<option ${f.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
      </div>
      ${(showAll && canManage) ? `<button class="btn btn-primary" id="btnAddSubpoena">${ICONS.plus} New Subpoena</button>` : ''}
    </div>
    <div class="k9-card-grid">${cards}</div>
  `;
        (document as any).getElementById('subFilterQ').addEventListener('input', (e?: any): any => { SUBPOENA_FILTER.q = e.target.value; renderSubpoenaList(showAll); refocusFilterInput('subFilterQ'); });
        (document as any).getElementById('subFilterStatus').addEventListener('change', (e?: any): any => { SUBPOENA_FILTER.status = e.target.value; renderSubpoenaList(showAll); });
        const addBtn: any = (document as any).getElementById('btnAddSubpoena');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openSubpoenaFormModal(null));
        (document as any).querySelectorAll('[data-ack-subpoena]').forEach((b?: any): any => b.addEventListener('click', (): any => acknowledgeSubpoena(b.dataset.ackSubpoena, showAll)));
        wireSubpoenaLinks();
    }
    function acknowledgeSubpoena(id?: any, showAll?: any): any {
        const s: any = subpoenaFor(id);
        if (!confirm(`Acknowledge receipt of the subpoena for case ${s.caseNumber}?`))
            return;
        s.acknowledgedDate = fmt(new Date() as any);
        s.acknowledgedBy = CURRENT_USER_ID;
        logActivity(`${personName(CURRENT_USER_ID)} acknowledged receipt of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
        persist();
        toast("Receipt acknowledged.");
        renderSubpoenaList(showAll);
    }
    function openSubpoenaFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const s: any = editing ? subpoenaFor(existingId) : {
            personId: STATE.personnel[0].id, caseNumber: "", courtDate: fmt(addDays(new Date() as any, 14)), courtTime: "09:00",
            courtLocation: STATE.subpoena.refData.courtLocations[0], courtroom: "", subject: "", status: "Active",
            issuedDate: fmt(new Date() as any), issuedBy: "", notes: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'New'} Subpoena</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Staff Member</label><select id="fSubPerson">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${s.personId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Case Number</label><input type="text" id="fSubCase" value="${escapeHtml(s.caseNumber)}" placeholder="e.g. CR26-01234"></div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Court Date</label><input type="date" id="fSubDate" value="${s.courtDate}"></div>
        <div class="form-row"><label>Court Time</label><input type="time" id="fSubTime" value="${s.courtTime}"></div>
        <div class="form-row"><label>Status</label><select id="fSubStatus">${SUBPOENA_STATUSES.map((st?: any): any => `<option ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Court Location</label><select id="fSubLocation">${STATE.subpoena.refData.courtLocations.map((l?: any): any => `<option ${s.courtLocation === l ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Courtroom / Department</label><input type="text" id="fSubCourtroom" value="${escapeHtml(s.courtroom || '')}" placeholder="e.g. Dept 3"></div>
      </div>
      <div class="form-row"><label>Subject / Description</label><textarea id="fSubSubject" rows="2">${escapeHtml(s.subject)}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Issued Date</label><input type="date" id="fSubIssuedDate" value="${s.issuedDate}"></div>
        <div class="form-row"><label>Issued By</label><input type="text" id="fSubIssuedBy" value="${escapeHtml(s.issuedBy || '')}" placeholder="e.g. District Attorney's Office"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fSubNotes" rows="2">${escapeHtml(s.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Create Subpoena'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const caseNumber: any = (document as any).getElementById('fSubCase').value.trim();
            if (!caseNumber) {
                toast("Enter a case number.", true);
                return;
            }
            const status: any = (document as any).getElementById('fSubStatus').value;
            const data: any = {
                personId: (document as any).getElementById('fSubPerson').value, caseNumber,
                courtDate: (document as any).getElementById('fSubDate').value, courtTime: (document as any).getElementById('fSubTime').value, status,
                courtLocation: (document as any).getElementById('fSubLocation').value, courtroom: (document as any).getElementById('fSubCourtroom').value.trim(),
                subject: (document as any).getElementById('fSubSubject').value.trim(),
                issuedDate: (document as any).getElementById('fSubIssuedDate').value, issuedBy: (document as any).getElementById('fSubIssuedBy').value.trim(),
                notes: (document as any).getElementById('fSubNotes').value.trim()
            } as any;
            if (editing) {
                recordFieldChangeSubpoena(s, 'courtDate', s.courtDate, data.courtDate);
                recordFieldChangeSubpoena(s, 'status', s.status, status);
                Object.assign(s, data);
                logActivity(`Updated subpoena for case ${caseNumber} (${personName(data.personId)}).`, "subpoena", s.id);
                toast("Subpoena saved.");
            }
            else {
                const newS: any = { id: 'sub' + Date.now(), notifiedDate: null, notifiedBy: null, acknowledgedDate: null, acknowledgedBy: null, attachments: [], fieldHistory: [], ...data } as any;
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
    let SUBPOENA_DETAIL_ID: any = null;
    let SUBPOENA_DETAIL_TAB: any = 'overview';
    function openSubpoenaDetail(id?: any): any {
        if (!SuiteUX.openRecord("subpoena", "subpoena", id))
            return;
        SUBPOENA_DETAIL_ID = id;
        SUBPOENA_DETAIL_TAB = 'overview';
        renderSubpoenaDetailModal();
    }
    function renderSubpoenaDetailModal(): any {
        const s: any = subpoenaFor(SUBPOENA_DETAIL_ID);
        if (!s) {
            closeModal();
            return;
        }
        const tabs: any = [['overview', 'Overview'], ['documents', 'Documents'], ['history', 'Change History']];
        const box: any = (document as any).getElementById('modalBox');
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
      ${tabs.map(([tid, label]: any): any => `<button class="btn btn-sm ${SUBPOENA_DETAIL_TAB === tid ? 'btn-primary' : 'btn-outline'}" data-sub-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="subDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-sub-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { SUBPOENA_DETAIL_TAB = b.dataset.subTab; renderSubpoenaDetailModal(); }));
        renderSubpoenaDetailTabContent(s);
    }
    function renderSubpoenaDetailTabContent(s?: any): any {
        const body: any = (document as any).getElementById('subDetailBody');
        const canManage: any = can('subpoena_manage');
        const canNotify: any = can('subpoena_notify');
        const isOwnSubpoena: any = s.personId === CURRENT_USER_ID;
        const canAckThis: any = isOwnSubpoena && can('subpoena_acknowledge');
        if (SUBPOENA_DETAIL_TAB === 'overview') {
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
            const editBtn: any = (document as any).getElementById('btnEditSubFromDetail');
            if (editBtn)
                editBtn.addEventListener('click', (): any => { closeModal(); openSubpoenaFormModal(s.id); });
            const notifyBtn: any = (document as any).getElementById('btnNotifySub');
            if (notifyBtn)
                notifyBtn.addEventListener('click', (): any => {
                    s.notifiedDate = fmt(new Date() as any);
                    s.notifiedBy = personName(CURRENT_USER_ID);
                    logActivity(`Notified ${personName(s.personId)} of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
                    persist();
                    toast("Staff member notified.");
                    renderSubpoenaDetailModal();
                });
            const ackBtn: any = (document as any).getElementById('btnAckSubFromDetail');
            if (ackBtn)
                ackBtn.addEventListener('click', (): any => {
                    s.acknowledgedDate = fmt(new Date() as any);
                    s.acknowledgedBy = CURRENT_USER_ID;
                    logActivity(`${personName(CURRENT_USER_ID)} acknowledged receipt of subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
                    persist();
                    toast("Receipt acknowledged.");
                    renderSubpoenaDetailModal();
                });
        }
        else if (SUBPOENA_DETAIL_TAB === 'documents') {
            const canUpload: any = can('subpoena_document_upload');
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
      ${s.attachments.map((a?: any, i?: any): any => `<tr><td><button class="btn-link" data-download-doc="${i}" style="padding:0;border:0;background:none;color:var(--blue);cursor:pointer;font:inherit;text-align:left;">${escapeHtml(a.filename)}</button></td><td>${a.uploadedDate} by ${escapeHtml(a.uploadedBy)}</td><td>${a.sizeKb} KB</td>
        <td style="white-space:nowrap;"><button class="btn btn-sm btn-outline" data-download-doc="${i}">Download</button>${canUpload ? ` <button class="btn-icon" data-remove-doc="${i}" title="Delete attachment">${ICONS.trash}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No documents attached yet.</td></tr>`}
      </tbody></table>
    `;
            const dropZone: any = (document as any).getElementById('subDocDropZone');
            if (dropZone) {
                const input: any = (document as any).getElementById('subDocFileInput');
                const processFile: any = async (file?: any): Promise<any> => {
                    if (!file)
                        return;
                    if (file.size > 25 * 1024 * 1024) {
                        toast("That file is larger than 25 MB.", true);
                        return;
                    }
                    dropZone.style.pointerEvents = 'none';
                    dropZone.style.opacity = '.65';
                    try {
                        const meta: any = await AWS_ATTACHMENTS.upload(file);
                        s.attachments.push({
                            id: 'att' + Date.now(),
                            ...meta
                        } as any);
                        logActivity(`Attached document "${file.name}" to subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
                        persist();
                        await SuiteStore.flush();
                        toast("Document uploaded to AWS.");
                        renderSubpoenaDetailModal();
                    }
                    catch (error: any) {
                        toast(error.message || "Attachment upload failed.", true);
                    }
                    finally {
                        dropZone.style.pointerEvents = '';
                        dropZone.style.opacity = '';
                    }
                };
                dropZone.addEventListener('click', (): any => input.click());
                input.addEventListener('change', (e?: any): any => processFile(e.target.files[0]));
                dropZone.addEventListener('dragover', (e?: any): any => { e.preventDefault(); dropZone.style.borderColor = 'var(--blue)'; });
                dropZone.addEventListener('dragleave', (): any => { dropZone.style.borderColor = 'var(--border)'; });
                dropZone.addEventListener('drop', (e?: any): any => { e.preventDefault(); dropZone.style.borderColor = 'var(--border)'; if (e.dataTransfer.files[0])
                    processFile(e.dataTransfer.files[0]); });
            }
            (document as any).querySelectorAll('[data-download-doc]').forEach((b?: any): any => b.addEventListener('click', async (): Promise<any> => {
                const idx: any = Number(b.dataset.downloadDoc);
                const attachment: any = s.attachments[idx];
                try {
                    await AWS_ATTACHMENTS.download(attachment);
                }
                catch (error: any) {
                    toast(error.message || "Attachment download failed.", true);
                }
            }));
            (document as any).querySelectorAll('[data-remove-doc]').forEach((b?: any): any => b.addEventListener('click', async (): Promise<any> => {
                const idx: any = Number(b.dataset.removeDoc);
                const removed: any = s.attachments[idx];
                if (!removed)
                    return;
                b.disabled = true;
                try {
                    await AWS_ATTACHMENTS.remove(removed);
                    s.attachments.splice(idx, 1);
                    logActivity(`Removed document "${removed.filename}" from subpoena for case ${s.caseNumber}.`, "subpoena", s.id);
                    persist();
                    await SuiteStore.flush();
                    toast("Attachment deleted.");
                    renderSubpoenaDetailModal();
                }
                catch (error: any) {
                    b.disabled = false;
                    toast(error.message || "Attachment delete failed.", true);
                }
            }));
        }
        else if (SUBPOENA_DETAIL_TAB === 'history') {
            const rows: any = s.fieldHistory.slice().reverse().map((h?: any): any => `
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
    const AWS_ATTACHMENTS: any = ((): any => {
        const apiBase: any = (window as any).SonoMarziConfig.apiBase;
        const tokenKey: any = 'sonomarzi.aws.id_token';
        function token(): any {
            return sessionStorage.getItem(tokenKey);
        }
        function context(): any {
            const ctx: any = SuiteStore.remoteContext?.() || {} as any;
            if (!ctx.tenantId || !ctx.agencyId) {
                throw Error('Choose an agency workspace first.');
            }
            return ctx;
        }
        async function api(path?: any, body?: any): Promise<any> {
            const idToken: any = token();
            if (!idToken)
                throw Error('AWS Cognito session is not available.');
            const res: any = await fetch(`${apiBase}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                } as any,
                body: JSON.stringify(body)
            } as any);
            const text: any = await res.text();
            let data: any = null;
            try {
                data = text ? JSON.parse(text) : {} as any;
            }
            catch {
                data = { raw: text } as any;
            }
            if (!res.ok) {
                throw Error(data?.error || data?.message || `Attachment request failed (${res.status}).`);
            }
            return data;
        }
        async function upload(file?: any): Promise<any> {
            if (!file || !file.size)
                throw Error('Choose a file first.');
            if (file.size > 25 * 1024 * 1024)
                throw Error('Attachments are limited to 25 MB.');
            const ctx: any = context();
            const reservation: any = await api('/attachments/upload-url', {
                tenant_id: ctx.tenantId,
                agency_id: ctx.agencyId,
                file_name: file.name,
                content_type: file.type || 'application/octet-stream',
                size_bytes: file.size
            } as any);
            const put: any = await fetch(reservation.upload_url, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                } as any,
                body: file
            } as any);
            if (!put.ok) {
                throw Error(`S3 upload failed (${put.status}).`);
            }
            return {
                storageKey: reservation.key,
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                sizeBytes: file.size,
                sizeKb: Math.max(1, Math.round(file.size / 1024)),
                uploadedDate: fmt(new Date() as any),
                uploadedBy: personName(CURRENT_USER_ID)
            } as any;
        }
        async function signedUrl(attachment?: any): Promise<any> {
            if (attachment?.storageKey) {
                const ctx: any = context();
                const signed: any = await api('/attachments/download-url', {
                    tenant_id: ctx.tenantId,
                    agency_id: ctx.agencyId,
                    key: attachment.storageKey
                } as any);
                return signed.download_url;
            }
            if (attachment?.dataUrl)
                return attachment.dataUrl;
            throw Error('This attachment does not have a downloadable file.');
        }
        async function download(attachment?: any): Promise<any> {
            const url: any = await signedUrl(attachment);
            (window as any).open(url, '_blank', 'noopener');
        }
        async function remove(attachment?: any): Promise<any> {
            if (!attachment?.storageKey)
                return;
            const ctx: any = context();
            await api('/attachments/delete', {
                tenant_id: ctx.tenantId,
                agency_id: ctx.agencyId,
                key: attachment.storageKey
            } as any);
        }
        return { upload, signedUrl, download, remove } as any;
    })();
    (window as any).AWS_ATTACHMENTS = AWS_ATTACHMENTS;
    /* =========================================================================
       MASTER CALENDAR (department-wide, admin-facing)
       ========================================================================= */
    let SUB_CAL_YEAR: any = (new Date() as any).getFullYear(), SUB_CAL_MONTH: any = (new Date() as any).getMonth();
    function renderMasterCalendarSubpoena(): any {
        const year: any = SUB_CAL_YEAR, month: any = SUB_CAL_MONTH;
        const monthStr: any = String(month + 1).padStart(2, '0');
        const inMonth: any = STATE.subpoena.subpoenas.filter((s?: any): any => s.status !== "Cancelled" && s.courtDate.startsWith(`${year}-${monthStr}`));
        const firstOfMonth: any = new Date(year, month, 1) as any;
        const daysInMonth: any = (new Date(year, month + 1, 0) as any).getDate();
        const startWeekday: any = firstOfMonth.getDay();
        const monthName: any = firstOfMonth.toLocaleString('en-US', { month: 'long' } as any);
        const byDate: any = {} as any;
        inMonth.forEach((s?: any): any => { (byDate[s.courtDate] = byDate[s.courtDate] || []).push(s); });
        let cells: any = '';
        for (let i: any = 0; i < startWeekday; i++)
            cells += `<div class="cal-cell cal-cell-empty"></div>`;
        for (let d: any = 1; d <= daysInMonth; d++) {
            const dateStr: any = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
            const todays: any = byDate[dateStr] || [];
            const isToday: any = dateStr === fmt(new Date() as any);
            cells += `<div class="cal-cell ${isToday ? 'cal-cell-today' : ''}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday + d - 1) % 7]}">${d}</div>
      ${todays.map((s?: any): any => `<a href="#" data-cal-event="${s.id}" class="cal-event" style="background:${subpoenaStatusColor(s.status)}22;color:${subpoenaStatusColor(s.status)};border-left:3px solid ${subpoenaStatusColor(s.status)};" title="${escapeHtml(personName(s.personId))} \u2014 ${escapeHtml(s.caseNumber)}">${escapeHtml(personName(s.personId))} \u2014 ${escapeHtml(s.caseNumber)}</a>`).join('')}
    </div>`;
        }
        (document as any).getElementById('view-subpoena-calendar').innerHTML = `
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
    <div class="cal-grid-head">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d?: any): any => `<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
        (document as any).querySelectorAll('[data-subcal-nav]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const dir: any = b.dataset.subcalNav;
            if (dir === 'prev') {
                SUB_CAL_MONTH--;
                if (SUB_CAL_MONTH < 0) {
                    SUB_CAL_MONTH = 11;
                    SUB_CAL_YEAR--;
                }
            }
            else if (dir === 'next') {
                SUB_CAL_MONTH++;
                if (SUB_CAL_MONTH > 11) {
                    SUB_CAL_MONTH = 0;
                    SUB_CAL_YEAR++;
                }
            }
            else {
                SUB_CAL_YEAR = (new Date() as any).getFullYear();
                SUB_CAL_MONTH = (new Date() as any).getMonth();
            }
            renderMasterCalendarSubpoena();
        }));
        (document as any).querySelectorAll('[data-cal-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openSubpoenaDetail(a.dataset.calEvent); }));
        const newBtn: any = (document as any).getElementById('btnNewSubFromCal');
        if (newBtn)
            newBtn.addEventListener('click', (): any => openSubpoenaFormModal(null));
    }
    /* =========================================================================
       REPORTS & ANALYTICS
       ========================================================================= */
    let SUBPOENA_REPORT_FILTERS: any = { dateFrom: '', dateTo: '', status: 'All' } as any;
    function renderReports(): any {
        if (!can('subpoena_reports_view')) {
            (document as any).getElementById('view-subpoena-reports').innerHTML = permissionBlockedView("You don't have permission to view Subpoena Mgmt reports in this role.");
            return;
        }
        const canExport: any = can('subpoena_reports_export');
        const f: any = SUBPOENA_REPORT_FILTERS;
        const filtered: any = STATE.subpoena.subpoenas.filter((s?: any): any => (f.status === 'All' || s.status === f.status) && withinDateRange(s.courtDate, f.dateFrom, f.dateTo));
        (document as any).getElementById('view-subpoena-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="subpoenaReportFilterHost"></div></div></div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Compliance Summary</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportSubSummary">${ICONS.download} Export (CSV)</button>` : ''}</div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Active Subpoenas</div><div class="v">${filtered.filter((s?: any): any => s.status === 'Active').length}</div></div>
          <div><div class="k">Acknowledged</div><div class="v">${filtered.filter((s?: any): any => s.acknowledgedDate).length} of ${filtered.length}</div></div>
          <div><div class="k">Notified</div><div class="v">${filtered.filter((s?: any): any => s.notifiedDate).length} of ${filtered.length}</div></div>
          <div><div class="k">Cancelled</div><div class="v">${filtered.filter((s?: any): any => s.status === 'Cancelled').length}</div></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Subpoenas${(f.dateFrom || f.dateTo || f.status !== 'All') ? ' (Filtered)' : ''}</h2><span class="hint">${filtered.length} of ${STATE.subpoena.subpoenas.length}</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Staff Member</th><th>Case #</th><th>Court Date</th><th>Status</th><th>Notified</th><th>Acknowledged</th></tr></thead><tbody>
        ${filtered.slice().sort((a?: any, b?: any): any => b.courtDate.localeCompare(a.courtDate)).map((s?: any): any => `
          <tr><td>${escapeHtml(personName(s.personId))}</td><td>${subpoenaLink(s.id)}</td><td>${s.courtDate}</td>
          <td><span class="badge ${subpoenaStatusBadgeClass(s.status)}">${s.status}</span></td>
          <td>${s.notifiedDate ? 'Yes' : 'No'}</td><td>${s.acknowledgedDate ? 'Yes' : 'No'}</td></tr>
        `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No subpoenas match these filters.</td></tr>`}
        </tbody></table>
      </div>
    </div>
  `;
        wireSubpoenaLinks();
        renderReportFilterBar((document as any).getElementById('subpoenaReportFilterHost'), [
            { type: 'daterange', keyFrom: 'dateFrom', keyTo: 'dateTo', label: 'Court Date Range' } as any,
            { type: 'select', key: 'status', label: 'Status', options: [...new Set(STATE.subpoena.subpoenas.map((s?: any): any => s.status))] } as any,
        ], SUBPOENA_REPORT_FILTERS, renderReports);
        const exportBtn: any = (document as any).getElementById('btnExportSubSummary');
        if (exportBtn)
            exportBtn.onclick = (): any => {
                const headers: any = ["Staff Member", "Case #", "Court Date", "Status", "Notified", "Acknowledged"];
                const rows: any = filtered.map((s?: any): any => [personName(s.personId), s.caseNumber, s.courtDate, s.status, s.notifiedDate ? 'Yes' : 'No', s.acknowledgedDate ? 'Yes' : 'No']);
                const csv: any = [headers, ...rows].map((r?: any): any => r.map((v?: any): any => csvSafeCell(v)).join(',')).join('\\n');
                const blob: any = new Blob([csv], { type: 'text/csv' } as any);
                const url: any = URL.createObjectURL(blob);
                const a: any = (document as any).createElement('a');
                a.href = url;
                a.download = 'subpoena_report.csv';
                (document as any).body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast("Report exported.");
            };
    }
    /* =========================================================================
       ADMIN: court locations, notification routing, audit log
       ========================================================================= */
    let ADMIN_TAB: any = 'courtLocations';
    function renderAdmin(): any {
        const canManage: any = can('subpoena_admin_categories');
        const canAudit: any = can('subpoena_admin_audit');
        if (!canManage && !canAudit) {
            (document as any).getElementById('view-subpoena-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
            return;
        }
        const tabs: any = [];
        if (canManage) {
            tabs.push(['courtLocations', 'Court Locations']);
            tabs.push(['notifications', 'Notification Routing']);
        }
        if (can('subpoena_bulk_import'))
            tabs.push(['bulkImport', 'Bulk Import']);
        if (canAudit)
            tabs.push(['audit', 'Platform Audit Log']);
        if (!tabs.find(([k]: any): any => k === ADMIN_TAB))
            ADMIN_TAB = tabs[0][0];
        (document as any).getElementById('view-subpoena-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key, label]: any): any => `<button class="btn btn-sm ${ADMIN_TAB === key ? 'btn-primary' : 'btn-outline'}" data-admin-tab-sub="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodySub"></div>
  `;
        (document as any).querySelectorAll('[data-admin-tab-sub]').forEach((b?: any): any => b.addEventListener('click', (): any => { ADMIN_TAB = b.dataset.adminTabSub; renderAdmin(); }));
        renderAdminTabBody();
    }
    function renderAdminTabBody(): any {
        const body: any = (document as any).getElementById('adminTabBodySub');
        if (ADMIN_TAB === 'courtLocations')
            renderCourtLocationsTab(body);
        else if (ADMIN_TAB === 'notifications')
            renderNotificationRoutingTab(body);
        else if (ADMIN_TAB === 'bulkImport')
            renderBulkImportTab(body, 'subpoena');
        else if (ADMIN_TAB === 'audit')
            renderPlatformAuditLogTab(body);
    }
    function renderCourtLocationsTab(body?: any): any {
        const list: any = STATE.subpoena.refData.courtLocations;
        const usageCheck: any = (v?: any): any => STATE.subpoena.subpoenas.filter((s?: any): any => s.courtLocation === v).length;
        const rows: any = list.map((v?: any, i?: any): any => {
            const inUse: any = usageCheck(v);
            return `<tr><td>${escapeHtml(v)}</td><td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
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
        (document as any).getElementById('btnAddLoc').addEventListener('click', (): any => {
            const val: any = (document as any).getElementById('newLocInput').value.trim();
            if (!val) {
                toast("Enter a court location first.", true);
                return;
            }
            if (list.includes(val)) {
                toast("That already exists.", true);
                return;
            }
            list.push(val);
            logActivity(`Added court location "${val}".`, "admin");
            persist();
            renderAdminTabBody();
        });
        (document as any).querySelectorAll('[data-remove-loc]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const idx: any = Number(b.dataset.removeLoc);
            const val: any = list[idx];
            if (usageCheck(val) > 0) {
                toast(`Can't remove "${val}" \u2014 it's in use.`, true);
                return;
            }
            if (!confirm(`Remove "${val}"?`))
                return;
            list.splice(idx, 1);
            logActivity(`Removed court location "${val}".`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    function renderNotificationRoutingTab(body?: any): any {
        const roleOpts: any = (sel?: any): any => STATE.roles.map((r?: any): any => `<option value="${r.id}" ${sel === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Court Date Approaching Alerts</label><select id="fRouteSubApproach">${roleOpts(STATE.subpoena.notifySettings.courtDateApproachingRoleId)}</select></div>
        <div class="form-row"><label>Unacknowledged Subpoena Alerts</label><select id="fRouteSubUnack">${roleOpts(STATE.subpoena.notifySettings.unacknowledgedRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingSub">Save Routing</button>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveRoutingSub').addEventListener('click', (): any => {
            STATE.subpoena.notifySettings.courtDateApproachingRoleId = (document as any).getElementById('fRouteSubApproach').value;
            STATE.subpoena.notifySettings.unacknowledgedRoleId = (document as any).getElementById('fRouteSubUnack').value;
            logActivity("Updated Subpoena Mgmt notification routing settings.", "admin");
            persist();
            toast("Notification routing saved.");
            renderNotifBell();
        });
    }
    /* =========================================================================
       MODULE ENTRY POINT
       ========================================================================= */
    function startSubpoenaModule(): any {
        renderNav();
        switchView('subpoena-dashboard');
    }
    (window as any).SUBPOENA = { start: startSubpoenaModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: (): any => renderView(ACTIVE_VIEW), openSubpoenaDetail } as any;
})();
