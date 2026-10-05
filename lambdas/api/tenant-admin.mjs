import { response } from "./core.mjs";
import { appendAuditEvent } from "./audit.mjs";
import { cleanAgencySubdomain, ensureAgencySubdomainSchema } from "./lib/agency-subdomains.mjs";

/*
 * AWS TENANT / USER ADMINISTRATION - DATABASE SIDE
 * Cognito calls are intentionally handled by a separate Lambda outside the VPC.
 */
async function requireTenantAdminDb(client, auth, tenantId) {
  if (auth.platformAdmin) return { platformAdmin: true };

  const check = await client.query(
    `SELECT 1
       FROM suite_memberships
      WHERE tenant_id = $1
        AND user_id = $2
        AND status = 'active'
        AND 'role_admin' = ANY(role_ids)
      LIMIT 1`,
    [tenantId, auth.userId]
  );

  if (!check.rows.length) {
    return {
      error: response(403, {
        success: false,
        error: "System Admin or Platform Admin access is required."
      })
    };
  }

  return { platformAdmin: false };
}

async function ensurePlatformAdminTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_regional_workspaces (
      id TEXT PRIMARY KEY,
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      agency_ids UUID[] NOT NULL DEFAULT '{}',
      modules TEXT[] NOT NULL DEFAULT '{}',
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Upgrade older regional-workspace tables created before multi-agency support.
  // CREATE TABLE IF NOT EXISTS does not add columns to an existing table, so keep
  // these ALTERs idempotent and let every deployment safely repair the schema.
  await client.query(`
    ALTER TABLE suite_regional_workspaces
      ADD COLUMN IF NOT EXISTS agency_ids UUID[] NOT NULL DEFAULT '{}'
  `);
  await client.query(`
    ALTER TABLE suite_regional_workspaces
      ADD COLUMN IF NOT EXISTS modules TEXT[] NOT NULL DEFAULT '{}'
  `);
  await client.query(`
    ALTER TABLE suite_regional_workspaces
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_regional_workspaces_tenant_idx
      ON suite_regional_workspaces (tenant_id, created_at DESC)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_support_sessions (
      id TEXT PRIMARY KEY,
      tenant_id UUID NOT NULL,
      support_user_id UUID NOT NULL,
      reason TEXT NOT NULL,
      scope TEXT[] NOT NULL DEFAULT '{}',
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Repair columns that may be absent on support-session tables from early builds.
  await client.query(`
    ALTER TABLE suite_support_sessions
      ADD COLUMN IF NOT EXISTS scope TEXT[] NOT NULL DEFAULT '{}'
  `);
  await client.query(`
    ALTER TABLE suite_support_sessions
      ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ
  `);
  await client.query(`
    ALTER TABLE suite_support_sessions
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_support_sessions_tenant_idx
      ON suite_support_sessions (tenant_id, expires_at DESC)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_platform_events (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      actor_user_id UUID NOT NULL,
      actor_name TEXT,
      action TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_platform_events_tenant_idx
      ON suite_platform_events (tenant_id, occurred_at DESC)
  `);
}

async function platformEvent(client, auth, tenantId, action) {
  await ensurePlatformAdminTables(client);
  await client.query(
    `INSERT INTO suite_platform_events (tenant_id, actor_user_id, actor_name, action)
     VALUES ($1,$2,$3,$4)`,
    [tenantId, auth.userId, auth.displayName || auth.email || 'Platform Admin', String(action).slice(0, 2000)]
  );
}

function platformOnly(auth) {
  if (auth.platformAdmin) return null;
  return response(403, { success: false, error: 'Platform Admin access is required.' });
}

async function listPlatformContexts(client, auth, body) {
  await ensurePlatformAdminTables(client);
  await ensureAgencySubdomainSchema(client);

  const base = auth.platformAdmin
    ? await client.query(
        `SELECT t.id AS tenant_id, t.slug, t.name AS tenant_name, t.timezone, t.plan,
                t.status AS tenant_status, t.enabled_modules, t.metadata,
                a.id AS agency_id, a.name AS agency_name, a.abbreviation,
                a.agency_type, a.ori, a.status AS agency_status, a.branding, a.subdomain
           FROM suite_tenants t
           JOIN suite_agencies a ON a.tenant_id = t.id
          ORDER BY lower(t.name), lower(a.name)`
      )
    : await client.query(
        `SELECT t.id AS tenant_id, t.slug, t.name AS tenant_name, t.timezone, t.plan,
                t.status AS tenant_status, t.enabled_modules, t.metadata,
                a.id AS agency_id, a.name AS agency_name, a.abbreviation,
                a.agency_type, a.ori, a.status AS agency_status, a.branding, a.subdomain
           FROM suite_memberships m
           JOIN suite_tenants t ON t.id = m.tenant_id
           JOIN suite_agencies a ON a.tenant_id = m.tenant_id AND a.id = m.agency_id
          WHERE m.user_id = $1 AND m.status = 'active'
          ORDER BY lower(t.name), lower(a.name)`,
        [auth.userId]
      );

  const tenantIds = [...new Set(base.rows.map(r => r.tenant_id))];
  const users = tenantIds.length
    ? await client.query(
        `SELECT m.tenant_id, m.agency_id, m.role_ids, m.status AS membership_status,
                u.id AS user_id, u.display_name, u.email, u.status AS user_status
           FROM suite_memberships m
           JOIN suite_users u ON u.id = m.user_id
          WHERE m.tenant_id = ANY($1::uuid[])
            AND m.status = 'active'
          ORDER BY lower(u.display_name), lower(u.email)`,
        [tenantIds]
      )
    : { rows: [] };
  const regional = tenantIds.length
    ? await client.query(
        `SELECT id, tenant_id, name, agency_ids, modules, created_at
           FROM suite_regional_workspaces
          WHERE tenant_id = ANY($1::uuid[])
          ORDER BY created_at DESC`,
        [tenantIds]
      )
    : { rows: [] };
  const support = tenantIds.length
    ? await client.query(
        `SELECT id, tenant_id, support_user_id, reason, scope, expires_at, revoked_at, created_at
           FROM suite_support_sessions
          WHERE tenant_id = ANY($1::uuid[])
          ORDER BY created_at DESC`,
        [tenantIds]
      )
    : { rows: [] };
  const events = tenantIds.length
    ? await client.query(
        `SELECT tenant_id, actor_name, action, occurred_at
           FROM suite_platform_events
          WHERE tenant_id = ANY($1::uuid[])
          ORDER BY occurred_at DESC`,
        [tenantIds]
      )
    : { rows: [] };

  const map = new Map();
  for (const row of base.rows) {
    if (!map.has(row.tenant_id)) {
      map.set(row.tenant_id, {
        id: row.tenant_id,
        slug: row.slug,
        name: row.tenant_name,
        timezone: row.timezone,
        status: row.tenant_status,
        plan: row.plan,
        enabledModules: Array.isArray(row.enabled_modules) ? row.enabled_modules : [],
        mfaPolicy: tenantMfaPolicy(row.metadata || {}),
        agencies: [], admins: [], invites: [], regionalWorkspaces: [], supportSessions: [], audit: []
      });
    }
    map.get(row.tenant_id).agencies.push({
      id: row.agency_id,
      name: row.agency_name,
      abbreviation: row.abbreviation,
      type: row.agency_type,
      ori: row.ori,
      status: row.agency_status,
      branding: row.branding || {},
      subdomain: row.subdomain || ''
    });
  }

  for (const row of users.rows) {
    const t = map.get(row.tenant_id); if (!t) continue;
    const roles = Array.isArray(row.role_ids) ? row.role_ids : [];
    const target = row.user_status === 'invited' ? t.invites : t.admins;
    if (row.user_status === 'invited' || roles.includes('role_admin')) {
      if (!target.some(x => x.id === row.user_id && x.agencyId === row.agency_id)) {
        target.push({
          id: row.user_id,
          agencyId: row.agency_id,
          name: row.display_name || row.email,
          email: row.email,
          roleIds: roles,
          status: row.user_status === 'invited' ? 'pending' : 'active'
        });
      }
    }
  }
  for (const row of regional.rows) {
    const t = map.get(row.tenant_id); if (!t) continue;
    t.regionalWorkspaces.push({ id: row.id, name: row.name, agencyIds: row.agency_ids || [], modules: row.modules || [], createdAt: row.created_at });
  }
  for (const row of support.rows) {
    const t = map.get(row.tenant_id); if (!t) continue;
    t.supportSessions.push({ id: row.id, supportUserId: row.support_user_id, reason: row.reason, scope: row.scope || [], expiresAt: row.expires_at, revokedAt: row.revoked_at, createdAt: row.created_at });
  }
  const perTenantEventCount = new Map();
  for (const row of events.rows) {
    const n = perTenantEventCount.get(row.tenant_id) || 0;
    if (n >= 25) continue;
    const t = map.get(row.tenant_id); if (!t) continue;
    t.audit.push({ id: `pa_${row.tenant_id}_${n}`, at: row.occurred_at, actor: row.actor_name || 'Platform Admin', action: row.action });
    perTenantEventCount.set(row.tenant_id, n + 1);
  }

  const tenants = [...map.values()];
  let requestedTenantId = body?.currentTenantId || body?.tenantId || null;
  let requestedAgencyId = body?.currentAgencyId || body?.agencyId || null;
  let current = null;
  if (requestedTenantId && requestedAgencyId) {
    const t = map.get(requestedTenantId);
    if (t?.agencies.some(a => a.id === requestedAgencyId)) current = { tenantId: requestedTenantId, agencyId: requestedAgencyId };
  }
  if (!current && tenants.length) current = { tenantId: tenants[0].id, agencyId: tenants[0].agencies[0]?.id || null };

  return response(200, { success: true, data: { tenants, current } });
}


async function ensureAuthTokenTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_auth_tokens (
      id BIGSERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      purpose TEXT NOT NULL,
      tenant_id UUID NOT NULL,
      agency_id UUID NOT NULL,
      user_id UUID NOT NULL,
      email TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_auth_tokens_lookup_idx
      ON suite_auth_tokens (token_hash, purpose, expires_at)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_auth_tokens_user_idx
      ON suite_auth_tokens (user_id, purpose, created_at DESC)
  `);
}

function tenantMfaPolicy(metadata) {
  const value = String(metadata?.security?.mfaPolicy || 'off');
  return ['off','admins','all_users'].includes(value) ? value : 'off';
}

async function internalIdentityApi(client, event) {
  await ensureAuthTokenTables(client);
  const action = String(event?.action || '');
  const tokenHash = String(event?.tokenHash || '').trim();

  if (action === 'claim_activation_token') {
    if (!tokenHash) throw new Error('tokenHash is required.');
    const q = await client.query(
      `UPDATE suite_auth_tokens
          SET consumed_at = now()
        WHERE token_hash = $1
          AND purpose = 'activation'
          AND consumed_at IS NULL
          AND expires_at > now()
      RETURNING id, tenant_id, agency_id, user_id, email, expires_at`,
      [tokenHash]
    );
    if (!q.rows.length) return { success:false, statusCode:410, error:'This activation link is invalid, expired, or has already been used.' };
    return { success:true, data:q.rows[0] };
  }

  if (action === 'release_activation_token') {
    if (!tokenHash) throw new Error('tokenHash is required.');
    await client.query(
      `UPDATE suite_auth_tokens
          SET consumed_at = NULL
        WHERE token_hash = $1
          AND purpose = 'activation'
          AND consumed_at > now() - interval '5 minutes'`,
      [tokenHash]
    );
    return { success:true };
  }

  if (action === 'complete_activation') {
    if (!tokenHash) throw new Error('tokenHash is required.');
    const token = await client.query(
      `SELECT user_id, tenant_id, agency_id, email
         FROM suite_auth_tokens
        WHERE token_hash = $1
          AND purpose = 'activation'
          AND consumed_at IS NOT NULL
        LIMIT 1`,
      [tokenHash]
    );
    if (!token.rows.length) return { success:false, statusCode:410, error:'Activation token is not valid.' };
    const row = token.rows[0];
    await client.query(`UPDATE suite_users SET status='active' WHERE id=$1`, [row.user_id]);
    await ensurePlatformAdminTables(client);
    await client.query(
      `INSERT INTO suite_platform_events (tenant_id, actor_user_id, actor_name, action)
       VALUES ($1,$2,$3,$4)`,
      [row.tenant_id, row.user_id, row.email, 'Activated SonoMarzi account through a single-use email link']
    );
    return { success:true, data:row };
  }

  return { success:false, statusCode:400, error:'Unsupported internal identity action.' };
}

async function tenantAdminDbApi(client, auth, body) {
  const action = String(body?.action || '');
  const tenantId = body?.tenantId || body?.tenant_id;

  if (!action) return response(400, { success: false, error: 'action is required.' });
  await ensureAgencySubdomainSchema(client);

  // Context discovery is intentionally available to any authenticated active user,
  // but is filtered to that user's own memberships unless they are a Platform Admin.
  if (action === 'list_contexts') {
    return await listPlatformContexts(client, auth, body);
  }

  if (action === 'list_subdomain_origins') {
    const denied = platformOnly(auth); if (denied) return denied;
    const q = await client.query(
      `SELECT lower(subdomain) AS subdomain
         FROM suite_agencies
        WHERE subdomain IS NOT NULL
          AND btrim(subdomain) <> ''
          AND status <> 'suspended'
        ORDER BY lower(subdomain)`
    );
    return response(200, { success: true, data: { subdomains: q.rows.map(r => r.subdomain) } });
  }

  if (action === 'list_platform_admins') {
    const denied = platformOnly(auth); if (denied) return denied;
    await ensurePlatformAdminTables(client);
    const q = await client.query(
      `SELECT u.id AS user_id, u.email, u.display_name AS name, true AS enabled
         FROM suite_platform_admins pa
         JOIN suite_users u ON u.id = pa.user_id
        WHERE pa.enabled = true
          AND u.status <> 'deleted'
        ORDER BY lower(COALESCE(u.display_name,u.email)), lower(u.email)`
    );
    return response(200, { success: true, data: { users: q.rows } });
  }

  if (action === 'search_platform_admin_candidates') {
    const denied = platformOnly(auth); if (denied) return denied;
    await ensurePlatformAdminTables(client);
    const search = String(body?.search || '').trim().toLowerCase();
    const like = `%${search}%`;
    const q = await client.query(
      `SELECT DISTINCT u.id AS user_id, u.email, u.display_name AS name,
              t.id AS tenant_id, t.name AS tenant_name, a.name AS agency_name
         FROM suite_users u
         JOIN suite_memberships m ON m.user_id = u.id AND m.status = 'active'
         JOIN suite_tenants t ON t.id = m.tenant_id AND t.status <> 'suspended'
         JOIN suite_agencies a ON a.id = m.agency_id AND a.tenant_id = m.tenant_id
         LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id AND pa.enabled = true
        WHERE u.status <> 'deleted'
          AND lower(COALESCE(a.subdomain,'')) = 'demo'
          AND pa.user_id IS NULL
          AND ($1 = '' OR lower(COALESCE(u.display_name,'')) LIKE $2 OR lower(u.email) LIKE $2)
        ORDER BY lower(COALESCE(u.display_name,u.email)), lower(u.email)
        LIMIT 25`,
      [search, like]
    );
    return response(200, { success: true, data: { users: q.rows } });
  }

  if (action === 'set_platform_admin') {
    const denied = platformOnly(auth); if (denied) return denied;
    await ensurePlatformAdminTables(client);
    const userId = String(body?.userId || '').trim();
    const enabled = body?.enabled === true;
    if (!userId) return response(400, { success: false, error: 'userId is required.' });
    const exists = await client.query(`SELECT id,email,display_name FROM suite_users WHERE id=$1 AND status <> 'deleted' LIMIT 1`, [userId]);
    if (!exists.rows.length) return response(404, { success:false, error:'User not found.' });

    const internalMembership = await client.query(
      `SELECT m.tenant_id
         FROM suite_memberships m
         JOIN suite_agencies a ON a.id=m.agency_id AND a.tenant_id=m.tenant_id
        WHERE m.user_id=$1
          AND m.status='active'
          AND lower(COALESCE(a.subdomain,''))='demo'
        LIMIT 1`,
      [userId]
    );

    if (enabled && !internalMembership.rows.length) {
      return response(403, { success:false, error:'Platform Admin can only be granted to a user in the internal Demo tenant.' });
    }

    if (!enabled) {
      const count = await client.query(`SELECT count(*)::int AS n FROM suite_platform_admins WHERE enabled=true`);
      const target = await client.query(`SELECT enabled FROM suite_platform_admins WHERE user_id=$1`, [userId]);
      if (target.rows[0]?.enabled === true && count.rows[0].n <= 1) {
        return response(409, { success:false, error:'At least one Platform Admin must remain enabled.' });
      }
    }
    await client.query(
      `INSERT INTO suite_platform_admins (user_id, enabled)
       VALUES ($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET enabled=EXCLUDED.enabled`,
      [userId, enabled]
    );

    const eventTenantId = internalMembership.rows[0]?.tenant_id || null;
    if (eventTenantId) {
      await platformEvent(
        client,
        auth,
        eventTenantId,
        `${enabled ? 'Granted' : 'Revoked'} Platform Admin access ${enabled ? 'to' : 'from'} ${exists.rows[0].display_name || exists.rows[0].email} (${exists.rows[0].email})`
      );
    }

    return response(200, { success:true, data:{ userId, enabled } });
  }

  if (action === 'set_tenant_mfa_policy') {
    const denied = platformOnly(auth); if (denied) return denied;
    const targetTenantId = String(body?.tenantId || '').trim();
    const mfaPolicy = String(body?.mfaPolicy || 'off');
    if (!targetTenantId) return response(400, { success:false, error:'tenantId is required.' });
    if (!['off','admins','all_users'].includes(mfaPolicy)) return response(400, { success:false, error:'Unsupported MFA policy.' });
    const q = await client.query(
      `UPDATE suite_tenants
          SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
            'security', COALESCE(metadata->'security','{}'::jsonb) || jsonb_build_object(
              'mfaPolicy', $2::text,
              'mfaMethod', 'totp'
            )
          )
        WHERE id=$1
      RETURNING id`,
      [targetTenantId, mfaPolicy]
    );
    if (!q.rows.length) return response(404, { success:false, error:'Tenant not found.' });
    await platformEvent(client, auth, targetTenantId, `Changed tenant MFA requirement to ${mfaPolicy}`);
    return response(200, { success:true, data:{ tenantId:targetTenantId, mfaPolicy, mfaMethod:'totp' } });
  }

  // New tenant creation has no tenantId yet, so authorize it separately.
  if (action === 'create_tenant') {
    const denied = platformOnly(auth); if (denied) return denied;
    const tenant = body?.tenant || {};
    const agency = body?.agency || {};
    const enabledModules = Array.isArray(body?.enabledModules) ? [...new Set(body.enabledModules.map(String))] : [];
    const name = String(tenant.name || '').trim();
    const slug = String(tenant.slug || '').trim().toLowerCase();
    const timezone = String(tenant.timezone || 'America/Los_Angeles').trim();
    const plan = String(tenant.plan || 'Enterprise').trim();
    const agencyName = String(agency.name || '').trim();
    const abbreviation = String(agency.abbreviation || '').trim();
    const agencyType = String(agency.type || '').trim();
    const ori = String(agency.ori || '').trim();
    let subdomain;
    try { subdomain = cleanAgencySubdomain(agency.subdomain); } catch (error) { return response(400, { success: false, error: error.message }); }
    if (!subdomain) return response(400, { success: false, error: 'Agency URL is required.' });
    if (!name || !/^[a-z0-9-]{2,80}$/.test(slug) || !agencyName || !abbreviation || !enabledModules.length) {
      return response(400, { success: false, error: 'Tenant name, valid identifier, agency name, abbreviation, and modules are required.' });
    }
    const duplicate = await client.query(`SELECT 1 FROM suite_tenants WHERE lower(slug)=lower($1) LIMIT 1`, [slug]);
    if (duplicate.rows.length) return response(409, { success: false, error: 'That tenant identifier is already in use.' });
    const duplicateSubdomain = await client.query(`SELECT 1 FROM suite_agencies WHERE lower(subdomain)=lower($1) LIMIT 1`, [subdomain]);
    if (duplicateSubdomain.rows.length) return response(409, { success: false, error: 'That agency URL is already in use.' });
    const newTenantId = crypto.randomUUID();
    const newAgencyId = crypto.randomUUID();
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO suite_tenants (id, slug, name, timezone, plan, status, enabled_modules, metadata)
         VALUES ($1,$2,$3,$4,$5,'setup',$6::text[],'{}'::jsonb)`,
        [newTenantId, slug, name, timezone, plan, enabledModules]
      );
      await client.query(
        `INSERT INTO suite_agencies (id, tenant_id, name, abbreviation, agency_type, ori, status, branding, subdomain)
         VALUES ($1,$2,$3,$4,$5,$6,'setup','{}'::jsonb,$7)`,
        [newAgencyId, newTenantId, agencyName, abbreviation, agencyType || 'Municipal Police', ori || null, subdomain]
      );
      const templateState = body?.templateState && typeof body.templateState === 'object' ? body.templateState : {};
      await client.query('SAVEPOINT template_seed');
      try {
        await client.query(
          `INSERT INTO suite_templates (tenant_id, agency_id, empty_state)
           VALUES ($1,$2,$3::jsonb)
           ON CONFLICT (tenant_id, agency_id) DO UPDATE SET empty_state = EXCLUDED.empty_state`,
          [newTenantId, newAgencyId, JSON.stringify(templateState)]
        );
        await client.query('RELEASE SAVEPOINT template_seed');
      } catch (templateError) {
        await client.query('ROLLBACK TO SAVEPOINT template_seed');
        await client.query('RELEASE SAVEPOINT template_seed');
        console.warn('Template seed was not persisted:', templateError.message);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK'); throw error;
    }
    await platformEvent(client, auth, newTenantId, `Created tenant ${name} and agency ${agencyName}`);
    return response(200, { success: true, data: { tenantId: newTenantId, agencyId: newAgencyId } });
  }

  if (!tenantId) return response(400, { success: false, error: 'tenantId is required.' });

  // Platform-control-plane actions are stronger than ordinary tenant user administration.
  if (['add_agency','update_tenant','set_tenant_status','update_agency_subdomain','create_regional_workspace','grant_support','revoke_support'].includes(action)) {
    const denied = platformOnly(auth); if (denied) return denied;
    await ensurePlatformAdminTables(client);
  } else {
    const admin = await requireTenantAdminDb(client, auth, tenantId);
    if (admin.error) return admin.error;
  }

  if (action === 'update_agency_branding') {
    const agencyId = String(body?.agencyId || body?.agency_id || '');
    const branding = body?.branding && typeof body.branding === 'object' ? body.branding : {};
    if (!agencyId) return response(400, { success: false, error: 'agencyId is required.' });
    const cleanBranding = {
      title: String(branding.title || 'SonoMarzi PS Management Suite').slice(0, 160),
      subtitle: String(branding.subtitle || 'Choose a module to begin').slice(0, 240)
    };
    const q = await client.query(
      `UPDATE suite_agencies SET branding=$3::jsonb WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, agencyId, JSON.stringify(cleanBranding)]
    );
    if (!q.rows.length) return response(404, { success: false, error: 'Agency not found.' });
    await platformEvent(client, auth, tenantId, 'Updated agency branding');
    return response(200, { success: true, data: { tenantId, agencyId, branding: cleanBranding } });
  }

  if (action === 'add_agency') {
    const agency = body?.agency || {};
    const agencyName = String(agency.name || '').trim();
    const abbreviation = String(agency.abbreviation || '').trim();
    const agencyType = String(agency.type || '').trim();
    const ori = String(agency.ori || '').trim();
    let subdomain;
    try { subdomain = cleanAgencySubdomain(agency.subdomain); } catch (error) { return response(400, { success: false, error: error.message }); }
    if (!agencyName || !abbreviation || !subdomain) return response(400, { success: false, error: 'Agency name, abbreviation, and agency URL are required.' });
    const exists = await client.query(`SELECT 1 FROM suite_tenants WHERE id=$1 LIMIT 1`, [tenantId]);
    if (!exists.rows.length) return response(404, { success: false, error: 'Tenant not found.' });
    const duplicateSubdomain = await client.query(`SELECT 1 FROM suite_agencies WHERE lower(subdomain)=lower($1) LIMIT 1`, [subdomain]);
    if (duplicateSubdomain.rows.length) return response(409, { success: false, error: 'That agency URL is already in use.' });
    const agencyId = crypto.randomUUID();
    await client.query(
      `INSERT INTO suite_agencies (id, tenant_id, name, abbreviation, agency_type, ori, status, branding, subdomain)
       VALUES ($1,$2,$3,$4,$5,$6,'setup','{}'::jsonb,$7)`,
      [agencyId, tenantId, agencyName, abbreviation, agencyType || 'Municipal Police', ori || null, subdomain]
    );
    const templateState = body?.templateState && typeof body.templateState === 'object' ? body.templateState : {};
    try {
      await client.query(
        `INSERT INTO suite_templates (tenant_id, agency_id, empty_state)
         VALUES ($1,$2,$3::jsonb)
         ON CONFLICT (tenant_id, agency_id) DO UPDATE SET empty_state = EXCLUDED.empty_state`,
        [tenantId, agencyId, JSON.stringify(templateState)]
      );
    } catch (templateError) {
      console.warn('Template seed was not persisted:', templateError.message);
    }
    await platformEvent(client, auth, tenantId, `Added agency ${agencyName}`);
    return response(200, { success: true, data: { tenantId, agencyId } });
  }

  if (action === 'update_agency_subdomain') {
    const agencyId = String(body?.agencyId || body?.agency_id || '');
    let subdomain;
    try { subdomain = cleanAgencySubdomain(body?.subdomain); } catch (error) { return response(400, { success: false, error: error.message }); }
    if (!agencyId || !subdomain) return response(400, { success: false, error: 'Agency and agency URL are required.' });
    const duplicate = await client.query(`SELECT 1 FROM suite_agencies WHERE lower(subdomain)=lower($1) AND id<>$2 LIMIT 1`, [subdomain, agencyId]);
    if (duplicate.rows.length) return response(409, { success: false, error: 'That agency URL is already in use.' });
    const q = await client.query(
      `UPDATE suite_agencies SET subdomain=$3 WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, agencyId, subdomain]
    );
    if (!q.rows.length) return response(404, { success: false, error: 'Agency not found.' });
    await platformEvent(client, auth, tenantId, `Updated agency URL to ${subdomain}.sonomarzi.com`);
    return response(200, { success: true, data: { tenantId, agencyId, subdomain, url: `https://${subdomain}.sonomarzi.com` } });
  }

  if (action === 'update_tenant') {
    const tenant = body?.tenant || {};
    const name = String(tenant.name || '').trim();
    const slug = String(tenant.slug || '').trim().toLowerCase();
    const timezone = String(tenant.timezone || '').trim();
    const plan = String(tenant.plan || '').trim();
    const enabledModules = Array.isArray(body?.enabledModules) ? [...new Set(body.enabledModules.map(String))] : [];
    if (!name || !/^[a-z0-9-]{2,80}$/.test(slug) || !timezone || !plan || !enabledModules.length) return response(400, { success: false, error: 'Tenant name, identifier, time zone, plan, and modules are required.' });
    const q = await client.query(
      `UPDATE suite_tenants SET name=$2, slug=$3, timezone=$4, plan=$5, enabled_modules=$6::text[] WHERE id=$1 RETURNING id`,
      [tenantId, name, slug, timezone, plan, enabledModules]
    );
    if (!q.rows.length) return response(404, { success: false, error: 'Tenant not found.' });
    await platformEvent(client, auth, tenantId, 'Updated tenant profile and module entitlements');
    return response(200, { success: true, data: { tenantId } });
  }

  if (action === 'set_tenant_status') {
    const status = String(body?.status || '');
    if (!['setup','active','suspended'].includes(status)) return response(400, { success: false, error: 'Unsupported tenant status.' });
    const q = await client.query(`UPDATE suite_tenants SET status=$2 WHERE id=$1 RETURNING id`, [tenantId, status]);
    if (!q.rows.length) return response(404, { success: false, error: 'Tenant not found.' });
    await platformEvent(client, auth, tenantId, status === 'active' ? 'Reactivated tenant' : status === 'suspended' ? 'Suspended tenant' : 'Moved tenant to setup');
    return response(200, { success: true, data: { tenantId, status } });
  }

  if (action === 'create_regional_workspace') {
    const name = String(body?.name || '').trim();
    const agencyIds = Array.isArray(body?.agencyIds) ? [...new Set(body.agencyIds.map(String))] : [];
    const modules = Array.isArray(body?.modules) ? [...new Set(body.modules.map(String))] : [];
    if (!name || agencyIds.length < 2 || !modules.length) return response(400, { success: false, error: 'Name, at least two agencies, and at least one module are required.' });
    const valid = await client.query(`SELECT id FROM suite_agencies WHERE tenant_id=$1 AND id=ANY($2::uuid[])`, [tenantId, agencyIds]);
    if (valid.rows.length !== agencyIds.length) return response(400, { success: false, error: 'One or more agencies do not belong to this tenant.' });
    const id = `rw_${crypto.randomUUID().replaceAll('-','')}`;
    await client.query(
      `INSERT INTO suite_regional_workspaces (id, tenant_id, name, agency_ids, modules, created_by) VALUES ($1,$2,$3,$4::uuid[],$5::text[],$6)`,
      [id, tenantId, name, agencyIds, modules, auth.userId]
    );
    await platformEvent(client, auth, tenantId, `Authorized regional workspace ${name}`);
    return response(200, { success: true, data: { workspace: { id, name, agencyIds, modules } } });
  }

  if (action === 'grant_support') {
    const supportUserId = String(body?.supportUserId || '');
    const reason = String(body?.reason || '').trim();
    const hours = Math.max(1, Math.min(24, Number(body?.hours || 1)));
    const scope = Array.isArray(body?.scope) ? [...new Set(body.scope.map(String))] : [];
    if (!/^[0-9a-f-]{36}$/i.test(supportUserId) || reason.length < 10 || !scope.length) return response(400, { success: false, error: 'Valid support user, business reason, and scope are required.' });
    const target = await client.query(`SELECT 1 FROM suite_users WHERE id=$1 AND status='active' LIMIT 1`, [supportUserId]);
    if (!target.rows.length) return response(404, { success: false, error: 'Support user not found or inactive.' });
    const id = `support_${crypto.randomUUID().replaceAll('-','')}`;
    const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    await client.query(
      `INSERT INTO suite_support_sessions (id, tenant_id, support_user_id, reason, scope, expires_at, created_by) VALUES ($1,$2,$3,$4,$5::text[],$6,$7)`,
      [id, tenantId, supportUserId, reason, scope, expiresAt, auth.userId]
    );
    await platformEvent(client, auth, tenantId, `Granted temporary support access: ${reason}`);
    return response(200, { success: true, data: { supportSession: { id, supportUserId, reason, scope, expiresAt, revokedAt: null } } });
  }

  if (action === 'revoke_support') {
    const sessionId = String(body?.sessionId || '');
    const q = await client.query(
      `UPDATE suite_support_sessions SET revoked_at=now() WHERE id=$1 AND tenant_id=$2 AND revoked_at IS NULL RETURNING id`,
      [sessionId, tenantId]
    );
    if (!q.rows.length) return response(404, { success: false, error: 'Active support session not found.' });
    await platformEvent(client, auth, tenantId, 'Revoked temporary support access');
    return response(200, { success: true, data: { sessionId } });
  }

  if (action === "authorize_identity_action") {
    return response(200, { success: true, data: { authorized: true } });
  }

  if (action === "list_users") {
    const q = await client.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.display_name AS name,
         u.status AS user_status,
         u.cognito_sub,
         u.created_at,
         m.agency_id,
         m.person_id,
         m.role_ids,
         m.status AS membership_status,
         COALESCE(pa.enabled, false) AS is_platform_admin
       FROM suite_memberships m
       JOIN suite_users u ON u.id = m.user_id
       LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id
      WHERE m.tenant_id = $1
        AND m.status = 'active'
      ORDER BY lower(u.display_name), lower(u.email), m.agency_id`,
      [tenantId]
    );

    return response(200, {
      success: true,
      data: {
        users: q.rows.map(row => ({
          user_id: row.user_id,
          email: row.email,
          name: row.name || row.email,
          agency_id: row.agency_id,
          person_id: row.person_id,
          role_ids: Array.isArray(row.role_ids) ? row.role_ids : [],
          confirmedAt: row.user_status === "active" ? row.created_at : null,
          mustChangePassword: row.user_status === "invited",
          lastSignInAt: null,
          isPlatformAdmin: row.is_platform_admin === true
        })),
        invitations: []
      }
    });
  }

  if (action === "finalize_invite") {
    const agencyId = body?.agencyId;
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const cognitoSub = String(body?.cognitoSub || "").trim();
    const roleIds = Array.isArray(body?.roleIds)
      ? [...new Set(body.roleIds.map(String))]
      : [];
    const needsActivation = body?.needsActivation === true;
    const activationTokenHash = String(body?.activationTokenHash || '').trim();
    const activationExpiresAt = body?.activationExpiresAt || null;

    if (!agencyId || !name || !email || !cognitoSub || !roleIds.length) {
      return response(400, {
        success: false,
        error: "Agency, name, email, Cognito identity, and roles are required."
      });
    }
    if (needsActivation && (!activationTokenHash || !activationExpiresAt)) {
      return response(400, { success:false, error:'Activation token and expiration are required for a new account.' });
    }
    if (roleIds.includes("role_platform_admin")) {
      return response(403, {
        success: false,
        error: "Platform Admin access cannot be granted here."
      });
    }

    const agencyInfo = await client.query(
      `SELECT a.id, a.name AS agency_name, a.subdomain, t.name AS tenant_name
         FROM suite_agencies a JOIN suite_tenants t ON t.id=a.tenant_id
        WHERE a.tenant_id=$1 AND a.id=$2 LIMIT 1`,
      [tenantId, agencyId]
    );
    if (!agencyInfo.rows.length) return response(404,{success:false,error:'Agency not found.'});

    let user = await client.query(
      `SELECT id, cognito_sub, status
         FROM suite_users
        WHERE lower(email) = $1
        LIMIT 1`,
      [email]
    );

    let userId;
    const desiredStatus = needsActivation ? 'invited' : 'active';
    if (user.rows.length) {
      userId = user.rows[0].id;
      if (user.rows[0].cognito_sub && user.rows[0].cognito_sub !== cognitoSub) {
        return response(409, {
          success: false,
          error: "That email is already linked to a different authentication identity."
        });
      }
      await client.query(
        `UPDATE suite_users
            SET cognito_sub = $2,
                display_name = $3,
                email = $4,
                status = CASE WHEN status='active' AND $5='invited' THEN status ELSE $5 END
          WHERE id = $1`,
        [userId, cognitoSub, name, email, desiredStatus]
      );
    } else {
      const created = await client.query(
        `INSERT INTO suite_users
          (email, display_name, cognito_sub, status)
         VALUES ($1,$2,$3,$4)
         RETURNING id`,
        [email, name, cognitoSub, desiredStatus]
      );
      userId = created.rows[0].id;
    }

    const membership = await client.query(
      `SELECT person_id
         FROM suite_memberships
        WHERE tenant_id = $1 AND agency_id = $2 AND user_id = $3
        LIMIT 1`,
      [tenantId, agencyId, userId]
    );

    let personId;
    if (membership.rows.length) {
      personId = membership.rows[0].person_id;
      await client.query(
        `UPDATE suite_memberships
            SET role_ids = $4::text[],
                status = 'active'
          WHERE tenant_id = $1 AND agency_id = $2 AND user_id = $3`,
        [tenantId, agencyId, userId, roleIds]
      );
    } else {
      personId = `person_${crypto.randomUUID().replaceAll("-", "")}`;
      await client.query(
        `INSERT INTO suite_memberships
          (user_id, tenant_id, agency_id, person_id, role_ids, status)
         VALUES ($1,$2,$3,$4,$5::text[],'active')`,
        [userId, tenantId, agencyId, personId, roleIds]
      );
    }

    if (needsActivation) {
      await ensureAuthTokenTables(client);
      await client.query(
        `UPDATE suite_auth_tokens SET consumed_at=COALESCE(consumed_at,now())
          WHERE user_id=$1 AND purpose='activation' AND consumed_at IS NULL`,
        [userId]
      );
      await client.query(
        `INSERT INTO suite_auth_tokens
          (token_hash,purpose,tenant_id,agency_id,user_id,email,expires_at,created_by,metadata)
         VALUES ($1,'activation',$2,$3,$4,$5,$6::timestamptz,$7,$8::jsonb)`,
        [activationTokenHash,tenantId,agencyId,userId,email,activationExpiresAt,auth.userId,JSON.stringify({source:'email_invite'})]
      );
    }

    const userAction = `${needsActivation ? 'Invited' : 'Added'} user ${name} (${email}) to ${agencyInfo.rows[0].agency_name}`;
    await platformEvent(client, auth, tenantId, userAction);
    await appendAuditEvent(client, auth, {
      tenantId,
      agencyId,
      module: 'User Administration',
      entityType: 'user_account',
      description: userAction
    });

    return response(200, {
      success: true,
      data: {
        userId, personId, needsActivation,
        tenantName: agencyInfo.rows[0].tenant_name,
        agencyName: agencyInfo.rows[0].agency_name,
        subdomain: agencyInfo.rows[0].subdomain || ''
      }
    });
  }

  if (action === "issue_activation_token") {
    const userId = String(body?.userId || '').trim();
    const agencyId = String(body?.agencyId || '').trim();
    const tokenHash = String(body?.activationTokenHash || '').trim();
    const expiresAt = body?.activationExpiresAt || null;
    if (!userId || !agencyId || !tokenHash || !expiresAt) return response(400,{success:false,error:'User, agency, token, and expiration are required.'});
    const target = await client.query(
      `SELECT u.email,u.display_name,a.name AS agency_name,a.subdomain,t.name AS tenant_name
         FROM suite_users u
         JOIN suite_memberships m ON m.user_id=u.id AND m.tenant_id=$2 AND m.agency_id=$3 AND m.status='active'
         JOIN suite_agencies a ON a.id=m.agency_id AND a.tenant_id=m.tenant_id
         JOIN suite_tenants t ON t.id=m.tenant_id
        WHERE u.id=$1 LIMIT 1`,
      [userId,tenantId,agencyId]
    );
    if (!target.rows.length) return response(404,{success:false,error:'User membership not found.'});
    await ensureAuthTokenTables(client);
    await client.query(`UPDATE suite_auth_tokens SET consumed_at=COALESCE(consumed_at,now()) WHERE user_id=$1 AND purpose='activation' AND consumed_at IS NULL`,[userId]);
    await client.query(
      `INSERT INTO suite_auth_tokens (token_hash,purpose,tenant_id,agency_id,user_id,email,expires_at,created_by,metadata)
       VALUES ($1,'activation',$2,$3,$4,$5,$6::timestamptz,$7,$8::jsonb)`,
      [tokenHash,tenantId,agencyId,userId,target.rows[0].email,expiresAt,auth.userId,JSON.stringify({source:'resend'})]
    );
    await client.query(`UPDATE suite_users SET status='invited' WHERE id=$1 AND status<>'deleted'`,[userId]);
    return response(200,{success:true,data:{userId,email:target.rows[0].email,name:target.rows[0].display_name||target.rows[0].email,tenantName:target.rows[0].tenant_name,agencyName:target.rows[0].agency_name,subdomain:target.rows[0].subdomain||''}});
  }

  if (action === "identity_target") {
    const userId = body?.userId;
    const requestedAgencyId = body?.agencyId || body?.agency_id || null;
    const q = await client.query(
      `SELECT u.id, u.email, u.display_name, u.status AS user_status,
              COALESCE(pa.enabled, false) AS platform_admin,
              m.agency_id, a.name AS agency_name, a.subdomain, t.name AS tenant_name
         FROM suite_users u
         LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id
         JOIN suite_memberships m ON m.user_id=u.id AND m.tenant_id=$2 AND m.status='active'
         JOIN suite_agencies a ON a.id=m.agency_id AND a.tenant_id=m.tenant_id
         JOIN suite_tenants t ON t.id=m.tenant_id
        WHERE u.id = $1
          AND ($3::uuid IS NULL OR m.agency_id=$3::uuid)
        ORDER BY CASE WHEN $3::uuid IS NOT NULL AND m.agency_id=$3::uuid THEN 0 ELSE 1 END
        LIMIT 1`,
      [userId, tenantId, requestedAgencyId]
    );

    if (!q.rows.length) {
      return response(404, { success: false, error: "User not found." });
    }
    if (q.rows[0].platform_admin === true) {
      return response(403, {
        success: false,
        error: "Platform Admins require the protected platform process."
      });
    }

    return response(200, {
      success: true,
      data: {
        userId: q.rows[0].id,
        email: q.rows[0].email,
        name: q.rows[0].display_name,
        userStatus: q.rows[0].user_status,
        agencyId: q.rows[0].agency_id,
        agencyName: q.rows[0].agency_name,
        tenantName: q.rows[0].tenant_name,
        subdomain: q.rows[0].subdomain || ''
      }
    });
  }

  if (action === "update_user_profile_db") {
    const userId = body?.userId;
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    const q = await client.query(
      `UPDATE suite_users
          SET email = $3,
              display_name = $4
        WHERE id = $1
          AND EXISTS (
            SELECT 1 FROM suite_memberships m
             WHERE m.user_id = suite_users.id
               AND m.tenant_id = $2
               AND m.status = 'active'
          )
      RETURNING id`,
      [userId, tenantId, email, name]
    );

    if (!q.rows.length) {
      return response(404, { success: false, error: "User not found." });
    }

    return response(200, { success: true, data: { userId } });
  }

  if (action === "update_roles") {
    const agencyId = body?.agencyId;
    const userId = body?.userId;
    const personId = body?.personId;
    const roleIds = Array.isArray(body?.roleIds)
      ? [...new Set(body.roleIds.map(String))]
      : [];

    if (!agencyId || (!userId && !personId) || !roleIds.length) {
      return response(400, {
        success: false,
        error: "Agency, user or person, and at least one role are required."
      });
    }

    if (roleIds.includes("role_platform_admin")) {
      return response(403, {
        success: false,
        error: "Platform Admin access cannot be granted through agency role assignment."
      });
    }

    const q = await client.query(
      `UPDATE suite_memberships
          SET role_ids = $5::text[]
        WHERE tenant_id = $1
          AND agency_id = $2
          AND status = 'active'
          AND (
            ($3::uuid IS NOT NULL AND user_id = $3::uuid)
            OR ($4::text IS NOT NULL AND person_id = $4::text)
          )
      RETURNING user_id, person_id`,
      [tenantId, agencyId, userId || null, personId || null, roleIds]
    );

    if (!q.rows.length) {
      return response(404, { success: false, error: "Membership not found." });
    }

    return response(200, {
      success: true,
      data: { userId: q.rows[0].user_id, personId: q.rows[0].person_id }
    });
  }

  if (action === "mark_user_invited") {
    const userId = body?.userId;
    const q = await client.query(
      `UPDATE suite_users
          SET status = 'invited'
        WHERE id = $1
          AND EXISTS (
            SELECT 1 FROM suite_memberships m
             WHERE m.user_id = suite_users.id
               AND m.tenant_id = $2
          )
      RETURNING id`,
      [userId, tenantId]
    );
    if (!q.rows.length) {
      return response(404, { success: false, error: "User not found." });
    }
    return response(200, { success: true, data: { userId } });
  }

  if (action === "bulk_reset_candidates") {
    const q = await client.query(
      `SELECT DISTINCT u.id AS user_id, u.email
         FROM suite_users u
         JOIN suite_memberships m ON m.user_id = u.id
         LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id
        WHERE m.tenant_id = $1
          AND m.status = 'active'
          AND u.status <> 'inactive'
          AND COALESCE(pa.enabled, false) = false
        ORDER BY lower(u.email)`,
      [tenantId]
    );
    return response(200, { success: true, data: { users: q.rows } });
  }

  if (action === "mark_bulk_invited") {
    const userIds = Array.isArray(body?.userIds)
      ? [...new Set(body.userIds.map(String))]
      : [];

    if (!userIds.length) {
      return response(200, { success: true, data: { updated: 0 } });
    }

    const q = await client.query(
      `UPDATE suite_users
          SET status = 'invited'
        WHERE id = ANY($1::uuid[])
          AND EXISTS (
            SELECT 1 FROM suite_memberships m
             WHERE m.user_id = suite_users.id
               AND m.tenant_id = $2
          )
      RETURNING id`,
      [userIds, tenantId]
    );

    return response(200, {
      success: true,
      data: { updated: q.rows.length }
    });
  }

  if (action === "delete_user_db") {
    const agencyId = body?.agencyId;
    const userId = body?.userId;

    const target = await client.query(
      `SELECT u.email, COALESCE(pa.enabled, false) AS platform_admin
         FROM suite_users u
         LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id
        WHERE u.id = $1
        LIMIT 1`,
      [userId]
    );

    if (!target.rows.length) {
      return response(404, { success: false, error: "User not found." });
    }
    if (target.rows[0].platform_admin === true) {
      return response(403, {
        success: false,
        error: "Platform Admin access must be removed through the protected platform process."
      });
    }

    const removed = await client.query(
      `UPDATE suite_memberships
          SET status = 'inactive'
        WHERE tenant_id = $1
          AND agency_id = $2
          AND user_id = $3
          AND status = 'active'
      RETURNING user_id`,
      [tenantId, agencyId, userId]
    );

    if (!removed.rows.length) {
      return response(404, {
        success: false,
        error: "Agency membership not found."
      });
    }

    const remaining = await client.query(
      `SELECT COUNT(*)::int AS count
         FROM suite_memberships
        WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const disableAuth = Number(remaining.rows[0]?.count || 0) === 0;
    if (disableAuth) {
      await client.query(
        `UPDATE suite_users SET status = 'inactive' WHERE id = $1`,
        [userId]
      );
    }

    return response(200, {
      success: true,
      data: {
        disableAuth,
        email: target.rows[0].email
      }
    });
  }

  return response(400, {
    success: false,
    error: "Unsupported user administration action."
  });
}

export { internalIdentityApi, tenantAdminDbApi };
