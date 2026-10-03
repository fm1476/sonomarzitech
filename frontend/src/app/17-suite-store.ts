/* Record storage: local IndexedDB transactions plus optional authenticated server RPC.
   No writes are made to the legacy all-in-one app_state row. */
const SuiteStore: any = ((): any => {
    (window as any).SONOMARZI_AWS_DEV = true;
    const AWS_DEV: any = {
        apiBase: (window as any).SonoMarziConfig.apiBase,
        tokenKey: 'sonomarzi.aws.id_token',
        tenantId: sessionStorage.getItem('sonomarzi.workspace.tenant') || '',
        agencyId: sessionStorage.getItem('sonomarzi.workspace.agency') || ''
    } as any;
    function awsToken(): any {
        return sessionStorage.getItem(AWS_DEV.tokenKey);
    }
    async function awsJson(path?: any, options: any = {} as any): Promise<any> {
        const token: any = awsToken();
        if (!token)
            throw Error('AWS Cognito session is not available.');
        const controller: any = new AbortController();
        const timer: any = setTimeout((): any => controller.abort(), 15000);
        try {
            const res: any = await fetch(`${AWS_DEV.apiBase}${path}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(options.body ? { 'Content-Type': 'application/json' } as any : {} as any),
                    ...(options.headers || {} as any)
                } as any
            } as any);
            const text: any = await res.text();
            let body: any = null;
            try {
                body = text ? JSON.parse(text) : null;
            }
            catch {
                body = { raw: text } as any;
            }
            if (!res.ok) {
                const error: any = Error(body?.error || body?.message || `AWS request failed (${res.status}).`);
                error.status = res.status;
                error.code = body?.code || String(res.status);
                throw error;
            }
            return body;
        }
        catch (error: any) {
            if (error?.name === 'AbortError')
                throw Error('AWS request timed out after 15 seconds.');
            throw error;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async function remoteRpc(name?: any, args: any = {} as any): Promise<any> {
        if (name === 'suite_load_workspace') {
            try {
                const tenantId: any = args?.p_tenant_id || AWS_DEV.tenantId;
                const agencyId: any = args?.p_agency_id || AWS_DEV.agencyId;
                const data: any = await awsJson(tenantId && agencyId ? `/workspace?tenantId=${encodeURIComponent(tenantId)}&agencyId=${encodeURIComponent(agencyId)}` : '/workspace');
                return { data, error: null } as any;
            }
            catch (error: any) {
                return { data: null, error } as any;
            }
        }
        if (name === 'suite_apply_changes') {
            let badge: any = (document as any).getElementById('awsSaveBackendBadge');
            if (!badge) {
                badge = (document as any).createElement('div');
                badge.id = 'awsSaveBackendBadge';
                badge.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483645;background:#111827;color:#fff;border:1px solid #64748b;border-radius:8px;padding:8px 10px;font:700 11px/1.25 system-ui;max-width:320px';
                (document as any).body.appendChild(badge);
            }
            badge.textContent = 'Saving changes…';
            try {
                const data: any = await awsJson('/apply-changes', {
                    method: 'POST',
                    body: JSON.stringify({
                        tenant_id: args?.p_tenant_id || AWS_DEV.tenantId,
                        agency_id: args?.p_agency_id || AWS_DEV.agencyId,
                        changes: args?.p_changes || []
                    } as any)
                } as any);
                badge.textContent = 'Changes saved';
                return { data, error: null } as any;
            }
            catch (error: any) {
                badge.textContent = 'Save failed: ' + (error?.message || String(error));
                return { data: null, error } as any;
            }
        }
        // Do not silently fall back to Supabase from the core AWS transport.
        return { data: null, error: Error(`This feature is not yet migrated to AWS: ${name}`) } as any;
    }
    let db: any = null, baseline: any = new Map(), saving: any = false, pendingWrites: any = false, serverReady: any = false, serverVersions: any = {} as any, serverOrders: any = new Map(), notificationReads: any = new Set(), debounce: any = null, saveAgain: any = false, waiters: any = [], consecutiveFailures: any = 0, lastErrorWasVersionConflict: any = false, sessionEpoch: any = 0;
    async function resolveSpuriousConflict(batch?: any): Promise<any> {
        // A 40001 here means the server's current version for these rows doesn't match what this tab
        // last read. That is sometimes a REAL conflict (someone else's edit this tab hasn't seen yet),
        // but just as often it is not: the same idempotent login-time healing running twice, the same
        // account open in a second tab or device, a retried request landing twice, anything where the
        // version number moved but the actual data didn't end up any different from what this tab
        // wants. The only reliable way to tell those apart is to check the server's CURRENT value: if
        // it already matches what this tab was trying to write, for every row in this batch, nothing is
        // lost by moving on, so adopt the server's version numbers and continue instead of alarming the
        // person about a write that was already redundant. If even one row's current server value
        // genuinely differs from what this tab intended, this returns false and the caller falls
        // through to the normal conflict handling below, so no one's actual, different work is ever
        // silently discarded.
        const { data, error }: any = await remoteRpc('suite_load_workspace', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId } as any);
        if (error)
            throw error;
        const byKey: any = new Map((data.records || []).map((r?: any): any => [r.key, r]));
        for (const p of batch) {
            const row: any = byKey.get(p.key);
            const rowDeleted: any = !row || row.deleted;
            if (p.deleted) {
                if (!rowDeleted)
                    return false;
            }
            else {
                if (rowDeleted || !equal(row.value, p.value))
                    return false;
            }
        }
        for (const p of batch) {
            const row: any = byKey.get(p.key);
            if (!row)
                continue;
            serverVersions[p.key] = row.version;
            if (JSON.parse(p.key)[1] === '$order' && !row.deleted)
                serverOrders.set(p.key, clone(row.value));
            if (p.deleted)
                baseline.delete(p.key);
            else
                baseline.set(p.key, clone(row.value));
        }
        return true;
    }
    let mode: any = 'local', remoteContext: any = { tenantId: null, agencyId: null } as any;
    const clone: any = (v?: any): any => JSON.parse(JSON.stringify(v));
    function flatten(state?: any): any {
        const result: any = new Map();
        function add(path?: any, value?: any): any {
            if (path.length === 2 && path[1] === 'notifications') return;
            // v14 upgrades add empty optional collections in memory; never send them as
            // unrelated writes unless a server record already exists for this key.
            if (Array.isArray(value) && value.length === 0 && path.length === 2 &&
                ['leaveRequests', 'scheduleExceptions', 'shiftSwapRequests'].includes(path[1]) &&
                !serverVersions[JSON.stringify([path, path[1] === 'leaveRequests' ? '$order' : '$value'])]) return;
            const selfService: any = path[0] === 'pm' && ['trainingCheckins', 'leaveRequests'].includes(path[1]); const hasRecords: any = Array.isArray(value) && (selfService || value.length && value.every((x?: any): any => x && typeof x === 'object' && (x.id || x.personId))); const idFor: any = (x?: any): any => String(x.id || x.personId); if (hasRecords && new Set(value.map(idFor)).size === value.length) {
            result.set(JSON.stringify([path, '$order']), value.map(idFor));
            value.forEach((x?: any): any => result.set(JSON.stringify([path, idFor(x)]), x));
        }
        else
            result.set(JSON.stringify([path, '$value']), value); }
        (Object.entries(state) as any).forEach(([key, value]: any): any => { if (['currentRoleIds', 'currentRoleId', 'accounts', 'auditLog', 'serverAudit', 'ft', 'workflows', 'notices', 'notificationReads'].includes(key))
            return; if (['qm', 'fleet', 'pm', 'k9', 'drone', 'eod', 'subpoena', 'grants', 'civil'].includes(key) && value && typeof value === 'object')
            (Object.entries(value) as any).forEach(([k, v]: any): any => add([key, k], v));
        else
            add([key], value); });
        return new Map([...result].map(([k, v]: any): any => [k, clone(v)]));
    }
    function inflate(map?: any): any { const state: any = {} as any, groups: any = new Map(); for (const [key, value] of map) {
        const [path, id]: any = JSON.parse(key), p: any = JSON.stringify(path);
        if (!groups.has(p))
            groups.set(p, { path, items: new Map() } as any);
        groups.get(p).items.set(id, value);
    } for (const { path, items } of groups.values()) {
        let target: any = state;
        for (const p of path.slice(0, -1))
            target = target[p] || (target[p] = {} as any);
        target[path.at(-1)] = items.has('$value') ? clone(items.get('$value')) : (items.get('$order') || [...items.keys()]).filter((id?: any): any => items.has(id) && !id.startsWith('$')).map((id?: any): any => clone(items.get(id)));
    } return state; }
    function mergeTemplate(base?: any, data?: any): any { if (Array.isArray(data))
        return data; if (!data || typeof data !== 'object')
        return data; const out: any = { ...base } as any; for (const [k, v] of Object.entries(data) as any)
        out[k] = mergeTemplate(base?.[k], v); return out; }
    function equal(a?: any, b?: any): any {
        if (Object.is(a, b))
            return true;
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
            return false;
        if (Array.isArray(a) !== Array.isArray(b))
            return false;
        if (Array.isArray(a))
            return a.length === b.length && a.every((value?: any, i?: any): any => equal(value, b[i]));
        const keys: any = Object.keys(a) as any, other: any = Object.keys(b) as any;
        return keys.length === other.length && keys.every((key?: any): any => Object.prototype.hasOwnProperty.call(b, key) && equal(a[key], b[key]));
    }
    function changes(before?: any, after?: any): any { const out: any = []; for (const key of new Set([...before.keys(), ...after.keys()]))
        if (!equal(before.get(key), after.get(key)))
            out.push({ key, value: after.has(key) ? after.get(key) : null, deleted: !after.has(key), expected: before.has(key) ? before.get(key) : null, existed: before.has(key) } as any); return out; }
    function selfServiceOrder(p?: any): any {
        const [path, id]: any = JSON.parse(p.key);
        return id === '$order' && path[0] === 'pm' && ['trainingCheckins', 'leaveRequests'].includes(path[1]);
    }
    function mergeSharedOrder(p?: any): any {
        const before: any = Array.isArray(p.expected) ? p.expected : [];
        const after: any = Array.isArray(p.value) ? p.value : [];
        const remote: any = serverOrders.get(p.key) || [];
        const removed: any = new Set(before.filter((id?: any): any => !after.includes(id)));
        return [...remote.filter((id?: any): any => !removed.has(id)), ...after.filter((id?: any): any => !remote.includes(id))];
    }
    function status(type?: any, message?: any): any { const el: any = (document as any).getElementById('syncStatus'); el.textContent = message; el.style.color = type === 'error' ? 'var(--red)' : type === 'saving' ? 'var(--gold)' : 'var(--text-dim)'; el.setAttribute('role', 'status'); const strip: any = (document as any).getElementById('saveWarning'); if (strip) {
        strip.hidden = type !== 'error';
        strip.firstChild.textContent = message;
    } }
    function openDb(): any { return new Promise((resolve?: any, reject?: any): any => { if (!(window as any).indexedDB) {
        reject(Error('Durable local storage is unavailable.'));
        return;
    } const req: any = indexedDB.open('PublicSafetySuite.v2', 1); req.onupgradeneeded = (): any => { req.result.createObjectStore('records', { keyPath: 'key' } as any); req.result.createObjectStore('meta', { keyPath: 'key' } as any); }; req.onsuccess = (): any => { db = req.result; resolve(db); }; req.onerror = (): any => reject(req.error); }); }
    function readAll(): any { return new Promise((resolve?: any, reject?: any): any => { const req: any = db.transaction('records').objectStore('records').getAll(); req.onsuccess = (): any => resolve(new Map(req.result.map((r?: any): any => [r.key, r.value]))); req.onerror = (): any => reject(req.error); }); }
    function transaction(patches?: any): any { return new Promise((resolve?: any, reject?: any): any => { const tx: any = db.transaction('records', 'readwrite'), store: any = tx.objectStore('records'); let conflict: any = null; for (const p of patches) {
        const req: any = store.get(p.key);
        req.onsuccess = (): any => { const found: any = req.result; if ((!!found !== p.existed) || (found && !equal(found.value, p.expected))) {
            conflict = Error('Another session changed this record. Your changes remain in this tab. Download a backup before reloading.');
            tx.abort();
            return;
        } if (p.deleted)
            store.delete(p.key);
        else
            store.put({ key: p.key, value: p.value } as any); };
    } tx.oncomplete = (): any => resolve(); tx.onabort = (): any => reject(conflict || tx.error || Error('Local save failed.')); tx.onerror = (): any => { }; }); }
    async function load(): Promise<any> {
        try {
            await openDb();
            const saved: any = await readAll();
            if (saved.size) {
                STATE = inflate(saved);
                baseline = saved;
                try {
                    runCoreMigrations();
                }
                catch (e: any) {
                    console.error('Core migrations failed (continuing anyway):', e);
                }
                STATE.currentRoleIds = [];
                status('ok', 'Saved on this device · Demo workspace');
                return;
            }
        }
        catch (e: any) {
            status('error', 'Session only · Local storage unavailable');
        }
        let legacy: any = null;
        try {
            if ((window as any).storage) {
                const item: any = await (window as any).storage.get(STORAGE_KEY, false);
                if (item?.value)
                    legacy = JSON.parse(item.value);
            }
        }
        catch { }
        STATE = legacy || await buildSeedState();
        STATE.currentRoleIds = [];
        if (db) {
            const initial: any = flatten(STATE);
            try {
                await transaction(changes(new Map(), initial));
                baseline = initial;
                status('ok', 'Saved on this device · Demo workspace');
            }
            catch (e: any) {
                status('error', e.message);
            }
        }
        else
            baseline = flatten(STATE);
    }
    function persist(): any { if (!STATE)
        return; SuiteUX.clearDirty(); pendingWrites = true; clearTimeout(debounce); status('saving', 'Saving changes…'); debounce = setTimeout(flush, 200); try {
        renderNotifBell();
    }
    catch (e: any) {
        console.error('renderNotifBell failed after persist() (save is unaffected):', e);
    } }
    async function flush(): Promise<any> {
        clearTimeout(debounce);
        if (saving) {
            saveAgain = true;
            return new Promise((resolve?: any): any => waiters.push(resolve));
        }
        saving = true;
        const myEpoch: any = sessionEpoch;
        // If a logout, a different account signing in, or a tenant/agency switch makes a different
        // session current on this tab while this save is still in flight, its outcome no longer means
        // anything for what's on screen now. Every point below that would touch
        // serverVersions/baseline/status/pendingWrites, or schedule a retry, checks this first and
        // quietly stands down instead of writing into whichever session IS current using version
        // expectations that belong to the one that just ended.
        const staleSession: any = (): any => sessionEpoch !== myEpoch;
        let success: any = false;
        try {
            const snapshot: any = flatten(STATE);
            let patches: any = changes(baseline, snapshot);
            const rejected: any = [];
            if (mode === 'shared')
                patches = patches.filter((p?: any): any => {
                    const [path]: any = JSON.parse(p.key);
                    if (path[0] === 'accounts' || path[0] === 'auditLog')
                        return false;
                    // Alerts are derived while rendering. Read receipts have their own per-user table.
                    if (['activity', 'dashboardPrefs', 'notifications'].includes(path[1]))
                        return false;
                    if (path[0] === 'ssoConfig') {
                        if (!(HOME_ROLE_IDS || []).some((id?: any): any => id === 'role_admin' || id === 'role_platform_admin')) {
                            rejected.push(p);
                            return false;
                        }
                    }
                    // Never attempt to save a module this role has no access to at all. STATE keeps default
                    // scaffolding in memory for every module regardless of which ones the current role can
                    // actually use, so without this, saving anything at all also tries to resave every other
                    // module's untouched defaults right alongside it. A save is one all-or-nothing
                    // transaction, so the server correctly refusing write access to a module this role was
                    // never meant to touch would silently fail the entire save, including whatever the
                    // person actually meant to change, a training check-in bundled in with an untouched copy
                    // of an entirely different module's data, for example.
                    const moduleAbility: any = ({ qm: 'module_quartermaster', fleet: 'module_fleet', pm: 'module_personnel', k9: 'module_k9', drone: 'module_drone', eod: 'module_eod', subpoena: 'module_subpoena', grants: 'module_grants', civil: 'module_civil' } as any)[path[0]];
                    if (moduleAbility) {
                        const assigned: any = (HOME_ROLE_IDS || []).some((id?: any): any => STATE.roles.find((role?: any): any => role.id === id)?.abilities?.[moduleAbility]);
                        if (!assigned) {
                            rejected.push(p);
                            return false;
                        }
                    }
                    // Same problem one level deeper: a role can have write access to a module overall
                    // (module_personnel) while suite_access_rules still denies write on most collections
                    // inside it -- only pm_training_checkins and pm_leaveRequests are self-service (own
                    // record only, checked server-side by personId), everything else in pm (refData,
                    // rollCalls, bidCycles, extraDutyJobs, extraDutySignups, schedulingSettings, etc.) has
                    // no suite_access_rules row at all for Officer or Training Coordinator, only for
                    // Admin. STATE still carries default/placeholder values for all of it locally, so
                    // without this it rides along in every save and the server's rejection of that one
                    // untouched collection fails the entire all-or-nothing batch, including a check-in or
                    // leave request that would otherwise have gone through fine.
                    if (path[0] === 'pm') {
                        const collection: any = path[1];
                        const selfService: any = collection === 'trainingCheckins' || collection === 'leaveRequests';
                        if (!selfService && !(HOME_ROLE_IDS || []).some((id?: any): any => STATE.roles.find((role?: any): any => role.id === id)?.abilities?.personnel_manage)) {
                            rejected.push(p);
                            return false;
                        }
                    }
                    return true;
                });
            if (mode === 'local' && !db)
                throw Error('Session only · Durable local storage is unavailable. Download a backup before leaving.');
            if (!patches.length) {
                if (!staleSession()) {
                    pendingWrites = !!rejected.length;
                    if (rejected.length)
                        saveAgain = false;
                    else
                        lastErrorWasVersionConflict = false;
                    status(rejected.length ? 'error' : 'ok', rejected.length ? 'A change is not authorized for this account. Download pending changes before reloading.' : mode === 'shared' ? 'Saved to agency workspace' : 'Saved on this device · Demo workspace');
                }
                return !rejected.length;
            }
            if (mode === 'shared') {
                if (!serverReady)
                    throw Error('Agency connection unavailable. Changes are pending in this tab.');
                // Splitting into batches keeps any single database round trip small and fast regardless
                // of how much total work there is to save -- a first-ever migration healing pass on a
                // brand new tenant can legitimately touch several hundred records at once (every role,
                // every module's reference data), and asking one request to do all of that in one breath
                // is a needless amount of risk for what gains nothing over doing it in smaller pieces.
                // Updating baseline/serverVersions after each batch (not just once at the very end) means
                // that if a later batch fails, everything already confirmed saved stays confirmed --
                // a retry only has to redo what's actually still outstanding, not start over from zero.
                const BATCH_SIZE: any = 60;
                const batches: any = [];
                for (let i: any = 0; i < patches.length; i += BATCH_SIZE)
                    batches.push(patches.slice(i, i + BATCH_SIZE));
                if (patches.length > 20)
                    debugLog(`[save] ${patches.length} record(s) to save in ${batches.length} batch(es):`, patches.map((p?: any): any => p.key));
                for (let i: any = 0; i < batches.length; i++) {
                    if (staleSession())
                        return false; // the session moved on; abandon the rest of this save quietly
                    if (batches.length > 1)
                        status('saving', `Saving changes… (${i + 1} of ${batches.length})`);
                    const batch: any = batches[i];
                    let wireChanges: any = batch.map((p?: any): any => ({
                        key: p.key, value: selfServiceOrder(p) ? mergeSharedOrder(p) : p.value,
                        deleted: p.deleted, expected_version: serverVersions[p.key] || 0
                    } as any));
                    let data: any, error: any;
                    try {
                        ({ data, error } = await remoteRpc('suite_apply_changes', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId, p_changes: wireChanges } as any));
                    }
                    catch (thrown: any) {
                        // Some client-library failure modes throw directly instead of resolving with a clean
                        // {error} object -- a version conflict must be caught and classified the SAME way
                        // regardless of which shape it arrives in, or it silently falls through to the
                        // generic backoff-retry path below and gets auto-retried when it should never be.
                        error = thrown;
                    }
                    if (staleSession())
                        return false; // the session moved on while this request was in flight
                    if (error && /changed in another session/i.test(error.message || '') && batch.some(selfServiceOrder)) {
                        // Rebase only the shared order row. A conflict on a real record still
                        // stops the save so another person's changes cannot be overwritten.
                        const latest: any = await remoteRpc('suite_load_workspace', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId } as any);
                        if (!latest.error && !staleSession()) {
                            const rows: any = new Map((latest.data.records || []).map((r?: any): any => [r.key, r]));
                            const safe: any = batch.every((p?: any): any => selfServiceOrder(p) || ((rows.get(p.key)?.version || 0) === (serverVersions[p.key] || 0)));
                            if (safe) {
                                for (const p of batch.filter(selfServiceOrder)) {
                                    const row: any = rows.get(p.key);
                                    serverVersions[p.key] = row?.version || 0;
                                    if (row && !row.deleted)
                                        serverOrders.set(p.key, clone(row.value));
                                    else
                                        serverOrders.delete(p.key);
                                }
                                wireChanges = batch.map((p?: any): any => ({ key: p.key, value: selfServiceOrder(p) ? mergeSharedOrder(p) : p.value, deleted: p.deleted, expected_version: serverVersions[p.key] || 0 } as any));
                                try {
                                    ({ data, error } = await remoteRpc('suite_apply_changes', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId, p_changes: wireChanges } as any));
                                }
                                catch (thrown: any) {
                                    error = thrown;
                                }
                            }
                        }
                    }
                    if (staleSession())
                        return false;
                    if (patches.length > 20)
                        debugLog(`[save] batch ${i + 1}/${batches.length}:`, error ? `FAILED: ${error.code || ''} ${error.message || ''}` : 'ok');
                    if (error) {
                        // A version-conflict / serialization-failure error (Postgres class 40001) means this
                        // tab's own view of the record is already stale -- someone or something else saved a
                        // newer version first. Resending the exact same patch against the exact same expected
                        // version can only ever fail the exact same way, forever. This is NOT a transient error
                        // to blindly retry: it's an explicit signal (the message literally says "reload before
                        // retrying") that a reload has to happen before another write attempt can possibly
                        // succeed. Flagging it distinctly here is what lets the catch block below refuse to
                        // queue another automatic retry for this specific failure, instead of hammering the
                        // server with the same doomed request over and over.
                        const isVersionConflict: any = error.code === '40001' || /reload before retrying|another session/i.test(error.message || '');
                        if (isVersionConflict) {
                            // Before treating this as something a person needs to act on, check whether the
                            // server's current value for these specific rows already matches what this tab was
                            // trying to write. If so, the version number moved for a reason that changed nothing --
                            // the same idempotent login-time healing running again, the same account open in a
                            // second tab or device, a retried request landing twice -- and there is nothing to lose
                            // by moving on quietly. If any row's current server value genuinely differs, this
                            // returns false and falls straight through to the real-conflict handling below, exactly
                            // as before.
                            try {
                                const resolved: any = await resolveSpuriousConflict(batch);
                                if (staleSession())
                                    return false;
                                if (resolved) {
                                    debugLog('[save] absorbed a spurious version conflict (server value already matched) for', batch.map((p?: any): any => p.key));
                                    continue;
                                }
                            }
                            catch (resolveError: any) {
                                console.error('Could not check for a spurious version conflict, falling back to normal conflict handling:', resolveError);
                                // fall through to the normal path below
                            }
                        }
                        const staleErr: any = Error(error.message || 'Shared save failed. Changes remain pending.');
                        if (isVersionConflict)
                            staleErr.isVersionConflict = true;
                        if (error.code === '42501' || /cannot change this collection or record/i.test(error.message || ''))
                            staleErr.isPermissionFailure = true;
                        throw staleErr;
                    }
                    for (const r of data || [])
                        serverVersions[r.key] = r.version;
                    for (const p of wireChanges)
                        if (JSON.parse(p.key)[1] === '$order') {
                            if (p.deleted)
                                serverOrders.delete(p.key);
                            else
                                serverOrders.set(p.key, clone(p.value));
                        }
                    for (const p of batch)
                        if (p.deleted)
                            baseline.delete(p.key);
                        else
                            baseline.set(p.key, p.value);
                }
            }
            else {
                if (!db)
                    throw Error('Not saved · Local storage unavailable. Download a backup before leaving.');
                await transaction(patches);
                baseline = snapshot;
            }
            if (staleSession())
                return false;
            pendingWrites = !!rejected.length || !equal([...snapshot], [...flatten(STATE)]);
            if (rejected.length) {
                saveAgain = false;
                status('error', 'Some changes were saved, but another change is not authorized. Download pending changes before reloading.');
                return false;
            }
            status('ok', mode === 'shared' ? 'Saved to agency workspace' : 'Saved on this device · Demo workspace');
            if (mode === 'local' && typeof TenantPlatform !== 'undefined')
                TenantPlatform.snapshotCurrent();
            success = true;
            consecutiveFailures = 0;
            lastErrorWasVersionConflict = false;
        }
        catch (e: any) {
            if (staleSession()) {
                // This save belonged to a session that's no longer current on this tab -- its failure
                // doesn't apply to anything on screen anymore, so it settles quietly instead of raising an
                // error banner or marking pendingWrites for a session that never made this change.
            }
            else {
                pendingWrites = true;
                if (e.isVersionConflict) {
                    // Never auto-retry this class of error -- it cannot succeed without a reload first, and
                    // retrying anyway is exactly what was hammering the database. Drop any queued retry and
                    // point the person at the reload action that's already sitting in the save-status strip.
                    saveAgain = false;
                    lastErrorWasVersionConflict = true;
                    status('error', 'Someone or something else already saved a newer version of this data in the meantime. Use "Reload saved copy" below before making further changes here.');
                }
                else if (e.isPermissionFailure) {
                    saveAgain = false;
                    lastErrorWasVersionConflict = false;
                    status('error', 'This account cannot save one of the changed records. Download pending changes before reloading.');
                }
                else {
                    consecutiveFailures++;
                    lastErrorWasVersionConflict = false;
                    status('error', e.message || 'Save failed. Changes remain in this tab.');
                }
            }
        }
        finally {
            const waiting: any = waiters.splice(0);
            if (staleSession()) {
                // Don't touch `saving` here -- signOut()/acceptRemote() already forced it back to false
                // (and may already have a newer flush of their own running) the moment the session moved
                // on, so resetting it here could clobber that newer flush's own lock instead of this one's.
                saveAgain = false;
                waiting.forEach((resolve?: any): any => resolve(false));
            }
            else {
                saving = false;
                if (saveAgain && consecutiveFailures < 6) {
                    saveAgain = false;
                    const delay: any = success ? 0 : Math.min(30000, 1000 * Math.pow(2, consecutiveFailures));
                    setTimeout((): any => { flush().then((ok?: any): any => waiting.forEach((resolve?: any): any => resolve(ok))); }, delay);
                }
                else {
                    saveAgain = false;
                    waiting.forEach((resolve?: any): any => resolve(success));
                }
            }
        }
        return success;
    }
    function acceptRemote(data?: any): any {
        AWS_DEV.tenantId=data.tenant_id;AWS_DEV.agencyId=data.agency_id;sessionStorage.setItem('sonomarzi.workspace.tenant',data.tenant_id);sessionStorage.setItem('sonomarzi.workspace.agency',data.agency_id);
        if (!data?.records)
            throw Error('The agency workspace has not been provisioned.');
        sessionEpoch++;
        clearTimeout(debounce);
        saving = false;
        saveAgain = false;
        consecutiveFailures = 0;
        const orphanedWaiters: any = waiters.splice(0);
        orphanedWaiters.forEach((resolve?: any): any => resolve(false));
        const rows: any = new Map(data.records.filter((r?: any): any => !r.deleted).map((r?: any): any => [r.key, r.value]));
        STATE = mergeTemplate(data.template || {} as any, inflate(rows));
        STATE.accounts = STATE.accounts || [];
        STATE.personnel = STATE.personnel || [];
        STATE.roles = (STATE.roles && STATE.roles.length) ? STATE.roles : [{ id: 'role_platform_admin', name: 'SonoMarzi Platform Admin', locked: true, hidden: true, agencyScope: [], abilities: Object.fromEntries(ALL_ABILITY_IDS.map((id?: any): any => [id, id !== 'chatbot_access'])) } as any];
        debugLog('[access] RAW roles exactly as received from the server, before any client-side healing:', (STATE.roles || []).map((r?: any): any => ({ id: r.id, name: r.name } as any)));
        serverVersions = {} as any;
        serverOrders = new Map();
        for (const r of data.records) {
            serverVersions[r.key] = r.version;
            if (JSON.parse(r.key)[1] === '$order' && !r.deleted)
                serverOrders.set(r.key, clone(r.value));
        }
        baseline = flatten(STATE);
        try {
            runCoreMigrations();
        }
        catch (e: any) {
            console.error('Core migrations failed (continuing anyway):', e);
        }
        CURRENT_USER_ID = data.person_id;
        HOME_ROLE_IDS = data.role_ids;
        STATE.currentRoleIds = [...(data.role_ids || [])];
        remoteContext = { tenantId: data.tenant_id, agencyId: data.agency_id } as any;
        serverReady = true;
        mode = 'shared';
        pendingWrites = false;
        notificationReads = new Set();
        status('ok', 'Saved to agency workspace');
    }
    const notificationModule: any = { Quartermaster: 'qm', Fleet: 'fleet', Personnel: 'pm', K9: 'k9', Drone: 'drone', EOD: 'eod', Subpoena: 'subpoena', Grants: 'grants', Civil: 'civil' } as any;
    const notificationKey: any = (module?: any, id?: any): any => (notificationModule[module] || module) + '|' + id;
    function isNotificationRead(module?: any, id?: any): any { return notificationReads.has(notificationKey(module, id)); }
    async function loadNotificationReads(): Promise<any> {
        const { data, error }: any = await backendClient.rpc('suite_notification_reads', { p_action: 'list' } as any);
        if (error) {
            console.error('Could not load notification read status:', error);
            notificationReads = new Set();
            return;
        }
        notificationReads = new Set(data || []);
    }
    async function markNotificationsRead(items?: any): Promise<any> {
        if (!items.length)
            return true;
        const keys: any = items.map((item?: any): any => notificationKey(item.module, item.id)).filter((key?: any): any => !notificationReads.has(key));
        if (!keys.length)
            return true;
        const { data, error }: any = await backendClient.rpc('suite_notification_reads', { p_action: 'mark', p_keys: keys } as any);
        if (error) {
            console.error('Could not save notification read status:', error);
            return false;
        }
        notificationReads = new Set(data || []);
        return true;
    }
    async function signIn(email?: any, password?: any): Promise<any> {
        if (!awsToken())
            throw Error('Sign in to continue.');
        const { data, error }: any = await remoteRpc('suite_load_workspace', {
            p_tenant_id: AWS_DEV.tenantId,
            p_agency_id: AWS_DEV.agencyId
        } as any);
        if (error)
            throw error;
        acceptRemote(data);
        await loadNotificationReads();
        logAuditEntry('Shared', `${personName(CURRENT_USER_ID)} signed in.`, 'auth');
        return true;
    }
    async function resumeSession(): Promise<any> {
        if (!awsToken())
            return false;
        const { data, error }: any = await remoteRpc('suite_load_workspace', {
            p_tenant_id: AWS_DEV.tenantId,
            p_agency_id: AWS_DEV.agencyId
        } as any);
        if (error) {
            console.error('AWS workspace resume failed:', error);
            if (error.status === 401 || error.status === 403)
                sessionStorage.removeItem(AWS_DEV.tokenKey);
            return false;
        }
        acceptRemote(data);
        await loadNotificationReads();
        return true;
    }
    async function loadRemoteContext(tenantId?: any, agencyId?: any): Promise<any> { if (mode !== 'shared')
        throw Error('Agency context changes require an authenticated connection.'); if (pendingWrites || saving) {
        const saved: any = await flush();
        if (!saved || pendingWrites)
            throw Error('Save your pending changes before switching agencies. Download a backup if the save is blocked.');
    } const { data, error }: any = await remoteRpc('suite_load_workspace', { p_tenant_id: tenantId, p_agency_id: agencyId } as any); if (error)
        throw Error(error.message || 'That agency workspace could not be loaded.'); acceptRemote(data); await loadNotificationReads(); return true; }
    async function signOut(): Promise<any> {
        // Bump the epoch BEFORE anything else. Any flush() still in flight for the account that's
        // leaving captured the old epoch when it started; once this changes, that save will notice
        // (see the staleSession checks inside flush()) and quietly stand down instead of writing into
        // whatever session becomes current, or leaving this tab's save lock stuck forever waiting on
        // a request that may never come back.
        sessionEpoch++;
        clearTimeout(debounce);
        saving = false;
        saveAgain = false;
        consecutiveFailures = 0;
        const orphanedWaiters: any = waiters.splice(0);
        orphanedWaiters.forEach((resolve?: any): any => resolve(false));
        if (mode === 'shared') {
            await StaffNotices.beforeSignOut();
            await Promise.race([
                backendClient.auth.signOut({ scope: 'local' } as any),
                new Promise((_?: any, reject?: any): any => setTimeout((): any => reject(Error('Sign-out timed out')), 5000)),
            ]).catch((error?: any): any => {
                console.error('Auth sign-out failed; removing the local session:', error);
                sessionStorage.removeItem(AWS_DEV.tokenKey);
                setTimeout((): any => location.replace(location.pathname), 0);
            });
        }
        serverReady = false;
        mode = 'local';
        serverVersions = {} as any;
        serverOrders = new Map();
        notificationReads = new Set();
        remoteContext = { tenantId: null, agencyId: null } as any;
        await load();
    }
    function backupPending(): any {
        const pending: any = changes(baseline, flatten(STATE)).filter((p?: any): any => {
            const [path]: any = JSON.parse(p.key);
            return !['accounts', 'auditLog'].includes(path[0]) && !['activity', 'dashboardPrefs', 'notifications'].includes(path[1]);
        });
        const blob: any = new Blob([JSON.stringify({ exportedAt: (new Date() as any).toISOString(), tenantId: remoteContext.tenantId, agencyId: remoteContext.agencyId, changes: pending } as any, null, 2)], { type: 'application/json' } as any);
        const url: any = URL.createObjectURL(blob), a: any = (document as any).createElement('a');
        a.href = url;
        a.download = 'public-safety-pending-changes.json';
        a.click();
        setTimeout((): any => URL.revokeObjectURL(url), 1000);
    }
    async function reload(silent: any = false): Promise<any> {
        if (saving) {
            toast('Wait for the current save to finish.', true);
            return false;
        }
        if (silent && (pendingWrites || SuiteUX.hasDirty())) {
            toast('The latest server copy is available, but this tab has unsaved changes. Save or download them before refreshing.', true);
            return false;
        }
        if (!silent && !confirm('Replace this tab with the latest saved records? Download pending changes first if you need to retain them.'))
            return false;
        const user: any = CURRENT_USER_ID;
        clearTimeout(debounce);
        try {
            if (mode === 'shared') {
                const { data, error }: any = await remoteRpc('suite_load_workspace', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId } as any);
                if (error)
                    throw error;
                acceptRemote(data);
                await loadNotificationReads();
            }
            else {
                await load();
                STATE.currentRoleIds = [...(STATE.personnel.find((p?: any): any => p.id === user)?.roleIds || [])];
            }
            pendingWrites = false;
            SuiteUX.clearDirty();
            renderRoleSwitcher();
            if (!silent) {
                (document as any).getElementById('modalOverlay').classList.remove('open');
                SuiteUX.home();
            }
            status('ok', mode === 'shared' ? 'Saved to agency workspace' : 'Saved on this device · Demo workspace');
            return true;
        }
        catch (error: any) {
            status('error', error.message || 'Could not reload saved records.');
            return false;
        }
    }
    async function adopt(next?: any): Promise<any> {
        if (mode !== 'local')
            throw Error('Agency context changes are loaded from the server.');
        if (!db)
            throw Error('Durable local storage is unavailable.');
        const snapshot: any = flatten(next), patches: any = changes(baseline, snapshot);
        await transaction(patches);
        STATE = next;
        baseline = snapshot;
        pendingWrites = false;
        status('ok', 'Saved on this device · Demo workspace');
        return true;
    }
    async function submitSelfServiceRecord(collection?: any, newRecord?: any): Promise<any> {
        // A training check-in is its own tiny, self-contained save -- it only ever touches the
        // trainingCheckins collection, so it never goes through flush()/changes(), which diffs and
        // resends the ENTIRE state tree (every module's current values, including collections this
        // role has no write access to at all). That bundling is what kept silently failing
        // check-ins: one unrelated, unwritable collection riding along in the same all-or-nothing
        // batch was enough to reject the whole thing, check-in included. Bypassing that pipeline
        // here removes this entire class of bug for this action, permanently, regardless of what
        // else is sitting changed-or-not in STATE at the moment someone scans a code.
        if (mode !== 'shared') {
            // Local demo mode has no server-side permission model to collide with; fold it into
            // STATE and let normal local persistence handle it like everything else.
            STATE.pm[collection].push(newRecord);
            persist();
            return { ok: true } as any;
        }
        if (!serverReady)
            return { ok: false, error: Error("Agency connection unavailable. Try scanning again once you're back online.") } as any;
        if (!['trainingCheckins', 'leaveRequests'].includes(collection))
            return { ok: false, error: Error('Unsupported self-service collection.') } as any;
        const collectionKey: any = JSON.stringify([["pm", collection], "$value"]);
        const orderKey: any = JSON.stringify([["pm", collection], "$order"]);
        const recordKey: any = JSON.stringify([["pm", collection], newRecord.id]);
        const attempt: any = async (): Promise<any> => {
            // The server's order can include records this user cannot read. Inflating the
            // workspace removes those records, so an order rebuilt from STATE would erase IDs.
            const currentOrder: any = serverOrders.get(orderKey) || [];
            const patches: any = [];
            if (!serverOrders.has(orderKey) && serverVersions[collectionKey]) {
                // The very first check-in this tenant/agency ever records requires deleting the
                // empty-array placeholder blob in the same save that adds the first real record, or
                // the shape mismatch rejects the whole thing.
                patches.push({ key: collectionKey, value: null, deleted: true, expected_version: serverVersions[collectionKey] || 0 } as any);
            }
            patches.push({ key: orderKey, value: [...currentOrder, newRecord.id], deleted: false, expected_version: serverVersions[orderKey] || 0 } as any);
            patches.push({ key: recordKey, value: newRecord, deleted: false, expected_version: 0 } as any);
            let data: any, error: any;
            try {
                ({ data, error } = await remoteRpc('suite_apply_changes', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId, p_changes: patches } as any));
            }
            catch (thrown: any) {
                error = thrown;
            }
            return { data, error, order: [...currentOrder, newRecord.id] } as any;
        };
        let { data, error, order }: any = await attempt();
        if (error && /changed in another session/i.test(error.message || '')) {
            // Refresh only this collection's version bookkeeping. A full reload here
            // would discard a separate unsaved form on the phone or another tab.
            const latest: any = await remoteRpc('suite_load_workspace', { p_tenant_id: remoteContext.tenantId, p_agency_id: remoteContext.agencyId } as any);
            if (latest.error)
                return { ok: false, error: latest.error } as any;
            const relevant: any = new Map((latest.data.records || []).filter((r?: any): any => [collectionKey, orderKey, recordKey].includes(r.key)).map((r?: any): any => [r.key, r]));
            for (const key of [collectionKey, orderKey, recordKey]) {
                const row: any = relevant.get(key);
                if (row)
                    serverVersions[key] = row.version;
            }
            const remoteOrder: any = relevant.get(orderKey);
            if (remoteOrder && !remoteOrder.deleted)
                serverOrders.set(orderKey, clone(remoteOrder.value));
            else
                serverOrders.delete(orderKey);
            const existing: any = relevant.get(recordKey);
            if (existing && !existing.deleted) {
                if (!equal(existing.value, newRecord))
                    return { ok: false, error: Error('This request ID was used for a different record. No local changes were discarded.') } as any;
                if (!(STATE.pm[collection] || []).some((c?: any): any => c.id === newRecord.id))
                    STATE.pm[collection].push(newRecord);
                baseline.set(recordKey, clone(existing.value));
                baseline.set(orderKey, (STATE.pm[collection] || []).map((c?: any): any => c.id));
                return { ok: true } as any;
            }
            ({ data, error, order } = await attempt());
        }
        if (error) {
            status('error', error.message || 'Check-in could not be saved.');
            return { ok: false, error } as any;
        }
        for (const r of data || [])
            serverVersions[r.key] = r.version;
        serverOrders.set(orderKey, order);
        if ((STATE.pm[collection] || []).every((c?: any): any => c.id !== newRecord.id))
            STATE.pm[collection].push(newRecord);
        baseline.delete(collectionKey);
        baseline.set(orderKey, (STATE.pm[collection] || []).map((c?: any): any => c.id));
        baseline.set(recordKey, newRecord);
        status(pendingWrites ? 'saving' : 'ok', pendingWrites ? 'Other changes are still pending in this tab.' : 'Saved to agency workspace');
        return { ok: true } as any;
    }
    async function submitTrainingCheckin(newRecord?: any): Promise<any> { return submitSelfServiceRecord('trainingCheckins', newRecord); }
    let refreshing: any = false, lastRefresh: any = 0;
    async function refreshIfClean(): Promise<any> {
        if (refreshing || mode !== 'shared' || !serverReady || pendingWrites || saving || SuiteUX.hasDirty() || (document as any).getElementById('modalOverlay')?.classList.contains('open'))
            return false;
        const context: any = { ...remoteContext } as any, epoch: any = sessionEpoch;
        refreshing = true;
        lastRefresh = Date.now();
        try {
            const { data, error }: any = await remoteRpc('suite_load_workspace', { p_tenant_id: context.tenantId, p_agency_id: context.agencyId } as any);
            if (error)
                throw error;
            if (epoch !== sessionEpoch || pendingWrites || saving || SuiteUX.hasDirty() || (document as any).getElementById('modalOverlay')?.classList.contains('open'))
                return false;
            const changed: any = data.records.some((row?: any): any => serverVersions[row.key] !== row.version) ||
                (Object.keys(serverVersions) as any).some((key?: any): any => !data.records.some((row?: any): any => row.key === key));
            if (!changed) {
                await loadNotificationReads();
                return false;
            }
            acceptRemote(data);
            await loadNotificationReads();
            renderRoleSwitcher();
            const destination: any = location.hash.replace(/^#\//, '');
            if (destination && destination !== 'content')
                SuiteUX.navigate(destination);
            else
                SuiteUX.home();
            toast('Agency records refreshed from another session.');
            return true;
        }
        catch (error: any) {
            console.error('Could not refresh agency records:', error);
            return false;
        }
        finally {
            refreshing = false;
        }
    }
    (window as any).addEventListener('online', async (): Promise<any> => {
        if (pendingWrites) {
            const saved: any = await flush();
            if (!saved || pendingWrites)
                return;
        }
        await refreshIfClean();
    });
    (document as any).addEventListener('visibilitychange', (): any => {
        if (!(document as any).hidden && Date.now() - lastRefresh > 30000)
            refreshIfClean();
    });
    return { load, persist, flush, signIn, resumeSession, signOut, backupPending, reload, adopt, loadRemoteContext, flatten, inflate, changes, equal, submitTrainingCheckin, submitSelfServiceRecord, refreshIfClean, isNotificationRead, markNotificationsRead, pending: (): any => pendingWrites || saving, mode: (): any => mode, remoteContext: (): any => ({ ...remoteContext } as any), needsReloadBeforeRetry: (): any => lastErrorWasVersionConflict, description: (): any => mode === 'shared' ? 'Connected to the authenticated agency workspace. Each changed record is checked for concurrent edits.' : 'This is a demo workspace saved in this browser. It is not shared with other staff. Agency sign-in requires the supplied database migration and account provisioning.' } as any;
})();
