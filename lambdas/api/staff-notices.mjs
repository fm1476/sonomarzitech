import {
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility
} from "./core.mjs";

function staffNoticeId() {
  return `notice_${crypto.randomUUID()}`;
}

/*
 * ---------------------------------------------------------
 * AWS STAFF NOTICES
 * ---------------------------------------------------------
 * In-app staff notices are stored in PostgreSQL and isolated by
 * tenant + agency. Browser push is intentionally separate from
 * notice persistence so delivery-channel failures never lose a notice.
 */
async function ensureStaffNoticeTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_staff_notices (
      id text PRIMARY KEY,
      tenant_id uuid NOT NULL,
      agency_id uuid NOT NULL,
      body text NOT NULL,
      created_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      client_id text NOT NULL,
      recipient_count integer NOT NULL DEFAULT 0,
      UNIQUE (tenant_id, agency_id, client_id)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_staff_notice_recipients (
      notice_id text NOT NULL REFERENCES suite_staff_notices(id) ON DELETE CASCADE,
      user_id uuid NOT NULL,
      person_id text,
      read_at timestamptz,
      response text,
      cleared_at timestamptz,
      push_status text NOT NULL DEFAULT 'not_configured',
      PRIMARY KEY (notice_id, user_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_staff_notice_recipient_user_idx
      ON suite_staff_notice_recipients(user_id, cleared_at)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS suite_staff_notice_workspace_idx
      ON suite_staff_notices(tenant_id, agency_id, created_at DESC)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS suite_notification_reads (
      tenant_id uuid NOT NULL,
      agency_id uuid NOT NULL,
      user_id uuid NOT NULL,
      module text NOT NULL,
      notification_id text NOT NULL,
      read_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, agency_id, user_id, module, notification_id)
    )
  `);
}

async function staffNoticeContext(client, auth, tenantId, agencyId) {
  const workspaceAuth = await resolveWorkspaceMembership(
    client,
    auth,
    tenantId,
    agencyId
  );
  if (workspaceAuth.error) return workspaceAuth;

  const abilityMap = workspaceAuth.admin
    ? new Map()
    : await loadRoleAbilityMap(
        client,
        tenantId,
        agencyId,
        workspaceAuth.roleIds
      );

  return {
    ...workspaceAuth,
    canSend:
      workspaceAuth.admin ||
      roleHasAbility(abilityMap, workspaceAuth.roleIds, "staff_notify_send")
  };
}

function staffNoticeIso(value) {
  return value ? new Date(value).toISOString() : null;
}

async function staffNoticesApi(client, auth, body) {
  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const action = String(body?.action || "");
  const payload =
    body?.payload && typeof body.payload === "object" ? body.payload : {};

  if (!tenantId || !agencyId || !action) {
    return response(400, {
      success: false,
      error: "tenant_id, agency_id, and action are required."
    });
  }

  const ctx = await staffNoticeContext(
    client,
    auth,
    tenantId,
    agencyId
  );
  if (ctx.error) return ctx.error;

  await ensureStaffNoticeTables(client);

  if (action === "notification_reads_list") {
    const q = await client.query(
      `SELECT module, notification_id
         FROM suite_notification_reads
        WHERE tenant_id=$1 AND agency_id=$2 AND user_id=$3`,
      [tenantId, agencyId, auth.userId]
    );
    return response(200, {success:true, data:q.rows});
  }

  if (action === "notification_reads_mark") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const cleaned = items
      .map(item => ({
        module: String(item?.module || "").trim().slice(0,80),
        notification_id: String(item?.id || item?.notification_id || "").trim().slice(0,255)
      }))
      .filter(item => item.module && item.notification_id)
      .slice(0,500);
    if (!cleaned.length) return response(200,{success:true,data:{saved:0}});
    for (const item of cleaned) {
      await client.query(
        `INSERT INTO suite_notification_reads
          (tenant_id, agency_id, user_id, module, notification_id, read_at)
         VALUES ($1,$2,$3,$4,$5,now())
         ON CONFLICT (tenant_id, agency_id, user_id, module, notification_id)
         DO UPDATE SET read_at=EXCLUDED.read_at`,
        [tenantId, agencyId, auth.userId, item.module, item.notification_id]
      );
    }
    return response(200,{success:true,data:{saved:cleaned.length}});
  }

  if (action === "inbox") {
    const q = await client.query(
      `SELECT n.id, n.body, n.created_at,
              r.read_at, r.response, r.push_status
         FROM suite_staff_notice_recipients r
         JOIN suite_staff_notices n ON n.id = r.notice_id
        WHERE n.tenant_id = $1
          AND n.agency_id = $2
          AND (r.user_id = $3 OR r.person_id = $4)
          AND r.cleared_at IS NULL
        ORDER BY n.created_at DESC
        LIMIT 250`,
      [tenantId, agencyId, auth.userId, ctx.personId]
    );

    return response(200, {
      success: true,
      data: q.rows.map(row => ({
        ...row,
        created_at: staffNoticeIso(row.created_at),
        read_at: staffNoticeIso(row.read_at)
      }))
    });
  }

  if (action === "respond") {
    const noticeId = String(payload.noticeId || "");
    const value = String(payload.value || "");
    const allowed = new Set(["read", "acknowledged", "interested", "declined"]);
    if (!noticeId || !allowed.has(value)) {
      return response(400, { success: false, error: "Invalid notice response." });
    }

    const result = await client.query(
      `UPDATE suite_staff_notice_recipients r
          SET read_at = COALESCE(r.read_at, now()),
              response = CASE WHEN $4 = 'read' THEN r.response ELSE $4 END
         FROM suite_staff_notices n
        WHERE r.notice_id = n.id
          AND n.id = $1
          AND n.tenant_id = $2
          AND n.agency_id = $3
          AND (r.user_id = $5 OR r.person_id = $6)
      RETURNING r.read_at, r.response`,
      [noticeId, tenantId, agencyId, value, auth.userId, ctx.personId]
    );

    if (!result.rows.length) {
      return response(404, { success: false, error: "Notice not found." });
    }

    return response(200, {
      success: true,
      data: {
        read_at: staffNoticeIso(result.rows[0].read_at),
        response: result.rows[0].response
      }
    });
  }

  if (action === "clear") {
    const noticeId = String(payload.noticeId || "");
    const result = await client.query(
      `UPDATE suite_staff_notice_recipients r
          SET cleared_at = now(),
              read_at = COALESCE(r.read_at, now())
         FROM suite_staff_notices n
        WHERE r.notice_id = n.id
          AND n.id = $1
          AND n.tenant_id = $2
          AND n.agency_id = $3
          AND (r.user_id = $4 OR r.person_id = $5)
      RETURNING r.notice_id`,
      [noticeId, tenantId, agencyId, auth.userId, ctx.personId]
    );

    if (!result.rows.length) {
      return response(404, { success: false, error: "Notice not found." });
    }
    return response(200, { success: true, data: { id: noticeId } });
  }

  if (action === "create") {
    if (!ctx.canSend) {
      return response(403, {
        success: false,
        error: "Staff notice sending permission required."
      });
    }

    const message = String(payload.body || "").trim();
    const clientId = String(payload.clientId || "").trim();
    const requested = (Array.isArray(payload.recipients) ? payload.recipients : [])
      .map(item => ({
        personId: String(item?.personId || "").trim(),
        email: String(item?.email || "").trim().toLowerCase(),
        name: String(item?.name || "").trim()
      }))
      .filter(item => item.personId || item.email || item.name);

    if (!message || message.length > 1000 || !clientId) {
      return response(400, {
        success: false,
        error: "A message and request ID are required."
      });
    }

    if (!requested.length || requested.length > 1000) {
      return response(400, {
        success: false,
        error: "Choose between 1 and 1000 recipients."
      });
    }

    const duplicate = await client.query(
      `SELECT id, recipient_count
         FROM suite_staff_notices
        WHERE tenant_id = $1 AND agency_id = $2 AND client_id = $3
        LIMIT 1`,
      [tenantId, agencyId, clientId]
    );

    if (duplicate.rows.length) {
      return response(200, {
        success: true,
        data: {
          id: duplicate.rows[0].id,
          recipients: duplicate.rows[0].recipient_count,
          duplicate: true
        }
      });
    }

    const membershipRows = await client.query(
      `SELECT m.user_id, m.person_id, u.email, u.display_name
         FROM suite_memberships m
         JOIN suite_users u ON u.id = m.user_id
        WHERE m.tenant_id = $1
          AND m.agency_id = $2
          AND m.status = 'active'
          AND u.status IN ('active','invited')`,
      [tenantId, agencyId]
    );

    const normalizedName = value =>
      String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

    const resolved = [];
    const unresolved = [];
    const usedUsers = new Set();

    for (const req of requested) {
      let match = null;

      // The signed-in user gets an authoritative self-match first. This avoids
      // old/demo person IDs causing a notice addressed to "Fred Marziano" to
      // miss Fred's Cognito-linked account.
      if (
        (req.personId && req.personId === ctx.personId) ||
        (req.email && req.email === String(auth.email || "").toLowerCase()) ||
        (req.name &&
          normalizedName(req.name) === normalizedName(auth.displayName))
      ) {
        match = {
          user_id: auth.userId,
          person_id: ctx.personId,
          email: auth.email,
          display_name: auth.displayName
        };
      }

      if (!match && req.personId) {
        match = membershipRows.rows.find(row => row.person_id === req.personId) || null;
      }

      if (!match && req.email) {
        const emailMatches = membershipRows.rows.filter(
          row => String(row.email || "").toLowerCase() === req.email
        );
        if (emailMatches.length === 1) match = emailMatches[0];
      }

      if (!match && req.name) {
        const nameMatches = membershipRows.rows.filter(
          row => normalizedName(row.display_name) === normalizedName(req.name)
        );
        if (nameMatches.length === 1) match = nameMatches[0];
      }

      if (!match) {
        unresolved.push(req.name || req.email || req.personId || "Unknown recipient");
        continue;
      }

      if (!usedUsers.has(match.user_id)) {
        usedUsers.add(match.user_id);
        resolved.push({
          user_id: match.user_id,
          person_id: match.person_id
        });
      }
    }

    if (!resolved.length) {
      return response(422, {
        success: false,
        error:
          "None of the selected staff could be matched to an active SonoMarzi account.",
        unmatched: unresolved
      });
    }

    const id = staffNoticeId();

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO suite_staff_notices
          (id, tenant_id, agency_id, body, created_by, client_id, recipient_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          tenantId,
          agencyId,
          message,
          auth.userId,
          clientId,
          resolved.length
        ]
      );

      for (const member of resolved) {
        await client.query(
          `INSERT INTO suite_staff_notice_recipients
            (notice_id, user_id, person_id)
           VALUES ($1,$2,$3)`,
          [id, member.user_id, member.person_id]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    return response(200, {
      success: true,
      data: {
        id,
        recipients: resolved.length,
        unmatched: unresolved
      }
    });
  }

  if (action === "history") {
    if (!ctx.canSend) {
      return response(403, {
        success: false,
        error: "Staff notice history permission required."
      });
    }

    const q = await client.query(
      `SELECT n.id, n.body, n.created_at, n.recipient_count AS recipients,
              COUNT(r.user_id) FILTER (WHERE r.read_at IS NOT NULL) AS read_count,
              COUNT(r.user_id) FILTER (WHERE r.response = 'interested') AS interested,
              COUNT(r.user_id) FILTER (WHERE r.response = 'declined') AS declined,
              COUNT(r.user_id) FILTER (WHERE r.push_status = 'submitted') AS pushed
         FROM suite_staff_notices n
         LEFT JOIN suite_staff_notice_recipients r ON r.notice_id = n.id
        WHERE n.tenant_id = $1 AND n.agency_id = $2
        GROUP BY n.id
        ORDER BY n.created_at DESC
        LIMIT 100`,
      [tenantId, agencyId]
    );

    return response(200, {
      success: true,
      data: q.rows.map(row => ({
        ...row,
        created_at: staffNoticeIso(row.created_at),
        recipients: Number(row.recipients || 0),
        read_count: Number(row.read_count || 0),
        interested: Number(row.interested || 0),
        declined: Number(row.declined || 0),
        pushed: Number(row.pushed || 0)
      }))
    });
  }

  if (action === "responses") {
    if (!ctx.canSend) {
      return response(403, {
        success: false,
        error: "Staff notice response history permission required."
      });
    }

    const noticeId = String(payload.noticeId || "");
    const q = await client.query(
      `SELECT r.person_id, r.read_at, r.response, r.push_status,
              COALESCE(u.email, r.person_id, 'Staff member') AS name
         FROM suite_staff_notice_recipients r
         JOIN suite_staff_notices n ON n.id = r.notice_id
         LEFT JOIN suite_users u ON u.id = r.user_id
        WHERE n.id = $1
          AND n.tenant_id = $2
          AND n.agency_id = $3
        ORDER BY name`,
      [noticeId, tenantId, agencyId]
    );

    return response(200, {
      success: true,
      data: q.rows.map(row => ({
        ...row,
        read_at: staffNoticeIso(row.read_at)
      }))
    });
  }

  return response(400, {
    success: false,
    error: "Unsupported Staff Notices action."
  });
}

export { ensureStaffNoticeTables, staffNoticesApi };
