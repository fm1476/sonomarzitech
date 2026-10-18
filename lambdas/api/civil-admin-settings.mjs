import {response,resolveWorkspaceMembership} from './core.mjs';
import {appendAuditEvent} from './audit.mjs';

const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const LIST_KEYS = new Set(['paperTypes','courtsOfOrigin','serviceMethods','attemptResults','propertyTypes','propertyDisposalMethods','propertyStorageLocations','propertySeizureStatuses','realPropertyTypes','realPropertyLevyStatuses']);
const SETTINGS_KEYS = new Set(['notifySettings','feeSchedule','feeCategoryGLCodes','paymentMethodGLCodes','financialSettings',...LIST_KEYS]);
const plain = v => v!==null && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
function validate(section,value){
  if(!SETTINGS_KEYS.has(section))throw Error('Unsupported Civil administration setting.');
  if(section==='financialSettings'){
    if(!plain(value)||Object.keys(value).sort().join(',')!=='feeCategoryGLCodes,feeSchedule,paymentMethodGLCodes')throw Error('Invalid financial settings.');
    return {feeSchedule:validate('feeSchedule',value.feeSchedule),feeCategoryGLCodes:validate('feeCategoryGLCodes',value.feeCategoryGLCodes),paymentMethodGLCodes:validate('paymentMethodGLCodes',value.paymentMethodGLCodes)};
  }
  if(LIST_KEYS.has(section)){
    if(!Array.isArray(value)||value.length>150||value.some(v=>typeof v!=='string'||!v.trim()||v.length>160))throw Error('Invalid Civil reference list.');
    if(new Set(value.map(v=>v.trim().toLowerCase())).size!==value.length)throw Error('Duplicate Civil reference values.');
    return value.map(v=>v.trim());
  }
  if(section==='feeCategoryGLCodes'||section==='paymentMethodGLCodes'){
    if(!plain(value)||Object.keys(value).length>60||Object.entries(value).some(([k,v])=>k.length>120||typeof v!=='string'||v.length>100))throw Error('Invalid GL codes.');
    return value;
  }
  if(section==='notifySettings'){
    if(!plain(value)||Object.keys(value).sort().join(',')!=='priorityUnassignedRoleId,returnDueRoleId')throw Error('Invalid notification routing.');
    for(const id of Object.values(value))if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Invalid notification recipient role.');
    return value;
  }
  if(!plain(value)||JSON.stringify(value).length>30000)throw Error('Invalid Civil fee configuration.');
  const permitted=new Set(['mileageRatePerMile','interestRateAnnualPercent','commissionRatePercent','feeWaiverApprovalThreshold','voidApprovalThreshold','byType']);
  if(Object.keys(value).some(k=>!permitted.has(k)))throw Error('Unknown Civil fee configuration field.');
  for(const [key,n] of Object.entries(value))if(key!=='byType'&&(!Number.isFinite(n)||n<0||n>1000000))throw Error('Invalid Civil fee amount.');
  if(!plain(value.byType)||Object.keys(value.byType).length>150)throw Error('Invalid paper-type fee configuration.');
  for(const fee of Object.values(value.byType)){
    if(!plain(fee))throw Error('Invalid paper-type fee entry.');
    for(const [k,v] of Object.entries(fee)){
      if(['baseFee','additionalAttemptFee','defaultDeadlineDays','requiredAttempts'].includes(k)){if(!Number.isFinite(v)||v<0||v>1000000)throw Error('Invalid paper-type fee number.');}
      else if(['feeWaived','enforceable'].includes(k)){if(typeof v!=='boolean')throw Error('Invalid fee boolean.');}
      else if(k==='allowedServiceMethods'){if(!Array.isArray(v)||v.length>30||v.some(m=>typeof m!=='string'||!m.trim()||m.length>160))throw Error('Invalid service methods.');}
      else throw Error('Unknown paper-type fee setting.');
    }
  }
  return value;
}
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
  if(saving){try{validated=validate(body.section,body.value);}catch(e){return response(400,{success:false,error:e.message});}}
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
