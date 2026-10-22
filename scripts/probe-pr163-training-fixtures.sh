#!/usr/bin/env bash
# Controlled Demo-only fixtures. Uses IAM handler invocation, not browser JWTs.
# Creates two temporary training files and small attachment objects, then removes
# only identifiers created by this run. Existing records are never restored wholesale.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
mkdir -p "$HOME/sonomarzi-security-evidence"
chmod 700 "$HOME/sonomarzi-security-evidence"
work_dir=$(mktemp -d "$HOME/sonomarzi-security-evidence/training-qa.XXXXXX")
prior_dir=$(ls -dt /tmp/sonomarzi-read-boundaries.* | head -n1)
test -s "$prior_dir/fixtures.json"
config=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query Environment.Variables --output json)
secret=$(aws secretsmanager get-secret-value --secret-id "$(jq -r '.DB_SECRET_ARN' <<< "$config")" --query SecretString --output text)
export PGHOST=$(jq -r '.DB_HOST' <<< "$config") PGPORT=$(jq -r '.DB_PORT // "5432"' <<< "$config") PGDATABASE=$(jq -r '.DB_NAME' <<< "$config")
export PGUSER=$(jq -r '.username' <<< "$secret") PGPASSWORD=$(jq -r '.password' <<< "$secret") PGSSLMODE=require
export SONOMARZI_QA_BUCKET=$(jq -r '.ATTACHMENTS_BUCKET' <<< "$config")
unset secret config
python3 - "$work_dir" "$prior_dir/fixtures.json" <<'PY'
import datetime,json,os,pathlib,subprocess,sys,urllib.request,uuid
root=pathlib.Path(sys.argv[1]); fixtures=json.loads(pathlib.Path(sys.argv[2]).read_text());tid=fixtures['tenant'];aid=fixtures['agency']
assert tid=='f15865be-cf46-41e0-9d60-7cd753437501' and aid=='64624bcc-232d-4af5-bae6-a8e621cde447','Only the verified Demo workspace is supported'
actors={a['email']:a for a in fixtures['actors']};dispatch=actors['fred+ses@sonomarzi.com'];patrol=actors['test@test1.com']
assert not dispatch['platform_admin'] and not patrol['platform_admin']
bucket=os.environ['SONOMARZI_QA_BUCKET'];assert bucket and bucket!='null','Attachments bucket missing'
run_id='qa_org_'+uuid.uuid4().hex;ids={'enrollments':[],'reports':[],'attachments':[]};objects=[];assignment_ids=[];seq=0;failures=0;errors=[]
def sql(statement):
 r=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=statement,text=True,capture_output=True)
 if r.returncode:raise RuntimeError('Database operation failed: '+r.stderr)
 return r.stdout.strip()
def literal(value):return "'"+str(value).replace("'","''")+"'"
def save_manifest():
 (root/'manifest.json').write_text(json.dumps({'tenant':tid,'agency':aid,'run_id':run_id,'ids':ids,'objects':objects,'assignment_ids':assignment_ids},indent=2))
def call(actor,path,body=None):
 global seq
 seq+=1;event={'version':'2.0','rawPath':path,'requestContext':{'http':{'method':'GET' if body is None else 'POST'},'authorizer':{'jwt':{'claims':{'sub':actor['cognito_sub']}}}}}
 if body is None:event['queryStringParameters']={'subdomain':'demo'}
 else:event['body']=json.dumps({'tenant_id':tid,'agency_id':aid,**body})
 ep=root/(str(seq)+'.event.json');op=root/(str(seq)+'.response.json');ep.write_text(json.dumps(event))
 r=subprocess.run(['aws','lambda','invoke','--function-name','sonomarzi-api-dev','--payload','fileb://'+str(ep),str(op)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError('Lambda invocation failed')
 meta=json.loads(r.stdout);raw=json.loads(op.read_text())
 if meta.get('FunctionError'):raise RuntimeError('Lambda handler error')
 return raw['statusCode'],json.loads(raw['body'])
def ft(actor,action,payload=None):return call(actor,'/field-training',{'action':action,'payload':payload or {}})
def require_response(pair):
 status,result=pair
 if status!=200 or result.get('success') is not True:raise RuntimeError('Fixture operation refused: '+str(result.get('error',status)))
 return result.get('data') or {}
def report(label,ok):
 global failures
 failures+=int(not ok);print(('PASS' if ok else 'FAIL')+' | '+label,flush=True)
def add(actor,action,payload,collection):
 value=require_response(ft(actor,action,payload));ids[collection].append(value['id']);save_manifest();return value
print('Controlled Demo training fixtures; IAM handler authorization tests only.',flush=True)
print('Evidence and cleanup manifest:',root,flush=True)
before={}
admin=json.loads(sql("BEGIN READ ONLY; SELECT jsonb_build_object('user_id',u.id,'cognito_sub',u.cognito_sub) FROM suite_users u JOIN suite_platform_admins pa ON pa.user_id=u.id AND pa.enabled=true JOIN suite_memberships m ON m.user_id=u.id AND m.tenant_id="+literal(tid)+"::uuid AND m.agency_id="+literal(aid)+"::uuid AND m.status='active' WHERE lower(u.email)='fred@sonomarzi.com'; ROLLBACK;"))
try:
 before=require_response(ft(admin,'list'));(root/'before-training.json').write_text(json.dumps(before))
 assert before.get('config'),'An existing Field Training program is required'
 members=before['members'];member_by_user={m['user_id']:m for m in members}
 dispatch_trainee=next(m for m in members if m['person_id'] in dispatch['expected_people'])
 assert patrol['user_id'] in member_by_user,'Patrol test account is not an active training member'
 targets={'Dispatch':dispatch_trainee,'Patrol':member_by_user[patrol['user_id']]}
 for label,member in targets.items():
  assert not any(e.get('trainee_user')==member['user_id'] and e.get('status') in ['active','extended'] for e in before.get('enrollments',[])),label+' target already has an active file; no fixture inserted'
 # A temporary canonical assignment gives the approved Patrol test identity an
 # own-record positive fixture if its historic assignment differs from its test scope.
 if patrol['person_id'] not in patrol['expected_people']:
  scope=patrol.get('scope') or {};assert scope.get('mode')=='selected' and len(scope.get('unitIds',[]))==1
  node=scope['unitIds'][0];assignment=str(uuid.uuid4());assignment_ids.append(assignment);save_manifest()
  sql("BEGIN; INSERT INTO suite_person_organization_assignments(tenant_id,agency_id,id,person_id,organization_id,primary_assignment,active,created_by) SELECT "+literal(tid)+"::uuid,"+literal(aid)+"::uuid,"+literal(assignment)+"::uuid,"+literal(patrol['person_id'])+",n.id,false,true,"+literal(admin['user_id'])+"::uuid FROM suite_organization_nodes n WHERE n.tenant_id="+literal(tid)+"::uuid AND n.agency_id="+literal(aid)+"::uuid AND n.id="+literal(node)+"::uuid AND n.kind='unit' AND n.name='Patrol' AND n.active=true; COMMIT;")
  print('FIXTURE | Temporary Patrol assignment for the approved test identity; removed during cleanup.',flush=True)
 today=datetime.date.today().isoformat();created={};payload_file=root/'fictional-attachment.txt';payload_file.write_text('FICTIONAL ORGANIZATIONAL AUTHORIZATION TEST '+run_id+'\n')
 for label,trainee in targets.items():
  others=[m for m in members if m['user_id']!=trainee['user_id'] and m.get('eligibleTrainer') and m.get('eligibleSupervisor')];assert len(others)>=2,'Two distinct trainer/supervisor members required'
  enrollment=add(admin,'enroll',{'traineeUser':trainee['user_id'],'trainerUser':others[0]['user_id'],'supervisorUser':others[1]['user_id'],'startedOn':today},'enrollments')
  evaluation=add(admin,'new_report',{'enrollmentId':enrollment['id'],'periodStart':today,'periodEnd':today,'kind':'daily'},'reports')
  require_response(ft(admin,'save_report',{'reportId':evaluation['id'],'version':evaluation['version'],'content':{'ratings':{},'items':{},'narrative':'FICTIONAL QA ONLY '+run_id,'recommendation':''}}))
  key=f'tenants/{tid}/agencies/{aid}/attachments/{run_id}/{label.lower()}.txt';objects.append(key);save_manifest()
  put=subprocess.run(['aws','s3api','put-object','--bucket',bucket,'--key',key,'--body',str(payload_file),'--content-type','text/plain'],capture_output=True,text=True)
  if put.returncode:raise RuntimeError('Fixture object upload failed')
  attachment=add(admin,'confirm_attachment',{'reportId':evaluation['id'],'storageKey':key,'fileName':'FICTIONAL-QA-'+label+'.txt','contentType':'text/plain','byteCount':payload_file.stat().st_size,'description':'Temporary fixture '+run_id},'attachments')
  created[label]={'enrollment':enrollment,'report':evaluation,'attachment':attachment,'key':key}
 for label,actor in [('Dispatch',dispatch),('Patrol',patrol)]:
  allowed=created[label];hidden=created['Patrol' if label=='Dispatch' else 'Dispatch'];visible=require_response(ft(actor,'list'))
  report(label+' sees authorized trainee fixture',any(e['id']==allowed['enrollment']['id'] for e in visible['enrollments']))
  report(label+' excludes other-unit trainee fixture',all(e['id']!=hidden['enrollment']['id'] for e in visible['enrollments']))
  report(label+' sees authorized evaluation and attachment',any(r['id']==allowed['report']['id'] for r in visible['reports']) and any(a['id']==allowed['attachment']['id'] for a in visible['attachments']))
  report(label+' excludes other-unit evaluation and attachment',all(r['id']!=hidden['report']['id'] for r in visible['reports']) and all(a['id']!=hidden['attachment']['id'] for a in visible['attachments']))
  status,result=call(actor,'/attachments/download-url',{'key':allowed['key']})
  permitted=status==200 and bool(result.get('download_url'));report(label+' authorized attachment URL',permitted)
  if permitted:
   try:
    with urllib.request.urlopen(result['download_url'],timeout=20) as response:content=response.read()
    report(label+' authorized attachment downloads exact fixture',content==payload_file.read_bytes())
   except Exception:report(label+' authorized attachment downloads exact fixture',False)
  status,result=call(actor,'/attachments/download-url',{'key':hidden['key']});report(label+' other-unit attachment URL denied',status==403 and not result.get('download_url'))
  # Only the other run-owned temporary evaluation is targeted. A broken denial
  # could alter that disposable evaluation, never an existing agency report.
  status,result=ft(actor,'save_report',{'reportId':hidden['report']['id'],'version':2,'content':{'narrative':'FICTIONAL denied-access probe '+run_id}})
  report(label+' other-unit evaluation edit denied',status==403)
except Exception as error:
 failures+=1;errors.append(str(error));print('FAIL | Fixture test stopped | '+str(error),flush=True)
finally:
 # Lock current aggregate and remove only this run's IDs. Refuse cleanup if
 # someone added another linked record to one of the temporary files.
 try:
  arrays={name:'ARRAY['+','.join(literal(v) for v in values)+']::text[]' for name,values in ids.items()}
  enrollment_ids=arrays['enrollments'];report_ids=arrays['reports'];attachment_ids=arrays['attachments']
  key=literal(json.dumps([['fieldTraining'],'$state'],separators=(',',':')))
  expression='value'
  for collection in ['attachments','reports','enrollments']:
   expression="jsonb_set("+expression+",'{"+collection+"}',COALESCE((SELECT jsonb_agg(item) FROM jsonb_array_elements(COALESCE(value->'"+collection+"','[]'::jsonb)) item WHERE NOT ((item->>'id')=ANY("+arrays[collection]+"))),'[]'::jsonb))"
  guard="""DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM suite_records r, LATERAL jsonb_array_elements(COALESCE(r.value->'reports','[]'::jsonb)) x WHERE r.tenant_id=TENANT AND r.agency_id=AGENCY AND r.key=FTKEY AND (x->>'enrollment_id')=ANY(ENROLLMENTS) AND NOT (x->>'id')=ANY(REPORTS)) OR EXISTS(SELECT 1 FROM suite_records r, LATERAL jsonb_array_elements(COALESCE(r.value->'attachments','[]'::jsonb)) x WHERE r.tenant_id=TENANT AND r.agency_id=AGENCY AND r.key=FTKEY AND (x->>'report_id')=ANY(REPORTS) AND NOT (x->>'id')=ANY(ATTACHMENTS)) OR EXISTS(SELECT 1 FROM suite_records r, LATERAL jsonb_array_elements(COALESCE(r.value->'shifts','[]'::jsonb)||COALESCE(r.value->'coverage','[]'::jsonb)) x WHERE r.tenant_id=TENANT AND r.agency_id=AGENCY AND r.key=FTKEY AND (x->>'enrollment_id')=ANY(ENROLLMENTS)) THEN RAISE EXCEPTION 'Unexpected links to QA fixtures; preserve data for manual cleanup'; END IF; END $guard$;"""
  for token,replacement in [('TENANT',literal(tid)+'::uuid'),('AGENCY',literal(aid)+'::uuid'),('FTKEY',key),('ENROLLMENTS',enrollment_ids),('REPORTS',report_ids),('ATTACHMENTS',attachment_ids)]:guard=guard.replace(token,replacement)
  statement='BEGIN; SELECT 1 FROM suite_records WHERE tenant_id='+literal(tid)+'::uuid AND agency_id='+literal(aid)+'::uuid AND key='+key+' FOR UPDATE; '+guard
  if any(ids.values()):statement+='UPDATE suite_records SET value='+expression+',version=version+1,updated_at=now(),updated_by='+literal(admin['user_id'])+'::uuid WHERE tenant_id='+literal(tid)+'::uuid AND agency_id='+literal(aid)+'::uuid AND key='+key+'; '
  if assignment_ids:statement+='DELETE FROM suite_person_organization_assignments WHERE tenant_id='+literal(tid)+'::uuid AND agency_id='+literal(aid)+'::uuid AND id=ANY(ARRAY['+','.join(literal(v) for v in assignment_ids)+']::uuid[]) AND created_by='+literal(admin['user_id'])+'::uuid; '
  sql(statement+'COMMIT;');print('CLEANUP | Run-owned database fixtures removed; unrelated records preserved.',flush=True)
  for object_key in objects:
   result=subprocess.run(['aws','s3api','delete-object','--bucket',bucket,'--key',object_key],capture_output=True,text=True)
   if result.returncode:raise RuntimeError('Fixture object cleanup failed; see manifest')
  print('CLEANUP | Run-owned attachment objects removed.',flush=True)
  current=require_response(ft(admin,'list'))
  report('Original trainee files retained',all(any(e['id']==old['id'] for e in current['enrollments']) for old in before.get('enrollments',[])))
  report('Temporary trainee files absent',all(e['id'] not in ids['enrollments'] for e in current['enrollments']))
  rollout=sql('BEGIN READ ONLY; SELECT COALESCE(bool_or(enabled),false) FROM suite_organization_rollout WHERE tenant_id='+literal(tid)+'::uuid AND agency_id='+literal(aid)+'::uuid; ROLLBACK;')
  report('Agency-wide rollout remains disabled',rollout=='f')
 except Exception as error:
  failures+=1;print('FAIL | Cleanup incomplete | '+str(error)+' | retain manifest '+str(root/'manifest.json'),flush=True)
 save_manifest();(root/'summary.json').write_text(json.dumps({'failures':failures,'errors':errors,'run_id':run_id},indent=2))
print('SUMMARY | failures='+str(failures),flush=True)
sys.exit(1 if failures else 0)
PY
