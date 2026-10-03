const FieldTraining: any = ((): any => {
    const esc: any = escapeHtml, today: any = (): any => (new Date() as any).toLocaleDateString('en-CA'), states: any = { draft: 'Draft', supervisor_review: 'Supervisor review', trainee_ack: 'Trainee acknowledgment', acknowledged: 'Acknowledged', disputed: 'Trainee response recorded', returned: 'Returned for correction' } as any;
    const defaultTemplate: any = (model?: any): any => ({ ratingScale: model === 'reno' ? [{ id: 'not_observed', label: 'Not observed' } as any, { id: 'needs_improvement', label: 'Needs coaching' } as any, { id: 'developing', label: 'Developing' } as any, { id: 'meets_standard', label: 'Meets standard' } as any, { id: 'exceeds_standard', label: 'Exceeds standard' } as any] : [{ id: 'not_observed', label: 'Not observed' } as any, ...[1, 2, 3, 4, 5, 6, 7].map((n?: any): any => ({ id: String(n), label: String(n) } as any))], phases: model === 'reno' ? ['Non-emergency response', 'Emergency response', 'Patrol activities', 'Criminal investigation'] : ['Orientation', 'Phase 1', 'Phase 2', 'Phase 3', 'Final evaluation'], categories: (model === 'reno' ? ['Officer safety', 'Communication', 'Critical thinking', 'Problem solving', 'Community engagement', 'Report writing', 'Legal authority', 'Ethics'] : ['Officer safety', 'Driving', 'Radio use', 'Investigations', 'Report writing', 'Legal knowledge', 'Decision making', 'Community relations', 'Professional conduct']).map((label?: any, i?: any): any => ({ id: 'category_' + (i + 1), label } as any)), items: (model === 'reno' ? ['Learning matrix', 'Problem based exercise', 'Neighborhood portfolio', 'Weekly coaching', 'Trainee journal'] : ['Orientation checklist', 'Policy review', 'Traffic stops', 'Calls for service', 'Report completion', 'Remedial training']).map((label?: any, i?: any): any => ({ id: 'item_' + (i + 1), label } as any)) } as any);
    let actorId: any = null;
    let cache: any = { key: '', loaded: false, busy: false, config: null, members: [], enrollments: [], reports: [], coverage: [], shifts: [], attachments: [], error: '' } as any;
    const context: any = (): any => SuiteStore.remoteContext(), key: any = (): any => { const c: any = context(); return `${c.tenantId}/${c.agencyId}/${actorId}`; };
    const manage: any = (): any => SuiteUX.isAdmin() || can('ft_manage'), coverManage: any = (): any => manage() || can('ft_assign_cover'), available: any = (): any => SuiteStore.mode() === 'shared' && (manage() || can('ft_participate'));
    const name: any = (id?: any): any => STATE.personnel.find((p?: any): any => p.id === id || p.id === 'person_' + String(id).replaceAll('-', ''))?.name || cache.members.find((m?: any): any => m.user_id === id || m.person_id === id)?.display_name || 'Staff member';
    const memberName: any = (user?: any): any => { const m: any = cache.members.find((x?: any): any => x.user_id === user); return m ? m.display_name || name(m.person_id) : name(user); };
    const humanDate: any = (x?: any): any => SuiteUX.displayDate(x || ''), instant: any = (x?: any): any => SuiteUX.displayInstant(x);
    async function call(action?: any, payload: any = {} as any): Promise<any> { const c: any = context(); if (!c.tenantId || !c.agencyId)
        throw Error('Choose an agency first.'); const { data, error }: any = await backendClient.rpc('suite_ft_api', { p_action: action, p_tenant_id: c.tenantId, p_agency_id: c.agencyId, p_payload: payload } as any); if (error)
        throw Error(error.message || 'Field Training request failed'); return data; }
    async function load(force: any = false): Promise<any> { if (!available())
        return; const userResult: any = await backendClient.auth.getUser(); actorId = userResult.data?.user?.id || null; if (!actorId)
        return; const k: any = key(); if (cache.key !== k)
        cache = { key: k, loaded: false, busy: false, config: null, members: [], enrollments: [], reports: [], coverage: [], shifts: [], attachments: [], error: '' } as any; if (cache.busy || (!force && cache.loaded))
        return; cache.busy = true; try {
        const data: any = await call('list');
        if (key() !== k)
            return;
        Object.assign(cache, { ...data, loaded: true, error: '' } as any);
        if ((document as any).getElementById('view-fieldtraining')?.classList.contains('active'))
            render((document as any).getElementById('view-fieldtraining'));
        else if ((document as any).getElementById('view-home')?.classList.contains('active') && !SuiteUX.hasDirty())
            SuiteUX.home();
    }
    catch (e: any) {
        cache.error = e.message;
        cache.loaded = false;
        const el: any = (document as any).getElementById('view-fieldtraining');
        if (el?.classList.contains('active'))
            render(el);
    }
    finally {
        cache.busy = false;
    } }
    function button(host?: any, text?: any, fn?: any, cls: any = 'btn btn-outline btn-sm'): any { const b: any = (document as any).createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; b.onclick = fn; host.append(b); return b; }
    function modal(title?: any, html?: any, actions?: any): any { const box: any = (document as any).getElementById('modalBox'); box.className = 'modal modal-xl'; box.innerHTML = `<div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" aria-label="Close">×</button></div><div class="modal-body">${html}<p class="field-error" role="alert" data-ft-error></p></div><div class="modal-foot" data-ft-actions></div>`; SuiteUX.openModal(); box.querySelector('.modal-close').onclick = (): any => SuiteUX.closeModal(); button(box.querySelector('[data-ft-actions]'), 'Close', (): any => SuiteUX.closeModal()); actions?.(box, box.querySelector('[data-ft-actions]')); return box; }
    function fail(box?: any, e?: any): any { box.querySelector('[data-ft-error]').textContent = e.message || String(e); }
    async function mutate(action?: any, payload?: any, box?: any, b?: any): Promise<any> { if (b)
        b.disabled = true; try {
        await call(action, payload);
        SuiteUX.closeModal();
        await load(true);
        toast('Field Training record saved.');
    }
    catch (e: any) {
        fail(box, e);
        if (b)
            b.disabled = false;
    } }
    function tasks(): any { if (!available() || !cache.loaded)
        return []; const reportTasks: any = cache.reports.filter((r?: any): any => r.status === 'supervisor_review' && r.supervisor_user === actorId || r.status === 'trainee_ack' && r.trainee_user === actorId || r.status === 'returned' && r.trainer_user === actorId).map((r?: any): any => ({ title: (r.status === 'supervisor_review' ? 'Review' : r.status === 'trainee_ack' ? 'Acknowledge' : 'Revise') + ' field training ' + r.kind + ' report', owner: memberName(r.trainee_user), due: r.period_end, type: r.status === 'supervisor_review' ? 'approvals' : 'mine', action: (): any => { SuiteUX.fieldTrainingView(); setTimeout((): any => openReport(r.id), 0); } } as any)); const covers: any = (cache.coverage || []).filter((c?: any): any => c.cover_user === actorId && !c.cancelled_at && c.end_on >= today()).map((c?: any): any => ({ title: 'Cover Field Training · ' + name(cache.enrollments.find((e?: any): any => e.id === c.enrollment_id)?.trainee_person), owner: 'Assigned coverage', due: c.start_on, type: 'mine', action: (): any => { SuiteUX.fieldTrainingView(); setTimeout((): any => openFile(c.enrollment_id), 0); } } as any)); return reportTasks.concat(covers); }
    function render(el?: any): any {
        if (!available()) {
            el.innerHTML = '<div class="empty-state">Field Training is not enabled for this role.</div>';
            return;
        }
        if (!cache.loaded) {
            el.innerHTML = `<div class="work-hero"><div><h2>Field Training</h2><p>${esc(cache.error || 'Loading the agency program…')}</p></div></div><button id="ftRetry" class="btn btn-outline">Retry</button>`;
            el.querySelector('#ftRetry').onclick = (): any => load(true);
            load();
            return;
        }
        const active: any = cache.enrollments.filter((e?: any): any => ['active', 'extended'].includes(e.status)), due: any = cache.reports.filter((r?: any): any => ['supervisor_review', 'trainee_ack', 'returned'].includes(r.status));
        el.innerHTML = `<div class="work-hero"><div><div class="work-eyebrow">Training and evaluation</div><h2>Field Training</h2><p>${cache.config ? esc(cache.config.model === 'reno' ? 'Reno style PTO program' : 'San Jose style FTO program') : 'Set up an agency program to begin'} · trainee files, evaluations and program outcomes</p></div></div><div class="work-metrics"><div class="work-metric good"><span>Active trainees</span><strong>${active.length}</strong></div><div class="work-metric"><span>Reports</span><strong>${cache.reports.length}</strong></div><div class="work-metric urgent"><span>Awaiting action</span><strong>${due.length}</strong></div><div class="work-metric"><span>Completed</span><strong>${cache.enrollments.filter((e?: any): any => e.status === 'completed').length}</strong></div></div><div class="panel"><div class="panel-head"><h2>Trainee files</h2><div id="ftActions"></div></div><div id="ftFiles"></div></div><div class="panel"><div class="panel-head"><h2>Field Training analytics</h2><div class="hint">Filters and exports use the files you are authorized to view.</div></div><div class="panel-body" id="ftStats"></div></div>`;
        const a: any = el.querySelector('#ftActions');
        button(a, 'Refresh', (): any => load(true));
        if (manage()) {
            button(a, 'Program setup', setup);
            if (cache.config)
                button(a, 'Enroll trainee', enroll, 'btn btn-primary btn-sm');
        }
        const files: any = el.querySelector('#ftFiles');
        for (const e of cache.enrollments) {
            const rs: any = cache.reports.filter((r?: any): any => r.enrollment_id === e.id), phase: any = e.template?.phases?.[e.phase_index]?.name || 'Phase';
            const row: any = (document as any).createElement('div');
            row.className = 'work-item';
            row.innerHTML = `<div class="work-priority ${rs.some((r?: any): any => r.status === 'returned' || r.status === 'disputed') ? 'urgent' : ''}"></div><div><h3>${esc(name(e.trainee_person))}</h3><p>${esc(e.model === 'reno' ? 'Reno PTO' : 'San Jose FTO')} · ${esc(phase)} · ${esc(e.status)} · ${rs.length} reports</p><small>Started ${esc(humanDate(e.started_on))} · Trainer: ${esc(memberName(e.trainer_user))}</small></div>`;
            button(row, 'Open file', (): any => openFile(e.id));
            button(row, 'Download file PDF', (): any => exportFilePdf(e.id));
            files.append(row);
        }
        if (!cache.enrollments.length)
            files.innerHTML = '<div class="panel-body">No trainees enrolled. Configure the program, then enroll the first trainee.</div>';
        renderStats(el.querySelector('#ftStats'));
    }
    function editableRows(host?: any, items?: any, label?: any): any { host.innerHTML = ''; for (const x of items) {
        const row: any = (document as any).createElement('div');
        row.className = 'workflow-builder-row';
        row.dataset.id = x.id || '';
        row.innerHTML = `<input aria-label="${esc(label)}" value="${esc(x.label || x.name)}" maxlength="120"><button type="button" class="btn btn-outline btn-sm">Remove</button>`;
        row.querySelector('button').onclick = (): any => row.remove();
        host.append(row);
    } }
    function setup(): any {
        if (!manage())
            return;
        const cfg: any = cache.config, box: any = modal('Agency Field Training program', `<p>Choose the evaluation model and tailor its terms. Existing trainee files retain the version they started with.</p><div class="form-row"><label>Program model</label><select id="ftModel"><option value="san_jose">San Jose style · daily observations</option><option value="reno">Reno style · weekly coaching</option></select></div><h4>Phases</h4><div id="ftPhases"></div><button class="btn btn-outline btn-sm" id="ftAddPhase">Add phase</button><h4>Rating choices</h4><p class="hint">Rename labels to match your agency manual. Existing reports keep their original choices.</p><div id="ftRatings"></div><h4>Evaluation categories</h4><div id="ftCategories"></div><button class="btn btn-outline btn-sm" id="ftAddCategory">Add category</button><h4>Documentation items and competencies</h4><div id="ftItems"></div><button class="btn btn-outline btn-sm" id="ftAddItem">Add item</button>`, (box?: any, foot?: any): any => button(foot, 'Save program', save, 'btn btn-primary'));
        const model: any = box.querySelector('#ftModel');
        model.value = cfg?.model || 'san_jose';
        let draft: any = { ...(cfg?.template || defaultTemplate(model.value)), model: model.value } as any;
        function fill(t?: any): any { editableRows(box.querySelector('#ftPhases'), t.phases.map((x?: any, i?: any): any => ({ id: x.id || 'phase_' + (i + 1), name: x.name } as any)), 'Phase name'); editableRows(box.querySelector('#ftRatings'), t.ratingScale || defaultTemplate(model.value).ratingScale, 'Rating label'); editableRows(box.querySelector('#ftCategories'), t.categories, 'Category name'); editableRows(box.querySelector('#ftItems'), t.items, 'Documentation item'); }
        fill(draft);
        model.onchange = (): any => { if (!confirm('Use the new model for future enrollments? Existing trainee files will retain their original model.')) {
            model.value = draft.model;
            return;
        } draft = { ...defaultTemplate(model.value), model: model.value } as any; fill(draft); };
        for (const [id, target, prefix] of [['#ftAddPhase', '#ftPhases', 'phase'], ['#ftAddCategory', '#ftCategories', 'category'], ['#ftAddItem', '#ftItems', 'item']])
            box.querySelector(id).onclick = (): any => { const host: any = box.querySelector(target); const row: any = (document as any).createElement('div'); row.className = 'workflow-builder-row'; row.dataset.id = prefix + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16); row.innerHTML = `<input aria-label="New ${prefix}" maxlength="120" placeholder="Name"><button class="btn btn-outline btn-sm">Remove</button>`; row.querySelector('button').onclick = (): any => row.remove(); host.append(row); row.querySelector('input').focus(); };
        function save(): any { const get: any = (sel?: any): any => [...box.querySelector(sel).children].map((r?: any): any => ({ id: r.dataset.id, label: r.querySelector('input').value.trim() } as any)); const phases: any = get('#ftPhases').map((x?: any): any => ({ id: x.id, name: x.label } as any)), ratingScale: any = get('#ftRatings'), categories: any = get('#ftCategories'), items: any = get('#ftItems'); if (!phases.length || !categories.length || !items.length || ratingScale.length < 2 || [...phases, ...ratingScale, ...categories, ...items].some((x?: any): any => !(x.label || x.name))) {
            fail(box, Error('Add at least one phase and category, and name every item.'));
            return;
        } mutate('save_config', { model: model.value, version: cfg?.version, template: { phases, ratingScale, categories, items } as any } as any, box, box.querySelector('.modal-foot .btn-primary')); }
    }
    function eligibleTrainers(): any { return cache.members.filter((m?: any): any => (m.role_ids || []).some((id?: any): any => id === 'role_admin' || id === 'role_platform_admin' || STATE.roles.find((r?: any): any => r.id === id)?.abilities?.ft_train)); }
    function enroll(): any { if (!manage() || !cache.config)
        return; const opts: any = cache.members.map((m?: any): any => `<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join(''); const trainers: any = eligibleTrainers().map((m?: any): any => `<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join(''); const box: any = modal('Enroll trainee', `<div class="form-row"><label>Trainee</label><select id="ftTrainee">${opts}</select></div><div class="form-row"><label>Assigned trainer</label><select id="ftTrainer">${trainers}</select></div><div class="form-row"><label>Assigned supervisor</label><select id="ftSupervisor">${opts}</select></div><div class="form-row"><label>Start date</label><input type="date" id="ftStart" value="${today()}"></div>`, (box?: any, foot?: any): any => button(foot, 'Enroll trainee', save, 'btn btn-primary')); function save(): any { const ids: any = ['ftTrainee', 'ftTrainer', 'ftSupervisor'].map((id?: any): any => box.querySelector('#' + id).value); if (new Set(ids).size !== 3) {
        fail(box, Error('Choose three different people.'));
        return;
    } mutate('enroll', { traineeUser: ids[0], trainerUser: ids[1], supervisorUser: ids[2], startedOn: box.querySelector('#ftStart').value } as any, box, box.querySelector('.modal-foot .btn-primary')); } }
    async function openPerson(personId?: any): Promise<any> { await load(); const e: any = cache.enrollments.find((x?: any): any => x.trainee_person === personId); SuiteUX.fieldTrainingView(); if (e)
        openFile(e.id);
    else
        toast('No accessible Field Training file for this employee.', true); }
    function openFile(id?: any): any {
        const e: any = cache.enrollments.find((x?: any): any => x.id === id);
        if (!e)
            return;
        const rs: any = cache.reports.filter((r?: any): any => r.enrollment_id === id), phase: any = e.template.phases[e.phase_index]?.name || 'Phase';
        const box: any = modal(name(e.trainee_person) + ' · Field Training file', `<p><strong>${esc(e.model === 'reno' ? 'Reno PTO' : 'San Jose FTO')}</strong> · ${esc(phase)} · ${esc(e.status)} · template version ${e.template_version}</p><p>Trainer: ${esc(memberName(e.trainer_user))} · Supervisor: ${esc(memberName(e.supervisor_user))}</p><div id="ftFileActions"></div><h4>Coverage assignments</h4><div id="ftCoverage"></div><h4>Training shifts</h4><div id="ftShifts"></div><h4>Evaluation timeline</h4><div id="ftTimeline"></div>`, (box?: any, foot?: any): any => { });
        const acts: any = box.querySelector('#ftFileActions');
        if (e.status === 'active' || e.status === 'extended') {
            if (actorId === e.trainer_user || manage())
                button(acts, 'Create evaluation', (): any => newReport(e), 'btn btn-primary btn-sm');
            if (actorId === e.supervisor_user || manage())
                button(acts, 'Phase decision', (): any => phaseDecision(e));
            if (manage())
                button(acts, 'Reassign trainer / supervisor', (): any => reassign(e));
            if (manage() || (coverManage() && actorId === e.supervisor_user))
                button(acts, 'Arrange coverage', (): any => coverageEditor(e));
            if (manage() || actorId === e.supervisor_user || actorId === e.trainer_user || (cache.coverage || []).some((c?: any): any => c.enrollment_id === e.id && c.cover_user === actorId && !c.cancelled_at))
                button(acts, 'Log training shift', (): any => shiftEditor(e));
            button(acts, 'Download file PDF', (): any => exportFilePdf(e.id));
            if ((cache.coverage || []).some((c?: any): any => c.enrollment_id === e.id && c.cover_user === actorId && !c.cancelled_at))
                button(acts, 'Document covered shift', (): any => newReport(e));
        }
        const coverList: any = box.querySelector('#ftCoverage');
        for (const c of (cache.coverage || []).filter((x?: any): any => x.enrollment_id === e.id)) {
            const line: any = (document as any).createElement('div');
            line.className = 'readiness-line';
            line.innerHTML = `<span>${esc(memberName(c.cover_user))} · ${esc(humanDate(c.start_on))} to ${esc(humanDate(c.end_on))} · ${esc(c.reason)}${c.cancelled_at ? ' · cancelled' : ''}</span>`;
            coverList.append(line);
        }
        if (!coverList.children.length)
            coverList.textContent = 'No substitute trainer assignments.';
        const shiftList: any = box.querySelector('#ftShifts');
        for (const sh of (cache.shifts || []).filter((x?: any): any => x.enrollment_id === e.id)) {
            const row: any = (document as any).createElement('div');
            row.className = 'readiness-line';
            row.innerHTML = `<span>${esc(humanDate(sh.shift_on))} · ${esc(memberName(sh.trainer_user))} · ${esc(sh.hours)} hours${sh.cancelled_at ? ' · cancelled' : ''}${sh.notes ? ' · ' + esc(sh.notes) : ''}</span>`;
            shiftList.append(row);
        }
        if (!shiftList.children.length)
            shiftList.textContent = 'No training shifts logged. Missing report counts require logged shifts.';
        const timeline: any = box.querySelector('#ftTimeline');
        for (const r of rs) {
            const line: any = (document as any).createElement('div');
            line.className = 'readiness-line';
            line.innerHTML = `<div><strong>${esc(({ daily: 'Daily observation', weekly: e.model === 'reno' ? 'Weekly coaching' : 'Weekly summary', phase: 'End of phase', final: 'End of training', coverage: 'Coverage observation' } as any)[r.kind])}</strong><br><small>${esc(humanDate(r.period_start))} to ${esc(humanDate(r.period_end))} · ${esc(states[r.status])}</small></div>`;
            button(line, 'Open', (): any => openReport(r.id));
            timeline.append(line);
        }
        if (!rs.length)
            timeline.textContent = 'No reports yet.';
    }
    function coverageEditor(e?: any): any { if (!(manage() || (coverManage() && actorId === e.supervisor_user)))
        return; const options: any = eligibleTrainers().filter((m?: any): any => ![e.trainee_user, e.trainer_user, e.supervisor_user].includes(m.user_id)).map((m?: any): any => `<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join(''); const items: any = (cache.coverage || []).filter((c?: any): any => c.enrollment_id === e.id && !c.cancelled_at); const box: any = modal('Substitute trainer coverage', `<p>Assign an eligible FTO or PTO for up to 14 consecutive days. The substitute documents only those dates. The primary trainer remains assigned to the file.</p><div id="ftCoverItems"></div><div class="form-row"><label>Covering trainer</label><select id="ftCoverPerson">${options}</select></div><div class="form-row"><label>From</label><input id="ftCoverFrom" type="date" value="${today()}"></div><div class="form-row"><label>Through</label><input id="ftCoverTo" type="date" value="${today()}"></div><div class="form-row"><label>Reason</label><input id="ftCoverReason" maxlength="500" placeholder="Scheduled day off, sick leave, or reassignment"></div>`, (box?: any, foot?: any): any => button(foot, 'Assign coverage', save, 'btn btn-primary')); const list: any = box.querySelector('#ftCoverItems'); for (const c of items) {
        const row: any = (document as any).createElement('div');
        row.className = 'readiness-line';
        row.innerHTML = `<span>${esc(memberName(c.cover_user))} · ${esc(humanDate(c.start_on))} to ${esc(humanDate(c.end_on))} · ${esc(c.reason)}</span>`;
        button(row, 'Cancel', (): any => mutate('coverage_cancel', { enrollmentId: e.id, coverageId: c.id } as any, box));
        list.append(row);
    } if (!items.length)
        list.textContent = 'No active coverage assignments.'; function save(): any { const coverUser: any = box.querySelector('#ftCoverPerson').value, startOn: any = box.querySelector('#ftCoverFrom').value, endOn: any = box.querySelector('#ftCoverTo').value, reason: any = box.querySelector('#ftCoverReason').value.trim(); if (!coverUser || !startOn || !endOn || reason.length < 3) {
        fail(box, Error('Select a trainer, dates, and a reason.'));
        return;
    } mutate('coverage_add', { enrollmentId: e.id, coverUser, startOn, endOn, reason } as any, box, box.querySelector('.modal-foot .btn-primary')); } }
    function reassign(e?: any): any { if (!manage())
        return; const opts: any = eligibleTrainers().map((m?: any): any => `<option value=\"${esc(m.user_id)}\">${esc(memberName(m.user_id))}</option>`).join(''); const supervisors: any = cache.members.map((m?: any): any => `<option value=\"${esc(m.user_id)}\">${esc(memberName(m.user_id))}</option>`).join(''); const box: any = modal('Reassign training team', `<p>Existing reports retain their original trainer and supervisor signoffs.</p><div class=\"form-row\"><label>Trainer</label><select id=\"ftNewTrainer\">${opts}</select></div><div class=\"form-row\"><label>Supervisor</label><select id=\"ftNewSupervisor\">${supervisors}</select></div>`, (box?: any, foot?: any): any => button(foot, 'Save assignment', save, 'btn btn-primary')); box.querySelector('#ftNewTrainer').value = e.trainer_user; box.querySelector('#ftNewSupervisor').value = e.supervisor_user; function save(): any { const trainer: any = box.querySelector('#ftNewTrainer').value, supervisor: any = box.querySelector('#ftNewSupervisor').value; if (trainer === supervisor || trainer === e.trainee_user || supervisor === e.trainee_user) {
        fail(box, Error('Choose different participants.'));
        return;
    } mutate('reassign', { enrollmentId: e.id, version: e.version, trainerUser: trainer, supervisorUser: supervisor } as any, box, box.querySelector('.btn-primary')); } }
    function newReport(e?: any): any { const assignments: any = (cache.coverage || []).filter((c?: any): any => c.enrollment_id === e.id && c.cover_user === actorId && !c.cancelled_at).sort((a?: any, b?: any): any => b.start_on.localeCompare(a.start_on)); const cover: any = assignments.find((c?: any): any => c.start_on <= today() && c.end_on >= today()) || assignments[0]; const covering: any = actorId !== e.trainer_user && !!cover; const types: any = covering ? (e.model === 'reno' ? ['coverage'] : ['daily', 'coverage']) : (e.model === 'reno' ? ['weekly', 'phase', 'final'] : ['daily', 'weekly', 'phase', 'final']); const chosenDate: any = covering ? (cover.start_on > today() ? cover.start_on : cover.end_on < today() ? cover.end_on : today()) : today(); const box: any = modal('New evaluation', `<div class="form-row"><label>Report type</label><select id="ftKind">${types.map((k?: any): any => `<option value="${k}">${esc(({ daily: 'Daily observation', weekly: e.model === 'reno' ? 'Weekly coaching' : 'Weekly summary', phase: 'End of phase', final: 'End of training', coverage: 'Coverage observation' } as any)[k])}</option>`).join('')}</select></div><div class="form-row"><label>From</label><input type="date" id="ftFrom" value="${chosenDate}"></div><div class="form-row"><label>Through</label><input type="date" id="ftThrough" value="${chosenDate}"></div>`, (box?: any, foot?: any): any => button(foot, 'Create draft', create, 'btn btn-primary')); async function create(): Promise<any> { const b: any = box.querySelector('.btn-primary'); b.disabled = true; try {
        const r: any = await call('new_report', { enrollmentId: e.id, kind: box.querySelector('#ftKind').value, periodStart: box.querySelector('#ftFrom').value, periodEnd: box.querySelector('#ftThrough').value } as any);
        SuiteUX.closeModal();
        await load(true);
        openReport(r.id);
    }
    catch (err: any) {
        fail(box, err);
        b.disabled = false;
    } } }
    function openReport(id?: any): any {
        const r: any = cache.reports.find((x?: any): any => x.id === id), e: any = cache.enrollments.find((x?: any): any => x.id === r?.enrollment_id);
        if (!r || !e)
            return;
        const editable: any = ['draft', 'returned'].includes(r.status) && (actorId === r.trainer_user || manage());
        const ratings: any = r.content?.ratings || {} as any, items: any = r.content?.items || {} as any;
        const box: any = modal(`${({ daily: 'Daily observation', weekly: 'Weekly evaluation', phase: 'End of phase', final: 'End of training', coverage: 'Coverage observation' } as any)[r.kind]} · ${name(e.trainee_person)}`, `<p>${esc(states[r.status])} · ${esc(humanDate(r.period_start))} to ${esc(humanDate(r.period_end))} · ${esc(e.template.phases[r.phase_index]?.name || 'Phase')} · Trainer: ${esc(memberName(r.trainer_user))}</p><h4>Evaluation categories</h4><div class="ft-form-grid">${e.template.categories.map((c?: any): any => `<div class="form-row"><label>${esc(c.label)}</label><select data-ft-rating="${esc(c.id)}" ${editable ? '' : 'disabled'}>${(e.template.ratingScale || defaultTemplate(e.model).ratingScale).map((v?: any): any => `<option value="${esc(v.id)}" ${ratings[c.id] === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>`).join('')}</div><h4>Documentation and competencies</h4><div class="ft-form-grid">${e.template.items.map((c?: any): any => `<div class="form-row"><label>${esc(c.label)}</label><select data-ft-item="${esc(c.id)}" ${editable ? '' : 'disabled'}>${['pending', 'demonstrated', 'remediation'].map((v?: any): any => `<option value="${v}" ${items[c.id] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`).join('')}</div><div class="form-row"><label>Observed conduct, coaching and supporting examples</label><textarea id="ftNarrative" maxlength="12000" rows="8" ${editable ? '' : 'readonly'}>${esc(r.content?.narrative || '')}</textarea></div><div class="form-row"><label>Recommendations and next steps</label><textarea id="ftRecommendation" maxlength="3000" rows="4" ${editable ? '' : 'readonly'}>${esc(r.content?.recommendation || '')}</textarea></div><h4>Attachments</h4><div id="ftAttachments"></div>${editable ? '<div class="form-row"><label>Add file (PDF, image, Word document or text, up to 10 MB)</label><input type="file" id="ftFile" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"></div><div class="form-row"><label>Attachment description</label><input id="ftFileDescription" maxlength="500"></div><button id="ftUpload" class="btn btn-outline btn-sm">Upload attachment</button>' : ''}<h4>Approval history</h4><div>${(r.history || []).map((h?: any): any => `<p>${esc(h.action)} · ${esc(instant(h.at))}${h.note ? ' · ' + esc(h.note) : ''}</p>`).join('')}</div>${r.status === 'supervisor_review' && actorId === r.supervisor_user ? '<div class="form-row"><label>Review note</label><textarea id="ftReviewNote" maxlength="1000"></textarea></div>' : ''}${r.status === 'trainee_ack' && actorId === r.trainee_user ? '<div class="form-row"><label>Optional response or reason for dispute</label><textarea id="ftReviewNote" maxlength="3000"></textarea></div>' : ''}`, (box?: any, foot?: any): any => { if (editable) {
            button(foot, 'Save draft', save, 'btn btn-outline');
            if (actorId === r.trainer_user)
                button(foot, 'Submit to supervisor', (): any => decide('submit'), 'btn btn-primary');
        } if (r.status === 'supervisor_review' && actorId === r.supervisor_user) {
            button(foot, 'Return', (): any => decide('return'));
            button(foot, 'Approve', (): any => decide('approve'), 'btn btn-primary');
        } if (r.status === 'trainee_ack' && actorId === r.trainee_user) {
            button(foot, 'Dispute', (): any => decide('dispute'));
            button(foot, 'Acknowledge receipt', (): any => decide('acknowledge'), 'btn btn-primary');
        } });
        button(box.querySelector('[data-ft-actions]'), 'Download PDF', (): any => exportReportPdf(r.id));
        const attachments: any = cache.attachments.filter((x?: any): any => x.report_id === r.id), target: any = box.querySelector('#ftAttachments');
        for (const a of attachments) {
            const line: any = (document as any).createElement('div');
            line.className = 'readiness-line';
            line.innerHTML = `<span>${esc(a.file_name)} <small>${esc(a.description || '')}</small></span>`;
            button(line, 'Download', (): any => download(r, a));
            target.append(line);
        }
        if (!attachments.length)
            target.textContent = 'No attachments.';
        if (editable)
            box.querySelector('#ftUpload').onclick = (): any => upload(box, r, content);
        function content(): any { return { ratings: Object.fromEntries([...box.querySelectorAll('[data-ft-rating]')].map((x?: any): any => [x.dataset.ftRating, x.value])), items: Object.fromEntries([...box.querySelectorAll('[data-ft-item]')].map((x?: any): any => [x.dataset.ftItem, x.value])), narrative: box.querySelector('#ftNarrative').value.trim(), recommendation: box.querySelector('#ftRecommendation').value.trim() } as any; }
        function save(): any { mutate('save_report', { reportId: r.id, version: r.version, content: content() } as any, box, box.querySelector('.modal-foot .btn-outline:last-child')); }
        async function decide(action?: any): Promise<any> { const b: any = box.querySelector('.modal-foot .btn-primary'); if (b)
            b.disabled = true; try {
            let version: any = r.version;
            if (action === 'submit') {
                const saved: any = await call('save_report', { reportId: r.id, version, content: content() } as any);
                version = saved.version;
            }
            await call(action, { reportId: r.id, version, note: box.querySelector('#ftReviewNote')?.value.trim() || '' } as any);
            SuiteUX.closeModal();
            await load(true);
            toast('Report ' + (action === 'acknowledge' ? 'acknowledged' : action) + '.');
        }
        catch (err: any) {
            fail(box, err);
            if (b)
                b.disabled = false;
        } }
    }
    async function upload(box?: any, r?: any, content?: any): Promise<any> { const file: any = box.querySelector('#ftFile').files[0]; if (!file) {
        fail(box, Error('Choose a file first.'));
        return;
    } const types: any = { 'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'txt': 'text/plain', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } as any; const ext: any = file.name.split('.').pop().toLowerCase(), type: any = types[ext]; if (!type || file.size > 10485760 || !file.size) {
        fail(box, Error('Choose a supported file up to 10 MB.'));
        return;
    } const b: any = box.querySelector('#ftUpload'); b.disabled = true; try {
        await call('save_report', { reportId: r.id, version: r.version, content: content() } as any);
        const a: any = await call('reserve_attachment', { reportId: r.id, fileName: file.name, contentType: type, byteCount: file.size, description: box.querySelector('#ftFileDescription').value.trim() } as any);
        const uploadResponse: Response = await fetch(a.upload_url, {method:'PUT',body:file,headers:{'Content-Type':type},signal:AbortSignal.timeout(60000)});
        if (!uploadResponse.ok) throw Error('Attachment upload failed.');
        await call('confirm_attachment', { reportId: r.id, attachmentId: a.id } as any);
        SuiteUX.closeModal();
        await load(true);
        openReport(r.id);
        toast('Attachment added.');
    }
    catch (err: any) {
        fail(box, err);
        b.disabled = false;
    } }
    async function download(r?: any, a?: any): Promise<any> { try {
        const meta: any = await call('download', { reportId: r.id, attachmentId: a.id } as any);
        const { data, error }: any = await backendClient.storage.from('suite-field-training').createSignedUrl(meta.object_path, 60, { download: meta.file_name } as any);
        if (error)
            throw Error(error.message);
        (window as any).open(data.signedUrl, '_blank', 'noopener');
    }
    catch (e: any) {
        toast(e.message, true);
    } }
    function phaseDecision(e?: any): any { const box: any = modal('Phase decision · ' + name(e.trainee_person), `<p>Advance only after the end of phase report has supervisor approval. Completing training requires an approved end of training report.</p><div class="form-row"><label>Decision</label><select id="ftOutcome"><option value="next">Advance to next phase</option><option value="extended">Extend current phase</option><option value="completed">Complete training</option><option value="separated">Separate from program</option></select></div>`, (box?: any, foot?: any): any => button(foot, 'Record decision', (): any => mutate('advance', { enrollmentId: e.id, version: e.version, outcome: box.querySelector('#ftOutcome').value } as any, box, box.querySelector('.btn-primary')), 'btn btn-primary')); }
    function shiftEditor(e?: any): any {
        const rows: any = (cache.shifts || []).filter((x?: any): any => x.enrollment_id === e.id && !x.cancelled_at);
        const box: any = modal('Training shifts · ' + name(e.trainee_person), `<p>Log actual training days to measure missing evaluations. A substitute trainer is selected automatically for their assigned dates.</p><div id="ftShiftRows"></div><div class="form-row"><label>Training date</label><input id="ftShiftDate" type="date" value="${today()}"></div><div class="form-row"><label>Hours</label><input id="ftShiftHours" type="number" min="0.25" max="24" step="0.25" value="8"></div><div class="form-row"><label>Trainer for this date</label><strong id="ftShiftTrainer"></strong></div><div class="form-row"><label>Notes</label><input id="ftShiftNotes" maxlength="1000" placeholder="Patrol assignment or training activity"></div>`, (box?: any, foot?: any): any => button(foot, 'Log training shift', save, 'btn btn-primary'));
        const host: any = box.querySelector('#ftShiftRows');
        for (const sh of rows) {
            const row: any = (document as any).createElement('div');
            row.className = 'readiness-line';
            row.innerHTML = `<span>${esc(humanDate(sh.shift_on))} · ${esc(memberName(sh.trainer_user))} · ${esc(sh.hours)} hours</span>`;
            if (manage() || actorId === e.supervisor_user || actorId === sh.recorded_by)
                button(row, 'Void', (): any => mutate('shift_cancel', { enrollmentId: e.id, shiftId: sh.id } as any, box));
            host.append(row);
        }
        if (!rows.length)
            host.textContent = 'No shifts logged yet.';
        function trainer(): any { const day: any = box.querySelector('#ftShiftDate').value, c: any = (cache.coverage || []).find((x?: any): any => x.enrollment_id === e.id && !x.cancelled_at && x.start_on <= day && x.end_on >= day); const user: any = c?.cover_user || e.trainer_user; box.querySelector('#ftShiftTrainer').textContent = memberName(user); return user; }
        box.querySelector('#ftShiftDate').onchange = trainer;
        trainer();
        function save(): any { const shiftOn: any = box.querySelector('#ftShiftDate').value, hours: any = Number(box.querySelector('#ftShiftHours').value); if (!shiftOn || hours < 0.25 || hours > 24) {
            fail(box, Error('Enter a date and 0.25 to 24 hours.'));
            return;
        } mutate('shift_add', { enrollmentId: e.id, shiftOn, hours, trainerUser: trainer(), notes: box.querySelector('#ftShiftNotes').value.trim() } as any, box, box.querySelector('.modal-foot .btn-primary')); }
    }
    const reportKind: any = { daily: 'Daily observation', weekly: 'Weekly evaluation', phase: 'End of phase', final: 'End of training', coverage: 'Coverage observation' } as any;
    const approvedStatus: any = (r?: any): any => ['trainee_ack', 'acknowledged', 'disputed'].includes(r.status);
    const submittedStatus: any = (r?: any): any => ['supervisor_review', 'trainee_ack', 'acknowledged', 'disputed'].includes(r.status);
    const dateOnly: any = (x?: any): any => String(x || '').slice(0, 10);
    const daysBetween: any = (a?: any, b?: any): any => Math.floor(((new Date(dateOnly(b) + 'T12:00:00Z') as any) - (new Date(dateOnly(a) + 'T12:00:00Z') as any)) / 86400000);
    const hoursBetween: any = (a?: any, b?: any): any => a && b ? Math.max(0, Math.round(((new Date(b) as any) - (new Date(a) as any)) / 3600000 * 10) / 10) : null;
    function monday(day?: any): any { const d: any = new Date(day + 'T12:00:00Z') as any; d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); }
    const phaseLabel: any = (e?: any, i?: any): any => e.template?.phases?.[i]?.name || `Phase ${Number(i) + 1}`;
    const ftCsv: any = (rows?: any, filename?: any): any => { if (!rows.length) {
        toast('No matching records to export.', true);
        return;
    } const cols: any = [...new Set(rows.flatMap(Object.keys))], csv: any = [cols.join(','), ...rows.map((row?: any): any => cols.map((k?: any): any => { let v: any = String(row[k] ?? ''); if (/^[=+@\t\r-]/.test(v))
            v = "'" + v; return '"' + v.replaceAll('"', '""') + '"'; }).join(','))].join('\r\n'); const a: any = (document as any).createElement('a'), url: any = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' } as any)); a.href = url; a.download = filename; a.click(); setTimeout((): any => URL.revokeObjectURL(url), 30000); };
    const reportingFilter: any = { model: 'all', outcome: 'all', phase: 'all', type: 'all', status: 'all', trainee: 'all', trainer: 'all', from: '', through: '', view: 'overview', gap: 'all' } as any;
    function reportingData(): any {
        const f: any = reportingFilter, dates: any = (x?: any): any => (!f.from || dateOnly(x) >= f.from) && (!f.through || dateOnly(x) <= f.through);
        const files: any = cache.enrollments.filter((e?: any): any => (f.model === 'all' || e.model === f.model) && (f.outcome === 'all' || e.status === f.outcome) && (f.trainee === 'all' || e.trainee_user === f.trainee));
        const ids: any = new Set(files.map((e?: any): any => e.id)), byId: any = new Map(files.map((e?: any): any => [e.id, e]));
        const reports: any = cache.reports.filter((r?: any): any => ids.has(r.enrollment_id) && dates(r.period_start) && (f.phase === 'all' || String(r.phase_index) === f.phase) && (f.type === 'all' || r.kind === f.type) && (f.status === 'all' || r.status === f.status) && (f.trainer === 'all' || r.trainer_user === f.trainer));
        const shifts: any = (cache.shifts || []).filter((s?: any): any => ids.has(s.enrollment_id) && !s.cancelled_at && dates(s.shift_on) && (f.trainer === 'all' || s.trainer_user === f.trainer) && (f.phase === 'all' || String(s.phase_index) === f.phase));
        const selectedIds: any = new Set([...reports.map((r?: any): any => r.enrollment_id), ...shifts.map((s?: any): any => s.enrollment_id)]);
        return { files: files.filter((e?: any): any => !(f.from || f.through || f.phase !== 'all' || f.type !== 'all' || f.status !== 'all' || f.trainer !== 'all') || selectedIds.has(e.id) || dates(e.started_on)), reports, shifts, byId } as any;
    }
    function complianceRows(data?: any): any {
        const out: any = [];
        for (const e of data.files) {
            const shifts: any = data.shifts.filter((s?: any): any => s.enrollment_id === e.id && s.shift_on <= today());
            const reports: any = cache.reports.filter((r?: any): any => r.enrollment_id === e.id);
            const groups: any = new Map();
            for (const sh of shifts) {
                const period: any = e.model === 'reno' ? monday(sh.shift_on) : sh.shift_on;
                const key: any = [e.id, period, sh.trainer_user, sh.phase_index, !!sh.coverage_id].join('|');
                let row: any = groups.get(key);
                if (!row) {
                    row = { enrollment_id: e.id, trainee: name(e.trainee_person), model: e.model, period, trainer: memberName(sh.trainer_user), trainer_user: sh.trainer_user, phase: phaseLabel(e, sh.phase_index), shifts: 0, hours: 0, kind: e.model === 'reno' ? (sh.coverage_id ? 'PTO coverage observations' : 'Weekly evaluation') : 'Daily / coverage', status: 'Missing', report_id: '', coverage: sh.coverage_id ? 'Yes' : 'No', phase_index: sh.phase_index, days: [] } as any;
                    groups.set(key, row);
                }
                row.shifts++;
                row.hours += Number(sh.hours);
                row.days.push(sh.shift_on);
            }
            for (const row of groups.values()) {
                const eligible: any = reports.filter((r?: any): any => r.trainer_user === row.trainer_user && r.phase_index === row.phase_index);
                const primaryWeekly: any = e.model === 'reno' && row.coverage === 'No';
                const candidate: any = (day?: any): any => eligible.filter((r?: any): any => primaryWeekly ? r.kind === 'weekly' && row.days.every((d?: any): any => r.period_start <= d && r.period_end >= d) : r.period_start === day && (e.model === 'reno' ? r.kind === 'coverage' : r.kind === 'daily' || r.kind === 'coverage'));
                const sets: any = primaryWeekly ? [candidate(row.days[0])] : row.days.map(candidate);
                const allApproved: any = sets.every((rs?: any): any => rs.some(approvedStatus));
                const allSubmitted: any = sets.every((rs?: any): any => rs.some(submittedStatus));
                const anyReport: any = sets.some((rs?: any): any => rs.length);
                row.status = allApproved ? 'Supervisor approved' : allSubmitted ? 'Submitted, awaiting approval' : anyReport ? 'Partial / draft / returned' : (e.model === 'reno' ? daysBetween(row.period, today()) < 7 : row.period === today()) ? 'In progress' : 'Missing';
                row.report_id = sets.flat()[0]?.id || '';
                delete row.days;
                out.push(row);
            }
        }
        return out.sort((a?: any, b?: any): any => b.period.localeCompare(a.period) || a.trainee.localeCompare(b.trainee));
    }
    function metricCells(el?: any, cards?: any): any { el.insertAdjacentHTML('beforeend', `<div class="work-metrics">${cards.map(([label, value]: any): any => `<div class="work-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`); }
    function table(el?: any, head?: any, rows?: any): any { const wrap: any = (document as any).createElement('div'); wrap.style.overflowX = 'auto'; wrap.innerHTML = `<table class="data-table" style="width:100%"><thead><tr>${head.map((h?: any): any => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((row?: any): any => `<tr>${row.map((v?: any): any => `<td>${esc(String(v ?? ''))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}">No matching records.</td></tr>`}</tbody></table>`; el.append(wrap); }
    function exportRows(type?: any, data?: any, gaps?: any): any {
        const { files, reports, shifts, byId }: any = data;
        if (type === 'trainees')
            return files.map((e?: any): any => ({ trainee: name(e.trainee_person), model: e.model, started_on: e.started_on, finished_on: e.finished_on || '', status: e.status, current_phase: phaseLabel(e, e.phase_index), template_version: e.template_version, trainer: memberName(e.trainer_user), supervisor: memberName(e.supervisor_user), logged_shifts: shifts.filter((s?: any): any => s.enrollment_id === e.id).length, training_hours: shifts.filter((s?: any): any => s.enrollment_id === e.id).reduce((n?: any, s?: any): any => n + Number(s.hours), 0), reports: reports.filter((r?: any): any => r.enrollment_id === e.id).length, approved: reports.filter((r?: any): any => r.enrollment_id === e.id && approvedStatus(r)).length, disputed: reports.filter((r?: any): any => r.enrollment_id === e.id && r.status === 'disputed').length } as any));
        if (type === 'evaluations')
            return reports.flatMap((r?: any): any => { const e: any = byId.get(r.enrollment_id); return (e?.template?.categories || []).map((c?: any): any => ({ trainee: name(e.trainee_person), report_id: r.id, report_type: r.kind, report_status: r.status, period_start: r.period_start, period_end: r.period_end, phase: phaseLabel(e, r.phase_index), trainer: memberName(r.trainer_user), supervisor: memberName(r.supervisor_user), coverage: r.coverage_id ? 'Yes' : 'No', category: c.label, rating: r.content?.ratings?.[c.id] || '', documentation: JSON.stringify(r.content?.items || {} as any), attachment_count: cache.attachments.filter((a?: any): any => a.report_id === r.id).length } as any)); });
        if (type === 'gaps')
            return gaps;
        if (type === 'shifts')
            return shifts.map((s?: any): any => ({ trainee: name(byId.get(s.enrollment_id)?.trainee_person), date: s.shift_on, trainer: memberName(s.trainer_user), hours: s.hours, notes: s.notes, logged_at: s.created_at } as any));
        if (type === 'progress')
            return reports.filter(approvedStatus).flatMap((r?: any): any => { const e: any = byId.get(r.enrollment_id); return (e?.template?.categories || []).map((c?: any): any => ({ trainee: name(e.trainee_person), model: e.model, template_version: e.template_version, phase: phaseLabel(e, r.phase_index), date: r.period_start, category: c.label, rating: e.template.ratingScale.find((x?: any): any => x.id === r.content?.ratings?.[c.id])?.label || '', trainer: memberName(r.trainer_user) } as any)); });
        if (type === 'trainers')
            return [...new Set([...reports.map((r?: any): any => r.trainer_user), ...shifts.map((s?: any): any => s.trainer_user)])].map((id?: any): any => { const rs: any = reports.filter((r?: any): any => r.trainer_user === id), ss: any = shifts.filter((s?: any): any => s.trainer_user === id); return { trainer: memberName(id), logged_shifts: ss.length, hours: ss.reduce((n?: any, x?: any): any => n + Number(x.hours), 0), reports: rs.length, coverage_reports: rs.filter((r?: any): any => !!r.coverage_id).length, approved: rs.filter(approvedStatus).length, returned: rs.filter((r?: any): any => r.status === 'returned').length, disputed: rs.filter((r?: any): any => r.status === 'disputed').length } as any; });
        if (type === 'ratings') {
            const rows: any = [];
            for (const r of reports.filter(approvedStatus)) {
                const e: any = byId.get(r.enrollment_id);
                for (const c of e.template.categories) {
                    const id: any = r.content?.ratings?.[c.id];
                    if (id && id !== 'not_observed')
                        rows.push({ model: e.model, template_version: e.template_version, category: c.label, rating: e.template.ratingScale.find((x?: any): any => x.id === id)?.label || id, trainee: name(e.trainee_person), date: r.period_start, phase: phaseLabel(e, r.phase_index) } as any);
                }
            }
            return rows;
        }
        if (type === 'milestones')
            return files.flatMap((e?: any): any => { const rs: any = cache.reports.filter((r?: any): any => r.enrollment_id === e.id); return [...Array(e.phase_index).keys()].map((i?: any): any => ({ trainee: name(e.trainee_person), phase: phaseLabel(e, i), report: 'End of phase', status: rs.some((r?: any): any => r.phase_index === i && r.kind === 'phase' && approvedStatus(r)) ? 'Approved' : 'Missing approval' } as any)).concat(['completed', 'separated'].includes(e.status) ? [{ trainee: name(e.trainee_person), phase: phaseLabel(e, e.phase_index), report: 'End of training', status: rs.some((r?: any): any => r.kind === 'final' && approvedStatus(r)) ? 'Approved' : 'Missing approval' } as any] : []); });
        if (type === 'approvals')
            return reports.map((r?: any): any => ({ trainee: name(byId.get(r.enrollment_id)?.trainee_person), type: r.kind, period: r.period_start, status: r.status, trainer: memberName(r.trainer_user), supervisor: memberName(r.supervisor_user), submitted_at: r.trainer_submitted_at || '', supervisor_approved_at: r.supervisor_approved_at || '', trainee_responded_at: r.trainee_responded_at || '', supervisor_hours: hoursBetween(r.trainer_submitted_at, r.supervisor_approved_at), trainee_hours: hoursBetween(r.supervisor_approved_at, r.trainee_responded_at), coverage: r.coverage_id ? 'Yes' : 'No' } as any));
        if (type === 'competencies')
            return reports.filter(approvedStatus).flatMap((r?: any): any => { const e: any = byId.get(r.enrollment_id); return (e?.template?.items || []).map((item?: any): any => ({ trainee: name(e.trainee_person), phase: phaseLabel(e, r.phase_index), date: r.period_start, item: item.label, state: r.content?.items?.[item.id] || 'pending', trainer: memberName(r.trainer_user) } as any)); });
        return [];
    }
    function renderStats(el?: any): any {
        const data: any = reportingData(), { files, reports, shifts, byId }: any = data, gaps: any = complianceRows(data), f: any = reportingFilter;
        const opt: any = (pairs?: any, value?: any): any => pairs.map(([id, label]: any): any => `<option value="${esc(String(id))}" ${String(id) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('');
        const memberOpts: any = (ids?: any): any => [['all', 'All'], ...[...ids].sort((a?: any, b?: any): any => memberName(a).localeCompare(memberName(b))).map((id?: any): any => [id, memberName(id)])];
        el.innerHTML = `<div class="ft-stat-filters"><label>Model <select data-ft-filter="model">${opt([['all', 'All'], ['san_jose', 'San Jose'], ['reno', 'Reno']], f.model)}</select></label><label>Trainee <select data-ft-filter="trainee">${opt(memberOpts(cache.enrollments.map((e?: any): any => e.trainee_user)), f.trainee)}</select></label><label>Trainer <select data-ft-filter="trainer">${opt(memberOpts(new Set([...cache.reports.map((r?: any): any => r.trainer_user), ...(cache.shifts || []).map((s?: any): any => s.trainer_user), ...cache.enrollments.map((e?: any): any => e.trainer_user)])), f.trainer)}</select></label><label>Outcome <select data-ft-filter="outcome">${opt([['all', 'All'], ['active', 'Active'], ['extended', 'Extended'], ['completed', 'Completed'], ['separated', 'Separated']], f.outcome)}</select></label><label>Historical phase <select data-ft-filter="phase">${opt([['all', 'All'], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i?: any): any => [i, `Phase ${i + 1}`])], f.phase)}</select></label><label>Report type <select data-ft-filter="type">${opt([['all', 'All'], ...Object.entries(reportKind) as any], f.type)}</select></label><label>Report status <select data-ft-filter="status">${opt([['all', 'All'], ...Object.entries(states) as any], f.status)}</select></label><label>From <input data-ft-filter="from" type="date" value="${esc(f.from)}"></label><label>Through <input data-ft-filter="through" type="date" value="${esc(f.through)}"></label></div><div class="ft-stat-filters" id="ftReportTabs"></div><div id="ftReportBody"></div><div class="ft-stat-filters" id="ftReportExports"></div>`;
        el.querySelectorAll('[data-ft-filter]').forEach((input?: any): any => input.onchange = (): any => { reportingFilter[input.dataset.ftFilter] = input.value; renderStats(el); });
        const tabs: any = el.querySelector('#ftReportTabs');
        for (const [id, label] of [['overview', 'Overview'], ['progress', 'Progress'], ['compliance', 'Report compliance'], ['trainers', 'Trainers & coverage'], ['categories', 'Ratings'], ['competencies', 'Competencies'], ['approvals', 'Approvals']])
            button(tabs, label, (): any => { f.view = id; renderStats(el); }, f.view === id ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm');
        const body: any = el.querySelector('#ftReportBody');
        const missing: any = gaps.filter((g?: any): any => g.status === 'Missing'), pending: any = reports.filter((r?: any): any => ['supervisor_review', 'trainee_ack', 'returned'].includes(r.status));
        if (f.view === 'overview') {
            metricCells(body, [['Trainees', files.length], ['Training shifts', shifts.length], ['Training hours', shifts.reduce((n?: any, s?: any): any => n + Number(s.hours), 0).toFixed(1)], ['Evaluations', reports.length], ['Approved', reports.filter(approvedStatus).length], ['Missing from logged shifts', missing.length]]);
            table(body, ['Trainee', 'Model', 'Current phase', 'Outcome', 'Shifts', 'Hours', 'Reports', 'Approved', 'Disputed'], files.map((e?: any): any => { const ss: any = shifts.filter((s?: any): any => s.enrollment_id === e.id), rs: any = reports.filter((r?: any): any => r.enrollment_id === e.id); return [name(e.trainee_person), e.model === 'reno' ? 'Reno' : 'San Jose', phaseLabel(e, e.phase_index), e.status, ss.length, ss.reduce((n?: any, s?: any): any => n + Number(s.hours), 0).toFixed(1), rs.length, rs.filter(approvedStatus).length, rs.filter((r?: any): any => r.status === 'disputed').length]; }));
        }
        if (f.view === 'progress') {
            const rows: any = reports.filter(approvedStatus).flatMap((r?: any): any => { const e: any = byId.get(r.enrollment_id); return (e?.template?.categories || []).map((c?: any): any => ({ trainee: name(e.trainee_person), model: e.model, version: e.template_version, phase: phaseLabel(e, r.phase_index), date: r.period_start, category: c.label, rating: e.template.ratingScale.find((x?: any): any => x.id === r.content?.ratings?.[c.id])?.label || '', trainer: memberName(r.trainer_user) } as any)); }).sort((a?: any, b?: any): any => a.trainee.localeCompare(b.trainee) || a.date.localeCompare(b.date));
            table(body, ['Trainee', 'Date', 'Model / template', 'Historical phase', 'Category', 'Rating', 'Trainer'], rows.map((r?: any): any => [r.trainee, humanDate(r.date), `${r.model} v${r.version}`, r.phase, r.category, r.rating, r.trainer]));
            body.insertAdjacentHTML('beforeend', '<p class="hint">Ratings are shown chronologically within each trainee and template. No numeric averages are combined across agency-defined rating scales.</p>');
        }
        if (f.view === 'compliance') {
            metricCells(body, [['Logged shifts', shifts.length], ['Expected periods', gaps.length], ['Missing', missing.length], ['In progress', gaps.filter((g?: any): any => g.status === 'In progress').length], ['Partial / draft / returned', gaps.filter((g?: any): any => g.status === 'Partial / draft / returned').length], ['Submitted', gaps.filter((g?: any): any => g.status === 'Submitted, awaiting approval').length], ['Approved', gaps.filter((g?: any): any => g.status === 'Supervisor approved').length]]);
            const sel: any = (document as any).createElement('label');
            sel.textContent = 'Show ';
            sel.innerHTML += `<select id="ftGapFilter">${opt([['all', 'All'], ['Missing', 'Missing'], ['In progress', 'In progress'], ['Partial / draft / returned', 'Partial / draft / returned'], ['Submitted, awaiting approval', 'Submitted, awaiting approval'], ['Supervisor approved', 'Supervisor approved']], f.gap)}</select>`;
            body.append(sel);
            sel.querySelector('select').onchange = (): any => { f.gap = sel.querySelector('select').value; renderStats(el); };
            table(body, ['Trainee', 'Period starting', 'Historical phase', 'Expected', 'Shifts', 'Hours', 'Trainer', 'Report state'], gaps.filter((g?: any): any => f.gap === 'all' || g.status === f.gap).map((g?: any): any => [g.trainee, humanDate(g.period), g.phase, g.kind, g.shifts, g.hours.toFixed(1), g.trainer, g.status]));
            body.insertAdjacentHTML('beforeend', '<p class="hint">Expected daily observations are based on logged San Jose training days. Reno weekly evaluations are based on weeks with logged training shifts. Coverage observations are checked for each covered shift. The current day or week is shown as in progress until it closes. Unlogged shifts cannot be counted. Phase and final reports are tracked separately below.</p>');
            const milestones: any = files.flatMap((e?: any): any => { const rs: any = cache.reports.filter((r?: any): any => r.enrollment_id === e.id); return [...Array(e.phase_index).keys()].map((i?: any): any => [name(e.trainee_person), phaseLabel(e, i), 'End of phase', rs.some((r?: any): any => r.phase_index === i && r.kind === 'phase' && approvedStatus(r)) ? 'Approved' : 'Missing approval']).concat(['completed', 'separated'].includes(e.status) ? [[name(e.trainee_person), phaseLabel(e, e.phase_index), 'End of training', rs.some((r?: any): any => r.kind === 'final' && approvedStatus(r)) ? 'Approved' : 'Missing approval']] : []); });
            table(body, ['Trainee', 'Phase', 'Milestone', 'State'], milestones);
        }
        if (f.view === 'trainers') {
            const ids: any = new Set([...shifts.map((s?: any): any => s.trainer_user), ...reports.map((r?: any): any => r.trainer_user)]);
            table(body, ['Trainer', 'Training shifts', 'Hours', 'Reports', 'Coverage reports', 'Approved', 'Returned', 'Disputed'], [...ids].map((id?: any): any => { const ss: any = shifts.filter((s?: any): any => s.trainer_user === id), rs: any = reports.filter((r?: any): any => r.trainer_user === id); return [memberName(id), ss.length, ss.reduce((n?: any, s?: any): any => n + Number(s.hours), 0).toFixed(1), rs.length, rs.filter((r?: any): any => !!r.coverage_id).length, rs.filter(approvedStatus).length, rs.filter((r?: any): any => r.status === 'returned').length, rs.filter((r?: any): any => r.status === 'disputed').length]; }));
            table(body, ['Trainee', 'Covering trainer', 'Dates', 'Reason', 'State'], (cache.coverage || []).filter((c?: any): any => byId.has(c.enrollment_id) && (!f.from || c.end_on >= f.from) && (!f.through || c.start_on <= f.through) && (f.trainer === 'all' || c.cover_user === f.trainer)).map((c?: any): any => [name(byId.get(c.enrollment_id).trainee_person), memberName(c.cover_user), `${humanDate(c.start_on)} to ${humanDate(c.end_on)}`, c.reason, c.cancelled_at ? 'Cancelled' : 'Active']));
        }
        if (f.view === 'categories') {
            const categories: any = new Map();
            for (const r of reports.filter(approvedStatus)) {
                const e: any = byId.get(r.enrollment_id);
                for (const c of e.template.categories) {
                    const rating: any = r.content?.ratings?.[c.id];
                    if (!rating || rating === 'not_observed')
                        continue;
                    const key: any = [e.model, e.template_version, c.id].join('|');
                    let x: any = categories.get(key);
                    if (!x) {
                        x = { model: e.model, version: e.template_version, label: c.label, counts: {} as any, total: 0 } as any;
                        categories.set(key, x);
                    }
                    const label: any = e.template.ratingScale.find((y?: any): any => y.id === rating)?.label || rating;
                    x.counts[label] = (x.counts[label] || 0) + 1;
                    x.total++;
                }
            }
            table(body, ['Model', 'Template', 'Category', 'Observed', 'Rating distribution'], [...categories.values()].map((x?: any): any => [x.model, x.version, x.label, x.total, (Object.entries(x.counts) as any).map(([k, v]: any): any => `${k}: ${v}`).join(', ')]));
            body.insertAdjacentHTML('beforeend', '<p class="hint">Only supervisor-approved ratings are counted. Different models and template versions are kept separate.</p>');
        }
        if (f.view === 'competencies') {
            const items: any = new Map();
            for (const r of reports.filter(approvedStatus)) {
                const e: any = byId.get(r.enrollment_id);
                for (const item of e.template.items) {
                    const key: any = [e.model, e.template_version, item.id].join('|');
                    let x: any = items.get(key);
                    if (!x) {
                        x = { model: e.model, version: e.template_version, label: item.label, pending: 0, demonstrated: 0, remediation: 0 } as any;
                        items.set(key, x);
                    }
                    const state: any = r.content?.items?.[item.id] || 'pending';
                    if (state in x)
                        x[state]++;
                }
            }
            table(body, ['Model', 'Template', 'Documentation item', 'Pending', 'Demonstrated', 'Remediation'], [...items.values()].map((x?: any): any => [x.model, x.version, x.label, x.pending, x.demonstrated, x.remediation]));
        }
        if (f.view === 'approvals') {
            metricCells(body, [['Awaiting action', pending.length], ['Supervisor review', pending.filter((r?: any): any => r.status === 'supervisor_review').length], ['Trainee acknowledgment', pending.filter((r?: any): any => r.status === 'trainee_ack').length], ['Returned', pending.filter((r?: any): any => r.status === 'returned').length], ['Disputed', reports.filter((r?: any): any => r.status === 'disputed').length]]);
            table(body, ['Trainee', 'Report', 'Period', 'Trainer', 'State', 'Supervisor hours', 'Trainee hours', 'Age (days)'], reports.map((r?: any): any => [name(byId.get(r.enrollment_id).trainee_person), reportKind[r.kind], humanDate(r.period_start), memberName(r.trainer_user), states[r.status], hoursBetween(r.trainer_submitted_at, r.supervisor_approved_at) ?? '', hoursBetween(r.supervisor_approved_at, r.trainee_responded_at) ?? '', ['supervisor_review', 'trainee_ack', 'returned'].includes(r.status) ? daysBetween(dateOnly(r.updated_at), today()) : '']));
        }
        const actions: any = el.querySelector('#ftReportExports');
        for (const [id, label] of [['trainees', 'Trainees CSV'], ['evaluations', 'Evaluations CSV'], ['progress', 'Progress CSV'], ['ratings', 'Ratings CSV'], ['gaps', 'Compliance CSV'], ['milestones', 'Milestones CSV'], ['shifts', 'Shifts CSV'], ['trainers', 'Trainers CSV'], ['competencies', 'Competencies CSV'], ['approvals', 'Approvals CSV']])
            button(actions, label, (): any => ftCsv(exportRows(id, data, gaps), `field-training-${id}.csv`));
        actions.insertAdjacentHTML('beforeend', '<p class="hint">CSV exports honor the selected filters and your access to trainee files.</p>');
    }
    function pdfSafe(value?: any): any { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7e]/g, '?'); }
    function pdfLines(lines?: any, filename?: any): any {
        const wrapped: any = [];
        for (const value of lines) {
            for (const original of String(value ?? '').split('\n')) {
                let line: any = pdfSafe(original);
                if (!line) {
                    wrapped.push('');
                    continue;
                }
                while (line.length > 96) {
                    let cut: any = line.lastIndexOf(' ', 96);
                    if (cut < 30)
                        cut = 96;
                    wrapped.push(line.slice(0, cut));
                    line = line.slice(cut).trimStart();
                }
                wrapped.push(line);
            }
        }
        const pages: any = [];
        for (let i: any = 0; i < wrapped.length; i += 54)
            pages.push(wrapped.slice(i, i + 54));
        if (!pages.length)
            pages.push([]);
        const objects: any = [null, '<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_?: any, i?: any): any => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
        pages.forEach((page?: any, index?: any): any => { const pageId: any = 4 + index * 2, streamId: any = pageId + 1; objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`; const content: any = ['BT /F1 9 Tf 11 TL 48 744 Td', ...page.map((line?: any, i?: any): any => `${i ? 'T* ' : ''}(${line.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')}) Tj`), 'ET', `BT /F1 8 Tf 48 35 Td (Page ${index + 1} of ${pages.length}) Tj ET`].join('\n'); objects[streamId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`; });
        let pdf: any = '%PDF-1.4\n';
        const offsets: any = [0];
        for (let i: any = 1; i < objects.length; i++) {
            offsets[i] = pdf.length;
            pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
        }
        const start: any = pdf.length;
        pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
        for (let i: any = 1; i < objects.length; i++)
            pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
        const url: any = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' } as any)), a: any = (document as any).createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout((): any => URL.revokeObjectURL(url), 30000);
    }
    function reportPdfLines(r?: any, e?: any): any { const lines: any = [`FIELD TRAINING EVALUATION | ${reportKind[r.kind] || r.kind}`, `Trainee: ${name(e.trainee_person)}    Model: ${e.model === 'reno' ? 'Reno PTO' : 'San Jose FTO'}`, `Period: ${humanDate(r.period_start)} to ${humanDate(r.period_end)}    Phase: ${phaseLabel(e, r.phase_index)}`, `Trainer: ${memberName(r.trainer_user)}    Supervisor: ${memberName(r.supervisor_user)}`, `Status: ${states[r.status] || r.status}    Report ID: ${r.id}`, '', 'EVALUATION CATEGORIES']; for (const c of e.template.categories) {
        const id: any = r.content?.ratings?.[c.id], label: any = e.template.ratingScale.find((x?: any): any => x.id === id)?.label || id || 'Not recorded';
        lines.push(`${c.label}: ${label}`);
    } lines.push('', 'DOCUMENTATION ITEMS'); for (const item of e.template.items)
        lines.push(`${item.label}: ${r.content?.items?.[item.id] || 'Not recorded'}`); lines.push('', 'OBSERVATIONS', r.content?.narrative || 'None recorded', '', 'RECOMMENDATIONS', r.content?.recommendation || 'None recorded', '', 'ATTACHMENTS'); for (const a of cache.attachments.filter((x?: any): any => x.report_id === r.id))
        lines.push(`${a.file_name}${a.description ? ' - ' + a.description : ''}`); if (!cache.attachments.some((x?: any): any => x.report_id === r.id))
        lines.push('None recorded'); lines.push('', 'APPROVALS AND HISTORY', `Trainer submitted: ${r.trainer_submitted_at ? instant(r.trainer_submitted_at) : 'Pending'}`, `Supervisor approved: ${r.supervisor_approved_at ? instant(r.supervisor_approved_at) : 'Pending'}`, `Trainee responded: ${r.trainee_responded_at ? instant(r.trainee_responded_at) : 'Pending'}`); for (const h of r.history || [])
        lines.push(`${h.action} | ${instant(h.at)} | ${memberName(h.by)}${h.note ? ' | ' + h.note : ''}`); lines.push('', 'Attachment files are listed above and are not embedded in this PDF.'); return lines; }
    function exportReportPdf(id?: any): any { const r: any = cache.reports.find((x?: any): any => x.id === id), e: any = cache.enrollments.find((x?: any): any => x.id === r?.enrollment_id); if (!r || !e) {
        toast('Report unavailable.', true);
        return;
    } pdfLines(reportPdfLines(r, e), `field-training-${r.kind}-${r.period_start}-${r.id.slice(0, 8)}.pdf`); }
    function exportFilePdf(id?: any): any { const e: any = cache.enrollments.find((x?: any): any => x.id === id); if (!e) {
        toast('Trainee file unavailable.', true);
        return;
    } const rs: any = cache.reports.filter((r?: any): any => r.enrollment_id === id).sort((a?: any, b?: any): any => a.period_start.localeCompare(b.period_start)); const ss: any = (cache.shifts || []).filter((s?: any): any => s.enrollment_id === id && !s.cancelled_at); const lines: any = ['FIELD TRAINING FILE', `Trainee: ${name(e.trainee_person)}    Model: ${e.model === 'reno' ? 'Reno PTO' : 'San Jose FTO'}`, `Started: ${humanDate(e.started_on)}    Outcome: ${e.status}`, `Current phase: ${phaseLabel(e, e.phase_index)}    Template version: ${e.template_version}`, `Assigned trainer: ${memberName(e.trainer_user)}    Supervisor: ${memberName(e.supervisor_user)}`, `Logged shifts: ${ss.length}    Hours: ${ss.reduce((n?: any, s?: any): any => n + Number(s.hours), 0).toFixed(1)}`, '', 'TRAINING SHIFTS']; for (const s of ss)
        lines.push(`${humanDate(s.shift_on)} | ${memberName(s.trainer_user)} | ${s.hours} hours | ${s.notes || ''}`); lines.push('', 'COVERAGE ASSIGNMENTS'); for (const c of (cache.coverage || []).filter((x?: any): any => x.enrollment_id === id))
        lines.push(`${memberName(c.cover_user)} | ${humanDate(c.start_on)} to ${humanDate(c.end_on)} | ${c.reason}${c.cancelled_at ? ' | Cancelled' : ''}`); for (const r of rs)
        lines.push('', '================================================', ...reportPdfLines(r, e)); if (!rs.length)
        lines.push('', 'No evaluations recorded.'); pdfLines(lines, `field-training-file-${dateOnly(e.started_on)}-${e.id.slice(0, 8)}.pdf`); }
    (document as any).addEventListener('visibilitychange', (): any => { if (!(document as any).hidden && available())
        load(true); });
    (window as any).addEventListener('online', (): any => { if (available())
        load(true); });
    return { available, manage, load, render, tasks, openFile, openPerson } as any;
})();
