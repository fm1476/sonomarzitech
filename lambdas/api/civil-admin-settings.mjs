import {response,resolveWorkspaceMembership} from './core.mjs';
import {appendAuditEvent} from './audit.mjs';
import {validateCivilAdminSetting} from './lib/civil-admin-validation.mjs';

const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function civilAdminSettingsApi(client,auth,body){
  const {tenantId,agencyId}=body||{};
  if(!uuid(tenantId)||!uuid(agencyId))return response(400,{success:false,error:'Valid tenant and agency IDs required.'});
  const access=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);
  if(access.error)return access.error;
  if(!access.enabledModules.includes('civil'))return response(403,{success:false,error:'Civil Process is not licensed.'});
  if(!access.admin)return response(403,{success:false,error:'Civil administration access is required.'});
  if(JSON.stringify(body).length>45000)return response(413,{success:false,error:'Configuration is too large.'});
  const saving=body.operation==='save';
  if(!['load','save'].includes(body.operation))return response(400,{success:false,error:'Unknown configuration operation.'});
  let validated;
  if(saving){try{validated=validateCivilAdminSetting(body.section,body.value);}catch(e){return response(400,{success:false,error:e.message});}}
  await client.query('BEGIN');
  try{
    const q=await client.query("SELECT metadata FROM suite_tenants WHERE id=$1 FOR UPDATE",[tenantId]);
    if(!q.rows.length){await client.query('ROLLBACK');return response(404,{success:false,error:'Tenant not found.'});}
    const meta=q.rows[0].metadata||{};
    const california=meta.civilJurisdictionProfile?.profileId==='US-CA';
    const entry=meta.civilAdminSettings?.[agencyId]||{revision:0,values:{}};
    if(!california){await client.query('COMMIT');return response(200,{success:true,data:{california:false,revision:0,values:{}}});}
    if(!saving){await client.query('COMMIT');return response(200,{success:true,data:{california:true,revision:entry.revision||0,values:entry.values||{}}});}
    if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==(entry.revision||0)){
      await client.query('ROLLBACK');return response(409,{success:false,error:'Civil administration settings changed. Reload this screen.'});
    }
    const next={revision:(entry.revision||0)+1,values:{...(entry.values||{}),[body.section]:validated}};
    await client.query(`UPDATE suite_tenants SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{civilAdminSettings}',COALESCE(metadata->'civilAdminSettings','{}'::jsonb)||jsonb_build_object($2::text,$3::jsonb),true) WHERE id=$1`,[tenantId,agencyId,JSON.stringify(next)]);
    await appendAuditEvent(client,auth,{tenantId,agencyId,personId:access.personId,module:'Civil',entityType:'civil_configuration',description:'Updated California Civil administration: '+body.section+' (revision '+next.revision+').'});
    await client.query('COMMIT');
    return response(200,{success:true,data:{california:true,...next}});
  }catch(error){await client.query('ROLLBACK');throw error;}
}
