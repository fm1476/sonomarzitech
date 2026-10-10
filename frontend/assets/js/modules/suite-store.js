/* Record storage: local IndexedDB transactions plus optional authenticated server RPC.
   No writes are made to the legacy all-in-one app_state row. */
function schedulingSaveBatches(patches,batchSize=60){
  const collections=new Set(['scheduleShifts','scheduleAssignments','scheduleCoverages','overtimeOpportunities','specialEvents','leaveRequests','scheduleExceptions','shiftSwapRequests','rollCalls','otCallbackOptIns','bidCycles','extraDutyJobs','extraDutySignups','scheduleWorkGroups','schedulingSettings','records','refData']);
  const scheduling=[],other=[];
  for(const patch of patches){const [path]=JSON.parse(patch.key);(path[0]==='pm'&&collections.has(path[1])?scheduling:other).push(patch);}
  if(scheduling.length>5000)throw Error('Too many scheduling changes for one atomic save. Download pending changes before reloading.');
  const batches=scheduling.length?[scheduling]:[];
  for(let i=0;i<other.length;i+=batchSize)batches.push(other.slice(i,i+batchSize));
  return batches;
}

function pmCollectionCanPersist(collection,roles,roleIds){
  if(roleIds.some(id=>id==='role_admin'||id==='role_platform_admin'))return true;
  const has=ability=>roleIds.some(id=>roles.find(r=>r.id===id)?.abilities?.[ability]===true);
  const schedulingAbilities={
    scheduleWorkGroups:['pm_schedule_manage'],schedulingSettings:[],
    scheduleShifts:['pm_schedule_manage'],scheduleAssignments:['pm_schedule_manage','pm_bidding_manage'],
    scheduleCoverages:['pm_schedule_manage','pm_overtime_manage','pm_leave_request_approve'],
    scheduleExceptions:['pm_schedule_manage','pm_leave_request_approve','pm_bidding_manage'],
    leaveRequests:['pm_leave_request_submit','pm_leave_request_approve'],
    shiftSwapRequests:['pm_leave_request_submit','pm_schedule_manage'],
    overtimeOpportunities:['pm_overtime_optin','pm_overtime_manage','pm_schedule_manage'],
    otCallbackOptIns:['pm_overtime_optin','pm_overtime_manage'],
    rollCalls:['pm_rollcall_manage'],bidCycles:['pm_bidding_submit','pm_bidding_manage'],
    extraDutyJobs:['pm_extraduty_manage'],extraDutySignups:['pm_extraduty_signup','pm_extraduty_manage']
  };
  if(Object.hasOwn(schedulingAbilities,collection))return schedulingAbilities[collection].some(has);
  return collection==='trainingCheckins'||has('personnel_manage');
}

function ensureSchedulingWorkGroupDefinitions(state,roleIds){
  if(!roleIds.some(id=>id==='role_admin'||id==='role_platform_admin')||!state.pm)return;
  state.pm.scheduleWorkGroups ||= [];
  const known={wg_patrol:'Patrol',wg_dispatch:'Dispatch',wg_records:'Records',wg_investigations:'Investigations'};
  for(const shift of state.pm.scheduleShifts||[]){
    shift.workGroupId ||= 'wg_patrol';
    if(!state.pm.scheduleWorkGroups.some(g=>g.id===shift.workGroupId)){
      const name=known[shift.workGroupId]||'Recovered Calendar '+shift.workGroupId;
      state.pm.scheduleWorkGroups.push({id:shift.workGroupId,name,active:true,visibility:known[shift.workGroupId]?'unit':'selected',unitNames:known[shift.workGroupId]?[name]:[],viewerIds:[],managerIds:[]});
    }
  }
}
function prepareSchedulingMigrationBaseline(baseline,records,roleIds){
  if(!roleIds.some(id=>id==='role_admin'||id==='role_platform_admin'))return;
  const collection=key=>JSON.parse(key)[0].join('.');
  for(const key of [...baseline.keys()])if(collection(key)==='pm.scheduleWorkGroups')baseline.delete(key);
  for(const record of records){
    if(record.deleted)continue;
    const name=collection(record.key);
    if(name==='pm.scheduleWorkGroups'||name==='pm.scheduleShifts'&&record.value&&!record.value.workGroupId&&JSON.parse(record.key)[1]!=='$order')baseline.set(record.key,JSON.parse(JSON.stringify(record.value)));
  }
}

const SuiteStore=(()=>{
  const LOCAL_PREVIEW=location.hostname==='localhost'||location.hostname==='127.0.0.1';
  const AWS_DEV_MODE=!LOCAL_PREVIEW;
  window.SONOMARZI_AWS_DEV=AWS_DEV_MODE;
  const AWS_DEV={
    apiBase:'https://7debzkoq7k.execute-api.us-east-2.amazonaws.com',
    tokenKey:'sonomarzi.aws.id_token',
    tenantId:'f15865be-cf46-41e0-9d60-7cd753437501',
    agencyId:'64624bcc-232d-4af5-bae6-a8e621cde447'
  };

  function awsToken(){
    return sessionStorage.getItem(AWS_DEV.tokenKey);
  }

  function agencySubdomainFromHost(){
    const host=location.hostname.toLowerCase();
    if(!host.endsWith('.sonomarzi.com')) return '';
    const subdomain=host.slice(0,-'.sonomarzi.com'.length);
    if(!subdomain || subdomain.includes('.') || ['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(subdomain)) return '';
    return subdomain;
  }

  async function awsJson(path, options={}){
    const token=awsToken();
    if(!token) throw Error('AWS Cognito session is not available.');

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);

    try{
      const res=await fetch(`${AWS_DEV.apiBase}${path}`,{
        ...options,
        signal:controller.signal,
        headers:{
          Authorization:`Bearer ${token}`,
          ...(options.body?{'Content-Type':'application/json'}:{}),
          ...(options.headers||{})
        }
      });

      const text=await res.text();
      let body=null;
      try{ body=text?JSON.parse(text):null; }catch{ body={raw:text}; }

      if(!res.ok){
        const error=Error(body?.error||body?.message||`AWS request failed (${res.status}).`);
        error.status=res.status;
        error.code=body?.code||String(res.status);
        error.conflictKey=body?.conflict_key||null;
        error.expectedVersion=Number.isSafeInteger(body?.expected_version)?body.expected_version:null;
        error.currentVersion=Number.isSafeInteger(body?.current_version)?body.current_version:null;
        error.responseBody=body;
        throw error;
      }
      return body;
    }catch(error){
      if(error?.name==='AbortError') throw Error('AWS request timed out after 15 seconds.');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  async function remoteRpc(name,args={}){
    if(!AWS_DEV_MODE) return supabaseClient.rpc(name,args);

    if(name==='suite_load_workspace'){
      try{
        const explicitTenantId=args?.p_tenant_id||null;
        const explicitAgencyId=args?.p_agency_id||null;
        let path;
        if(explicitTenantId&&explicitAgencyId){
          path=`/workspace?tenantId=${encodeURIComponent(explicitTenantId)}&agencyId=${encodeURIComponent(explicitAgencyId)}`;
        }else{
          const subdomain=agencySubdomainFromHost();
          path=subdomain
            ? `/workspace?subdomain=${encodeURIComponent(subdomain)}`
            : `/workspace?tenantId=${encodeURIComponent(AWS_DEV.tenantId)}&agencyId=${encodeURIComponent(AWS_DEV.agencyId)}`;
        }
        const data=await awsJson(path);
        return {data,error:null};
      }catch(error){
        return {data:null,error};
      }
    }

    if(name==='suite_apply_changes'){
      try{
        const data=await awsJson('/apply-changes',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:args?.p_tenant_id||AWS_DEV.tenantId,
            agency_id:args?.p_agency_id||AWS_DEV.agencyId,
            changes:args?.p_changes||[]
          })
        });
        return {data,error:null};
      }catch(error){
        return {data:null,error};
      }
    }

    // Do not silently fall back to Supabase from the core AWS transport.
    return {data:null,error:Error(`This feature is not yet migrated to AWS: ${name}`)};
  }
  let db=null,baseline=new Map(),saving=false,pendingWrites=false,serverReady=false,serverVersions={},serverOrders=new Map(),notificationReads=new Set(),debounce=null,saveAgain=false,waiters=[],consecutiveFailures=0,lastErrorWasVersionConflict=false,sessionEpoch=0;
  async function resolveSpuriousConflict(batch){
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
    const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
    if(error) throw error;
    const byKey=new Map((data.records||[]).map(r=>[r.key,r]));
    for(const p of batch){
      const row=byKey.get(p.key);
      const rowDeleted=!row||row.deleted;
      if(p.deleted){ if(!rowDeleted) return false; }
      else{ if(rowDeleted||!equal(row.value,p.value)) return false; }
    }
    for(const p of batch){
      const row=byKey.get(p.key);
      if(!row) continue;
      serverVersions[p.key]=row.version;
      if(JSON.parse(p.key)[1]==='$order'&&!row.deleted)serverOrders.set(p.key,clone(row.value));
      if(p.deleted) baseline.delete(p.key); else baseline.set(p.key,clone(row.value));
    }
    return true;
  }
  let mode='local',remoteContext={tenantId:null,agencyId:null};
  const clone=v=>JSON.parse(JSON.stringify(v));
  function flatten(state){const result=new Map();function add(path,value){const selfService=path[0]==='pm'&&['trainingCheckins','leaveRequests'].includes(path[1]);const hasRecords=Array.isArray(value)&&(selfService||value.length&&value.every(x=>x&&typeof x==='object'&&(x.id||x.personId)));const idFor=x=>String(x.id||x.personId);if(hasRecords&&new Set(value.map(idFor)).size===value.length){result.set(JSON.stringify([path,'$order']),value.map(idFor));value.forEach(x=>result.set(JSON.stringify([path,idFor(x)]),x));}else result.set(JSON.stringify([path,'$value']),value);}
    Object.entries(state).forEach(([key,value])=>{
      // These values are derived from authenticated workspace/tenant context and are
      // server-owned configuration, not ordinary suite records. Persisting them from
      // every user session makes unrelated module saves carry stale tenant config.
      if(['currentRoleIds','currentRoleId','enabledModules'].includes(key))return;
      if(['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil'].includes(key)&&value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>add([key,k],v));else add([key],value);
    });return new Map([...result].map(([k,v])=>[k,clone(v)]));}
  function inflate(map){const state={},groups=new Map();for(const [key,value] of map){const [path,id]=JSON.parse(key),p=JSON.stringify(path);if(!groups.has(p))groups.set(p,{path,items:new Map()});groups.get(p).items.set(id,value);}for(const {path,items} of groups.values()){let target=state;for(const p of path.slice(0,-1))target=target[p]||(target[p]={});target[path.at(-1)]=items.has('$value')?clone(items.get('$value')):(items.get('$order')||[...items.keys()]).filter(id=>items.has(id)&&!id.startsWith('$')).map(id=>clone(items.get(id)));}return state;}
  function mergeTemplate(base,data){if(Array.isArray(data))return data;if(!data||typeof data!=='object')return data;const out={...base};for(const [k,v] of Object.entries(data))out[k]=mergeTemplate(base?.[k],v);return out;}
  function equal(a,b){
    if(Object.is(a,b))return true;
    if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)!==Array.isArray(b))return false;
    if(Array.isArray(a))return a.length===b.length&&a.every((value,i)=>equal(value,b[i]));
    const keys=Object.keys(a),other=Object.keys(b);
    return keys.length===other.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&equal(a[key],b[key]));
  }
  function changes(before,after){const out=[];for(const key of new Set([...before.keys(),...after.keys()]))if(!equal(before.get(key),after.get(key)))out.push({key,value:after.has(key)?after.get(key):null,deleted:!after.has(key),expected:before.has(key)?before.get(key):null,existed:before.has(key)});return out;}
  function collectionOrder(p){
    const [path,id]=JSON.parse(p.key);
    return id==='$order' && Array.isArray(path) && path.length>0;
  }
  function mergeSharedOrder(p){
    const before=Array.isArray(p.expected)?p.expected:[];
    const after=Array.isArray(p.value)?p.value:[];
    const remote=serverOrders.get(p.key)||[];
    const removed=new Set(before.filter(id=>!after.includes(id)));
    return [...remote.filter(id=>!removed.has(id)),...after.filter(id=>!remote.includes(id))];
  }
  function status(type,message){const el=document.getElementById('syncStatus');el.textContent=message;el.style.color=type==='error'?'var(--red)':type==='saving'?'var(--gold)':'var(--text-dim)';el.setAttribute('role','status');const strip=document.getElementById('saveWarning');if(strip){strip.hidden=type!=='error';strip.firstChild.textContent=message;} }
  function openDb(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('Durable local storage is unavailable.'));return;}const req=indexedDB.open('PublicSafetySuite.v2',1);req.onupgradeneeded=()=>{req.result.createObjectStore('records',{keyPath:'key'});req.result.createObjectStore('meta',{keyPath:'key'});};req.onsuccess=()=>{db=req.result;resolve(db);};req.onerror=()=>reject(req.error);});}
  function readAll(){return new Promise((resolve,reject)=>{const req=db.transaction('records').objectStore('records').getAll();req.onsuccess=()=>resolve(new Map(req.result.map(r=>[r.key,r.value])));req.onerror=()=>reject(req.error);});}
  function transaction(patches){return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');let conflict=null;for(const p of patches){const req=store.get(p.key);req.onsuccess=()=>{const found=req.result;if((!!found!==p.existed)||(found&&!equal(found.value,p.expected))){conflict=Error('Another session changed this record. Your changes remain in this tab. Download a backup before reloading.');tx.abort();return;}if(p.deleted)store.delete(p.key);else store.put({key:p.key,value:p.value});};}tx.oncomplete=()=>resolve();tx.onabort=()=>reject(conflict||tx.error||Error('Local save failed.'));tx.onerror=()=>{};});}
  async function load(){try{await openDb();const saved=await readAll();if(saved.size){STATE=inflate(saved);baseline=saved;try{runCoreMigrations();}catch(e){console.error('Core migrations failed (continuing anyway):',e);}STATE.currentRoleIds=[];status('ok','Saved on this device · Demo workspace');return;} }catch(e){status('error','Session only · Local storage unavailable');}
    let legacy=null;try{if(window.storage){const item=await window.storage.get(STORAGE_KEY,false);if(item?.value)legacy=JSON.parse(item.value);}}catch{}
    STATE=legacy||await buildSeedState();STATE.currentRoleIds=[];if(db){const initial=flatten(STATE);try{await transaction(changes(new Map(),initial));baseline=initial;status('ok','Saved on this device · Demo workspace');}catch(e){status('error',e.message);}}else baseline=flatten(STATE);
  }
  function persist(){if(!STATE)return;SuiteUX.clearDirty();pendingWrites=true;clearTimeout(debounce);status('saving','Saving changes…');debounce=setTimeout(flush,200);try{renderNotifBell();}catch(e){console.error('renderNotifBell failed after persist() (save is unaffected):',e);}}
  async function flush(){
    clearTimeout(debounce);
    if(saving){saveAgain=true;return new Promise(resolve=>waiters.push(resolve));}
    saving=true;
    const myEpoch=sessionEpoch;
    // If a logout, a different account signing in, or a tenant/agency switch makes a different
    // session current on this tab while this save is still in flight, its outcome no longer means
    // anything for what's on screen now. Every point below that would touch
    // serverVersions/baseline/status/pendingWrites, or schedule a retry, checks this first and
    // quietly stands down instead of writing into whichever session IS current using version
    // expectations that belong to the one that just ended.
    const staleSession=()=>sessionEpoch!==myEpoch;
    let success=false;
    try{
      const snapshot=flatten(STATE);
      let patches=changes(baseline,snapshot);
      const rejected=[];
      if(mode==='shared')patches=patches.filter(p=>{
        const [path]=JSON.parse(p.key);
        if(path[0]==='accounts'||path[0]==='auditLog'||path[0]==='enabledModules') return false;
        // Alerts are derived while rendering. Read receipts have their own per-user table.
        if(['activity','dashboardPrefs','notifications'].includes(path[1])) return false;
        if(path[0]==='ssoConfig'){
          if(!(HOME_ROLE_IDS||[]).some(id=>id==='role_admin'||id==='role_platform_admin')){rejected.push(p);return false;}
        }
        // Never attempt to save a module this role has no access to at all. STATE keeps default
        // scaffolding in memory for every module regardless of which ones the current role can
        // actually use, so without this, saving anything at all also tries to resave every other
        // module's untouched defaults right alongside it. A save is one all-or-nothing
        // transaction, so the server correctly refusing write access to a module this role was
        // never meant to touch would silently fail the entire save, including whatever the
        // person actually meant to change, a training check-in bundled in with an untouched copy
        // of an entirely different module's data, for example.
        const moduleAbility = {qm:'module_quartermaster', fleet:'module_fleet', pm:'module_personnel', k9:'module_k9', drone:'module_drone', eod:'module_eod', subpoena:'module_subpoena', grants:'module_grants', civil:'module_civil'}[path[0]];
        if(moduleAbility){
          const assigned=(HOME_ROLE_IDS||[]).some(id=>STATE.roles.find(role=>role.id===id)?.abilities?.[moduleAbility]);
          if(!assigned){rejected.push(p);return false;}
        }
        // Permit scheduling writes by their specific abilities. The API validates named
        // calendar management and ownership against the authenticated workspace membership.
        if(path[0]==='pm'&&!pmCollectionCanPersist(path[1],STATE.roles,HOME_ROLE_IDS||[])){rejected.push(p);return false;}
        return true;
      });
      if(mode==='local'&&!db)throw Error('Session only · Durable local storage is unavailable. Download a backup before leaving.');
      if(!patches.length){
        if(!staleSession()){
          pendingWrites=!!rejected.length;
          if(rejected.length)saveAgain=false;
          else lastErrorWasVersionConflict=false;
          status(rejected.length?'error':'ok',rejected.length?'A change is not authorized for this account. Download pending changes before reloading.':mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
        }
        return !rejected.length;
      }
      if(mode==='shared'){
        if(!serverReady)throw Error('Agency connection unavailable. Changes are pending in this tab.');
        // Splitting into batches keeps any single database round trip small and fast regardless
        // of how much total work there is to save -- a first-ever migration healing pass on a
        // brand new tenant can legitimately touch several hundred records at once (every role,
        // every module's reference data), and asking one request to do all of that in one breath
        // is a needless amount of risk for what gains nothing over doing it in smaller pieces.
        // Updating baseline/serverVersions after each batch (not just once at the very end) means
        // that if a later batch fails, everything already confirmed saved stays confirmed --
        // a retry only has to redo what's actually still outstanding, not start over from zero.
        const BATCH_SIZE = 60;
        // Keep linked scheduling awards/approvals atomic even above the usual batch size.
        const batches = schedulingSaveBatches(patches,BATCH_SIZE);
        if(patches.length>20) debugLog(`[save] ${patches.length} record(s) to save in ${batches.length} batch(es):`, patches.map(p=>p.key));
        for(let i=0;i<batches.length;i++){
          if(staleSession()) return false; // the session moved on; abandon the rest of this save quietly
          if(batches.length>1) status('saving',`Saving changes… (${i+1} of ${batches.length})`);
          const batch = batches[i];
          let wireChanges=batch.map(p=>({
            key:p.key,value:collectionOrder(p)?mergeSharedOrder(p):p.value,
            deleted:p.deleted,expected_version:serverVersions[p.key]||0,
          }));
          let data, error;
          try{
            ({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:wireChanges}));
          }catch(thrown){
            // Some client-library failure modes throw directly instead of resolving with a clean
            // {error} object -- a version conflict must be caught and classified the SAME way
            // regardless of which shape it arrives in, or it silently falls through to the
            // generic backoff-retry path below and gets auto-retried when it should never be.
            error = thrown;
          }
          if(staleSession()) return false; // the session moved on while this request was in flight
          if(error && /changed in another session/i.test(error.message||'') && batch.some(collectionOrder)){
            // Rebase only the shared order row. A conflict on a real record still
            // stops the save so another person's changes cannot be overwritten.
            const latest=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
            if(!latest.error&&!staleSession()){
              const rows=new Map((latest.data.records||[]).map(r=>[r.key,r]));
              const safe=batch.every(p=>collectionOrder(p)||((rows.get(p.key)?.version||0)===(serverVersions[p.key]||0)));
              if(safe){
                for(const p of batch.filter(collectionOrder)){
                  const row=rows.get(p.key);
                  serverVersions[p.key]=row?.version||0;
                  if(row&&!row.deleted)serverOrders.set(p.key,clone(row.value));else serverOrders.delete(p.key);
                }
                wireChanges=batch.map(p=>({key:p.key,value:collectionOrder(p)?mergeSharedOrder(p):p.value,deleted:p.deleted,expected_version:serverVersions[p.key]||0}));
                try{({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:wireChanges}));}catch(thrown){error=thrown;}
              }
            }
          }
          if(staleSession())return false;
          if(patches.length>20) debugLog(`[save] batch ${i+1}/${batches.length}:`, error?`FAILED: ${error.code||''} ${error.message||''}`:'ok');
          if(error){
            // A version-conflict / serialization-failure error (Postgres class 40001) means this
            // tab's own view of the record is already stale -- someone or something else saved a
            // newer version first. Resending the exact same patch against the exact same expected
            // version can only ever fail the exact same way, forever. This is NOT a transient error
            // to blindly retry: it's an explicit signal (the message literally says "reload before
            // retrying") that a reload has to happen before another write attempt can possibly
            // succeed. Flagging it distinctly here is what lets the catch block below refuse to
            // queue another automatic retry for this specific failure, instead of hammering the
            // server with the same doomed request over and over.
            const isVersionConflict = error.code==='40001' || /reload before retrying|another session/i.test(error.message||'');
            if(isVersionConflict){
              // Before treating this as something a person needs to act on, check whether the
              // server's current value for these specific rows already matches what this tab was
              // trying to write. If so, the version number moved for a reason that changed nothing --
              // the same idempotent login-time healing running again, the same account open in a
              // second tab or device, a retried request landing twice -- and there is nothing to lose
              // by moving on quietly. If any row's current server value genuinely differs, this
              // returns false and falls straight through to the real-conflict handling below, exactly
              // as before.
              try{
                const resolved = await resolveSpuriousConflict(batch);
                if(staleSession()) return false;
                if(resolved){
                  debugLog('[save] absorbed a spurious version conflict (server value already matched) for', batch.map(p=>p.key));
                  continue;
                }
              }catch(resolveError){
                console.error('Could not check for a spurious version conflict, falling back to normal conflict handling:', resolveError);
                // fall through to the normal path below
              }
            }
            const conflictDetail = isVersionConflict && error.conflictKey
              ? ` [record ${error.conflictKey}; expected v${error.expectedVersion ?? '?'}; server v${error.currentVersion ?? '?'}]`
              : '';
            const staleErr = Error((error.message||'Shared save failed. Changes remain pending.') + conflictDetail);
            if(isVersionConflict){
              staleErr.isVersionConflict = true;
              staleErr.conflictKey = error.conflictKey || null;
              staleErr.expectedVersion = error.expectedVersion;
              staleErr.currentVersion = error.currentVersion;
            }
            if(error.code==='42501'||/cannot change this collection or record/i.test(error.message||''))staleErr.isPermissionFailure=true;
            throw staleErr;
          }
          for(const r of data||[]) serverVersions[r.key]=r.version;
          for(const p of wireChanges)if(JSON.parse(p.key)[1]==='$order'){
            if(p.deleted)serverOrders.delete(p.key);else serverOrders.set(p.key,clone(p.value));
          }
          for(const p of batch) if(p.deleted) baseline.delete(p.key); else baseline.set(p.key, p.value);
        }
      }else{
        if(!db)throw Error('Not saved · Local storage unavailable. Download a backup before leaving.');
        await transaction(patches);
        baseline=snapshot;
      }
      if(staleSession()) return false;
      pendingWrites=!!rejected.length||!equal([...snapshot],[...flatten(STATE)]);
      if(rejected.length){
        saveAgain=false;
        status('error','Some changes were saved, but another change is not authorized. Download pending changes before reloading.');
        return false;
      }
      status('ok',mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
      if(mode==='local'&&typeof TenantPlatform!=='undefined')TenantPlatform.snapshotCurrent();
      success=true;consecutiveFailures=0;lastErrorWasVersionConflict=false;
    }catch(e){
      if(staleSession()){
        // This save belonged to a session that's no longer current on this tab -- its failure
        // doesn't apply to anything on screen anymore, so it settles quietly instead of raising an
        // error banner or marking pendingWrites for a session that never made this change.
      }else{
        pendingWrites=true;
        if(e.isVersionConflict){
          // Never auto-retry this class of error -- it cannot succeed without a reload first, and
          // retrying anyway is exactly what was hammering the database. Drop any queued retry and
          // point the person at the reload action that's already sitting in the save-status strip.
          saveAgain=false;
          lastErrorWasVersionConflict=true;
          if(e.conflictKey){
            console.warn('Concurrent edit conflict', {
              conflictKey:e.conflictKey,
              expectedVersion:e.expectedVersion,
              currentVersion:e.currentVersion
            });
          }
          status('error','This record was updated by another user while you were editing it. Your changes have not been saved. Use "Reload saved copy" below to load the latest version before continuing.');
        }else if(e.isPermissionFailure){
          saveAgain=false;
          lastErrorWasVersionConflict=false;
          status('error','This account cannot save one of the changed records. Download pending changes before reloading.');
        }else{
          consecutiveFailures++;
          lastErrorWasVersionConflict=false;
          const networkFailure = navigator.onLine===false || e?.name==='TypeError' || /failed to fetch|networkerror|network request failed/i.test(String(e?.message||''));
          if(networkFailure){
            status('error','Connection lost. Your changes are still here but have not been saved. Reconnect to the internet, then click "Retry".');
          }else{
            status('error',e.message||'Save failed. Your changes remain in this tab and have not been saved.');
          }
        }
      }
    }finally{
      const waiting=waiters.splice(0);
      if(staleSession()){
        // Don't touch `saving` here -- signOut()/acceptRemote() already forced it back to false
        // (and may already have a newer flush of their own running) the moment the session moved
        // on, so resetting it here could clobber that newer flush's own lock instead of this one's.
        saveAgain=false;
        waiting.forEach(resolve=>resolve(false));
      }else{
        saving=false;
        if(saveAgain&&consecutiveFailures<6){
          saveAgain=false;
          const delay=success?0:Math.min(30000,1000*Math.pow(2,consecutiveFailures));
          setTimeout(()=>{flush().then(ok=>waiting.forEach(resolve=>resolve(ok)));},delay);
        }else{
          saveAgain=false;
          waiting.forEach(resolve=>resolve(success));
        }
      }
    }
    return success;
  }
  function acceptRemote(data){if(!data?.records)throw Error('The agency workspace has not been provisioned.');
    sessionEpoch++;
    clearTimeout(debounce);
    saving=false;
    saveAgain=false;
    consecutiveFailures=0;
    const orphanedWaiters=waiters.splice(0);
    orphanedWaiters.forEach(resolve=>resolve(false));
    const rows=new Map(data.records.filter(r=>!r.deleted).map(r=>[r.key,r.value]));STATE=mergeTemplate(data.template||{},inflate(rows));STATE.accounts=STATE.accounts||[];STATE.personnel=STATE.personnel||[];STATE.roles=(STATE.roles&&STATE.roles.length)?STATE.roles:[{id:'role_platform_admin',name:'SonoMarzi Platform Admin',locked:true,hidden:true,agencyScope:[],abilities:Object.fromEntries(ALL_ABILITY_IDS.map(id=>[id,id!=='chatbot_access']))}];
    debugLog('[access] RAW roles exactly as received from the server, before any client-side healing:', (STATE.roles||[]).map(r=>({id:r.id, name:r.name})));
    serverVersions={};serverOrders=new Map();for(const r of data.records){serverVersions[r.key]=r.version;if(JSON.parse(r.key)[1]==='$order'&&!r.deleted)serverOrders.set(r.key,clone(r.value));}lastRecordRevision=(data.records||[]).reduce((max,r)=>r.updated_at&&r.updated_at>max?r.updated_at:max,'')||lastRecordRevision;remoteUpdatePending=false;updateNoticeShown=false;try{runCoreMigrations();}catch(e){console.error('Core migrations failed (continuing anyway):',e);}ensureSchedulingWorkGroupDefinitions(STATE,data.role_ids||[]);baseline=flatten(STATE);prepareSchedulingMigrationBaseline(baseline,data.records,data.role_ids||[]);CURRENT_USER_ID=data.person_id;HOME_ROLE_IDS=data.role_ids;STATE.currentRoleIds=[...(data.role_ids||[])];remoteContext={tenantId:data.tenant_id,agencyId:data.agency_id};window.SonoMarziCurrentTenantSecurity={mfaPolicy:(data?.tenant?.metadata?.security?.mfaPolicy||'off'),tenantName:data?.tenant?.name||'',agencyName:data?.agency?.name||''};serverReady=true;mode='shared';pendingWrites=false;notificationReads=new Set();status('ok','Saved to agency workspace');}
  const notificationModule={Quartermaster:'qm',Fleet:'fleet',Personnel:'pm',K9:'k9',Drone:'drone',EOD:'eod',Subpoena:'subpoena',Grants:'grants',Civil:'civil'};
  const notificationKey=(module,id)=>(notificationModule[module]||module)+'|'+id;
  function isNotificationRead(module,id){return notificationReads.has(notificationKey(module,id));}
  async function loadNotificationReads(){
    if(mode!=='shared'||!remoteContext.tenantId||!remoteContext.agencyId)return;
    if(AWS_DEV_MODE){
      try{
        const result=await awsJson('/staff-notices',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:remoteContext.tenantId,
            agency_id:remoteContext.agencyId,
            action:'notification_reads_list',
            payload:{}
          })
        });
        notificationReads=new Set((Array.isArray(result?.data)?result.data:[]).map(row=>notificationKey(row.module,row.notification_id)));
        if(document.getElementById('app')?.classList.contains('authenticated'))renderNotifBell();
      }catch(error){
        console.error('Could not load AWS notification read status:',error);
      }
      return;
    }
    const {data,error}=await supabaseClient.from('suite_notification_reads').select('module,notification_id').eq('tenant_id',remoteContext.tenantId).eq('agency_id',remoteContext.agencyId).limit(10000);
    if(error){console.error('Could not load notification read status:',error);return;}
    notificationReads=new Set((data||[]).map(row=>notificationKey(row.module,row.notification_id)));
    if(document.getElementById('app')?.classList.contains('authenticated'))renderNotifBell();
  }
  async function markNotificationsRead(items){
    if(!items.length)return true;
    if(mode!=='shared'){
      for(const item of items){const key=notificationModule[item.module]||item.module;const found=STATE[key]?.notifications?.find(n=>n.id===item.id);if(found){found.readBy=found.readBy||[];if(!found.readBy.includes(CURRENT_USER_ID))found.readBy.push(CURRENT_USER_ID);}}
      persist();return true;
    }
    const unseen=items.filter(item=>!isNotificationRead(item.module,item.id));
    if(!unseen.length)return true;
    if(AWS_DEV_MODE){
      try{
        await awsJson('/staff-notices',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:remoteContext.tenantId,
            agency_id:remoteContext.agencyId,
            action:'notification_reads_mark',
            payload:{items:unseen}
          })
        });
        unseen.forEach(item=>notificationReads.add(notificationKey(item.module,item.id)));
        return true;
      }catch(error){
        console.error('AWS notification read status failed:',error);
        return false;
      }
    }
    const rows=unseen.map(item=>({tenant_id:remoteContext.tenantId,agency_id:remoteContext.agencyId,module:notificationModule[item.module]||item.module,notification_id:item.id}));
    const {error}=await supabaseClient.from('suite_notification_reads').upsert(rows,{onConflict:'tenant_id,agency_id,user_id,module,notification_id',ignoreDuplicates:true});
    if(error){console.error('Notification read status failed:',error);return false;}
    unseen.forEach(item=>notificationReads.add(notificationKey(item.module,item.id)));
    return true;
  }
  async function signIn(email,password){
    if(AWS_DEV_MODE){
      if(!awsToken()){
        if(typeof window.SonoMarziAwsAuth?.signIn==='function'){
          await window.SonoMarziAwsAuth.signIn();
          return Boolean(awsToken());
        }
        throw Error('Secure sign-in is not available. Reload the page and try again.');
      }
      const {data,error}=await remoteRpc('suite_load_workspace');
      if(error) throw error;
      acceptRemote(data);
      await loadNotificationReads();
      logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed in.`,'auth');
      return true;
    }
    if(!supabaseClient)throw Error('The agency connection could not load. Check your connection and try again.');
    const {error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw Error('Unable to sign in with those credentials.');
    const {data,error:readError}=await supabaseClient.rpc('suite_load_workspace');
    if(readError)throw Error('The agency workspace is not configured for this application version.');
    acceptRemote(data);
    await loadNotificationReads();
    logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed in.`,'auth');
    return true;
  }

  async function resumeSession(){
    if(AWS_DEV_MODE){
      if(!awsToken()) return false;
      const {data,error}=await remoteRpc('suite_load_workspace');
      if(error){
        console.error('AWS workspace resume failed:',error);
        if(error.status===401||error.status===403){
          sessionStorage.removeItem(AWS_DEV.tokenKey);
        }
        return false;
      }
      acceptRemote(data);
      await loadNotificationReads();
      return true;
    }
    if(!supabaseClient)return false;
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session)return false;
    const {data,error}=await supabaseClient.rpc('suite_load_workspace');
    if(error){await supabaseClient.auth.signOut();return false;}
    acceptRemote(data);
    await loadNotificationReads();
    return true;
  }
  async function loadRemoteContext(tenantId,agencyId){if(mode!=='shared'||!awsToken())throw Error('Agency context changes require an authenticated Cognito session.');if(pendingWrites||saving){const saved=await flush();if(!saved||pendingWrites)throw Error('Save your pending changes before switching agencies. Download a backup if the save is blocked.');}const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:tenantId,p_agency_id:agencyId});if(error)throw Error(error.message||'That agency workspace could not be loaded.');acceptRemote(data);await loadNotificationReads();return true;}
  async function signOut(){
    // Bump the epoch BEFORE anything else. Any flush() still in flight for the account that's
    // leaving captured the old epoch when it started; once this changes, that save will notice
    // (see the staleSession checks inside flush()) and quietly stand down instead of writing into
    // whatever session becomes current, or leaving this tab's save lock stuck forever waiting on
    // a request that may never come back.
    sessionEpoch++;
    clearTimeout(debounce);
    saving=false;
    saveAgain=false;
    consecutiveFailures=0;
    const orphanedWaiters=waiters.splice(0);
    orphanedWaiters.forEach(resolve=>resolve(false));
    if(mode==='shared'){
      await StaffNotices.beforeSignOut();
      try{sessionStorage.removeItem(AWS_DEV.tokenKey);}catch{}
    }
    serverReady=false;mode='local';serverVersions={};serverOrders=new Map();notificationReads=new Set();remoteContext={tenantId:null,agencyId:null};await load();
  }
  function backupPending(){
    const pending=changes(baseline,flatten(STATE)).filter(p=>{
      const [path]=JSON.parse(p.key);
      return !['accounts','auditLog'].includes(path[0])&&!['activity','dashboardPrefs','notifications'].includes(path[1]);
    });
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),tenantId:remoteContext.tenantId,agencyId:remoteContext.agencyId,changes:pending},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='public-safety-pending-changes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function reload(silent=false){
    if(saving){toast('Wait for the current save to finish.',true);return false;}
    if(silent && (pendingWrites||SuiteUX.hasDirty())){
      toast('The latest server copy is available, but this tab has unsaved changes. Save or download them before refreshing.',true);
      return false;
    }
    if(!silent && !confirm('Replace this tab with the latest saved records? Download pending changes first if you need to retain them.'))return false;
    const user=CURRENT_USER_ID;
    clearTimeout(debounce);
    try{
      if(mode==='shared'){
        const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
        if(error)throw error;
        acceptRemote(data);
        await loadNotificationReads();
      }else{
        await load();
        STATE.currentRoleIds=[...(STATE.personnel.find(p=>p.id===user)?.roleIds||[])];
      }
      pendingWrites=false;
      SuiteUX.clearDirty();
      renderRoleSwitcher();
      if(!silent){document.getElementById('modalOverlay').classList.remove('open');SuiteUX.home();}
      status('ok',mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
      return true;
    }catch(error){status('error',error.message||'Could not reload saved records.');return false;}
  }
  async function adopt(next){
    if(mode!=='local')throw Error('Agency context changes are loaded from the server.');
    if(!db)throw Error('Durable local storage is unavailable.');
    const snapshot=flatten(next),patches=changes(baseline,snapshot);
    await transaction(patches);
    STATE=next;baseline=snapshot;pendingWrites=false;status('ok','Saved on this device · Demo workspace');
    return true;
  }
  async function submitSelfServiceRecord(collection,newRecord){
    // A training check-in is its own tiny, self-contained save -- it only ever touches the
    // trainingCheckins collection, so it never goes through flush()/changes(), which diffs and
    // resends the ENTIRE state tree (every module's current values, including collections this
    // role has no write access to at all). That bundling is what kept silently failing
    // check-ins: one unrelated, unwritable collection riding along in the same all-or-nothing
    // batch was enough to reject the whole thing, check-in included. Bypassing that pipeline
    // here removes this entire class of bug for this action, permanently, regardless of what
    // else is sitting changed-or-not in STATE at the moment someone scans a code.
    if(mode!=='shared'){
      // Local demo mode has no server-side permission model to collide with; fold it into
      // STATE and let normal local persistence handle it like everything else.
      STATE.pm[collection].push(newRecord);
      persist();
      return {ok:true};
    }
    if(!serverReady) return {ok:false, error:Error("Agency connection unavailable. Try scanning again once you're back online.")};
    if(!['trainingCheckins','leaveRequests'].includes(collection))return {ok:false,error:Error('Unsupported self-service collection.')};
    const collectionKey = JSON.stringify([["pm",collection],"$value"]);
    const orderKey = JSON.stringify([["pm",collection],"$order"]);
    const recordKey = JSON.stringify([["pm",collection],newRecord.id]);
    const attempt = async ()=>{
      // The server's order can include records this user cannot read. Inflating the
      // workspace removes those records, so an order rebuilt from STATE would erase IDs.
      const currentOrder=serverOrders.get(orderKey)||[];
      const patches=[];
      if(!serverOrders.has(orderKey) && serverVersions[collectionKey]){
        // The very first check-in this tenant/agency ever records requires deleting the
        // empty-array placeholder blob in the same save that adds the first real record, or
        // the shape mismatch rejects the whole thing.
        patches.push({key:collectionKey,value:null,deleted:true,expected_version:serverVersions[collectionKey]||0});
      }
      patches.push({key:orderKey,value:[...currentOrder,newRecord.id],deleted:false,expected_version:serverVersions[orderKey]||0});
      patches.push({key:recordKey,value:newRecord,deleted:false,expected_version:0});
      let data,error;
      try{ ({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:patches})); }
      catch(thrown){ error=thrown; }
      return {data,error,order:[...currentOrder,newRecord.id]};
    };
    let {data,error,order}=await attempt();
    if(error && /changed in another session/i.test(error.message||'')){
      // Refresh only this collection's version bookkeeping. A full reload here
      // would discard a separate unsaved form on the phone or another tab.
      const latest=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
      if(latest.error)return {ok:false,error:latest.error};
      const relevant=new Map((latest.data.records||[]).filter(r=>[collectionKey,orderKey,recordKey].includes(r.key)).map(r=>[r.key,r]));
      for(const key of [collectionKey,orderKey,recordKey]){
        const row=relevant.get(key);
        if(row)serverVersions[key]=row.version;
      }
      const remoteOrder=relevant.get(orderKey);
      if(remoteOrder&&!remoteOrder.deleted)serverOrders.set(orderKey,clone(remoteOrder.value));
      else serverOrders.delete(orderKey);
      const existing=relevant.get(recordKey);
      if(existing&&!existing.deleted){
        if(!equal(existing.value,newRecord))return {ok:false,error:Error('This request ID was used for a different record. No local changes were discarded.')};
        if(!(STATE.pm[collection]||[]).some(c=>c.id===newRecord.id))STATE.pm[collection].push(newRecord);
        baseline.set(recordKey,clone(existing.value));
        baseline.set(orderKey,(STATE.pm[collection]||[]).map(c=>c.id));
        return {ok:true};
      }
      ({data,error,order}=await attempt());
    }
    if(error){ status('error', error.message||'Check-in could not be saved.'); return {ok:false,error}; }
    for(const r of data||[]) serverVersions[r.key]=r.version;
    serverOrders.set(orderKey,order);
    if((STATE.pm[collection]||[]).every(c=>c.id!==newRecord.id)) STATE.pm[collection].push(newRecord);
    baseline.delete(collectionKey);
    baseline.set(orderKey,(STATE.pm[collection]||[]).map(c=>c.id));
    baseline.set(recordKey,newRecord);
    status(pendingWrites?'saving':'ok',pendingWrites?'Other changes are still pending in this tab.':'Saved to agency workspace');
    return {ok:true};
  }
  async function submitTrainingCheckin(newRecord){return submitSelfServiceRecord('trainingCheckins',newRecord);}
  let refreshing=false,lastRefresh=0,lastRecordRevision=null,lastAuditRevision=null,remoteUpdatePending=false,updateNoticeShown=false;
  async function refreshIfClean(){
    if(refreshing||mode!=='shared'||!serverReady||pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open'))return false;
    const context={...remoteContext},epoch=sessionEpoch;
    refreshing=true;lastRefresh=Date.now();
    try{
      const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:context.tenantId,p_agency_id:context.agencyId});
      if(error)throw error;
      if(epoch!==sessionEpoch||pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open'))return false;
      const changed=data.records.some(row=>serverVersions[row.key]!==row.version) ||
        Object.keys(serverVersions).some(key=>!data.records.some(row=>row.key===key));
      if(!changed){
        lastRecordRevision=(data.records||[]).reduce((max,r)=>r.updated_at&&r.updated_at>max?r.updated_at:max,'')||lastRecordRevision;
        await loadNotificationReads();
        return false;
      }
      acceptRemote(data);
      await loadNotificationReads();
      renderRoleSwitcher();
      const destination=location.hash.replace(/^#\//,'');
      if(destination&&destination!=='content')SuiteUX.navigate(destination);else SuiteUX.home();
      toast('Agency records refreshed from another session.');
      return true;
    }catch(error){console.error('Could not refresh agency records:',error);return false;}
    finally{refreshing=false;}
  }
  function liveSyncBlocked(){
    return pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open');
  }
  async function checkLiveWorkspace(){
    if(mode!=='shared'||!serverReady||document.hidden||!document.getElementById('app')?.classList.contains('authenticated')||idlePauseBackgroundSync())return false;
    const context={...remoteContext};
    if(!context.tenantId||!context.agencyId)return false;
    try{
      const result=await awsJson(`/workspace?tenantId=${encodeURIComponent(context.tenantId)}&agencyId=${encodeURIComponent(context.agencyId)}&revision=1`);
      const revision=result?.data||{};
      const recordRevision=revision.records_revision||null;
      const auditRevision=Number(revision.audit_revision||0);

      const recordsChanged=Boolean(lastRecordRevision&&recordRevision&&recordRevision!==lastRecordRevision);
      const auditChanged=lastAuditRevision!==null&&auditRevision!==lastAuditRevision;
      if(lastRecordRevision===null)lastRecordRevision=recordRevision;
      if(lastAuditRevision===null)lastAuditRevision=auditRevision;

      if(auditChanged){
        lastAuditRevision=auditRevision;
        if(typeof window.SonoMarziRefreshAudit==='function')window.SonoMarziRefreshAudit();
      }

      if(recordsChanged||remoteUpdatePending){
        if(liveSyncBlocked()){
          remoteUpdatePending=true;
          if(!updateNoticeShown){
            updateNoticeShown=true;
            try{toast('New agency updates are available. Your current work will not be interrupted.');}catch{}
          }
          return false;
        }
        remoteUpdatePending=false;
        updateNoticeShown=false;
        const refreshed=await refreshIfClean();
        if(refreshed)lastRecordRevision=recordRevision;
        return refreshed;
      }
      return auditChanged;
    }catch(error){
      console.warn('Live workspace sync check failed:',error.message);
      return false;
    }
  }
  setInterval(checkLiveWorkspace,15000);

  window.addEventListener('online',async()=>{
    if(pendingWrites){const saved=await flush();if(!saved||pendingWrites)return;}
    await refreshIfClean();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&Date.now()-lastRefresh>30000)refreshIfClean();
  });
  async function useWorkspace(data){acceptRemote(data);await loadNotificationReads();return true;}
  return {load,persist,flush,signIn,resumeSession,useWorkspace,signOut,backupPending,reload,adopt,loadRemoteContext,flatten,inflate,changes,equal,submitTrainingCheckin,submitSelfServiceRecord,refreshIfClean,isNotificationRead,markNotificationsRead,api:awsJson,pending:()=>pendingWrites||saving,mode:()=>mode,remoteContext:()=>({...remoteContext}),needsReloadBeforeRetry:()=>lastErrorWasVersionConflict,description:()=>mode==='shared'?'Connected to the authenticated agency workspace. Each changed record is checked for concurrent edits.':'This is a demo workspace saved in this browser. It is not shared with other staff. Agency sign-in requires the supplied database migration and account provisioning.'};
})();

