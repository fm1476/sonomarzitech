export function createWorkflowApi({
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility
}) {
/*
 * ---------------------------------------------------------
 * WORKFLOWS / APPROVALS (AWS/RDS)
 * ---------------------------------------------------------
 * Stores the workflow subsystem as one versioned JSON document per agency.
 * This replaces the legacy suite_workflow_api Supabase RPC.
 */
const WORKFLOW_RECORD_KEY = JSON.stringify([["workflows"], "$state"]);
function workflowEmptyState(){ return {templates:[],items:[]}; }
function workflowNow(){ return new Date().toISOString(); }
function workflowId(){ return crypto.randomUUID(); }
function workflowAssert(ok,message,statusCode=403){ if(!ok){ const e=new Error(message); e.statusCode=statusCode; throw e; } }
async function workflowLoadState(client,ctx,lock=false){
  const q=await client.query(
    `SELECT value, version FROM suite_records
      WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND deleted=false
      ${lock?'FOR UPDATE':''}`,
    [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY]
  );
  if(!q.rows.length) return {state:workflowEmptyState(),version:0};
  const v=q.rows[0].value||{};
  return {state:{templates:Array.isArray(v.templates)?v.templates:[],items:Array.isArray(v.items)?v.items:[]},version:Number(q.rows[0].version||0)};
}
async function workflowSaveState(client,ctx,state,version){
  const next=version+1;
  if(version===0){
    await client.query(
      `INSERT INTO suite_records (tenant_id,agency_id,key,value,version,deleted,updated_at,updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,false,now(),$6)`,
      [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY,JSON.stringify(state),next,ctx.userId]
    );
  }else{
    const q=await client.query(
      `UPDATE suite_records SET value=$4::jsonb,version=$5,updated_at=now(),updated_by=$6
        WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND version=$7 AND deleted=false RETURNING version`,
      [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY,JSON.stringify(state),next,ctx.userId,version]
    );
    if(!q.rows.length){ const e=new Error('Workflows changed in another session. Refresh and retry.'); e.statusCode=409; throw e; }
  }
  return next;
}
async function workflowContext(client,auth,tenantId,agencyId){
  const ctx=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);
  if(ctx.error) return ctx;
  ctx.userId=auth.userId;
  const abilityMap=ctx.admin?new Map():await loadRoleAbilityMap(client,tenantId,agencyId,ctx.roleIds);
  const has=a=>ctx.admin||roleHasAbility(abilityMap,ctx.roleIds,a);
  return {...ctx,manage:has('workflow_manage'),approve:has('workflow_approve'),use:has('workflow_use')};
}
async function workflowApi(client,auth,body){
  const tenantId=body?.tenantId||body?.tenant_id;
  const agencyId=body?.agencyId||body?.agency_id;
  const action=String(body?.action||'');
  const payload=body?.payload&&typeof body.payload==='object'?body.payload:{};
  if(!tenantId||!agencyId||!action) return response(400,{success:false,error:'tenantId, agencyId, and action are required.'});
  const ctx=await workflowContext(client,auth,tenantId,agencyId);
  if(ctx.error) return ctx.error;
  if(!ctx.manage&&!ctx.approve&&!ctx.use) return response(403,{success:false,error:'Workflow access is not enabled for this role.'});
  if(action==='list'){
    const {state}=await workflowLoadState(client,ctx,false);
    const items=ctx.manage?state.items:state.items.filter(i=>i.requester_id===ctx.personId || (ctx.approve&&i.status==='pending'&&ctx.roleIds.includes(i.definition?.steps?.[i.step_index]?.roleId)));
    return response(200,{success:true,data:{templates:state.templates.filter(t=>ctx.manage||t.active),items}});
  }
  await client.query('BEGIN');
  try{
    const loaded=await workflowLoadState(client,ctx,true), state=loaded.state, now=workflowNow();
    let result;
    if(action==='save_template'){
      workflowAssert(ctx.manage,'Workflow management access is required.');
      const name=String(payload.name||'').trim(), description=String(payload.description||'').trim(), definition=payload.definition;
      workflowAssert(name.length>=3 && definition && Array.isArray(definition.fields) && definition.fields.length && Array.isArray(definition.steps) && definition.steps.length,'A valid workflow name, fields, and approval steps are required.',400);
      let t=payload.id?state.templates.find(x=>x.id===payload.id):null;
      if(t && Number(t.version)!==Number(payload.version)){ const e=new Error('Workflow changed. Reload before editing.'); e.statusCode=409; throw e; }
      if(!t && payload.clientId){
        t=state.templates.find(x=>x.client_id===payload.clientId);
        if(t){
          if(t.name!==name||t.description!==description||JSON.stringify(t.definition)!==JSON.stringify(definition)){ const e=new Error('This workflow was already created with different content. Refresh before editing.'); e.statusCode=409; throw e; }
          result=t;
        }
      }
      if(!result){
        if(t) Object.assign(t,{name,description,definition,version:Number(t.version||0)+1,updated_at:now});
        else { t={id:workflowId(),client_id:payload.clientId||null,name,description,definition,active:false,version:1,updated_at:now}; state.templates.push(t); }
        result=t;
      }
    } else if(action==='set_active'){
      workflowAssert(ctx.manage,'Workflow management access is required.');
      const t=state.templates.find(x=>x.id===payload.id);
      workflowAssert(t && Number(t.version)===Number(payload.version),'Workflow changed. Reload before editing.',409);
      t.active=!!payload.active; t.version=Number(t.version||0)+1; t.updated_at=now; result=t;
    } else if(action==='submit'){
      workflowAssert(ctx.use||ctx.manage,'Workflow submission access is required.');
      let item=payload.clientId?state.items.find(x=>x.client_id===payload.clientId):null;
      if(!item){
        const t=state.templates.find(x=>x.id===payload.templateId&&x.active);
        workflowAssert(t,'Workflow unavailable.',404);
        const first=t.definition?.steps?.[0];
        item={id:workflowId(),template_id:t.id,definition:JSON.parse(JSON.stringify(t.definition)),answers:payload.answers||{},title:t.name,requester_id:ctx.personId,requester_person_id:ctx.personId,status:'pending',step_index:0,due_at:new Date(Date.now()+(Number(first?.dueDays??2))*86400000).toISOString(),version:1,history:[{action:'submitted',by:ctx.personId,at:now}],created_at:now,updated_at:now,client_id:payload.clientId||null};
        state.items.push(item);
      }
      result=item;
    } else if(['approve','reject','cancel'].includes(action)){
      const item=state.items.find(x=>x.id===payload.id);
      workflowAssert(item && Number(item.version)===Number(payload.version) && item.status==='pending','Request changed. Reload before deciding.',409);
      if(action==='cancel') workflowAssert(item.requester_id===ctx.personId||ctx.manage,'Only the requester can cancel.');
      else {
        const role=item.definition?.steps?.[item.step_index]?.roleId;
        workflowAssert(ctx.manage||(ctx.approve&&ctx.roleIds.includes(role)),'This approval is assigned to another role.');
      }
      if(action==='cancel') item.status='cancelled';
      else if(action==='reject') item.status='rejected';
      else if(++item.step_index >= (item.definition?.steps?.length||0)) item.status='approved';
      item.due_at=item.status==='pending'?new Date(Date.now()+(Number(item.definition.steps[item.step_index]?.dueDays??2))*86400000).toISOString():null;
      item.version=Number(item.version||0)+1; item.updated_at=now; item.history=Array.isArray(item.history)?item.history:[]; item.history.push({action,by:ctx.personId,at:now,note:String(payload.note||'')}); result=item;
    } else {
      return response(400,{success:false,error:'Unsupported workflow action.'});
    }
    await workflowSaveState(client,ctx,state,loaded.version);
    await client.query('COMMIT');
    return response(200,{success:true,data:result});
  }catch(error){
    await client.query('ROLLBACK');
    if(error.statusCode) return response(error.statusCode,{success:false,error:error.message});
    throw error;
  }
}

  return workflowApi;
}
