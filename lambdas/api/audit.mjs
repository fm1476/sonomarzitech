import {
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility
} from "./core.mjs";

/*
 * ---------------------------------------------------------
 * AWS DURABLE ACTIVITY / AUDIT LOG
 * ---------------------------------------------------------
 * Dedicated append-only persistence. The generic record save path refuses
 * auditLog writes, so callers cannot rewrite or delete their audit history.
 * Actor identity and source IP are derived server-side from the authenticated
 * request rather than trusted from browser-supplied values.
 */
let auditSchemaReady = false;

async function ensureAuditSchema(client) {
  if (auditSchemaReady) return;

  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_activity_log (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      agency_id UUID NOT NULL,
      actor_user_id UUID NOT NULL,
      actor_person_id TEXT,
      actor_email TEXT,
      actor_name TEXT,
      module TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'general',
      description TEXT NOT NULL,
      ip_address TEXT,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // CREATE TABLE IF NOT EXISTS does not add columns to an older table.
  // Upgrade legacy audit tables additively before creating indexes or writing rows.
  await client.query(`
    ALTER TABLE suite_activity_log
      ADD COLUMN IF NOT EXISTS tenant_id UUID,
      ADD COLUMN IF NOT EXISTS agency_id UUID,
      ADD COLUMN IF NOT EXISTS actor_user_id UUID,
      ADD COLUMN IF NOT EXISTS actor_person_id TEXT,
      ADD COLUMN IF NOT EXISTS actor_email TEXT,
      ADD COLUMN IF NOT EXISTS actor_name TEXT,
      ADD COLUMN IF NOT EXISTS module TEXT,
      ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ DEFAULT now()
  `);

  // Preserve actor identity from the legacy schema when that column exists.
  const legacyActor = await client.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'suite_activity_log'
        AND column_name = 'actor_id'
      LIMIT 1`
  );
  if (legacyActor.rows.length) {
    await client.query(
      `UPDATE suite_activity_log
          SET actor_person_id = COALESCE(actor_person_id, actor_id::text)
        WHERE actor_person_id IS NULL`
    );
  }

  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_activity_log_workspace_time_idx
      ON suite_activity_log (tenant_id, agency_id, occurred_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_activity_log_actor_idx
      ON suite_activity_log (tenant_id, agency_id, actor_user_id, occurred_at DESC)
  `);

  auditSchemaReady = true;
}

function requestSourceIp(event) {
  return (
    event?.requestContext?.http?.sourceIp ||
    event?.requestContext?.identity?.sourceIp ||
    null
  );
}

async function canViewPlatformAudit(client, workspaceAuth) {
  if (workspaceAuth.admin) return true;

  const abilityMap = await loadRoleAbilityMap(
    client,
    workspaceAuth.tenantId,
    workspaceAuth.agencyId,
    workspaceAuth.roleIds
  );

  const auditAbilities = [
    'qm_admin_audit',
    'fleet_admin_audit',
    'pm_admin_audit',
    'k9_admin_audit',
    'drone_admin_audit',
    'eod_admin_audit',
    'subpoena_admin_audit',
    'grants_admin_audit',
    'civil_admin_audit'
  ];

  return auditAbilities.some(ability =>
    roleHasAbility(abilityMap, workspaceAuth.roleIds, ability)
  );
}

async function auditLogApi(client, auth, body, event) {
  const action = String(body?.action || '');
  const tenantId = body?.tenantId || body?.tenant_id;
  const agencyId = body?.agencyId || body?.agency_id;

  if (!action || !tenantId || !agencyId) {
    return response(400, {
      success: false,
      error: 'action, tenantId, and agencyId are required.'
    });
  }

  const workspaceAuth = await resolveWorkspaceMembership(
    client,
    auth,
    tenantId,
    agencyId
  );
  if (workspaceAuth.error) return workspaceAuth.error;

  await ensureAuditSchema(client);

  if (action === 'log') {
    const moduleName = String(body?.module || 'Shared').trim().slice(0, 100);
    const entityType = String(body?.entityType || body?.entity_type || 'general')
      .trim().slice(0, 100);
    const description = String(body?.description || body?.message || '').trim().slice(0, 4000);

    if (!description) {
      return response(400, {
        success: false,
        error: 'Audit description is required.'
      });
    }

    const inserted = await client.query(
      `INSERT INTO suite_activity_log (
         tenant_id, agency_id, actor_user_id, actor_person_id,
         actor_email, actor_name, module, entity_type, description, ip_address
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, occurred_at`,
      [
        tenantId,
        agencyId,
        auth.userId,
        workspaceAuth.personId,
        auth.email || null,
        auth.displayName || auth.email || 'Unknown user',
        moduleName || 'Shared',
        entityType || 'general',
        description,
        requestSourceIp(event)
      ]
    );

    return response(200, {
      success: true,
      data: {
        id: inserted.rows[0].id,
        occurred_at: inserted.rows[0].occurred_at
      }
    });
  }

  if (action === 'list') {
    if (!(await canViewPlatformAudit(client, workspaceAuth))) {
      return response(403, {
        success: false,
        error: 'Audit log access is not permitted for this role.'
      });
    }

    const requestedLimit = Number(body?.limit || 2000);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(5000, Math.trunc(requestedLimit)))
      : 2000;

    const q = await client.query(
      `SELECT id, actor_user_id, actor_person_id, actor_email, actor_name,
              module, entity_type, description, ip_address, occurred_at
         FROM suite_activity_log
        WHERE tenant_id = $1 AND agency_id = $2
        ORDER BY occurred_at DESC, id DESC
        LIMIT $3`,
      [tenantId, agencyId, limit]
    );

    return response(200, {
      success: true,
      data: {
        events: q.rows.map(row => ({
          id: row.id,
          actor_id: row.actor_person_id || row.actor_user_id,
          actor_user_id: row.actor_user_id,
          actor_name: row.actor_name || row.actor_email || 'Unknown user',
          actor_email: row.actor_email,
          module: row.module,
          entity_type: row.entity_type || 'general',
          description: row.description,
          ip_address: row.ip_address || 'Unknown',
          occurred_at: row.occurred_at
        }))
      }
    });
  }

  return response(400, {
    success: false,
    error: 'Unsupported audit log action.'
  });
}

export { auditLogApi };
