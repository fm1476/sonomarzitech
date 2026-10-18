import {SONOMA_FEE_REFERENCE} from './lib/civil-california-fees.mjs';
import {calendarEvents,validateCalendarRange} from './lib/civil-california-calendar.mjs';
import {generateCaliforniaReturnDraft} from './lib/civil-california-returns.mjs';
import {readinessStatus,saveReadinessEvidence} from './lib/civil-california-readiness.mjs';
import {californiaFinancialReport} from './lib/civil-california-reporting.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {response,resolveWorkspaceMembership,loadRoleAbilityMap,roleHasAbility,DEMO_TENANT_ID,verifyAttachmentForParent} from './core.mjs';
import {appendAuditEvent,ensureAuditSchema} from './audit.mjs';
import {CA_WORKFLOWS,CA_RULE_VERSION,CivilError,createCaliforniaCase,applyCaliforniaCommand,ledgerBalance,availableCaseFunds} from './lib/civil-california-domain.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const abilities=['civil_paper_view_all','civil_paper_view_own','civil_paper_intake','civil_paper_log_attempt','civil_document_generate','civil_fee_manage','civil_reports_view','civil_reports_export'];
const keyFor=id=>JSON.stringify([['civil','papers'],id]);
export async function californiaCivilApi(client,auth,body){
  const {tenantId,agencyId}=body||{};
  if(!uuid(tenantId)||!uuid(agencyId))return response(400,{success:false,error:'Valid tenant and agency IDs are required.'});
  if(JSON.stringify(body).length>100000)return response(413,{success:false,error:'Request is too large.'});
  const access=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);if(access.error)return access.error;
  if(!access.enabledModules.includes('civil'))return response(403,{success:false,error:'Civil Process is not licensed for this agency.'});
  const map=access.admin?new Map():await loadRoleAbilityMap(client,tenantId,agencyId,access.roleIds);
  const granted=abilities.filter(a=>access.admin||roleHasAbility(map,access.roleIds,a));
  if(!granted.some(a=>a==='civil_paper_view_all'||a==='civil_paper_view_own'))return response(403,{success:false,error:'Civil record access is required.'});
  const t=await client.query(`SELECT metadata->'civilJurisdictionProfile' AS profile,timezone FROM suite_tenants WHERE id=$1`,[tenantId]);
  const profile=t.rows[0]?.profile||{profileId:'US-GENERAL',status:'unconfigured'};
  const operation=String(body.operation||'context');
  if(operation==='context')return response(200,{success:true,data:{profile,ruleVersion:CA_RULE_VERSION,workflows:CA_WORKFLOWS,personId:access.personId,abilities:granted,admin:access.admin,platformAdmin:!!auth.platformAdmin,countyFeeReference:String(profile.county||'').trim().toLowerCase()==='sonoma'?SONOMA_FEE_REFERENCE:null}});
  if(profile.profileId!=='US-CA')return response(409,{success:false,error:'Select a California jurisdiction profile first.'});
  if(operation==='readiness'){
    if(!access.admin)return response(403,{success:false,error:'Agency administration is required.'});
    const load=()=>client.query('SELECT metadata FROM suite_tenants WHERE id=$1',[tenantId]);
    if(!body.evidence){const q=await load();return response(200,{success:true,data:readinessStatus(q.rows[0]?.metadata?.civilReadiness?.[agencyId],profile)});}
    if(!auth.platformAdmin)return response(403,{success:false,error:'Platform administration is required to record release acceptance evidence.'});
    await ensureAuditSchema(client);await client.query('BEGIN');
    try{
      const q=await client.query('SELECT metadata FROM suite_tenants WHERE id=$1 FOR UPDATE',[tenantId]);
      const currentProfile=q.rows[0]?.metadata?.civilJurisdictionProfile;
      if(currentProfile?.profileId!=='US-CA'||currentProfile.county!==profile.county)throw new CivilError('Jurisdiction changed. Reload configuration.',409);
      const saved=q.rows[0]?.metadata?.civilReadiness?.[agencyId]||{};
      if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==(saved.revision||0))throw new CivilError('Release evidence changed. Reload before saving.',409);
      const next=saveReadinessEvidence(saved,body.evidence,{userId:auth.userId,at:new Date().toISOString(),county:currentProfile.county});
      await client.query(`UPDATE suite_tenants SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{civilReadiness}',COALESCE(metadata->'civilReadiness','{}'::jsonb)||jsonb_build_object($2::text,$3::jsonb),true) WHERE id=$1`,[tenantId,agencyId,JSON.stringify(next)]);
      await appendAuditEvent(client,auth,{tenantId,agencyId,personId:access.personId,module:'Civil',entityType:'civil_configuration',description:`California release evidence: ${body.evidence.check} / ${body.evidence.status}; revision ${next.revision}. Operational activation unchanged.`});
      await client.query('COMMIT');return response(200,{success:true,data:readinessStatus(next,currentProfile)});
    }catch(error){await client.query('ROLLBACK');if(error instanceof CivilError)return response(error.statusCode,{success:false,error:error.message});throw error;}
  }
  const testOnly=tenantId===DEMO_TENANT_ID&&profile.status==='test';
  // Operational activation is intentionally separate from the internal pilot.
  if(!testOnly && !(profile.status==='active'&&profile.profileVersion===CA_RULE_VERSION&&profile.operationalApproval?.reference))return response(409,{success:false,error:'The California profile is not enabled for this workflow version.'});
  const ctx={userId:auth.userId,personId:access.personId,admin:access.admin,abilities:granted,county:profile.county,testOnly,at:new Date().toISOString(),today:new Intl.DateTimeFormat('en-CA',{timeZone:t.rows[0]?.timezone||'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),eventId:randomUUID()};
  const canView=r=>access.admin||granted.includes('civil_paper_view_all')||granted.includes('civil_paper_view_own')&&r.assignedServerId===access.personId;
  if(operation==='roster'){
    if(!access.admin&&!granted.includes('civil_paper_intake'))return response(403,{success:false,error:'Assignment management is required.'});
    const roster=await client.query(`SELECT DISTINCT m.person_id,u.display_name AS name,u.email FROM suite_memberships m JOIN suite_users u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.agency_id=$2 AND m.status='active' AND u.status='active' AND m.person_id IS NOT NULL ORDER BY u.display_name,u.email`,[tenantId,agencyId]);
    return response(200,{success:true,data:{people:roster.rows}});
  }
  if(operation==='filters'){
    const all=access.admin||granted.includes('civil_paper_view_all');
    const options=await client.query(`SELECT DISTINCT value->>'paperType' AS paper_type, value->>'courtOfOrigin' AS court
      FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND deleted=false
      AND key::jsonb->0='["civil","papers"]'::jsonb AND value->'california'->>'ruleVersion'=$3
      AND ($4::boolean OR value->>'assignedServerId'=$5)`,
      [tenantId,agencyId,CA_RULE_VERSION,all,access.personId]);
    return response(200,{success:true,data:{
      types:[...new Set(options.rows.map(row=>row.paper_type).filter(Boolean))].sort(),
      locations:[...new Set(options.rows.map(row=>row.court).filter(Boolean))].sort()
    }});
  }
  if(operation==='calendar'){
    try{validateCalendarRange(body.fromDate,body.toDate);}catch(error){return response(error.statusCode,{success:false,error:error.message});}
    const q=await client.query(`SELECT value->>'id' AS id,value->>'caseNumber' AS case_number,value->>'stage' AS stage,value->>'returnByDate' AS return_by,value->'california'->'deadlines' AS deadlines FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND deleted=false AND key::jsonb->0='["civil","papers"]'::jsonb AND value->'california'->>'ruleVersion'=$3 AND ($4::boolean OR value->>'assignedServerId'=$5) AND ((value->>'returnByDate' BETWEEN $6 AND $7) OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(value->'california'->'deadlines','[]'::jsonb)) AS d WHERE d->>'dueDate' BETWEEN $6 AND $7 AND d->>'completedAt' IS NULL))`,[tenantId,agencyId,CA_RULE_VERSION,access.admin||granted.includes('civil_paper_view_all'),access.personId,body.fromDate,body.toDate]);
    const events=calendarEvents(q.rows,body.fromDate,body.toDate);
    if(Buffer.byteLength(JSON.stringify(events))>3000000)return response(413,{success:false,error:'This calendar range contains too many events. Choose a shorter range.'});
    return response(200,{success:true,data:{events,fromDate:body.fromDate,toDate:body.toDate}});
  }
  if(operation==='list'||operation==='report'){
    const all=access.admin||granted.includes('civil_paper_view_all');
    const report=operation==='report';
    if(report&&!access.admin&&!granted.includes('civil_reports_view'))return response(403,{success:false,error:'Civil reporting permission is required.'});
    if(body.export===true&&!access.admin&&!granted.includes('civil_reports_export'))return response(403,{success:false,error:'Civil export permission is required.'});
    if(body.afterKey!=null&&(typeof body.afterKey!=='string'||body.afterKey.length>300))return response(400,{success:false,error:'Invalid case page cursor.'});
    const base=`FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND deleted=false AND key::jsonb->0='["civil","papers"]'::jsonb AND value->'california'->>'ruleVersion'=$3 AND ($4::boolean OR value->>'assignedServerId'=$5)`;
    const params=[tenantId,agencyId,CA_RULE_VERSION,all,access.personId];
    if(report){
      const q=await client.query('SELECT key,value,version '+base+' ORDER BY key',params);
      try{
        const revision=createHash('sha256').update(JSON.stringify(q.rows.map(row=>[row.key,Number(row.version)]))).digest('hex');
        const data=californiaFinancialReport(q.rows.map(row=>row.value),{fromDate:body.fromDate,toDate:body.toDate});
        // Summary spans every accessible case. Detail export is separately paged.
        return response(200,{success:true,data:{...data,cases:undefined,revision}});
      }catch(error){if(error instanceof CivilError)return response(error.statusCode,{success:false,error:error.message});throw error;}
    }
    if(body.query!==undefined&&(typeof body.query!=='string'||body.query.length>250))return response(400,{success:false,error:'Search must contain at most 250 characters.'});
    if(['paperType','courtOfOrigin'].some(key=>body[key]!==undefined&&(typeof body[key]!=='string'||body[key].length>250)))return response(400,{success:false,error:'Invalid Civil board filter.'});
    const q=await client.query(`SELECT key,value,version,updated_at ${base} AND ($6::text IS NULL OR key>$6) AND ($7::text IS NULL OR strpos(lower(value::text),lower($7::text))>0) AND ($8::boolean=false OR value->>'assignedServerId'=$5) AND ($9::text IS NULL OR value->>'paperType'=$9) AND ($10::text IS NULL OR value->>'courtOfOrigin'=$10) ORDER BY key LIMIT 201`,[...params,body.afterKey||null,body.query?.trim()||null,body.assignedOnly===true,body.paperType||null,body.courtOfOrigin||null]);
    const page=q.rows.slice(0,200),cases=page.filter(row=>canView(row.value)).map(row=>({record:row.value,version:Number(row.version),updatedAt:row.updated_at}));
    return response(200,{success:true,data:{cases,nextCursor:q.rows.length>200?page[page.length-1].key:null,pageSize:200}});
  }
  if(operation==='get'){
    if(!uuid(body.id))return response(400,{success:false,error:'Valid case ID required.'});
    const q=await client.query(`SELECT value,version,updated_at FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND deleted=false`,[tenantId,agencyId,keyFor(body.id)]);
    if(!q.rows[0]?.value?.california||!canView(q.rows[0].value))return response(404,{success:false,error:'Case not found.'});
    return response(200,{success:true,data:{record:q.rows[0].value,version:Number(q.rows[0].version),availableCents:availableCaseFunds(q.rows[0].value,ctx.today)}});
  }
  if(!['create','command'].includes(operation))return response(400,{success:false,error:'Unknown Civil operation.'});
  if(JSON.stringify(body).length>100000)return response(413,{success:false,error:'Request is too large.'});
  // Schema preparation occurs outside the mutation transaction so its cache cannot
  // outlive rolled-back DDL on a cold invocation.
  await ensureAuditSchema(client);
  await client.query('BEGIN');
  try{
    // Shared with attachment writes; serialize case-specific updates and financial checks.
    let record,version,generatedDraft,id=body.id;
    if(operation==='create'){
      id=randomUUID();ctx.id=id;record=createCaliforniaCase(body.record||{},ctx);version=1;
      record.california.history.push({id:ctx.eventId,command:'create',actor:auth.userId,personId:ctx.personId,at:ctx.at,toStage:'Intake'});
      await client.query(`INSERT INTO suite_records(tenant_id,agency_id,key,value,version,deleted,updated_at,updated_by) VALUES($1,$2,$3,$4::jsonb,1,false,now(),$5)`,[tenantId,agencyId,keyFor(id),JSON.stringify(record),auth.userId]);
    }else{
      if(!uuid(id)||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<1)throw new CivilError('Case ID and expected version are required.');
      const q=await client.query(`SELECT value,version FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND deleted=false FOR UPDATE`,[tenantId,agencyId,keyFor(id)]);
      const existing=q.rows[0];if(!existing?.value?.california||!canView(existing.value))throw new CivilError('Case not found.',404);
      if(Number(existing.version)!==body.expectedVersion)throw new CivilError('This case changed in another session. Reload it before retrying.',409);
      const payload=body.payload||{},command=String(body.command||'');
      if(command==='assign'){
        if(typeof payload.personId!=='string'||!payload.personId.trim()||payload.personId.length>150)throw new CivilError('Choose a valid active member of this agency.');
        const active=await client.query(`SELECT 1 FROM suite_memberships WHERE tenant_id=$1 AND agency_id=$2 AND person_id=$3 AND status='active' LIMIT 1`,[tenantId,agencyId,payload.personId]);
        if(!active.rows.length)throw new CivilError('Choose an active member of this agency.');
      }
      if(command==='generate_return_draft'){
        if(!access.admin&&!granted.includes('civil_document_generate'))throw new CivilError('Court document permission is required.',403);
        generatedDraft=await generateCaliforniaReturnDraft(existing.value,payload);payload.pdfHash=generatedDraft.sha256;payload.templateHash=generatedDraft.templateSha256;
      }
      if(command==='attach_document')await verifyAttachmentForParent(tenantId,agencyId,payload.key,'civil.papers',id);
      record=applyCaliforniaCommand(existing.value,command,payload,ctx);version=Number(existing.version)+1;
      await client.query(`UPDATE suite_records SET value=$4::jsonb,version=$5,updated_at=now(),updated_by=$6 WHERE tenant_id=$1 AND agency_id=$2 AND key=$3`,[tenantId,agencyId,keyFor(id),JSON.stringify(record),version,auth.userId]);
    }
    await appendAuditEvent(client,auth,{tenantId,agencyId,personId:access.personId,module:'Civil',entityType:'civil_paper',description:`California ${operation==='create'?'intake':body.command}: ${record.caseNumber} (${id}); version ${version}${testOnly?' [TEST]':''}`});
    await client.query('COMMIT');
    return response(200,{success:true,data:{record,version,balanceCents:ledgerBalance(record),availableCents:availableCaseFunds(record,ctx.today),draft:generatedDraft}});
  }catch(error){await client.query('ROLLBACK');if(error instanceof CivilError||error.statusCode)return response(error.statusCode||400,{success:false,error:error.message});throw error;}
}
