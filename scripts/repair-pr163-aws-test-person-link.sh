#!/usr/bin/env bash
# Privileged IAM-controlled handler probes, NOT an API Gateway JWT/auth test.
# Demo-only repair: link the approved AWS Test account to its existing directory identity.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
umask 077
config=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query Environment.Variables --output json)
secret=$(aws secretsmanager get-secret-value --secret-id "$(jq -r '.DB_SECRET_ARN' <<< "$config")" --query SecretString --output text)
export PGHOST=$(jq -r '.DB_HOST' <<< "$config") PGPORT=$(jq -r '.DB_PORT // "5432"' <<< "$config") PGDATABASE=$(jq -r '.DB_NAME' <<< "$config")
export PGUSER=$(jq -r '.username' <<< "$secret") PGPASSWORD=$(jq -r '.password' <<< "$secret") PGSSLMODE=require
psql -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET LOCAL lock_timeout='10s';
DO $repair$
DECLARE
  tid constant uuid := 'f15865be-cf46-41e0-9d60-7cd753437501';
  aid constant uuid := '64624bcc-232d-4af5-bae6-a8e621cde447';
  old_person constant text := 'person_a5ae69c9b61e453ea543f2708a36919a';
  target_person constant text := 'p17910562955703cr';
  target_user uuid;
  current_person text;
  affected integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(tid::text||':'||aid::text||':aws-test-identity-repair'));
  IF NOT EXISTS(SELECT 1 FROM suite_agencies WHERE tenant_id=tid AND id=aid AND subdomain='demo') THEN
    RAISE EXCEPTION 'Demo agency mismatch';
  END IF;
  SELECT u.id INTO STRICT target_user FROM suite_users u WHERE lower(u.email)='test@test1.com';
  SELECT m.person_id INTO STRICT current_person FROM suite_memberships m
    WHERE m.tenant_id=tid AND m.agency_id=aid AND m.user_id=target_user AND m.status='active' FOR UPDATE;
  IF current_person IS NULL OR current_person NOT IN (old_person,target_person) THEN
    RAISE EXCEPTION 'Account identity changed since diagnosis; no repair applied';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM suite_records r WHERE r.tenant_id=tid AND r.agency_id=aid AND NOT r.deleted
    AND (r.key::jsonb)->0='["personnel"]'::jsonb AND (r.key::jsonb)->>1=target_person
    AND r.value->>'id'=target_person AND lower(r.value->>'name')='aws test' AND r.value->>'unit'='Patrol') THEN
    RAISE EXCEPTION 'Expected aws test Patrol directory record missing';
  END IF;
  IF EXISTS(SELECT 1 FROM suite_memberships m WHERE m.tenant_id=tid AND m.agency_id=aid
    AND m.person_id=target_person AND m.user_id<>target_user) THEN
    RAISE EXCEPTION 'Directory identity is linked to another account';
  END IF;
  UPDATE suite_memberships SET person_id=target_person
    WHERE tenant_id=tid AND agency_id=aid AND user_id=target_user AND status='active';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Expected exactly one membership update'; END IF;
  RAISE NOTICE 'AWS Test membership now matches its existing directory person. Role permissions retained.';
END $repair$;
COMMIT;
SELECT u.email,m.person_id,m.role_ids,r.value->>'name' AS directory_name,r.value->>'unit' AS directory_unit
FROM suite_users u JOIN suite_memberships m ON m.user_id=u.id
JOIN suite_records r ON r.tenant_id=m.tenant_id AND r.agency_id=m.agency_id
 AND (r.key::jsonb)->0='["personnel"]'::jsonb AND (r.key::jsonb)->>1=m.person_id AND NOT r.deleted
WHERE lower(u.email)='test@test1.com' AND m.status='active'
 AND m.tenant_id='f15865be-cf46-41e0-9d60-7cd753437501'::uuid
 AND m.agency_id='64624bcc-232d-4af5-bae6-a8e621cde447'::uuid;
SQL
