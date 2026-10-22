#!/usr/bin/env bash
# Privileged IAM-controlled handler probes, NOT an API Gateway JWT/auth test.
# Reads existing fixtures only. Never prints Cognito subjects or signed URLs.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
probe_dir=$(mktemp -d /tmp/sonomarzi-read-boundaries.XXXXXX)
config=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query Environment.Variables --output json)
secret=$(aws secretsmanager get-secret-value --secret-id "$(jq -r '.DB_SECRET_ARN' <<< "$config")" --query SecretString --output text)
export PGHOST=$(jq -r '.DB_HOST' <<< "$config") PGPORT=$(jq -r '.DB_PORT // "5432"' <<< "$config") PGDATABASE=$(jq -r '.DB_NAME' <<< "$config")
export PGUSER=$(jq -r '.username' <<< "$secret") PGPASSWORD=$(jq -r '.password' <<< "$secret") PGSSLMODE=require
psql -X -qAt -v ON_ERROR_STOP=1 > "$probe_dir/fixtures.json" <<'SQL'
BEGIN READ ONLY;
WITH agency AS (
 SELECT tenant_id,id FROM suite_agencies WHERE subdomain='demo'
), actors AS (
 SELECT u.email,u.cognito_sub,u.id AS user_id,m.person_id,m.role_ids,g.scope,
        COALESCE(pa.enabled,false) AS platform_admin,
        COALESCE((SELECT jsonb_agg(DISTINCT a.person_id)
         FROM suite_person_organization_assignments a
         JOIN suite_organization_nodes n ON n.tenant_id=a.tenant_id AND n.agency_id=a.agency_id AND n.id=a.organization_id
         WHERE a.tenant_id=m.tenant_id AND a.agency_id=m.agency_id
           AND a.active=true AND n.active=true
           AND (a.effective_from IS NULL OR a.effective_from<=CURRENT_DATE)
           AND (a.effective_to IS NULL OR a.effective_to>=CURRENT_DATE)
           AND ((n.kind='unit' AND (g.scope->'unitIds') ? a.organization_id::text)
             OR (n.kind='work_group' AND (g.scope->'workGroupIds') ? a.organization_id::text))), '[]'::jsonb) AS expected_people
 FROM suite_users u
 JOIN suite_memberships m ON m.user_id=u.id
 JOIN agency d ON d.tenant_id=m.tenant_id AND d.id=m.agency_id
 LEFT JOIN suite_organizational_access g ON g.tenant_id=m.tenant_id AND g.agency_id=m.agency_id AND g.user_id=m.user_id
 LEFT JOIN suite_platform_admins pa ON pa.user_id=u.id
 WHERE lower(u.email) IN ('fred+ses@sonomarzi.com','test@test1.com') AND m.status='active'
)
SELECT jsonb_build_object(
 'tenant',(SELECT tenant_id FROM agency),'agency',(SELECT id FROM agency),
 'actors',(SELECT jsonb_agg(to_jsonb(actors)) FROM actors),
 'records',(SELECT jsonb_agg(jsonb_build_object('key',r.key,'value',r.value)) FROM suite_records r JOIN agency d ON d.tenant_id=r.tenant_id AND d.id=r.agency_id WHERE r.deleted=false AND ((r.key::jsonb)->0 IN ('["personnel"]'::jsonb,'["pm","records"]'::jsonb,'["fieldTraining"]'::jsonb))),
 'rollout',(SELECT COALESCE(bool_or(r.enabled),false) FROM suite_organization_rollout r JOIN agency d ON d.tenant_id=r.tenant_id AND d.id=r.agency_id)
);
ROLLBACK;
SQL
# Credentials are not needed by the probe runner and are not passed to it.
unset PGPASSWORD secret config
python3 - "$probe_dir" <<'PY'
import json,pathlib,subprocess,sys
root=pathlib.Path(sys.argv[1]); fixtures=json.loads((root/'fixtures.json').read_text())
records=fixtures.get('records') or []; actors=fixtures.get('actors') or []
tid=fixtures['tenant']; aid=fixtures['agency']; seq=0; failures=0; blocked=0
print('IAM-controlled deployed-handler read tests; browser/Gateway authentication is not covered.')
print('Agency-wide rollout enabled:', fixtures.get('rollout'))
def report(label,ok,detail=''):
 global failures
 failures+=int(not ok); print(('PASS' if ok else 'FAIL')+' | '+label+(' | '+detail if detail else ''))
def block(label,reason):
 global blocked
 blocked+=1; print('BLOCKED | '+label+' | '+reason)
def invoke(actor,path,body=None):
 global seq
 seq+=1; stem=root/str(seq)
 event={'version':'2.0','rawPath':path,'requestContext':{'http':{'method':'GET' if body is None else 'POST'},'authorizer':{'jwt':{'claims':{'sub':actor['cognito_sub']}}}}}
 if body is None:event['queryStringParameters']={'subdomain':'demo'}
 else:event['body']=json.dumps({'tenant_id':tid,'agency_id':aid,**body})
 event_path=stem.with_suffix('.event.json'); output=stem.with_suffix('.response.json');event_path.write_text(json.dumps(event))
 run=subprocess.run(['aws','lambda','invoke','--function-name','sonomarzi-api-dev','--payload','fileb://'+str(event_path),str(output)],capture_output=True,text=True)
 if run.returncode:raise RuntimeError('Lambda invocation failed: '+run.stderr)
 meta=json.loads(run.stdout); raw=json.loads(output.read_text())
 if meta.get('FunctionError'):raise RuntimeError('Lambda handler failed: '+str(raw.get('errorType')))
 return raw.get('statusCode'),json.loads(raw.get('body','{}'))
def entries(rows,collection):
 result=[]
 for row in rows:
  path,item=json.loads(row['key'])
  if '.'.join(path)!=collection or item=='$order' or row.get('deleted'):continue
  value=row.get('value');result.extend(value if item=='$value' and isinstance(value,list) else [value])
 return [x for x in result if isinstance(x,dict)]
def ident(value):return str(value.get('personId') or value.get('id') or '')
def keys(value):
 if isinstance(value,dict):
  for x in value.values():yield from keys(x)
 elif isinstance(value,list):
  for x in value:yield from keys(x)
 elif isinstance(value,str) and value.startswith(f'tenants/{tid}/agencies/{aid}/attachments/'):yield value
state=next((r['value'] for r in records if json.loads(r['key'])[0]==['fieldTraining']),{})
report('Both approved test identities found',len(actors)==2)
for actor in actors:
 label='Dispatch' if actor['email']=='fred+ses@sonomarzi.com' else 'Patrol'
 report(label+' has no administrator bypass',not actor.get('platform_admin') and not {'role_admin','role_platform_admin'}.intersection(actor.get('role_ids') or []))
 expected=set(actor.get('expected_people') or [])
 if not expected:block(label+' positive identity fixture','No active assignment matches stored scope')
 status,ws=invoke(actor,'/workspace');report(label+' workspace loads',status==200 and ws.get('success') is True)
 for collection in ['personnel','pm.records']:
  visible={ident(x) for x in entries(ws.get('records',[]),collection)}
  report(label+' '+collection+' excludes hidden identities',visible<=expected,'returned='+str(len(visible)))
  if collection=='personnel' and expected:
   available={ident(x) for x in entries(records,collection)}
   report(label+' authorized directory fixtures present',visible==expected.intersection(available),'expected='+str(len(expected.intersection(available))))
 report(label+' templates contain no Personnel rows',not ws.get('template',{}).get('personnel') and not ws.get('template',{}).get('pm',{}).get('records'))
 for query in (['1812','2345'] if label=='Dispatch' else ['6767']):
  candidates=[r for r in entries(records,'pm.records') if ident(r) not in expected and any(query.lower() in str(r.get(k,'')).lower() for k in ['name','badgeNumber','employeeId'])]
  if not candidates:
   block(label+' denied search '+query,'No matching out-of-scope HR fixture');continue
  status,data=invoke(actor,'/global-search',{'query':query})
  report(label+' hidden-person search '+query,status==200 and data.get('success') is True and not data.get('results'))
 positive=next(((ident(r),str(r.get(k))) for r in entries(records,'pm.records') if ident(r) in expected for k in ['badgeNumber','employeeId','name'] if len(str(r.get(k) or ''))>=3),None)
 if positive:
  pid,query=positive;status,data=invoke(actor,'/global-search',{'query':query})
  report(label+' authorized person search',status==200 and any(r.get('id')==pid for r in data.get('results',[])))
 else:block(label+' positive person search','No searchable authorized HR fixture')
 status,ft=invoke(actor,'/field-training',{'action':'list'})
 if status==403:
  if label=='Dispatch':report('Dispatch Field Training role access',False,ft.get('error','Denied'))
  else:print('PASS | Patrol Field Training role denial (trainee-scope behavior not covered)')
 else:
  report(label+' Field Training loads',status==200 and ft.get('success') is True)
  data=ft.get('data') or {};members=data.get('members') or [];enrollments=data.get('enrollments') or []
  report(label+' Field Training members scoped',all(m.get('person_id') in expected for m in members))
  report(label+' trainee files scoped',all(e.get('trainee_person') in expected for e in enrollments),'returned='+str(len(enrollments)))
  visible_ids={e['id'] for e in enrollments};report(label+' reports and shifts reference visible files',all(x.get('enrollment_id') in visible_ids for k in ['reports','coverage','shifts'] for x in data.get(k,[])))
  if not enrollments:block(label+' positive trainee file access','No authorized enrollment fixture returned')
 hidden_keys=set()
 for collection in ['personnel','pm.records']:
  for row in entries(records,collection):
   if ident(row) not in expected:hidden_keys.update(keys(row))
 reports={r['id']:r for r in state.get('reports',[])};enrollments={e['id']:e for e in state.get('enrollments',[])}
 for attachment in state.get('attachments',[]):
  enrollment=enrollments.get(reports.get(attachment.get('report_id'),{}).get('enrollment_id'),{})
  if enrollment.get('trainee_person') not in expected:hidden_keys.update(keys(attachment))
 if not hidden_keys:block(label+' existing hidden attachment denial','No existing out-of-scope attachment fixture')
 for index,key in enumerate(sorted(hidden_keys),1):
  status,result=invoke(actor,'/attachments/download-url',{'key':key})
  report(label+' hidden attachment '+str(index)+' refuses signed URL',status==403 and not result.get('download_url'))
print('SUMMARY | failures='+str(failures)+' | fixture gaps='+str(blocked))
print('Private raw evidence directory:',root)
sys.exit(1 if failures else 0)
PY
