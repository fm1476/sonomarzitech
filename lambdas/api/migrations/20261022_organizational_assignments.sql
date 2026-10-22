-- Organizational assignment foundation for PR #163.
-- DDL ONLY. Do not run directly against live RDS until reviewed and approved.
-- Does not rewrite existing Personnel, Field Training, or Scheduling data.
BEGIN;

CREATE TABLE IF NOT EXISTS suite_organization_nodes (
  tenant_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('division', 'unit', 'work_group')),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  parent_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, agency_id, id),
  FOREIGN KEY (tenant_id, agency_id, parent_id)
    REFERENCES suite_organization_nodes (tenant_id, agency_id, id)
    DEFERRABLE INITIALLY IMMEDIATE,
  CHECK (id IS DISTINCT FROM parent_id)
);

CREATE INDEX IF NOT EXISTS suite_organization_nodes_parent_idx
  ON suite_organization_nodes (tenant_id, agency_id, parent_id)
  WHERE active;

CREATE TABLE IF NOT EXISTS suite_person_organization_assignments (
  tenant_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  id uuid NOT NULL,
  person_id text NOT NULL CHECK (length(trim(person_id)) > 0),
  organization_id uuid NOT NULL,
  primary_assignment boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (tenant_id, agency_id, id),
  FOREIGN KEY (tenant_id, agency_id, organization_id)
    REFERENCES suite_organization_nodes (tenant_id, agency_id, id),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS suite_person_assignments_lookup_idx
  ON suite_person_organization_assignments (tenant_id, agency_id, person_id, active);
CREATE INDEX IF NOT EXISTS suite_person_assignments_organization_idx
  ON suite_person_organization_assignments (tenant_id, agency_id, organization_id, active);
-- Do not force one primary assignment until date-overlap semantics are finalized.
-- Existing personnel are intentionally NOT backfilled here.

-- Explicit, reversible per-agency cutover; deploying DDL alone never enables it.
CREATE TABLE IF NOT EXISTS suite_organization_rollout (
 tenant_id uuid NOT NULL,
 agency_id uuid NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 activated_at timestamptz,
 activated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id, agency_id),
 CHECK (NOT enabled OR activated_at IS NOT NULL)
);

COMMIT;
