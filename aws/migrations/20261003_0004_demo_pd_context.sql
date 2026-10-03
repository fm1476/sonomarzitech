-- SonoMarzi AWS Migration 0004
-- Seed the AWS development database with the existing Demo PD tenant/agency identity.
-- Data payload export/import is intentionally separate so this migration remains reviewable and idempotent.

BEGIN;

INSERT INTO suite_tenants
  (id, slug, name, timezone, plan, status, enabled_modules, metadata)
VALUES
  ('f15865be-cf46-41e0-9d60-7cd753437501','demopd','Demo PD','America/Los_Angeles','Enterprise','active',
   ARRAY['qm','fleet','personnel','k9','drone','eod','subpoena','grants','civil']::text[],'{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug=EXCLUDED.slug,name=EXCLUDED.name,timezone=EXCLUDED.timezone,plan=EXCLUDED.plan,
  status=EXCLUDED.status,enabled_modules=EXCLUDED.enabled_modules,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO suite_agencies
  (id, tenant_id, name, abbreviation, agency_type, ori, status, branding)
VALUES
  ('64624bcc-232d-4af5-bae6-a8e621cde447','f15865be-cf46-41e0-9d60-7cd753437501',
   'Demo PD','DPD','Municipal Police',NULL,'setup',
   '{"title":"Demo PD Command Core","subtitle":"Choose a module to begin"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  tenant_id=EXCLUDED.tenant_id,name=EXCLUDED.name,abbreviation=EXCLUDED.abbreviation,
  agency_type=EXCLUDED.agency_type,ori=EXCLUDED.ori,status=EXCLUDED.status,
  branding=EXCLUDED.branding,updated_at=NOW();

-- Attach the already-bootstrapped Cognito user to Demo PD without relying on a generated AWS user UUID.
INSERT INTO suite_memberships (user_id,tenant_id,agency_id,person_id,role_ids,status)
SELECT u.id,
       'f15865be-cf46-41e0-9d60-7cd753437501'::uuid,
       '64624bcc-232d-4af5-bae6-a8e621cde447'::uuid,
       'fred',
       ARRAY['role_admin','role_platform_admin']::text[],
       'active'
FROM suite_users u
WHERE u.cognito_sub='d1db2530-a0e1-70b5-bdcf-d1b5d42066d8'
ON CONFLICT (user_id,tenant_id,agency_id) DO UPDATE SET
  person_id=EXCLUDED.person_id,role_ids=EXCLUDED.role_ids,status='active';

INSERT INTO sonomarzi_schema_migrations (migration_id,description)
VALUES ('20261003_0004_demo_pd_context','Seed Demo PD tenant, agency, and Cognito membership')
ON CONFLICT (migration_id) DO NOTHING;

COMMIT;
