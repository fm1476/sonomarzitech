// Staff notices are persisted by dedicated RPCs, independently of SuiteStore.flush().
const StaffNotices: any = ((): any => {
    const context: any = (): any => SuiteStore.remoteContext();
    let attemptId: any = null, attemptSpec: any = null, lastUnread: any = -1, items: any = [], queuedOffer: any = null;
    const expandedNotices: any = new Set();
    // The signed-in membership identifies these built-in sender roles. The create RPC
    // remains the authority for every send, including configurable future roles.
    const canCompose: any = (): any => can('staff_notify_send') || (HOME_ROLE_IDS || []).some((id?: any): any => ['role_admin', 'role_platform_admin', 'role_supervisor'].includes(id));
    function withTimeout(promise?: any, ms?: any, message?: any): any {
        let timer: any;
        return Promise.race([promise, new Promise((_?: any, reject?: any): any => {
                timer = setTimeout((): any => reject(Error(message)), ms);
            })]).finally((): any => clearTimeout(timer));
    }
    function updateNavBadge(unread: any = lastUnread): any {
        const nav: any = (document as any).getElementById('staffNoticesNav'), count: any = (document as any).getElementById('staffNoticeCount');
        if (!nav || !count)
            return;
        const number: any = Math.max(0, unread);
        count.hidden = number === 0;
        count.textContent = number > 99 ? '99+' : String(number);
        nav.classList.toggle('has-unread', number > 0);
        nav.setAttribute('aria-label', number ? 'Staff Notices, ' + number + ' unread' : 'Staff Notices');
        nav.title = number ? number + ' unread staff notice' + (number === 1 ? '' : 's') : 'Staff Notices';
    }
    const selected: any = (selector?: any): any => [...(document as any).querySelectorAll(selector + ':checked')].map((x?: any): any => x.value);
    const activeAssignments: any = (onDate?: any): any => STATE.pm.scheduleAssignments.filter((a?: any): any => a.startDate <= onDate && (!a.endDate || a.endDate >= onDate));
    const recipients: any = (people?: any, units?: any, shifts?: any, onDate?: any): any => {
        const ids: any = new Set(people);
        for (const p of STATE.personnel)
            if (units.includes(p.unit))
                ids.add(p.id);
        for (const a of activeAssignments(onDate))
            if (shifts.includes(a.shiftId))
                ids.add(a.personId);
        return STATE.personnel.filter((p?: any): any => ids.has(p.id) && p.status !== 'Inactive');
    };
    function selection(): any {
        const people: any = selected('[data-notice-person]'), units: any = selected('[data-notice-unit]'), shifts: any = selected('[data-notice-shift]'), onDate: any = (document as any).getElementById('noticeDate').value;
        return { people, units, shifts, onDate, recipients: recipients(people, units, shifts, onDate) } as any;
    }
    function preview(): any {
        const box: any = (document as any).getElementById('noticePreview');
        if (!box)
            return;
        const s: any = selection();
        box.textContent = s.recipients.length ?
            `${s.recipients.length} selected: ${s.recipients.map((p?: any): any => p.name).join(', ')}. Only staff with an active app account will receive a notice.` :
            'Choose at least one person, unit, or shift pattern.';
    }
    async function loadInbox(): Promise<any> {

        if (SuiteStore.mode() !== 'shared')
            return [];
        const { tenantId, agencyId }: any = context();
        const { data, error }: any = await withTimeout(backendClient.rpc('suite_notify_inbox', { p_tenant: tenantId, p_agency: agencyId } as any), 12000, 'Notice inbox timed out. Tap Refresh to try again.');
        if (error)
            throw error;
        items = data || [];
        const unread: any = items.filter((n?: any): any => !n.read_at).length;
        let badge: any = (document as any).getElementById('staffNoticeBadge');
        if (!badge) {
            badge = (document as any).createElement('button');
            badge.id = 'staffNoticeBadge';
            badge.type = 'button';
            badge.className = 'btn btn-primary';
            badge.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:80;box-shadow:0 8px 24px #0005';
            badge.onclick = (): any => SuiteUX.navigate('shared/notices');
            (document as any).body.append(badge);
        }
        badge.hidden = unread === 0 || !CURRENT_USER_ID;
        badge.textContent = `Notices · ${unread} new`;
        if (lastUnread >= 0 && unread > lastUnread && (document as any).visibilityState === 'visible')
            toast(`${unread} unread staff notice${unread === 1 ? '' : 's'}.`);
        lastUnread = unread;
        updateNavBadge(unread);
        if ((document as any).getElementById('noticeInbox'))
            drawInbox();
        return items;
    }
    function drawInbox(): any {
        const root: any = (document as any).getElementById('noticeInbox');
        if (!root)
            return;
        root.replaceChildren();
        if (!items.length) {
            root.textContent = 'No staff notices yet.';
            return;
        }
        for (const item of items) {
            const row: any = (document as any).createElement('details');
            row.className = 'panel-body';
            row.style.cssText = 'border-bottom:1px solid var(--border);padding:12px 16px';
            row.open = expandedNotices.has(item.id) || !item.read_at;
            const summary: any = (document as any).createElement('summary');
            summary.style.cssText = 'cursor:pointer;display:list-item;padding:4px 0';
            const status: any = (document as any).createElement('strong');
            status.textContent = item.response ?
                `Responded: ${item.response}` : (item.read_at ? 'Read' : 'New');
            const label: any = (document as any).createElement('span');
            label.textContent = ` · ${(new Date(item.created_at) as any).toLocaleString()} · ${item.body.replace(/\s+/g, ' ').slice(0, 90)}${item.body.length > 90 ? '…' : ''}`;
            summary.append(status, label);
            row.append(summary);
            const body: any = (document as any).createElement('p');
            body.textContent = item.body;
            body.style.whiteSpace = 'pre-wrap';
            row.append(body);
            row.addEventListener('toggle', (): any => {
                if (row.open) {
                    expandedNotices.add(item.id);
                    if (!item.read_at)
                        respond(item.id, 'read', false).catch(console.error);
                }
                else
                    expandedNotices.delete(item.id);
            });
            const actions: any = (document as any).createElement('div');
            actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
            for (const [value, label] of [['acknowledged', 'Acknowledge'], ['interested', 'Interested'], ['declined', 'Decline']]) {
                const button: any = (document as any).createElement('button');
                button.type = 'button';
                button.className = 'btn btn-outline btn-sm';
                button.textContent = label;
                button.disabled = item.response === value;
                button.onclick = (): any => respond(item.id, value, true);
                actions.append(button);
            }
            if (item.response) {
                const clear: any = (document as any).createElement('button');
                clear.type = 'button';
                clear.className = 'btn btn-outline btn-sm';
                clear.textContent = 'Clear from my notices';
                clear.onclick = async (): Promise<any> => {
                    clear.disabled = true;
                    try {
                        const { error }: any = await withTimeout(backendClient.rpc('suite_notify_clear', { p_notice: item.id } as any), 12000, 'Clear timed out. Refresh and try again.');
                        if (error)
                            throw error;
                        expandedNotices.delete(item.id);
                        await loadInbox();
                        toast('Notice cleared from your list.');
                    }
                    catch (error: any) {
                        toast(error.message, true);
                        clear.disabled = false;
                    }
                };
                actions.append(clear);
            }
            row.append(actions);
            root.append(row);
        }
    }
    async function respond(id?: any, value?: any, redraw?: any): Promise<any> {
        const { data, error }: any = await backendClient.rpc('suite_notify_respond', { p_notice: id, p_response: value } as any);
        if (error) {
            toast(error.message, true);
            return;
        }
        const item: any = items.find((n?: any): any => n.id === id);
        if (item) {
            item.read_at = data.read_at;
            item.response = data.response;
        }
        if (redraw) {
            await loadInbox();
            toast(value === 'interested' ? 'Interest recorded. A supervisor must still assign the shift.' : 'Response recorded.');
        }
        else {
            lastUnread = items.filter((n?: any): any => !n.read_at).length;
            const badge: any = (document as any).getElementById('staffNoticeBadge');
            if (badge) {
                badge.hidden = lastUnread === 0;
                badge.textContent = `Notices · ${lastUnread} new`;
            }
            updateNavBadge(lastUnread);
        }
    }
    async function loadHistory(): Promise<any> {
        const box: any = (document as any).getElementById('noticeHistory');
        if (!box)
            return;
        const { tenantId, agencyId }: any = context();
        const { data, error }: any = await withTimeout(backendClient.rpc('suite_notify_history', { p_tenant: tenantId, p_agency: agencyId } as any), 12000, 'Recent notices timed out. Tap Refresh to try again.');
        box.replaceChildren();
        if (error) {
            box.textContent = error.message;
            return;
        }
        if (!data?.length) {
            box.textContent = 'No notices sent yet.';
            return;
        }
        for (const n of data) {
            const row: any = (document as any).createElement('div');
            row.className = 'panel-body';
            row.style.borderBottom = '1px solid var(--border)';
            const summary: any = (document as any).createElement('strong');
            summary.textContent =
                `${(new Date(n.created_at) as any).toLocaleString()} · ${n.recipients} recipients · ${n.read_count} read · ${n.interested} interested · ${n.declined} declined · ${n.pushed} push accepted`;
            const body: any = (document as any).createElement('p');
            body.textContent = n.body;
            const detail: any = (document as any).createElement('div');
            const button: any = (document as any).createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline btn-sm';
            button.textContent = 'View recipients and responses';
            button.onclick = async (): Promise<any> => {
                if (detail.childNodes.length) {
                    detail.replaceChildren();
                    return;
                }
                button.disabled = true;
                const { data, error }: any = await backendClient.rpc('suite_notify_responses', { p_notice: n.id } as any);
                button.disabled = false;
                if (error) {
                    toast(error.message, true);
                    return;
                }
                for (const recipient of data || []) {
                    const line: any = (document as any).createElement('p');
                    line.textContent = `${recipient.name}: ${recipient.response || (recipient.read_at ? 'Read, no response' : 'Unread')} · Push ${recipient.push_status.replace('_', ' ')}`;
                    detail.append(line);
                }
            };
            row.append(summary, body, button, detail);
            box.append(row);
        }
    }
    async function pushState(): Promise<any> {
        const box: any = (document as any).getElementById('pushState');
        if (!box)
            return;
        if (!('serviceWorker' in (navigator as any)) || !('PushManager' in (window as any)) || !('Notification' in (window as any))) {
            box.textContent = 'This browser does not support web push. In-app notices still work.';
            return;
        }
        if (/iPhone|iPad|iPod/i.test((navigator as any).userAgent) &&
            !(window as any).matchMedia('(display-mode: standalone)').matches && !(navigator as any).standalone) {
            box.textContent = 'On iPhone: use Share → Add to Home Screen, then open SonoMarzi from its new icon to enable push.';
            return;
        }
        const reg: any = await (navigator as any).serviceWorker.getRegistration();
        const subscription: any = await reg?.pushManager.getSubscription();
        const { tenantId, agencyId }: any = context();
        let enabled: any = false;
        if (subscription && SuiteStore.mode() === 'shared') {
            const { data, error }: any = await backendClient.rpc('suite_notify_device_enabled', {
                p_endpoint: subscription.endpoint, p_tenant: tenantId, p_agency: agencyId
            } as any);
            if (error)
                throw error;
            enabled = !!data;
        }
        box.textContent = enabled ? 'Push is enabled for this agency on this device.' :
            'Push is off for this agency on this device. In-app notices still work.';
        const on: any = (document as any).getElementById('pushEnable'), off: any = (document as any).getElementById('pushDisable');
        if (on)
            on.disabled = enabled;
        if (off)
            off.disabled = !enabled;
    }
    async function enablePush(): Promise<any> {
        if (SuiteStore.mode() !== 'shared')
            return toast('Sign in to your agency first.', true);
        const box: any = (document as any).getElementById('pushState');
        try {
            if (!('serviceWorker' in (navigator as any)) || !('PushManager' in (window as any)) || !('Notification' in (window as any)))
                throw Error('Push is not supported by this browser.');
            if (/iPhone|iPad|iPod/i.test((navigator as any).userAgent) &&
                !(window as any).matchMedia('(display-mode: standalone)').matches && !(navigator as any).standalone)
                throw Error('Add SonoMarzi to your Home Screen, then open it from its icon.');
            const permission: any = await Notification.requestPermission();
            if (permission !== 'granted')
                throw Error('Notifications were not allowed. You can change this in your device settings.');
            await (navigator as any).serviceWorker.register('sw.js');
            const ready: any = await (navigator as any).serviceWorker.ready;
            const { data: key, error: keyError }: any = await backendClient.rpc('suite_notify_push_key');
            if (keyError || !key)
                throw Error(keyError?.message || 'Push is not configured.');
            const bytes: any = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c?: any): any => c.charCodeAt(0));
            let subscription: any = await ready.pushManager.getSubscription();
            if (!subscription)
                subscription = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes } as any);
            const json: any = subscription.toJSON(), { tenantId, agencyId }: any = context();
            const { error }: any = await backendClient.rpc('suite_notify_subscribe', {
                p_tenant: tenantId, p_agency: agencyId, p_endpoint: subscription.endpoint,
                p_p256dh: json.keys.p256dh, p_auth: json.keys.auth
            } as any);
            if (error)
                throw error;
            if (box)
                box.textContent = 'Push is enabled on this device.';
            toast('Push notifications enabled.');
            await pushState();
        }
        catch (error: any) {
            if (box)
                box.textContent = error.message;
            toast(error.message, true);
        }
    }
    async function disablePush(): Promise<any> {
        try {
            const reg: any = await (navigator as any).serviceWorker.getRegistration();
            const sub: any = await reg?.pushManager.getSubscription();
            if (sub) {
                const { error }: any = await backendClient.rpc('suite_notify_unsubscribe', { p_endpoint: sub.endpoint } as any);
                if (error)
                    throw error;
                await sub.unsubscribe();
            }
            await pushState();
            toast('Push disabled on this device.');
        }
        catch (error: any) {
            toast(error.message, true);
        }
    }
    async function beforeSignOut(): Promise<any> {
        // Clear this browser's subscription so a subsequent user on a shared device cannot see it.
        try {
            const reg: any = await (navigator as any).serviceWorker.getRegistration();
            const sub: any = await reg?.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                await Promise.race([
                    backendClient.rpc('suite_notify_unsubscribe', { p_endpoint: sub.endpoint } as any),
                    new Promise((resolve?: any): any => setTimeout(resolve, 1500)),
                ]);
            }
        }
        catch (error: any) {
            console.warn('Could not clear device push subscription', error);
        }
        (document as any).getElementById('staffNoticeBadge')?.remove();
        items = [];
        expandedNotices.clear();
        lastUnread = -1;
        updateNavBadge(0);
    }
    function render(): any {
        if (SuiteStore.mode() !== 'shared') {
            toast('Agency sign-in is required for staff notices.', true);
            return;
        }
        const root: any = (document as any).getElementById('view-notices');
        if (!root)
            return;
        try {
            const canSend: any = canCompose();
            const personnel: any = STATE.personnel.filter((p?: any): any => p.status !== 'Inactive').sort((a?: any, b?: any): any => a.name.localeCompare(b.name));
            const units: any = [...new Set(personnel.map((p?: any): any => p.unit).filter(Boolean))].sort();
            const today: any = fmt(new Date() as any);
            const shifts: any = STATE.pm.scheduleShifts.filter((s?: any): any => !s.endDate || s.endDate >= today);
            root.innerHTML = `<section class="panel"><div class="panel-head"><h2>My notices</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${canSend ? '<button type="button" id="noticeComposeJump" class="btn btn-primary btn-sm">Send staff notice</button>' : ''}<button type="button" id="noticeRefresh" class="btn btn-outline btn-sm">Refresh</button></div></div>
      <div id="noticeInbox" aria-live="polite" class="panel-body">Loading…</div></section>
      <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Phone notifications</h2></div><div class="panel-body">
        <p>Push is optional for each device. In-app notices arrive whenever you sign in, regardless of push settings.</p>
        <p id="pushState" role="status">Checking device…</p>
        <button type="button" id="pushEnable" class="btn btn-primary">Enable push on this device</button>
        <button type="button" id="pushDisable" class="btn btn-outline">Disable push on this device</button>
      </div></section>
      ${canSend ? `<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Send staff notice</h2></div><div class="panel-body">
       <p>Choose individuals, units, or shift patterns. Each signed-in member receives one notice.</p>
       <div class="form-row"><label for="noticeBody">Message</label><textarea id="noticeBody" rows="4" maxlength="1000" placeholder="Coverage is needed for…"></textarea><small id="noticeCount">0 / 1000 characters</small></div>
       <div class="form-row"><label for="noticeDate">Shift assignment date</label><input type="date" id="noticeDate" value="${fmt(new Date() as any)}"><small>Used when targeting a shift pattern.</small></div>
       <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px">
        <fieldset><legend>Individuals</legend><input type="search" id="noticeSearch" placeholder="Find staff" aria-label="Find staff" style="width:100%;margin-bottom:8px"><div id="noticePeople" style="max-height:220px;overflow:auto">${personnel.map((p?: any): any => `<label style="display:block"><input type="checkbox" data-notice-person value="${escapeHtml(p.id)}"> ${escapeHtml(p.name)}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Units</legend><div style="max-height:220px;overflow:auto">${units.map((u?: any): any => `<label style="display:block"><input type="checkbox" data-notice-unit value="${escapeHtml(u)}"> ${escapeHtml(u)}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Shift patterns</legend><div style="max-height:220px;overflow:auto">${shifts.map((s?: any): any => `<label style="display:block"><input type="checkbox" data-notice-shift value="${escapeHtml(s.id)}"> ${escapeHtml(s.name)}</label>`).join('')}</div></fieldset>
       </div><p id="noticePreview" role="status"></p>
       <button type="button" id="noticeSend" class="btn btn-primary">Send notice</button>
       <p id="noticeResult" role="status"></p>
      </div></section><section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Recent notices</h2><button type="button" id="noticeHistoryRefresh" class="btn btn-outline btn-sm">Refresh</button></div><div id="noticeHistory" class="panel-body">Loading…</div></section>` : ''}`;
            root.querySelector('#noticeRefresh').onclick = (): any => loadInbox().catch((e?: any): any => toast(e.message, true));
            root.querySelector('#pushEnable').onclick = enablePush;
            root.querySelector('#pushDisable').onclick = disablePush;
            pushState().catch((e?: any): any => { (document as any).getElementById('pushState').textContent = e.message; });
            loadInbox().catch((e?: any): any => { (document as any).getElementById('noticeInbox').textContent = e.message; });
            if (canSend) {
                root.querySelector('#noticeComposeJump').onclick = (): any => { root.querySelector('#noticeBody').scrollIntoView({ behavior: 'smooth', block: 'center' } as any); root.querySelector('#noticeBody').focus({ preventScroll: true } as any); };
                root.querySelectorAll('input[type="checkbox"],#noticeDate').forEach((x?: any): any => x.addEventListener('change', preview));
                root.querySelector('#noticeSearch').oninput = (e?: any): any => { const q: any = e.target.value.toLowerCase(); root.querySelectorAll('#noticePeople label').forEach((l?: any): any => l.hidden = !l.textContent.toLowerCase().includes(q)); };
                root.querySelector('#noticeBody').oninput = (e?: any): any => root.querySelector('#noticeCount').textContent = `${e.target.value.length} / 1000 characters`;
                root.querySelector('#noticeSend').onclick = send;
                root.querySelector('#noticeHistoryRefresh').onclick = (): any => loadHistory().catch((e?: any): any => { const box: any = (document as any).getElementById('noticeHistory'); if (box)
                    box.textContent = e.message; });
                if (queuedOffer) {
                    const { people, shift, date }: any = queuedOffer;
                    queuedOffer = null;
                    root.querySelector('#noticeDate').value = date;
                    root.querySelector('#noticeBody').value = `${STATE.agencyBranding?.title || 'Agency'}: Overtime coverage is available for ${shift.name} on ${SuiteUX.displayDate(date)}. Open this notice and select Interested if you are available. A supervisor must confirm the assignment.`;
                    root.querySelector('#noticeCount').textContent = `${root.querySelector('#noticeBody').value.length} / 1000 characters`;
                    for (const id of people) {
                        const box: any = [...root.querySelectorAll('[data-notice-person]')].find((x?: any): any => x.value === id);
                        if (box)
                            box.checked = true;
                    }
                }
                preview();
                loadHistory().catch((e?: any): any => { const box: any = (document as any).getElementById('noticeHistory'); if (box)
                    box.textContent = e.message; });
            }
        }
        catch (error: any) {
            console.error('Staff notices could not render', error);
            root.innerHTML = `<section class="panel"><div class="panel-body" role="alert">Staff notices could not open: ${escapeHtml(error.message || 'Unknown error')}</div></section>`;
        }
    }
    async function send(): Promise<any> {
        const body: any = (document as any).getElementById('noticeBody').value.trim(), s: any = selection(), out: any = (document as any).getElementById('noticeResult');
        if (!body || body.length > 1000 || !s.recipients.length) {
            out.textContent = 'Enter a message and choose recipients.';
            return;
        }
        if (!confirm(`Send an in-app notice to up to ${s.recipients.length} staff members? Push will be attempted for devices that enabled it.`))
            return;
        const spec: any = JSON.stringify([body, s.people, s.units, s.shifts, s.onDate]);
        if (attemptId && attemptSpec !== spec && !confirm('Check the recent notices before starting a different request. Continue?'))
            return;
        if (attemptSpec !== spec) {
            attemptId = crypto.randomUUID();
            attemptSpec = spec;
        }
        const button: any = (document as any).getElementById('noticeSend');
        button.disabled = true;
        out.textContent = 'Saving notice…';
        const { tenantId, agencyId }: any = context();
        try {
            const { data, error }: any = await withTimeout(backendClient.rpc('suite_notify_create', { p_tenant: tenantId, p_agency: agencyId, p_body: body,
                p_people: s.people, p_units: s.units, p_shifts: s.shifts, p_on_date: s.onDate, p_client_id: attemptId } as any), 15000, 'Save status is unknown. Check Recent notices, then retry this same message if needed.');
            if (error)
                throw error;
            // A durable result ends the save. Refresh and optional push must never keep the send locked.
            attemptId = null;
            attemptSpec = null;
            out.textContent = data.recipients ? `Saved for ${data.recipients} signed-in staff. Sending optional push…` :
                'No selected staff had an active app account. No notice was delivered.';
            loadHistory().catch((e?: any): any => console.warn('Notice history refresh failed', e));
            loadInbox().catch((e?: any): any => console.warn('Notice inbox refresh failed', e));
            if (data.recipients) {
                try {
                    const dispatch: any = await withTimeout(backendClient.functions.invoke('staff-notify', { body: { noticeId: data.id } as any } as any), 12000, 'Push request timed out');
                    if (dispatch.error)
                        throw dispatch.error;
                    const result: any = dispatch.data;
                    out.textContent = result ? `Saved for ${data.recipients} staff. Push accepted for ${result.submitted ?? 0}, no push device for ${result.noDevice ?? 0}, failed for ${result.failed ?? 0}. Acceptance does not prove delivery.` :
                        `Saved for ${data.recipients} staff. Push response had no delivery counts. Staff can open the app to review the notice.`;
                }
                catch (error: any) {
                    out.textContent = error?.status === 503 ?
                        `Saved for ${data.recipients} staff in the app. Push delivery is not configured.` :
                        `Saved for ${data.recipients} staff. Push could not be confirmed. Staff can open the app to review the notice.`;
                }
            }
        }
        catch (error: any) {
            out.textContent = error.message || 'The notice could not be saved. Retry uses the same request ID.';
            toast(out.textContent, true);
        }
        finally {
            button.disabled = false;
        }
    }
    function offer(people?: any, shift?: any, date?: any): any {
        queuedOffer = { people, shift, date } as any;
        closeModal();
        SuiteUX.navigate('shared/notices');
    }
    setInterval((): any => {
        if (SuiteStore.mode() === 'shared' && CURRENT_USER_ID && (document as any).visibilityState === 'visible')
            loadInbox().catch((e?: any): any => console.warn('Notice refresh failed', e));
    }, 60000);
    (document as any).addEventListener('visibilitychange', (): any => {
        if ((document as any).visibilityState === 'visible' && SuiteStore.mode() === 'shared' && CURRENT_USER_ID)
            loadInbox().catch((): any => { });
    });
    return { render, offer, enablePush, disablePush, beforeSignOut, loadInbox, updateNavBadge, canCompose } as any;
})();
