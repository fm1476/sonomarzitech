const SuiteUX: any = ((): any => {
    let route: any = 'home', restoring: any = false, record: any = null, modalDirty: any = false, focusReturn: any = null, lastViews: any = {} as any, viewScroll: any = {} as any, activeTab: any = 'mine', dashboardCalendar: any = 'mine';
    let uiObserver: any, observerQueued: any = false, tableSequence: any = 0;
    const modules: any = (): any => ({ qm: QM, fleet: FLEET, personnel: PM, k9: K9, drone: DRONE, eod: EOD, subpoena: SUBPOENA, grants: GRANTS, civil: CIVIL } as any);
    const esc: any = escapeHtml;
    const userTimeZone: any = ((): any => { try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    catch {
        return 'UTC';
    } })();
    const pad: any = (n?: any): any => String(n).padStart(2, '0');
    function displayDate(value?: any): any { const m: any = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[2]}/${m[3]}/${m[1]}` : String(value || ''); }
    function sourceTimeZone(): any { try {
        return TenantPlatform?.tenant?.()?.timezone || userTimeZone;
    }
    catch {
        return userTimeZone;
    } }
    function zoneShort(): any { try {
        return new Intl.DateTimeFormat('en-US', { timeZone: userTimeZone, timeZoneName: 'short' } as any).formatToParts(new Date() as any).find((p?: any): any => p.type === 'timeZoneName')?.value || userTimeZone;
    }
    catch {
        return userTimeZone;
    } }
    function zonedInstant(date?: any, time?: any, zone?: any): any { const [y, m, d]: any = date.split('-').map(Number), [h, minute]: any = time.split(':').map(Number), target: any = Date.UTC(y, m - 1, d, h, minute); let utc: any = target; try {
        const partsFormatter: any = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as any);
        for (let i: any = 0; i < 2; i++) {
            const parts: any = Object.fromEntries(partsFormatter.formatToParts(new Date(utc) as any).filter((p?: any): any => p.type !== 'literal').map((p?: any): any => [p.type, p.value]));
            const represented: any = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
            utc -= represented - target;
        }
        return new Date(utc) as any;
    }
    catch {
        return new Date(`${date}T${time}:00`) as any;
    } }
    function displayInstant(value?: any): any { const d: any = new Date(value) as any; if (Number.isNaN(d.getTime()))
        return String(value || ''); try {
        const parts: any = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: userTimeZone, month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as any).formatToParts(d).filter((p?: any): any => p.type !== 'literal').map((p?: any): any => [p.type, p.value]));
        return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}`;
    }
    catch {
        return displayDate(String(value).slice(0, 10)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } }
    function displayOperationalTime(date?: any, start?: any, end?: any): any { const source: any = sourceTimeZone(), startInstant: any = zonedInstant(date, start, source), startText: any = displayInstant(startInstant.toISOString()); if (!end)
        return startText; let endInstant: any = zonedInstant(date, end, source); if (Number(end.replace(':', '')) < Number(start.replace(':', '')))
        endInstant = new Date(endInstant.getTime() + 86400000) as any; const endText: any = displayInstant(endInstant.toISOString()), startDate: any = startText.slice(0, 10), endDate: any = endText.slice(0, 10); return startDate === endDate ? `${startText}\u2013${endText.slice(11)}` : `${startText}\u2013${endText}`; }
    function displayTimeOnly(time?: any, date: any = fmt(new Date() as any)): any { const converted: any = displayOperationalTime(date, time), shownDate: any = converted.slice(0, 10), baseDate: any = displayDate(date), shownTime: any = converted.slice(11); if (shownDate === baseDate)
        return shownTime; const [sm, sd, sy]: any = shownDate.split('/').map(Number), [bm, bd, by]: any = baseDate.split('/').map(Number), days: any = Math.round((Date.UTC(sy, sm - 1, sd) - Date.UTC(by, bm - 1, bd)) / 86400000); return shownTime + (days > 0 ? ' (+1 day)' : ' (-1 day)'); }
    function normalizeDisplayText(value?: any): any { return String(value || '').replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\b/g, displayInstant).replace(/\b(\d{4}-\d{2}-\d{2})\s*(?:(?:,|·|•|at)\s*)?(\d{1,2}:\d{2})(?:\s*[\u2013-]\s*(\d{1,2}:\d{2}))?/gi, (_?: any, date?: any, start?: any, end?: any): any => displayOperationalTime(date, start, end)).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$2/$3/$1').replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_?: any, m?: any, d?: any, y?: any): any => `${pad(m)}/${pad(d)}/${y}`); }
    function formatVisibleDates(root?: any): any { if (!root)
        return; const walker: any = (document as any).createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(node?: any) { const parent: any = node.parentElement; if (!parent || parent.closest('script,style,template,select,option,.suite-no-date-format'))
            return NodeFilter.FILTER_REJECT; return /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } } as any); const nodes: any = []; while (walker.nextNode())
        nodes.push(walker.currentNode); nodes.forEach((node?: any): any => { node.nodeValue = normalizeDisplayText(node.nodeValue); }); root.querySelectorAll?.('input[type="date"]').forEach((input?: any): any => input.lang = 'en-US'); }
    const preferences: any = { get(key?: any, fallback?: any) { try {
            return JSON.parse(localStorage.getItem('pss.ux.' + (CURRENT_USER_ID || 'device') + '.' + key) || 'null') ?? fallback;
        }
        catch {
            return fallback;
        } }, set(key?: any, value?: any) { try {
            localStorage.setItem('pss.ux.' + (CURRENT_USER_ID || 'device') + '.' + key, JSON.stringify(value));
        }
        catch { } } } as any;
    const isAdmin: any = (): any => !!CURRENT_USER_ID && (SuiteStore.mode() === 'shared' ? (HOME_ROLE_IDS || []) : (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || [])).some((id?: any): any => ['role_admin', 'role_platform_admin'].includes(id));
    const assignedRoles: any = (): any => SuiteStore.mode() === 'shared' ? (HOME_ROLE_IDS || []) : (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || []);
    const previewing: any = (): any => isAdmin() && [...(STATE.currentRoleIds || [])].sort().join('|') !== [...assignedRoles()].sort().join('|');
    const permits: any = (mod?: any, ability?: any): any => can(MODULE_META[mod].ability) && (!ability || (Array.isArray(ability) ? ability.some(can) : can(ability)));
    function metaFor(id?: any): any { for (const [mod, m] of Object.entries(modules()) as any) {
        const meta: any = m.NAV_ITEMS.find((n?: any): any => n.id === id);
        if (meta)
            return { mod, ...meta } as any;
    } return null; }
    function allowedView(id?: any): any { const m: any = metaFor(id); return m && permits(m.mod, m.requiredAbility); }
    function currentPerson(): any { return STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || { name: 'Staff member', unit: '' } as any; }
    function rememberRoute(next?: any, replace: any = false): any { route = next; if (!restoring) {
        const hash: any = '#/' + next;
        try {
            if (location.hash !== hash)
                history[replace ? 'replaceState' : 'pushState']({ suite: next } as any, '', hash);
        }
        catch { }
    } }
    function leaveRecord(): any { const box: any = (document as any).getElementById('modalBox'); (document as any).getElementById('modalOverlay').appendChild(box); box.classList.remove('record-page'); record = null; (document as any).getElementById('view-record')?.classList.remove('active'); }
    function guard(): any { if (!modalDirty)
        return true; return confirm('Discard the unsaved changes in this form?'); }
    function beforeView(id?: any): any { if (!guard())
        return false; modalDirty = false; (document as any).getElementById('modalOverlay').classList.remove('open'); leaveRecord(); const old: any = route; viewScroll[old] = (document as any).getElementById('content').scrollTop; const m: any = metaFor(id); if (m) {
        ACTIVE_MODULE = m.mod;
        ACTIVE_SHARED_VIEW = null;
        lastViews[m.mod] = id;
        rememberRoute('view/' + id);
        renderSuiteNav();
        queueMicrotask((): any => { (document as any).getElementById('content').scrollTop = viewScroll[route] || 0; enhance(); });
    } return true; }
    function go(id?: any): any { if (!allowedView(id)) {
        toast('This workspace is not available to your current role.', true);
        return;
    } const m: any = metaFor(id); modules()[m.mod].switchView(id); }
    function showCustom(id?: any, title?: any, subtitle?: any): any { if (!guard())
        return false; modalDirty = false; leaveRecord(); (document as any).getElementById('modalOverlay').classList.remove('open'); ACTIVE_MODULE = null; ACTIVE_SHARED_VIEW = id; (document as any).querySelectorAll('.view').forEach((e?: any): any => e.classList.remove('active')); let el: any = (document as any).getElementById('view-' + id); if (!el) {
        el = (document as any).createElement('div');
        el.id = 'view-' + id;
        el.className = 'view';
        (document as any).getElementById('content').appendChild(el);
    } el.classList.add('active'); (document as any).getElementById('page-title').textContent = title; (document as any).getElementById('page-sub').textContent = subtitle; (document as any).getElementById('navlist').innerHTML = ''; rememberRoute(id); renderSuiteNav(); return el; }
    function button(label?: any, icon?: any, action?: any, cls: any = 'quick-action'): any { const b: any = (document as any).createElement('button'); b.className = cls; b.type = 'button'; b.title = label; b.innerHTML = (ICONS[icon] || '') + '<span>' + esc(label) + '</span>'; b.onclick = action; return b; }
    const navGroups: any = [
        ['People & Readiness', [['Personnel Administration', 'pm-records', 'idcard'], ['Training & Qualifications', 'pm-training', 'award'], ['Schedule', 'pm-scheduling', 'calendar']]],
        ['Equipment & Fleet', [['Quartermaster', 'qm-inventory', 'box'], ['Fleet', 'fleet-vehicles', 'truck']]],
        ['Specialized Units', [['K9', 'k9-roster', 'pawprint'], ['UAS', 'drone-fleet', 'drone'], ['EOD', 'eod-technicians', 'bomb']]],
        ['Court & Civil', [['Subpoenas', 'subpoena', 'gavel'], ['Civil Process', 'civil', 'scale']]],
        ['Financial Management', [['Grants', 'grants-awards', 'briefcase'], ['Asset Forfeiture', 'grants-seizures', 'dollar']]]
    ];
    function resolveDestination(id?: any): any { if (modules()[id])
        return accessibleModules().includes(id); return allowedView(id); }
    function visit(id?: any): any { if (modules()[id]) {
        enterModule(id);
        return;
    } go(id); }
    let NAV_FILTER_TEXT: any = '';
    // Pure visibility toggling, no rebuild -- keeps focus in the search box while typing. Matches
    // against every top-level nav line AND, when a module is open, its nested sub-pages, and
    // auto-opens (or hides, if empty) each category so a match never sits inside a collapsed group.
    function applyNavFilter(): any {
        const q: any = NAV_FILTER_TEXT.trim().toLowerCase();
        const sidebar: any = (document as any).getElementById('sidebar');
        sidebar.querySelectorAll('.navgroup').forEach((group?: any): any => {
            let anyVisible: any = false;
            group.querySelectorAll(':scope > .navline').forEach((line?: any): any => {
                const match: any = !q || (line.dataset.searchText || '').includes(q);
                line.style.display = match ? '' : 'none';
                if (match)
                    anyVisible = true;
            });
            group.style.display = (!q || anyVisible) ? '' : 'none';
            if (q)
                group.open = anyVisible;
        });
        const nested: any = (document as any).getElementById('navlist');
        if (nested)
            nested.querySelectorAll('.navitem').forEach((item?: any): any => {
                const match: any = !q || (item.dataset.searchText || item.textContent || '').toLowerCase().includes(q);
                item.style.display = match ? '' : 'none';
            });
    }
    function setSidebarCollapsed(collapsed?: any): any {
        preferences.set('sidebarCollapsed', collapsed);
        (document as any).getElementById('sidebar').classList.toggle('sidebar-collapsed', collapsed);
        if (collapsed)
            (document as any).querySelectorAll('#suiteNav .navgroup').forEach((g?: any): any => g.open = true);
        else
            (document as any).querySelectorAll('#suiteNav .navgroup').forEach((g?: any): any => g.open = preferences.get('group.' + g.dataset.label, true));
    }
    function navigation(): any {
        const nav: any = (document as any).getElementById('suiteNav');
        const navlistEl: any = (document as any).getElementById('navlist');
        if (navlistEl.parentElement === nav || navlistEl.parentElement?.closest('#suiteNav'))
            (document as any).getElementById('sidebar').insertBefore(navlistEl, nav.nextSibling);
        nav.innerHTML = '';
        const top: any = (document as any).createElement('div');
        top.style.padding = '0 10px';
        top.append(button('My Work', 'dashboard', home, 'navitem' + (route === 'home' ? ' active' : '')));
        top.append(button('Workspaces', 'grid', workspaces, 'navitem' + (route === 'workspaces' ? ' active' : '')));
        top.append(button('Readiness', 'checklist', readinessView, 'navitem' + (route === 'readiness' ? ' active' : '')));
        if (WorkOperations.available())
            top.append(button('Workflows', 'briefcase', workflowView, 'navitem' + (route === 'workflows' ? ' active' : '')));
        if (FieldTraining.available())
            top.append(button('Field Training', 'award', fieldTrainingView, 'navitem' + (route === 'fieldtraining' ? ' active' : '')));
        if (SuiteStore.mode() === 'shared') {
            const noticeNav: any = button('Staff Notices', 'bell', (): any => shared('notices', 'Staff Notices', 'Scheduling and staff messages'), 'navitem staff-notices-nav' + (route === 'shared/notices' ? ' active' : ''));
            noticeNav.id = 'staffNoticesNav';
            const count: any = (document as any).createElement('strong');
            count.id = 'staffNoticeCount';
            count.className = 'staff-notice-count';
            count.hidden = true;
            noticeNav.append(count);
            top.append(noticeNav);
        }
        nav.append(top);
        if (SuiteStore.mode() === 'shared')
            StaffNotices.updateNavBadge();
        const searchWrap: any = (document as any).createElement('div');
        searchWrap.className = 'nav-search-wrap';
        const searchInput: any = (document as any).createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Jump to anything';
        searchInput.className = 'nav-search';
        searchInput.value = NAV_FILTER_TEXT;
        searchInput.setAttribute('aria-label', 'Filter navigation');
        searchInput.addEventListener('input', (): any => { NAV_FILTER_TEXT = searchInput.value; applyNavFilter(); });
        searchWrap.append(ICONS.search ? Object.assign((document as any).createElement('span'), { className: 'nav-search-icon', innerHTML: ICONS.search } as any) : (document as any).createTextNode(''));
        searchWrap.append(searchInput);
        const collapseBtn: any = (document as any).createElement('button');
        collapseBtn.className = 'nav-collapse-btn';
        collapseBtn.type = 'button';
        const isCollapsed: any = (document as any).getElementById('sidebar').classList.contains('sidebar-collapsed');
        collapseBtn.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
        collapseBtn.setAttribute('aria-label', collapseBtn.title);
        collapseBtn.textContent = isCollapsed ? '\u00bb' : '\u00ab';
        collapseBtn.onclick = (): any => setSidebarCollapsed(!(document as any).getElementById('sidebar').classList.contains('sidebar-collapsed'));
        // Distinct from collapseBtn above: that one shrinks the whole sidebar to icon-only, this one
        // folds every module's accordion group shut without changing the sidebar's width. A role with
        // broad access accumulates open groups over time -- every module ever visited stays expanded
        // by design (see the toggle handler below), which is exactly right for one or two modules but
        // becomes clutter once someone's touched all of them. This button resets that accumulation in
        // one click rather than making someone close a dozen groups by hand. The currently active
        // module still reopens itself on the very next render regardless (see group.open below), since
        // losing sight of where you currently are would be a worse problem than the clutter this fixes.
        const collapseAllBtn: any = (document as any).createElement('button');
        collapseAllBtn.className = 'nav-collapse-btn nav-collapse-all-btn';
        collapseAllBtn.type = 'button';
        collapseAllBtn.title = 'Collapse all module groups';
        collapseAllBtn.setAttribute('aria-label', 'Collapse all module groups');
        collapseAllBtn.textContent = '\u2261\u2212';
        collapseAllBtn.onclick = (): any => { for (const key of accessibleModules())
            preferences.set('group.mod:' + key, false); navigation(); };
        const topRow: any = (document as any).createElement('div');
        topRow.className = 'nav-top-row';
        topRow.append(searchWrap);
        topRow.append(collapseAllBtn);
        topRow.append(collapseBtn);
        nav.append(topRow);
        const navDivider: any = (document as any).createElement('div');
        navDivider.style.cssText = 'height:1px;background:#2B3B54;margin:2px 14px 12px;flex-shrink:0;';
        nav.append(navDivider);
        const pins: any = preferences.get('pins', []);
        if (pins.length) {
            const d: any = (document as any).createElement('div');
            d.className = 'navgroup';
            d.dataset.label = '__pins';
            for (const id of pins) {
                const m: any = metaFor(id);
                if (m && allowedView(id)) {
                    const line: any = (document as any).createElement('div');
                    line.className = 'navline';
                    line.dataset.searchText = m.title.toLowerCase();
                    line.append(button(m.title, m.icon, (): any => go(id), 'navitem'));
                    d.append(line);
                }
            }
            nav.append(d);
        }
        // Modules are listed alphabetically by display name, one per accordion group. Each group's
        // own sub-pages (from that module's NAV_ITEMS, filtered to what this role can see) render
        // directly inside it, so opening a module always reveals its submenu right there -- no
        // dependence on which specific sub-page happens to be active.
        const moduleKeys: any = accessibleModules().slice().sort((a?: any, b?: any): any => MODULE_META[a].name.localeCompare(MODULE_META[b].name));
        for (const key of moduleKeys) {
            const items: any = modules()[key].NAV_ITEMS.filter((n?: any): any => allowedView(n.id));
            if (!items.length)
                continue;
            const group: any = (document as any).createElement('details');
            group.className = 'navgroup module-navgroup';
            group.dataset.label = 'mod:' + key;
            group.open = ACTIVE_MODULE === key || preferences.get('group.mod:' + key, false);
            const s: any = (document as any).createElement('summary');
            s.innerHTML = '<span class="nav-mod-icon">' + (ICONS[MODULE_META[key].icon] || '') + '</span><span>' + esc(MODULE_META[key].name) + '</span>';
            group.append(s);
            group.addEventListener('toggle', (): any => preferences.set('group.mod:' + key, group.open));
            for (const item of items) {
                const isActive: any = route === 'view/' + item.id;
                const line: any = (document as any).createElement('div');
                line.className = 'navline';
                line.dataset.searchText = item.label.toLowerCase();
                line.append(button(item.label, item.icon, (): any => go(item.id), 'navitem' + (isActive ? ' active' : '')));
                const pin: any = (document as any).createElement('button');
                pin.className = 'nav-favorite';
                pin.textContent = pins.includes(item.id) ? '★' : '☆';
                pin.title = (pins.includes(item.id) ? 'Unpin ' : 'Pin ') + item.label;
                pin.setAttribute('aria-label', pin.title);
                pin.onclick = (): any => { preferences.set('pins', pins.includes(item.id) ? pins.filter((p?: any): any => p !== item.id) : [...pins, item.id]); navigation(); };
                line.append(pin);
                group.append(line);
            }
            nav.append(group);
        }
        const bottom: any = (document as any).createElement('div');
        bottom.style.padding = '5px 10px';
        if ((Object.values(modules()) as any).some((m?: any): any => m.NAV_ITEMS.some((n?: any): any => n.id.endsWith('-reports') && allowedView(n.id))))
            bottom.append(button('Reports', 'chart', reports, 'navitem' + (route === 'reports' ? ' active' : '')));
        if (adminDestinations().length)
            bottom.append(button('Administration', 'gear', administration, 'navitem' + (route === 'administration' ? ' active' : '')));
        nav.append(bottom);
        (document as any).getElementById('sidebar').querySelector('.nav-context')?.remove();
        // Each module's submenu now renders inline inside its own accordion group above, so the old
        // shared #navlist (previously repositioned under whichever category line was active) is no
        // longer part of the visible tree. It's left empty/hidden rather than removed outright, since
        // individual modules still populate it internally on their own view switches.
        const navlist: any = (document as any).getElementById('navlist');
        navlist.classList.remove('navlist-nested');
        navlist.innerHTML = '';
        navlist.style.display = 'none';
        // Collapse-to-icons is a desktop affordance for a persistent rail. Below the drawer
        // breakpoint the sidebar is already a temporary overlay (see toggleSidebar()), so
        // collapsing it to icons on top of that would stack two different "smaller sidebar"
        // behaviors and leave no visible way to read or re-expand it. Only apply the saved
        // preference when there's room for a persistent rail in the first place.
        if (preferences.get('sidebarCollapsed', false) && (window as any).innerWidth > 860)
            (document as any).getElementById('sidebar').classList.add('sidebar-collapsed');
        else
            (document as any).getElementById('sidebar').classList.remove('sidebar-collapsed');
        applyNavFilter();
    }
    function tasks(): any {
        const p: any = currentPerson(), out: any = [], today: any = fmt(new Date() as any);
        const add: any = (title?: any, owner?: any, due?: any, type?: any, action?: any, consequence?: any): any => out.push({ title, owner, due, type, action, consequence, urgent: !!due && due < today } as any);
        if (permits('subpoena', ['subpoena_view_own', 'subpoena_view_all']))
            for (const s of STATE.subpoena.subpoenas.filter((s?: any): any => s.personId === p.id && s.status === 'Active'))
                add(s.acknowledgedDate ? 'Court appearance · ' + s.caseNumber : 'Acknowledge subpoena · ' + s.caseNumber, p.name, s.courtDate, 'mine', (): any => SUBPOENA.openSubpoenaDetail(s.id), displayTimeOnly(s.courtTime, s.courtDate) + ' · ' + s.courtroom);
        if (permits('civil', 'civil_paper_view_own'))
            for (const c of STATE.civil.papers.filter((c?: any): any => c.assignedServerId === p.id && !['Cancelled', 'Returned to Court'].includes(c.stage)))
                add('Serve ' + c.paperType + ' · ' + c.caseNumber, p.name, c.returnByDate, 'mine', (): any => CIVIL.openPaperDetail(c.id), 'Return to court deadline · ' + c.stage);
        if (permits('qm', 'qm_equip_view'))
            for (const a of STATE.qm.assignments.filter((a?: any): any => (a.targetId || a.personId) === p.id && a.status !== 'Returned')) {
                const e: any = STATE.qm.equipment.find((e?: any): any => e.id === a.equipmentId);
                if (e)
                    add('Equipment return · ' + e.name, p.name, a.dueDate, 'mine', (): any => QM.openEquipmentDetail(e.id), 'Assigned equipment · ' + e.assetId);
            }
        if (permits('qm', 'qm_request_approve'))
            for (const r of STATE.qm.requests.filter((r?: any): any => r.status === 'Pending' && (STATE.currentRoleIds.includes(r.approverRoleId) || STATE.currentRoleIds.includes('role_admin'))))
                add('Review equipment request', personName(r.requesterId || r.personId), r.createdDate, 'approvals', (): any => go('qm-requests'), r.itemDescription || r.justification || 'Approval required');
        if (permits('personnel', 'pm_training_manage'))
            for (const r of STATE.pm.trainingRequests.filter((r?: any): any => r.status === 'Pending'))
                add('Review training request', personName(r.personId), r.requestDate, 'approvals', (): any => go('pm-training'), 'Course participation approval');
        if (permits('personnel', 'pm_leave_request_approve'))
            for (const r of (STATE.pm.leaveRequests || []).filter((r?: any): any => r.status === 'pending'))
                add('Review time-off request', personName(r.personId), r.startDate, 'approvals', (): any => go('pm-scheduling'), 'Requested time off · ' + r.code);
        if (permits('personnel', 'pm_schedule_manage'))
            for (const r of (STATE.pm.shiftSwapRequests || []).filter((r?: any): any => r.status === 'pending'))
                add('Review shift swap', personName(r.requesterId), r.date, 'approvals', (): any => go('pm-scheduling'), 'Proposed cover · ' + personName(r.coveringId));
        if (permits('personnel', 'pm_training_request'))
            for (const r of (STATE.pm.trainingRequests || []).filter((r?: any): any => r.personId === p.id && r.status === 'Pending'))
                add('Training request pending', p.name, null, 'mine', (): any => go('pm-training'), 'Awaiting training approval');
        const names: any = { Quartermaster: 'qm', Fleet: 'fleet', Personnel: 'personnel', K9: 'k9', Drone: 'drone', EOD: 'eod', Subpoena: 'subpoena', Grants: 'grants', Civil: 'civil' } as any;
        for (const n of (window as any).__SUITE_NOTIFS || []) {
            const mod: any = names[n.module];
            if (!mod || !accessibleModules().includes(mod) || (n.readBy || []).includes(CURRENT_USER_ID))
                continue;
            add(n.message, n.module, n.dueDate || n.date || null, 'attention', (): any => enterModule(mod), 'Role-routed notification');
        }
        for (const t of WorkOperations.readinessTasks().concat(WorkOperations.tasks(), FieldTraining.tasks()))
            out.push({ ...t, urgent: !!t.due && t.due < today } as any);
        return out.sort((a?: any, b?: any): any => Number(b.urgent) - Number(a.urgent) || (a.due || '9999').localeCompare(b.due || '9999'));
    }
    function home(): any {
        renderNotifBell();
        const el: any = showCustom('home', 'My Work', 'Assignments, readiness, and the next action');
        if (!el)
            return;
        const all: any = tasks(), today: any = fmt(new Date() as any), p: any = currentPerson();
        if (!isAdmin())
            dashboardCalendar = 'mine';
        const filtered: any = all.filter((t?: any): any => activeTab === 'all' || (activeTab === 'urgent' ? t.urgent : t.type === activeTab));
        el.innerHTML = `<div class="work-hero"><div><div class="work-eyebrow">Your operational workspace</div><h2>${esc(greeting())}, ${esc(p.name.replace(/^(Sgt\.|Ofc\.|Officer|Deputy|Lt\.|Capt\.)\s*/, '').split(' ')[0])}.</h2><p>One place to see what needs you and move work forward.</p></div><div class="work-date">${esc(new Intl.DateTimeFormat('en-US', { timeZone: userTimeZone, weekday: 'long', month: '2-digit', day: '2-digit', year: 'numeric' } as any).format(new Date() as any))}<br>${esc(p.unit || 'Agency workspace')}</div></div><div class="work-metrics">${[['urgent', 'Overdue', all.filter((t?: any): any => t.urgent).length, 'Review deadlines and follow-up'], ['mine', 'My assignments', all.filter((t?: any): any => t.type === 'mine').length, 'Court, civil process, and equipment'], ['approvals', 'Awaiting approval', all.filter((t?: any): any => t.type === 'approvals').length, 'Requests needing a decision'], ['attention', 'Needs attention', all.filter((t?: any): any => t.type === 'attention').length, 'Exceptions routed to your role']].map(([id, l, n, h]: any): any => `<button class="work-metric ${n === 0 ? 'good' : 'urgent'}" data-task-filter="${id}"><span>${l}</span><strong>${n}</strong><small>${h}</small></button>`).join('')}</div><div class="work-layout"><div><section class="panel"><div class="panel-head"><h2>Priority work</h2><span class="hint">${filtered.length} items</span></div><div class="work-tabs">${[['mine', 'My Work'], ['all', 'All Work'], ['approvals', 'Approvals'], ['attention', 'Attention'], ['urgent', 'Overdue']].map(([id, l]: any): any => `<button class="work-tab ${activeTab === id ? 'active' : ''}" aria-pressed="${activeTab === id}" data-task-filter="${id}">${l}</button>`).join('')}</div><div id="workQueue"></div></section><section class="panel"><div class="panel-head"><h2>Continue working</h2><span class="hint">Recent records on this device</span></div><div class="panel-body" id="recentRecords"></div></section></div><aside class="work-aside"><section class="panel"><div class="panel-head"><h2>Quick actions</h2></div><div class="panel-body quick-grid" id="quickActions"></div></section><section class="panel"><div class="panel-head"><h2>Workspace readiness</h2></div><div class="panel-body" id="readiness"></div></section></aside></div><section class="panel work-calendar-panel" aria-labelledby="workCalendarTitle"><div class="panel-head work-calendar-head"><div><h2 id="workCalendarTitle">${dashboardCalendar === 'master' ? 'Master Calendar' : 'My Calendar'}</h2><span class="hint">${dashboardCalendar === 'master' ? 'Department-wide training schedule' : 'Your training sessions and court dates'}</span></div>${isAdmin() ? `<div class="work-tabs work-calendar-tabs" aria-label="Calendar view">${[['mine', 'My Calendar'], ['master', 'Master Calendar']].map(([id, l]: any): any => `<button class="work-tab ${dashboardCalendar === id ? 'active' : ''}" aria-pressed="${dashboardCalendar === id}" data-calendar-view="${id}">${l}</button>`).join('')}</div>` : ''}</div><div class="panel-body" id="workCalendarBody"></div></section>`;
        const queue: any = el.querySelector('#workQueue');
        if (!filtered.length)
            queue.innerHTML = '<div class="empty-state"><div class="msg">Nothing in this queue</div><div class="sub">No matching items are visible to your current role.</div></div>';
        filtered.slice(0, 100).forEach((t?: any): any => { const row: any = (document as any).createElement('div'); row.className = 'work-item'; row.innerHTML = `<div class="work-priority ${t.urgent ? 'urgent' : ''}"></div><div><h3>${esc(t.title)}</h3><p>${esc(t.owner)} · ${esc(t.consequence)}</p>${t.due ? `<div class="${t.urgent ? 'due' : ''}" style="font-size:12px">${t.urgent ? 'Overdue · ' : t.due === today ? 'Today · ' : ''}${esc(t.due)}</div>` : ''}</div>`; row.append(button('Review', '', t.action, 'btn btn-outline btn-sm')); queue.append(row); });
        if (filtered.length > 100) {
            const note: any = (document as any).createElement('p');
            note.className = 'panel-body';
            note.textContent = 'Showing the first 100 priority items. Use the relevant workspace to review all records.';
            queue.append(note);
        }
        el.querySelectorAll('[data-task-filter]').forEach((b?: any): any => b.onclick = (): any => { activeTab = b.dataset.taskFilter; home(); });
        const actions: any = [['Inspect a vehicle', 'checklist', 'fleet-inspections', 'btnNewInspection', 'fleet_inspection_conduct'], ['Request equipment', 'box', 'qm-requests', 'btnNewRequest', 'qm_request_submit'], ['Log K9 deployment', 'pawprint', 'k9-deployments', 'btnLogDeployQuick', 'k9_deployment_log'], ['Log a UAS flight', 'drone', 'drone-flights', 'btnLogFlightQuick', 'drone_flight_log'], ['Intake civil paper', 'scale', 'civil-board', 'btnIntakePaper', 'civil_paper_intake'], ['Review training', 'award', 'pm-training', null, null]];
        const quick: any = el.querySelector('#quickActions');
        for (const [label, icon, id, btn, ability] of actions)
            if (allowedView(id) && (!ability || can(ability)))
                quick.append(button(label, icon, (): any => { go(id); if (btn)
                    (document as any).getElementById(btn)?.click(); }));
        if (!quick.children.length)
            quick.append(button('Open workspaces', 'grid', workspaces));
        const recents: any = preferences.get('recent', []).filter((r?: any): any => recordAllowed(r));
        const recBox: any = el.querySelector('#recentRecords');
        for (const r of recents.slice(0, 6)) {
            const b: any = (document as any).createElement('button');
            b.className = 'recent-item';
            b.innerHTML = esc(r.title) + `<small>${esc(MODULE_META[r.mod].name)}</small>`;
            b.onclick = (): any => dispatchRecord(r);
            recBox.append(b);
        }
        if (!recents.length)
            recBox.innerHTML = '<p style="color:var(--text-dim);font-size:13px">Records you open will appear here.</p>';
        const readiness: any = el.querySelector('#readiness');
        const exceptions: any = WorkOperations.readiness();
        const urgent: any = exceptions.filter((x?: any): any => x.urgent).length;
        readiness.innerHTML = `<div class="readiness-line"><span>Visible exceptions</span><strong>${exceptions.length}</strong></div><div class="readiness-line"><span>Overdue</span><strong>${urgent}</strong></div>`;
        const openReadiness: any = (document as any).createElement('button');
        openReadiness.className = 'btn btn-outline btn-sm';
        openReadiness.textContent = 'Open readiness';
        openReadiness.onclick = readinessView;
        readiness.append(openReadiness);
        if (WorkOperations.available()) {
            const openFlow: any = (document as any).createElement('button');
            openFlow.className = 'btn btn-outline btn-sm';
            openFlow.textContent = 'Agency workflows';
            openFlow.style.marginLeft = '8px';
            openFlow.onclick = workflowView;
            readiness.append(openFlow);
            WorkOperations.refresh();
        }
        const calendar: any = el.querySelector('#workCalendarBody');
        PM.renderCalendarSub(calendar, dashboardCalendar === 'master' ? null : CURRENT_USER_ID);
        calendar.querySelector('#btnScheduleSession')?.remove();
        el.querySelectorAll('[data-calendar-view]').forEach((b?: any): any => b.onclick = (): any => { dashboardCalendar = b.dataset.calendarView; home(); });
    }
    function readinessView(): any { const el: any = showCustom('readiness', 'Operational readiness', 'Exceptions from your authorized workspaces'); if (!el)
        return; WorkOperations.renderReadiness(el); }
    function workflowView(): any { const el: any = showCustom('workflows', 'Agency workflows', 'Requests and approvals'); if (!el)
        return; WorkOperations.renderWorkflows(el); }
    function fieldTrainingView(): any { const el: any = showCustom('fieldtraining', 'Field Training', 'Trainee files, reports and program performance'); if (!el)
        return; FieldTraining.render(el); FieldTraining.load(); }
    function greeting(): any { const h: any = (new Date() as any).getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
    function workspaces(): any { const el: any = showCustom('workspaces', 'Workspaces', 'Your authorized public safety tools'); if (!el)
        return; (window as any).SonoMarziReact.renderWorkspaces(el, accessibleModules().map((key?: any): any => { const m: any = MODULE_META[key]; return { id:key, name:m.name, tagline:m.tagline, icon:ICONS[m.icon], enter:(): any => enterModule(key) } as any; })); }
    function reports(): any { const el: any = showCustom('reports', 'Reports', 'Reporting across your authorized workspaces'); if (!el)
        return; el.innerHTML = '<div class="workspace-grid"></div>'; for (const [key, m] of Object.entries(modules()) as any)
        for (const n of m.NAV_ITEMS.filter((n?: any): any => n.id.endsWith('-reports') && allowedView(n.id)))
            el.firstChild.append(button(MODULE_META[key].name, 'chart', (): any => go(n.id), 'workspace-tile')); }
    function adminDestinations(): any { const list: any = []; for (const [id, label, ability] of [['roles', 'Roles & Abilities', 'admin_roles'], ['fieldlabels', 'Field Labels', 'manage_field_labels'], ['branding', 'Agency Branding', 'manage_branding'], ['sso', 'Single Sign-On', 'admin_sso']])
        if (can(ability))
            list.push({ id, label, shared: true } as any); if (ALL_ABILITY_IDS.some((a?: any): any => a.endsWith('_admin_audit') && can(a)))
        list.push({ id: 'audit', label: 'Platform Audit Log', shared: true } as any); for (const m of Object.values(modules()) as any)
        for (const n of m.NAV_ITEMS.filter((n?: any): any => n.id.endsWith('-admin') && allowedView(n.id)))
            list.push({ id: n.id, label: MODULE_META[metaFor(n.id).mod].name + ' settings' } as any); list.sort((a?: any, b?: any): any => a.label.localeCompare(b.label)); return list; }
    function administration(): any { const el: any = showCustom('administration', 'Administration', 'Access, configuration, and accountability'); if (!el)
        return; el.innerHTML = '<div class="workspace-grid"></div>'; for (const d of adminDestinations())
        el.firstChild.append(button(d.label, 'gear', (): any => d.shared ? shared(d.id, d.label, 'Platform administration') : go(d.id), 'workspace-tile')); if (isAdmin())
        el.firstChild.append(button('Data & connection', 'database', dataSettings, 'workspace-tile')); }
    function shared(id?: any, title?: any, sub?: any): any { if (!guard())
        return; modalDirty = false; leaveRecord(); const ok: any = id === 'personnel' ? can('personnel_view') : id === 'roles' ? can('admin_roles') : id === 'branding' ? can('manage_branding') : id === 'fieldlabels' ? can('manage_field_labels') : id === 'sso' ? can('admin_sso') : id === 'notices' ? SuiteStore.mode() === 'shared' : ALL_ABILITY_IDS.some((a?: any): any => a.endsWith('_admin_audit') && can(a)); if (!ok)
        return; enterSharedView(id, title, sub); rememberRoute('shared/' + id); navigation(); }
    const recordTypes: any = { equipment: ['qm', 'qm_equip_view', 'equipment', 'openEquipmentDetail'], vehicle: ['fleet', 'fleet_vehicle_view', 'vehicles', 'openVehicleDetail'], person: ['personnel', 'pm_records_view', 'records', 'openRecordDetail'], k9: ['k9', 'k9_roster_view', 'k9s', 'openK9Detail'], drone: ['drone', 'drone_fleet_view', 'drones', 'openDroneDetail'], operator: ['drone', 'drone_operator_view', 'operators', 'openOperatorDetail'], technician: ['eod', 'eod_technician_view', 'technicians', 'openTechDetail'], magazine: ['eod', 'eod_magazine_view', 'magazines', 'openMagazineDetail'], subpoena: ['subpoena', ['subpoena_view_all', 'subpoena_view_own'], 'subpoenas', 'openSubpoenaDetail'], paper: ['civil', ['civil_paper_view_all', 'civil_paper_view_own'], 'papers', 'openPaperDetail'], seizure: ['grants', 'grants_seizure_view', 'seizures', 'openSeizureDetail'], grant: ['grants', 'grants_award_view', 'grants', 'openGrantDetail'] } as any;
    function recordData(r?: any): any { const t: any = recordTypes[r.kind]; if (!t)
        return null; const s: any = STATE[r.mod === 'personnel' ? 'pm' : r.mod]; return (s?.[t[2]] || []).find((x?: any): any => (['person', 'operator', 'technician'].includes(r.kind) ? x.personId : x.id) === r.id); }
    function recordAllowed(r?: any): any { const t: any = recordTypes[r.kind]; if (!t || t[0] !== r.mod || !permits(r.mod, t[1]))
        return false; const d: any = recordData(r); if (!d)
        return false; const scope: any = currentRole().agencyScope || []; if (r.kind === 'equipment' && scope.length && !d.isSharedAsset && !scope.includes(d.agency))
        return false; if (r.kind === 'subpoena' && !can('subpoena_view_all') && d.personId !== CURRENT_USER_ID)
        return false; if (r.kind === 'paper' && !can('civil_paper_view_all') && d.assignedServerId !== CURRENT_USER_ID)
        return false; return true; }
    function dispatchRecord(r?: any): any { if (!recordAllowed(r)) {
        toast('This record is unavailable to your current role.', true);
        return;
    } modules()[r.mod][recordTypes[r.kind][3]](r.id); }
    function openRecord(mod?: any, kind?: any, id?: any): any { const next: any = { mod, kind, id } as any; if (!recordAllowed(next)) {
        toast('This record is unavailable to your current role.', true);
        return false;
    } if (!guard())
        return false; modalDirty = false; const parent: any = record?.parent || route; record = { ...next, parent } as any; ACTIVE_MODULE = mod; rememberRoute('record/' + mod + '/' + kind + '/' + encodeURIComponent(id)); return true; }
    function recordTitle(r?: any): any { const d: any = recordData(r) || {} as any; return ['person', 'operator', 'technician'].includes(r.kind) ? personName(r.id) : d.name || d.unitNumber || d.grantName || d.caseNumber || d.description || r.id; }
    function openModal(): any {
        const box: any = (document as any).getElementById('modalBox'), overlay: any = (document as any).getElementById('modalOverlay');
        modalDirty = false;
        const detail: any = !!box.querySelector('#eqDetailBody,#vehDetailBody,#recDetailBody,#k9DetailBody,#droneDetailBody,#operatorDetailBody,#techDetailBody,#magDetailBody,#subDetailBody,#seizureDetailBody,#grantDetailBody,#paperDetailBody');
        if (record && detail) {
            overlay.classList.remove('open');
            (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active'));
            let host: any = (document as any).getElementById('view-record');
            if (!host) {
                host = (document as any).createElement('div');
                host.id = 'view-record';
                host.className = 'view suite-record-host';
                (document as any).getElementById('content').append(host);
            }
            host.classList.add('active');
            host.querySelector('.record-bar')?.remove();
            const bar: any = (document as any).createElement('div');
            bar.className = 'record-bar';
            bar.append(button('Back to workspace', '', (): any => { const parent: any = record.parent; leaveRecord(); navigate(parent); }, 'btn btn-outline btn-sm'));
            const trail: any = (document as any).createElement('span');
            trail.textContent = MODULE_META[record.mod].name + ' / ' + recordTitle(record);
            bar.append(trail);
            bar.append(button('Copy record link', '', (): any => { if ((navigator as any).clipboard)
                (navigator as any).clipboard.writeText(location.href).then((): any => toast('Record link copied.'), (): any => toast('Copy the address from your browser.', true));
            else
                toast('Copy the address from your browser.'); }, 'btn btn-outline btn-sm'));
            host.prepend(bar);
            host.append(box);
            box.classList.add('record-page');
            box.removeAttribute('aria-modal');
            box.setAttribute('role', 'region');
            (document as any).getElementById('page-title').textContent = recordTitle(record);
            (document as any).getElementById('page-sub').textContent = MODULE_META[record.mod].name + ' · Record workspace';
            const recent: any = preferences.get('recent', []).filter((r?: any): any => !(r.mod === record.mod && r.kind === record.kind && r.id === record.id));
            preferences.set('recent', [{ mod: record.mod, kind: record.kind, id: record.id, title: recordTitle(record) } as any, ...recent].slice(0, 12));
            navigation();
        }
        else {
            overlay.append(box);
            box.classList.remove('record-page');
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            focusReturn = (document as any).activeElement;
            overlay.classList.add('open');
            requestAnimationFrame((): any => { associateLabels(box); (box.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button') || box).focus(); });
        }
        associateLabels(box);
        queueMicrotask(enhance);
    }
    function closeModal(event?: any): any { const user: any = event && typeof event === 'object' && 'type' in event; if (user && !guard())
        return false; modalDirty = false; const overlay: any = (document as any).getElementById('modalOverlay'), box: any = (document as any).getElementById('modalBox'); overlay.classList.remove('open'); box.innerHTML = ''; if (record) {
        const r: any = { ...record } as any;
        queueMicrotask((): any => { if (!overlay.classList.contains('open') && !box.innerHTML)
            dispatchRecord(r); });
    }
    else
        focusReturn?.focus?.(); return true; }
    function navigate(next?: any): any { if (next === 'home' || !next) {
        home();
        return;
    } if (next === 'readiness') {
        readinessView();
        return;
    } if (next === 'workflows') {
        workflowView();
        return;
    } if (next === 'fieldtraining') {
        fieldTrainingView();
        return;
    } if (next === 'workspaces') {
        workspaces();
        return;
    } if (next === 'reports') {
        reports();
        return;
    } if (next === 'administration') {
        administration();
        return;
    } if (next.startsWith('agency/')) {
        const slug: any = decodeURIComponent(next.split('/')[1] || '');
        const match: any = TenantPlatform.contexts().find((c?: any): any => c.tenant && c.tenant.slug === slug);
        if (!match) {
            home();
            toast('No agency was found for that address.', true);
            return;
        }
        TenantPlatform.switchContext(match.tenant.id, match.agency.id);
        return;
    } if (next.startsWith('view/')) {
        if (!allowedView(next.slice(5))) {
            home();
            toast('That workspace is not available to your current role.', true);
            return;
        }
        go(next.slice(5));
        return;
    } if (next.startsWith('record/')) {
        const [, mod, kind, id]: any = next.split('/');
        const target: any = { mod, kind, id: decodeURIComponent(id || '') } as any;
        if (!recordAllowed(target)) {
            home();
            toast('That record is not available to your current role.', true);
            return;
        }
        dispatchRecord(target);
        return;
    } if (next.startsWith('checkin/')) {
        const sessionId: any = decodeURIComponent(next.slice(8));
        if (!allowedView('pm-training')) {
            home();
            toast('Training check-in is not available to your current role.', true);
            return;
        }
        go('pm-training');
        setTimeout((): any => { if ((window as any).PM && (window as any).PM.openCheckinFlow)
            (window as any).PM.openCheckinFlow(sessionId); }, 60);
        return;
    } if (next.startsWith('shared/')) {
        const id: any = next.slice(7);
        if (id === 'personnel') {
            home();
            return;
        }
        shared(id, id === 'roles' ? 'Roles & Abilities' : id === 'audit' ? 'Platform Audit Log' : id === 'branding' ? 'Agency Branding' : id === 'sso' ? 'Single Sign-On' : id === 'notices' ? 'Staff Notices' : 'Field Labels', 'Shared agency workspace');
        return;
    } home(); }
    function search(): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = '<div class="modal-head"><h3>Find records and workspaces</h3><button class="modal-close" id="searchClose" aria-label="Close search">×</button></div><div class="panel-body"><label for="suiteSearchInput">Name, badge, asset, vehicle, or case number</label><input id="suiteSearchInput" type="text" style="width:100%;margin-top:8px" autocomplete="off"></div><div class="search-results" id="suiteSearchResults"></div>';
        openModal();
        (document as any).getElementById('searchClose').onclick = closeModal;
        const field: any = (document as any).getElementById('suiteSearchInput');
        const run: any = (): any => {
            const q: any = field.value.trim().toLowerCase();
            const entries: any = [];
            for (const m of Object.values(modules()) as any)
                for (const n of m.NAV_ITEMS)
                    if (allowedView(n.id) && (!q || (n.title + ' ' + MODULE_META[metaFor(n.id).mod].name).toLowerCase().includes(q)))
                        entries.push({ title: n.title, sub: MODULE_META[metaFor(n.id).mod].name, action: (): any => go(n.id) } as any);
            if (q.length >= 2)
                for (const [kind, t] of Object.entries(recordTypes) as any) {
                    const mod: any = t[0];
                    if (!permits(mod, t[1]))
                        continue;
                    const list: any = STATE[mod === 'personnel' ? 'pm' : mod]?.[t[2]] || [];
                    for (const d of list) {
                        const id: any = ['person', 'operator', 'technician'].includes(kind) ? d.personId : d.id, r: any = { mod, kind, id } as any;
                        if (!recordAllowed(r))
                            continue;
                        const title: any = recordTitle(r);
                        const text: any = [title, d.assetId, d.serialNumber, d.vin, d.licensePlate, d.badgeNumber, d.employeeId, d.caseNumber].filter(Boolean).join(' ').toLowerCase();
                        if (text.includes(q))
                            entries.push({ title, sub: MODULE_META[mod].name + ' · ' + (d.assetId || d.badgeNumber || d.caseNumber || id), action: (): any => dispatchRecord(r) } as any);
                    }
                }
            const results: any = (document as any).getElementById('suiteSearchResults');
            results.innerHTML = '';
            for (const e of entries.slice(0, 40)) {
                const b: any = (document as any).createElement('button');
                b.className = 'search-result';
                b.innerHTML = esc(e.title) + '<small>' + esc(e.sub) + '</small>';
                b.onclick = (): any => { modalDirty = false; (document as any).getElementById('modalOverlay').classList.remove('open'); e.action(); };
                results.append(b);
            }
            if (!entries.length)
                results.innerHTML = '<div class="empty-state"><div class="msg">No matching records</div><div class="sub">Try another identifier or check your workspace permissions.</div></div>';
        };
        field.oninput = run;
        field.onkeydown = (e?: any): any => { if (e.key === 'ArrowDown') {
            e.preventDefault();
            (document as any).querySelector('.search-result')?.focus();
        } };
        run();
    }
    function associateLabels(root?: any): any { root.querySelectorAll('.form-row').forEach((row?: any): any => { const label: any = row.querySelector('label'), field: any = row.querySelector('input:not([type=hidden]),select,textarea'); if (label && field && !label.htmlFor && !label.contains(field)) {
        if (!field.id)
            field.id = 'suite-field-' + (++tableSequence);
        label.htmlFor = field.id;
    } }); root.querySelectorAll('button.modal-close').forEach((b?: any): any => b.setAttribute('aria-label', 'Close')); const title: any = root.querySelector('h3,h2'); if (title) {
        if (!title.id)
            title.id = 'suite-dialog-title-' + (++tableSequence);
        root.setAttribute('aria-labelledby', title.id);
    } }
    function filterLabel(control?: any): any { const raw: any = filterLabelRaw(control); return raw.charAt(0).toUpperCase() + raw.slice(1); }
    function filterLabelRaw(control?: any): any { const id: any = (control.id || '').replace(/Filter$/i, ''); const title: any = (control.title || '').trim(); let match: any = title.match(/filter(?:s)? (?:the )?.*? to a single ([^(]+?)(?:\s*\(|$)/i); if (match)
        return match[1].trim(); match = title.match(/filter(?:s)? the (.+?)(?: below)? as you type/i); if (match)
        return 'Search ' + match[1].trim(); if (/on or after|from date/i.test(title) || /(Date)?From$/i.test(id))
        return 'From date'; if (/on or before|to date/i.test(title) || /(Date)?To$/i.test(id))
        return 'To date'; if (/sort/i.test(id) || control.options?.[0]?.textContent.trim().startsWith('Sort:'))
        return 'Sort by'; if (/search|query|(^|_)q$/i.test(id) || control.placeholder?.toLowerCase().startsWith('search'))
        return 'Search records'; const terms: any = [['Personnel', 'Personnel'], ['Vehicle', 'Vehicle'], ['Aircraft|Drone', 'Aircraft'], ['K9', 'K9'], ['Agency', 'Agency'], ['Provider', 'Provider'], ['Course', 'Course'], ['Location|Court', 'Location'], ['Category', 'Category'], ['Mission', 'Mission type'], ['Phase', 'Lifecycle phase'], ['Type', 'Type'], ['Status', 'Status'], ['Unit', 'Unit'], ['Rank', 'Rank'], ['Year', 'Year'], ['Month', 'Month']]; for (const [pattern, label] of terms)
        if (new RegExp(pattern, 'i').test(id))
            return label; const first: any = control.options?.[0]?.textContent.trim().replace(/^(All|Any)\s+/i, ''); if (first && first !== 'All' && first !== 'Any')
        return first.replace(/s$/, ''); return 'Filter'; }
    function filterHelp(control?: any, label?: any): any { const title: any = (control.title || '').trim(); if (title)
        return /[.!?]$/.test(title) ? title : title + '.'; if (control.type === 'date')
        return label === 'From date' ? 'Sets the earliest date included.' : 'Sets the latest date included.'; if (control.matches('input'))
        return 'Searches the records shown below as you type.'; if (label === 'Sort by')
        return 'Changes the order of the records shown below.'; return 'Shows only records matching the selected ' + label.toLowerCase() + '.'; }
    function labelFilters(root: any = document as any): any {
        root.querySelectorAll('.filters').forEach((filters?: any): any => {
            [...filters.children].forEach((node?: any): any => {
                const direct: any = node.matches?.('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,.searchable-select-wrap');
                if (!direct || node.closest('.suite-filter-field'))
                    return;
                const source: any = node.matches('select,input') ? node : node.querySelector('select,input');
                if (!source)
                    return;
                const field: any = (document as any).createElement('div');
                field.className = 'suite-filter-field';
                const label: any = (document as any).createElement('span');
                label.className = 'suite-filter-label';
                label.textContent = filterLabel(source);
                label.id = 'suite-filter-label-' + (++tableSequence);
                const help: any = (document as any).createElement('small');
                help.className = 'suite-filter-help';
                help.textContent = filterHelp(source, label.textContent);
                help.id = 'suite-filter-help-' + (++tableSequence);
                // Moving a currently-focused element to a new parent (even just wrapping it in-place, as
                // below) silently drops its focus in every browser -- there's no way to move a node without
                // that side effect. Every filter input on every screen passes through here the moment a
                // fresh, not-yet-wrapped copy of it shows up in the DOM, which is exactly what happens on
                // every keystroke in a search box that re-renders its whole toolbar. Restoring focus and
                // cursor position immediately after the move is what makes that invisible to whoever's
                // typing, instead of silently ejecting them from the field they were just using.
                const wasFocused: any = (document as any).activeElement === source;
                const selStart: any = wasFocused && typeof source.selectionStart === 'number' ? source.selectionStart : null;
                const selEnd: any = wasFocused && typeof source.selectionEnd === 'number' ? source.selectionEnd : null;
                node.before(field);
                field.append(label, node, help);
                if (wasFocused) {
                    source.focus();
                    if (selStart !== null)
                        source.setSelectionRange(selStart, selEnd);
                }
            });
            filters.querySelectorAll('.suite-filter-field').forEach((field?: any): any => { const label: any = field.querySelector('.suite-filter-label'), help: any = field.querySelector('.suite-filter-help'), source: any = field.querySelector('select,input:not(.searchable-select-input)'), visible: any = field.querySelector('.searchable-select-input') || source; if (!label || !visible)
                return; visible.setAttribute('aria-labelledby', label.id); visible.setAttribute('aria-describedby', help.id); if (source && source !== visible) {
                source.setAttribute('aria-labelledby', label.id);
                source.setAttribute('aria-describedby', help.id);
            } });
        });
    }
    function enhance(): any {
        if (!CURRENT_USER_ID)
            return;
        associateLabels((document as any).getElementById('modalBox'));
        (document as any).querySelectorAll('.view.active .form-row').forEach((row?: any): any => associateLabels(row));
        labelFilters((document as any).querySelector('.view.active') || document as any);
        formatVisibleDates((document as any).querySelector('.view.active'));
        formatVisibleDates((document as any).getElementById('modalBox'));
        formatVisibleDates((document as any).getElementById('notifPanel'));
        (document as any).querySelectorAll('.navitem.active').forEach((n?: any): any => n.setAttribute('aria-current', 'page'));
        (document as any).querySelectorAll('th.sortable').forEach((th?: any): any => { if (th.dataset.keyboardWired)
            return; th.dataset.keyboardWired = '1'; th.tabIndex = 0; th.setAttribute('aria-sort', th.classList.contains('sort-active') ? (th.textContent.includes('▼') ? 'descending' : 'ascending') : 'none'); th.addEventListener('keydown', (e?: any): any => { if (['Enter', ' '].includes(e.key)) {
            e.preventDefault();
            th.click();
        } }); });
        (document as any).querySelectorAll('.civil-card,.photo-drop-zone,.role-list-item').forEach((el?: any): any => { if (el.dataset.keyboardWired)
            return; el.dataset.keyboardWired = '1'; el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('keydown', (e?: any): any => { if (e.target === el && ['Enter', ' '].includes(e.key)) {
            e.preventDefault();
            el.click();
        } }); });
        (document as any).querySelectorAll('.view.active table').forEach((table?: any): any => { if (table.dataset.enhanced)
            return; table.dataset.enhanced = '1'; const heads: any = [...table.querySelectorAll('thead th')]; if (!heads.length)
            return; table.querySelectorAll('tbody tr').forEach((tr?: any): any => [...tr.children].forEach((td?: any, i?: any): any => td.dataset.columnLabel = heads[i]?.textContent.trim() || (i === heads.length - 1 ? 'Actions' : ''))); table.classList.add('field-card-table'); if (heads.length < 4)
            return; const parent: any = table.parentElement; if (!parent)
            return; const row: any = (document as any).createElement('div'); row.className = 'table-preferences'; const ctrl: any = (document as any).createElement('details'); ctrl.className = 'column-control'; const summary: any = (document as any).createElement('summary'); summary.textContent = 'Columns'; summary.style.cursor = 'pointer'; ctrl.append(summary); const menu: any = (document as any).createElement('div'); menu.className = 'column-menu'; const key: any = 'columns.' + route + '.' + heads.map((h?: any): any => h.textContent.trim()).join('|'); const hidden: any = preferences.get(key, []); heads.forEach((h?: any, i?: any): any => { if (i === 0 || i === heads.length - 1)
            return; const apply: any = (hide?: any): any => { table.querySelectorAll('tr').forEach((tr?: any): any => { if (tr.children[i])
            tr.children[i].hidden = hide; }); }; apply(hidden.includes(i)); const label: any = (document as any).createElement('label'), check: any = (document as any).createElement('input'); check.type = 'checkbox'; check.checked = !hidden.includes(i); check.onchange = (): any => { apply(!check.checked); preferences.set(key, heads.map((_?: any, j?: any): any => j).filter((j?: any): any => table.querySelector('thead tr')?.children[j]?.hidden)); }; label.append(check, (document as any).createTextNode(h.textContent.trim() || 'Column ' + (i + 1))); menu.append(label); }); ctrl.append(menu); row.append(ctrl); parent.insertBefore(row, table); });
    }
    function roleUI(): any { const b: any = (document as any).getElementById('btnRoleSwitcher'); b.style.display = isAdmin() ? '' : 'none'; (document as any).getElementById('btnResetDemo').style.display = isAdmin() ? '' : 'none'; if (!isAdmin())
        STATE.currentRoleIds = [...assignedRoles()]; const strip: any = (document as any).getElementById('rolePreviewStrip'); if (strip) {
        strip.hidden = !previewing();
        strip.firstChild.textContent = 'Role preview: ' + currentRole().name + ' · ' + currentPerson().name + ' remains the signed-in user.';
    } }
    function dataSettings(): any { if (!isAdmin())
        return; const box: any = (document as any).getElementById('modalBox'); box.className = 'modal'; box.innerHTML = `<div class="modal-head"><h3>Data & connection</h3><button id="dataClose" class="modal-close">×</button></div><div class="modal-body"><p id="dataModeText"></p><p>Exports contain the records available in this application session. Store backups appropriately.</p><div class="quick-grid"><button class="btn btn-outline" id="exportSnapshot">Download data backup</button><button class="btn btn-outline" id="retrySync">Retry pending saves</button></div></div>`; openModal(); (document as any).getElementById('dataModeText').textContent = SuiteStore.description(); (document as any).getElementById('dataClose').onclick = closeModal; (document as any).getElementById('exportSnapshot').onclick = (): any => { const blob: any = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' } as any); const url: any = URL.createObjectURL(blob); const a: any = (document as any).createElement('a'); a.href = url; a.download = 'public-safety-backup-' + fmt(new Date() as any) + '.json'; a.click(); setTimeout((): any => URL.revokeObjectURL(url), 1000); }; (document as any).getElementById('retrySync').onclick = (): any => SuiteStore.flush(); }
    function init(): any {
        const skip: any = (document as any).createElement('a');
        skip.className = 'skip-link';
        skip.href = '#content';
        skip.textContent = 'Skip to workspace';
        (document as any).body.prepend(skip);
        (document as any).getElementById('content').tabIndex = -1;
        const profile: any = (document as any).createElement('div');
        profile.id = 'suiteProfile';
        profile.className = 'profile-menu';
        profile.hidden = true;
        profile.innerHTML = '<div class="profile-name" id="suiteProfileName"></div><button type="button" class="btn btn-outline" id="btnTextSizeToggle" style="display:flex;align-items:center;justify-content:space-between;"><span>Text Size <span id="textSizeCurrentLabel" style="color:var(--text-dim);font-weight:400;"></span></span><svg id="textSizeChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;transition:transform .15s;"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div id="textSizeSubmenu" style="display:none;padding:8px 6px 4px;"><div style="display:flex;gap:5px;" role="group" aria-label="Text size"><button type="button" class="text-zoom-btn" data-zoom="100" title="Normal">A</button><button type="button" class="text-zoom-btn" data-zoom="115" title="Large">A</button><button type="button" class="text-zoom-btn" data-zoom="130" title="Larger">A</button><button type="button" class="text-zoom-btn" data-zoom="150" title="Extra large">A</button><button type="button" class="text-zoom-btn" data-zoom="175" title="Maximum">A</button></div></div>';
        for (const id of ['btnChangePassword', 'btnResetDemo', 'btnLogout'])
            profile.append((document as any).getElementById(id));
        profile.append(button('Notifications', '', (): any => shared('notices', 'Staff Notices', 'Scheduling and staff messages'), 'btn btn-outline'));
        profile.append(button('Data & connection', '', dataSettings, 'btn btn-outline'));
        (document as any).getElementById('main').append(profile);
        profile.querySelectorAll('.text-zoom-btn').forEach((b?: any): any => b.addEventListener('click', (e?: any): any => { e.stopPropagation(); const pct: any = Number(b.dataset.zoom); applyTextZoom(pct); saveTextZoom(pct); }));
        const currentZoomPct: any = parseInt((document as any).documentElement.style.zoom) || 115;
        profile.querySelectorAll('.text-zoom-btn').forEach((b?: any): any => b.classList.toggle('active', Number(b.dataset.zoom) === currentZoomPct));
        updateTextSizeLabel();
        (document as any).getElementById('btnTextSizeToggle').addEventListener('click', (e?: any): any => { e.stopPropagation(); const sub: any = (document as any).getElementById('textSizeSubmenu'); const willOpen: any = sub.style.display === 'none'; sub.style.display = willOpen ? '' : 'none'; (document as any).getElementById('textSizeChevron').style.transform = willOpen ? 'rotate(180deg)' : 'rotate(0deg)'; });
        const toolbar: any = (document as any).querySelector('#topbar .role-switch');
        const find: any = button('Find records…', '', search, 'suite-search');
        find.innerHTML = '<span>Find records…</span><kbd>Ctrl K</kbd>';
        find.setAttribute('aria-label', 'Find records and workspaces');
        toolbar.prepend(find);
        const zone: any = (document as any).createElement('span');
        zone.className = 'user-timezone';
        zone.textContent = 'Times: ' + zoneShort();
        zone.title = 'Displayed times use your local time zone: ' + userTimeZone;
        find.after(zone);
        const profileToggleBtn: any = button('My profile', 'users', (): any => { (document as any).getElementById('suiteProfileName').textContent = currentPerson().name; profile.hidden = !profile.hidden; }, 'btn btn-outline btn-sm');
        toolbar.append(profileToggleBtn);
        // Any actual action inside this menu (Change Password, Reset Demo Data, Data & connection,
        // and the admin-only buttons appended later by addPlatformAdminButtons) should close the panel
        // the moment it's chosen, the same way Log Out already does -- otherwise it's left open behind
        // whatever modal or screen the choice just opened. The Text Size control is deliberately
        // excluded: someone adjusting text size is likely to try more than one size in a row, and
        // closing the panel after the first click would undo the point of it being a submenu.
        profile.addEventListener('click', (e?: any): any => { if (e.target.closest('#btnTextSizeToggle') || e.target.closest('#textSizeSubmenu'))
            return; if (e.target.closest('button'))
            profile.hidden = true; });
        const strip: any = (document as any).createElement('div');
        strip.className = 'preview-strip';
        strip.id = 'rolePreviewStrip';
        strip.hidden = true;
        strip.append((document as any).createElement('span'));
        strip.append(button('Exit preview', '', (): any => { STATE.currentRoleIds = [...assignedRoles()]; renderRoleSwitcher(); navigation(); home(); }, ''));
        (document as any).getElementById('topbar').after(strip);
        const save: any = (document as any).createElement('div');
        save.className = 'save-strip';
        save.id = 'saveWarning';
        save.hidden = true;
        save.innerHTML = '<span></span>';
        save.append(button('Download pending changes', '', (): any => SuiteStore.backupPending(), ''));
        save.append(button('Reload saved copy', '', (): any => SuiteStore.reload(), ''));
        const retryBtn: any = button('Retry', '', async (): Promise<any> => {
            if (SuiteStore.needsReloadBeforeRetry()) {
                toast('This needs a reload first -- use "Reload saved copy" instead. Retrying the same save again would only fail the same way.', true);
                return;
            }
            // A manual click has no cooldown of its own otherwise, and clicking this repeatedly while
            // a save looks stuck would start a brand new, completely unthrottled flush() attempt every
            // time -- bypassing the backoff/retry-cap protection entirely, since that protection only
            // paces the automatic retry chain, not fresh calls triggered from outside it. Disabling the
            // button for the duration of this attempt closes that gap.
            retryBtn.disabled = true;
            try {
                await SuiteStore.flush();
            }
            finally {
                retryBtn.disabled = false;
            }
        }, '');
        save.append(retryBtn);
        strip.after(save);
        const updateStrip: any = (document as any).createElement('div');
        updateStrip.className = 'update-strip';
        updateStrip.id = 'updateAvailableStrip';
        updateStrip.hidden = true;
        updateStrip.innerHTML = '<span>A newer version of this app is available. Reload this page (or close and reopen the app if it is installed) when you have a moment, to get the latest fixes.</span>';
        updateStrip.append(button('Reload now', '', (): any => location.reload(), ''));
        save.after(updateStrip);
        const overlay: any = (document as any).getElementById('modalOverlay');
        overlay.addEventListener('click', (e?: any): any => { if (e.target === overlay) {
            if (modalDirty) {
                toast('Use Save or Cancel to finish this form.');
                return;
            }
            closeModal(e);
        } });
        (document as any).addEventListener('input', (e?: any): any => { if (overlay.classList.contains('open') && e.target.closest('#modalBox') && !['suiteSearchInput', 'chatInput'].includes(e.target.id))
            modalDirty = true; });
        (document as any).addEventListener('change', (e?: any): any => { if (overlay.classList.contains('open') && e.target.closest('#modalBox'))
            modalDirty = true; });
        (document as any).addEventListener('keydown', (e?: any): any => { if (!CURRENT_USER_ID)
            return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (guard())
                search();
        } if (overlay.classList.contains('open')) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal(e);
            }
            if (e.key === 'Tab') {
                const f: any = [...(document as any).getElementById('modalBox').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter((x?: any): any => !x.hidden && x.getClientRects().length);
                if (!f.length) {
                    e.preventDefault();
                    (document as any).getElementById('modalBox').focus();
                }
                else if (e.shiftKey && (document as any).activeElement === f[0]) {
                    e.preventDefault();
                    f.at(-1).focus();
                }
                else if (!e.shiftKey && (document as any).activeElement === f.at(-1)) {
                    e.preventDefault();
                    f[0].focus();
                }
            }
        }
        else if (e.key === 'Escape') {
            profile.hidden = true;
            (document as any).getElementById('roleSwitcherPanel').style.display = 'none';
            (document as any).getElementById('notifPanel').style.display = 'none';
        } });
        (window as any).addEventListener('beforeunload', (e?: any): any => { if (modalDirty || SuiteStore.pending()) {
            e.preventDefault();
            e.returnValue = '';
        } });
        (window as any).addEventListener('popstate', (): any => { if (!CURRENT_USER_ID)
            return; if (!guard()) {
            history.pushState({} as any, '', '#/' + route);
            return;
        } modalDirty = false; restoring = true; navigate(location.hash.replace(/^#\//, '')); restoring = false; });
        (document as any).addEventListener('click', (e?: any): any => { if (!profile.contains(e.target) && !profileToggleBtn.contains(e.target))
            profile.hidden = true; const notifPanel: any = (document as any).getElementById('notifPanel'); const path: any = e.composedPath ? e.composedPath() : []; if (notifPanel && notifPanel.style.display !== 'none' && !path.includes(notifPanel) && !e.target.closest('#btnNotifBell'))
            notifPanel.style.display = 'none'; });
        uiObserver = new MutationObserver((): any => { if (observerQueued)
            return; observerQueued = true; queueMicrotask((): any => { observerQueued = false; uiObserver.disconnect(); SuiteUX.enhance(); uiObserver.observe((document as any).getElementById('content'), { childList: true, subtree: true } as any); }); });
        uiObserver.observe((document as any).getElementById('content'), { childList: true, subtree: true } as any);
    }
    return { init, openModal, closeModal, openRecord, beforeView, home, readinessView, workflowView, fieldTrainingView, navigation, go, visit, navigate, search, roleUI, isAdmin, previewing, recordAllowed, recordData, recordTypes, metaFor, allowedView, preferences, modules, tasks, dataSettings, guard, displayDate, displayInstant, displayOperationalTime, displayTimeOnly, normalizeDisplayText, userTimeZone, clearDirty: (): any => { modalDirty = false; }, hasDirty: (): any => modalDirty, lastViews, enhance } as any;
})();
