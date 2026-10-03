/* =========================================================================
   EOD MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.eod and shared roles/personnel)
   Grounded in real ATF / FBI Hazardous Devices School requirements:
   - HDS is the sole certifying body for U.S. public safety bomb technicians; basic
     certification is a 6-week course, recertification is required every 3 years,
     and techs must also hold a HazMat Technician certification and log monthly training.
   - The Safe Explosives Act of 2002 (18 U.S.C. Ch. 40) and its implementing regulations
     at 27 CFR Parts 479 and 555 govern explosives storage, recordkeeping, and reporting.
   - Explosives storage magazines are classified Type 1 through Type 5 under 27 CFR
     555.207-211, each with its own construction/security rules; magazines must be
     inspected at least every 7 days per 27 CFR 555.204 whenever they hold material.
   - Any theft or loss of explosive material must be reported to ATF and local
     authorities within 24 hours of discovery (a hard compliance deadline modeled here).
   - The Bomb Arson Tracking System (BATS) is the national incident-reporting system
     jointly run by ATF/FBI; its Render Safe Procedure (RSP) section is restricted to
     certified bomb technicians only \u2014 this module mirrors that exact access model
     via the dedicated eod_rsp_view ability.
   ========================================================================= */
(function (): any {
    const MAGAZINE_TYPES: any = [
        "Type 1 (Permanent \u2014 all classes)", "Type 2 (Mobile/Portable \u2014 all classes)",
        "Type 3 (Day Box \u2014 attended storage only)", "Type 4 (Low explosives / certain detonators)",
        "Type 5 (Bulk blasting agents)",
    ];
    const MATERIAL_CLASSIFICATIONS: any = ["High Explosive", "Low Explosive", "Blasting Agent", "Detonator / Initiator", "Training Simulant (Inert)"];
    const MATERIAL_TYPES: any = ["C4 (Composition C-4)", "Detonating Cord (Det Cord)", "Electric Blasting Caps", "Non-Electric Blasting Caps",
        "Shock Tube Initiators", "Water Gel / Emulsion Charge", "Black Powder", "Binary Exploding Target (Training)", "PAN Disruptor Charge", "Shaped Breaching Charge"];
    const INCIDENT_TYPES: any = ["Suspicious Package", "Improvised Explosive Device (IED)", "Render Safe Operation", "Post-Blast Investigation",
        "Training Detonation", "Found Military Ordnance (UXO)", "Hoax Device", "Bomb Threat Assessment", "Evidence Destruction"];
    const DISPOSITION_TYPES: any = ["Rendered Safe \u2014 Disruption", "Rendered Safe \u2014 Hand Entry", "Rendered Safe \u2014 Robot Entry", "Removed for Destruction",
        "Determined Non-Hazardous", "Detonated in Place", "Referred to ATF Explosives Enforcement Officer", "Turned Over to Military EOD"];
    const CERT_TYPES_EOD: any = ["HDS Basic Certification", "HDS Recertification", "HazMat Technician", "Certified Explosives Specialist (CES)"];
    const CERTIFYING_BODIES_EOD: any = ["FBI Hazardous Devices School (Redstone Arsenal)", "ATF (Certified Explosives Specialist Program)", "State Fire Marshal / HazMat Authority"];
    function defaultRefDataEod(): any {
        return {
            magazineTypes: [...MAGAZINE_TYPES], materialClassifications: [...MATERIAL_CLASSIFICATIONS], materialTypes: [...MATERIAL_TYPES],
            incidentTypes: [...INCIDENT_TYPES], dispositionTypes: [...DISPOSITION_TYPES], certTypes: [...CERT_TYPES_EOD], certifyingBodies: [...CERTIFYING_BODIES_EOD]
        } as any;
    }
    const HDS_RECERT_MONTHS: any = 36; // FBI Hazardous Devices School: recertify every 3 years
    const MAGAZINE_INSPECTION_DAYS: any = 7; // 27 CFR 555.204: inspect at least every 7 days while material is stored
    const THEFT_REPORT_HOURS: any = 24; // Federal requirement: report theft/loss of explosive materials within 24 hours
    /* =========================================================================
       SEED DATA
       ========================================================================= */
    function seedTechniciansEod(): any {
        const today: any = new Date() as any;
        const defs: any = [
            ["p1", "HDS-22-04471", -900, true, true, "CES-19-0231"],
            ["p2", "HDS-24-05820", -300, true, false, null],
            ["p3", "HDS-23-05102", -600, true, false, null],
            ["p5", "HDS-21-03887", -1150, true, true, "CES-18-0119"],
            ["p6", "HDS-25-06210", -60, false, false, null],
        ];
        return defs.map(([personId, hdsCertNumber, certDaysAgo, hazmat, ces, cesNumber]: any): any => {
            const hdsCertDate: any = fmt(addDays(today, certDaysAgo));
            return {
                personId, hdsCertNumber, hdsCertDate,
                hdsRecertDueDate: fmt(addDays(new Date(hdsCertDate) as any, HDS_RECERT_MONTHS * 30)),
                hazmatTechCert: hazmat, hazmatTechCertDate: hazmat ? fmt(addDays(today, certDaysAgo + 30)) : null,
                cesCredential: ces, cesNumber: cesNumber || null, cesCertDate: ces ? fmt(addDays(today, certDaysAgo + 400)) : null,
                status: "Active", fieldHistory: []
            } as any;
        });
    }
    function seedMagazinesEod(): any {
        const today: any = new Date() as any;
        const defs: any = [
            ["mag1", "Range Storage Building A", "Type 1 (Permanent \u2014 all classes)", "Main Training Range \u2014 South Lot", -3],
            ["mag2", "Mobile Magazine Trailer 1", "Type 2 (Mobile/Portable \u2014 all classes)", "EOD Unit Garage", -1],
            ["mag3", "Day Box \u2014 Response Vehicle 1", "Type 3 (Day Box \u2014 attended storage only)", "EOD Response Truck 1", -6],
            ["mag4", "Detonator Cabinet A", "Type 4 (Low explosives / certain detonators)", "EOD Unit Garage", -2],
        ];
        return defs.map(([id, name, type, location, lastInspDaysAgo]: any): any => ({
            id, name, type, location,
            lastInspectionDate: fmt(addDays(today, lastInspDaysAgo)),
            securityFeatures: "Two padlocks in separate hasps, steel-lined, motion-alarmed.",
            notes: ""
        } as any));
    }
    function seedMagazineInspectionsEod(): any {
        const today: any = new Date() as any;
        const rows: any = [
            ["mag1", "p1", -3, false, "No unauthorized entry. Seals intact. Humidity within range."],
            ["mag1", "p1", -10, false, "No unauthorized entry."],
            ["mag2", "p2", -1, false, "No unauthorized entry. Trailer tires and hitch inspected."],
            ["mag3", "p6", -6, false, "Day box empty at end of shift per policy \u2014 verified."],
            ["mag4", "p3", -2, false, "No unauthorized entry."],
        ];
        return rows.map(([magazineId, inspectorId, daysAgo, unauthorizedEntry, notes]: any, i?: any): any => ({
            id: "insp" + (i + 1), magazineId, inspectorId, date: fmt(addDays(today, daysAgo)), unauthorizedEntry, notes
        } as any));
    }
    function seedExplosivesInventoryEod(): any {
        const today: any = new Date() as any;
        const rows: any = [
            ["C4 (Composition C-4)", "High Explosive", "mag1", "2.5", "lbs", "Government Furnished (DoD Excess Property)", -400, null],
            ["Detonating Cord (Det Cord)", "High Explosive", "mag1", "500", "ft", "Vetted Explosives Supply Co.", -200, null],
            ["Electric Blasting Caps", "Detonator / Initiator", "mag4", "24", "each", "Vetted Explosives Supply Co.", -150, null],
            ["Shock Tube Initiators", "Detonator / Initiator", "mag4", "36", "each", "Vetted Explosives Supply Co.", -150, null],
            ["Shaped Breaching Charge", "High Explosive", "mag2", "6", "each", "Tactical Breaching Systems Inc.", -90, null],
            ["PAN Disruptor Charge", "High Explosive", "mag2", "10", "each", "Tactical Breaching Systems Inc.", -90, null],
            ["Binary Exploding Target (Training)", "Training Simulant (Inert)", "mag3", "20", "lbs", "Commercial Retail (Sporting Goods)", -30, null],
        ];
        return rows.map(([materialType, classification, magazineId, quantity, unit, source, acqDaysAgo, expiration]: any, i?: any): any => ({
            id: "exp" + (i + 1), materialType, classification, magazineId, quantity: Number(quantity), unit, source,
            acquisitionDate: fmt(addDays(today, acqDaysAgo)), expirationDate: expiration, status: "On Hand", notes: ""
        } as any));
    }
    function seedIncidentsEod(): any {
        const today: any = new Date() as any;
        return [
            { id: "eodinc1", date: fmt(addDays(today, -25)), type: "Suspicious Package", location: "Downtown Federal Building lobby",
                technicianIds: ["p1", "p2"], dispositionType: "Determined Non-Hazardous", batsReported: true, batsCaseNumber: "BATS-2026-04412",
                evidenceCollected: false, rsp: "X-rayed in place using portable imaging system; no internal components consistent with an IED. Package contained retail merchandise. Cleared by hand after imaging confirmed no hazard.",
                narrative: "Responded to a report of an unattended backpack. Area evacuated to 300 ft per standard cordon distance pending assessment." } as any,
            { id: "eodinc2", date: fmt(addDays(today, -70)), type: "Render Safe Operation", location: "Residential storage unit, Sparks NV",
                technicianIds: ["p1", "p5"], dispositionType: "Rendered Safe \u2014 Robot Entry", batsReported: true, batsCaseNumber: "BATS-2026-03190",
                evidenceCollected: true, rsp: "Deployed Andros F6A with PAN disruptor to separate initiation system from main charge at 40 ft standoff. Post-disruption hand entry confirmed device rendered safe. Components preserved for ATF Explosives Enforcement Officer evidence review.",
                narrative: "Found device reported by a storage facility employee during a delinquent-unit cleanout. Perimeter established at 1,000 ft per IED standoff guidance; robot deployed for initial assessment." } as any,
            { id: "eodinc3", date: fmt(addDays(today, -5)), type: "Training Detonation", location: "Main Training Range \u2014 South Lot",
                technicianIds: ["p1", "p2", "p3", "p6"], dispositionType: "Detonated in Place", batsReported: false, batsCaseNumber: "",
                evidenceCollected: false, rsp: "Scheduled proficiency detonation of training charges per monthly training requirement; no anomalies.",
                narrative: "Routine monthly range training \u2014 disruptor proficiency and render-safe procedure drills." } as any,
        ];
    }
    function seedTheftLossReportsEod(): any {
        const today: any = new Date() as any;
        return [
            { id: "tlr1", discoveredDate: fmt(addDays(today, -140)), discoveredTime: "07:15", materialInvolved: "Electric Blasting Caps",
                quantityLost: "2 each", magazineId: "mag4", reportedAtfDate: fmt(addDays(today, -140)), reportedAtfTime: "14:40",
                reportedUsbdc: true, localAuthoritiesNotified: true, caseNumber: "IA-2026-0090",
                narrative: "Discrepancy found during routine inventory reconciliation; 2 electric blasting caps could not be accounted for against the acquisition/disposition log. Reported to ATF and USBDC same day." } as any,
        ];
    }
    /* =========================================================================
       STATE LIFECYCLE
       ========================================================================= */
    function buildData(): any {
        return {
            technicians: seedTechniciansEod(),
            magazines: seedMagazinesEod(),
            magazineInspections: seedMagazineInspectionsEod(),
            inventory: seedExplosivesInventoryEod(),
            incidents: seedIncidentsEod(),
            theftLossReports: seedTheftLossReportsEod(),
            refData: defaultRefDataEod(),
            notifications: [],
            notifySettings: { hdsRecertRoleId: "role_admin", inspectionDueRoleId: "role_admin", theftReportRoleId: "role_admin" } as any,
            activity: [],
            dashboardPrefs: {} as any
        } as any;
    }
    function migrateData(): any {
        if (!STATE.eod.refData)
            STATE.eod.refData = defaultRefDataEod();
        if (!STATE.eod.notifications)
            STATE.eod.notifications = [];
        if (!STATE.eod.notifySettings)
            STATE.eod.notifySettings = { hdsRecertRoleId: STATE.roles[0].id, inspectionDueRoleId: STATE.roles[0].id, theftReportRoleId: STATE.roles[0].id } as any;
        if (!STATE.eod.theftLossReports)
            STATE.eod.theftLossReports = [];
        if (!STATE.eod.dashboardPrefs)
            STATE.eod.dashboardPrefs = {} as any;
        STATE.eod.technicians.forEach((t?: any): any => { if (!t.fieldHistory)
            t.fieldHistory = []; });
    }
    function logActivity(text?: any, entityType?: any, entityId?: any): any {
        STATE.eod.activity.push({ ts: fmt(new Date() as any), text, entityType: entityType || "general", entityId: entityId || null } as any);
        logAuditEntry('EOD', text, entityType);
    }
    function technicianFor(personId?: any): any { return STATE.eod.technicians.find((t?: any): any => t.personId === personId); }
    function magazineFor(id?: any): any { return STATE.eod.magazines.find((m?: any): any => m.id === id); }
    function ensureTechnician(personId?: any): any {
        let t: any = technicianFor(personId);
        if (!t) {
            t = { personId, hdsCertNumber: "", hdsCertDate: "", hdsRecertDueDate: "", hazmatTechCert: false, hazmatTechCertDate: null,
                cesCredential: false, cesNumber: null, cesCertDate: null, status: "Active", fieldHistory: [] } as any;
            STATE.eod.technicians.push(t);
        }
        return t;
    }
    function technicianCurrent(t?: any): any { return t.hdsRecertDueDate && t.hdsRecertDueDate >= fmt(new Date() as any); }
    function recordFieldChangeEod(entity?: any, field?: any, oldVal?: any, newVal?: any): any {
        if (JSON.stringify(oldVal) === JSON.stringify(newVal))
            return;
        entity.fieldHistory.push({
            date: fmt(new Date() as any), field, before: oldVal, after: newVal,
            changedBy: (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || 'System'
        } as any);
    }
    function withinTheftReportWindow(report?: any): any {
        if (!report.reportedAtfDate)
            return null;
        const discovered: any = new Date(report.discoveredDate + 'T' + (report.discoveredTime || '00:00')) as any;
        const reported: any = new Date(report.reportedAtfDate + 'T' + (report.reportedAtfTime || '00:00')) as any;
        const hours: any = (reported - discovered) / (1000 * 60 * 60);
        return hours <= THEFT_REPORT_HOURS;
    }
    /* =========================================================================
       NAV
       ========================================================================= */
    const NAV_ITEMS: any = [
        { id: "eod-dashboard", label: "Dashboard", icon: "dashboard", title: "Dashboard", sub: "EOD unit compliance status at a glance", requiredAbility: null } as any,
        { id: "eod-technicians", label: "Technicians", icon: "boxlock", title: "Bomb Technicians", sub: "HDS certification, HazMat, and CES credential tracking", requiredAbility: "eod_technician_view" } as any,
        { id: "eod-inventory", label: "Explosives Inventory", icon: "vial", title: "Explosives Inventory", sub: "ATF Form 5400.30\u2013style acquisition and disposition tracking", requiredAbility: "eod_inventory_view" } as any,
        { id: "eod-magazines", label: "Magazines & Storage", icon: "lock", title: "Magazines & Storage", sub: "Type 1\u20135 storage compliance under 27 CFR Part 555", requiredAbility: "eod_magazine_view" } as any,
        { id: "eod-incidents", label: "Incidents & Callouts", icon: "alert", title: "Incidents & Callouts", sub: "Render Safe Procedures and BATS-reportable activity", requiredAbility: "eod_incident_view" } as any,
        { id: "eod-theftloss", label: "Theft / Loss Reports", icon: "radio", title: "Theft / Loss Reports", sub: "The 24-hour federal reporting requirement, tracked to the minute", requiredAbility: "eod_theft_report_view" } as any,
        { id: "eod-reports", label: "Reports", icon: "chart", title: "Reports & Analytics", sub: "Compliance reporting and a configurable report builder", requiredAbility: "eod_reports_view" } as any,
        { id: "eod-admin", label: "Admin", icon: "gear", title: "Administration", sub: "Reference data and the system audit log", requiredAbility: ["eod_admin_categories", "eod_admin_audit"] } as any,
    ];
    let ACTIVE_VIEW: any = "eod-dashboard";
    function navItemVisible(item?: any): any {
        if (!can('module_eod'))
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
        if (id === "eod-dashboard")
            renderDashboard();
        else if (id === "eod-technicians")
            renderTechnicians();
        else if (id === "eod-inventory")
            renderInventory();
        else if (id === "eod-magazines")
            renderMagazines();
        else if (id === "eod-incidents")
            renderIncidents();
        else if (id === "eod-theftloss")
            renderTheftLoss();
        else if (id === "eod-reports")
            renderReports();
        else if (id === "eod-admin")
            renderAdmin();
    }
    /* =========================================================================
       NOTIFICATIONS
       ========================================================================= */
    function recalcNotifications(): any {
        const today: any = new Date() as any;
        const upcoming: any = [];
        STATE.eod.technicians.filter((t?: any): any => t.status === "Active").forEach((t?: any): any => {
            if (t.hdsRecertDueDate) {
                const days: any = daysBetween(fmt(today), t.hdsRecertDueDate);
                if (days <= 90)
                    upcoming.push({ type: "hds_recert", entityId: t.personId, message: `${personName(t.personId)}'s HDS certification ${days < 0 ? 'expired ' + Math.abs(days) + ' days ago' : 'is due for recertification in ' + days + ' days'} (${t.hdsRecertDueDate}). HDS recertification is required every 3 years.`, recipientRoleId: STATE.eod.notifySettings.hdsRecertRoleId } as any);
            }
        });
        STATE.eod.magazines.forEach((m?: any): any => {
            const days: any = daysBetween(m.lastInspectionDate, fmt(today));
            if (days > MAGAZINE_INSPECTION_DAYS) {
                upcoming.push({ type: "inspection_due", entityId: m.id, message: `${m.name} has not been inspected in ${days} days \u2014 27 CFR 555.204 requires inspection at least every ${MAGAZINE_INSPECTION_DAYS} days while explosive material is stored.`, recipientRoleId: STATE.eod.notifySettings.inspectionDueRoleId } as any);
            }
        });
        const prevReadBy: any = {} as any;
        STATE.eod.notifications.forEach((n?: any): any => { prevReadBy[n.type + '|' + n.entityId] = n.readBy || []; });
        STATE.eod.notifications = upcoming.map((n?: any): any => ({
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
    function statusBadgeClassEod(status?: any): any {
        return ({
            "Active": "badge-available", "Expired": "badge-missing", "On Hand": "badge-available", "Disposed": "badge-role", "Depleted": "badge-missing",
            "Reported": "badge-available", "Overdue": "badge-missing"
        } as any)[status] || "badge-role";
    }
    function technicianLink(personId?: any): any {
        return `<a href="#" data-open-tech="${personId}" class="record-link">${escapeHtml(personName(personId))}</a>`;
    }
    function wireTechLinks(): any {
        (document as any).querySelectorAll('[data-open-tech]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openTechDetail(a.dataset.openTech); }));
    }
    function magazineLink(id?: any): any {
        const m: any = magazineFor(id);
        return `<a href="#" data-open-mag="${id}" class="record-link">${escapeHtml(m ? m.name : 'Unknown')}</a>`;
    }
    function wireMagLinks(): any {
        (document as any).querySelectorAll('[data-open-mag]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openMagazineDetail(a.dataset.openMag); }));
    }
    /* =========================================================================
       DASHBOARD
       ========================================================================= */
    let CHART_REFS_EOD: any = {} as any;
    function destroyChartsEod(): any { (Object.values(CHART_REFS_EOD) as any).forEach((c?: any): any => c && c.destroy()); CHART_REFS_EOD = {} as any; }
    const TOP_WIDGETS: any = [
        { id: "stat_current_technicians", label: "Current Technicians" } as any,
        { id: "stat_magazine_inspections", label: "Magazine Inspections" } as any,
        { id: "stat_inventory_onhand", label: "Inventory On Hand" } as any,
        { id: "stat_open_theft_reports", label: "Open Theft/Loss Reports" } as any,
    ];
    const EXTRA_WIDGETS: any = [
        { id: "list_tech_cert_status", label: "Technician Certification Status", defaultSize: "full" } as any,
        { id: "chart_incidents_by_type", label: "Incidents by Type", defaultSize: "half" } as any,
        { id: "list_magazine_inspection_status", label: "Magazine Inspection Status", defaultSize: "half" } as any,
    ];
    const DEFAULT_EXTRAS: any = EXTRA_WIDGETS.map((w?: any): any => ({ id: w.id, size: w.defaultSize } as any));
    function myWidgetPrefs(): any {
        let p: any = STATE.eod.dashboardPrefs[CURRENT_USER_ID];
        const topIds: any = TOP_WIDGETS.map((w?: any): any => w.id), extraIds: any = EXTRA_WIDGETS.map((w?: any): any => w.id);
        if (!p || (!p.topOrder && !p.extras)) {
            p = { topOrder: [...topIds], extras: DEFAULT_EXTRAS.map((e?: any): any => ({ ...e } as any)) } as any;
            STATE.eod.dashboardPrefs[CURRENT_USER_ID] = p;
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
        const activeTechs: any = STATE.eod.technicians.filter((t?: any): any => t.status === "Active");
        if (id === 'stat_current_technicians') {
            const currentTechs: any = activeTechs.filter(technicianCurrent).length;
            const recertDue: any = STATE.eod.notifications.filter((n?: any): any => n.type === "hds_recert").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="eod-technicians"><div class="label">Current Technicians</div><div class="value">${currentTechs} <span style="font-size:14px;color:var(--text-dim);font-weight:600;">/ ${activeTechs.length}</span></div><div class="delta ${recertDue ? 'warn' : 'ok'}">${recertDue} recert alert(s)</div></button>`;
        }
        if (id === 'stat_magazine_inspections') {
            const inspOverdue: any = STATE.eod.notifications.filter((n?: any): any => n.type === "inspection_due").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="eod-magazines"><div class="label">Magazine Inspections</div><div class="value" style="color:${inspOverdue ? 'var(--red)' : 'var(--heading)'}">${inspOverdue}</div><div class="delta ${inspOverdue ? 'warn' : 'ok'}">Overdue past ${MAGAZINE_INSPECTION_DAYS}-day cycle</div></button>`;
        }
        if (id === 'stat_inventory_onhand') {
            const onHandItems: any = STATE.eod.inventory.filter((i?: any): any => i.status === "On Hand").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="eod-inventory"><div class="label">Inventory On Hand</div><div class="value">${onHandItems}</div><div class="delta neutral">items across ${STATE.eod.magazines.length} magazines</div></button>`;
        }
        if (id === 'stat_open_theft_reports') {
            const openTheftReports: any = STATE.eod.theftLossReports.filter((r?: any): any => !r.reportedAtfDate).length;
            const last30Incidents: any = STATE.eod.incidents.filter((i?: any): any => daysBetween(i.date, fmt(new Date() as any)) <= 30).length;
            return `<button class="stat-card dash-clickable" data-nav-dest="eod-theftloss"><div class="label">Open Theft/Loss Reports</div><div class="value" style="color:${openTheftReports ? 'var(--red)' : 'var(--heading)'}">${openTheftReports}</div><div class="delta neutral">${last30Incidents} incidents (30d)</div></button>`;
        }
        if (id === 'list_tech_cert_status') {
            const rows: any = activeTechs.map((t?: any): any => {
                const current: any = technicianCurrent(t);
                return `<tr><td>${technicianLink(t.personId)}</td><td class="mono">${escapeHtml(t.hdsCertNumber)}</td><td style="${current ? '' : 'color:var(--red);font-weight:700;'}">${t.hdsRecertDueDate}</td><td>${t.hazmatTechCert ? 'Yes' : 'No'}</td><td>${t.cesCredential ? 'Yes' : 'No'}</td><td><span class="badge ${current ? 'badge-available' : 'badge-missing'}">${current ? 'Current' : 'Recert Required'}</span></td></tr>`;
            }).join('');
            return `<div class="panel"><div class="panel-head"><h2>Technician Certification Status</h2><span class="hint">HDS certification is required every 3 years per FBI Hazardous Devices School policy</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Technician</th><th>HDS Cert #</th><th>Recert Due</th><th>HazMat Tech</th><th>CES</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'chart_incidents_by_type') {
            return `<div class="panel"><div class="panel-head"><h2>Incidents by Type</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartEodIncidentType"></canvas></div></div></div>`;
        }
        if (id === 'list_magazine_inspection_status') {
            const rows: any = STATE.eod.magazines.map((m?: any): any => {
                const days: any = daysBetween(m.lastInspectionDate, fmt(new Date() as any));
                return `<tr><td>${magazineLink(m.id)}</td><td style="font-size:11.5px;">${escapeHtml(m.type)}</td><td style="${days > MAGAZINE_INSPECTION_DAYS ? 'color:var(--red);font-weight:700;' : ''}">${m.lastInspectionDate} (${days}d ago)</td></tr>`;
            }).join('');
            return `<div class="panel"><div class="panel-head"><h2>Magazine Inspection Status</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Magazine</th><th>Type</th><th>Last Inspected</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
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
            logActivity(`Customized personal EOD dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
            persist();
            toast("Dashboard saved.");
            closeModal();
            renderDashboard();
        };
    }
    function renderDashboard(): any {
        recalcNotifications();
        const prefs: any = myWidgetPrefs();
        const root: any = (document as any).getElementById('view-eod-dashboard');
        root.innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.bomb}<div>This module tracks the real compliance obligations bomb squads operate under: FBI Hazardous Devices School (HDS) certification currency (3-year recert cycle), 27 CFR Part 555 explosives storage and 7-day magazine inspection requirements, and the federal 24-hour theft/loss reporting deadline to ATF and the U.S. Bomb Data Center.</div>
    </div>
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
        destroyChartsEod();
        if (prefs.extras.some((e?: any): any => e.id === 'chart_incidents_by_type')) {
            const incidentsByType: any = {} as any;
            STATE.eod.refData.incidentTypes.forEach((t?: any): any => incidentsByType[t] = 0);
            STATE.eod.incidents.forEach((i?: any): any => incidentsByType[i.type] = (incidentsByType[i.type] || 0) + 1);
            CHART_REFS_EOD.incidentType = safeChart('chartEodIncidentType', {
                type: 'bar',
                data: { labels: Object.keys(incidentsByType) as any, datasets: [{ label: 'Incidents', data: Object.values(incidentsByType) as any, backgroundColor: '#134DD1' } as any] } as any,
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any } as any } as any
            } as any);
        }
        wireTechLinks();
        wireMagLinks();
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
       TECHNICIANS (card grid)
       ========================================================================= */
    function renderTechnicians(): any {
        if (!can('eod_technician_view')) {
            (document as any).getElementById('view-eod-technicians').innerHTML = permissionBlockedView("You don't have permission to view technician certifications in this role.");
            return;
        }
        const canManage: any = can('eod_technician_manage');
        const cards: any = STATE.eod.technicians.map((t?: any): any => {
            const current: any = technicianCurrent(t);
            const daysLeft: any = t.hdsRecertDueDate ? daysBetween(fmt(new Date() as any), t.hdsRecertDueDate) : null;
            return `
    <div class="drone-card">
      <div style="display:flex;gap:14px;align-items:center;">
        ${personAvatarHtml(t.personId, 64)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;">${technicianLink(t.personId)}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);margin:2px 0 6px;">${escapeHtml(t.hdsCertNumber)}</div>
          <span class="badge ${current ? 'badge-available' : 'badge-missing'}">${current ? 'Current' : 'Recert Required'}</span>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">HDS Recert Due</span>
          <span style="font-weight:600;${daysLeft != null && daysLeft <= 90 ? 'color:var(--red);' : ''}">${t.hdsRecertDueDate || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">HazMat Technician</span><span style="font-weight:600;">${t.hazmatTechCert ? 'Certified' : 'Not Certified'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--text-dim);">ATF CES Credential</span><span style="font-weight:600;">${t.cesCredential ? escapeHtml(t.cesNumber) : 'None'}</span>
        </div>
      </div>
      ${canManage ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        <button class="btn btn-sm btn-outline" data-edit-tech="${t.personId}">${ICONS.edit} Edit</button>
      </div>` : ''}
    </div>`;
        }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.boxlock}<div class="msg">No technicians on file</div></div>`;
        (document as any).getElementById('view-eod-technicians').innerHTML = `
    ${!canManage ? lockedNote("You're viewing technician certifications in read-only mode.") : ""}
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnAddTech">${ICONS.plus} Add Technician</button>` : ''}</div>
    <div class="k9-card-grid">${cards}</div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:12px;">FBI Hazardous Devices School (HDS) certification is required for every public safety bomb technician in the United States and must be renewed every 3 years.</div>
  `;
        const addBtn: any = (document as any).getElementById('btnAddTech');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openTechFormModal(null));
        (document as any).querySelectorAll('[data-edit-tech]').forEach((b?: any): any => b.addEventListener('click', (): any => openTechFormModal(b.dataset.editTech)));
        wireTechLinks();
    }
    function openTechFormModal(personId?: any): any {
        const editing: any = !!personId;
        const t: any = editing ? technicianFor(personId) : { hdsCertNumber: "", hdsCertDate: fmt(new Date() as any), hdsRecertDueDate: fmt(addDays(new Date() as any, HDS_RECERT_MONTHS * 30)), hazmatTechCert: false, hazmatTechCertDate: null, cesCredential: false, cesNumber: "" } as any;
        const unassigned: any = STATE.personnel.filter((p?: any): any => !technicianFor(p.id));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Add'} Technician</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${editing ? `<div class="form-row"><label>Technician</label><input type="text" value="${escapeHtml(personName(personId))}" disabled></div>`
            : `<div class="form-row"><label>Person</label><select id="fTechPerson">${unassigned.length ? unassigned.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') : `<option value="">-- everyone already has a technician record --</option>`}</select></div>`}
      <div class="form-2col">
        <div class="form-row"><label>HDS Certificate #</label><input type="text" id="fTechCertNum" value="${escapeHtml(t.hdsCertNumber || '')}" placeholder="e.g. HDS-26-01234"></div>
        <div class="form-row"><label>HDS Cert Date</label><input type="date" id="fTechCertDate" value="${t.hdsCertDate || ''}"></div>
      </div>
      <div class="form-row"><label>HDS Recertification Due</label><input type="date" id="fTechRecertDue" value="${t.hdsRecertDueDate || ''}"></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fTechHazmat" ${t.hazmatTechCert ? 'checked' : ''} style="width:auto;">HazMat Technician certified</label></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fTechCes" ${t.cesCredential ? 'checked' : ''} style="width:auto;">Holds ATF Certified Explosives Specialist (CES) credential</label></div>
      <div class="form-row"><label>CES Number (if applicable)</label><input type="text" id="fTechCesNum" value="${escapeHtml(t.cesNumber || '')}"></div>
      <div style="font-size:11px;color:var(--text-dim);">HDS certifications are valid 3 years. Bomb technicians must also complete monthly training and hold a HazMat Technician certification per national guidelines.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Add Technician'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const targetId: any = editing ? personId : (document as any).getElementById('fTechPerson').value;
            if (!targetId)
                return;
            const certNum: any = (document as any).getElementById('fTechCertNum').value.trim();
            if (!certNum) {
                toast("Enter an HDS certificate number.", true);
                return;
            }
            const tRec: any = ensureTechnician(targetId);
            const data: any = {
                hdsCertNumber: certNum, hdsCertDate: (document as any).getElementById('fTechCertDate').value, hdsRecertDueDate: (document as any).getElementById('fTechRecertDue').value,
                hazmatTechCert: (document as any).getElementById('fTechHazmat').checked, cesCredential: (document as any).getElementById('fTechCes').checked,
                cesNumber: (document as any).getElementById('fTechCesNum').value.trim() || null
            } as any;
            if (editing)
                recordFieldChangeEod(tRec, 'hdsRecertDueDate', tRec.hdsRecertDueDate, data.hdsRecertDueDate);
            Object.assign(tRec, data);
            logActivity(`${editing ? 'Updated' : 'Added'} technician record for ${personName(targetId)}.`, "eod_technician", targetId);
            persist();
            toast("Technician record saved.");
            closeModal();
            if (ACTIVE_VIEW === 'eod-technicians')
                renderTechnicians();
        };
    }
    /* =========================================================================
       TECHNICIAN DETAIL
       ========================================================================= */
    let TECH_DETAIL_ID: any = null;
    let TECH_DETAIL_TAB: any = 'overview';
    function openTechDetail(personId?: any): any {
        if (!SuiteUX.openRecord("eod", "technician", personId))
            return;
        TECH_DETAIL_ID = personId;
        TECH_DETAIL_TAB = 'overview';
        renderTechDetailModal();
    }
    function renderTechDetailModal(): any {
        const t: any = ensureTechnician(TECH_DETAIL_ID);
        const tabs: any = [['overview', 'Overview'], ['incidents', 'Incidents'], ['history', 'Change History']];
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-xl';
        box.innerHTML = `
    <div class="modal-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${personAvatarHtml(t.personId, 44)}
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(personName(t.personId))}</h3>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(t.hdsCertNumber)} &bull; ${technicianCurrent(t) ? 'Current' : 'Recert Required'}</div>
        </div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid, label]: any): any => `<button class="btn btn-sm ${TECH_DETAIL_TAB === tid ? 'btn-primary' : 'btn-outline'}" data-tech-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="techDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-tech-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { TECH_DETAIL_TAB = b.dataset.techTab; renderTechDetailModal(); }));
        renderTechDetailTabContent(t);
    }
    function renderTechDetailTabContent(t?: any): any {
        const body: any = (document as any).getElementById('techDetailBody');
        if (TECH_DETAIL_TAB === 'overview') {
            body.innerHTML = `
      ${can('eod_technician_manage') ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditTechFromDetail">${ICONS.edit} Edit</button>` : ''}
      <div class="detail-grid">
        <div><div class="k">HDS Certificate #</div><div class="v">${escapeHtml(t.hdsCertNumber)}</div></div>
        <div><div class="k">HDS Certification Date</div><div class="v">${t.hdsCertDate || '—'}</div></div>
        <div><div class="k">HDS Recertification Due</div><div class="v">${t.hdsRecertDueDate || '—'}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${technicianCurrent(t) ? 'badge-available' : 'badge-missing'}">${technicianCurrent(t) ? 'Current' : 'Recert Required'}</span></div></div>
        <div><div class="k">HazMat Technician</div><div class="v">${t.hazmatTechCert ? 'Certified' : 'Not Certified'}</div></div>
        <div><div class="k">ATF CES Credential</div><div class="v">${t.cesCredential ? escapeHtml(t.cesNumber || 'Yes') : 'None'}</div></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:12px;">Per FBI Hazardous Devices School policy, certified technicians must also complete monthly training and undergo annual review to remain in good standing between 3-year recertifications.</div>
    `;
            const editBtn: any = (document as any).getElementById('btnEditTechFromDetail');
            if (editBtn)
                editBtn.addEventListener('click', (): any => { closeModal(); openTechFormModal(t.personId); });
        }
        else if (TECH_DETAIL_TAB === 'incidents') {
            const list: any = STATE.eod.incidents.filter((i?: any): any => i.technicianIds.includes(t.personId)).sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
            body.innerHTML = `<table><thead><tr><th>Date</th><th>Type</th><th>Location</th><th>Disposition</th></tr></thead><tbody>
      ${list.map((i?: any): any => `<tr><td>${i.date}</td><td>${escapeHtml(i.type)}</td><td>${escapeHtml(i.location)}</td><td>${escapeHtml(i.dispositionType)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No incidents on file.</td></tr>`}
      </tbody></table>`;
        }
        else if (TECH_DETAIL_TAB === 'history') {
            const rows: any = t.fieldHistory.slice().reverse().map((h?: any): any => `
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
            body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
        }
    }
    /* =========================================================================
       EXPLOSIVES INVENTORY (ATF Form 5400.30-style acquisition/disposition record)
       ========================================================================= */
    let EOD_INV_FILTER: any = { q: "" } as any;
    function renderInventory(): any {
        if (!can('eod_inventory_view')) {
            (document as any).getElementById('view-eod-inventory').innerHTML = permissionBlockedView("You don't have permission to view the explosives inventory in this role.");
            return;
        }
        const canManage: any = can('eod_inventory_manage');
        const f: any = EOD_INV_FILTER;
        let list: any = STATE.eod.inventory.filter((i?: any): any => {
            const q: any = f.q.toLowerCase();
            return !q || i.materialType.toLowerCase().includes(q) || i.classification.toLowerCase().includes(q) || i.source.toLowerCase().includes(q);
        });
        list = applySharedSort('eodInventory', list, (row?: any, key?: any): any => {
            if (key === 'magazine')
                return (magazineFor(row.magazineId) || {} as any).name || '';
            return row[key];
        });
        if (!SHARED_SORT.eodInventory || !SHARED_SORT.eodInventory.key) {
            list = list.slice().sort((a?: any, b?: any): any => b.acquisitionDate.localeCompare(a.acquisitionDate));
        }
        const rows: any = list.map((i?: any): any => `
    <tr><td>${escapeHtml(i.materialType)}</td><td>${escapeHtml(i.classification)}</td><td>${i.quantity} ${escapeHtml(i.unit)}</td>
    <td>${magazineFor(i.magazineId) ? magazineLink(i.magazineId) : '—'}</td><td>${escapeHtml(i.source)}</td><td>${i.acquisitionDate}</td>
    <td><span class="badge ${statusBadgeClassEod(i.status)}">${i.status}</span></td>
    ${canManage ? `<td><button class="btn btn-sm btn-outline" data-edit-inv="${i.id}">${ICONS.edit} Edit</button></td>` : '<td></td>'}</tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No inventory matches this filter.</td></tr>`;
        (document as any).getElementById('view-eod-inventory').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the explosives inventory in read-only mode.") : ""}
    <div class="locked-note" style="background:var(--callout-yellow-bg);border-color:var(--callout-yellow-border);color:var(--callout-yellow-text);">
      ${ICONS.vial}<div>Modeled on ATF Form 5400.30 (Explosives Inventory) acquisition/disposition recordkeeping required under 27 CFR Part 555. A complete physical inventory reconciliation against this log is a standard element of ATF compliance inspections.</div>
    </div>
    <div class="toolbar">
      <div class="filters"><input type="text" id="eodInvSearch" title="Filters the inventory below as you type, matching material type, classification, or source" placeholder="Search material, classification, or source..." style="width:260px;" value="${escapeHtml(f.q)}"></div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddInv">${ICONS.plus} Log Acquisition</button>` : ''}
    </div>
    <div class="panel"><div class="panel-body" style="padding:0;overflow-x:auto;">
      <table><thead><tr>
        ${sharedSortHeader('eodInventory', fieldLabel('eod.materialType'), 'materialType')}
        ${sharedSortHeader('eodInventory', fieldLabel('eod.classification'), 'classification')}
        ${sharedSortHeader('eodInventory', fieldLabel('eod.quantity'), 'quantity')}
        ${sharedSortHeader('eodInventory', fieldLabel('eod.magazine'), 'magazine')}
        <th>Source</th>
        ${sharedSortHeader('eodInventory', fieldLabel('eod.acquisitionDate'), 'acquisitionDate')}
        ${sharedSortHeader('eodInventory', fieldLabel('eod.status'), 'status')}
        <th></th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div></div>
  `;
        (document as any).getElementById('eodInvSearch').addEventListener('input', (e?: any): any => { EOD_INV_FILTER.q = e.target.value; renderInventory(); refocusFilterInput('eodInvSearch'); });
        wireSharedSortHeaders('eodInventory', renderInventory);
        const addBtn: any = (document as any).getElementById('btnAddInv');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openInventoryFormModal(null));
        (document as any).querySelectorAll('[data-edit-inv]').forEach((b?: any): any => b.addEventListener('click', (): any => openInventoryFormModal(b.dataset.editInv)));
        wireMagLinks();
    }
    function openInventoryFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const i: any = editing ? STATE.eod.inventory.find((x?: any): any => x.id === existingId) : {
            materialType: STATE.eod.refData.materialTypes[0], classification: STATE.eod.refData.materialClassifications[0],
            magazineId: STATE.eod.magazines[0].id, quantity: 1, unit: "each", source: "", acquisitionDate: fmt(new Date() as any), expirationDate: "", status: "On Hand", notes: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Log'} Inventory Item</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Material Type</label><select id="fInvMaterial">${STATE.eod.refData.materialTypes.map((m?: any): any => `<option ${i.materialType === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Classification</label><select id="fInvClass">${STATE.eod.refData.materialClassifications.map((c?: any): any => `<option ${i.classification === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Storage Magazine</label><select id="fInvMagazine">${STATE.eod.magazines.map((m?: any): any => `<option value="${m.id}" ${i.magazineId === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Quantity</label><input type="number" id="fInvQty" value="${i.quantity}"></div>
        <div class="form-row"><label>Unit</label><input type="text" id="fInvUnit" value="${escapeHtml(i.unit)}" placeholder="each, lbs, ft"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Source / Vendor</label><input type="text" id="fInvSource" value="${escapeHtml(i.source)}"></div>
        <div class="form-row"><label>Acquisition Date</label><input type="date" id="fInvAcqDate" value="${i.acquisitionDate}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Status</label><select id="fInvStatus"><option ${i.status === 'On Hand' ? 'selected' : ''}>On Hand</option><option ${i.status === 'Disposed' ? 'selected' : ''}>Disposed</option><option ${i.status === 'Depleted' ? 'selected' : ''}>Depleted</option></select></div>
        <div class="form-row"><label>Expiration (if any)</label><input type="date" id="fInvExpire" value="${i.expirationDate || ''}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fInvNotes" rows="2">${escapeHtml(i.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Log Item'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const data: any = {
                materialType: (document as any).getElementById('fInvMaterial').value, classification: (document as any).getElementById('fInvClass').value,
                magazineId: (document as any).getElementById('fInvMagazine').value, quantity: Number((document as any).getElementById('fInvQty').value) || 0,
                unit: (document as any).getElementById('fInvUnit').value.trim(), source: (document as any).getElementById('fInvSource').value.trim(),
                acquisitionDate: (document as any).getElementById('fInvAcqDate').value, status: (document as any).getElementById('fInvStatus').value,
                expirationDate: (document as any).getElementById('fInvExpire').value || null, notes: (document as any).getElementById('fInvNotes').value.trim()
            } as any;
            if (editing) {
                Object.assign(i, data);
                logActivity(`Updated inventory record: ${data.materialType}.`, "eod_inventory", i.id);
            }
            else {
                const newI: any = { id: 'exp' + Date.now(), ...data } as any;
                STATE.eod.inventory.push(newI);
                logActivity(`Logged new inventory acquisition: ${data.materialType}.`, "eod_inventory", newI.id);
            }
            persist();
            toast("Inventory record saved.");
            closeModal();
            if (ACTIVE_VIEW === 'eod-inventory')
                renderInventory();
        };
    }
    /* =========================================================================
       MAGAZINES & STORAGE (27 CFR Part 555 Type 1-5 classification, 7-day inspection cycle)
       ========================================================================= */
    function renderMagazines(): any {
        if (!can('eod_magazine_view')) {
            (document as any).getElementById('view-eod-magazines').innerHTML = permissionBlockedView("You don't have permission to view storage magazines in this role.");
            return;
        }
        const canManage: any = can('eod_magazine_manage');
        const canInspect: any = can('eod_inspection_log');
        const cards: any = STATE.eod.magazines.map((m?: any): any => {
            const days: any = daysBetween(m.lastInspectionDate, fmt(new Date() as any));
            const overdue: any = days > MAGAZINE_INSPECTION_DAYS;
            return `
    <div class="drone-card">
      <div style="position:absolute;top:14px;right:14px;width:9px;height:9px;border-radius:50%;background:${overdue ? 'var(--red)' : 'var(--green)'};"></div>
      <div style="font-size:16px;font-weight:800;">${magazineLink(m.id)}</div>
      <div style="font-size:11.5px;color:var(--text-dim);margin:2px 0 10px;">${escapeHtml(m.type)}</div>
      <div style="font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--text-dim);">Location</span><span style="font-weight:600;">${escapeHtml(m.location)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--text-dim);">Last Inspected</span><span style="font-weight:600;${overdue ? 'color:var(--red);' : ''}">${m.lastInspectionDate} (${days}d ago)</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Contents</span><span style="font-weight:600;">${STATE.eod.inventory.filter((i?: any): any => i.magazineId === m.id && i.status === 'On Hand').length} item(s)</span></div>
      </div>
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        ${canInspect ? `<button class="btn btn-sm btn-primary" data-inspect-mag="${m.id}">${ICONS.check} Log Inspection</button>` : ''}
        ${canManage ? `<button class="btn btn-sm btn-outline" data-edit-mag="${m.id}">${ICONS.edit} Edit</button>` : ''}
      </div>
    </div>`;
        }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.lock}<div class="msg">No magazines on file</div></div>`;
        (document as any).getElementById('view-eod-magazines').innerHTML = `
    ${!canManage ? lockedNote("You're viewing storage magazines in read-only mode.") : ""}
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.lock}<div>Explosives storage magazines are federally classified Type 1 through Type 5 under 27 CFR \u00a7\u00a7 555.207\u2013211, each with its own construction and security requirements. Every magazine holding explosive material must be inspected at least every ${MAGAZINE_INSPECTION_DAYS} days per 27 CFR \u00a7 555.204.</div>
    </div>
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnAddMag">${ICONS.plus} Add Magazine</button>` : ''}</div>
    <div class="k9-card-grid">${cards}</div>
  `;
        const addBtn: any = (document as any).getElementById('btnAddMag');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openMagazineFormModal(null));
        (document as any).querySelectorAll('[data-edit-mag]').forEach((b?: any): any => b.addEventListener('click', (): any => openMagazineFormModal(b.dataset.editMag)));
        (document as any).querySelectorAll('[data-inspect-mag]').forEach((b?: any): any => b.addEventListener('click', (): any => openInspectionFormModal(b.dataset.inspectMag)));
        wireMagLinks();
    }
    function openMagazineFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const m: any = editing ? magazineFor(existingId) : { name: "", type: STATE.eod.refData.magazineTypes[0], location: "", lastInspectionDate: fmt(new Date() as any), securityFeatures: "", notes: "" } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Add'} Magazine</h3><button class="modal-close" id="mClose">&times;</button></div>    <div class="modal-body">
      <div class="form-row"><label>Name</label><input type="text" id="fMagName" value="${escapeHtml(m.name)}" placeholder="e.g. Range Storage Building A"></div>
      <div class="form-row"><label>Type</label><select id="fMagType">${STATE.eod.refData.magazineTypes.map((t?: any): any => `<option ${m.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Location</label><input type="text" id="fMagLocation" value="${escapeHtml(m.location)}"></div>
      <div class="form-row"><label>Security Features</label><textarea id="fMagSecurity" rows="2">${escapeHtml(m.securityFeatures || '')}</textarea></div>
      <div class="form-row"><label>Notes</label><textarea id="fMagNotes" rows="2">${escapeHtml(m.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Add Magazine'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fMagName').value.trim();
            if (!name) {
                toast("Enter a magazine name.", true);
                return;
            }
            const data: any = { name, type: (document as any).getElementById('fMagType').value, location: (document as any).getElementById('fMagLocation').value.trim(),
                securityFeatures: (document as any).getElementById('fMagSecurity').value.trim(), notes: (document as any).getElementById('fMagNotes').value.trim() } as any;
            if (editing) {
                Object.assign(m, data);
                logActivity(`Updated magazine record: ${name}.`, "eod_magazine", m.id);
            }
            else {
                const newM: any = { id: 'mag' + Date.now(), lastInspectionDate: fmt(new Date() as any), ...data } as any;
                STATE.eod.magazines.push(newM);
                logActivity(`Added new magazine: ${name}.`, "eod_magazine", newM.id);
            }
            persist();
            toast("Magazine saved.");
            closeModal();
            if (ACTIVE_VIEW === 'eod-magazines')
                renderMagazines();
        };
    }
    function openInspectionFormModal(magazineId?: any): any {
        const m: any = magazineFor(magazineId);
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Inspection \u2014 ${escapeHtml(m.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">27 CFR \u00a7 555.204 requires this inspection to confirm no unauthorized entry or removal \u2014 a full explosives inventory is not required for this check.</div>
      <div class="form-row"><label>Inspection Date</label><input type="date" id="fInspDate" value="${fmt(new Date() as any)}"></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fInspUnauthorized" style="width:auto;">Evidence of unauthorized entry or attempted entry</label></div>
      <div class="form-row"><label>Notes</label><textarea id="fInspNotes" rows="2" placeholder="e.g. Seals intact, no unauthorized entry."></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Inspection</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const unauthorized: any = (document as any).getElementById('fInspUnauthorized').checked;
            const newInsp: any = { id: 'insp' + Date.now(), magazineId, inspectorId: CURRENT_USER_ID, date: (document as any).getElementById('fInspDate').value,
                unauthorizedEntry: unauthorized, notes: (document as any).getElementById('fInspNotes').value.trim() } as any;
            STATE.eod.magazineInspections.push(newInsp);
            m.lastInspectionDate = newInsp.date;
            logActivity(`Logged magazine inspection for ${m.name}.${unauthorized ? ' UNAUTHORIZED ENTRY FLAGGED.' : ''}`, "eod_inspection", newInsp.id);
            persist();
            toast(unauthorized ? "Inspection logged \u2014 unauthorized entry flagged. Notify your commander immediately." : "Inspection logged.", unauthorized);
            closeModal();
            if (ACTIVE_VIEW === 'eod-magazines')
                renderMagazines();
        };
    }
    /* =========================================================================
       INCIDENTS & CALLOUTS (RSP detail restricted to certified technicians, mirroring BATS)
       ========================================================================= */
    function renderIncidents(): any {
        if (!can('eod_incident_view')) {
            (document as any).getElementById('view-eod-incidents').innerHTML = permissionBlockedView("You don't have permission to view EOD incidents in this role.");
            return;
        }
        const canLog: any = can('eod_incident_log');
        const canRsp: any = can('eod_rsp_view');
        const list: any = STATE.eod.incidents.slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
        const batsReported: any = list.filter((i?: any): any => i.batsReported).length;
        (document as any).getElementById('view-eod-incidents').innerHTML = `
    ${!canLog ? lockedNote("You're viewing incidents in read-only mode.") : ""}
    ${!canRsp ? lockedNote("Render Safe Procedure technical detail is restricted to certified bomb technicians in this system, matching how the national Bomb Arson Tracking System (BATS) restricts its RSP section. You can see incident summaries but not RSP narratives.") : ""}
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="label">Total Incidents</div><div class="value">${list.length}</div></div>
      <div class="stat-card"><div class="label">Reported to BATS</div><div class="value">${batsReported}</div><div class="delta neutral">of ${list.length} total</div></div>
      <div class="stat-card"><div class="label">Last 30 Days</div><div class="value">${list.filter((i?: any): any => daysBetween(i.date, fmt(new Date() as any)) <= 30).length}</div></div>
    </div>
    <div class="toolbar"><div></div>${canLog ? `<button class="btn btn-primary" id="btnLogIncident">${ICONS.plus} Log Incident</button>` : ''}</div>
    <div class="k9-card-grid">
      ${list.map((i?: any): any => `
        <div class="drone-card">
          <div style="font-weight:800;font-size:15px;">${escapeHtml(i.type)}</div>
          <div style="font-size:12px;color:var(--text-dim);margin:2px 0 10px;">${i.date} &bull; ${escapeHtml(i.location)}</div>
          <div style="font-size:12.5px;margin-bottom:8px;"><span style="color:var(--text-dim);">Technicians:</span> ${i.technicianIds.map((id?: any): any => escapeHtml(personName(id))).join(', ') || '—'}</div>
          <div style="font-size:12.5px;margin-bottom:8px;"><span style="color:var(--text-dim);">Disposition:</span> ${escapeHtml(i.dispositionType)}</div>
          ${i.batsReported ? `<span class="badge badge-available" style="margin-bottom:8px;">BATS: ${escapeHtml(i.batsCaseNumber)}</span>` : `<span class="badge badge-role" style="margin-bottom:8px;">Not BATS-reportable</span>`}
          <div class="cell-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);justify-content:flex-start;">
            <button class="btn btn-sm btn-outline" data-view-eodinc="${i.id}">View</button>
          </div>
        </div>
      `).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.alert}<div class="msg">No incidents on file</div></div>`}
    </div>
  `;
        const logBtn: any = (document as any).getElementById('btnLogIncident');
        if (logBtn)
            logBtn.addEventListener('click', (): any => openIncidentFormModal(null));
        (document as any).querySelectorAll('[data-view-eodinc]').forEach((b?: any): any => b.addEventListener('click', (): any => openIncidentDetailModal(b.dataset.viewEodinc)));
    }
    function openIncidentDetailModal(incId?: any): any {
        const i: any = STATE.eod.incidents.find((x?: any): any => x.id === incId);
        const canRsp: any = can('eod_rsp_view');
        const canLog: any = can('eod_incident_log');
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(i.type)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Date</div><div class="v">${i.date}</div></div>
        <div><div class="k">Location</div><div class="v">${escapeHtml(i.location)}</div></div>
        <div><div class="k">Technicians</div><div class="v">${i.technicianIds.map((id?: any): any => escapeHtml(personName(id))).join(', ') || '—'}</div></div>
        <div><div class="k">Disposition</div><div class="v">${escapeHtml(i.dispositionType)}</div></div>
        <div><div class="k">Evidence Collected</div><div class="v">${i.evidenceCollected ? 'Yes' : 'No'}</div></div>
        <div><div class="k">BATS Reported</div><div class="v">${i.batsReported ? `Yes \u2014 ${escapeHtml(i.batsCaseNumber)}` : 'No'}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Incident Summary</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.narrative)}</div></div>
      ${canRsp
            ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Render Safe Procedure (RSP) \u2014 Restricted</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.rsp)}</div></div>`
            : `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Render Safe Procedure (RSP)</h2></div><div class="panel-body">${lockedNote("This technical detail is visible to certified bomb technicians only.")}</div></div>`}
      ${canLog ? `<button class="btn btn-sm btn-outline" id="btnEditIncFromDetail">${ICONS.edit} Edit</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        const editBtn: any = (document as any).getElementById('btnEditIncFromDetail');
        if (editBtn)
            editBtn.addEventListener('click', (): any => { closeModal(); openIncidentFormModal(incId); });
    }
    function openIncidentFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const i: any = editing ? STATE.eod.incidents.find((x?: any): any => x.id === existingId) : {
            date: fmt(new Date() as any), type: STATE.eod.refData.incidentTypes[0], location: "", technicianIds: [],
            dispositionType: STATE.eod.refData.dispositionTypes[0], batsReported: false, batsCaseNumber: "", evidenceCollected: false, rsp: "", narrative: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Log'} Incident</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fIncType">${STATE.eod.refData.incidentTypes.map((t?: any): any => `<option ${i.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Date</label><input type="date" id="fIncDate" value="${i.date}"></div>
      </div>
      <div class="form-row"><label>Location</label><input type="text" id="fIncLocation" value="${escapeHtml(i.location)}"></div>
      <div class="form-row"><label>Technicians on Scene</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:140px;overflow-y:auto;">
          ${STATE.eod.technicians.map((t?: any): any => `<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:3px 0;"><input type="checkbox" class="fIncTechs" value="${t.personId}" ${i.technicianIds.includes(t.personId) ? 'checked' : ''} style="width:auto;">${escapeHtml(personName(t.personId))}</label>`).join('')}
        </div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Disposition</label><select id="fIncDisposition">${STATE.eod.refData.dispositionTypes.map((d?: any): any => `<option ${i.dispositionType === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}</select></div>
        <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:22px;"><input type="checkbox" id="fIncEvidence" ${i.evidenceCollected ? 'checked' : ''} style="width:auto;">Evidence collected</label></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fIncBats" ${i.batsReported ? 'checked' : ''} style="width:auto;">Reported to the Bomb Arson Tracking System (BATS)</label></div>
      <div class="form-row"><label>BATS Case Number</label><input type="text" id="fIncBatsCase" value="${escapeHtml(i.batsCaseNumber || '')}"></div>
      <div class="form-row"><label>Incident Summary (general)</label><textarea id="fIncNarrative" rows="3">${escapeHtml(i.narrative)}</textarea></div>
      <div class="form-row"><label>Render Safe Procedure Detail (restricted to certified technicians)</label><textarea id="fIncRsp" rows="4">${escapeHtml(i.rsp)}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Log Incident'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const location: any = (document as any).getElementById('fIncLocation').value.trim();
            if (!location) {
                toast("Enter a location.", true);
                return;
            }
            const data: any = {
                type: (document as any).getElementById('fIncType').value, date: (document as any).getElementById('fIncDate').value, location,
                technicianIds: Array.from((document as any).querySelectorAll('.fIncTechs:checked')).map((el?: any): any => el.value),
                dispositionType: (document as any).getElementById('fIncDisposition').value, evidenceCollected: (document as any).getElementById('fIncEvidence').checked,
                batsReported: (document as any).getElementById('fIncBats').checked, batsCaseNumber: (document as any).getElementById('fIncBatsCase').value.trim(),
                narrative: (document as any).getElementById('fIncNarrative').value.trim(), rsp: (document as any).getElementById('fIncRsp').value.trim()
            } as any;
            if (editing) {
                Object.assign(i, data);
                logActivity(`Updated ${data.type} incident record.`, "eod_incident", i.id);
            }
            else {
                const newI: any = { id: 'eodinc' + Date.now(), ...data } as any;
                STATE.eod.incidents.push(newI);
                logActivity(`Logged new ${data.type} incident.`, "eod_incident", newI.id);
            }
            persist();
            toast("Incident saved.");
            closeModal();
            if (ACTIVE_VIEW === 'eod-incidents')
                renderIncidents();
        };
    }
    /* =========================================================================
       THEFT / LOSS REPORTS \u2014 the hard 24-hour federal reporting deadline
       ========================================================================= */
    function hoursElapsedSince(dateStr?: any, timeStr?: any): any {
        const then: any = new Date(dateStr + 'T' + (timeStr || '00:00')) as any;
        return (Date.now() - then.getTime()) / (1000 * 60 * 60);
    }
    function renderTheftLoss(): any {
        if (!can('eod_theft_report_view')) {
            (document as any).getElementById('view-eod-theftloss').innerHTML = permissionBlockedView("You don't have permission to view theft/loss reports in this role.");
            return;
        }
        const canManage: any = can('eod_theft_report_manage');
        const list: any = STATE.eod.theftLossReports.slice().sort((a?: any, b?: any): any => b.discoveredDate.localeCompare(a.discoveredDate));
        const openCount: any = list.filter((r?: any): any => !r.reportedAtfDate).length;
        const cards: any = list.map((r?: any): any => {
            const reported: any = !!r.reportedAtfDate;
            const compliant: any = reported ? withinTheftReportWindow(r) : null;
            let statusHtml: any;
            if (reported) {
                statusHtml = compliant
                    ? `<span class="badge badge-available">Reported within ${THEFT_REPORT_HOURS}h</span>`
                    : `<span class="badge badge-missing">Reported \u2014 exceeded ${THEFT_REPORT_HOURS}h window</span>`;
            }
            else {
                const elapsed: any = hoursElapsedSince(r.discoveredDate, r.discoveredTime);
                const remaining: any = THEFT_REPORT_HOURS - elapsed;
                statusHtml = remaining > 0
                    ? `<span class="badge ${remaining <= 6 ? 'badge-assigned' : 'badge-role'}">OPEN \u2014 ${remaining.toFixed(1)}h remaining to report</span>`
                    : `<span class="badge badge-missing">OPEN \u2014 ${THEFT_REPORT_HOURS}-HOUR WINDOW EXCEEDED</span>`;
            }
            return `
    <div class="drone-card">
      <div style="font-weight:800;font-size:15px;">${escapeHtml(r.materialInvolved)} \u2014 ${escapeHtml(r.quantityLost)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin:2px 0 10px;">Discovered ${r.discoveredDate} at ${r.discoveredTime}${r.magazineId ? ' \u2014 ' + escapeHtml((magazineFor(r.magazineId) || {} as any).name || '') : ''}</div>
      <div style="margin-bottom:10px;">${statusHtml}</div>
      <div style="font-size:12.5px;margin-bottom:8px;"><span style="color:var(--text-dim);">USBDC Notified:</span> ${r.reportedUsbdc ? 'Yes' : 'No'}</div>
      <div style="font-size:12.5px;margin-bottom:8px;"><span style="color:var(--text-dim);">Local Authorities Notified:</span> ${r.localAuthoritiesNotified ? 'Yes' : 'No'}</div>
      <div style="font-size:12.5px;">${escapeHtml(r.narrative)}</div>
      ${canManage && !reported ? `<div class="cell-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);justify-content:flex-start;"><button class="btn btn-sm btn-primary" data-file-report="${r.id}">${ICONS.check} Record ATF Report Filed</button></div>` : ''}
    </div>`;
        }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.check}<div class="msg">No theft or loss has ever been reported \u2014 as it should be.</div></div>`;
        (document as any).getElementById('view-eod-theftloss').innerHTML = `
    ${!canManage ? lockedNote("You're viewing theft/loss reports in read-only mode.") : ""}
    <div class="locked-note" style="background:var(--callout-red-bg);border-color:var(--callout-red-border);color:var(--red);">
      ${ICONS.alert}<div><strong>Federal requirement:</strong> any theft or loss of explosive materials must be reported to ATF and to appropriate local authorities within 24 hours of discovery. Immediately notify the U.S. Bomb Data Center at 800-461-8841 (after hours: the ATF 24-hour hotline at 800-800-3855).</div>
    </div>
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="label">Open Reports</div><div class="value" style="color:${openCount ? 'var(--red)' : 'var(--heading)'}">${openCount}</div><div class="delta ${openCount ? 'warn' : 'ok'}">Awaiting ATF filing</div></div>
      <div class="stat-card"><div class="label">Total on File</div><div class="value">${list.length}</div></div>
    </div>
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnFileNewTheft">${ICONS.plus} Report Theft / Loss</button>` : ''}</div>
    <div class="k9-card-grid">${cards}</div>
  `;
        const newBtn: any = (document as any).getElementById('btnFileNewTheft');
        if (newBtn)
            newBtn.addEventListener('click', (): any => openTheftReportFormModal(null));
        (document as any).querySelectorAll('[data-file-report]').forEach((b?: any): any => b.addEventListener('click', (): any => openFileAtfReportModal(b.dataset.fileReport)));
    }
    function openTheftReportFormModal(existingId?: any): any {
        const now: any = new Date() as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Report Theft / Loss</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Recording this discovery starts the federal 24-hour reporting clock. File the actual ATF report as soon as possible, then return here to record that it was filed.</div>
      <div class="form-2col">
        <div class="form-row"><label>Date Discovered</label><input type="date" id="fTlDate" value="${fmt(now)}"></div>
        <div class="form-row"><label>Time Discovered</label><input type="time" id="fTlTime" value="${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Material Involved</label><select id="fTlMaterial">${STATE.eod.refData.materialTypes.map((m?: any): any => `<option>${escapeHtml(m)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Quantity Lost</label><input type="text" id="fTlQty" placeholder="e.g. 2 each, 5 lbs"></div>
      </div>
      <div class="form-row"><label>Magazine (if applicable)</label><select id="fTlMagazine"><option value="">N/A</option>${STATE.eod.magazines.map((m?: any): any => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fTlLocal" style="width:auto;">Local authorities notified</label></div>
      <div class="form-row"><label>Case Number (if any)</label><input type="text" id="fTlCase"></div>
      <div class="form-row"><label>Narrative</label><textarea id="fTlNarrative" rows="3" placeholder="How was this discovered? What steps have been taken so far?"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Record Discovery</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const qty: any = (document as any).getElementById('fTlQty').value.trim();
            if (!qty) {
                toast("Enter the quantity lost.", true);
                return;
            }
            const newR: any = {
                id: 'tlr' + Date.now(), discoveredDate: (document as any).getElementById('fTlDate').value, discoveredTime: (document as any).getElementById('fTlTime').value,
                materialInvolved: (document as any).getElementById('fTlMaterial').value, quantityLost: qty, magazineId: (document as any).getElementById('fTlMagazine').value || null,
                reportedAtfDate: null, reportedAtfTime: null, reportedUsbdc: false,
                localAuthoritiesNotified: (document as any).getElementById('fTlLocal').checked, caseNumber: (document as any).getElementById('fTlCase').value.trim(),
                narrative: (document as any).getElementById('fTlNarrative').value.trim()
            } as any;
            STATE.eod.theftLossReports.push(newR);
            logActivity(`URGENT: Recorded theft/loss discovery \u2014 ${newR.materialInvolved} (${qty}). 24-hour ATF reporting clock started.`, "eod_theft_report", newR.id);
            persist();
            toast("Discovery recorded. The 24-hour federal reporting clock has started \u2014 file with ATF and USBDC immediately.", true);
            closeModal();
            if (ACTIVE_VIEW === 'eod-theftloss')
                renderTheftLoss();
        };
    }
    function openFileAtfReportModal(reportId?: any): any {
        const r: any = STATE.eod.theftLossReports.find((x?: any): any => x.id === reportId);
        const now: any = new Date() as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Record ATF Report Filed</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:12.5px;margin-bottom:10px;">${escapeHtml(r.materialInvolved)} \u2014 ${escapeHtml(r.quantityLost)}, discovered ${r.discoveredDate} at ${r.discoveredTime}.</div>
      <div class="form-2col">
        <div class="form-row"><label>Date Reported to ATF</label><input type="date" id="fFrDate" value="${fmt(now)}"></div>
        <div class="form-row"><label>Time Reported</label><input type="time" id="fFrTime" value="${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fFrUsbdc" checked style="width:auto;">Also notified the U.S. Bomb Data Center</label></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Confirm Filed</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            r.reportedAtfDate = (document as any).getElementById('fFrDate').value;
            r.reportedAtfTime = (document as any).getElementById('fFrTime').value;
            r.reportedUsbdc = (document as any).getElementById('fFrUsbdc').checked;
            const compliant: any = withinTheftReportWindow(r);
            logActivity(`Recorded ATF theft/loss report filed for ${r.materialInvolved} \u2014 ${compliant ? 'within' : 'EXCEEDED'} the ${THEFT_REPORT_HOURS}-hour window.`, "eod_theft_report", r.id);
            persist();
            toast(compliant ? "ATF report filing recorded \u2014 within the 24-hour window." : "ATF report filing recorded \u2014 this exceeded the 24-hour window.", !compliant);
            closeModal();
            if (ACTIVE_VIEW === 'eod-theftloss')
                renderTheftLoss();
        };
    }
    /* =========================================================================
       REPORTS & ANALYTICS
       ========================================================================= */
    function renderReports(): any {
        if (!can('eod_reports_view')) {
            (document as any).getElementById('view-eod-reports').innerHTML = permissionBlockedView("You don't have permission to view EOD reports in this role.");
            return;
        }
        const canExport: any = can('eod_reports_export');
        (document as any).getElementById('view-eod-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Compliance Summary</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportEodSummary">${ICONS.download} Export (CSV)</button>` : ''}</div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Technicians Current on HDS Cert</div><div class="v">${STATE.eod.technicians.filter(technicianCurrent).length} / ${STATE.eod.technicians.length}</div></div>
          <div><div class="k">Magazines Within 7-Day Inspection Cycle</div><div class="v">${STATE.eod.magazines.filter((m?: any): any => daysBetween(m.lastInspectionDate, fmt(new Date() as any)) <= MAGAZINE_INSPECTION_DAYS).length} / ${STATE.eod.magazines.length}</div></div>
          <div><div class="k">Theft/Loss Reports Filed Within 24h</div><div class="v">${STATE.eod.theftLossReports.filter((r?: any): any => r.reportedAtfDate && withinTheftReportWindow(r)).length} / ${STATE.eod.theftLossReports.filter((r?: any): any => r.reportedAtfDate).length}</div></div>
          <div><div class="k">Incidents Reported to BATS</div><div class="v">${STATE.eod.incidents.filter((i?: any): any => i.batsReported).length} / ${STATE.eod.incidents.length}</div></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="eodCrEntity">
              <option value="incidents">Incidents</option>
              <option value="inventory">Inventory</option>
              <option value="inspections">Magazine Inspections</option>
            </select>
            <select id="eodCrGroupBy"></select>
            <input type="date" id="eodCrDateFrom">
            <input type="date" id="eodCrDateTo">
          </div>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportEodCustomReport">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
        <div class="chart-box" style="height:220px;margin-top:14px;"><canvas id="chartEodCustomReport"></canvas></div>
        <div id="eodCustomReportTable" style="margin-top:14px;overflow-x:auto;"></div>
      </div>
    </div>
  `;
        renderEodCustomReportBuilder();
        (document as any).getElementById('eodCrEntity').addEventListener('change', renderEodCustomReportBuilder);
        (document as any).getElementById('eodCrDateFrom').addEventListener('change', renderEodCustomReportBuilder);
        (document as any).getElementById('eodCrDateTo').addEventListener('change', renderEodCustomReportBuilder);
        const exportSummaryBtn: any = (document as any).getElementById('btnExportEodSummary');
        if (exportSummaryBtn)
            exportSummaryBtn.onclick = (): any => {
                exportCsvEod(["Metric", "Value"], [
                    ["Technicians Current on HDS Cert", `${STATE.eod.technicians.filter(technicianCurrent).length} / ${STATE.eod.technicians.length}`],
                    ["Magazines Within 7-Day Cycle", `${STATE.eod.magazines.filter((m?: any): any => daysBetween(m.lastInspectionDate, fmt(new Date() as any)) <= MAGAZINE_INSPECTION_DAYS).length} / ${STATE.eod.magazines.length}`],
                    ["Theft/Loss Reports Filed Within 24h", `${STATE.eod.theftLossReports.filter((r?: any): any => r.reportedAtfDate && withinTheftReportWindow(r)).length} / ${STATE.eod.theftLossReports.filter((r?: any): any => r.reportedAtfDate).length}`],
                    ["Incidents Reported to BATS", `${STATE.eod.incidents.filter((i?: any): any => i.batsReported).length} / ${STATE.eod.incidents.length}`],
                ], "eod_compliance_summary.csv");
            };
    }
    const EOD_REPORT_GROUPBY: any = {
        incidents: [['type', 'Type'], ['dispositionType', 'Disposition']],
        inventory: [['materialType', 'Material Type'], ['classification', 'Classification'], ['status', 'Status']],
        inspections: [['magazineId', 'Magazine'], ['unauthorizedEntry', 'Unauthorized Entry Flagged']]
    } as any;
    function renderEodCustomReportBuilder(): any {
        const entity: any = (document as any).getElementById('eodCrEntity').value;
        const groupSel: any = (document as any).getElementById('eodCrGroupBy');
        const opts: any = EOD_REPORT_GROUPBY[entity];
        const currentGroup: any = groupSel.dataset.current;
        const groupBy: any = (currentGroup && opts.find(([k]: any): any => k === currentGroup)) ? currentGroup : opts[0][0];
        groupSel.innerHTML = opts.map(([k, label]: any): any => `<option value="${k}" ${groupBy === k ? 'selected' : ''}>Group by ${label}</option>`).join('');
        groupSel.onchange = (): any => { groupSel.dataset.current = groupSel.value; renderEodCustomReportBuilder(); };
        groupSel.dataset.current = groupBy;
        const dateFrom: any = (document as any).getElementById('eodCrDateFrom').value;
        const dateTo: any = (document as any).getElementById('eodCrDateTo').value;
        let dataset: any;
        if (entity === 'incidents')
            dataset = STATE.eod.incidents.map((i?: any): any => ({ ...i, __date: i.date } as any));
        else if (entity === 'inventory')
            dataset = STATE.eod.inventory.map((i?: any): any => ({ ...i, __date: i.acquisitionDate } as any));
        else
            dataset = STATE.eod.magazineInspections.map((i?: any): any => ({ ...i, __date: i.date, magazineId: (magazineFor(i.magazineId) || {} as any).name || i.magazineId, unauthorizedEntry: i.unauthorizedEntry ? 'Yes' : 'No' } as any));
        dataset = dataset.filter((row?: any): any => {
            if (dateFrom && row.__date < dateFrom)
                return false;
            if (dateTo && row.__date > dateTo)
                return false;
            return true;
        });
        const counts: any = {} as any;
        dataset.forEach((row?: any): any => { const key: any = row[groupBy] || 'Unspecified'; counts[key] = (counts[key] || 0) + 1; });
        if (CHART_REFS_EOD.custom)
            CHART_REFS_EOD.custom.destroy();
        CHART_REFS_EOD.custom = safeChart('chartEodCustomReport', {
            type: 'bar',
            data: { labels: Object.keys(counts) as any, datasets: [{ label: 'Count', data: Object.values(counts) as any, backgroundColor: '#134DD1' } as any] } as any,
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any
        } as any);
        const groupLabel: any = opts.find(([k]: any): any => k === groupBy)[1];
        const tableRows: any = dataset.slice(0, 200).map((row?: any): any => `<tr><td>${escapeHtml(String(row[groupBy] || ''))}</td><td>${escapeHtml(row.__date || '')}</td></tr>`).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
        (document as any).getElementById('eodCustomReportTable').innerHTML = `
    <table><thead><tr><th>${groupLabel}</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length > 200 ? ' (showing first 200)' : ''}</div>
  `;
        const exportBtn: any = (document as any).getElementById('btnExportEodCustomReport');
        if (exportBtn)
            exportBtn.onclick = (): any => exportCsvEod([groupLabel, "Date"], dataset.map((row?: any): any => [row[groupBy] || '', row.__date || '']), `eod_custom_report_${entity}.csv`);
    }
    function exportCsvEod(headers?: any, rows?: any, filename?: any): any {
        const csv: any = [headers, ...rows].map((r?: any): any => r.map((v?: any): any => csvSafeCell(v)).join(',')).join('\\n');
        const blob: any = new Blob([csv], { type: 'text/csv' } as any);
        const url: any = URL.createObjectURL(blob);
        const a: any = (document as any).createElement('a');
        a.href = url;
        a.download = filename;
        (document as any).body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Report exported.");
    }
    /* =========================================================================
       ADMIN: reference data, notification routing, platform audit log
       ========================================================================= */
    let ADMIN_TAB: any = 'materialTypes';
    const SIMPLE_LIST_TABS: any = {
        materialTypes: { label: 'Material Types', usageCheck: (v?: any): any => STATE.eod.inventory.filter((i?: any): any => i.materialType === v).length } as any,
        materialClassifications: { label: 'Material Classifications', usageCheck: (v?: any): any => STATE.eod.inventory.filter((i?: any): any => i.classification === v).length } as any,
        incidentTypes: { label: 'Incident Types', usageCheck: (v?: any): any => STATE.eod.incidents.filter((i?: any): any => i.type === v).length } as any,
        dispositionTypes: { label: 'Disposition Types', usageCheck: (v?: any): any => STATE.eod.incidents.filter((i?: any): any => i.dispositionType === v).length } as any,
        certTypes: { label: 'Certification Types', usageCheck: (): any => 0 } as any,
        certifyingBodies: { label: 'Certifying Bodies', usageCheck: (): any => 0 } as any
    } as any;
    function renderAdmin(): any {
        const canManage: any = can('eod_admin_categories');
        const canAudit: any = can('eod_admin_audit');
        if (!canManage && !canAudit) {
            (document as any).getElementById('view-eod-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
            return;
        }
        const tabs: any = [];
        if (canManage) {
            (Object.entries(SIMPLE_LIST_TABS) as any).forEach(([key, cfg]: any): any => tabs.push([key, cfg.label]));
            tabs.push(['reference', 'ATF Regulatory Reference']);
            tabs.push(['notifications', 'Notification Routing']);
        }
        if (can('eod_bulk_import'))
            tabs.push(['bulkImport', 'Bulk Import']);
        if (canAudit)
            tabs.push(['audit', 'Platform Audit Log']);
        if (!tabs.find(([k]: any): any => k === ADMIN_TAB))
            ADMIN_TAB = tabs[0][0];
        (document as any).getElementById('view-eod-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key, label]: any): any => `<button class="btn btn-sm ${ADMIN_TAB === key ? 'btn-primary' : 'btn-outline'}" data-admin-tab-eod="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyEod"></div>
  `;
        (document as any).querySelectorAll('[data-admin-tab-eod]').forEach((b?: any): any => b.addEventListener('click', (): any => { ADMIN_TAB = b.dataset.adminTabEod; renderAdmin(); }));
        renderAdminTabBody();
    }
    function renderAdminTabBody(): any {
        const body: any = (document as any).getElementById('adminTabBodyEod');
        if (SIMPLE_LIST_TABS[ADMIN_TAB])
            renderSimpleListTab(body, ADMIN_TAB);
        else if (ADMIN_TAB === 'reference')
            renderRegulatoryReferenceTab(body);
        else if (ADMIN_TAB === 'notifications')
            renderNotificationRoutingTab(body);
        else if (ADMIN_TAB === 'bulkImport')
            renderBulkImportTab(body, 'eod');
        else if (ADMIN_TAB === 'audit')
            renderPlatformAuditLogTab(body);
    }
    function renderSimpleListTab(body?: any, key?: any): any {
        const cfg: any = SIMPLE_LIST_TABS[key];
        const list: any = STATE.eod.refData[key];
        const rows: any = list.map((v?: any, i?: any): any => {
            const inUse: any = cfg.usageCheck(v);
            return `<tr><td>${escapeHtml(v)}</td><td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item-eod="${i}">${ICONS.trash}</button></td></tr>`;
        }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputEod" placeholder="Add a new item..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemEod">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddItemEod').addEventListener('click', (): any => {
            const val: any = (document as any).getElementById('newItemInputEod').value.trim();
            if (!val) {
                toast("Enter a value first.", true);
                return;
            }
            if (list.includes(val)) {
                toast("That already exists.", true);
                return;
            }
            list.push(val);
            logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
            persist();
            renderAdminTabBody();
        });
        (document as any).querySelectorAll('[data-remove-item-eod]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const idx: any = Number(b.dataset.removeItemEod);
            const val: any = list[idx];
            if (cfg.usageCheck(val) > 0) {
                toast(`Can't remove "${val}" \u2014 it's in use.`, true);
                return;
            }
            if (!confirm(`Remove "${val}"?`))
                return;
            list.splice(idx, 1);
            logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    function renderRegulatoryReferenceTab(body?: any): any {
        body.innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.bomb}<div>This module is built around the real federal framework public safety EOD units operate under. It doesn't replace legal counsel or your agency's own compliance program, but it's grounded in current, sourced requirements rather than invented ones.</div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Legal Basis</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Governing Statutes</div><div class="v">Safe Explosives Act of 2002 (18 U.S.C. Ch. 40); National Firearms Act (26 U.S.C. Ch. 53)</div></div>
          <div><div class="k">Implementing Regulations</div><div class="v">27 CFR Part 479 (Firearms) and Part 555 (Commerce in Explosives)</div></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Certification</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Certifying Authority</div><div class="v">FBI Hazardous Devices School, Redstone Arsenal, Huntsville AL \u2014 the sole facility that trains and certifies U.S. public safety bomb technicians</div></div>
          <div><div class="k">Basic Certification</div><div class="v">6-week course; required for every public safety bomb technician</div></div>
          <div><div class="k">Recertification Cycle</div><div class="v">Every 3 years (40 hours advanced training), plus required monthly training and annual review</div></div>
          <div><div class="k">Additional Requirement</div><div class="v">HazMat Technician certification, per national bomb squad guidelines</div></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Storage (27 CFR Part 555, Subpart K)</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Magazine Types</div><div class="v">Type 1 (permanent), Type 2 (mobile), Type 3 (day box, attended only), Type 4 (low explosives), Type 5 (bulk blasting agents)</div></div>
          <div><div class="k">Inspection Requirement</div><div class="v">At least every 7 days while explosive material is stored (27 CFR 555.204)</div></div>
          <div><div class="k">Table of Distances</div><div class="v">Minimum distances from inhabited buildings, highways, and railways, scaled to quantity (27 CFR 555.218\u2013220)</div></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Incident & Loss Reporting</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Theft / Loss</div><div class="v">Must be reported to ATF and local authorities within 24 hours of discovery</div></div>
          <div><div class="k">National Repository</div><div class="v">U.S. Bomb Data Center (USBDC) \u2014 800-461-8841 (after hours: 800-800-3855)</div></div>
          <div><div class="k">Incident Database</div><div class="v">Bomb Arson Tracking System (BATS), jointly run by ATF/FBI; Render Safe Procedure detail is restricted to certified bomb technicians</div></div>
        </div>
      </div>
    </div>
  `;
    }
    function renderNotificationRoutingTab(body?: any): any {
        const roleOpts: any = (sel?: any): any => STATE.roles.map((r?: any): any => `<option value="${r.id}" ${sel === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>HDS Recertification Due Alerts</label><select id="fRouteEodRecert">${roleOpts(STATE.eod.notifySettings.hdsRecertRoleId)}</select></div>
        <div class="form-row"><label>Magazine Inspection Overdue Alerts</label><select id="fRouteEodInspection">${roleOpts(STATE.eod.notifySettings.inspectionDueRoleId)}</select></div>
        <div class="form-row"><label>Theft / Loss Report Alerts</label><select id="fRouteEodTheft">${roleOpts(STATE.eod.notifySettings.theftReportRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingEod">Save Routing</button>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveRoutingEod').addEventListener('click', (): any => {
            STATE.eod.notifySettings.hdsRecertRoleId = (document as any).getElementById('fRouteEodRecert').value;
            STATE.eod.notifySettings.inspectionDueRoleId = (document as any).getElementById('fRouteEodInspection').value;
            STATE.eod.notifySettings.theftReportRoleId = (document as any).getElementById('fRouteEodTheft').value;
            logActivity("Updated EOD Mgmt notification routing settings.", "admin");
            persist();
            toast("Notification routing saved.");
            renderNotifBell();
        });
    }
    /* =========================================================================
       MAGAZINE DETAIL (referenced by dashboard/magazines links)
       ========================================================================= */
    function openMagazineDetail(magazineId?: any): any {
        if (!SuiteUX.openRecord("eod", "magazine", magazineId))
            return;
        const m: any = magazineFor(magazineId);
        if (!m) {
            return;
        }
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(m.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body" id="magDetailBody">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Type</div><div class="v">${escapeHtml(m.type)}</div></div>
        <div><div class="k">Location</div><div class="v">${escapeHtml(m.location)}</div></div>
        <div><div class="k">Last Inspected</div><div class="v">${m.lastInspectionDate}</div></div>
        <div><div class="k">Security Features</div><div class="v">${(m.securityFeatures ? escapeHtml(m.securityFeatures) : '—')}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Inspection History</h2></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Inspector</th><th>Unauthorized Entry?</th><th>Notes</th></tr></thead><tbody>
        ${STATE.eod.magazineInspections.filter((i?: any): any => i.magazineId === m.id).sort((a?: any, b?: any): any => b.date.localeCompare(a.date)).map((i?: any): any => `
          <tr><td>${i.date}</td><td>${escapeHtml(personName(i.inspectorId))}</td><td>${i.unauthorizedEntry ? '<span style="color:var(--red);font-weight:700;">YES</span>' : 'No'}</td><td style="font-size:12px;">${escapeHtml(i.notes || '')}</td></tr>
        `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px;">No inspections logged yet.</td></tr>`}
        </tbody></table></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Current Contents</h2></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Material</th><th>Quantity</th><th>Status</th></tr></thead><tbody>
        ${STATE.eod.inventory.filter((i?: any): any => i.magazineId === m.id).map((i?: any): any => `<tr><td>${escapeHtml(i.materialType)}</td><td>${i.quantity} ${escapeHtml(i.unit)}</td><td><span class="badge ${statusBadgeClassEod(i.status)}">${i.status}</span></td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No inventory currently logged in this magazine.</td></tr>`}
        </tbody></table></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
    }
    /* =========================================================================
       MODULE ENTRY POINT
       ========================================================================= */
    function startEodModule(): any {
        renderNav();
        switchView('eod-dashboard');
    }
    (window as any).EOD = { start: startEodModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: (): any => renderView(ACTIVE_VIEW), openTechDetail, openMagazineDetail, technicianCurrent, MAGAZINE_INSPECTION_DAYS } as any;
})();
