import {
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility
} from "./core.mjs";
import { ensureStaffNoticeTables } from "./staff-notices.mjs";

 * FIELD TRAINING (AWS/RDS)
 * ---------------------------------------------------------
 * Field Training is kept as one versioned JSON document in suite_records.
 * This deliberately uses the same tenant/agency isolation as the rest of the
 * application while preserving the module's report-level workflow semantics.
 */
const FT_RECORD_KEY = JSON.stringify([["fieldTraining"], "$state"]);

function ftEmptyState() {
  return { config: null, enrollments: [], reports: [], coverage: [], shifts: [], attachments: [] };
}

function ftId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function ftIsoNow() { return new Date().toISOString(); }

function ftDateOk(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }

function ftDaysInclusive(a, b) {
  const start = new Date(`${a}T12:00:00Z`);
  const end = new Date(`${b}T12:00:00Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

async function ftLoadState(client, workspaceAuth, lock = false) {
  const result = await client.query(
    `SELECT value, version
       FROM suite_records
      WHERE tenant_id = $1 AND agency_id = $2 AND key = $3 AND deleted = false
      ${lock ? "FOR UPDATE" : ""}`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY]
  );
  if (!result.rows.length) return { state: ftEmptyState(), version: 0 };
  const value = result.rows[0].value || {};
  return {
    state: {
      config: value.config || null,
      enrollments: Array.isArray(value.enrollments) ? value.enrollments : [],
      reports: Array.isArray(value.reports) ? value.reports : [],
      coverage: Array.isArray(value.coverage) ? value.coverage : [],
      shifts: Array.isArray(value.shifts) ? value.shifts : [],
      attachments: Array.isArray(value.attachments) ? value.attachments : []
    },
    version: Number(result.rows[0].version || 0)
  };
}

async function ftSaveState(client, workspaceAuth, state, version) {
  const next = version + 1;
  if (version === 0) {
    await client.query(
      `INSERT INTO suite_records (tenant_id, agency_id, key, value, version, deleted, updated_at, updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,false,now(),$6)`,
      [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY, JSON.stringify(state), next, workspaceAuth.userId || null]
    );
  } else {
    const updated = await client.query(
      `UPDATE suite_records SET value=$4::jsonb, version=$5, updated_at=now(), updated_by=$6
        WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND version=$7 AND deleted=false
        RETURNING version`,
      [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY, JSON.stringify(state), next, workspaceAuth.userId || null, version]
    );
    if (!updated.rows.length) throw new Error("Field Training changed in another session. Refresh and retry.");
  }
  return next;
}

async function ftContext(client, auth, tenantId, agencyId) {
  const workspaceAuth = await resolveWorkspaceMembership(client, auth, tenantId, agencyId);
  if (workspaceAuth.error) return workspaceAuth;
  workspaceAuth.userId = auth.userId;
  const abilityMap = workspaceAuth.admin ? new Map() : await loadRoleAbilityMap(client, tenantId, agencyId, workspaceAuth.roleIds);
  const has = ability => workspaceAuth.admin || roleHasAbility(abilityMap, workspaceAuth.roleIds, ability);
  return {
    ...workspaceAuth,
    ftManage: has("ft_manage"),
    ftAssignCover: has("ft_assign_cover") || has("ft_manage"),
    ftParticipate: has("ft_participate") || has("ft_manage"),
    ftTrain: has("ft_train") || has("ft_manage")
  };
}

async function ftMembers(client, workspaceAuth) {
  const result = await client.query(
    `SELECT m.user_id, m.person_id, m.role_ids, COALESCE(u.display_name,u.email,m.person_id::text) AS display_name
       FROM suite_memberships m
       JOIN suite_users u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.agency_id=$2 AND m.status='active'
      ORDER BY display_name`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId]
  );
  return result.rows;
}

function ftEnrollmentFor(state, id) { return state.enrollments.find(x => x.id === id); }
function ftReportFor(state, id) { return state.reports.find(x => x.id === id); }
function ftActiveCoverage(state, enrollmentId, userId, day) {
  return state.coverage.find(c => c.enrollment_id === enrollmentId && c.cover_user === userId && !c.cancelled_at && c.start_on <= day && c.end_on >= day);
}
function ftCanSeeEnrollment(ctx, state, e) {
  if (ctx.ftManage) return true;
  if ([e.trainee_user,e.trainer_user,e.supervisor_user].includes(ctx.userId)) return true;
  return state.coverage.some(c => c.enrollment_id===e.id && c.cover_user===ctx.userId && !c.cancelled_at);
}
function ftCanEditReport(ctx, state, report) {
  return !!report && ["draft","returned"].includes(report.status) && (ctx.ftManage || report.trainer_user===ctx.userId);
}
function ftAssert(condition, message) { if (!condition) { const e = new Error(message); e.statusCode = 403; throw e; } }
function ftVersion(value, expected, label="record") {
  if (expected != null && Number(expected) !== Number(value)) {
    const e = new Error(`This ${label} changed in another session. Refresh and retry.`); e.statusCode=409; throw e;
  }
}

async function ftNotifyTransition(client, ctx, state, report, action) {
  const enrollment = ftEnrollmentFor(state, report.enrollment_id);
  if (!enrollment) return;

  const recipients =
    action === "submit" ? [report.supervisor_user] :
    action === "approve" ? [report.trainee_user] :
    action === "return" ? [report.trainer_user] :
    action === "dispute" ? [report.trainer_user, report.supervisor_user] :
    [];

  const uniqueRecipients = [...new Set(recipients.filter(Boolean))];
  if (!uniqueRecipients.length) return;

  await ensureStaffNoticeTables(client);

  const people = await client.query(
    `SELECT m.user_id, m.person_id,
            COALESCE(u.display_name,u.email,m.person_id::text,'Staff member') AS display_name
       FROM suite_memberships m
       JOIN suite_users u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.agency_id=$2
        AND m.status='active'
        AND m.user_id = ANY($3::uuid[])`,
    [ctx.tenantId, ctx.agencyId, uniqueRecipients]
  );
  const personByUser = new Map(people.rows.map(row => [row.user_id, row]));

  const traineeRow = await client.query(
    `SELECT COALESCE(u.display_name,u.email,m.person_id::text,'Trainee') AS display_name
       FROM suite_memberships m
       JOIN suite_users u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.agency_id=$2 AND m.user_id=$3
      LIMIT 1`,
    [ctx.tenantId, ctx.agencyId, report.trainee_user]
  );
  const traineeName = traineeRow.rows[0]?.display_name || "the trainee";
  const kindLabel = ({
    daily: "Daily Observation Report",
    weekly: "weekly evaluation",
    phase: "phase report",
    final: "end-of-training report",
    coverage: "coverage observation"
  })[report.kind] || "Field Training report";

  const body =
    action === "submit" ? `Field Training: ${kindLabel} for ${traineeName} is ready for your supervisor review.` :
    action === "approve" ? `Field Training: Your ${kindLabel} for ${traineeName} was approved and is ready for your acknowledgment.` :
    action === "return" ? `Field Training: ${kindLabel} for ${traineeName} was returned to you for correction.` :
    action === "dispute" ? `Field Training: ${traineeName} submitted a response/dispute on a ${kindLabel}. Please review the trainee's response.` :
    "";

  if (!body) return;

  const noticeId = ftId("notice");
  const clientId = `field-training:${report.id}:${action}:${Number(report.version||0)+1}`;

  const inserted = await client.query(
    `INSERT INTO suite_staff_notices
       (id, tenant_id, agency_id, body, created_by, client_id, recipient_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (tenant_id, agency_id, client_id) DO NOTHING
     RETURNING id`,
    [noticeId, ctx.tenantId, ctx.agencyId, body, ctx.userId, clientId, uniqueRecipients.length]
  );
  if (!inserted.rows.length) return;

  for (const userId of uniqueRecipients) {
    const member = personByUser.get(userId);
    if (!member) continue;
    await client.query(
      `INSERT INTO suite_staff_notice_recipients
        (notice_id, user_id, person_id)
       VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [noticeId, userId, member.person_id]
    );
  }
}

function ftVisibleState(ctx, state, members) {
  const allowedEnrollments = state.enrollments.filter(e => ftCanSeeEnrollment(ctx,state,e));
  const ids = new Set(allowedEnrollments.map(e=>e.id));
  return {
    config: state.config,
    members,
    enrollments: allowedEnrollments,
    reports: state.reports.filter(r=>ids.has(r.enrollment_id)),
    coverage: state.coverage.filter(c=>ids.has(c.enrollment_id)),
    shifts: state.shifts.filter(s=>ids.has(s.enrollment_id)),
    attachments: state.attachments.filter(a=>state.reports.some(r=>r.id===a.report_id && ids.has(r.enrollment_id)))
  };
}

async function fieldTrainingApi(client, auth, body) {
  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const action = String(body?.action || "");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  if (!tenantId || !agencyId || !action) return response(400,{success:false,error:"tenant_id, agency_id, and action are required."});

  const ctx = await ftContext(client, auth, tenantId, agencyId);
  if (ctx.error) return ctx.error;
  if (!ctx.ftParticipate && !ctx.ftManage) return response(403,{success:false,error:"Field Training access is not enabled for this role."});

  if (action === "list") {
    const [{state},members] = await Promise.all([ftLoadState(client,ctx,false),ftMembers(client,ctx)]);
    return response(200,{success:true,data:ftVisibleState(ctx,state,members)});
  }

  await client.query("BEGIN");
  try {
    const loaded = await ftLoadState(client,ctx,true);
    const state = loaded.state;
    let result = {ok:true};

    if (action === "save_config") {
      ftAssert(ctx.ftManage,"Field Training program management permission required.");
      const model = ["san_jose","reno"].includes(payload.model) ? payload.model : null;
      const template = payload.template;
      if (!model || !template || !Array.isArray(template.phases) || !template.phases.length || !Array.isArray(template.categories) || !template.categories.length || !Array.isArray(template.items) || !template.items.length || !Array.isArray(template.ratingScale) || template.ratingScale.length < 2) throw new Error("A valid Field Training template is required.");
      if (state.config) ftVersion(state.config.version,payload.version,"program configuration");
      state.config={model,version:Number(state.config?.version||0)+1,template,updated_at:ftIsoNow(),updated_by:ctx.userId};
      result=state.config;
    } else if (action === "enroll") {
      ftAssert(ctx.ftManage,"Field Training management permission required.");
      if(!state.config) throw new Error("Configure the Field Training program first.");
      const members=await ftMembers(client,ctx), byUser=new Map(members.map(m=>[m.user_id,m]));
      const users=[payload.traineeUser,payload.trainerUser,payload.supervisorUser];
      if(users.some(x=>!byUser.has(x)) || new Set(users).size!==3) throw new Error("Choose three different active agency members.");
      if(!ftDateOk(payload.startedOn)) throw new Error("A valid start date is required.");
      if(state.enrollments.some(e=>e.trainee_user===payload.traineeUser && ["active","extended"].includes(e.status))) throw new Error("That trainee already has an active Field Training file.");
      const trainee=byUser.get(payload.traineeUser);
      const e={id:ftId("fte"),trainee_user:payload.traineeUser,trainee_person:trainee.person_id,trainer_user:payload.trainerUser,supervisor_user:payload.supervisorUser,started_on:payload.startedOn,status:"active",phase_index:0,model:state.config.model,template_version:state.config.version,template:JSON.parse(JSON.stringify(state.config.template)),version:1,created_at:ftIsoNow(),updated_at:ftIsoNow()};
      state.enrollments.push(e); result=e;
    } else if (action === "reassign") {
      ftAssert(ctx.ftManage,"Field Training management permission required.");
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); ftVersion(e.version,payload.version,"trainee file");
      if(new Set([e.trainee_user,payload.trainerUser,payload.supervisorUser]).size!==3) throw new Error("Choose different trainee, trainer, and supervisor participants.");
      e.trainer_user=payload.trainerUser; e.supervisor_user=payload.supervisorUser; e.version++; e.updated_at=ftIsoNow(); result=e;
    } else if (action === "coverage_add") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found.");
      ftAssert(ctx.ftManage || (ctx.ftAssignCover && e.supervisor_user===ctx.userId),"Coverage assignment permission required.");
      if(!ftDateOk(payload.startOn)||!ftDateOk(payload.endOn)||payload.endOn<payload.startOn||ftDaysInclusive(payload.startOn,payload.endOn)>14) throw new Error("Coverage must be between 1 and 14 consecutive days.");
      if(!payload.coverUser || [e.trainee_user,e.trainer_user,e.supervisor_user].includes(payload.coverUser)) throw new Error("Choose a different eligible covering trainer.");
      const c={id:ftId("ftc"),enrollment_id:e.id,cover_user:payload.coverUser,start_on:payload.startOn,end_on:payload.endOn,reason:String(payload.reason||"").slice(0,500),created_at:ftIsoNow(),created_by:ctx.userId,cancelled_at:null}; state.coverage.push(c); result=c;
    } else if (action === "coverage_cancel") {
      const e=ftEnrollmentFor(state,payload.enrollmentId), c=state.coverage.find(x=>x.id===payload.coverageId&&x.enrollment_id===payload.enrollmentId); if(!e||!c) throw new Error("Coverage assignment not found.");
      ftAssert(ctx.ftManage || (ctx.ftAssignCover && e.supervisor_user===ctx.userId),"Coverage assignment permission required."); c.cancelled_at=ftIsoNow(); c.cancelled_by=ctx.userId; result=c;
    } else if (action === "new_report") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e||!["active","extended"].includes(e.status)) throw new Error("Active trainee file not found.");
      ftAssert(ftCanSeeEnrollment(ctx,state,e),"This trainee file is not available to you.");
      if(!ftDateOk(payload.periodStart)||!ftDateOk(payload.periodEnd)||payload.periodEnd<payload.periodStart) throw new Error("A valid report period is required.");
      const cover=ftActiveCoverage(state,e.id,ctx.userId,payload.periodStart);
      const isPrimary=e.trainer_user===ctx.userId;
      ftAssert(ctx.ftManage||isPrimary||!!cover,"Only the assigned or covering trainer may create an evaluation.");
      const kind=String(payload.kind||""); if(!["daily","weekly","phase","final","coverage"].includes(kind)) throw new Error("Unsupported evaluation type.");
      if(cover && !ctx.ftManage && (payload.periodStart<cover.start_on||payload.periodEnd>cover.end_on)) throw new Error("Covered evaluations must stay within the assigned coverage dates.");
      const trainerUser=cover?ctx.userId:e.trainer_user;
      const r={id:ftId("ftr"),enrollment_id:e.id,kind,period_start:payload.periodStart,period_end:payload.periodEnd,phase_index:e.phase_index,trainer_user:trainerUser,supervisor_user:e.supervisor_user,trainee_user:e.trainee_user,status:"draft",content:{ratings:{},items:{},narrative:"",recommendation:""},history:[{action:"created",at:ftIsoNow(),user_id:ctx.userId,note:""}],version:1,created_at:ftIsoNow(),updated_at:ftIsoNow()}; state.reports.push(r); result=r;
    } else if (action === "save_report") {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftAssert(ftCanEditReport(ctx,state,r),"This evaluation is not editable by your account."); ftVersion(r.version,payload.version,"evaluation");
      r.content=payload.content&&typeof payload.content==="object"?payload.content:{}; r.version++; r.updated_at=ftIsoNow(); result={id:r.id,version:r.version,status:r.status};
    } else if (["submit","approve","return","acknowledge","dispute"].includes(action)) {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftVersion(r.version,payload.version,"evaluation");
      const note=String(payload.note||"").slice(0,3000);
      if(action==="submit"){ftAssert((ctx.ftManage||r.trainer_user===ctx.userId)&&["draft","returned"].includes(r.status),"Only the trainer may submit this evaluation.");r.status="supervisor_review";}
      if(action==="approve"){ftAssert((ctx.ftManage||r.supervisor_user===ctx.userId)&&r.status==="supervisor_review","Only the assigned supervisor or a Field Training manager may approve this evaluation.");r.status="trainee_ack";}
      if(action==="return"){ftAssert((ctx.ftManage||r.supervisor_user===ctx.userId)&&r.status==="supervisor_review","Only the assigned supervisor or a Field Training manager may return this evaluation.");r.status="returned";}
      if(action==="acknowledge"){ftAssert(r.trainee_user===ctx.userId&&r.status==="trainee_ack","Only the trainee may acknowledge this evaluation.");r.status="acknowledged";}
      if(action==="dispute"){ftAssert(r.trainee_user===ctx.userId&&r.status==="trainee_ack","Only the trainee may respond to this evaluation.");r.status="disputed";}
      await ftNotifyTransition(client,ctx,state,r,action);
      r.history=Array.isArray(r.history)?r.history:[]; r.history.push({action,at:ftIsoNow(),user_id:ctx.userId,note}); r.version++; r.updated_at=ftIsoNow(); result={id:r.id,version:r.version,status:r.status};
    } else if (action === "advance") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); ftVersion(e.version,payload.version,"trainee file");
      ftAssert(ctx.ftManage||e.supervisor_user===ctx.userId,"Only the assigned supervisor or Field Training administrator may record a phase decision.");
      const outcome=payload.outcome;
      if(outcome==="completed"){
        const ok=state.reports.some(r=>r.enrollment_id===e.id&&r.kind==="final"&&["trainee_ack","acknowledged","disputed"].includes(r.status)); if(!ok) throw new Error("An approved end-of-training report is required before completing training."); e.status="completed";
      } else if(outcome==="separated") e.status="separated";
      else {
        const ok=state.reports.some(r=>r.enrollment_id===e.id&&r.kind==="phase"&&r.phase_index===e.phase_index&&["trainee_ack","acknowledged","disputed"].includes(r.status)); if(!ok) throw new Error("An approved end-of-phase report is required before recording a phase decision.");
        if(outcome==="next"){if(e.phase_index>=e.template.phases.length-1) throw new Error("This trainee is already in the final phase. Use Complete training after the final report is approved.");e.phase_index++;e.status="active";}
        else if(outcome==="extended") e.status="extended"; else throw new Error("Unsupported phase decision.");
      }
      e.version++; e.updated_at=ftIsoNow(); result=e;
    } else if (action === "shift_add") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); if(!ftDateOk(payload.shiftOn)) throw new Error("A valid training date is required.");
      const hours=Number(payload.hours); if(!(hours>=0.25&&hours<=24)) throw new Error("Training hours must be between 0.25 and 24.");
      const cover=ftActiveCoverage(state,e.id,ctx.userId,payload.shiftOn); const allowed=ctx.ftManage||e.supervisor_user===ctx.userId||e.trainer_user===ctx.userId||!!cover; ftAssert(allowed,"You cannot log a training shift for this file.");
      const expectedTrainer=cover?ctx.userId:e.trainer_user; if(!ctx.ftManage&&payload.trainerUser!==expectedTrainer) throw new Error("Trainer does not match the assignment for this date.");
      const sh={id:ftId("fts"),enrollment_id:e.id,shift_on:payload.shiftOn,hours,trainer_user:payload.trainerUser||expectedTrainer,notes:String(payload.notes||"").slice(0,1000),recorded_by:ctx.userId,created_at:ftIsoNow(),cancelled_at:null}; state.shifts.push(sh); result=sh;
    } else if (action === "shift_cancel") {
      const e=ftEnrollmentFor(state,payload.enrollmentId), sh=state.shifts.find(x=>x.id===payload.shiftId&&x.enrollment_id===payload.enrollmentId); if(!e||!sh) throw new Error("Training shift not found.");
      ftAssert(ctx.ftManage||e.supervisor_user===ctx.userId||sh.recorded_by===ctx.userId,"You cannot void this training shift."); sh.cancelled_at=ftIsoNow(); sh.cancelled_by=ctx.userId; result=sh;
    } else if (action === "confirm_attachment") {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftAssert(ftCanEditReport(ctx,state,r),"This evaluation is not editable by your account.");
      const key=String(payload.storageKey||""); const expected=`tenants/${ctx.tenantId}/agencies/${ctx.agencyId}/attachments/`; if(!key.startsWith(expected)) throw new Error("Attachment does not belong to this workspace.");
      const a={id:ftId("fta"),report_id:r.id,file_name:String(payload.fileName||"attachment").slice(0,255),content_type:String(payload.contentType||"application/octet-stream").slice(0,150),byte_count:Number(payload.byteCount||0),description:String(payload.description||"").slice(0,500),storage_key:key,uploaded_at:ftIsoNow(),uploaded_by:ctx.userId}; state.attachments.push(a); result=a;
    } else {
      return response(400,{success:false,error:"Unsupported Field Training action."});
    }

    await ftSaveState(client,ctx,state,loaded.version);
    await client.query("COMMIT");
    return response(200,{success:true,data:result});
  } catch(error) {
    await client.query("ROLLBACK");
    return response(error.statusCode||400,{success:false,error:error.message});
  }
}


/*
 * ---------------------------------------------------------

export { fieldTrainingApi };
