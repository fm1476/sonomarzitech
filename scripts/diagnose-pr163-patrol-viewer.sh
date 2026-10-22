#!/usr/bin/env bash
# Privileged IAM-controlled handler probes, NOT an API Gateway JWT/auth test.
# Read-only identity and saved viewer-grant diagnostic.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
config=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query Environment.Variables --output json)
secret=$(aws secretsmanager get-secret-value --secret-id "$(jq -r '.DB_SECRET_ARN' <<< "$config")" --query SecretString --output text)
export PGHOST=$(jq -r '.DB_HOST' <<< "$config") PGPORT=$(jq -r '.DB_PORT // "5432"' <<< "$config") PGDATABASE=$(jq -r '.DB_NAME' <<< "$config")
export PGUSER=$(jq -r '.username' <<< "$secret") PGPASSWORD=$(jq -r '.password' <<< "$secret") PGSSLMODE=require
psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL' | python3 -m json.tool
BEGIN READ ONLY;
WITH target AS (
 SELECT u.email,m.person_id FROM suite_users u
 JOIN suite_memberships m ON m.user_id=u.id
 WHERE lower(u.email)='test@test1.com' AND m.status='active'
 AND m.tenant_id='f15865be-cf46-41e0-9d60-7cd753437501'::uuid
 AND m.agency_id='64624bcc-232d-4af5-bae6-a8e621cde447'::uuid
), raw AS (
 SELECT key,value,version FROM suite_records
 WHERE tenant_id='f15865be-cf46-41e0-9d60-7cd753437501'::uuid
 AND agency_id='64624bcc-232d-4af5-bae6-a8e621cde447'::uuid
 AND deleted=false AND (key::jsonb)->0 IN ('["personnel"]'::jsonb,'["pm","scheduleWorkGroups"]'::jsonb)
 AND (key::jsonb)->>1<>'$order'
), entries AS (
 SELECT key,version,item FROM raw
 CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN (key::jsonb)->>1='$value' AND jsonb_typeof(value)='array' THEN value ELSE jsonb_build_array(value) END) item
), calendars AS (
 SELECT item,version FROM entries WHERE (key::jsonb)->0='["pm","scheduleWorkGroups"]'::jsonb AND lower(item->>'name')='patrol'
), people AS (
 SELECT item FROM entries WHERE (key::jsonb)->0='["personnel"]'::jsonb
)
SELECT jsonb_build_object(
 'account',(SELECT to_jsonb(t) FROM target t),
 'saved_patrol_calendars',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',item->>'id','name',item->>'name','version',version,'viewerIds',item->'viewerIds','managerIds',item->'managerIds','unitNames',item->'unitNames')) FROM calendars),'[]'::jsonb),
 'matching_directory_entries',COALESCE((SELECT jsonb_agg(jsonb_build_object('person_id',p.item->>'id','name',p.item->>'name','unit',p.item->>'unit','matches_account',EXISTS(SELECT 1 FROM target t WHERE t.person_id=p.item->>'id'),'saved_patrol_viewer',EXISTS(SELECT 1 FROM calendars c WHERE (c.item->'viewerIds') ? (p.item->>'id')))) FROM people p WHERE lower(p.item->>'name') LIKE '%aws%test%' OR EXISTS(SELECT 1 FROM target t WHERE t.person_id=p.item->>'id') OR EXISTS(SELECT 1 FROM calendars c WHERE (c.item->'viewerIds') ? (p.item->>'id'))),'[]'::jsonb)
);
ROLLBACK;
SQL
