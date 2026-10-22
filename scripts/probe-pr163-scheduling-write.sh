#!/usr/bin/env bash
# Privileged IAM-controlled handler probes, NOT an API Gateway JWT/auth test.
# Reads existing fixtures only. Never prints Cognito subjects or signed URLs.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
mkdir -p "$HOME/sonomarzi-security-evidence"
probe_dir=$(mktemp -d "$HOME/sonomarzi-security-evidence/scheduling-write.XXXXXX")
config=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query Environment.Variables --output json)
secret=$(aws secretsmanager get-secret-value --secret-id "$(jq -r '.DB_SECRET_ARN' <<< "$config")" --query SecretString --output text)
export PGHOST=$(jq -r '.DB_HOST' <<< "$config") PGPORT=$(jq -r '.DB_PORT // "5432"' <<< "$config") PGDATABASE=$(jq -r '.DB_NAME' <<< "$config")
export PGUSER=$(jq -r '.username' <<< "$secret") PGPASSWORD=$(jq -r '.password' <<< "$secret") PGSSLMODE=require
python3 - "$probe_dir" <<'PYRUN'
import json,pathlib,subprocess,sys,uuid
root=pathlib.Path(sys.argv[1]);tid='f15865be-cf46-41e0-9d60-7cd753437501';aid='64624bcc-232d-4af5-bae6-a8e621cde447'
run_id='qa_schedule_'+uuid.uuid4().hex;keys=[];seq=0;failures=0;cleanup_complete=False

def lit(v):return "'"+str(v).replace("'","''")+"'"
def sql(statement):
 r=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=statement,text=True,capture_output=True)
 if r.returncode:raise RuntimeError('Database operation failed: '+r.stderr)
 return r.stdout.strip()
def read(statement):return json.loads(sql('BEGIN READ ONLY; '+statement+'; ROLLBACK;'))
def manifest():
 (root/'manifest.json').write_text(json.dumps({'tenant':tid,'agency':aid,'run_id':run_id,'keys':keys,'cleanup_complete':cleanup_complete},indent=2))
def report(label,ok):
 global failures
 failures+=int(not ok);print(('PASS' if ok else 'FAIL')+' | '+label,flush=True)
def require(label,ok):
 report(label,ok)
 if not ok:raise RuntimeError('Stopped: '+label)
def call(actor,path,body=None):
 global seq
 seq+=1;event={'version':'2.0','rawPath':path,'requestContext':{'http':{'method':'GET' if body is None else 'POST'},'authorizer':{'jwt':{'claims':{'sub':actor['cognito_sub']}}}}}
 if body is None:event['queryStringParameters']={'subdomain':'demo'}
 else:event['body']=json.dumps({'tenant_id':tid,'agency_id':aid,**body})
 ep=root/f'{seq}.event.json';op=root/f'{seq}.response.json';ep.write_text(json.dumps(event))
 r=subprocess.run(['aws','lambda','invoke','--function-name','sonomarzi-api-dev','--payload','fileb://'+str(ep),str(op)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError('Lambda invocation failed')
 if json.loads(r.stdout).get('FunctionError'):raise RuntimeError('Lambda handler error')
 raw=json.loads(op.read_text());return raw['statusCode'],json.loads(raw['body'])
def entries(rows,collection):
 out=[]
 for row in rows:
  path,item=json.loads(row['key'])
  if '.'.join(path)!=collection or item=='$order' or row.get('deleted'):continue
  value=row.get('value');out.extend(value if item=='$value' and isinstance(value,list) else [value])
 return [v for v in out if isinstance(v,dict)]
def getrow(key):
 return read("SELECT COALESCE((SELECT jsonb_build_object('value',value,'version',version,'deleted',deleted) FROM suite_records WHERE tenant_id="+lit(tid)+'::uuid AND agency_id='+lit(aid)+'::uuid AND key='+lit(key)+"),'null'::jsonb)")
def shift(suffix,group):
 value={'id':run_id+'_'+suffix,'name':'FICTIONAL QA '+run_id+' '+suffix,'workGroupId':group,'startDate':'2099-01-01','daysOn':4,'daysOff':4,'startTime':'07:00','endTime':'19:00','minStaff':1,'staffingRequirements':[]}
 key=json.dumps([['pm','scheduleShifts'],value['id']],separators=(',',':'));keys.append(key);manifest();return key,value
# getrow is authoritative, so every attempt uses the actual current version.
def change(key,value,deleted=False,version=None):
 row=getrow(key)
 return {'key':key,'value':value,'deleted':deleted,'expected_version':(row['version'] if row else 0) if version is None else version}
def write(actor,changes):return call(actor,'/apply-changes',{'changes':changes})
def denied(label,actor,changes):
 before={c['key']:getrow(c['key']) for c in changes}
 status,_=write(actor,changes)
 report(label+' returns 403',status==403)
 report(label+' preserves database values and versions',all(getrow(k)==v for k,v in before.items()))

def current_config():
 return read("SELECT COALESCE(jsonb_agg(jsonb_build_object('key',key,'value',value,'version',version,'deleted',deleted) ORDER BY key),'[]'::jsonb) FROM suite_records WHERE tenant_id="+lit(tid)+'::uuid AND agency_id='+lit(aid)+"::uuid AND (key::jsonb)->0 IN ('[\"roles\"]'::jsonb,'[\"pm\",\"scheduleWorkGroups\"]'::jsonb)")
print('Controlled Demo Scheduling writes; IAM handler tests only, not browser/Gateway authentication.',flush=True)
print('Evidence and cleanup manifest:',root,flush=True)
manifest();config_before=None
try:
 agency=read("SELECT jsonb_build_object('tenant',tenant_id,'agency',id) FROM suite_agencies WHERE subdomain='demo'")
 assert agency=={'tenant':tid,'agency':aid},'Demo identity mismatch'
 actors=read("SELECT jsonb_agg(jsonb_build_object('email',u.email,'user_id',u.id,'cognito_sub',u.cognito_sub,'person_id',m.person_id,'roles',m.role_ids,'platform_admin',COALESCE(pa.enabled,false))) FROM suite_users u JOIN suite_memberships m ON m.user_id=u.id LEFT JOIN suite_platform_admins pa ON pa.user_id=u.id WHERE m.tenant_id="+lit(tid)+'::uuid AND m.agency_id='+lit(aid)+"::uuid AND m.status='active' AND lower(u.email) IN ('fred+ses@sonomarzi.com','test@test1.com','fred@sonomarzi.com')")
 byemail={a['email'].lower():a for a in actors};dispatch=byemail['fred+ses@sonomarzi.com'];patrol=byemail['test@test1.com'];admin=byemail['fred@sonomarzi.com']
 assert admin['platform_admin'],'Approved fixture administrator missing'
 assert all(not a['platform_admin'] and not {'role_admin','role_platform_admin'}.intersection(a['roles']) for a in [dispatch,patrol]),'Test actor has administrator bypass'
 config_before=current_config();groups=entries(config_before,'pm.scheduleWorkGroups');roles=entries(config_before,'roles')
 dg=next(g for g in groups if g.get('name','').lower()=='dispatch' and g.get('active') is not False)
 pg=next(g for g in groups if g.get('name','').lower()=='patrol' and g.get('active') is not False)
 def ability(actor,name):return any(r.get('id') in actor['roles'] and r.get('abilities',{}).get(name) is True for r in roles)
 require('SES is Dispatch calendar manager with scheduling ability',dispatch['person_id'] in dg.get('managerIds',[]) and ability(dispatch,'pm_schedule_manage'))
 require('SES is not Patrol calendar manager',dispatch['person_id'] not in pg.get('managerIds',[]))
 require('Patrol retains view-only role and calendar grants',not ability(patrol,'pm_schedule_manage') and all(patrol['person_id'] not in g.get('managerIds',[]) for g in [dg,pg]))
 for label,actor,allowed,hidden in [('Dispatch',dispatch,dg,pg),('Patrol',patrol,pg,dg)]:
  status,ws=call(actor,'/workspace');visible={g['id'] for g in entries(ws.get('records',[]),'pm.scheduleWorkGroups')}
  require(label+' intended calendar visible and other calendar hidden',status==200 and ws.get('success') is True and allowed['id'] in visible and hidden['id'] not in visible)
 dk,dv=shift('dispatch',dg['id']);pk,pv=shift('patrol',pg['id']);xk,xv=shift('denied_dispatch_to_patrol',pg['id']);yk,yv=shift('denied_patrol_create',pg['id'])
 require('Fixture keys unused',all(getrow(k) is None for k in keys))
 status,_=write(admin,[change(pk,pv)]);require('Administrator creates disposable Patrol fixture',status==200 and getrow(pk)['value']==pv)
 status,_=write(dispatch,[change(dk,dv)]);require('SES creates Dispatch fixture',status==200 and getrow(dk)['value']==dv)
 original_version=getrow(dk)['version'];dv={**dv,'name':dv['name']+' edited'}
 status,_=write(dispatch,[change(dk,dv)]);require('SES edits Dispatch fixture',status==200 and getrow(dk)['value']==dv)
 before=getrow(dk);status,_=write(dispatch,[change(dk,{**dv,'name':'FICTIONAL QA stale replay'},version=original_version)])
 report('SES stale replay returns 409 without changes',status==409 and getrow(dk)==before)
 for label,actor,changes in [
  ('SES Patrol create denied',dispatch,[change(xk,xv)]),
  ('SES Patrol edit denied',dispatch,[change(pk,{**pv,'name':pv['name']+' denied edit'})]),
  ('SES Patrol delete denied',dispatch,[change(pk,pv,True)]),
  ('Patrol view-only create denied',patrol,[change(yk,yv)]),
  ('Patrol view-only edit denied',patrol,[change(pk,{**pv,'name':pv['name']+' denied edit'})]),
  ('Patrol view-only delete denied',patrol,[change(pk,pv,True)]),
  ('SES Dispatch-to-Patrol rebind denied',dispatch,[change(dk,{**dv,'workGroupId':pg['id']})]),
  ('SES Patrol-to-Dispatch rebind denied',dispatch,[change(pk,{**pv,'workGroupId':dg['id']})]),
  ('Mixed-calendar batch denied atomically',dispatch,[change(dk,{**dv,'name':dv['name']+' rolled back'}),change(pk,{**pv,'name':pv['name']+' denied batch'})])]:
  denied(label,actor,changes)
 status,_=write(dispatch,[change(dk,dv,True)]);require('SES deletes own Dispatch fixture',status==200 and getrow(dk)['deleted'] is True)
 report('Patrol fixture retained after SES delete',getrow(pk)['value']==pv and getrow(pk)['deleted'] is False)
except Exception as error:
 failures+=1;print('FAIL | Test stopped | '+str(error),flush=True)
finally:
 try:
  # Lock scheduling writes, refuse removal if another record acquired a link,
  # and delete only the unique keys registered before this run attempted writes.
  if keys:
   array='ARRAY['+','.join(lit(k) for k in keys)+']::text[]';ids=[json.loads(k)[1] for k in keys]
   links=' OR '.join('position('+lit(i)+' in value::text)>0' for i in ids)
   scope='tenant_id='+lit(tid)+'::uuid AND agency_id='+lit(aid)+'::uuid'
   guard='DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM suite_records WHERE '+scope+' AND deleted=false AND NOT (key=ANY('+array+')) AND ('+links+")) THEN RAISE EXCEPTION 'Unexpected fixture links; retain manifest for manual cleanup'; END IF; END $guard$; "
   sql('BEGIN; SELECT pg_advisory_xact_lock(hashtext('+lit(tid+':'+aid+':scheduling')+')); '+guard+'DELETE FROM suite_records WHERE '+scope+' AND key=ANY('+array+'); COMMIT;')
   require('Run-owned fixtures and tombstones removed',all(getrow(k) is None for k in keys))
  if config_before is not None:report('Calendar grants and roles unchanged by probe',current_config()==config_before)
  rollout=read('SELECT COALESCE(bool_or(enabled),false) FROM suite_organization_rollout WHERE tenant_id='+lit(tid)+'::uuid AND agency_id='+lit(aid)+'::uuid')
  report('Agency-wide rollout remains disabled',rollout is False)
  cleanup_complete=True;print('CLEANUP | Run-owned Scheduling fixtures removed; existing shifts preserved.',flush=True)
 except Exception as error:
  failures+=1;print('FAIL | Cleanup incomplete | '+str(error)+' | retain manifest '+str(root/'manifest.json'),flush=True)
 manifest();(root/'summary.json').write_text(json.dumps({'failures':failures,'cleanup_complete':cleanup_complete,'run_id':run_id},indent=2))
print('SUMMARY | failures='+str(failures),flush=True)
sys.exit(1 if failures else 0)
PYRUN
