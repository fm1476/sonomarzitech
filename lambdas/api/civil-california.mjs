import {randomUUID} from 'node:crypto';
import {response,resolveWorkspaceMembership,loadRoleAbilityMap,roleHasAbility,DEMO_TENANT_ID,verifyAttachmentForParent} from './core.mjs';
import {appendAuditEvent,ensureAuditSchema} from './audit.mjs';
import {CA_WORKFLOWS,CA_RULE_VERSION,CivilError,createCaliforniaCase,applyCaliforniaCommand,ledgerBalance} from './lib/civil-california-domain.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const abilities=['civil_paper_view_all','civil_paper_view_own','civil_paper_intake','civil_paper_log_attempt','civil_document_generate','civil_fee_manage','civil_reports_view','civil_reports_export'];
const keyFor=id=>JSON.stringify([['civil','papers'],id]);
export async function californiaCivilApi(client,auth,body){
  const {tenantId,agencyId}=body||{};
  if(!uuid(tenantId)||!uuid(agencyId))return response(400,{success:false,error:'Valid tenant and agency IDs are required.'});
  const access=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);if(access.error)return access.error;
  if(!access.enabledModules.includes('civil'))return response(403,{success:false,error:'Civil Process is not licensed for this agency.'});
  const map=access.admin?new Map():await loadRoleAbilityMap(client,tenantId,agencyId,access.roleIds);
  const granted=abilities.filter(a=>access.admin||roleHasAbility(map,access.roleIds,a));
  if(!granted.some(a=>a==='civil_paper_view_all'||a==='civil_paper_view_own'))return response(403,{success:false,error:'Civil record access is required.'});
  const t=await client.query(`SELECT metadata->'civilJurisdictionProfile' AS profile,timezone FROM suite_tenants WHERE id=$1`,[tenantId]);
  const profile=t.rows[0]?.profile||{profileId:'US-GENERAL',status:'unconfigured'};
  const operation=String(body.operation||'context');
  if(operation==='context')return response(200,{success:true,data:{profile,ruleVersion:CA_RULE_VERSION,workflows:CA_WORKFLOWS,personId:access.personId,abilities:granted,admin:access.admin}});
  if(profile.profileId!=='US-CA')return response(409,{success:false,error:'Select a California jurisdiction profile first.'});
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
  if(operation==='list'){
    const q=await client.query(`SELECT value,version,updated_at FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND deleted=false AND key::jsonb->0='["civil","papers"]'::jsonb AND value->'california'->>'ruleVersion'=$3 AND ($4::boolean OR value->>'assignedServerId'=$5) ORDER BY updated_at DESC LIMIT 1000`,[tenantId,agencyId,CA_RULE_VERSION,access.admin||granted.includes('civil_paper_view_all'),access.personId]);
    const cases=q.rows.filter(row=>canView(row.value)).map(row=>({record:row.value,version:Number(row.version),updatedAt:row.updated_at}));
    return response(200,{success:true,data:{cases,limit:1000}});
  }
  if(operation==='get'){
    if(!uuid(body.id))return response(400,{success:false,error:'Valid case ID required.'});
    const q=await client.query(`SELECT value,version,updated_at FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND deleted=false`,[tenantId,agencyId,keyFor(body.id)]);
    if(!q.rows[0]?.value?.california||!canView(q.rows[0].value))return response(404,{success:false,error:'Case not found.'});
    return response(200,{success:true,data:{record:q.rows[0].value,version:Number(q.rows[0].version)}});
  }
  if(!['create','command'].includes(operation))return response(400,{success:false,error:'Unknown Civil operation.'});
  if(JSON.stringify(body).length>100000)return response(413,{success:false,error:'Request is too large.'});
  // Schema preparation occurs outside the mutation transaction so its cache cannot
  // outlive rolled-back DDL on a cold invocation.
  await ensureAuditSchema(client);
  await client.query('BEGIN');
  try{
    // Shared with attachment writes; serialize case-specific updates and financial checks.
    let record,version,id=body.id;
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
      if(command==='attach_document')await verifyAttachmentForParent(tenantId,agencyId,payload.key,'civil.papers',id);
      record=applyCaliforniaCommand(existing.value,command,payload,ctx);version=Number(existing.version)+1;
      await client.query(`UPDATE suite_records SET value=$4::jsonb,version=$5,updated_at=now(),updated_by=$6 WHERE tenant_id=$1 AND agency_id=$2 AND key=$3`,[tenantId,agencyId,keyFor(id),JSON.stringify(record),version,auth.userId]);
    }
    await appendAuditEvent(client,auth,{tenantId,agencyId,personId:access.personId,module:'Civil',entityType:'civil_paper',description:`California ${operation==='create'?'intake':body.command}: ${record.caseNumber} (${id}); version ${version}${testOnly?' [TEST]':''}`});
    await client.query('COMMIT');
    return response(200,{success:true,data:{record,version,balanceCents:ledgerBalance(record)}});
  }catch(error){await client.query('ROLLBACK');if(error instanceof CivilError||error.statusCode)return response(error.statusCode||400,{success:false,error:error.message});throw error;}
}
