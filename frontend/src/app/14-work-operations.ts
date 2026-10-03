/* My Work, readiness, and agency workflow views. The database authorizes every workflow action. */
const WorkOperations: any = ((): any => {
    const esc: any = escapeHtml;
    const date: any = (): any => fmt(new Date() as any);
    const localDate: any = (value?: any): any => { if (!value)
        return ''; try {
        const parts: any = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: SuiteUX.userTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' } as any).formatToParts(new Date(value) as any).filter((p?: any): any => p.type !== 'literal').map((p?: any): any => [p.type, p.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
    }
    catch {
        return value.slice(0, 10);
    } };
    const daysUntil: any = (value?: any): any => Math.round(((new Date(value + 'T12:00:00') as any).getTime() - (new Date(date() + 'T12:00:00') as any).getTime()) / 86400000);
    const current: any = (): any => STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any;
    const actualRoles: any = (): any => SuiteStore.mode() === 'shared' ? (HOME_ROLE_IDS || []) : (current().roleIds || []);
    const allowed: any = (id?: any): any => actualRoles().some((r?: any): any => STATE.roles.find((x?: any): any => x.id === r)?.abilities?.[id]);
    const manager: any = (): any => allowed('workflow_manage');
    const canApprove: any = (): any => allowed('workflow_approve');
    const canUse: any = (): any => allowed('workflow_use');
    const visible: any = (mod?: any): any => ({ fleet: 'module_fleet', qm: 'module_quartermaster', personnel: 'module_personnel', k9: 'module_k9', drone: 'module_drone' } as any)[mod] && allowed(({ fleet: 'module_fleet', qm: 'module_quartermaster', personnel: 'module_personnel', k9: 'module_k9', drone: 'module_drone' } as any)[mod]);
    const safeList: any = (v?: any): any => Array.isArray(v) ? v : [];
    let cache: any = { key: '', templates: [], items: [], loaded: false, busy: false, error: '', at: 0 } as any;
    function readiness(): any {
        const items: any = [], today: any = date(), me: any = current(), people: any = safeList(STATE.personnel);
        const add: any = (group?: any, title?: any, due?: any, detail?: any, route?: any, owner?: any): any => items.push({ group, title, due: due || '', detail: detail || '', route, owner: owner || '', urgent: !!due && due < today } as any);
        // The signed-in employee always sees their own qualifications. Coordinators see the roster.
        const broad: any = allowed('pm_training_manage') || allowed('personnel_manage');
        for (const p of people.filter((p?: any): any => broad || p.id === me.id))
            for (const q of safeList(p.qualifications)) {
                if (q.expirationDate && daysUntil(q.expirationDate) <= 60)
                    add('People', `${p.name}: ${q.weaponType || 'Qualification'} ${q.expirationDate < today ? 'expired' : 'due soon'}`, q.expirationDate, 'Qualification expiration', 'pm-training', p.id);
            }
        if (visible('personnel') && (allowed('pm_training_manage') || allowed('pm_training_view_own')))
            for (const r of safeList(STATE.pm?.trainingRecords)) {
                if (!broad && r.personId !== me.id)
                    continue;
                if (r.recertRequired && r.recertDate && daysUntil(r.recertDate) <= 60)
                    add('People', `${personName(r.personId)}: ${r.description || 'Training'} recertification`, r.recertDate, 'Training renewal', 'pm-training', r.personId);
            }
        if (visible('personnel') && allowed('pm_overtime_view') && typeof computeCoverageGaps === 'function') {
            for (const gap of computeCoverageGaps(7))
                add('Staffing', `${gap.shift.name}: ${gap.needed} open position${gap.needed === 1 ? '' : 's'}`, gap.date, `${gap.staffed}/${gap.minStaff} staffed`, 'pm-scheduling');
        }
        if (visible('fleet') && allowed('fleet_vehicle_view'))
            for (const v of safeList(STATE.fleet?.vehicles)) {
                if (['Out of Service', 'In Maintenance', 'Maintenance'].includes(v.status))
                    add('Fleet', `${v.unitNumber || v.name || 'Vehicle'}: ${v.status}`, '', v.make + ' ' + v.model, 'fleet-vehicles');
            }
        if (visible('qm') && allowed('qm_equip_view'))
            for (const e of safeList(STATE.qm?.equipment)) {
                if (['Needs Repair', 'Damaged', 'Out of Service'].includes(e.condition) || e.status === 'Out of Service')
                    add('Equipment', `${e.name || e.assetId}: ${e.condition || e.status}`, '', e.assetId || 'Equipment requires attention', 'qm-inventory');
            }
        if (visible('k9') && allowed('k9_certification_view'))
            for (const c of safeList(STATE.k9?.certifications)) {
                if (c.expirationDate && daysUntil(c.expirationDate) <= 60)
                    add('Specialty', `K9 certification: ${c.certType || 'Renewal'}`, c.expirationDate, 'K9 qualification', 'k9-certifications');
            }
        if (visible('drone') && allowed('drone_operator_view'))
            for (const o of safeList(STATE.drone?.operators))
                for (const w of safeList(o.waivers)) {
                    if (w.expirationDate && daysUntil(w.expirationDate) <= 60)
                        add('Specialty', `UAS waiver: ${w.type || 'Renewal'}`, w.expirationDate, 'Operator authorization', 'drone-operators');
                }
        return items.sort((a?: any, b?: any): any => Number(b.urgent) - Number(a.urgent) || (a.due || '9999').localeCompare(b.due || '9999'));
    }
    function readinessTasks(): any { return readiness().filter((x?: any): any => (x.group === 'People' && (x.owner === CURRENT_USER_ID || allowed('pm_training_manage'))) || (x.group === 'Staffing' && allowed('pm_overtime_manage'))).slice(0, 25).map((x?: any): any => ({ title: x.title, owner: x.owner === CURRENT_USER_ID ? 'You' : x.group === 'Staffing' ? 'Scheduling' : 'Training', due: x.due, type: x.owner === CURRENT_USER_ID ? 'mine' : 'attention', consequence: x.detail, action: (): any => SuiteUX.go(x.route) } as any)); }
    function renderReadiness(el?: any): any {
        const items: any = readiness();
        const groups: any = ['Staffing', 'People', 'Fleet', 'Equipment', 'Specialty'].map((name?: any): any => ({
            name,
            rows: items.filter((item?: any): any => item.group === name).map((item?: any): any => ({
                title: item.title,
                detail: item.detail,
                due: item.due ? SuiteUX.displayDate(item.due) : '',
                urgent: item.urgent,
                open: (): any => SuiteUX.go(item.route)
            } as any))
        } as any));
        (window as any).SonoMarziReact.renderReadiness(el, { date: SuiteUX.displayDate(date()), groups });
    }
    const key: any = (): any => { const c: any = SuiteStore.remoteContext(); return SuiteStore.mode() === 'shared' ? `${c.tenantId}/${c.agencyId}/${CURRENT_USER_ID}` : `local/${CURRENT_USER_ID}`; };
    function localData(): any { STATE.workflows ||= { templates: [], items: [] } as any; return STATE.workflows; }
    async function call(action?: any, payload: any = {} as any): Promise<any> {
        if (SuiteStore.mode() === 'local')
            return localCall(action, payload);
        const c: any = SuiteStore.remoteContext();
        if (!c.tenantId || !c.agencyId)
            throw Error('Choose an agency first.');
        const { data, error }: any = await backendClient.rpc('suite_workflow_api', { p_action: action, p_tenant_id: c.tenantId, p_agency_id: c.agencyId, p_payload: payload } as any);
        if (error)
            throw Error(error.message || 'Workflow request failed.');
        return data;
    }
    function localCall(action?: any, p?: any): any {
        const d: any = localData(), now: any = (new Date() as any).toISOString();
        if (action === 'list')
            return { templates: d.templates, items: d.items } as any;
        if (action === 'save_template') {
            if (!manager())
                throw Error('Workflow management access is required.');
            let t: any = d.templates.find((t?: any): any => t.id === p.id);
            if (t && t.version !== p.version)
                throw Error('Workflow changed. Reload before editing.');
            if (!t && p.clientId) {
                t = d.templates.find((x?: any): any => x.client_id === p.clientId);
                if (t) {
                    if (t.name !== p.name || t.description !== p.description || JSON.stringify(t.definition) !== JSON.stringify(p.definition))
                        throw Error('This workflow was already created with different content. Refresh before editing.');
                    return t;
                }
            }
            if (t)
                Object.assign(t, { name: p.name, description: p.description, definition: p.definition, version: t.version + 1, updated_at: now } as any);
            else {
                t = { id: crypto.randomUUID(), client_id: p.clientId, name: p.name, description: p.description, definition: p.definition, active: false, version: 1, updated_at: now } as any;
                d.templates.push(t);
            }
            SuiteStore.persist();
            return t;
        }
        if (action === 'set_active') {
            const t: any = d.templates.find((t?: any): any => t.id === p.id);
            if (!manager() || !t || t.version !== p.version)
                throw Error('Workflow changed. Reload before editing.');
            t.active = p.active;
            t.version++;
            SuiteStore.persist();
            return t;
        }
        if (action === 'submit') {
            let i: any = d.items.find((x?: any): any => x.client_id === p.clientId);
            if (i)
                return i;
            const t: any = d.templates.find((t?: any): any => t.id === p.templateId && t.active);
            if (!t || !canUse())
                throw Error('Workflow unavailable.');
            i = { id: crypto.randomUUID(), template_id: t.id, definition: structuredClone(t.definition), answers: p.answers, title: t.name, requester_id: CURRENT_USER_ID, requester_person_id: CURRENT_USER_ID, status: 'pending', step_index: 0, due_at: (new Date(Date.now() + (Number(t.definition.steps[0].dueDays ?? 2)) * 86400000) as any).toISOString(), version: 1, history: [{ action: 'submitted', by: CURRENT_USER_ID, at: now } as any], created_at: now, updated_at: now, client_id: p.clientId } as any;
            d.items.push(i);
            SuiteStore.persist();
            return i;
        }
        const i: any = d.items.find((x?: any): any => x.id === p.id);
        if (!i || i.version !== p.version || i.status !== 'pending')
            throw Error('Request changed. Reload before deciding.');
        if (action === 'cancel') {
            if (i.requester_id !== CURRENT_USER_ID && !manager())
                throw Error('Only the requester can cancel.');
            i.status = 'cancelled';
        }
        else {
            const role: any = i.definition.steps[i.step_index].roleId;
            if (!manager() && (!canApprove() || !actualRoles().includes(role)))
                throw Error('This approval is assigned to another role.');
            if (action === 'reject')
                i.status = 'rejected';
            else if (++i.step_index >= i.definition.steps.length)
                i.status = 'approved';
        }
        i.due_at = i.status === 'pending' ? (new Date(Date.now() + (Number(i.definition.steps[i.step_index].dueDays ?? 2)) * 86400000) as any).toISOString() : null;
        i.version++;
        i.updated_at = now;
        i.history.push({ action, by: CURRENT_USER_ID, at: now, note: p.note || '' } as any);
        SuiteStore.persist();
        return i;
    }
    async function refresh(force: any = false): Promise<any> {
        const k: any = key();
        if (cache.key !== k)
            cache = { key: k, templates: [], items: [], loaded: false, busy: false, error: '', at: 0 } as any;
        if (cache.busy || (!force && Date.now() - cache.at < 20000))
            return;
        cache.busy = true;
        try {
            const data: any = await call('list');
            if (key() !== k)
                return;
            cache.templates = safeList(data.templates);
            cache.items = safeList(data.items);
            cache.loaded = true;
            cache.error = '';
            cache.at = Date.now();
            if ((document as any).getElementById('view-home')?.classList.contains('active') && !SuiteUX.hasDirty())
                SuiteUX.home();
            else if ((document as any).getElementById('view-workflows')?.classList.contains('active') && !SuiteUX.hasDirty())
                SuiteUX.workflowView();
        }
        catch (e: any) {
            cache.error = e.message;
            cache.at = Date.now();
            console.error('Workflow list failed:', e);
            if (key() === k && (document as any).getElementById('view-workflows')?.classList.contains('active') && !SuiteUX.hasDirty())
                SuiteUX.workflowView();
        }
        finally {
            cache.busy = false;
        }
    }
    function pendingForMe(i?: any): any { return i.status === 'pending' && canApprove() && actualRoles().includes(i.definition?.steps?.[i.step_index]?.roleId); }
    function tasks(): any { return cache.items.filter((i?: any): any => i.status === 'pending' && (i.requester_id === CURRENT_USER_ID || pendingForMe(i))).map((i?: any): any => ({ title: (pendingForMe(i) ? 'Approve: ' : 'Track: ') + i.title, owner: pendingForMe(i) ? 'Approval assigned to you' : 'Submitted by you', due: pendingForMe(i) ? localDate(i.due_at) : '', type: pendingForMe(i) ? 'approvals' : 'mine', consequence: i.definition?.steps?.[i.step_index]?.label || 'Workflow request', action: (): any => { SuiteUX.workflowView(); openItem(i.id); } } as any)); }
    function available(): any { return manager() || canApprove() || canUse(); }
    function renderWorkflows(el?: any): any {
        if (!available()) {
            el.innerHTML = '<div class="empty-state">Workflows are not enabled for your role.</div>';
            return;
        }
        refresh();
        const mine: any = cache.items.filter((i?: any): any => i.requester_id === CURRENT_USER_ID || pendingForMe(i) || manager());
        el.innerHTML = `<div class="work-hero"><div><div class="work-eyebrow">Agency workflows</div><h2>Requests and approvals</h2><p>Submit an agency form, follow its progress, or review the approval step assigned to your role.</p></div></div><div class="panel"><div class="panel-head"><h2>Available workflows</h2>${manager() ? '<button id="newWorkflow" class="btn btn-primary">Build workflow</button>' : ''}</div><div class="panel-body workflow-grid" id="workflowTemplates"></div></div><div class="panel"><div class="panel-head"><h2>Requests</h2><button id="refreshWorkflows" class="btn btn-outline btn-sm">Refresh</button></div><div id="workflowItems"></div></div>${cache.error ? `<p role="alert" class="field-error">${esc(cache.error)}</p>` : ''}`;
        if (manager())
            el.querySelector('#newWorkflow').onclick = (): any => editTemplate();
        el.querySelector('#refreshWorkflows').onclick = (): any => refresh(true);
        const tb: any = el.querySelector('#workflowTemplates');
        for (const t of cache.templates) {
            const card: any = (document as any).createElement('div');
            card.className = 'panel workflow-card';
            card.innerHTML = `<h3>${esc(t.name)}</h3><p>${esc(t.description || 'Agency request')}</p><small>${t.definition?.fields?.length || 0} fields · ${t.definition?.steps?.length || 0} approval steps · ${t.active ? 'Active' : 'Draft'}</small><div class="workflow-actions"></div>`;
            const actions: any = card.querySelector('.workflow-actions');
            if (t.active && canUse())
                addButton(actions, 'Start', (): any => startCase(t), 'btn btn-primary btn-sm');
            if (manager()) {
                addButton(actions, 'Edit', (): any => editTemplate(t));
                addButton(actions, t.active ? 'Pause' : 'Activate', (): any => toggleTemplate(t));
            }
            tb.append(card);
        }
        if (!cache.templates.length)
            tb.innerHTML = `<p>${cache.loaded ? 'No workflows are available yet.' : cache.error ? 'Could not load workflows. Use Refresh to retry.' : 'Loading workflows…'}</p>`;
        const ib: any = el.querySelector('#workflowItems');
        for (const i of mine) {
            const row: any = (document as any).createElement('div');
            row.className = 'work-item';
            row.innerHTML = `<div class="work-priority ${pendingForMe(i) && localDate(i.due_at) < date() ? 'urgent' : ''}"></div><div><h3>${esc(i.title)}</h3><p>${esc(i.status)} · ${esc(i.requester_person_id === CURRENT_USER_ID ? 'You' : personName(i.requester_person_id))} · ${esc(i.definition?.steps?.[i.step_index]?.label || 'Decision recorded')}</p><small>${esc(SuiteUX.displayInstant(i.updated_at))}${i.status === 'pending' && i.due_at ? ' · Due ' + esc(SuiteUX.displayInstant(i.due_at)) : ''}</small></div>`;
            addButton(row, pendingForMe(i) ? 'Review' : 'Details', (): any => openItem(i.id));
            ib.append(row);
        }
        if (!mine.length)
            ib.innerHTML = '<div class="panel-body">No requests to show.</div>';
    }
    function addButton(parent?: any, label?: any, handler?: any, cls: any = 'btn btn-outline btn-sm'): any { const b: any = (document as any).createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.onclick = handler; parent.append(b); return b; }
    function modal(title?: any, body?: any, footer?: any): any { const box: any = (document as any).getElementById('modalBox'); box.className = 'modal modal-xl'; box.innerHTML = `<div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" id="workflowClose" aria-label="Close">×</button></div><div class="modal-body">${body}<p class="field-error" id="workflowError" role="alert"></p></div><div class="modal-foot" id="workflowFooter"></div>`; SuiteUX.openModal(); box.querySelector('#workflowClose').onclick = (): any => SuiteUX.closeModal(); footer(box.querySelector('#workflowFooter'), box); return box; }
    async function run(action?: any, payload?: any, button?: any): Promise<any> { if (button)
        button.disabled = true; try {
        await call(action, payload);
        SuiteUX.clearDirty();
        SuiteUX.closeModal();
        cache.at = 0;
        await refresh(true);
        toast('Workflow saved.');
    }
    catch (e: any) {
        (document as any).getElementById('workflowError').textContent = e.message;
        if (button)
            button.disabled = false;
    } }
    function editTemplate(t?: any): any {
        if (!manager())
            return;
        const clientId: any = crypto.randomUUID();
        const roles: any = STATE.roles.filter((r?: any): any => !r.hidden && (r.abilities?.workflow_approve || r.id === 'role_admin'));
        const fields: any = t?.definition?.fields || [{ key: 'details', label: 'Details', type: 'textarea', required: true, options: [] } as any];
        const steps: any = t?.definition?.steps || [{ label: 'Supervisor review', roleId: roles.find((r?: any): any => r.id === 'role_supervisor')?.id || roles[0]?.id } as any];
        const box: any = modal(t ? 'Edit workflow' : 'Build workflow', `<div class="form-row"><label for="wfName">Workflow name</label><input id="wfName" maxlength="100" value="${esc(t?.name || '')}"></div><div class="form-row"><label for="wfDescription">Description</label><input id="wfDescription" maxlength="600" value="${esc(t?.description || '')}"></div><h4>Form fields</h4><p class="hint">Add the information the requester must supply. Field identifiers are preserved while a workflow is edited.</p><div id="wfFields"></div><button type="button" class="btn btn-outline btn-sm" id="wfAddField">Add field</button><h4>Approval route</h4><p class="hint">Each step goes to members of the selected role who have the Approve workflows ability.</p><div id="wfSteps"></div><button type="button" class="btn btn-outline btn-sm" id="wfAddStep">Add step</button>`, (foot?: any): any => { addButton(foot, 'Cancel', (): any => SuiteUX.closeModal()); addButton(foot, 'Save draft', save, 'btn btn-primary'); });
        const fieldBox: any = box.querySelector('#wfFields'), stepBox: any = box.querySelector('#wfSteps');
        function addField(f: any = {} as any): any { const row: any = (document as any).createElement('div'); row.className = 'workflow-builder-row'; row.innerHTML = `<input class="wf-label" aria-label="Field label" placeholder="Field label" maxlength="80" value="${esc(f.label || '')}"><select class="wf-type" aria-label="Field type">${['text', 'textarea', 'date', 'number', 'select'].map((x?: any): any => `<option value="${x}" ${f.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select><input class="wf-options" aria-label="Select options" placeholder="Options, separated by commas" value="${esc((f.options || []).join(', '))}"><label><input class="wf-required" type="checkbox" ${f.required ? 'checked' : ''}> Required</label><button type="button" class="btn btn-outline btn-sm wf-remove">Remove</button>`; row.dataset.key = f.key || ''; row.querySelector('.wf-remove').onclick = (): any => row.remove(); fieldBox.append(row); }
        function addStep(s: any = {} as any): any { const row: any = (document as any).createElement('div'); row.className = 'workflow-builder-row'; row.innerHTML = `<input class="wf-step-label" aria-label="Step name" placeholder="Approval step" maxlength="80" value="${esc(s.label || '')}"><select class="wf-role" aria-label="Approver role">${roles.map((r?: any): any => `<option value="${esc(r.id)}" ${s.roleId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select><label>Due in days <input class="wf-due" type="number" min="0" max="90" value="${Number(s.dueDays ?? 2)}" style="width:65px"></label><button type="button" class="btn btn-outline btn-sm wf-remove">Remove</button>`; row.querySelector('.wf-remove').onclick = (): any => row.remove(); stepBox.append(row); }
        fields.forEach(addField);
        steps.forEach(addStep);
        box.querySelector('#wfAddField').onclick = (): any => addField();
        box.querySelector('#wfAddStep').onclick = (): any => addStep();
        function save(): any {
            const name: any = box.querySelector('#wfName').value.trim(), description: any = box.querySelector('#wfDescription').value.trim();
            const used: any = new Set();
            const f: any = [...fieldBox.children].map((r?: any, index?: any): any => { const label: any = r.querySelector('.wf-label').value.trim(), type: any = r.querySelector('.wf-type').value; let key: any = r.dataset.key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36); if (!/^[a-z]/.test(key))
                key = 'field_' + index; while (used.has(key))
                key = key.replace(/_\d+$/, '') + '_' + index; used.add(key); return { key, label, type, required: r.querySelector('.wf-required').checked, options: type === 'select' ? r.querySelector('.wf-options').value.split(',').map((x?: any): any => x.trim()).filter(Boolean) : [] } as any; });
            const s: any = [...stepBox.children].map((r?: any): any => ({ label: r.querySelector('.wf-step-label').value.trim(), roleId: r.querySelector('.wf-role').value, dueDays: Number(r.querySelector('.wf-due').value) } as any));
            if (name.length < 3 || !f.length || f.length > 20 || f.some((x?: any): any => !x.label || (x.type === 'select' && !x.options.length)) || !s.length || s.length > 8 || s.some((x?: any): any => !x.label || !x.roleId || !Number.isInteger(x.dueDays) || x.dueDays < 0 || x.dueDays > 90)) {
                box.querySelector('#workflowError').textContent = 'Add a name, valid fields, and at least one approval step with a deadline of 0 to 90 days.';
                return;
            }
            run('save_template', { id: t?.id, version: t?.version, clientId, name, description, definition: { fields: f, steps: s } as any } as any, box.querySelector('.modal-foot .btn-primary'));
        }
    }
    async function toggleTemplate(t?: any): Promise<any> { try {
        await call('set_active', { id: t.id, version: t.version, active: !t.active } as any);
        cache.at = 0;
        await refresh(true);
        toast(t.active ? 'Workflow paused.' : 'Workflow activated.');
    }
    catch (e: any) {
        toast(e.message, true);
    } }
    function startCase(t?: any): any {
        if (!canUse())
            return;
        const fields: any = t.definition.fields;
        let clientId: any = crypto.randomUUID();
        const box: any = modal(t.name, `<p>${esc(t.description || 'Complete the form and submit it for approval.')}</p>${fields.map((f?: any): any => `<div class="form-row"><label for="wfAnswer_${esc(f.key)}">${esc(f.label)}${f.required ? ' *' : ''}</label>${f.type === 'textarea' ? `<textarea id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}" maxlength="2000"></textarea>` : f.type === 'select' ? `<select id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}"><option value="">Choose…</option>${f.options.map((o?: any): any => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>` : `<input id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" maxlength="2000">`}</div>`).join('')}`, (foot?: any): any => { addButton(foot, 'Cancel', (): any => SuiteUX.closeModal()); addButton(foot, 'Submit request', submit, 'btn btn-primary'); });
        function submit(): any { const answers: any = Object.fromEntries([...box.querySelectorAll('[data-answer]')].map((x?: any): any => [x.dataset.answer, x.value.trim()])); if (fields.some((f?: any): any => f.required && !answers[f.key])) {
            box.querySelector('#workflowError').textContent = 'Complete every required field.';
            return;
        } run('submit', { templateId: t.id, answers, clientId } as any, box.querySelector('.modal-foot .btn-primary')); }
    }
    function openItem(id?: any): any {
        const i: any = cache.items.find((x?: any): any => x.id === id);
        if (!i)
            return;
        const step: any = i.definition?.steps?.[i.step_index], review: any = pendingForMe(i) || manager();
        const box: any = modal(i.title, `<p><strong>Status:</strong> ${esc(i.status)} · <strong>Submitted:</strong> ${esc(SuiteUX.displayInstant(i.created_at))}</p><h4>Request details</h4>${safeList(i.definition?.fields).map((f?: any): any => `<div class="readiness-line"><strong>${esc(f.label)}</strong><span>${esc(String(i.answers?.[f.key] || 'Not supplied'))}</span></div>`).join('')}<h4>Approval route</h4><ol>${safeList(i.definition?.steps).map((s?: any, n?: any): any => `<li>${esc(s.label)} · ${esc(STATE.roles.find((r?: any): any => r.id === s.roleId)?.name || s.roleId)} ${i.status === 'pending' && n === i.step_index ? '(current)' : ''}</li>`).join('')}</ol><h4>History</h4>${safeList(i.history).map((h?: any): any => `<p>${esc(h.action)} · ${esc(SuiteUX.displayInstant(h.at))}${h.note ? ' · ' + esc(h.note) : ''}</p>`).join('')}${i.status === 'pending' && review ? '<div class="form-row"><label for="wfDecisionNote">Decision note</label><textarea id="wfDecisionNote" maxlength="500"></textarea></div>' : ''}`, (foot?: any): any => { addButton(foot, 'Close', (): any => SuiteUX.closeModal()); if (i.status === 'pending' && i.requester_id === CURRENT_USER_ID)
            addButton(foot, 'Cancel request', (): any => run('cancel', { id: i.id, version: i.version } as any, box.querySelector('.modal-foot .btn-outline:last-child'))); if (i.status === 'pending' && review) {
            addButton(foot, 'Reject', (): any => decide('reject'));
            addButton(foot, 'Approve', (): any => decide('approve'), 'btn btn-primary');
        } });
        function decide(action?: any): any { run(action, { id: i.id, version: i.version, note: box.querySelector('#wfDecisionNote')?.value.trim() || '' } as any, box.querySelector('.modal-foot .btn-primary')); }
    }
    (document as any).addEventListener('visibilitychange', (): any => { if (!(document as any).hidden && CURRENT_USER_ID && available())
        refresh(true); });
    (window as any).addEventListener('online', (): any => { if (CURRENT_USER_ID && available())
        refresh(true); });
    return { readiness, readinessTasks, renderReadiness, renderWorkflows, refresh, tasks, available, openItem } as any;
})();
