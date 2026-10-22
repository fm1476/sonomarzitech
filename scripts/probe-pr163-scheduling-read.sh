#!/usr/bin/env bash
# Privileged IAM-controlled handler probes, NOT an API Gateway JWT/auth test.
# Reads existing fixtures only. Never prints Cognito subjects or signed URLs.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
probe_dir=$(mktemp -d /tmp/sonomarzi-scheduling-boundaries.XXXXXX)
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
        EXISTS (SELECT 1 FROM suite_records rr
          WHERE rr.tenant_id=m.tenant_id AND rr.agency_id=m.agency_id AND rr.deleted=false
            AND (rr.key::jsonb)->0='["roles"]'::jsonb
            AND rr.value->>'id'=ANY(m.role_ids)
            AND rr.value->'abilities'->>'pm_records_view'='true') AS pm_records_view,
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
 'records',(SELECT jsonb_agg(jsonb_build_object('key',r.key,'value',r.value)) FROM suite_records r JOIN agency d ON d.tenant_id=r.tenant_id AND d.id=r.agency_id WHERE r.deleted=false AND ((r.key::jsonb)->0 IN ('["personnel"]'::jsonb,'["pm","records"]'::jsonb,'["fieldTraining"]'::jsonb,'["roles"]'::jsonb,'["pm","scheduleWorkGroups"]'::jsonb,'["pm","scheduleShifts"]'::jsonb))),
 'rollout',(SELECT COALESCE(bool_or(r.enabled),false) FROM suite_organization_rollout r JOIN agency d ON d.tenant_id=r.tenant_id AND d.id=r.agency_id)
);
ROLLBACK;
SQL
# Credentials are not needed by the probe runner and are not passed to it.
unset PGPASSWORD secret config
python3 - "$probe_dir" <<'PYRUN'
import json,pathlib,subprocess,sys
root=pathlib.Path(sys.argv[1]);fixture=json.loads((root/'fixtures.json').read_text());failures=0
assert fixture['tenant']=='f15865be-cf46-41e0-9d60-7cd753437501'
assert fixture['agency']=='64624bcc-232d-4af5-bae6-a8e621cde447'
def entries(rows,collection):
 out=[]
 for row in rows:
  path,item=json.loads(row['key'])
  if '.'.join(path)!=collection or item=='$order' or row.get('deleted'):continue
  value=row.get('value');out.extend(value if item=='$value' and isinstance(value,list) else [value])
 return [v for v in out if isinstance(v,dict)]
def check(label,ok):
 global failures
 failures+=not ok;print(('PASS' if ok else 'FAIL')+' | '+label,flush=True)
rows=fixture.get('records') or [];groups=entries(rows,'pm.scheduleWorkGroups');people=entries(rows,'personnel');roles=entries(rows,'roles')
print('Read-only IAM handler calendar tests. Browser/Gateway authentication and writes are not covered.')
check('Agency-wide rollout remains disabled',fixture.get('rollout') is False)
assert len(fixture['actors'])==2 and groups,'Both approved actors and existing calendars required'
for index,actor in enumerate(fixture['actors']):
 label='Dispatch' if actor['email']=='fred+ses@sonomarzi.com' else 'Patrol';pid=actor['person_id']
 assert not actor['platform_admin'] and not {'role_admin','role_platform_admin'}.intersection(actor.get('role_ids') or [])
 person=next((p for p in people if p.get('id')==pid),{});unit=str(person.get('unit') or person.get('department') or '').strip().lower()
 expected={g['id'] for g in groups if g.get('active') is not False and (g.get('visibility')=='agency' or pid in (g.get('viewerIds') or []) or pid in (g.get('managerIds') or []) or g.get('visibility')=='unit' and unit and unit in [str(u).strip().lower() for u in g.get('unitNames',[])])}
 event={'version':'2.0','rawPath':'/workspace','queryStringParameters':{'subdomain':'demo'},'requestContext':{'http':{'method':'GET'},'authorizer':{'jwt':{'claims':{'sub':actor['cognito_sub']}}}}}
 ep=root/f'{index}.event.json';op=root/f'{index}.response.json';ep.write_text(json.dumps(event))
 result=subprocess.run(['aws','lambda','invoke','--function-name','sonomarzi-api-dev','--payload','fileb://'+str(ep),str(op)],capture_output=True,text=True)
 assert result.returncode==0,'Lambda invocation failed'
 assert not json.loads(result.stdout).get('FunctionError'),'Lambda execution error'
 raw=json.loads(op.read_text());body=json.loads(raw['body']);check(label+' workspace loads',raw['statusCode']==200 and body.get('success') is True)
 visible=entries(body.get('records') or [],'pm.scheduleWorkGroups');actual={g['id'] for g in visible}
 check(label+' calendar visibility matches existing calendar grants',actual==expected)
 hidden={g['id'] for g in groups}-expected
 check(label+' hidden calendar shifts excluded',all((s.get('workGroupId') or 'wg_patrol') not in hidden for s in entries(body.get('records') or [],'pm.scheduleShifts') if s.get('id') not in {a.get('shiftId') for a in entries(body.get('records') or [],'pm.scheduleAssignments') if a.get('personId')==pid}))
 abilities={k for r in roles if r.get('id') in (actor.get('role_ids') or []) for k,v in (r.get('abilities') or {}).items() if v is True}
 for g in groups:
  manager=g.get('active') is not False and pid in (g.get('managerIds') or [])
  print('CALENDAR | '+label+' | '+str(g.get('name') or g['id'])+' | visible='+str(g['id'] in actual)+' | assigned_manager='+str(manager)+' | schedule_manage_role='+str('pm_schedule_manage' in abilities),flush=True)
print('Private evidence directory:',root)
print('SUMMARY | failures='+str(failures)+' | write tests pending')
sys.exit(1 if failures else 0)
PYRUN
