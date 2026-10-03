/* =========================================================================
   GRANTS & ASSET FORFEITURE MODULE (IIFE-scoped; reads/writes STATE.grants)
   Grounded in real federal frameworks: the DOJ/Treasury Equitable Sharing
   Program (28 U.S.C. 524(c), SAM.gov/CAGE registration, official-use and
   supplement-not-supplant restrictions, ESAC certification) and the Edward
   Byrne Memorial Justice Assistance Grant (JAG) program administered by
   BJA (9 statutory program areas, no-match formula funding, and the newly
   permitted but prior-approval-required purchase of UAS/counter-UAS
   equipment as of the FY2026 JAG guidance).
   ========================================================================= */
(function (): any {
    const SEIZURE_TYPES: any = ["Cash", "Vehicle", "Real Property", "Firearm", "Electronics", "Jewelry / Valuables", "Other Property"];
    const FORFEITURE_TYPES: any = ["Federal Adoption", "State Civil Forfeiture", "State Criminal Forfeiture", "Joint Task Force (Equitable Sharing)"];
    const SEIZURE_STATUSES: any = ["Pending", "Forfeited", "Equitable Share Received", "Returned to Owner", "Closed"];
    // Real cash lifecycle: DOJ's Equitable Sharing guide explicitly requires "accounting for shared
    // cash, proceeds, and tangible property" through each stage -- this models that lifecycle directly.
    const CASH_PHASES: any = ["Seized (In Evidence)", "Pending Forfeiture", "Forfeited", "Received \u2014 Agency Fund", "Encumbered / Earmarked", "Expended", "Closed / Reconciled"];
    const DISPOSITION_TYPES: any = ["Pending", "Forfeited to Agency (Official Use)", "Equitable Share \u2014 Cash", "Equitable Share \u2014 Property", "Returned to Owner", "Destroyed", "Auctioned / Sold"];
    const FUNDING_AGENCIES: any = ["DOJ - Bureau of Justice Assistance (Byrne JAG)", "DHS/FEMA - Homeland Security Grant Program", "DOJ - COPS Hiring Program", "DOJ - Bulletproof Vest Partnership", "U.S. Marshals Service (Equitable Sharing)", "Department of the Treasury (Equitable Sharing)", "State Grant", "Other"];
    const PROGRAM_AREAS: any = ["Law Enforcement", "Prosecution, Court, and Indigent Defense", "Prevention and Education", "Corrections and Community Corrections", "Drug Treatment and Drug Enforcement", "Planning, Evaluation, and Technology Improvement", "Crime Victims and Witness Protection", "Mental Health Programs", "State Crisis Intervention Court Proceedings"];
    const GRANT_STATUSES: any = ["Applied", "Awarded", "Active", "Closed", "Reporting Overdue"];
    function defaultRefDataGrants(): any {
        return { seizureTypes: [...SEIZURE_TYPES], forfeitureTypes: [...FORFEITURE_TYPES], dispositionTypes: [...DISPOSITION_TYPES],
            fundingAgencies: [...FUNDING_AGENCIES], programAreas: [...PROGRAM_AREAS] } as any;
    }
    /* =========================================================================
       SEED DATA
       ========================================================================= */
    function buildCashLedger(today?: any, entries?: any): any {
        return entries.map(([phase, daysAgo, amount, notes]: any, i?: any): any => ({
            id: "cl" + i, phase, date: fmt(addDays(today, daysAgo)), amount, notes, recordedBy: "Fred Marziano"
        } as any));
    }
    function seedSeizures(): any {
        const today: any = new Date() as any;
        const rows: any = [
            ["CR26-01894", -95, "Cash", "Joint Task Force (Equitable Sharing)", 48500, "Cash seized incident to arrest during a multi-agency narcotics interdiction stop on I-80.", "Equitable Share Received", "Equitable Share \u2014 Cash", -40, 18200, 37.5, "U.S. Marshals Service"],
            ["CR26-02011", -70, "Vehicle", "State Criminal Forfeiture", 32000, "2021 Cadillac Escalade forfeited following conviction; retained for official use as an undercover surveillance vehicle.", "Forfeited", "Forfeited to Agency (Official Use)", -20, null, null, null],
            ["CR26-01772", -140, "Firearm", "Joint Task Force (Equitable Sharing)", 1200, "Unregistered firearm seized during a search warrant execution; destroyed per policy after case adjudication.", "Closed", "Destroyed", -30, null, null, null],
            ["CR26-02150", -15, "Cash", "State Civil Forfeiture", 8750, "Cash seized during a traffic stop with a positive K9 alert; forfeiture proceeding pending in district court.", "Pending", "Pending", null, null, null, null],
            ["CV25-00892", -310, "Real Property", 'State Civil Forfeiture', 185000, "Residential property used to facilitate drug trafficking; sold at public auction following civil forfeiture judgment.", "Closed", "Auctioned / Sold", -90, 142000, null, null],
            ["CR26-02203", -50, "Electronics", "Federal Adoption", 6200, "Laptops and phones seized in a wire fraud investigation, adopted for federal prosecution.", "Forfeited", "Equitable Share \u2014 Property", -10, null, null, "Department of the Treasury"],
            ["CR25-04410", -260, "Cash", "State Criminal Forfeiture", 21300, "Cash seized during execution of a search warrant tied to an organized retail theft ring; fully processed and expended on training.", "Closed", "Expended", -200, 19800, null, null],
        ];
        const cashLedgers: any = {
            "CR26-01894": buildCashLedger(today, [
                ["Seized (In Evidence)", -95, 48500, "Counted and logged into evidence with two-officer verification."],
                ["Pending Forfeiture", -85, 48500, "Civil forfeiture petition filed; claimant did not contest."],
                ["Forfeited", -45, 48500, "Default judgment entered; federal adoption finalized with U.S. Marshals Service."],
                ["Received \u2014 Agency Fund", -40, 18200, "Net equitable share received after 62.5% federal retention; deposited to agency forfeiture fund account."],
                ["Encumbered / Earmarked", -20, 18200, "Earmarked for approved law-enforcement equipment purchase per official-use restrictions."],
            ]),
            "CR26-02150": buildCashLedger(today, [
                ["Seized (In Evidence)", -15, 8750, "Counted and logged into evidence; K9 certification and alert documented in report."],
                ["Pending Forfeiture", -10, 8750, "State civil forfeiture petition filed; awaiting response deadline."],
            ]),
            "CR25-04410": buildCashLedger(today, [
                ["Seized (In Evidence)", -260, 21300, "Counted and logged into evidence with two-officer verification."],
                ["Pending Forfeiture", -250, 21300, "State criminal forfeiture pursued alongside prosecution."],
                ["Forfeited", -215, 21300, "Forfeiture judgment entered following conviction."],
                ["Received \u2014 Agency Fund", -210, 19800, "Net proceeds received after administrative processing costs."],
                ["Encumbered / Earmarked", -205, 19800, "Earmarked for in-service training per agency forfeiture-fund use policy."],
                ["Expended", -200, 19800, "Funds spent on advanced tactical training course tuition and travel."],
                ["Closed / Reconciled", -195, 19800, "Fund fully reconciled against receipts; case closed."],
            ])
        } as any;
        return rows.map(([caseNumber, daysAgo, seizureType, forfeitureType, estimatedValue, description, status, dispositionType, dispDaysAgo, shareAmount, sharePercent, sharingAgency]: any, i?: any): any => {
            const seizureDate: any = fmt(addDays(today, daysAgo));
            return {
                id: "sz" + (i + 1), caseNumber, seizureDate, seizureType, forfeitureType, estimatedValue, description, status,
                seizingOfficerId: ["p1", "p2", "p3", "p6"][i % 4], location: "Reno, NV",
                dispositionType, dispositionDate: dispDaysAgo != null ? fmt(addDays(today, dispDaysAgo)) : null,
                equitableShareAmount: shareAmount, equitableSharePercent: sharePercent, sharingAgencyFederal: sharingAgency,
                officialUseDesignation: forfeitureType === 'State Criminal Forfeiture' && status === 'Forfeited' ? "Undercover surveillance vehicle - Investigations Unit" : "",
                samRegistrationCurrent: true, fieldHistory: [], notes: "",
                cashLedger: cashLedgers[caseNumber] || (seizureType === 'Cash' ? [] : undefined)
            } as any;
        });
    }
    function seedGrants(): any {
        const today: any = new Date() as any;
        const rows: any = [
            ["Byrne JAG FY2025 - Local Formula", "2025-DJ-BX-0142", "DOJ - Bureau of Justice Assistance (Byrne JAG)", "Law Enforcement", 85000, false, 0, -330, 35, "Active", "Quarterly", 25,
                [["Motorola APX Radios (12 units)", 42000, "2025-11-10", false], ["Body-Worn Cameras (20 units)", 28000, "2026-01-15", false]]],
            ["Bulletproof Vest Partnership FY2025", "2025-BV-3391", "DOJ - Bulletproof Vest Partnership", "Law Enforcement", 22000, true, 22000, -180, 540, "Active", "Annual", 120,
                [["Ballistic Vests (40 units, agency + BVP match)", 44000, "2025-09-01", false]]],
            ["Byrne JAG FY2026 - Technology Improvement", "2026-DJ-BX-0077", "DOJ - Bureau of Justice Assistance (Byrne JAG)", "Planning, Evaluation, and Technology Improvement", 65000, false, 0, -40, 320, "Active", "Quarterly", 50,
                [["DJI Matrice 350 RTK UAS (prior BJA approval required per FY2026 UAS guidance)", 38000, "2026-02-01", true]]],
            ["Homeland Security Grant Program FY2024", "2024-HSGP-1150", "DHS/FEMA - Homeland Security Grant Program", "Planning, Evaluation, and Technology Improvement", 120000, false, 0, -500, -45, "Closed", "Annual", null,
                [["Regional Interoperable Communications Upgrade", 112000, "2025-03-01", false]]],
            ["COPS Hiring Program FY2023", "2023-CH-WX-0512", "DOJ - COPS Hiring Program", "Law Enforcement", 450000, true, 150000, -650, -15, "Reporting Overdue", "Semi-Annual", -15,
                []],
            ["State Criminal Justice Grant FY2026", "NV-CJ-26-0031", "State Grant", "Drug Treatment and Drug Enforcement", 30000, true, 10000, -25, 340, "Active", "Annual", 340,
                [["Naloxone / Overdose Response Kits", 6500, "2026-08-10", false]]],
        ];
        return rows.map(([grantName, grantNumber, fundingAgency, programArea, awardAmount, matchRequired, matchAmount, startDaysAgo, endDaysFromNow, status, reportingFrequency, nextReportDaysFromNow, equipment]: any, i?: any): any => {
            const awardStartDate: any = fmt(addDays(today, startDaysAgo));
            const awardEndDate: any = fmt(addDays(today, endDaysFromNow));
            return {
                id: "gr" + (i + 1), grantName, grantNumber, fundingAgency, programArea, awardAmount,
                matchRequired, matchAmount, matchPercent: matchRequired ? Math.round((matchAmount / (awardAmount + matchAmount)) * 100) : 0,
                awardStartDate, awardEndDate, status, reportingFrequency,
                nextReportDue: nextReportDaysFromNow != null ? fmt(addDays(today, nextReportDaysFromNow)) : null,
                samRegistrationCurrent: true, cageCode: "8X" + (100 + i * 37).toString().padStart(4, '0'),
                grantManagerId: ["p1", "p9", "p2", "p6"][i % 4],
                fundedEquipment: equipment.map((e?: any, ei?: any): any => ({ id: `ge${i + 1}_${ei + 1}`, description: e[0], cost: e[1], purchaseDate: e[2], requiresPriorApproval: e[3], approvalDate: e[3] ? fmt(addDays(new Date(e[2]) as any, -14)) : null, approvalReference: e[3] ? "BJA-UAS-APPR-2026-014" : null } as any)),
                fieldHistory: [], notes: ""
            } as any;
        });
    }
    /* =========================================================================
       STATE LIFECYCLE
       ========================================================================= */
    // The top row is fixed to these four -- always shown, always the same size, so the row keeps
    // reading as "the four headline numbers" no matter how someone rearranges them. Only their left-
    // to-right order is personal; nothing here can be hidden, resized, or removed.
    const TOP_WIDGETS: any = [
        { id: "stat_total_seized", label: "Total Estimated Value Seized" } as any,
        { id: "stat_equitable_share", label: "Total Equitable Share Received" } as any,
        { id: "stat_active_grants", label: "Active Grants & Total Award Value" } as any,
        { id: "stat_reporting_due", label: "Grants With Reporting Due (30 Days)" } as any,
    ];
    // Everything else: optional, addable/removable, draggable to any position, and resizable to one
    // of the four grid-span presets. defaultSize is only what a widget starts at the first time
    // someone adds it -- after that, their own saved size always wins.
    const EXTRA_WIDGETS: any = [
        { id: "chart_seizure_type", label: "Seizures by Type", defaultSize: "half" } as any,
        { id: "chart_seizure_status", label: "Seizures by Status", defaultSize: "half" } as any,
        { id: "chart_grant_program", label: "Grant Funding by Program Area", defaultSize: "half" } as any,
        { id: "chart_match_funds", label: "Award Amount vs. Match Committed", defaultSize: "half" } as any,
        { id: "list_reporting_deadlines", label: "Upcoming Reporting Deadlines", defaultSize: "full" } as any,
        { id: "list_recent_seizures", label: "Recent Seizures", defaultSize: "full" } as any,
        { id: "stat_cash_tracked", label: "Total Cash Currently Tracked", defaultSize: "quarter" } as any,
        { id: "chart_cash_phase", label: "Cash by Lifecycle Phase", defaultSize: "half" } as any,
    ];
    const AVAILABLE_WIDGETS: any = [...TOP_WIDGETS, ...EXTRA_WIDGETS]; // renderWidget(id) below still works the same regardless of which zone a widget lives in
    const DEFAULT_EXTRAS: any = ["chart_seizure_type", "chart_seizure_status", "list_reporting_deadlines", "list_recent_seizures"].map((id?: any): any => ({ id, size: (EXTRA_WIDGETS.find((w?: any): any => w.id === id) || {} as any).defaultSize || 'half' } as any));
    function buildData(): any {
        return {
            seizures: seedSeizures(),
            grants: seedGrants(),
            refData: defaultRefDataGrants(),
            notifications: [],
            notifySettings: { reportingDueRoleId: "role_admin", samExpiringRoleId: "role_admin" } as any,
            dashboardPrefs: {} as any, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
            activity: []
        } as any;
    }
    function migrateData(): any {
        if (!STATE.grants.refData)
            STATE.grants.refData = defaultRefDataGrants();
        if (!STATE.grants.notifications)
            STATE.grants.notifications = [];
        if (!STATE.grants.notifySettings)
            STATE.grants.notifySettings = { reportingDueRoleId: STATE.roles[0].id, samExpiringRoleId: STATE.roles[0].id } as any;
        if (!STATE.grants.dashboardPrefs)
            STATE.grants.dashboardPrefs = {} as any;
        STATE.grants.seizures.forEach((s?: any): any => {
            if (!s.fieldHistory)
                s.fieldHistory = [];
            if (s.seizureType === 'Cash') {
                if (!s.cashLedger)
                    s.cashLedger = [];
                if (!s.cashLedger.length)
                    s.cashLedger.push({ phase: CASH_PHASES[0], amount: s.estimatedValue, date: s.seizureDate, notes: 'Initial intake (backfilled).' } as any);
            }
            if (!s.photos)
                s.photos = [];
        });
        STATE.grants.grants.forEach((g?: any): any => {
            if (!g.fieldHistory)
                g.fieldHistory = [];
            if (!g.fundedEquipment)
                g.fundedEquipment = [];
        });
    }
    function logActivity(text?: any, entityType?: any, entityId?: any): any {
        STATE.grants.activity.push({ ts: fmt(new Date() as any), text, entityType: entityType || "general", entityId: entityId || null } as any);
        logAuditEntry('Grants', text, entityType);
    }
    function seizureFor(id?: any): any { return STATE.grants.seizures.find((s?: any): any => s.id === id); }
    function latestCashEntry(s?: any): any {
        if (!s.cashLedger || !s.cashLedger.length)
            return null;
        // Sort is stable (guaranteed since ES2019), so entries logged on the same date still fall back
        // to whichever was actually entered last -- this only changes behavior for the case it's meant
        // to fix (an out-of-order/backdated entry), not the normal case of entries already in order.
        const sorted: any = s.cashLedger.slice().sort((a?: any, b?: any): any => (a.date || '').localeCompare(b.date || ''));
        return sorted[sorted.length - 1];
    }
    function currentCashPhase(s?: any): any { const e: any = latestCashEntry(s); return e ? e.phase : null; }
    function currentCashAmount(s?: any): any { const e: any = latestCashEntry(s); return e ? e.amount : s.estimatedValue; }
    function allCashLedgerEntries(): any {
        const out: any = [];
        STATE.grants.seizures.filter((s?: any): any => s.seizureType === 'Cash' && s.cashLedger).forEach((s?: any): any => {
            s.cashLedger.forEach((entry?: any): any => out.push({ ...entry, caseNumber: s.caseNumber, seizureId: s.id } as any));
        });
        return out;
    }
    function grantFor(id?: any): any { return STATE.grants.grants.find((g?: any): any => g.id === id); }
    function recordFieldChangeGrants(entity?: any, field?: any, oldVal?: any, newVal?: any): any {
        if (JSON.stringify(oldVal) === JSON.stringify(newVal))
            return;
        entity.fieldHistory.push({
            date: fmt(new Date() as any), field, before: oldVal, after: newVal,
            changedBy: (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || 'System'
        } as any);
    }
    function myWidgetPrefs(): any {
        let p: any = STATE.grants.dashboardPrefs[CURRENT_USER_ID];
        const topIds: any = TOP_WIDGETS.map((w?: any): any => w.id);
        const extraIds: any = EXTRA_WIDGETS.map((w?: any): any => w.id);
        if (!p || (!p.topOrder && !p.extras)) {
            // Either brand new, or this is the OLD single-list format from before top/extras were split --
            // in that case, carry over whatever the person already had enabled into the new shape instead
            // of just resetting them to the defaults and losing their previous choices.
            const oldList: any = (p && Array.isArray(p.widgets)) ? p.widgets : null;
            p = {
                topOrder: oldList ? [...oldList.filter((id?: any): any => topIds.includes(id)), ...topIds.filter((id?: any): any => !oldList.includes(id))] : [...topIds],
                extras: oldList ? oldList.filter((id?: any): any => extraIds.includes(id)).map((id?: any): any => ({ id, size: (EXTRA_WIDGETS.find((w?: any): any => w.id === id) || {} as any).defaultSize || 'half' } as any)) : DEFAULT_EXTRAS.map((e?: any): any => ({ ...e } as any))
            } as any;
            STATE.grants.dashboardPrefs[CURRENT_USER_ID] = p;
        }
        if (!Array.isArray(p.topOrder))
            p.topOrder = [...topIds];
        if (!Array.isArray(p.extras))
            p.extras = [];
        // Heal against catalog changes either direction: drop any saved id the catalog no longer has
        // (a widget that was removed from the app), and add back any top-row id that's missing (the
        // top row is never optional, so if the catalog ever grows a 5th pinned stat, everyone should
        // pick it up automatically rather than silently keep seeing only 4 of 5).
        p.topOrder = [...p.topOrder.filter((id?: any): any => topIds.includes(id)), ...topIds.filter((id?: any): any => !p.topOrder.includes(id))];
        p.extras = p.extras.filter((e?: any): any => e && extraIds.includes(e.id));
        return p;
    }
    /* =========================================================================
       NAV
       ========================================================================= */
    const NAV_ITEMS: any = [
        { id: "grants-dashboard", label: "Dashboard", icon: "dashboard", title: "Dashboard", sub: "Configurable analytics across seizures, forfeitures, and grant funding", requiredAbility: null } as any,
        { id: "grants-seizures", label: "Seizures & Forfeiture", icon: "gavel", title: "Seizures & Forfeiture", sub: "Seized property, disposition, and equitable sharing", requiredAbility: "grants_seizure_view" } as any,
        { id: "grants-cashledger", label: "Cash Fund Ledger", icon: "dollar", title: "Cash Fund Ledger", sub: "Every cash movement, phase by phase, across every case", requiredAbility: "grants_seizure_view" } as any,
        { id: "grants-awards", label: "Grant Awards", icon: "briefcase", title: "Grant Awards", sub: "Grant funding, matching requirements, and funded equipment", requiredAbility: "grants_award_view" } as any,
        { id: "grants-reports", label: "Reports", icon: "chart", title: "Reports & Analytics", sub: "Configurable report builder across seizures and grants", requiredAbility: "grants_reports_view" } as any,
        { id: "grants-admin", label: "Admin", icon: "gear", title: "Administration", sub: "Funding agencies, program areas, and the system audit log", requiredAbility: ["grants_admin_categories", "grants_admin_audit"] } as any,
    ];
    let ACTIVE_VIEW: any = "grants-dashboard";
    function navItemVisible(item?: any): any {
        if (!can('module_grants'))
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
        if (id === "grants-dashboard")
            renderDashboard();
        else if (id === "grants-seizures")
            renderSeizures();
        else if (id === "grants-cashledger")
            renderCashLedger();
        else if (id === "grants-awards")
            renderAwards();
        else if (id === "grants-reports")
            renderReports();
        else if (id === "grants-admin")
            renderAdmin();
    }
    /* =========================================================================
       NOTIFICATIONS
       ========================================================================= */
    function recalcNotifications(): any {
        const today: any = new Date() as any;
        const upcoming: any = [];
        STATE.grants.grants.filter((g?: any): any => g.status === "Active" || g.status === "Reporting Overdue").forEach((g?: any): any => {
            if (g.nextReportDue) {
                const days: any = daysBetween(fmt(today), g.nextReportDue);
                if (days <= 30)
                    upcoming.push({ type: "reporting_due", entityId: g.id, message: `${g.grantName} has a report ${days < 0 ? 'overdue by ' + Math.abs(days) + ' days' : 'due in ' + days + ' days'} (${g.nextReportDue}).`, recipientRoleId: STATE.grants.notifySettings.reportingDueRoleId } as any);
            }
        });
        const prevReadBy: any = {} as any;
        STATE.grants.notifications.forEach((n?: any): any => { prevReadBy[n.type + '|' + n.entityId] = n.readBy || []; });
        STATE.grants.notifications = upcoming.map((n?: any): any => ({
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
    function grantsStatusBadgeClass(status?: any): any {
        return ({ "Pending": "badge-role", "Forfeited": "badge-assigned", "Equitable Share Received": "badge-available", "Returned to Owner": "badge-role", "Closed": "badge-role",
            "Applied": "badge-role", "Awarded": "badge-assigned", "Active": "badge-available", "Reporting Overdue": "badge-missing" } as any)[status] || "badge-role";
    }
    function seizureLink(id?: any): any {
        const s: any = seizureFor(id);
        return `<a href="#" data-open-seizure="${id}" class="record-link">${escapeHtml(s ? s.caseNumber : 'Unknown')}</a>`;
    }
    function wireSeizureLinks(): any {
        (document as any).querySelectorAll('[data-open-seizure]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openSeizureDetail(a.dataset.openSeizure); }));
    }
    function grantLink(id?: any): any {
        const g: any = grantFor(id);
        return `<a href="#" data-open-grant="${id}" class="record-link">${escapeHtml(g ? g.grantName : 'Unknown')}</a>`;
    }
    function wireGrantLinks(): any {
        (document as any).querySelectorAll('[data-open-grant]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openGrantDetail(a.dataset.openGrant); }));
    }
    /* =========================================================================
       CONFIGURABLE DASHBOARD
       Each user chooses which widgets they see and in what order; preferences
       are stored per-person, so a Grants Admin and a Supervisor can each see a
       completely different dashboard without stepping on each other.
       ========================================================================= */
    let CHART_REFS_GRANTS: any = {} as any;
    function destroyChartsGrants(): any { (Object.values(CHART_REFS_GRANTS) as any).forEach((c?: any): any => c && c.destroy()); CHART_REFS_GRANTS = {} as any; }
    function renderDashboard(): any {
        recalcNotifications();
        const prefs: any = myWidgetPrefs();
        const canCustomize: any = can('grants_dashboard_customize');
        const root: any = (document as any).getElementById('view-grants-dashboard');
        root.innerHTML = `
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">${canCustomize ? 'Drag the handle on any card to rearrange it. This layout is saved to your account only.' : 'This is the agency default layout for your role.'}</div>
      ${canCustomize ? `<button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>` : ''}
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map((id?: any): any => renderTopWidget(id, canCustomize)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map((e?: any): any => renderExtraWidget(e.id, e.size, canCustomize)).join('')}
    </div>
  `;
        destroyChartsGrants();
        renderWidgetCharts(prefs.extras.map((e?: any): any => e.id));
        wireSeizureLinks();
        wireGrantLinks();
        // Scoped to `root`, this module's own dashboard container -- every module's dashboard uses the
        // same internal ids and all of them sit in the page at once, just hidden when inactive, so an
        // unscoped document-wide lookup here could silently grab a different, hidden module's element.
        root.querySelectorAll('[data-nav-dest]').forEach((b?: any): any => b.addEventListener('click', (): any => switchView(b.dataset.navDest)));
        if (canCustomize) {
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
        }
        const custBtn: any = root.querySelector('#btnCustomizeDashboard');
        if (custBtn)
            custBtn.addEventListener('click', openCustomizeDashboardModal);
    }
    const DASH_SIZE_LABELS: any = { quarter: '\u00bc', half: '\u00bd', threeQuarter: '\u00be', full: 'Full' } as any;
    function renderTopWidget(id?: any, canCustomize?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}">
    ${canCustomize ? `<div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>` : ''}
    ${renderWidget(id)}
  </div>`;
    }
    function renderExtraWidget(id?: any, size?: any, canCustomize?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}">
    ${canCustomize ? `<div class="dash-widget-toolbar">
      <span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span>
      <button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size] || '\u00bd'}</button>
      <button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button>
    </div>` : ''}
    ${renderWidget(id)}
  </div>`;
    }
    function wireDashDragDrop(zone?: any, orderedArray?: any, isExtras?: any): any {
        // Draggable is set only on the small handle icon, never on the whole card -- if the entire card
        // were draggable, an ordinary click meant to navigate (the stat cards are still clickable links
        // to their full screen) could get misread by the browser as the start of a drag instead of a
        // click. Dragging from the handle still visually picks up the whole card via setDragImage.
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
                // Both branches mutate the SAME array object myWidgetPrefs() already stored on
                // STATE.grants.dashboardPrefs -- splice() reorders it in place, so this is already a real
                // change to persisted state before persist() is even called, not a copy that needs saving
                // back separately.
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
    function renderWidget(id?: any): any {
        const seizures: any = STATE.grants.seizures, grants: any = STATE.grants.grants;
        if (id === 'stat_total_seized') {
            const total: any = seizures.reduce((s?: any, x?: any): any => s + x.estimatedValue, 0);
            return `<button class="stat-card dash-clickable" data-nav-dest="grants-seizures"><div class="label">Total Estimated Value Seized</div><div class="value">${money(total)}</div><div class="delta neutral">${seizures.length} seizure record(s)</div></button>`;
        }
        if (id === 'stat_equitable_share') {
            const total: any = seizures.reduce((s?: any, x?: any): any => s + (x.equitableShareAmount || 0), 0);
            return `<button class="stat-card dash-clickable" data-nav-dest="grants-seizures"><div class="label">Total Equitable Share Received</div><div class="value">${money(total)}</div><div class="delta neutral">Cash + property returned via DOJ/Treasury sharing</div></button>`;
        }
        if (id === 'stat_active_grants') {
            const active: any = grants.filter((g?: any): any => g.status === 'Active');
            const total: any = active.reduce((s?: any, g?: any): any => s + g.awardAmount, 0);
            return `<button class="stat-card dash-clickable" data-nav-dest="grants-awards"><div class="label">Active Grants</div><div class="value">${active.length} <span style="font-size:14px;color:var(--text-dim);font-weight:600;">/ ${money(total)}</span></div><div class="delta neutral">Total active award value</div></button>`;
        }
        if (id === 'stat_reporting_due') {
            const due: any = grants.filter((g?: any): any => g.nextReportDue && daysBetween(fmt(new Date() as any), g.nextReportDue) <= 30);
            return `<button class="stat-card dash-clickable" data-nav-dest="grants-awards"><div class="label">Reporting Due (30 Days)</div><div class="value" style="color:${due.length ? 'var(--red)' : 'var(--heading)'}">${due.length}</div><div class="delta ${due.length ? 'warn' : 'ok'}">Grants needing a report soon</div></button>`;
        }
        if (id === 'chart_seizure_type') {
            return `<div class="panel"><div class="panel-head"><h2>Seizures by Type</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartSeizureType"></canvas></div></div></div>`;
        }
        if (id === 'chart_seizure_status') {
            return `<div class="panel"><div class="panel-head"><h2>Seizures by Status</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartSeizureStatus"></canvas></div></div></div>`;
        }
        if (id === 'chart_grant_program') {
            return `<div class="panel"><div class="panel-head"><h2>Grant Funding by Program Area</h2></div><div class="panel-body"><div class="chart-box" style="height:240px;"><canvas id="chartGrantProgram"></canvas></div></div></div>`;
        }
        if (id === 'chart_match_funds') {
            return `<div class="panel"><div class="panel-head"><h2>Award Amount vs. Match Committed</h2></div><div class="panel-body"><div class="chart-box" style="height:240px;"><canvas id="chartMatchFunds"></canvas></div></div></div>`;
        }
        if (id === 'list_reporting_deadlines') {
            const due: any = grants.filter((g?: any): any => g.nextReportDue).sort((a?: any, b?: any): any => a.nextReportDue.localeCompare(b.nextReportDue));
            return `<div class="panel"><div class="panel-head"><h2>Upcoming Reporting Deadlines</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Grant</th><th>Frequency</th><th>Next Due</th><th>Status</th></tr></thead><tbody>
      ${due.map((g?: any): any => `<tr><td>${grantLink(g.id)}</td><td>${escapeHtml(g.reportingFrequency)}</td><td style="${daysBetween(fmt(new Date() as any), g.nextReportDue) < 0 ? 'color:var(--red);font-weight:700;' : ''}">${g.nextReportDue}</td><td><span class="badge ${grantsStatusBadgeClass(g.status)}">${g.status}</span></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">No upcoming deadlines.</td></tr>`}
      </tbody></table></div></div>`;
        }
        if (id === 'list_recent_seizures') {
            const recent: any = seizures.slice().sort((a?: any, b?: any): any => b.seizureDate.localeCompare(a.seizureDate)).slice(0, 6);
            return `<div class="panel"><div class="panel-head"><h2>Recent Seizures</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Case #</th><th>Type</th><th>Value</th><th>Date</th><th>Status</th></tr></thead><tbody>
      ${recent.map((s?: any): any => `<tr><td>${seizureLink(s.id)}</td><td>${escapeHtml(s.seizureType)}</td><td>${money(s.estimatedValue)}</td><td>${s.seizureDate}</td><td><span class="badge ${grantsStatusBadgeClass(s.status)}">${s.status}</span></td></tr>`).join('')}
      </tbody></table></div></div>`;
        }
        if (id === 'stat_cash_tracked') {
            const cashSeizures: any = seizures.filter((s?: any): any => s.seizureType === 'Cash' && s.cashLedger && s.cashLedger.length);
            const total: any = cashSeizures.reduce((sum?: any, s?: any): any => sum + currentCashAmount(s), 0);
            return `<button class="stat-card dash-clickable" data-nav-dest="grants-cashledger"><div class="label">Total Cash Currently Tracked</div><div class="value">${money(total)}</div><div class="delta neutral">${cashSeizures.length} cash case(s) \u2014 see Cash Fund Ledger</div></button>`;
        }
        if (id === 'chart_cash_phase') {
            return `<div class="panel"><div class="panel-head"><h2>Cash by Lifecycle Phase</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartDashCashPhase"></canvas></div></div></div>`;
        }
        return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
    }
    function renderWidgetCharts(enabledIds?: any): any {
        const seizures: any = STATE.grants.seizures, grants: any = STATE.grants.grants;
        if (enabledIds.includes('chart_seizure_type')) {
            const counts: any = {} as any;
            STATE.grants.refData.seizureTypes.forEach((t?: any): any => counts[t] = 0);
            seizures.forEach((s?: any): any => counts[s.seizureType] = (counts[s.seizureType] || 0) + 1);
            CHART_REFS_GRANTS.seizureType = safeChart('chartSeizureType', { type: 'bar',
                data: { labels: Object.keys(counts) as any, datasets: [{ label: 'Seizures', data: Object.values(counts) as any, backgroundColor: '#134DD1' } as any] } as any,
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any } as any } as any } as any);
        }
        if (enabledIds.includes('chart_seizure_status')) {
            const counts: any = {} as any;
            SEIZURE_STATUSES.forEach((t?: any): any => counts[t] = 0);
            seizures.forEach((s?: any): any => counts[s.status] = (counts[s.status] || 0) + 1);
            CHART_REFS_GRANTS.seizureStatus = safeChart('chartSeizureStatus', { type: 'bar',
                data: { labels: Object.keys(counts) as any, datasets: [{ label: 'Seizures', data: Object.values(counts) as any, backgroundColor: '#2E7D46' } as any] } as any,
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any } as any);
        }
        if (enabledIds.includes('chart_grant_program')) {
            const counts: any = {} as any;
            PROGRAM_AREAS.forEach((t?: any): any => counts[t] = 0);
            grants.forEach((g?: any): any => counts[g.programArea] = (counts[g.programArea] || 0) + g.awardAmount);
            CHART_REFS_GRANTS.grantProgram = safeChart('chartGrantProgram', { type: 'bar',
                data: { labels: Object.keys(counts) as any, datasets: [{ label: 'Award $', data: Object.values(counts) as any, backgroundColor: '#FFAC12' } as any] } as any,
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any } as any } as any } as any);
        }
        if (enabledIds.includes('chart_match_funds')) {
            const withMatch: any = grants.filter((g?: any): any => g.matchRequired);
            CHART_REFS_GRANTS.matchFunds = safeChart('chartMatchFunds', { type: 'bar',
                data: { labels: withMatch.map((g?: any): any => g.grantName.length > 18 ? g.grantName.slice(0, 18) + '\u2026' : g.grantName),
                    datasets: [{ label: 'Award', data: withMatch.map((g?: any): any => g.awardAmount), backgroundColor: '#134DD1' } as any, { label: 'Match Committed', data: withMatch.map((g?: any): any => g.matchAmount), backgroundColor: '#8B5CF6' } as any] } as any,
                options: { maintainAspectRatio: false, plugins: { legend: { labels: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any } as any);
        }
        if (enabledIds.includes('chart_cash_phase')) {
            const cashSeizures: any = seizures.filter((s?: any): any => s.seizureType === 'Cash' && s.cashLedger && s.cashLedger.length);
            const byPhase: any = {} as any;
            CASH_PHASES.forEach((p?: any): any => byPhase[p] = 0);
            cashSeizures.forEach((s?: any): any => { byPhase[currentCashPhase(s)] = (byPhase[currentCashPhase(s)] || 0) + currentCashAmount(s); });
            CHART_REFS_GRANTS.dashCashPhase = safeChart('chartDashCashPhase', { type: 'bar',
                data: { labels: CASH_PHASES, datasets: [{ label: 'Cash', data: CASH_PHASES.map((p?: any): any => byPhase[p]), backgroundColor: '#2E7D46' } as any] } as any,
                options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any } as any } as any } as any);
        }
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
            // Anything still checked keeps its existing position and size exactly as it was; anything
            // newly checked gets appended at the end at its catalog default size, so unchecking and
            // rechecking the same box in the same visit doesn't silently reset a size someone already set.
            const stillThere: any = prefs.extras.filter((e?: any): any => checked.includes(e.id));
            const added: any = checked.filter((id?: any): any => !prefs.extras.some((e?: any): any => e.id === id)).map((id?: any): any => ({ id, size: (EXTRA_WIDGETS.find((w?: any): any => w.id === id) || {} as any).defaultSize || 'half' } as any));
            prefs.extras = [...stillThere, ...added];
            logActivity(`Customized personal Grants dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
            persist();
            toast("Dashboard saved.");
            closeModal();
            renderDashboard();
        };
    }
    /* =========================================================================
       SEIZURES & FORFEITURE (sortable, filterable table -- built correctly from day one)
       ========================================================================= */
    let SEIZURE_FILTER: any = { q: "", type: "All", status: "All" } as any;
    function renderSeizures(): any {
        if (!can('grants_seizure_view')) {
            (document as any).getElementById('view-grants-seizures').innerHTML = permissionBlockedView("You don't have permission to view seizure and forfeiture records in this role.");
            return;
        }
        const canManage: any = can('grants_seizure_manage');
        const f: any = SEIZURE_FILTER;
        let list: any = STATE.grants.seizures.filter((s?: any): any => {
            const q: any = f.q.toLowerCase();
            const matchQ: any = !q || s.caseNumber.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
            const matchType: any = f.type === "All" || s.seizureType === f.type;
            const matchStatus: any = f.status === "All" || s.status === f.status;
            return matchQ && matchType && matchStatus;
        });
        list = applySharedSort('grantsSeizures', list);
        if (!SHARED_SORT.grantsSeizures || !SHARED_SORT.grantsSeizures.key) {
            list = list.slice().sort((a?: any, b?: any): any => b.seizureDate.localeCompare(a.seizureDate));
        }
        const rows: any = list.map((s?: any): any => `
    <tr><td>${seizureLink(s.id)}</td><td>${escapeHtml(s.seizureType)}</td><td>${money(s.estimatedValue)}</td>
    <td>${escapeHtml(s.forfeitureType)}</td><td>${s.seizureDate}</td>
    <td><span class="badge ${grantsStatusBadgeClass(s.status)}">${s.status}</span></td>
    ${canManage ? `<td><button class="btn btn-sm btn-outline" data-edit-seizure="${s.id}">${ICONS.edit} Edit</button></td>` : '<td></td>'}</tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No seizures match this filter.</td></tr>`;
        (document as any).getElementById('view-grants-seizures').innerHTML = `
    ${!canManage ? lockedNote("You're viewing seizure and forfeiture records in read-only mode.") : ""}
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.gavel}<div>Grounded in the DOJ/Treasury Equitable Sharing framework (28 U.S.C. \u00a7 524(c)): shared cash and property carry official-use and supplement-not-supplant restrictions, and recipient agencies must maintain current SAM.gov registration to receive payments.</div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="seizureSearch" title="Filters the list below as you type, matching case number or description" placeholder="Search case # or description..." style="width:240px;" value="${escapeHtml(f.q)}">
        <select id="seizureTypeFilter" title="Filter to a single type of seized property"><option>All</option>${STATE.grants.refData.seizureTypes.map((t?: any): any => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select id="seizureStatusFilter" title="Filter to a single case status"><option>All</option>${SEIZURE_STATUSES.map((t?: any): any => `<option ${f.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddSeizure">${ICONS.plus} Log Seizure</button>` : ''}
    </div>
    <div class="panel"><div class="panel-body" style="padding:0;overflow-x:auto;">
      <table><thead><tr>
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.caseNumber'), 'caseNumber')}
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.seizureType'), 'seizureType')}
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.estimatedValue'), 'estimatedValue')}
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.forfeitureType'), 'forfeitureType')}
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.seizureDate'), 'seizureDate')}
        ${sharedSortHeader('grantsSeizures', fieldLabel('grants.status'), 'status')}
        <th></th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div></div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:10px;">${list.length} of ${STATE.grants.seizures.length} record(s)</div>
  `;
        (document as any).getElementById('seizureSearch').addEventListener('input', (e?: any): any => { SEIZURE_FILTER.q = e.target.value; renderSeizures(); refocusFilterInput('seizureSearch'); });
        (document as any).getElementById('seizureTypeFilter').addEventListener('change', (e?: any): any => { SEIZURE_FILTER.type = e.target.value; renderSeizures(); });
        (document as any).getElementById('seizureStatusFilter').addEventListener('change', (e?: any): any => { SEIZURE_FILTER.status = e.target.value; renderSeizures(); });
        wireSharedSortHeaders('grantsSeizures', renderSeizures);
        const addBtn: any = (document as any).getElementById('btnAddSeizure');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openSeizureFormModal(null));
        (document as any).querySelectorAll('[data-edit-seizure]').forEach((b?: any): any => b.addEventListener('click', (): any => openSeizureFormModal(b.dataset.editSeizure)));
        wireSeizureLinks();
    }
    function openSeizureFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const s: any = editing ? seizureFor(existingId) : {
            caseNumber: "", seizureDate: fmt(new Date() as any), seizureType: STATE.grants.refData.seizureTypes[0], forfeitureType: STATE.grants.refData.forfeitureTypes[0],
            estimatedValue: 0, description: "", status: "Pending", seizingOfficerId: STATE.personnel[0].id, location: "",
            dispositionType: "Pending", dispositionDate: null, equitableShareAmount: null, equitableSharePercent: null, sharingAgencyFederal: "",
            officialUseDesignation: "", notes: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Log'} Seizure</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Case Number</label><input type="text" id="fSzCase" value="${escapeHtml(s.caseNumber)}" placeholder="e.g. CR26-01234"></div>
        <div class="form-row"><label>Seizure Date</label><input type="date" id="fSzDate" value="${s.seizureDate}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Seizure Type</label><select id="fSzType">${STATE.grants.refData.seizureTypes.map((t?: any): any => `<option ${s.seizureType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="form-row"><label>Forfeiture Type</label><select id="fSzForfeiture">${STATE.grants.refData.forfeitureTypes.map((t?: any): any => `<option ${s.forfeitureType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Estimated Value ($)</label><input type="number" id="fSzValue" value="${s.estimatedValue}"></div>
        <div class="form-row"><label>Status</label><select id="fSzStatus">${SEIZURE_STATUSES.map((t?: any): any => `<option ${s.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Description</label><textarea id="fSzDesc" rows="2">${escapeHtml(s.description)}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Disposition</label><select id="fSzDisposition">${STATE.grants.refData.dispositionTypes.map((t?: any): any => `<option ${s.dispositionType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="form-row"><label>Disposition Date</label><input type="date" id="fSzDispDate" value="${s.dispositionDate || ''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Equitable Share Amount ($, if any)</label><input type="number" id="fSzShareAmt" value="${s.equitableShareAmount || ''}"></div>
        <div class="form-row"><label>Sharing Agency (if federal)</label><input type="text" id="fSzSharingAgency" value="${escapeHtml(s.sharingAgencyFederal || '')}" placeholder="e.g. U.S. Marshals Service"></div>
      </div>
      <div class="form-row"><label>Official Use Designation (if retained)</label><input type="text" id="fSzOfficialUse" value="${escapeHtml(s.officialUseDesignation || '')}" placeholder="e.g. Undercover surveillance vehicle - Investigations Unit"></div>
      <div class="form-row"><label>Notes</label><textarea id="fSzNotes" rows="2">${escapeHtml(s.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Log Seizure'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const caseNumber: any = (document as any).getElementById('fSzCase').value.trim();
            if (!caseNumber) {
                toast("Enter a case number.", true);
                return;
            }
            const status: any = (document as any).getElementById('fSzStatus').value;
            const data: any = {
                caseNumber, seizureDate: (document as any).getElementById('fSzDate').value, seizureType: (document as any).getElementById('fSzType').value,
                forfeitureType: (document as any).getElementById('fSzForfeiture').value, estimatedValue: Number((document as any).getElementById('fSzValue').value) || 0,
                status, description: (document as any).getElementById('fSzDesc').value.trim(),
                dispositionType: (document as any).getElementById('fSzDisposition').value, dispositionDate: (document as any).getElementById('fSzDispDate').value || null,
                equitableShareAmount: (document as any).getElementById('fSzShareAmt').value ? Number((document as any).getElementById('fSzShareAmt').value) : null,
                sharingAgencyFederal: (document as any).getElementById('fSzSharingAgency').value.trim(),
                officialUseDesignation: (document as any).getElementById('fSzOfficialUse').value.trim(), notes: (document as any).getElementById('fSzNotes').value.trim()
            } as any;
            if (editing) {
                recordFieldChangeGrants(s, 'status', s.status, status);
                Object.assign(s, data);
                if (s.seizureType === 'Cash' && (!s.cashLedger || !s.cashLedger.length)) {
                    s.cashLedger = [{ phase: CASH_PHASES[0], amount: s.estimatedValue, date: s.seizureDate, notes: 'Initial intake.' } as any];
                }
                logActivity(`Updated seizure record for case ${caseNumber}.`, "seizure", s.id);
                toast("Seizure record saved.");
            }
            else {
                const newS: any = { id: 'sz' + Date.now(), seizingOfficerId: CURRENT_USER_ID, location: "", samRegistrationCurrent: true, fieldHistory: [], ...data } as any;
                if (newS.seizureType === 'Cash') {
                    newS.cashLedger = [{ phase: CASH_PHASES[0], amount: newS.estimatedValue, date: newS.seizureDate, notes: 'Initial intake.' } as any];
                }
                STATE.grants.seizures.push(newS);
                logActivity(`Logged new seizure for case ${caseNumber}.`, "seizure", newS.id);
                toast("Seizure logged.");
            }
            persist();
            closeModal();
            if (ACTIVE_VIEW === 'grants-seizures')
                renderSeizures();
        };
    }
    let SEIZURE_DETAIL_TAB: any = 'overview';
    let SEIZURE_DETAIL_ID: any = null;
    function openSeizureDetail(id?: any): any {
        if (!SuiteUX.openRecord("grants", "seizure", id))
            return;
        SEIZURE_DETAIL_ID = id;
        SEIZURE_DETAIL_TAB = 'overview';
        renderSeizureDetailModal();
    }
    function renderSeizureDetailModal(): any {
        const s: any = seizureFor(SEIZURE_DETAIL_ID);
        if (!s) {
            closeModal();
            return;
        }
        const isCash: any = s.seizureType === 'Cash';
        const tabs: any = [['overview', 'Overview']];
        if (isCash)
            tabs.push(['cashledger', 'Fund Phase Tracking']);
        tabs.push(['photos', 'Photos']);
        tabs.push(['history', 'Change History']);
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-xl';
        box.innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(s.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid, label]: any): any => `<button class="btn btn-sm ${SEIZURE_DETAIL_TAB === tid ? 'btn-primary' : 'btn-outline'}" data-sz-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="seizureDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-sz-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { SEIZURE_DETAIL_TAB = b.dataset.szTab; renderSeizureDetailModal(); }));
        renderSeizureDetailTabContent(s);
    }
    function renderSeizureDetailTabContent(s?: any): any {
        const body: any = (document as any).getElementById('seizureDetailBody');
        const canManage: any = can('grants_seizure_manage');
        if (SEIZURE_DETAIL_TAB === 'overview') {
            body.innerHTML = `
      ${canManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditSzFromDetail">${ICONS.edit} Edit</button>` : ''}
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Type</div><div class="v">${escapeHtml(s.seizureType)}</div></div>
        <div><div class="k">Forfeiture Type</div><div class="v">${escapeHtml(s.forfeitureType)}</div></div>
        <div><div class="k">Estimated Value</div><div class="v">${money(s.estimatedValue)}</div></div>
        <div><div class="k">Seizure Date</div><div class="v">${s.seizureDate}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${grantsStatusBadgeClass(s.status)}">${s.status}</span></div></div>
        <div><div class="k">Disposition</div><div class="v">${escapeHtml(s.dispositionType)}${s.dispositionDate ? ' (' + s.dispositionDate + ')' : ''}</div></div>
        ${s.equitableShareAmount ? `<div><div class="k">Equitable Share</div><div class="v">${money(s.equitableShareAmount)}${s.sharingAgencyFederal ? ' via ' + escapeHtml(s.sharingAgencyFederal) : ''}</div></div>` : ''}
        ${s.officialUseDesignation ? `<div><div class="k">Official Use</div><div class="v">${escapeHtml(s.officialUseDesignation)}</div></div>` : ''}
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Description</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(s.description)}</div></div>
    `;
            const editBtn: any = (document as any).getElementById('btnEditSzFromDetail');
            if (editBtn)
                editBtn.addEventListener('click', (): any => { closeModal(); openSeizureFormModal(s.id); });
        }
        else if (SEIZURE_DETAIL_TAB === 'cashledger') {
            const phase: any = currentCashPhase(s);
            const amount: any = currentCashAmount(s);
            const nextPhaseIdx: any = phase ? CASH_PHASES.indexOf(phase) + 1 : 0;
            const nextPhase: any = nextPhaseIdx < CASH_PHASES.length ? CASH_PHASES[nextPhaseIdx] : null;
            body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Current Phase</div><div class="v"><span class="badge badge-assigned">${escapeHtml(phase || 'Not yet logged')}</span></div></div>
        <div><div class="k">Current Amount</div><div class="v" style="font-size:18px;font-weight:800;">${money(amount)}</div></div>
      </div>
      ${canManage && nextPhase ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnAdvancePhase">${ICONS.plus} Advance to "${nextPhase}"</button>` : ''}
      ${canManage && !nextPhase ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">This fund has reached its final phase.</div>` : ''}
      <table><thead><tr><th>Phase</th><th>Amount</th><th>Date</th><th>Notes</th></tr></thead><tbody>
      ${(s.cashLedger || []).slice().sort((a?: any, b?: any): any => (a.date || '').localeCompare(b.date || '')).reverse().map((e?: any): any => `<tr><td>${escapeHtml(e.phase)}</td><td>${money(e.amount)}</td><td>${e.date}</td><td style="font-size:12.5px;">${escapeHtml(e.notes || '')}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No phase entries logged yet.</td></tr>`}
      </tbody></table>
    `;
            const advBtn: any = (document as any).getElementById('btnAdvancePhase');
            if (advBtn)
                advBtn.addEventListener('click', (): any => openAdvanceCashPhaseModal(s, nextPhase));
        }
        else if (SEIZURE_DETAIL_TAB === 'photos') {
            if (!s.photos)
                s.photos = [];
            const canManage: any = can('grants_seizure_manage');
            body.innerHTML = photoManagerHtml(s.photos, 'grSz', canManage);
            wirePhotoManager('seizureDetailBody', s.photos, 'grSz', canManage, (action?: any): any => {
                logActivity(`${action === 'add' ? 'Added a photo to' : action === 'remove' ? 'Removed a photo from' : 'Updated a photo description on'} seizure ${s.caseNumber}.`, "seizure", s.id);
                persist();
                renderSeizureDetailTabContent(s);
            });
        }
        else if (SEIZURE_DETAIL_TAB === 'history') {
            const rows: any = s.fieldHistory.slice().reverse().map((h?: any): any => `
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
            body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
        }
    }
    function openAdvanceCashPhaseModal(s?: any, nextPhase?: any): any {
        const currentAmt: any = currentCashAmount(s);
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Advance to "${escapeHtml(nextPhase)}"</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Amount at This Phase ($)</label><input type="number" id="fCashAmt" value="${currentAmt}"></div>
        <div class="form-row"><label>Date</label><input type="date" id="fCashDate" value="${fmt(new Date() as any)}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fCashNotes" rows="3" placeholder="e.g. Net proceeds received after administrative processing costs."></textarea></div>
      <div style="font-size:11px;color:var(--text-dim);">The amount can change between phases (for example, administrative or federal-retention deductions between "Forfeited" and "Received").</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Advance Phase</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const amount: any = Number((document as any).getElementById('fCashAmt').value) || 0;
            const newEntry: any = { id: 'cl' + Date.now(), phase: nextPhase, amount, date: (document as any).getElementById('fCashDate').value,
                notes: (document as any).getElementById('fCashNotes').value.trim(), recordedBy: personName(CURRENT_USER_ID) } as any;
            if (!s.cashLedger)
                s.cashLedger = [];
            s.cashLedger.push(newEntry);
            logActivity(`Advanced cash for case ${s.caseNumber} to phase "${nextPhase}" (${money(amount)}).`, "seizure", s.id);
            persist();
            toast(`Advanced to "${nextPhase}".`);
            SEIZURE_DETAIL_TAB = 'cashledger';
            SEIZURE_DETAIL_ID = s.id;
            renderSeizureDetailModal();
        };
    }
    /* =========================================================================
       GRANT AWARDS (sortable, filterable table)
       ========================================================================= */
    let GRANT_FILTER: any = { q: "", agency: "All", status: "All" } as any;
    function renderAwards(): any {
        if (!can('grants_award_view')) {
            (document as any).getElementById('view-grants-awards').innerHTML = permissionBlockedView("You don't have permission to view grant awards in this role.");
            return;
        }
        const canManage: any = can('grants_award_manage');
        const f: any = GRANT_FILTER;
        let list: any = STATE.grants.grants.filter((g?: any): any => {
            const q: any = f.q.toLowerCase();
            const matchQ: any = !q || g.grantName.toLowerCase().includes(q) || g.grantNumber.toLowerCase().includes(q);
            const matchAgency: any = f.agency === "All" || g.fundingAgency === f.agency;
            const matchStatus: any = f.status === "All" || g.status === f.status;
            return matchQ && matchAgency && matchStatus;
        });
        list = applySharedSort('grantsAwards', list);
        if (!SHARED_SORT.grantsAwards || !SHARED_SORT.grantsAwards.key) {
            list = list.slice().sort((a?: any, b?: any): any => b.awardStartDate.localeCompare(a.awardStartDate));
        }
        const rows: any = list.map((g?: any): any => `
    <tr><td>${grantLink(g.id)}</td><td>${escapeHtml(g.fundingAgency)}</td><td>${escapeHtml(g.programArea)}</td>
    <td>${money(g.awardAmount)}</td><td>${g.matchRequired ? money(g.matchAmount) : 'None'}</td>
    <td>${g.nextReportDue || '—'}</td>
    <td><span class="badge ${grantsStatusBadgeClass(g.status)}">${g.status}</span></td>
    ${canManage ? `<td><button class="btn btn-sm btn-outline" data-edit-grant="${g.id}">${ICONS.edit} Edit</button></td>` : '<td></td>'}</tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No grants match this filter.</td></tr>`;
        (document as any).getElementById('view-grants-awards').innerHTML = `
    ${!canManage ? lockedNote("You're viewing grant awards in read-only mode.") : ""}
    <div class="locked-note" style="background:var(--callout-yellow-bg);border-color:var(--callout-yellow-border);color:var(--callout-yellow-text);">
      ${ICONS.briefcase}<div>Program areas follow the 9 statutory categories of the Edward Byrne Memorial Justice Assistance Grant (JAG) program. As of the FY2026 JAG guidance, UAS and counter-UAS purchases are permitted but require prior BJA approval \u2014 flagged on funded equipment below.</div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="grantSearch" title="Filters the list below as you type, matching grant name or grant number" placeholder="Search grant name or number..." style="width:240px;" value="${escapeHtml(f.q)}">
        <select id="grantAgencyFilter" title="Filter to a single funding agency"><option>All</option>${STATE.grants.refData.fundingAgencies.map((a?: any): any => `<option ${f.agency === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        <select id="grantStatusFilter" title="Filter to a single grant status"><option>All</option>${GRANT_STATUSES.map((t?: any): any => `<option ${f.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddGrant">${ICONS.plus} New Grant Award</button>` : ''}
    </div>
    <div class="panel"><div class="panel-body" style="padding:0;overflow-x:auto;">
      <table><thead><tr>
        ${sharedSortHeader('grantsAwards', fieldLabel('grants.grantName'), 'grantName')}
        ${sharedSortHeader('grantsAwards', fieldLabel('grants.fundingAgency'), 'fundingAgency')}
        ${sharedSortHeader('grantsAwards', fieldLabel('grants.programArea'), 'programArea')}
        ${sharedSortHeader('grantsAwards', fieldLabel('grants.awardAmount'), 'awardAmount')}
        <th>Match Required</th>
        <th>Next Report Due</th>
        ${sharedSortHeader('grantsAwards', fieldLabel('grants.status'), 'status')}
        <th></th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div></div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:10px;">${list.length} of ${STATE.grants.grants.length} grant(s)</div>
  `;
        (document as any).getElementById('grantSearch').addEventListener('input', (e?: any): any => { GRANT_FILTER.q = e.target.value; renderAwards(); refocusFilterInput('grantSearch'); });
        (document as any).getElementById('grantAgencyFilter').addEventListener('change', (e?: any): any => { GRANT_FILTER.agency = e.target.value; renderAwards(); });
        (document as any).getElementById('grantStatusFilter').addEventListener('change', (e?: any): any => { GRANT_FILTER.status = e.target.value; renderAwards(); });
        wireSharedSortHeaders('grantsAwards', renderAwards);
        const addBtn: any = (document as any).getElementById('btnAddGrant');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openGrantFormModal(null));
        (document as any).querySelectorAll('[data-edit-grant]').forEach((b?: any): any => b.addEventListener('click', (): any => openGrantFormModal(b.dataset.editGrant)));
        wireGrantLinks();
    }
    function openGrantFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const g: any = editing ? grantFor(existingId) : {
            grantName: "", grantNumber: "", fundingAgency: STATE.grants.refData.fundingAgencies[0], programArea: STATE.grants.refData.programAreas[0],
            awardAmount: 0, matchRequired: false, matchAmount: 0, awardStartDate: fmt(new Date() as any), awardEndDate: fmt(addDays(new Date() as any, 365)),
            status: "Awarded", reportingFrequency: "Quarterly", nextReportDue: "", cageCode: "", grantManagerId: STATE.personnel[0].id, notes: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'New'} Grant Award</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Grant Name</label><input type="text" id="fGrName" value="${escapeHtml(g.grantName)}" placeholder="e.g. Byrne JAG FY2026"></div>
        <div class="form-row"><label>Grant / Award Number</label><input type="text" id="fGrNumber" value="${escapeHtml(g.grantNumber)}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Funding Agency</label><select id="fGrAgency">${STATE.grants.refData.fundingAgencies.map((a?: any): any => `<option ${g.fundingAgency === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        <div class="form-row"><label>Program Area</label><select id="fGrProgram">${STATE.grants.refData.programAreas.map((a?: any): any => `<option ${g.programArea === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Award Amount ($)</label><input type="number" id="fGrAmount" value="${g.awardAmount}"></div>
        <div class="form-row"><label>Award Start</label><input type="date" id="fGrStart" value="${g.awardStartDate}"></div>
        <div class="form-row"><label>Award End</label><input type="date" id="fGrEnd" value="${g.awardEndDate}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fGrMatchReq" ${g.matchRequired ? 'checked' : ''} style="width:auto;">Matching funds required</label></div>
      <div class="form-2col">
        <div class="form-row"><label>Match Amount ($)</label><input type="number" id="fGrMatchAmt" value="${g.matchAmount || 0}"></div>
        <div class="form-row"><label>Grant Manager</label><select id="fGrManager">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${g.grantManagerId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Status</label><select id="fGrStatus">${GRANT_STATUSES.map((t?: any): any => `<option ${g.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="form-row"><label>Reporting Frequency</label><select id="fGrFreq"><option ${g.reportingFrequency === 'Quarterly' ? 'selected' : ''}>Quarterly</option><option ${g.reportingFrequency === 'Semi-Annual' ? 'selected' : ''}>Semi-Annual</option><option ${g.reportingFrequency === 'Annual' ? 'selected' : ''}>Annual</option></select></div>
        <div class="form-row"><label>Next Report Due</label><input type="date" id="fGrNextReport" value="${g.nextReportDue || ''}"></div>
      </div>
      <div class="form-row"><label>CAGE Code (SAM.gov)</label><input type="text" id="fGrCage" value="${escapeHtml(g.cageCode || '')}"></div>
      <div class="form-row"><label>Notes</label><textarea id="fGrNotes" rows="2">${escapeHtml(g.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Create Grant'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const grantName: any = (document as any).getElementById('fGrName').value.trim();
            if (!grantName) {
                toast("Enter a grant name.", true);
                return;
            }
            const status: any = (document as any).getElementById('fGrStatus').value;
            const data: any = {
                grantName, grantNumber: (document as any).getElementById('fGrNumber').value.trim(), fundingAgency: (document as any).getElementById('fGrAgency').value,
                programArea: (document as any).getElementById('fGrProgram').value, awardAmount: Number((document as any).getElementById('fGrAmount').value) || 0,
                awardStartDate: (document as any).getElementById('fGrStart').value, awardEndDate: (document as any).getElementById('fGrEnd').value,
                matchRequired: (document as any).getElementById('fGrMatchReq').checked, matchAmount: Number((document as any).getElementById('fGrMatchAmt').value) || 0,
                grantManagerId: (document as any).getElementById('fGrManager').value, status, reportingFrequency: (document as any).getElementById('fGrFreq').value,
                nextReportDue: (document as any).getElementById('fGrNextReport').value || null, cageCode: (document as any).getElementById('fGrCage').value.trim(),
                notes: (document as any).getElementById('fGrNotes').value.trim()
            } as any;
            if (editing) {
                recordFieldChangeGrants(g, 'status', g.status, status);
                Object.assign(g, data);
                logActivity(`Updated grant award "${grantName}".`, "grant", g.id);
                toast("Grant award saved.");
            }
            else {
                const newG: any = { id: 'gr' + Date.now(), samRegistrationCurrent: true, fundedEquipment: [], fieldHistory: [], ...data } as any;
                STATE.grants.grants.push(newG);
                logActivity(`Created new grant award "${grantName}".`, "grant", newG.id);
                toast("Grant award created.");
            }
            persist();
            closeModal();
            if (ACTIVE_VIEW === 'grants-awards')
                renderAwards();
        };
    }
    function openGrantDetail(id?: any): any {
        if (!SuiteUX.openRecord("grants", "grant", id))
            return;
        const g: any = grantFor(id);
        if (!g) {
            closeModal();
            return;
        }
        const canManage: any = can('grants_award_manage');
        (document as any).getElementById('modalBox').className = 'modal modal-xl';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(g.grantName)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body" id="grantDetailBody">
      ${canManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditGrFromDetail">${ICONS.edit} Edit</button>` : ''}
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Grant Number</div><div class="v">${escapeHtml(g.grantNumber)}</div></div>
        <div><div class="k">Funding Agency</div><div class="v">${escapeHtml(g.fundingAgency)}</div></div>
        <div><div class="k">Program Area</div><div class="v">${escapeHtml(g.programArea)}</div></div>
        <div><div class="k">Award Amount</div><div class="v">${money(g.awardAmount)}</div></div>
        <div><div class="k">Award Period</div><div class="v">${g.awardStartDate} to ${g.awardEndDate}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${grantsStatusBadgeClass(g.status)}">${g.status}</span></div></div>
        <div><div class="k">Matching Funds</div><div class="v">${g.matchRequired ? money(g.matchAmount) + ' (' + g.matchPercent + '%)' : 'Not required'}</div></div>
        <div><div class="k">Reporting</div><div class="v">${escapeHtml(g.reportingFrequency)}, next due ${g.nextReportDue || '—'}</div></div>
        <div><div class="k">Grant Manager</div><div class="v">${escapeHtml(personName(g.grantManagerId))}</div></div>
        <div><div class="k">CAGE Code</div><div class="v">${(g.cageCode ? escapeHtml(g.cageCode) : '—')}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Grant-Funded Equipment</h2></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Item</th><th>Cost</th><th>Purchase Date</th><th>Prior Approval</th></tr></thead><tbody>
        ${g.fundedEquipment.map((e?: any): any => `<tr><td>${escapeHtml(e.description)}</td><td>${money(e.cost)}</td><td>${e.purchaseDate}</td>
          <td>${e.requiresPriorApproval ? `<span class="badge badge-available">Approved ${e.approvalDate || ''}</span>` : '<span style="color:var(--text-dim);">N/A</span>'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">No funded equipment logged yet.</td></tr>`}
        </tbody></table></div>
      </div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnAddEquipment" style="margin-top:10px;">${ICONS.plus} Add Funded Equipment</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        const editBtn: any = (document as any).getElementById('btnEditGrFromDetail');
        if (editBtn)
            editBtn.addEventListener('click', (): any => { closeModal(); openGrantFormModal(g.id); });
        const addEqBtn: any = (document as any).getElementById('btnAddEquipment');
        if (addEqBtn)
            addEqBtn.addEventListener('click', (): any => openAddFundedEquipmentModal(g));
    }
    function openAddFundedEquipmentModal(g?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Funded Equipment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Item Description</label><input type="text" id="fEqDesc" placeholder="e.g. Motorola APX Radios (12 units)"></div>
      <div class="form-2col">
        <div class="form-row"><label>Cost ($)</label><input type="number" id="fEqCost" value="0"></div>
        <div class="form-row"><label>Purchase Date</label><input type="date" id="fEqDate" value="${fmt(new Date() as any)}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fEqApproval" style="width:auto;">Requires prior funding-agency approval (e.g. UAS/counter-UAS under current BJA guidance)</label></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add Equipment</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const desc: any = (document as any).getElementById('fEqDesc').value.trim();
            if (!desc) {
                toast("Enter an item description.", true);
                return;
            }
            const requiresApproval: any = (document as any).getElementById('fEqApproval').checked;
            g.fundedEquipment.push({ id: 'ge' + Date.now(), description: desc, cost: Number((document as any).getElementById('fEqCost').value) || 0,
                purchaseDate: (document as any).getElementById('fEqDate').value, requiresPriorApproval: requiresApproval,
                approvalDate: requiresApproval ? fmt(new Date() as any) : null, approvalReference: requiresApproval ? "Pending reference #" : null } as any);
            logActivity(`Added funded equipment "${desc}" to grant "${g.grantName}".`, "grant", g.id);
            persist();
            toast("Equipment added.");
            openGrantDetail(g.id);
        };
    }
    /* =========================================================================
       CASH FUND LEDGER (aggregated, department-wide view of every cash movement)
       ========================================================================= */
    let CASHLEDGER_FILTER: any = { q: "", phase: "All" } as any;
    function renderCashLedger(): any {
        if (!can('grants_seizure_view')) {
            (document as any).getElementById('view-grants-cashledger').innerHTML = permissionBlockedView("You don't have permission to view cash fund tracking in this role.");
            return;
        }
        const f: any = CASHLEDGER_FILTER;
        let entries: any = allCashLedgerEntries().filter((e?: any): any => {
            const q: any = f.q.toLowerCase();
            const matchQ: any = !q || e.caseNumber.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
            const matchPhase: any = f.phase === "All" || e.phase === f.phase;
            return matchQ && matchPhase;
        });
        entries = applySharedSort('grantsCashLedger', entries);
        if (!SHARED_SORT.grantsCashLedger || !SHARED_SORT.grantsCashLedger.key) {
            entries = entries.slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
        }
        // "Currently sitting in" totals: use each case's LATEST ledger entry only, not every historical entry,
        // so cash isn't double-counted across the phases it has already moved through.
        const cashSeizures: any = STATE.grants.seizures.filter((s?: any): any => s.seizureType === 'Cash' && s.cashLedger && s.cashLedger.length);
        const byPhaseTotals: any = {} as any;
        CASH_PHASES.forEach((p?: any): any => byPhaseTotals[p] = 0);
        cashSeizures.forEach((s?: any): any => { byPhaseTotals[currentCashPhase(s)] = (byPhaseTotals[currentCashPhase(s)] || 0) + currentCashAmount(s); });
        const totalTracked: any = cashSeizures.reduce((sum?: any, s?: any): any => sum + currentCashAmount(s), 0);
        const totalLiquid: any = cashSeizures.filter((s?: any): any => ['Received \u2014 Agency Fund', 'Encumbered / Earmarked'].includes(currentCashPhase(s))).reduce((sum?: any, s?: any): any => sum + currentCashAmount(s), 0);
        const rows: any = entries.map((e?: any): any => `
    <tr><td>${seizureLink(e.seizureId)}</td><td>${escapeHtml(e.phase)}</td><td>${money(e.amount)}</td><td>${e.date}</td><td style="font-size:12.5px;">${escapeHtml(e.notes || '')}</td></tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:18px;">No cash ledger entries match this filter.</td></tr>`;
        (document as any).getElementById('view-grants-cashledger').innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.dollar}<div>Every cash seizure is tracked through its full lifecycle \u2014 from initial evidence intake through forfeiture, receipt into the agency's forfeiture fund, earmarking, and final expenditure \u2014 matching the accounting-for-shared-cash requirement in DOJ's Equitable Sharing guidance.</div>
    </div>
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="label">Total Cash Currently Tracked</div><div class="value">${money(totalTracked)}</div><div class="delta neutral">${cashSeizures.length} cash case(s)</div></div>
      <div class="stat-card"><div class="label">Currently Liquid (Received / Earmarked)</div><div class="value">${money(totalLiquid)}</div><div class="delta ok">Available in the agency fund</div></div>
      <div class="stat-card"><div class="label">Still Pending Forfeiture</div><div class="value">${money(byPhaseTotals['Seized (In Evidence)'] + byPhaseTotals['Pending Forfeiture'])}</div><div class="delta neutral">Not yet legally forfeited</div></div>
      <div class="stat-card"><div class="label">Expended / Reconciled</div><div class="value">${money(byPhaseTotals['Expended'] + byPhaseTotals['Closed / Reconciled'])}</div><div class="delta neutral">Fully spent and accounted for</div></div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Cash by Current Phase</h2></div>
      <div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartCashByPhase"></canvas></div></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="cashLedgerSearch" title="Filters the ledger below as you type, matching case number or notes" placeholder="Search case # or notes..." style="width:240px;" value="${escapeHtml(f.q)}">
        <select id="cashLedgerPhaseFilter" title="Filter to a single lifecycle phase"><option>All</option>${CASH_PHASES.map((p?: any): any => `<option ${f.phase === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>
    </div>
    <div class="panel"><div class="panel-body" style="padding:0;overflow-x:auto;">
      <table><thead><tr>
        <th>Case #</th>
        ${sharedSortHeader('grantsCashLedger', 'Phase', 'phase')}
        ${sharedSortHeader('grantsCashLedger', 'Amount', 'amount')}
        ${sharedSortHeader('grantsCashLedger', 'Date', 'date')}
        <th>Notes</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div></div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:10px;">${entries.length} ledger entr${entries.length === 1 ? 'y' : 'ies'} across ${cashSeizures.length} cash case(s) \u2014 open any case to advance it to its next phase.</div>
  `;
        (document as any).getElementById('cashLedgerSearch').addEventListener('input', (e?: any): any => { CASHLEDGER_FILTER.q = e.target.value; renderCashLedger(); refocusFilterInput('cashLedgerSearch'); });
        (document as any).getElementById('cashLedgerPhaseFilter').addEventListener('change', (e?: any): any => { CASHLEDGER_FILTER.phase = e.target.value; renderCashLedger(); });
        wireSharedSortHeaders('grantsCashLedger', renderCashLedger);
        wireSeizureLinks();
        if (CHART_REFS_GRANTS.cashByPhase)
            CHART_REFS_GRANTS.cashByPhase.destroy();
        CHART_REFS_GRANTS.cashByPhase = safeChart('chartCashByPhase', { type: 'bar',
            data: { labels: CASH_PHASES, datasets: [{ label: 'Cash Currently in Phase', data: CASH_PHASES.map((p?: any): any => byPhaseTotals[p]), backgroundColor: '#134DD1' } as any] } as any,
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { color: chartGridColor() } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 9 } as any } as any, grid: { display: false } as any } as any } as any } as any } as any);
    }
    /* =========================================================================
       REPORTS & ANALYTICS
       ========================================================================= */
    let GRANTS_REPORT_FILTERS: any = { dateFrom: '', dateTo: '' } as any;
    function renderReports(): any {
        if (!can('grants_reports_view')) {
            (document as any).getElementById('view-grants-reports').innerHTML = permissionBlockedView("You don't have permission to view Grants Mgmt reports in this role.");
            return;
        }
        const canExport: any = can('grants_reports_export');
        const f: any = GRANTS_REPORT_FILTERS;
        const seizuresInRange: any = STATE.grants.seizures.filter((x?: any): any => withinDateRange(x.seizureDate, f.dateFrom, f.dateTo));
        const grantsInRange: any = STATE.grants.grants.filter((g?: any): any => withinDateRange(g.awardStartDate, f.dateFrom, f.dateTo));
        (document as any).getElementById('view-grants-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="grantsReportFilterHost"></div></div></div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Financial Summary</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportGrantsSummary">${ICONS.download} Export (CSV)</button>` : ''}</div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Total Estimated Value Seized</div><div class="v">${money(seizuresInRange.reduce((s?: any, x?: any): any => s + x.estimatedValue, 0))}</div></div>
          <div><div class="k">Total Equitable Share Received</div><div class="v">${money(seizuresInRange.reduce((s?: any, x?: any): any => s + (x.equitableShareAmount || 0), 0))}</div></div>
          <div><div class="k">Total Grant Award Value</div><div class="v">${money(grantsInRange.reduce((s?: any, g?: any): any => s + g.awardAmount, 0))}</div></div>
          <div><div class="k">Total Match Committed</div><div class="v">${money(grantsInRange.reduce((s?: any, g?: any): any => s + (g.matchAmount || 0), 0))}</div></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="grCrEntity" title="Choose which record type this report covers">
              <option value="seizures">Seizures</option>
              <option value="grants">Grants</option>
              <option value="cashledger">Cash Ledger</option>
            </select>
            <select id="grCrGroupBy" title="Choose how to group the results"></select>
            <input type="date" id="grCrDateFrom" title="Only include records on or after this date">
            <input type="date" id="grCrDateTo" title="Only include records on or before this date">
          </div>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportGrCustomReport">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
        <div class="chart-box" style="height:220px;margin-top:14px;"><canvas id="chartGrCustomReport"></canvas></div>
        <div id="grCustomReportTable" style="margin-top:14px;overflow-x:auto;"></div>
      </div>
    </div>
  `;
        renderReportFilterBar((document as any).getElementById('grantsReportFilterHost'), [
            { type: 'daterange', keyFrom: 'dateFrom', keyTo: 'dateTo', label: 'Financial Summary Date Range (Seizure / Award Date)' } as any,
        ], GRANTS_REPORT_FILTERS, renderReports);
        renderGrCustomReportBuilder();
        (document as any).getElementById('grCrEntity').addEventListener('change', renderGrCustomReportBuilder);
        (document as any).getElementById('grCrDateFrom').addEventListener('change', renderGrCustomReportBuilder);
        (document as any).getElementById('grCrDateTo').addEventListener('change', renderGrCustomReportBuilder);
        const exportSummaryBtn: any = (document as any).getElementById('btnExportGrantsSummary');
        if (exportSummaryBtn)
            exportSummaryBtn.onclick = (): any => {
                exportCsvGrants(["Metric", "Value"], [
                    ["Total Estimated Value Seized", money(seizuresInRange.reduce((s?: any, x?: any): any => s + x.estimatedValue, 0))],
                    ["Total Equitable Share Received", money(seizuresInRange.reduce((s?: any, x?: any): any => s + (x.equitableShareAmount || 0), 0))],
                    ["Total Grant Award Value", money(grantsInRange.reduce((s?: any, g?: any): any => s + g.awardAmount, 0))],
                    ["Total Match Committed", money(grantsInRange.reduce((s?: any, g?: any): any => s + (g.matchAmount || 0), 0))],
                ], "grants_financial_summary.csv");
            };
    }
    const GR_REPORT_GROUPBY: any = {
        seizures: [['seizureType', 'Type'], ['status', 'Status'], ['forfeitureType', 'Forfeiture Type']],
        grants: [['fundingAgency', 'Funding Agency'], ['programArea', 'Program Area'], ['status', 'Status']],
        cashledger: [['phase', 'Phase']]
    } as any;
    function renderGrCustomReportBuilder(): any {
        const entity: any = (document as any).getElementById('grCrEntity').value;
        const groupSel: any = (document as any).getElementById('grCrGroupBy');
        const opts: any = GR_REPORT_GROUPBY[entity];
        const currentGroup: any = groupSel.dataset.current;
        const groupBy: any = (currentGroup && opts.find(([k]: any): any => k === currentGroup)) ? currentGroup : opts[0][0];
        groupSel.innerHTML = opts.map(([k, label]: any): any => `<option value="${k}" ${groupBy === k ? 'selected' : ''}>Group by ${label}</option>`).join('');
        groupSel.onchange = (): any => { groupSel.dataset.current = groupSel.value; renderGrCustomReportBuilder(); };
        groupSel.dataset.current = groupBy;
        const dateFrom: any = (document as any).getElementById('grCrDateFrom').value;
        const dateTo: any = (document as any).getElementById('grCrDateTo').value;
        let dataset: any;
        if (entity === 'seizures')
            dataset = STATE.grants.seizures.map((s?: any): any => ({ ...s, __date: s.seizureDate, __value: s.estimatedValue } as any));
        else if (entity === 'grants')
            dataset = STATE.grants.grants.map((g?: any): any => ({ ...g, __date: g.awardStartDate, __value: g.awardAmount } as any));
        else
            dataset = allCashLedgerEntries().map((e?: any): any => ({ ...e, __date: e.date, __value: e.amount } as any));
        dataset = dataset.filter((row?: any): any => {
            if (dateFrom && row.__date < dateFrom)
                return false;
            if (dateTo && row.__date > dateTo)
                return false;
            return true;
        });
        const sums: any = {} as any;
        dataset.forEach((row?: any): any => { const key: any = row[groupBy] || 'Unspecified'; sums[key] = (sums[key] || 0) + (row.__value || 0); });
        if (CHART_REFS_GRANTS.custom)
            CHART_REFS_GRANTS.custom.destroy();
        CHART_REFS_GRANTS.custom = safeChart('chartGrCustomReport', { type: 'bar',
            data: { labels: Object.keys(sums) as any, datasets: [{ label: 'Total $', data: Object.values(sums) as any, backgroundColor: '#134DD1' } as any] } as any,
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any } as any);
        const groupLabel: any = opts.find(([k]: any): any => k === groupBy)[1];
        const tableRows: any = dataset.slice(0, 200).map((row?: any): any => `<tr><td>${escapeHtml(String(row[groupBy] || ''))}</td><td>${money(row.__value || 0)}</td><td>${escapeHtml(row.__date || '')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
        (document as any).getElementById('grCustomReportTable').innerHTML = `
    <table><thead><tr><th>${groupLabel}</th><th>Value</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length > 200 ? ' (showing first 200)' : ''}</div>
  `;
        const exportBtn: any = (document as any).getElementById('btnExportGrCustomReport');
        if (exportBtn)
            exportBtn.onclick = (): any => exportCsvGrants([groupLabel, "Value", "Date"], dataset.map((row?: any): any => [row[groupBy] || '', row.__value || 0, row.__date || '']), `grants_custom_report_${entity}.csv`);
    }
    function exportCsvGrants(headers?: any, rows?: any, filename?: any): any {
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
       ADMIN: reference data, notification routing, audit log
       ========================================================================= */
    let ADMIN_TAB: any = 'fundingAgencies';
    const SIMPLE_LIST_TABS: any = {
        fundingAgencies: { label: 'Funding Agencies', usageCheck: (v?: any): any => STATE.grants.grants.filter((g?: any): any => g.fundingAgency === v).length } as any,
        programAreas: { label: 'Program Areas', usageCheck: (v?: any): any => STATE.grants.grants.filter((g?: any): any => g.programArea === v).length } as any,
        seizureTypes: { label: 'Seizure Types', usageCheck: (v?: any): any => STATE.grants.seizures.filter((s?: any): any => s.seizureType === v).length } as any,
        forfeitureTypes: { label: 'Forfeiture Types', usageCheck: (v?: any): any => STATE.grants.seizures.filter((s?: any): any => s.forfeitureType === v).length } as any,
        dispositionTypes: { label: 'Disposition Types', usageCheck: (v?: any): any => STATE.grants.seizures.filter((s?: any): any => s.dispositionType === v).length } as any
    } as any;
    function renderAdmin(): any {
        const canManage: any = can('grants_admin_categories');
        const canAudit: any = can('grants_admin_audit');
        if (!canManage && !canAudit) {
            (document as any).getElementById('view-grants-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
            return;
        }
        const tabs: any = [];
        if (canManage) {
            (Object.entries(SIMPLE_LIST_TABS) as any).forEach(([key, cfg]: any): any => tabs.push([key, cfg.label]));
            tabs.push(['notifications', 'Notification Routing']);
        }
        if (canAudit)
            tabs.push(['audit', 'Platform Audit Log']);
        if (!tabs.find(([k]: any): any => k === ADMIN_TAB))
            ADMIN_TAB = tabs[0][0];
        (document as any).getElementById('view-grants-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key, label]: any): any => `<button class="btn btn-sm ${ADMIN_TAB === key ? 'btn-primary' : 'btn-outline'}" data-admin-tab-gr="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyGr"></div>
  `;
        (document as any).querySelectorAll('[data-admin-tab-gr]').forEach((b?: any): any => b.addEventListener('click', (): any => { ADMIN_TAB = b.dataset.adminTabGr; renderAdmin(); }));
        renderAdminTabBody();
    }
    function renderAdminTabBody(): any {
        const body: any = (document as any).getElementById('adminTabBodyGr');
        if (SIMPLE_LIST_TABS[ADMIN_TAB])
            renderSimpleListTab(body, ADMIN_TAB);
        else if (ADMIN_TAB === 'notifications')
            renderNotificationRoutingTab(body);
        else if (ADMIN_TAB === 'audit')
            renderPlatformAuditLogTab(body);
    }
    function renderSimpleListTab(body?: any, key?: any): any {
        const cfg: any = SIMPLE_LIST_TABS[key];
        const list: any = STATE.grants.refData[key];
        const rows: any = list.map((v?: any, i?: any): any => {
            const inUse: any = cfg.usageCheck(v);
            return `<tr><td>${escapeHtml(v)}</td><td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item-gr="${i}">${ICONS.trash}</button></td></tr>`;
        }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputGr" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/, '')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemGr">${ICONS.plus} Add</button>        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddItemGr').addEventListener('click', (): any => {
            const val: any = (document as any).getElementById('newItemInputGr').value.trim();
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
        (document as any).querySelectorAll('[data-remove-item-gr]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const idx: any = Number(b.dataset.removeItemGr);
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
    function renderNotificationRoutingTab(body?: any): any {
        const roleOpts: any = (sel?: any): any => STATE.roles.map((r?: any): any => `<option value="${r.id}" ${sel === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Grant Reporting Due Alerts</label><select id="fRouteGrReport">${roleOpts(STATE.grants.notifySettings.reportingDueRoleId)}</select></div>
        <div class="form-row"><label>SAM.gov Registration Expiring Alerts</label><select id="fRouteGrSam">${roleOpts(STATE.grants.notifySettings.samExpiringRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingGr">Save Routing</button>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveRoutingGr').addEventListener('click', (): any => {
            STATE.grants.notifySettings.reportingDueRoleId = (document as any).getElementById('fRouteGrReport').value;
            STATE.grants.notifySettings.samExpiringRoleId = (document as any).getElementById('fRouteGrSam').value;
            logActivity("Updated Grants Mgmt notification routing settings.", "admin");
            persist();
            toast("Notification routing saved.");
            renderNotifBell();
        });
    }
    /* =========================================================================
       MODULE ENTRY POINT
       ========================================================================= */
    function startGrantsModule(): any {
        renderNav();
        switchView('grants-dashboard');
    }
    (window as any).GRANTS = { start: startGrantsModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: (): any => renderView(ACTIVE_VIEW), openSeizureDetail, openGrantDetail } as any;
})();
