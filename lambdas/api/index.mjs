import pg from "pg";

import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

import {
  getSignedUrl
} from "@aws-sdk/s3-request-presigner";

const { Client } = pg;

const DEMO_TENANT_ID =
  "f15865be-cf46-41e0-9d60-7cd753437501";

const DEMO_AGENCY_ID =
  "64624bcc-232d-4af5-bae6-a8e621cde447";

const secrets = new SecretsManagerClient({
  region: process.env.AWS_REGION
});

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const ATTACHMENTS_BUCKET =
  process.env.ATTACHMENTS_BUCKET || "";

async function getDbCredentials() {
  const result = await secrets.send(
    new GetSecretValueCommand({
      SecretId: process.env.DB_SECRET_ARN
    })
  );

  return JSON.parse(result.SecretString);
}


function parseBody(event) {
  if (!event?.body) return {};

  if (typeof event.body === "object") {
    return event.body;
  }

  let raw = event.body;

  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

async function connectDatabase() {
  const credentials = await getDbCredentials();

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: credentials.username,
    password: credentials.password,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();

  return client;
}

/*
 * ---------------------------------------------------------
 * AUTHORIZATION
 * ---------------------------------------------------------
 */

async function authenticatePlatformAdmin(client, event) {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims || {};

  const cognitoSub = claims.sub;

  if (!cognitoSub) {
    return {
      error: response(401, {
        success: false,
        error: "Authenticated Cognito identity required."
      })
    };
  }

  const result = await client.query(
    `
    SELECT
      u.id AS user_id,
      u.email,
      u.status,
      COALESCE(pa.enabled, false) AS platform_admin
    FROM suite_users u
    LEFT JOIN suite_platform_admins pa
      ON pa.user_id = u.id
    WHERE u.cognito_sub = $1
    LIMIT 1
    `,
    [cognitoSub]
  );

  if (!result.rows.length) {
    return {
      error: response(403, {
        success: false,
        error:
          "Authenticated user is not linked to a SonoMarzi user."
      })
    };
  }

  const user = result.rows[0];

  if (user.status !== "active") {
    return {
      error: response(403, {
        success: false,
        error: "SonoMarzi user is not active."
      })
    };
  }

  if (user.platform_admin !== true) {
    return {
      error: response(403, {
        success: false,
        error: "Platform administrator access required."
      })
    };
  }

  return {
    userId: user.user_id,
    email: user.email,
    platformAdmin: true
  };
}

/*
 * ---------------------------------------------------------
 * DEMO PD RECORD MIGRATION
 * ---------------------------------------------------------
 */

async function importRecords(client, actorId, body) {
  const records = body?.records;

  if (!Array.isArray(records) || records.length === 0) {
    return response(400, {
      success: false,
      error: "A non-empty records array is required."
    });
  }

  if (records.length > 50) {
    return response(400, {
      success: false,
      error: "Maximum batch size is 50 records."
    });
  }

  let inserted = 0;
  let updated = 0;

  await client.query("BEGIN");

  try {
    for (const record of records) {
      const version = Number(record?.version);

      if (
        typeof record?.key !== "string" ||
        !record.key.length ||
        !Number.isSafeInteger(version) ||
        version < 1 ||
        typeof record.deleted !== "boolean"
      ) {
        throw new Error("Invalid migration record.");
      }

      const existing = await client.query(
        `
        SELECT key
        FROM suite_records
        WHERE tenant_id = $1
          AND agency_id = $2
          AND key = $3
        FOR UPDATE
        `,
        [
          DEMO_TENANT_ID,
          DEMO_AGENCY_ID,
          record.key
        ]
      );

      if (!existing.rows.length) {
        await client.query(
          `
          INSERT INTO suite_records (
            tenant_id,
            agency_id,
            key,
            value,
            version,
            deleted,
            updated_at,
            updated_by
          )
          VALUES (
            $1,
            $2,
            $3,
            $4::jsonb,
            $5,
            $6,
            COALESCE($7::timestamptz, now()),
            $8
          )
          `,
          [
            DEMO_TENANT_ID,
            DEMO_AGENCY_ID,
            record.key,
            JSON.stringify(record.value ?? null),
            version,
            record.deleted,
            record.updated_at || null,
            actorId
          ]
        );

        inserted++;
      } else {
        await client.query(
          `
          UPDATE suite_records
          SET
            value = $4::jsonb,
            version = $5,
            deleted = $6,
            updated_at = COALESCE(
              $7::timestamptz,
              updated_at
            ),
            updated_by = $8
          WHERE tenant_id = $1
            AND agency_id = $2
            AND key = $3
          `,
          [
            DEMO_TENANT_ID,
            DEMO_AGENCY_ID,
            record.key,
            JSON.stringify(record.value ?? null),
            version,
            record.deleted,
            record.updated_at || null,
            actorId
          ]
        );

        updated++;
      }
    }

    const countResult = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    await client.query("COMMIT");

    return response(200, {
      success: true,
      tenantId: DEMO_TENANT_ID,
      agencyId: DEMO_AGENCY_ID,
      received: records.length,
      inserted,
      updated,
      awsRecordCount: countResult.rows[0].count
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/*
 * ---------------------------------------------------------
 * DEMO PD TEMPLATE MIGRATION
 * ---------------------------------------------------------
 */

async function importTemplate(client, actorId, body) {
  const template = body?.template;

  if (
    template === undefined ||
    template === null ||
    typeof template !== "object" ||
    Array.isArray(template)
  ) {
    return response(400, {
      success: false,
      error: "A template object is required."
    });
  }

  await client.query("BEGIN");

  try {
    const existing = await client.query(
      `
      SELECT
        tenant_id,
        agency_id,
        template_name,
        created_at
      FROM suite_templates
      WHERE tenant_id = $1
        AND agency_id = $2
      LIMIT 2
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    if (existing.rows.length > 1) {
      await client.query("ROLLBACK");

      return response(409, {
        success: false,
        error:
          "Multiple Demo PD template rows found. Manual review required.",
        existingCount: existing.rows.length
      });
    }

    let operation;

    if (existing.rows.length === 1) {
      await client.query(
        `
        UPDATE suite_templates
        SET
          template_name = $3,
          empty_state = $4::jsonb
        WHERE tenant_id = $1
          AND agency_id = $2
        `,
        [
          DEMO_TENANT_ID,
          DEMO_AGENCY_ID,
          "Standard Law Enforcement",
          JSON.stringify(template)
        ]
      );

      operation = "updated";
    } else {
      await client.query(
        `
        INSERT INTO suite_templates (
          tenant_id,
          agency_id,
          template_name,
          empty_state
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb
        )
        `,
        [
          DEMO_TENANT_ID,
          DEMO_AGENCY_ID,
          "Standard Law Enforcement",
          JSON.stringify(template)
        ]
      );

      operation = "inserted";
    }

    const verify = await client.query(
      `
      SELECT
        tenant_id,
        agency_id,
        template_name,
        empty_state,
        created_at
      FROM suite_templates
      WHERE tenant_id = $1
        AND agency_id = $2
      LIMIT 1
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    if (!verify.rows.length) {
      throw new Error(
        "Template write completed but verification row was not found."
      );
    }

    const stored = verify.rows[0];

    if (
      !stored.empty_state ||
      typeof stored.empty_state !== "object" ||
      Array.isArray(stored.empty_state)
    ) {
      throw new Error(
        "Template verification failed after database write."
      );
    }

    await client.query("COMMIT");

    return response(200, {
      success: true,
      tenantId: DEMO_TENANT_ID,
      agencyId: DEMO_AGENCY_ID,
      templateImported: true,
      operation,
      templateName: stored.template_name,
      createdAt: stored.created_at,
      topLevelKeyCount:
        Object.keys(stored.empty_state).length,
      topLevelKeys:
        Object.keys(stored.empty_state)
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw error;
  }
}

/*
 * ---------------------------------------------------------
 * DEMO PD ACCESS RULE MIGRATION
 * ---------------------------------------------------------
 */

async function importAccessRules(client, actorId, body) {
  const rules = body?.rules;

  if (!Array.isArray(rules) || rules.length === 0) {
    return response(400, {
      success: false,
      error: "A non-empty rules array is required."
    });
  }

  if (rules.length > 250) {
    return response(400, {
      success: false,
      error: "Maximum batch size is 250 access rules."
    });
  }

  const normalizeFields = value => {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      !Array.isArray(value) ||
      !value.every(item => typeof item === "string")
    ) {
      throw new Error(
        "Access-rule field lists must be string arrays or null."
      );
    }

    return value;
  };

  const normalized = rules.map(rule => {
    if (
      !rule ||
      typeof rule.role_id !== "string" ||
      !rule.role_id.trim() ||
      typeof rule.collection !== "string" ||
      !rule.collection.trim() ||
      typeof rule.read_mode !== "string" ||
      !rule.read_mode.trim() ||
      typeof rule.write_mode !== "string" ||
      !rule.write_mode.trim() ||
      (
        rule.owner_field != null &&
        typeof rule.owner_field !== "string"
      ) ||
      typeof rule.allow_create !== "boolean" ||
      typeof rule.allow_delete !== "boolean"
    ) {
      throw new Error(
        "Invalid access-rule migration row."
      );
    }

    return {
      role_id: rule.role_id,
      collection: rule.collection,
      read_mode: rule.read_mode,
      write_mode: rule.write_mode,
      owner_field: rule.owner_field ?? null,
      read_fields: normalizeFields(
        rule.read_fields
      ),
      write_fields: normalizeFields(
        rule.write_fields
      ),
      allow_create: rule.allow_create,
      allow_delete: rule.allow_delete
    };
  });

  /*
   * Make sure the source itself does not contain
   * duplicate role/collection combinations.
   */

  const seen = new Set();

  for (const rule of normalized) {
    const key =
      `${rule.role_id}\u0000${rule.collection}`;

    if (seen.has(key)) {
      return response(400, {
        success: false,
        error:
          "Duplicate role_id + collection rule found in source data.",
        roleId: rule.role_id,
        collection: rule.collection
      });
    }

    seen.add(key);
  }

  await client.query("BEGIN");

  try {
    /*
     * This migration intentionally refuses to overwrite
     * existing Demo PD authorization rules.
     */

    const existing = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM suite_access_rules
      WHERE tenant_id = $1
        AND agency_id = $2
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    const existingCount =
      existing.rows[0]?.count ?? 0;

    if (existingCount !== 0) {
      await client.query("ROLLBACK");

      return response(409, {
        success: false,
        error:
          "Demo PD already has access rules in AWS. Import stopped rather than overwrite authorization data.",
        awsExistingRuleCount: existingCount
      });
    }

    /*
     * Insert every rule inside the same transaction.
     * If even one fails, the entire migration rolls back.
     */

    for (const rule of normalized) {
      await client.query(
        `
        INSERT INTO suite_access_rules (
          tenant_id,
          agency_id,
          role_id,
          collection,
          read_mode,
          write_mode,
          owner_field,
          read_fields,
          write_fields,
          allow_create,
          allow_delete
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::text[],
          $9::text[],
          $10,
          $11
        )
        `,
        [
          DEMO_TENANT_ID,
          DEMO_AGENCY_ID,
          rule.role_id,
          rule.collection,
          rule.read_mode,
          rule.write_mode,
          rule.owner_field,
          rule.read_fields,
          rule.write_fields,
          rule.allow_create,
          rule.allow_delete
        ]
      );
    }

    /*
     * Read everything back BEFORE committing.
     */

    const verify = await client.query(
      `
      SELECT
        role_id,
        collection,
        read_mode,
        write_mode,
        owner_field,
        read_fields,
        write_fields,
        allow_create,
        allow_delete
      FROM suite_access_rules
      WHERE tenant_id = $1
        AND agency_id = $2
      ORDER BY role_id, collection
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    if (
      verify.rows.length !== normalized.length
    ) {
      throw new Error(
        `Access-rule verification failed: expected ${normalized.length} rows but AWS returned ${verify.rows.length}.`
      );
    }

    /*
     * Compare every stored rule against the source.
     */

    const sourceByKey = new Map(
      normalized.map(rule => [
        `${rule.role_id}\u0000${rule.collection}`,
        rule
      ])
    );

    for (const stored of verify.rows) {
      const key =
        `${stored.role_id}\u0000${stored.collection}`;

      const source =
        sourceByKey.get(key);

      if (!source) {
        throw new Error(
          `Unexpected AWS access rule: ${stored.role_id}/${stored.collection}.`
        );
      }

      const same =
        stored.read_mode ===
          source.read_mode &&
        stored.write_mode ===
          source.write_mode &&
        (stored.owner_field ?? null) ===
          source.owner_field &&
        JSON.stringify(
          stored.read_fields ?? null
        ) ===
          JSON.stringify(
            source.read_fields
          ) &&
        JSON.stringify(
          stored.write_fields ?? null
        ) ===
          JSON.stringify(
            source.write_fields
          ) &&
        stored.allow_create ===
          source.allow_create &&
        stored.allow_delete ===
          source.allow_delete;

      if (!same) {
        throw new Error(
          `Access-rule verification mismatch for ${stored.role_id}/${stored.collection}.`
        );
      }
    }

    /*
     * Everything matched.
     */

    await client.query("COMMIT");

    return response(200, {
      success: true,
      tenantId: DEMO_TENANT_ID,
      agencyId: DEMO_AGENCY_ID,
      received: normalized.length,
      inserted: normalized.length,
      awsAccessRuleCount:
        verify.rows.length,
      verified: true
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw error;
  }
}

/*
 * ---------------------------------------------------------
 * ACCESS RULE SCHEMA INSPECTION
 * READ ONLY
 * ---------------------------------------------------------
 */

async function inspectAccessRules(client) {
  const columns = await client.query(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'suite_access_rules'
    ORDER BY ordinal_position
    `
  );

  /*
   * We inspect the actual column names first before assuming
   * tenant_id and agency_id exist.
   */

  const columnNames = new Set(
    columns.rows.map(
      row => row.column_name
    )
  );

  let demoPdExistingRuleCount = null;

  if (
    columnNames.has("tenant_id") &&
    columnNames.has("agency_id")
  ) {
    const count = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM suite_access_rules
      WHERE tenant_id = $1
        AND agency_id = $2
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    demoPdExistingRuleCount =
      count.rows[0]?.count ?? 0;
  }

  return response(200, {
    success: true,
    readOnly: true,
    table: "suite_access_rules",
    demoPdExistingRuleCount,
    schema: columns.rows
  });
}

/*
 * ---------------------------------------------------------
 * DEMO PD MEMBERSHIP MIGRATION
 * ---------------------------------------------------------
 */

async function importMemberships(client, actorId, body) {
  const memberships = body?.memberships;

  if (!Array.isArray(memberships) || memberships.length !== 9) {
    return response(400, {
      success: false,
      error: "Demo PD membership migration requires exactly 9 source memberships."
    });
  }

  const normalizeEmail = value =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  const normalizeRoles = value => {
    if (!Array.isArray(value) || !value.length || !value.every(role => typeof role === "string" && role.trim())) {
      throw new Error("Every membership must contain a non-empty role_ids string array.");
    }
    return [...new Set(value.map(role => role.trim()))].sort();
  };

  const source = memberships.map(row => {
    const email = normalizeEmail(row?.user_email);
    const personId = typeof row?.person_id === "string" ? row.person_id.trim() : "";
    const status = typeof row?.membership_status === "string" ? row.membership_status.trim() : "";
    const roleIds = normalizeRoles(row?.role_ids);

    if (!email || !personId || !status) {
      throw new Error("Each source membership requires user_email, person_id, membership_status, and role_ids.");
    }

    if (row?.tenant_id && row.tenant_id !== DEMO_TENANT_ID) {
      throw new Error("Source membership contains the wrong tenant_id.");
    }

    if (row?.agency_id && row.agency_id !== DEMO_AGENCY_ID) {
      throw new Error("Source membership contains the wrong agency_id.");
    }

    return {
      email,
      person_id: personId,
      role_ids: roleIds,
      status
    };
  });

  const emails = new Set();
  const personIds = new Set();

  for (const row of source) {
    if (emails.has(row.email)) {
      return response(400, {
        success: false,
        error: `Duplicate source email: ${row.email}`
      });
    }
    if (personIds.has(row.person_id)) {
      return response(400, {
        success: false,
        error: `Duplicate source person_id: ${row.person_id}`
      });
    }
    emails.add(row.email);
    personIds.add(row.person_id);
  }

  const platformRows = source.filter(row =>
    row.role_ids.includes("role_platform_admin")
  );

  if (platformRows.length !== 1) {
    return response(400, {
      success: false,
      error: `Expected exactly one source platform-admin membership; received ${platformRows.length}.`
    });
  }

  const actorBefore = await client.query(
    `
    SELECT id, cognito_sub, email, status
    FROM suite_users
    WHERE id = $1
    LIMIT 1
    `,
    [actorId]
  );

  if (!actorBefore.rows.length || !actorBefore.rows[0].cognito_sub) {
    return response(409, {
      success: false,
      error: "Authenticated AWS platform administrator is not safely linked to Cognito."
    });
  }

  const actorCognitoSub = actorBefore.rows[0].cognito_sub;
  const actorEmailBefore = actorBefore.rows[0].email;
  const platformSource = platformRows[0];

  await client.query("BEGIN");

  try {
    const existingDemo = await client.query(
      `
      SELECT user_id, person_id, role_ids, status
      FROM suite_memberships
      WHERE tenant_id = $1
        AND agency_id = $2
      FOR UPDATE
      `,
      [DEMO_TENANT_ID, DEMO_AGENCY_ID]
    );

    if (
      existingDemo.rows.length !== 1 ||
      existingDemo.rows[0].user_id !== actorId
    ) {
      await client.query("ROLLBACK");
      return response(409, {
        success: false,
        error: "AWS Demo PD membership state changed. Expected only the authenticated bootstrap membership.",
        awsExistingMembershipCount: existingDemo.rows.length
      });
    }

    /*
     * Reconcile the existing Cognito-linked bootstrap membership to the
     * original application person_id. The AWS user identity and Cognito
     * link remain unchanged.
     */
    await client.query(
      `
      UPDATE suite_memberships
      SET
        person_id = $4,
        role_ids = $5::text[],
        status = $6
      WHERE user_id = $1
        AND tenant_id = $2
        AND agency_id = $3
      `,
      [
        actorId,
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID,
        platformSource.person_id,
        platformSource.role_ids,
        platformSource.status
      ]
    );

    let createdUsers = 0;
    let reusedUsers = 0;
    let createdMemberships = 0;

    for (const row of source) {
      if (row === platformSource) continue;

      const matches = await client.query(
        `
        SELECT id, cognito_sub, email, status
        FROM suite_users
        WHERE lower(email) = $1
        ORDER BY created_at
        FOR UPDATE
        `,
        [row.email]
      );

      if (matches.rows.length > 1) {
        throw new Error(`Multiple AWS suite_users rows match ${row.email}.`);
      }

      let userId;

      if (matches.rows.length === 1) {
        const existingUser = matches.rows[0];

        if (existingUser.id === actorId) {
          throw new Error(`Source email ${row.email} unexpectedly resolves to the authenticated platform administrator.`);
        }

        userId = existingUser.id;
        reusedUsers++;
      } else {
        const created = await client.query(
          `
          INSERT INTO suite_users (
            email,
            display_name,
            status
          )
          VALUES ($1, $2, 'invited')
          RETURNING id
          `,
          [row.email, row.email]
        );

        userId = created.rows[0].id;
        createdUsers++;
      }

      const existingMembership = await client.query(
        `
        SELECT person_id, role_ids, status
        FROM suite_memberships
        WHERE user_id = $1
          AND tenant_id = $2
          AND agency_id = $3
        LIMIT 1
        `,
        [userId, DEMO_TENANT_ID, DEMO_AGENCY_ID]
      );

      if (existingMembership.rows.length) {
        throw new Error(`AWS user ${row.email} already has a Demo PD membership. Migration stopped rather than overwrite it.`);
      }

      await client.query(
        `
        INSERT INTO suite_memberships (
          user_id,
          tenant_id,
          agency_id,
          person_id,
          role_ids,
          status
        )
        VALUES ($1, $2, $3, $4, $5::text[], $6)
        `,
        [
          userId,
          DEMO_TENANT_ID,
          DEMO_AGENCY_ID,
          row.person_id,
          row.role_ids,
          row.status
        ]
      );

      createdMemberships++;
    }

    const verify = await client.query(
      `
      SELECT
        m.user_id,
        m.person_id,
        m.role_ids,
        m.status,
        u.email,
        u.cognito_sub
      FROM suite_memberships m
      JOIN suite_users u
        ON u.id = m.user_id
      WHERE m.tenant_id = $1
        AND m.agency_id = $2
      ORDER BY m.person_id
      `,
      [DEMO_TENANT_ID, DEMO_AGENCY_ID]
    );

    if (verify.rows.length !== source.length) {
      throw new Error(`Membership verification failed: expected ${source.length} AWS rows but found ${verify.rows.length}.`);
    }

    const storedByPerson = new Map(
      verify.rows.map(row => [row.person_id, row])
    );

    for (const expected of source) {
      const stored = storedByPerson.get(expected.person_id);
      if (!stored) {
        throw new Error(`Membership verification failed: missing person_id ${expected.person_id}.`);
      }

      const storedRoles = Array.isArray(stored.role_ids)
        ? [...stored.role_ids].sort()
        : [];

      if (
        JSON.stringify(storedRoles) !== JSON.stringify(expected.role_ids) ||
        stored.status !== expected.status
      ) {
        throw new Error(`Membership verification mismatch for ${expected.person_id}.`);
      }

      if (expected === platformSource) {
        if (stored.user_id !== actorId || stored.cognito_sub !== actorCognitoSub) {
          throw new Error("Platform-admin membership verification failed: Cognito-linked AWS identity was not preserved.");
        }
      } else if (normalizeEmail(stored.email) !== expected.email) {
        throw new Error(`Membership email verification mismatch for ${expected.person_id}.`);
      }
    }

    const actorAfter = await client.query(
      `
      SELECT id, cognito_sub, email
      FROM suite_users
      WHERE id = $1
      LIMIT 1
      `,
      [actorId]
    );

    if (
      !actorAfter.rows.length ||
      actorAfter.rows[0].cognito_sub !== actorCognitoSub ||
      actorAfter.rows[0].email !== actorEmailBefore
    ) {
      throw new Error("Authenticated platform-admin AWS identity changed during migration. Rolling back.");
    }

    await client.query("COMMIT");

    return response(200, {
      success: true,
      tenantId: DEMO_TENANT_ID,
      agencyId: DEMO_AGENCY_ID,
      sourceMembershipCount: source.length,
      awsMembershipCount: verify.rows.length,
      createdUsers,
      reusedUsers,
      createdMemberships,
      reconciledBootstrapMembership: true,
      cognitoUsersCreated: 0,
      verified: true
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  }
}

/*
 * ---------------------------------------------------------
 * MEMBERSHIP SCHEMA + DATA INSPECTION
 * READ ONLY
 * ---------------------------------------------------------
 */

async function inspectMemberships(client) {
  const columns = await client.query(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'suite_memberships'
    ORDER BY ordinal_position
    `
  );

  const constraints = await client.query(
    `
    SELECT
      c.conname AS constraint_name,
      c.contype AS constraint_type,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'suite_memberships'
    ORDER BY c.conname
    `
  );

  const indexes = await client.query(
    `
    SELECT
      indexname AS index_name,
      indexdef AS definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'suite_memberships'
    ORDER BY indexname
    `
  );

  const columnNames = new Set(
    columns.rows.map(row => row.column_name)
  );

  let demoPdMembershipCount = null;
  let demoPdMemberships = [];

  if (
    columnNames.has("tenant_id") &&
    columnNames.has("agency_id")
  ) {
    const count = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM suite_memberships
      WHERE tenant_id = $1
        AND agency_id = $2
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    demoPdMembershipCount =
      count.rows[0]?.count ?? 0;

    const memberships = await client.query(
      `
      SELECT *
      FROM suite_memberships
      WHERE tenant_id = $1
        AND agency_id = $2
      ORDER BY person_id NULLS LAST, user_id
      `,
      [
        DEMO_TENANT_ID,
        DEMO_AGENCY_ID
      ]
    );

    demoPdMemberships = memberships.rows;
  }

  return response(200, {
    success: true,
    readOnly: true,
    table: "suite_memberships",
    demoPdMembershipCount,
    schema: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    demoPdMemberships
  });
}



/*
 * ---------------------------------------------------------
 * PERMANENT APPLICATION API FOUNDATION
 * ---------------------------------------------------------
 */

async function authenticateUser(client, event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  const cognitoSub = claims.sub;

  if (!cognitoSub) {
    return { error: response(401, { success: false, error: "Authenticated Cognito identity required." }) };
  }

  const result = await client.query(
    `SELECT u.id AS user_id, u.cognito_sub, u.email, u.display_name, u.status,
            COALESCE(pa.enabled, false) AS platform_admin, pa.person_id AS platform_person_id
       FROM suite_users u
       LEFT JOIN suite_platform_admins pa ON pa.user_id = u.id
      WHERE u.cognito_sub = $1
      LIMIT 1`,
    [cognitoSub]
  );

  if (!result.rows.length) {
    return { error: response(403, { success: false, error: "Authenticated user is not linked to a SonoMarzi user." }) };
  }

  const user = result.rows[0];

  // A Cognito user can only reach this authenticated API after completing any
  // NEW_PASSWORD_REQUIRED challenge and receiving a valid JWT.  Promote a
  // freshly invited SonoMarzi user to active on that first successful
  // authenticated request so the application session can resume normally.
  if (user.status === "invited") {
    await client.query(
      `UPDATE suite_users SET status = 'active' WHERE id = $1 AND status = 'invited'`,
      [user.user_id]
    );
    user.status = "active";
  }

  if (user.status !== "active") {
    return { error: response(403, { success: false, error: "SonoMarzi user is not active." }) };
  }

  return {
    userId: user.user_id,
    cognitoSub: user.cognito_sub,
    email: user.email,
    displayName: user.display_name,
    platformAdmin: user.platform_admin === true,
    platformPersonId: user.platform_person_id || null
  };
}


async function resolveWorkspaceMembership(client, auth, tenantId, agencyId) {
  const target = await client.query(
    `SELECT
       t.id AS tenant_id,
       t.status AS tenant_status,
       t.enabled_modules,
       a.id AS agency_id,
       a.status AS agency_status,
       m.person_id,
       m.role_ids,
       m.status AS membership_status
     FROM suite_tenants t
     JOIN suite_agencies a
       ON a.tenant_id = t.id
      AND a.id = $2
     LEFT JOIN suite_memberships m
       ON m.tenant_id = t.id
      AND m.agency_id = a.id
      AND m.user_id = $3
     WHERE t.id = $1
     LIMIT 1`,
    [tenantId, agencyId, auth.userId]
  );

  if (!target.rows.length) {
    return {
      error: response(404, {
        success: false,
        error: "Workspace not found."
      })
    };
  }

  const row = target.rows[0];

  if (
    !["setup", "active"].includes(row.tenant_status) ||
    !["setup", "active"].includes(row.agency_status)
  ) {
    return {
      error: response(403, {
        success: false,
        error: "Tenant or agency is not active."
      })
    };
  }

  const activeMember = row.membership_status === "active";

  if (!activeMember && !auth.platformAdmin) {
    return {
      error: response(403, {
        success: false,
        error: "Active agency membership required."
      })
    };
  }

  const roleIds = Array.isArray(row.role_ids) ? row.role_ids : [];
  const agencyAdmin = roleIds.includes("role_admin");
  const personId =
    row.person_id ||
    (auth.platformAdmin ? auth.platformPersonId : null);

  if (!personId) {
    return {
      error: response(409, {
        success: false,
        error: "Person identity is not configured for this workspace."
      })
    };
  }

  return {
    tenantId,
    agencyId,
    personId,
    roleIds,
    enabledModules: Array.isArray(row.enabled_modules)
      ? row.enabled_modules
      : [],
    platformAdmin: auth.platformAdmin,
    agencyAdmin,
    admin: auth.platformAdmin || agencyAdmin
  };
}


function collectionFromRecordKey(key) {
  const decoded = JSON.parse(key);
  if (
    !Array.isArray(decoded) ||
    decoded.length !== 2 ||
    !Array.isArray(decoded[0])
  ) {
    throw new Error("Invalid record key.");
  }

  return {
    collection: decoded[0].map(String).join("."),
    itemId: String(decoded[1])
  };
}

function moduleLicensed(enabledModules, collection) {
  const prefix = collection.split(".")[0];
  const licensedPrefixes = new Set([
    "qm", "fleet", "pm", "k9", "drone",
    "eod", "subpoena", "grants", "civil"
  ]);

  if (!licensedPrefixes.has(prefix)) return true;

  const moduleName = prefix === "pm" ? "personnel" : prefix;
  return enabledModules.includes(moduleName);
}

async function loadRoleAbilityMap(client, tenantId, agencyId, roleIds) {
  if (!roleIds.length) return new Map();

  const result = await client.query(
    `SELECT value
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND (key::jsonb)->0 = '["roles"]'::jsonb
        AND value->>'id' = ANY($3::text[])`,
    [tenantId, agencyId, roleIds]
  );

  const map = new Map();

  for (const row of result.rows) {
    const roleId = row.value?.id;
    if (typeof roleId === "string") {
      map.set(roleId, row.value?.abilities || {});
    }
  }

  return map;
}

function roleHasAbility(abilityMap, roleIds, ability) {
  if (!ability) return false;

  return roleIds.some(roleId => {
    const abilities = abilityMap.get(roleId);
    return abilities?.[ability] === true;
  });
}

function limitPersonnelRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const allowed = [
    "id",
    "name",
    "badge",
    "unit",
    "email",
    "roleIds",
    "qualifications"
  ];

  return Object.fromEntries(
    allowed
      .filter(field => Object.prototype.hasOwnProperty.call(value, field))
      .map(field => [field, value[field]])
  );
}

const OFFICER_UNIVERSAL_READ = new Set([
  "roles",
  "personnel",
  "pm.scheduleExceptions",
  "pm.shiftSwapRequests",
  "pm.scheduleCoverages",
  "pm.schedulingSettings",
  "pm.otCallbackOptIns",
  "pm.bidCycles",
  "pm.extraDutyJobs",
  "pm.extraDutySignups",
  "pm.rollCalls",
  "pm.trainingSessions",
  "pm.trainingCourses"
]);

async function filterOfficerWorkspaceRecords(
  client,
  workspaceAuth,
  records
) {
  const abilityMap = await loadRoleAbilityMap(
    client,
    workspaceAuth.tenantId,
    workspaceAuth.agencyId,
    workspaceAuth.roleIds
  );

  const canTrainingCheckin =
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_training_checkin_submit"
    ) ||
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_instructor_manage"
    );

  const canViewAllTrainingCheckins =
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_instructor_manage"
    );

  const canLeaveRequest =
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_leave_request_submit"
    ) ||
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_leave_request_approve"
    );

  const canViewAllLeaveRequests =
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_leave_request_approve"
    );

  const visible = [];

  for (const record of records) {
    let parsed;

    try {
      parsed = collectionFromRecordKey(record.key);
    } catch {
      continue;
    }

    const { collection, itemId } = parsed;

    if (!moduleLicensed(workspaceAuth.enabledModules, collection)) {
      continue;
    }

    if (collection === "accounts") {
      continue;
    }

    if (OFFICER_UNIVERSAL_READ.has(collection)) {
      visible.push({
        ...record,
        value:
          collection === "personnel" &&
          itemId !== "$order" &&
          itemId !== "$value"
            ? limitPersonnelRecord(record.value)
            : record.value
      });
      continue;
    }

    if (collection.endsWith(".refData")) {
      const moduleAbility =
        collection.startsWith("pm.")
          ? "module_personnel"
          : collection.startsWith("qm.")
            ? "module_quartermaster"
            : `module_${collection.split(".")[0]}`;

      if (
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          moduleAbility
        )
      ) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "pm.trainingCheckins" && canTrainingCheckin) {
      const own =
        itemId === "$order" ||
        (
          itemId === "$value" &&
          Array.isArray(record.value) &&
          record.value.length === 0
        ) ||
        record.value?.personId === workspaceAuth.personId;

      if (own || canViewAllTrainingCheckins) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "pm.leaveRequests" && canLeaveRequest) {
      const own =
        itemId === "$order" ||
        (
          itemId === "$value" &&
          Array.isArray(record.value) &&
          record.value.length === 0
        ) ||
        record.value?.personId === workspaceAuth.personId;

      if (own || canViewAllLeaveRequests) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "fleet.vehicles") {
      if (
        await fleetVehicleVisible(
          client,
          workspaceAuth,
          abilityMap,
          record.value
        )
      ) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "fleet.maintenance") {
      if (
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "fleet_vehicle_view"
        )
      ) {
        if (itemId === "$order" || itemId === "$value") {
          visible.push(record);
        } else {
          const vehicleId = record.value?.vehicleId;
          const vehicle = records.find(candidate => {
            try {
              const parsed = collectionFromRecordKey(candidate.key);
              return (
                parsed.collection === "fleet.vehicles" &&
                parsed.itemId === vehicleId &&
                candidate.deleted !== true
              );
            } catch {
              return false;
            }
          });

          if (
            vehicle &&
            await fleetVehicleVisible(
              client,
              workspaceAuth,
              abilityMap,
              vehicle.value
            )
          ) {
            visible.push(record);
          }
        }
      }
      continue;
    }

    if (collection === "fleet.inspections") {
      const viewAll = roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_inspection_view_all"
      );

      const conduct = roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_inspection_conduct"
      );

      if (
        viewAll ||
        (
          conduct &&
          (
            itemId === "$order" ||
            itemId === "$value" ||
            record.value?.submittedByPersonId === workspaceAuth.personId ||
            (
              Array.isArray(record.value?.personnelIds) &&
              record.value.personnelIds.includes(workspaceAuth.personId)
            )
          )
        )
      ) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "qm.equipment") {
      if (
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "qm_equip_view"
        ) &&
        await qmEquipmentVisible(
          client,
          workspaceAuth,
          abilityMap,
          record.value,
          itemId
        )
      ) {
        visible.push(record);
      }
      continue;
    }

    if (
      collection === "qm.assignments" &&
      hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ["qm_assign_history", "qm_assign_checkout"]
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "qm.audits" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_audit_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "qm.consumptionLog" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_equip_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "qm.maintenance" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_equip_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (collection === "qm.requests") {
      const canViewAll = hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ["qm_request_view_all", "qm_request_approve"]
      );

      const canOwn = roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_request_submit"
      );

      const own =
        itemId === "$order" ||
        itemId === "$value" ||
        record.value?.requesterId === workspaceAuth.personId;

      if (canViewAll || (canOwn && own)) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "k9.k9s") {
      if (
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "k9_roster_view"
        )
      ) {
        visible.push({
          ...record,
          value:
            itemId === "$order" || itemId === "$value"
              ? record.value
              : redactK9RecordForAbilities(
                  record.value,
                  abilityMap,
                  workspaceAuth.roleIds
                )
        });
      }
      continue;
    }

    if (
      collection === "k9.certifications" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_certification_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "k9.deployments" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_deployment_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "k9.incidents" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_incident_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "k9.trainingSessions" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_training_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "subpoena.subpoenas" &&
      subpoenaReadable(
        workspaceAuth,
        abilityMap,
        itemId,
        record.value
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "civil.papers" &&
      civilPaperReadable(
        workspaceAuth,
        abilityMap,
        itemId,
        record.value
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "civil.cashierReconciliations" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_fee_manage"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "civil.enforcements" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_paper_view_all"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "drone.drones" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_fleet_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "drone.flights" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_flight_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "drone.incidents" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_incident_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "drone.maintenanceRecords" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_maint_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "drone.operators" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_operator_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "eod.incidents" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_incident_view"
      )
    ) {
      visible.push({
        ...record,
        value:
          itemId === "$order" || itemId === "$value"
            ? record.value
            : redactEodIncidentForAbilities(
                record.value,
                abilityMap,
                workspaceAuth.roleIds
              )
      });
      continue;
    }

    if (
      collection === "eod.inventory" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_inventory_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "eod.magazineInspections" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_magazine_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "eod.magazines" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_magazine_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "eod.technicians" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_technician_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "eod.theftLossReports" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_theft_report_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "grants.grants" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "grants_award_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    if (
      collection === "grants.seizures" &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "grants_seizure_view"
      )
    ) {
      visible.push(record);
      continue;
    }

    const sideEffectMatch =
      collection.match(/^(drone|eod|grants)\.(activity|notifications)$/);

    if (sideEffectMatch) {
      const moduleName = sideEffectMatch[1];

      if (
        moduleSideEffectAllowed(
          abilityMap,
          workspaceAuth.roleIds,
          moduleName,
          false
        )
      ) {
        visible.push(record);
      }
      continue;
    }

    if (
      PM_COLLECTION_RULES[collection] &&
      pmRecordReadable(
        workspaceAuth,
        abilityMap,
        collection,
        itemId,
        record.value
      )
    ) {
      visible.push({
        ...record,
        value:
          collection === "pm.records" &&
          itemId !== "$order" &&
          itemId !== "$value"
            ? redactPmRecord(
                record.value,
                abilityMap,
                workspaceAuth.roleIds
              )
            : record.value
      });
      continue;
    }

    if (
      sharedCollectionReadable(
        workspaceAuth,
        abilityMap,
        collection
      )
    ) {
      if (collection === "personnel") {
        visible.push({
          ...record,
          value:
            itemId === "$order" || itemId === "$value"
              ? record.value
              : limitPersonnelRecord(record.value)
        });
      } else {
        visible.push(record);
      }
      continue;
    }
  }

  return visible;
}

async function authorizeOfficerSelfServiceChange(
  client,
  workspaceAuth,
  abilityMap,
  change,
  existingRow,
  batchChanges
) {
  const collection = change.path.map(String).join(".");
  const itemId = change.itemId;

  const config = {
    "pm.trainingCheckins": {
      submitAbility: "pm_training_checkin_submit",
      elevatedAbility: "pm_instructor_manage"
    },
    "pm.leaveRequests": {
      submitAbility: "pm_leave_request_submit",
      elevatedAbility: "pm_leave_request_approve"
    }
  }[collection];

  if (!config) {
    return {
      allowed: false,
      error: "You cannot change this collection or record."
    };
  }

  const hasSubmit = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    config.submitAbility
  );

  const hasElevated = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    config.elevatedAbility
  );

  if (!hasSubmit && !hasElevated) {
    return {
      allowed: false,
      error: "You cannot change this collection or record."
    };
  }

  const existingValue = existingRow?.value ?? null;
  const existingDeleted = existingRow?.deleted === true;
  const creating = !existingRow || existingDeleted;
  const deleting = change.deleted === true;
  const incoming = change.value;

  // Elevated approver/instructor behavior is intentionally not opened
  // in this officer phase. Only the exact self-service own-record path
  // is enabled here.
  if (itemId === "$order") {
    if (deleting || !Array.isArray(incoming)) {
      return {
        allowed: false,
        error: "A self-service order must remain an array."
      };
    }

    if (Array.isArray(existingValue)) {
      for (const oldId of existingValue) {
        if (!incoming.includes(oldId)) {
          const matchingDelete = batchChanges.some(candidate => {
            const candidateCollection =
              candidate.path.map(String).join(".");

            return (
              candidateCollection === collection &&
              candidate.itemId === oldId &&
              candidate.deleted === true
            );
          });

          if (!matchingDelete) {
            return {
              allowed: false,
              error:
                "The request list changed. Reload before retrying."
            };
          }
        }
      }
    }

    return { allowed: true };
  }

  if (
    itemId === "$value" &&
    deleting &&
    Array.isArray(existingValue) &&
    existingValue.length === 0
  ) {
    return { allowed: true };
  }

  // Supabase officer rules do not allow deleting self-service records.
  if (deleting) {
    return {
      allowed: false,
      error: "You cannot delete this self-service record."
    };
  }

  const beforePerson = existingValue?.personId ?? null;
  const afterPerson = incoming?.personId ?? null;

  if (creating) {
    if (afterPerson !== workspaceAuth.personId) {
      return {
        allowed: false,
        error: "Self-service records must belong to the signed-in person."
      };
    }
  } else {
    if (
      beforePerson !== workspaceAuth.personId ||
      afterPerson !== workspaceAuth.personId
    ) {
      return {
        allowed: false,
        error: "Record identity cannot be changed."
      };
    }
  }

  return { allowed: true };
}


async function getOwnUnit(client, tenantId, agencyId, personId) {
  if (!personId) return null;

  const result = await client.query(
    `SELECT value->>'unit' AS unit
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND (key::jsonb)->0 = '["personnel"]'::jsonb
        AND value->>'id' = $3
      LIMIT 1`,
    [tenantId, agencyId, personId]
  );

  return result.rows[0]?.unit || null;
}

async function fleetVehicleVisible(
  client,
  workspaceAuth,
  abilityMap,
  vehicle
) {
  if (
    !roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "fleet_vehicle_view"
    )
  ) {
    return false;
  }

  const roleRows = await client.query(
    `SELECT value
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND (key::jsonb)->0 = '["roles"]'::jsonb
        AND value->>'id' = ANY($3::text[])`,
    [
      workspaceAuth.tenantId,
      workspaceAuth.agencyId,
      workspaceAuth.roleIds
    ]
  );

  const scopedRoles = roleRows.rows.filter(row => {
    const scope = row.value?.agencyScope;
    return Array.isArray(scope) && scope.length > 0;
  });

  const unscopedRoleExists = roleRows.rows.some(row => {
    const scope = row.value?.agencyScope;
    return !Array.isArray(scope) || scope.length === 0;
  });

  if (scopedRoles.length > 0 && !unscopedRoleExists) {
    const agencyOk = scopedRoles.some(row =>
      Array.isArray(row.value?.agencyScope) &&
      row.value.agencyScope.includes(vehicle?.agency)
    );

    if (!agencyOk && vehicle?.isSharedAsset !== true) {
      return false;
    }
  }

  const unitScoped = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    "fleet_unit_scope"
  );

  const bypassUnitScope = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    "fleet_bypass_unit_scope"
  );

  if (!unitScoped || bypassUnitScope) {
    return true;
  }

  if (
    vehicle?.assignedToType === "person" &&
    vehicle?.assignedTo === workspaceAuth.personId
  ) {
    return true;
  }

  const ownUnit = await getOwnUnit(
    client,
    workspaceAuth.tenantId,
    workspaceAuth.agencyId,
    workspaceAuth.personId
  );

  if (!ownUnit) return false;

  if (vehicle?.assignedToType === "unit") {
    return vehicle?.assignedTo === ownUnit;
  }

  if (vehicle?.assignedToType === "person") {
    const result = await client.query(
      `SELECT 1
         FROM suite_records
        WHERE tenant_id = $1
          AND agency_id = $2
          AND deleted = false
          AND (key::jsonb)->0 = '["personnel"]'::jsonb
          AND value->>'id' = $3
          AND value->>'unit' = $4
        LIMIT 1`,
      [
        workspaceAuth.tenantId,
        workspaceAuth.agencyId,
        vehicle?.assignedTo,
        ownUnit
      ]
    );

    return result.rows.length > 0;
  }

  return false;
}

async function qmEquipmentVisible(
  client,
  workspaceAuth,
  abilityMap,
  value,
  itemId
) {
  if (itemId === "$order" || itemId === "$value") {
    return true;
  }

  const roleRows = await client.query(
    `SELECT value
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND (key::jsonb)->0 = '["roles"]'::jsonb
        AND value->>'id' = ANY($3::text[])`,
    [
      workspaceAuth.tenantId,
      workspaceAuth.agencyId,
      workspaceAuth.roleIds
    ]
  );

  const scopedRoles = roleRows.rows.filter(row => {
    const scope = row.value?.agencyScope;
    return Array.isArray(scope) && scope.length > 0;
  });

  const unscopedRoleExists = roleRows.rows.some(row => {
    const scope = row.value?.agencyScope;
    return !Array.isArray(scope) || scope.length === 0;
  });

  if (scopedRoles.length > 0 && !unscopedRoleExists) {
    const agencyOk = scopedRoles.some(row =>
      Array.isArray(row.value?.agencyScope) &&
      row.value.agencyScope.includes(value?.agency)
    );

    if (!agencyOk && value?.isSharedAsset !== true) {
      return false;
    }
  }

  const unitScoped = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    "qm_unit_scope"
  );

  const bypassUnitScope = roleHasAbility(
    abilityMap,
    workspaceAuth.roleIds,
    "qm_bypass_unit_scope"
  );

  if (!unitScoped || bypassUnitScope) {
    return true;
  }

  const ownUnit = await getOwnUnit(
    client,
    workspaceAuth.tenantId,
    workspaceAuth.agencyId,
    workspaceAuth.personId
  );

  if (!ownUnit) return false;

  if (value?.homeUnit === ownUnit) {
    return true;
  }

  if (value?.assignedToType === "person") {
    const result = await client.query(
      `SELECT 1
         FROM suite_records
        WHERE tenant_id = $1
          AND agency_id = $2
          AND deleted = false
          AND (key::jsonb)->0 = '["personnel"]'::jsonb
          AND value->>'id' = $3
          AND value->>'unit' = $4
        LIMIT 1`,
      [
        workspaceAuth.tenantId,
        workspaceAuth.agencyId,
        value?.assignedTo,
        ownUnit
      ]
    );

    return result.rows.length > 0;
  }

  return false;
}

function hasAnyAbility(abilityMap, roleIds, abilities) {
  return abilities.some(ability =>
    roleHasAbility(abilityMap, roleIds, ability)
  );
}


async function authorizeFleetQmChange(
  client,
  workspaceAuth,
  abilityMap,
  change,
  existingRow
) {
  const collection = change.path.map(String).join(".");
  const itemId = change.itemId;
  const existingValue = existingRow?.value ?? null;
  const creating = !existingRow || existingRow.deleted === true;
  const deleting = change.deleted === true;
  const incoming = change.value;

  if (collection === "fleet.vehicles") {
    const visible = await fleetVehicleVisible(
      client,
      workspaceAuth,
      abilityMap,
      existingValue || incoming
    );

    if (!visible && !creating) {
      return { allowed:false, error:"You cannot change this collection or record." };
    }

    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "fleet_vehicle_delete"
        ),
        error: "You cannot delete this vehicle."
      };
    }

    if (creating) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "fleet_vehicle_add"
        ),
        error: "You cannot add vehicles."
      };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_vehicle_edit"
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_maint_outofservice"
      ) &&
      incoming?.status === "Out of Service"
    ) {
      const allowedFields = new Set(["status"]);
      const changed = Object.keys(incoming || {}).filter(
        key => JSON.stringify(incoming?.[key]) !== JSON.stringify(existingValue?.[key])
      );

      if (changed.every(field => allowedFields.has(field))) {
        return { allowed:true };
      }
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_vehicle_retire"
      ) &&
      incoming?.status === "Retired"
    ) {
      const allowedFields = new Set(["status","disposal"]);
      const changed = Object.keys(incoming || {}).filter(
        key => JSON.stringify(incoming?.[key]) !== JSON.stringify(existingValue?.[key])
      );

      if (changed.every(field => allowedFields.has(field))) {
        return { allowed:true };
      }
    }

    return { allowed:false, error:"You cannot change this vehicle." };
  }

  if (collection === "fleet.maintenance") {
    const abilities = deleting
      ? ["fleet_maint_log"]
      : creating
        ? ["fleet_maint_log","fleet_maint_schedule"]
        : ["fleet_maint_log","fleet_maint_schedule"];

    return {
      allowed: hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        abilities
      ),
      error: "You cannot change fleet maintenance records."
    };
  }

  if (collection === "fleet.inspections") {
    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "fleet_inspection_delete"
        ),
        error: "You cannot delete fleet inspections."
      };
    }

    return {
      allowed: roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "fleet_inspection_conduct"
      ),
      error: "You cannot conduct fleet inspections."
    };
  }

  if (collection === "qm.equipment") {
    const visible = await qmEquipmentVisible(
      client,
      workspaceAuth,
      abilityMap,
      existingValue || incoming,
      itemId
    );

    if (!visible && !creating) {
      return { allowed:false, error:"You cannot change this collection or record." };
    }

    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "qm_equip_delete"
        ),
        error: "You cannot delete equipment."
      };
    }

    if (creating) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "qm_equip_add"
        ),
        error: "You cannot add equipment."
      };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_equip_edit"
      )
    ) {
      return { allowed:true };
    }

    const changed = Object.keys(incoming || {}).filter(
      key => JSON.stringify(incoming?.[key]) !== JSON.stringify(existingValue?.[key])
    );

    if (
      hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ["qm_assign_checkout","qm_assign_checkin"]
      ) &&
      changed.every(field =>
        ["status","assignedTo","assignedToType"].includes(field)
      ) &&
      ["Assigned","Available"].includes(incoming?.status)
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_equip_retire"
      ) &&
      incoming?.status === "Retired" &&
      changed.every(field =>
        ["status","disposal"].includes(field)
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_maint_outofservice"
      ) &&
      incoming?.status === "Maintenance" &&
      changed.every(field => field === "status")
    ) {
      return { allowed:true };
    }

    return { allowed:false, error:"You cannot change this equipment record." };
  }

  if (collection === "qm.assignments") {
    const abilities = deleting
      ? ["qm_assign_approve"]
      : creating
        ? ["qm_assign_checkout"]
        : ["qm_assign_checkin","qm_assign_approve"];

    return {
      allowed: hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        abilities
      ),
      error: "You cannot change equipment assignments."
    };
  }

  if (collection === "qm.audits") {
    return {
      allowed: roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_audit_conduct"
      ),
      error: "You cannot change quartermaster audits."
    };
  }

  if (collection === "qm.consumptionLog") {
    return {
      allowed: creating
        ? roleHasAbility(
            abilityMap,
            workspaceAuth.roleIds,
            "qm_assign_checkout"
          )
        : roleHasAbility(
            abilityMap,
            workspaceAuth.roleIds,
            "qm_equip_edit"
          ),
      error: "You cannot change consumption records."
    };
  }

  if (collection === "qm.maintenance") {
    return {
      allowed: hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ["qm_maint_log","qm_maint_schedule"]
      ),
      error: "You cannot change quartermaster maintenance records."
    };
  }

  if (collection === "qm.requests") {
    const full = hasAnyAbility(
      abilityMap,
      workspaceAuth.roleIds,
      ["qm_request_approve"]
    );

    if (full) return { allowed:true };

    if (
      !deleting &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "qm_request_submit"
      )
    ) {
      if (
        creating &&
        incoming?.requesterId === workspaceAuth.personId
      ) {
        return { allowed:true };
      }
    }

    return { allowed:false, error:"You cannot change this quartermaster request." };
  }

  return null;
}


function changedFields(beforeValue, afterValue) {
  const before = beforeValue && typeof beforeValue === "object"
    ? beforeValue
    : {};
  const after = afterValue && typeof afterValue === "object"
    ? afterValue
    : {};

  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after)
  ]);

  return [...keys].filter(
    key =>
      JSON.stringify(before?.[key]) !==
      JSON.stringify(after?.[key])
  );
}

function onlyFieldsChanged(beforeValue, afterValue, allowedFields) {
  const allowed = new Set(allowedFields);
  return changedFields(beforeValue, afterValue)
    .every(field => allowed.has(field));
}

async function k9OwnedByPerson(
  client,
  workspaceAuth,
  k9Id
) {
  if (!k9Id || !workspaceAuth.personId) return false;

  const result = await client.query(
    `SELECT 1
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND (key::jsonb)->0 = '["k9","k9s"]'::jsonb
        AND (key::jsonb)->>1 = $3
        AND value->>'handlerId' = $4
      LIMIT 1`,
    [
      workspaceAuth.tenantId,
      workspaceAuth.agencyId,
      k9Id,
      workspaceAuth.personId
    ]
  );

  return result.rows.length > 0;
}

function redactK9RecordForAbilities(
  value,
  abilityMap,
  roleIds
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const copy = structuredClone(value);

  if (
    !roleHasAbility(
      abilityMap,
      roleIds,
      "k9_medical_view"
    )
  ) {
    delete copy.medical;
  }

  if (
    !roleHasAbility(
      abilityMap,
      roleIds,
      "k9_gps_view"
    )
  ) {
    delete copy.locationHistory;
    delete copy.lastKnownLocation;
    delete copy.gpsCollarId;
  }

  return copy;
}

function subpoenaReadable(
  workspaceAuth,
  abilityMap,
  itemId,
  value
) {
  if (
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "subpoena_view_all"
    )
  ) {
    return true;
  }

  if (
    !roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "subpoena_view_own"
    )
  ) {
    return false;
  }

  return (
    itemId === "$order" ||
    itemId === "$value" ||
    value?.personId === workspaceAuth.personId
  );
}

function civilPaperReadable(
  workspaceAuth,
  abilityMap,
  itemId,
  value
) {
  if (
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "civil_paper_view_all"
    )
  ) {
    return true;
  }

  if (
    !roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "civil_paper_view_own"
    )
  ) {
    return false;
  }

  return (
    itemId === "$order" ||
    itemId === "$value" ||
    value?.assignedServerId === workspaceAuth.personId
  );
}


async function authorizeK9SubpoenaCivilChange(
  client,
  workspaceAuth,
  abilityMap,
  change,
  existingRow
) {
  const collection = change.path.map(String).join(".");
  const itemId = change.itemId;
  const beforeValue = existingRow?.value ?? null;
  const creating = !existingRow || existingRow.deleted === true;
  const deleting = change.deleted === true;
  const afterValue = change.value;

  if (collection === "k9.k9s") {
    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "k9_roster_delete"
        ),
        error: "You cannot delete K9 records."
      };
    }

    if (creating) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "k9_roster_edit"
        ),
        error: "You cannot add K9 records."
      };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_roster_edit"
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_medical_manage"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["medical"]
      )
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change this K9 record."
    };
  }

  if (collection === "k9.certifications") {
    const allowed = roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "k9_certification_manage"
    );

    return {
      allowed,
      error:"You cannot change K9 certifications."
    };
  }

  if (
    collection === "k9.deployments" ||
    collection === "k9.incidents" ||
    collection === "k9.trainingSessions"
  ) {
    const isDeployment = collection === "k9.deployments";
    const isIncident = collection === "k9.incidents";
    const ownAbility =
      isDeployment
        ? "k9_deployment_log"
        : isIncident
          ? "k9_incident_manage"
          : "k9_training_manage";

    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "k9_roster_delete"
        ),
        error:`You cannot delete ${collection}.`
      };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "k9_roster_edit"
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ownAbility
      )
    ) {
      const ownerBefore = beforeValue?.handlerId;
      const ownerAfter = afterValue?.handlerId;

      const ownerOk =
        creating
          ? ownerAfter === workspaceAuth.personId
          : (
              ownerBefore === workspaceAuth.personId &&
              ownerAfter === workspaceAuth.personId
            );

      if (
        ownerOk &&
        await k9OwnedByPerson(
          client,
          workspaceAuth,
          afterValue?.k9Id
        )
      ) {
        return { allowed:true };
      }
    }

    return {
      allowed:false,
      error:`You cannot change ${collection}.`
    };
  }

  if (collection === "subpoena.subpoenas") {
    if (
      deleting &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_manage"
      )
    ) {
      return { allowed:true };
    }

    if (
      !deleting &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_manage"
      )
    ) {
      return { allowed:true };
    }

    const canSeeRecord =
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_view_all"
      ) ||
      beforeValue?.personId === workspaceAuth.personId;

    if (
      !creating &&
      !deleting &&
      canSeeRecord &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_document_upload"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["attachments","fieldHistory"]
      )
    ) {
      return { allowed:true };
    }

    if (
      !creating &&
      !deleting &&
      canSeeRecord &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_notify"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["notifiedDate","notifiedBy","fieldHistory"]
      )
    ) {
      return { allowed:true };
    }

    if (
      !creating &&
      !deleting &&
      beforeValue?.personId === workspaceAuth.personId &&
      afterValue?.personId === workspaceAuth.personId &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "subpoena_acknowledge"
      ) &&
      afterValue?.acknowledgedBy === workspaceAuth.personId &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["acknowledgedDate","acknowledgedBy","fieldHistory"]
      )
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change this subpoena."
    };
  }

  if (collection === "civil.cashierReconciliations") {
    const allowed = roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "civil_fee_manage"
    );

    return {
      allowed,
      error:"You cannot change civil cashier reconciliations."
    };
  }

  if (collection === "civil.enforcements") {
    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "civil_paper_intake"
        ),
        error:"You cannot delete civil enforcement records."
      };
    }

    return {
      allowed: hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        ["civil_paper_intake","civil_fee_manage"]
      ),
      error:"You cannot change civil enforcement records."
    };
  }

  if (collection === "civil.papers") {
    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_paper_intake"
      )
    ) {
      return { allowed:true };
    }

    const canSeeRecord =
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_paper_view_all"
      ) ||
      beforeValue?.assignedServerId === workspaceAuth.personId;

    if (
      !creating &&
      !deleting &&
      canSeeRecord &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_document_generate"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["generatedDocuments","fieldHistory"]
      )
    ) {
      return { allowed:true };
    }

    if (
      !creating &&
      !deleting &&
      canSeeRecord &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_fee_manage"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["feePayments","deposits","feeLineItems","fieldHistory"]
      )
    ) {
      return { allowed:true };
    }

    if (
      !creating &&
      !deleting &&
      beforeValue?.assignedServerId === workspaceAuth.personId &&
      afterValue?.assignedServerId === workspaceAuth.personId &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "civil_paper_log_attempt"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        [
          "attempts",
          "stage",
          "servedDate",
          "servedTime",
          "servedOnName",
          "serviceMethod",
          "mileage",
          "fieldHistory",
          "notes"
        ]
      )
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change this civil paper."
    };
  }

  return null;
}


const MODULE_SIDE_EFFECT_ABILITIES = {
  drone: {
    read: [
      "drone_fleet_view",
      "drone_flight_view",
      "drone_incident_view",
      "drone_maint_view",
      "drone_operator_view",
      "module_drone"
    ],
    write: [
      "drone_fleet_edit",
      "drone_fleet_delete",
      "drone_operator_manage",
      "drone_flight_log",
      "drone_incident_manage",
      "drone_maint_manage",
      "drone_admin_categories"
    ]
  },
  eod: {
    read: [
      "eod_incident_view",
      "eod_inventory_view",
      "eod_magazine_view",
      "eod_technician_view",
      "eod_theft_report_view",
      "module_eod"
    ],
    write: [
      "eod_technician_manage",
      "eod_inventory_manage",
      "eod_magazine_manage",
      "eod_inspection_log",
      "eod_theft_report_manage",
      "eod_incident_log",
      "eod_admin_categories"
    ]
  },
  grants: {
    read: [
      "grants_award_view",
      "grants_seizure_view",
      "module_grants"
    ],
    write: [
      "grants_award_manage",
      "grants_seizure_manage",
      "grants_admin_categories"
    ]
  }
};

function moduleSideEffectAllowed(
  abilityMap,
  roleIds,
  moduleName,
  writeCheck
) {
  const config = MODULE_SIDE_EFFECT_ABILITIES[moduleName];
  if (!config) return false;

  const moduleAbility = `module_${moduleName}`;

  if (!roleHasAbility(abilityMap, roleIds, moduleAbility)) {
    return false;
  }

  const abilities = writeCheck ? config.write : config.read;
  return hasAnyAbility(abilityMap, roleIds, abilities);
}

function redactEodIncidentForAbilities(
  value,
  abilityMap,
  roleIds
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const copy = structuredClone(value);

  if (
    !roleHasAbility(
      abilityMap,
      roleIds,
      "eod_rsp_view"
    )
  ) {
    delete copy.rsp;
  }

  return copy;
}

function arrayIsAppendOnly(beforeValue, afterValue) {
  if (!Array.isArray(afterValue)) return false;
  if (!Array.isArray(beforeValue)) return true;
  if (afterValue.length < beforeValue.length) return false;

  for (let i = 0; i < beforeValue.length; i += 1) {
    if (
      JSON.stringify(afterValue[i]) !==
      JSON.stringify(beforeValue[i])
    ) {
      return false;
    }
  }

  return true;
}


async function authorizeDroneEodGrantsChange(
  workspaceAuth,
  abilityMap,
  change,
  existingRow
) {
  const collection = change.path.map(String).join(".");
  const itemId = change.itemId;
  const beforeValue = existingRow?.value ?? null;
  const creating = !existingRow || existingRow.deleted === true;
  const deleting = change.deleted === true;
  const afterValue = change.value;

  const simpleRules = {
    "drone.drones": {
      create: ["drone_fleet_edit"],
      update: ["drone_fleet_edit"],
      delete: ["drone_fleet_delete"]
    },
    "drone.incidents": {
      create: ["drone_incident_manage"],
      update: ["drone_incident_manage"],
      delete: ["drone_incident_manage"]
    },
    "drone.maintenanceRecords": {
      create: ["drone_maint_manage"],
      update: ["drone_maint_manage"],
      delete: ["drone_maint_manage"]
    },
    "drone.operators": {
      create: ["drone_operator_manage"],
      update: ["drone_operator_manage"],
      delete: ["drone_operator_manage"]
    },
    "eod.inventory": {
      create: ["eod_inventory_manage"],
      update: ["eod_inventory_manage"],
      delete: ["eod_inventory_manage"]
    },
    "eod.magazines": {
      create: ["eod_magazine_manage"],
      update: ["eod_magazine_manage"],
      delete: ["eod_magazine_manage"]
    },
    "eod.technicians": {
      create: ["eod_technician_manage"],
      update: ["eod_technician_manage"],
      delete: ["eod_technician_manage"]
    },
    "eod.theftLossReports": {
      create: ["eod_theft_report_manage"],
      update: ["eod_theft_report_manage"],
      delete: ["eod_theft_report_manage"]
    },
    "grants.grants": {
      create: ["grants_award_manage"],
      update: ["grants_award_manage"],
      delete: ["grants_award_manage"]
    },
    "grants.seizures": {
      create: ["grants_seizure_manage"],
      update: ["grants_seizure_manage"],
      delete: ["grants_seizure_manage"]
    }
  };

  if (simpleRules[collection]) {
    const phase = deleting
      ? "delete"
      : creating
        ? "create"
        : "update";

    return {
      allowed: hasAnyAbility(
        abilityMap,
        workspaceAuth.roleIds,
        simpleRules[collection][phase]
      ),
      error: `You cannot ${phase} ${collection}.`
    };
  }

  if (collection === "drone.flights") {
    if (deleting) {
      return {
        allowed: roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "drone_operator_manage"
        ),
        error: "You cannot delete drone flights."
      };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_operator_manage"
      )
    ) {
      return { allowed:true };
    }

    if (
      creating &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "drone_flight_log"
      ) &&
      afterValue?.operatorId === workspaceAuth.personId
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change this drone flight."
    };
  }

  if (collection === "eod.incidents") {
    // Supabase's current ability_can_write() requires full technician-manage
    // because this collection's configured owner_field is null.
    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_technician_manage"
      )
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change EOD incidents."
    };
  }

  if (collection === "eod.magazineInspections") {
    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_magazine_manage"
      )
    ) {
      return { allowed:true };
    }

    if (
      creating &&
      !deleting &&
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "eod_inspection_log"
      ) &&
      afterValue?.inspectorId === workspaceAuth.personId
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot change EOD magazine inspections."
    };
  }

  const refDataRules = {
    "drone.refData": "drone_admin_categories",
    "eod.refData": "eod_admin_categories",
    "grants.refData": "grants_admin_categories"
  };

  if (refDataRules[collection]) {
    return {
      allowed: roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        refDataRules[collection]
      ),
      error:`You cannot change ${collection}.`
    };
  }

  const sideEffectMatch =
    collection.match(/^(drone|eod|grants)\\.(activity|notifications)$/);

  if (sideEffectMatch) {
    const moduleName = sideEffectMatch[1];

    if (
      deleting ||
      !moduleSideEffectAllowed(
        abilityMap,
        workspaceAuth.roleIds,
        moduleName,
        true
      )
    ) {
      return {
        allowed:false,
        error:`You cannot change ${collection}.`
      };
    }

    if (itemId === "$order") {
      return { allowed:true };
    }

    if (arrayIsAppendOnly(beforeValue, afterValue)) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:`${collection} may only be appended to.`
    };
  }

  return null;
}


const PM_COLLECTION_RULES = {
  "pm.bidCycles": {
    read: ["pm_bidding_view", "pm_bidding_manage"],
    create: ["pm_bidding_manage"],
    update: ["pm_bidding_manage"],
    delete: ["pm_bidding_manage"]
  },
  "pm.disciplinaryActions": {
    read: ["pm_discipline_view"],
    create: ["pm_discipline_manage"],
    update: ["pm_discipline_manage"],
    delete: ["pm_discipline_manage"]
  },
  "pm.extraDutyJobs": {
    read: ["pm_extraduty_view", "pm_extraduty_manage"],
    create: ["pm_extraduty_manage"],
    update: ["pm_extraduty_manage"],
    delete: ["pm_extraduty_manage"]
  },
  "pm.extraDutySignups": {
    read: ["pm_extraduty_manage", "pm_extraduty_view"],
    create: ["pm_extraduty_manage"],
    update: ["pm_extraduty_manage"],
    delete: ["pm_extraduty_manage"],
    ownerField: "personId",
    ownCreate: "pm_extraduty_signup"
  },
  "pm.inquiries": {
    read: ["pm_inquiries_view"],
    create: ["pm_inquiries_manage"],
    update: ["pm_inquiries_manage"],
    delete: ["pm_inquiries_manage"]
  },
  "pm.instructors": {
    read: ["pm_instructor_manage"],
    create: ["pm_instructor_manage"],
    update: ["pm_instructor_manage"],
    delete: ["pm_instructor_manage"]
  },
  "pm.otCallbackOptIns": {
    read: ["pm_overtime_view", "pm_overtime_manage"],
    create: ["pm_overtime_manage"],
    update: ["pm_overtime_manage"],
    delete: ["pm_overtime_manage"],
    ownerField: "personId",
    ownCreate: "pm_overtime_optin",
    ownUpdate: "pm_overtime_optin"
  },
  "pm.records": {
    read: ["pm_records_view"],
    create: ["pm_records_edit"],
    update: ["pm_records_edit"],
    delete: ["pm_records_delete"]
  },
  "pm.rollCalls": {
    read: ["pm_rollcall_view", "pm_rollcall_manage"],
    create: ["pm_rollcall_manage"],
    update: ["pm_rollcall_manage"],
    delete: ["pm_rollcall_manage"]
  },
  "pm.scheduleAssignments": {
    read: ["pm_schedule_view"],
    create: ["pm_schedule_manage"],
    update: ["pm_schedule_manage"],
    delete: ["pm_schedule_manage"]
  },
  "pm.scheduleCoverages": {
    read: ["pm_schedule_view", "pm_overtime_view"],
    create: ["pm_overtime_manage", "pm_schedule_manage"],
    update: ["pm_overtime_manage", "pm_schedule_manage"],
    delete: ["pm_overtime_manage", "pm_schedule_manage"]
  },
  "pm.scheduleExceptions": {
    read: ["pm_schedule_view"],
    create: ["pm_schedule_manage", "pm_leave_request_approve"],
    update: ["pm_schedule_manage", "pm_leave_request_approve"],
    delete: ["pm_schedule_manage"]
  },
  "pm.scheduleShifts": {
    read: ["pm_schedule_view"],
    create: ["pm_schedule_manage"],
    update: ["pm_schedule_manage"],
    delete: ["pm_schedule_manage"]
  },
  "pm.schedulingSettings": {
    read: ["pm_schedule_view"],
    create: ["pm_schedule_manage"],
    update: ["pm_schedule_manage"],
    delete: ["pm_schedule_manage"]
  },
  "pm.shiftSwapRequests": {
    read: ["pm_schedule_view"],
    create: ["pm_schedule_manage"],
    update: ["pm_schedule_manage"],
    delete: ["pm_schedule_manage"]
  },
  "pm.trainingCourses": {
    read: ["pm_training_view_own", "pm_training_manage", "pm_instructor_manage"],
    create: ["pm_instructor_manage"],
    update: ["pm_instructor_manage"],
    delete: ["pm_instructor_manage"]
  },
  "pm.trainingRecords": {
    read: ["pm_training_manage"],
    create: ["pm_training_manage"],
    update: ["pm_training_manage"],
    delete: ["pm_training_manage"],
    ownerField: "personId",
    ownRead: "pm_training_view_own"
  },
  "pm.trainingRequests": {
    read: ["pm_training_manage"],
    create: ["pm_training_manage"],
    update: ["pm_training_manage"],
    delete: ["pm_training_manage"],
    ownerField: "personId",
    ownRead: "pm_training_request",
    ownCreate: "pm_training_request"
  },
  "pm.trainingSessions": {
    read: ["pm_training_view_own", "pm_training_manage", "pm_instructor_manage"],
    create: ["pm_training_manage", "pm_instructor_manage"],
    update: ["pm_training_manage", "pm_instructor_manage"],
    delete: ["pm_training_manage"]
  }
};

function pmRecordReadable(
  workspaceAuth,
  abilityMap,
  collection,
  itemId,
  value
) {
  const rule = PM_COLLECTION_RULES[collection];
  if (!rule) return false;

  if (
    hasAnyAbility(
      abilityMap,
      workspaceAuth.roleIds,
      rule.read || []
    )
  ) {
    return true;
  }

  if (
    rule.ownRead &&
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      rule.ownRead
    )
  ) {
    return (
      itemId === "$order" ||
      itemId === "$value" ||
      (
        rule.ownerField &&
        value?.[rule.ownerField] === workspaceAuth.personId
      )
    );
  }

  return false;
}

function redactPmRecord(
  value,
  abilityMap,
  roleIds
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const copy = structuredClone(value);

  if (
    !roleHasAbility(
      abilityMap,
      roleIds,
      "pm_medical_view"
    )
  ) {
    delete copy.medical;
    delete copy.bloodType;
  }

  if (
    !roleHasAbility(
      abilityMap,
      roleIds,
      "pm_lodd_view"
    )
  ) {
    delete copy.lodd;
  }

  return copy;
}

function sharedCollectionReadable(
  workspaceAuth,
  abilityMap,
  collection
) {
  if (collection === "agencyBranding") {
    return roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "manage_branding"
    );
  }

  if (collection === "fieldLabels") {
    return roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "manage_field_labels"
    );
  }

  if (collection === "personnel") {
    return true;
  }

  return false;
}


async function authorizePersonnelSharedChange(
  client,
  workspaceAuth,
  abilityMap,
  change,
  existingRow
) {
  const collection = change.path.map(String).join(".");
  const itemId = change.itemId;
  const beforeValue = existingRow?.value ?? null;
  const creating = !existingRow || existingRow.deleted === true;
  const deleting = change.deleted === true;
  const afterValue = change.value;

  if (collection === "agencyBranding") {
    return {
      allowed:
        !creating &&
        !deleting &&
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "manage_branding"
        ),
      error: "You cannot change agency branding."
    };
  }

  if (collection === "fieldLabels") {
    return {
      allowed:
        !creating &&
        !deleting &&
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          "manage_field_labels"
        ),
      error: "You cannot change field labels."
    };
  }

  if (collection === "personnel") {
    return {
      allowed: roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "personnel_manage"
      ),
      error: "You cannot change personnel records."
    };
  }

  const rule = PM_COLLECTION_RULES[collection];
  if (!rule) return null;

  const phase = deleting
    ? "delete"
    : creating
      ? "create"
      : "update";

  if (
    hasAnyAbility(
      abilityMap,
      workspaceAuth.roleIds,
      rule[phase] || []
    )
  ) {
    return { allowed:true };
  }

  if (
    creating &&
    rule.ownCreate &&
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      rule.ownCreate
    ) &&
    rule.ownerField &&
    afterValue?.[rule.ownerField] === workspaceAuth.personId
  ) {
    return { allowed:true };
  }

  if (
    !creating &&
    !deleting &&
    rule.ownUpdate &&
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      rule.ownUpdate
    ) &&
    rule.ownerField &&
    beforeValue?.[rule.ownerField] === workspaceAuth.personId &&
    afterValue?.[rule.ownerField] === workspaceAuth.personId
  ) {
    return { allowed:true };
  }

  if (
    collection === "pm.records" &&
    !creating &&
    !deleting
  ) {
    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "pm_medical_manage"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["medical","bloodType"]
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "pm_lodd_manage"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["lodd"]
      )
    ) {
      return { allowed:true };
    }

    if (
      roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "pm_documents_manage"
      ) &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["documents"]
      )
    ) {
      return { allowed:true };
    }
  }

  if (
    collection === "pm.bidCycles" &&
    !creating &&
    !deleting &&
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_bidding_submit"
    )
  ) {
    const unchangedOutsideSubmissions =
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        ["submissions"]
      );

    if (unchangedOutsideSubmissions) {
      const beforeSubmissions = Array.isArray(beforeValue?.submissions)
        ? beforeValue.submissions
        : [];
      const afterSubmissions = Array.isArray(afterValue?.submissions)
        ? afterValue.submissions
        : [];

      const otherBefore = beforeSubmissions.filter(
        item => item?.personId !== workspaceAuth.personId
      );
      const otherAfter = afterSubmissions.filter(
        item => item?.personId !== workspaceAuth.personId
      );

      const ownCount = afterSubmissions.filter(
        item => item?.personId === workspaceAuth.personId
      ).length;

      const now = new Date();
      const today = now.toISOString().slice(0,10);
      const opens = beforeValue?.opensDate;
      const closes = beforeValue?.closesDate;

      if (
        beforeValue?.status === "open" &&
        opens &&
        closes &&
        today >= opens &&
        today <= closes &&
        JSON.stringify(otherBefore) === JSON.stringify(otherAfter) &&
        ownCount <= 1
      ) {
        return { allowed:true };
      }
    }
  }

  return {
    allowed:false,
    error:`You cannot change ${collection}.`
  };
}


function safeAttachmentName(name) {
  const raw = String(name || "attachment");
  const cleaned = raw
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180);

  return cleaned || "attachment";
}

function makeAttachmentKey(tenantId, agencyId, fileName) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  return [
    "tenants",
    tenantId,
    "agencies",
    agencyId,
    "attachments",
    `${stamp}_${crypto.randomUUID()}_${safeAttachmentName(fileName)}`
  ].join("/");
}

function attachmentKeyAllowed(
  key,
  tenantId,
  agencyId
) {
  if (typeof key !== "string" || !key.length) {
    return false;
  }

  return key.startsWith(
    `tenants/${tenantId}/agencies/${agencyId}/attachments/`
  );
}

async function createAttachmentUploadUrl(
  client,
  auth,
  body
) {
  if (!ATTACHMENTS_BUCKET) {
    return response(500, {
      success: false,
      error: "ATTACHMENTS_BUCKET is not configured."
    });
  }

  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const fileName = body?.file_name || body?.fileName;
  const contentType =
    body?.content_type ||
    body?.contentType ||
    "application/octet-stream";

  const sizeBytes = Number(
    body?.size_bytes ??
    body?.sizeBytes ??
    0
  );

  if (!tenantId || !agencyId || !fileName) {
    return response(400, {
      success: false,
      error:
        "tenant_id, agency_id, and file_name are required."
    });
  }

  if (
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0 ||
    sizeBytes > 25 * 1024 * 1024
  ) {
    return response(400, {
      success: false,
      error: "Attachments are limited to 25 MB."
    });
  }

  const workspaceAuth =
    await resolveWorkspaceMembership(
      client,
      auth,
      tenantId,
      agencyId
    );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  const key = makeAttachmentKey(
    tenantId,
    agencyId,
    fileName
  );

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: ATTACHMENTS_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        tenant_id: tenantId,
        agency_id: agencyId,
        uploaded_by: auth.userId
      }
    }),
    { expiresIn: 300 }
  );

  return response(200, {
    success: true,
    key,
    upload_url: uploadUrl,
    expires_in: 300,
    max_size_bytes: 25 * 1024 * 1024
  });
}

async function createAttachmentDownloadUrl(
  client,
  auth,
  body
) {
  if (!ATTACHMENTS_BUCKET) {
    return response(500, {
      success: false,
      error: "ATTACHMENTS_BUCKET is not configured."
    });
  }

  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const key = body?.key;

  if (!tenantId || !agencyId || !key) {
    return response(400, {
      success: false,
      error: "tenant_id, agency_id, and key are required."
    });
  }

  const workspaceAuth =
    await resolveWorkspaceMembership(
      client,
      auth,
      tenantId,
      agencyId
    );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  if (
    !attachmentKeyAllowed(
      key,
      tenantId,
      agencyId
    )
  ) {
    return response(403, {
      success: false,
      error: "Attachment does not belong to this workspace."
    });
  }

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: ATTACHMENTS_BUCKET,
      Key: key
    }),
    { expiresIn: 300 }
  );

  return response(200, {
    success: true,
    key,
    download_url: downloadUrl,
    expires_in: 300
  });
}

async function deleteAttachment(
  client,
  auth,
  body
) {
  if (!ATTACHMENTS_BUCKET) {
    return response(500, {
      success: false,
      error: "ATTACHMENTS_BUCKET is not configured."
    });
  }

  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const key = body?.key;

  if (!tenantId || !agencyId || !key) {
    return response(400, {
      success: false,
      error: "tenant_id, agency_id, and key are required."
    });
  }

  const workspaceAuth =
    await resolveWorkspaceMembership(
      client,
      auth,
      tenantId,
      agencyId
    );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  if (
    !attachmentKeyAllowed(
      key,
      tenantId,
      agencyId
    )
  ) {
    return response(403, {
      success: false,
      error: "Attachment does not belong to this workspace."
    });
  }

  if (!workspaceAuth.admin) {
    return response(403, {
      success: false,
      error:
        "Attachment deletion is currently limited to agency administrators."
    });
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: ATTACHMENTS_BUCKET,
      Key: key
    })
  );

  return response(200, {
    success: true,
    key,
    deleted: true
  });
}


async function attachmentSmokeTest(
  client,
  auth,
  body
) {
  if (!ATTACHMENTS_BUCKET) {
    return response(500, {
      success: false,
      error: "ATTACHMENTS_BUCKET is not configured."
    });
  }

  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;

  if (!tenantId || !agencyId) {
    return response(400, {
      success: false,
      error: "tenant_id and agency_id are required."
    });
  }

  const workspaceAuth =
    await resolveWorkspaceMembership(
      client,
      auth,
      tenantId,
      agencyId
    );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  if (!workspaceAuth.admin) {
    return response(403, {
      success: false,
      error: "Attachment smoke test is admin-only."
    });
  }

  const key =
    `tenants/${tenantId}/agencies/${agencyId}/attachments/` +
    `lambda-smoke-test-${Date.now()}.txt`;

  const bodyText =
    "SonoMarzi AWS attachment smoke test.";

  await s3.send(
    new PutObjectCommand({
      Bucket: ATTACHMENTS_BUCKET,
      Key: key,
      Body: bodyText,
      ContentType: "text/plain",
      Metadata: {
        tenant_id: tenantId,
        agency_id: agencyId,
        uploaded_by: auth.userId,
        smoke_test: "true"
      }
    })
  );

  return response(200, {
    success: true,
    bucket: ATTACHMENTS_BUCKET,
    key,
    bytes: Buffer.byteLength(bodyText),
    message: "S3 PutObject succeeded."
  });
}

async function getMe(client, auth) {
  await ensureAgencySubdomainSchema(client);
  const memberships = await client.query(
    `SELECT m.tenant_id, m.agency_id, m.person_id, m.role_ids, m.status,
            t.slug AS tenant_slug, t.name AS tenant_name, t.timezone, t.plan, t.status AS tenant_status, t.enabled_modules,
            a.name AS agency_name, a.abbreviation, a.agency_type, a.status AS agency_status, a.subdomain
       FROM suite_memberships m
       JOIN suite_tenants t ON t.id = m.tenant_id
       JOIN suite_agencies a ON a.tenant_id = m.tenant_id AND a.id = m.agency_id
      WHERE m.user_id = $1
      ORDER BY t.name, a.name`,
    [auth.userId]
  );

  return response(200, {
    success: true,
    user: {
      id: auth.userId,
      email: auth.email,
      display_name: auth.displayName,
      platform_admin: auth.platformAdmin
    },
    memberships: memberships.rows
  });
}

async function getWorkspace(client, auth, event) {
  await ensureAgencySubdomainSchema(client);
  const params = event?.queryStringParameters || {};
  let tenantId = params.tenantId || params.tenant_id || null;
  let agencyId = params.agencyId || params.agency_id || null;
  const requestedSubdomain = String(params.subdomain || '').trim().toLowerCase();

  if (requestedSubdomain) {
    let subdomain;
    try { subdomain = cleanAgencySubdomain(requestedSubdomain); }
    catch (error) { return response(400, { success: false, error: error.message }); }
    const target = await client.query(
      `SELECT tenant_id, id AS agency_id FROM suite_agencies WHERE lower(subdomain)=lower($1) AND status <> 'suspended' LIMIT 1`,
      [subdomain]
    );
    if (!target.rows.length) return response(404, { success: false, error: 'Agency URL is not configured.' });
    tenantId = target.rows[0].tenant_id;
    agencyId = target.rows[0].agency_id;
  }

  const memberships = await client.query(
    `SELECT tenant_id, agency_id, person_id, role_ids, status
       FROM suite_memberships
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at`,
    [auth.userId]
  );

  let membership = null;

  if (tenantId || agencyId) {
    if (!tenantId || !agencyId) {
      return response(400, { success: false, error: "Both tenantId and agencyId are required when selecting a workspace." });
    }
    membership = memberships.rows.find(r => r.tenant_id === tenantId && r.agency_id === agencyId) || null;
    if (!membership && !auth.platformAdmin) {
      return response(403, { success: false, error: "Active agency membership required." });
    }
  } else if (memberships.rows.length === 1) {
    membership = memberships.rows[0];
    tenantId = membership.tenant_id;
    agencyId = membership.agency_id;
  } else if (memberships.rows.length > 1) {
    return response(409, { success: false, error: "Workspace selection required.", memberships: memberships.rows });
  } else if (auth.platformAdmin) {
    return response(409, { success: false, error: "Workspace selection required for platform administrator." });
  } else {
    return response(403, { success: false, error: "No active agency membership found." });
  }

  if (!membership && auth.platformAdmin) {
    const target = await client.query(
      `SELECT t.id AS tenant_id, a.id AS agency_id
         FROM suite_tenants t
         JOIN suite_agencies a ON a.tenant_id = t.id
        WHERE t.id = $1 AND a.id = $2
        LIMIT 1`,
      [tenantId, agencyId]
    );
    if (!target.rows.length) {
      return response(404, { success: false, error: "Workspace not found." });
    }
  }

  const workspaceAuth = await resolveWorkspaceMembership(
    client,
    auth,
    tenantId,
    agencyId
  );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  const tenantResult = await client.query(
    `SELECT id, slug, name, timezone, plan, status, enabled_modules, metadata
       FROM suite_tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  const agencyResult = await client.query(
    `SELECT id, tenant_id, name, abbreviation, agency_type, ori, status, branding, subdomain
       FROM suite_agencies WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, agencyId]
  );

  if (!tenantResult.rows.length || !agencyResult.rows.length) {
    return response(404, { success: false, error: "Workspace not found." });
  }

  const recordsResult = await client.query(
    `SELECT key, value, version, deleted, updated_at, updated_by
       FROM suite_records
      WHERE tenant_id = $1 AND agency_id = $2
      ORDER BY key`,
    [tenantId, agencyId]
  );

  const workspaceRecords = workspaceAuth.admin
    ? recordsResult.rows
    : await filterOfficerWorkspaceRecords(
        client,
        workspaceAuth,
        recordsResult.rows
      );

  const templateResult = await client.query(
    `SELECT empty_state
       FROM suite_templates
      WHERE tenant_id = $1 AND agency_id = $2
      LIMIT 1`,
    [tenantId, agencyId]
  );

  const personId = workspaceAuth.personId;
  const roleIds = [
    ...new Set([
      ...workspaceAuth.roleIds,
      ...(auth.platformAdmin ? ["role_platform_admin"] : [])
    ])
  ];

  return response(200, {
    success: true,
    tenant_id: tenantId,
    agency_id: agencyId,
    person_id: personId,
    role_ids: roleIds,
    records: workspaceRecords,
    template: templateResult.rows[0]?.empty_state || {},
    tenant: tenantResult.rows[0],
    agency: agencyResult.rows[0]
  });
}



/*
 * ---------------------------------------------------------
 * PERMANENT AWS APPLY-CHANGES FOUNDATION
 * ---------------------------------------------------------
 * Phase 2 exact authorization port:
 * - platform admins and agency role_admin remain unrestricted
 * - ordinary agency users can load the officer-safe workspace subset
 * - officer self-service training check-ins and leave requests are
 *   ability-gated, owner-scoped, create/update-only, and atomic
 * Fleet, Quartermaster, K9, Civil, Subpoena, Drone, EOD, and Grants
 * principal authorization rules are now ported.
 * Activity/notification append-only side effects are enabled for
 * Drone/EOD/Grants when module abilities permit them.
 * Personnel specialty rules and shared personnel/branding/field-label
 * authorization are now ported as well.
 * The remaining AWS migration work is ancillary services (attachments,
 * notices/email, audit/event persistence) plus regression testing and cleanup.
 */
function parseRecordKey(key) {
  if (typeof key !== "string" || !key.length || key.length > 4096) {
    throw new Error("Invalid record key.");
  }

  let decoded;
  try {
    decoded = JSON.parse(key);
  } catch {
    throw new Error("Invalid record key.");
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length !== 2 ||
    !Array.isArray(decoded[0]) ||
    decoded[0].length === 0 ||
    typeof decoded[1] !== "string"
  ) {
    throw new Error("Invalid record key.");
  }

  return { path: decoded[0], itemId: decoded[1] };
}

function validateApplyChange(change) {
  if (!change || typeof change !== "object") {
    throw new Error("Invalid change.");
  }

  const { path, itemId } = parseRecordKey(change.key);
  const expectedVersion = Number(change.expected_version);

  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error("Invalid expected_version.");
  }

  if (typeof change.deleted !== "boolean") {
    throw new Error("Invalid deleted flag.");
  }

  // Preserve the existing application's explicit server-side boundaries.
  const root = String(path[0] ?? "");
  if (["accounts", "currentRoleIds", "currentRoleId", "auditLog"].includes(root)) {
    throw new Error(`Writes to ${root} are not permitted.`);
  }

  // "$order" is valid only as the item id for a real collection path.
  if (itemId.startsWith("$") && itemId !== "$order" && itemId !== "$value") {
    throw new Error("Reserved record item id is not writable.");
  }

  return {
    key: change.key,
    value: change.value ?? null,
    deleted: change.deleted,
    expectedVersion,
    path,
    itemId
  };
}

async function applyChanges(client, auth, body) {
  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const changes = body?.changes || body?.p_changes;

  if (!tenantId || !agencyId) {
    return response(400, {
      success: false,
      error: "tenant_id and agency_id are required."
    });
  }

  if (!Array.isArray(changes) || changes.length === 0) {
    return response(400, {
      success: false,
      error: "A non-empty changes array is required."
    });
  }

  if (changes.length > 5000) {
    return response(400, {
      success: false,
      error: "Invalid change batch."
    });
  }

  const workspaceAuth = await resolveWorkspaceMembership(
    client,
    auth,
    tenantId,
    agencyId
  );

  if (workspaceAuth.error) {
    return workspaceAuth.error;
  }

  let validated;
  try {
    validated = changes.map(validateApplyChange);
  } catch (error) {
    return response(400, { success: false, error: error.message });
  }

  const duplicateKeys = validated
    .map(change => change.key)
    .filter((key, index, all) => all.indexOf(key) !== index);

  if (duplicateKeys.length) {
    return response(400, {
      success: false,
      error: "A batch cannot contain the same record key more than once."
    });
  }

  const abilityMap = workspaceAuth.admin
    ? new Map()
    : await loadRoleAbilityMap(
        client,
        tenantId,
        agencyId,
        workspaceAuth.roleIds
      );

  await client.query("BEGIN");

  try {
    const results = [];

    for (const change of validated) {
      const existing = await client.query(
        `SELECT version, deleted, value
           FROM suite_records
          WHERE tenant_id = $1
            AND agency_id = $2
            AND key = $3
          FOR UPDATE`,
        [tenantId, agencyId, change.key]
      );

      const currentVersion = existing.rows.length
        ? Number(existing.rows[0].version)
        : 0;

      if (currentVersion !== change.expectedVersion) {
        const conflict = new Error(
          "Record changed in another session. Reload before retrying."
        );
        conflict.code = "40001";
        throw conflict;
      }

      if (!workspaceAuth.admin) {
        let decision = await authorizeOfficerSelfServiceChange(
          client,
          workspaceAuth,
          abilityMap,
          change,
          existing.rows[0] || null,
          validated
        );

        if (!decision.allowed) {
          const fleetQmDecision = await authorizeFleetQmChange(
            client,
            workspaceAuth,
            abilityMap,
            change,
            existing.rows[0] || null
          );

          if (fleetQmDecision) {
            decision = fleetQmDecision;
          }
        }

        if (!decision.allowed) {
          const k9SubpoenaCivilDecision =
            await authorizeK9SubpoenaCivilChange(
              client,
              workspaceAuth,
              abilityMap,
              change,
              existing.rows[0] || null
            );

          if (k9SubpoenaCivilDecision) {
            decision = k9SubpoenaCivilDecision;
          }
        }

        if (!decision.allowed) {
          const droneEodGrantsDecision =
            await authorizeDroneEodGrantsChange(
              workspaceAuth,
              abilityMap,
              change,
              existing.rows[0] || null
            );

          if (droneEodGrantsDecision) {
            decision = droneEodGrantsDecision;
          }
        }

        if (!decision.allowed) {
          const personnelSharedDecision =
            await authorizePersonnelSharedChange(
              client,
              workspaceAuth,
              abilityMap,
              change,
              existing.rows[0] || null
            );

          if (personnelSharedDecision) {
            decision = personnelSharedDecision;
          }
        }

        if (!decision.allowed) {
          const denied = new Error(
            decision.error ||
            "You cannot change this collection or record."
          );
          denied.code = "42501";
          throw denied;
        }
      }

      const nextVersion = currentVersion + 1;

      if (!existing.rows.length) {
        await client.query(
          `INSERT INTO suite_records
             (tenant_id, agency_id, key, value, version, deleted, updated_at, updated_by)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, now(), $7)`,
          [
            tenantId,
            agencyId,
            change.key,
            JSON.stringify(change.value),
            nextVersion,
            change.deleted,
            auth.userId
          ]
        );
      } else {
        await client.query(
          `UPDATE suite_records
              SET value = $4::jsonb,
                  version = $5,
                  deleted = $6,
                  updated_at = now(),
                  updated_by = $7
            WHERE tenant_id = $1
              AND agency_id = $2
              AND key = $3`,
          [
            tenantId,
            agencyId,
            change.key,
            JSON.stringify(change.value),
            nextVersion,
            change.deleted,
            auth.userId
          ]
        );
      }

      results.push({
        key: change.key,
        version: nextVersion
      });
    }

    await client.query("COMMIT");

    // Match the useful shape consumed by the current SuiteStore:
    // an array of {key, version} rows.
    return response(200, results);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error?.code === "40001") {
      return response(409, {
        success: false,
        code: "40001",
        error: "Record changed in another session. Reload before retrying."
      });
    }

    if (error?.code === "42501") {
      return response(403, {
        success: false,
        code: "42501",
        error: error.message
      });
    }

    throw error;
  }
}


/*
 * ---------------------------------------------------------
 * CONTROLLED AWS WRITE-PATH PROOF
 * ---------------------------------------------------------
 * Platform-admin only. Uses a reserved test key, exercises
 * create/read/version-conflict/update/soft-delete, then removes
 * the test row so the Demo PD workspace is left unchanged.
 */
async function runWritePathProof(client, authUserId) {
  const testKey = "__aws_write_path_test__/smoke";
  const tenantId = DEMO_TENANT_ID;
  const agencyId = DEMO_AGENCY_ID;

  await client.query("BEGIN");

  try {
    const existing = await client.query(
      `SELECT version, deleted
         FROM suite_records
        WHERE tenant_id = $1 AND agency_id = $2 AND key = $3
        FOR UPDATE`,
      [tenantId, agencyId, testKey]
    );

    if (existing.rows.length) {
      throw new Error("Reserved AWS write-test record already exists; refusing to overwrite it.");
    }

    const created = await client.query(
      `INSERT INTO suite_records
         (tenant_id, agency_id, key, value, version, deleted, updated_at, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, 1, false, now(), $5)
       RETURNING key, value, version, deleted, updated_at, updated_by`,
      [
        tenantId,
        agencyId,
        testKey,
        JSON.stringify({ test: true, phase: "created" }),
        authUserId
      ]
    );

    const readBack = await client.query(
      `SELECT key, value, version, deleted, updated_at, updated_by
         FROM suite_records
        WHERE tenant_id = $1 AND agency_id = $2 AND key = $3`,
      [tenantId, agencyId, testKey]
    );

    if (
      readBack.rows.length !== 1 ||
      Number(readBack.rows[0].version) !== 1 ||
      readBack.rows[0].deleted !== false
    ) {
      throw new Error("Create/read-back verification failed.");
    }

    // Deliberately stale expected version. This MUST update zero rows.
    const staleAttempt = await client.query(
      `UPDATE suite_records
          SET value = $4::jsonb,
              version = version + 1,
              updated_at = now(),
              updated_by = $5
        WHERE tenant_id = $1
          AND agency_id = $2
          AND key = $3
          AND version = 0
        RETURNING version`,
      [
        tenantId,
        agencyId,
        testKey,
        JSON.stringify({ test: true, phase: "stale-should-not-write" }),
        authUserId
      ]
    );

    if (staleAttempt.rowCount !== 0) {
      throw new Error("Optimistic concurrency test failed: stale write was accepted.");
    }

    const updated = await client.query(
      `UPDATE suite_records
          SET value = $4::jsonb,
              version = version + 1,
              updated_at = now(),
              updated_by = $5
        WHERE tenant_id = $1
          AND agency_id = $2
          AND key = $3
          AND version = 1
        RETURNING key, value, version, deleted, updated_at, updated_by`,
      [
        tenantId,
        agencyId,
        testKey,
        JSON.stringify({ test: true, phase: "updated" }),
        authUserId
      ]
    );

    if (updated.rowCount !== 1 || Number(updated.rows[0].version) !== 2) {
      throw new Error("Versioned update verification failed.");
    }

    const deleted = await client.query(
      `UPDATE suite_records
          SET deleted = true,
              version = version + 1,
              updated_at = now(),
              updated_by = $4
        WHERE tenant_id = $1
          AND agency_id = $2
          AND key = $3
          AND version = 2
        RETURNING key, value, version, deleted, updated_at, updated_by`,
      [tenantId, agencyId, testKey, authUserId]
    );

    if (
      deleted.rowCount !== 1 ||
      Number(deleted.rows[0].version) !== 3 ||
      deleted.rows[0].deleted !== true
    ) {
      throw new Error("Soft-delete verification failed.");
    }

    const cleanup = await client.query(
      `DELETE FROM suite_records
        WHERE tenant_id = $1 AND agency_id = $2 AND key = $3`,
      [tenantId, agencyId, testKey]
    );

    if (cleanup.rowCount !== 1) {
      throw new Error("Write-test cleanup failed.");
    }

    const afterCleanup = await client.query(
      `SELECT count(*)::int AS count
         FROM suite_records
        WHERE tenant_id = $1 AND agency_id = $2 AND key = $3`,
      [tenantId, agencyId, testKey]
    );

    if (afterCleanup.rows[0].count !== 0) {
      throw new Error("Write-test cleanup verification failed.");
    }

    await client.query("COMMIT");

    return response(200, {
      success: true,
      test: "aws-write-path-proof",
      tenant_id: tenantId,
      agency_id: agencyId,
      key: testKey,
      checks: {
        create: "passed",
        read_back: "passed",
        stale_version_rejected: "passed",
        versioned_update: "passed",
        soft_delete: "passed",
        cleanup: "passed"
      },
      versions: {
        created: Number(created.rows[0].version),
        updated: Number(updated.rows[0].version),
        deleted: Number(deleted.rows[0].version)
      },
      final_test_record_count: 0,
      message: "AWS write-path proof passed and the reserved test record was removed."
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}


/*
 * ---------------------------------------------------------
 * FIELD TRAINING (AWS/RDS)
 * ---------------------------------------------------------
 * Field Training is kept as one versioned JSON document in suite_records.
 * This deliberately uses the same tenant/agency isolation as the rest of the
 * application while preserving the module's report-level workflow semantics.
 */
const FT_RECORD_KEY = JSON.stringify([["fieldTraining"], "$state"]);

function ftEmptyState() {
  return { config: null, enrollments: [], reports: [], coverage: [], shifts: [], attachments: [] };
}

function ftId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function ftIsoNow() { return new Date().toISOString(); }

function ftDateOk(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }

function ftDaysInclusive(a, b) {
  const start = new Date(`${a}T12:00:00Z`);
  const end = new Date(`${b}T12:00:00Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

async function ftLoadState(client, workspaceAuth, lock = false) {
  const result = await client.query(
    `SELECT value, version
       FROM suite_records
      WHERE tenant_id = $1 AND agency_id = $2 AND key = $3 AND deleted = false
      ${lock ? "FOR UPDATE" : ""}`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY]
  );
  if (!result.rows.length) return { state: ftEmptyState(), version: 0 };
  const value = result.rows[0].value || {};
  return {
    state: {
      config: value.config || null,
      enrollments: Array.isArray(value.enrollments) ? value.enrollments : [],
      reports: Array.isArray(value.reports) ? value.reports : [],
      coverage: Array.isArray(value.coverage) ? value.coverage : [],
      shifts: Array.isArray(value.shifts) ? value.shifts : [],
      attachments: Array.isArray(value.attachments) ? value.attachments : []
    },
    version: Number(result.rows[0].version || 0)
  };
}

async function ftSaveState(client, workspaceAuth, state, version) {
  const next = version + 1;
  if (version === 0) {
    await client.query(
      `INSERT INTO suite_records (tenant_id, agency_id, key, value, version, deleted, updated_at, updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,false,now(),$6)`,
      [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY, JSON.stringify(state), next, workspaceAuth.userId || null]
    );
  } else {
    const updated = await client.query(
      `UPDATE suite_records SET value=$4::jsonb, version=$5, updated_at=now(), updated_by=$6
        WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND version=$7 AND deleted=false
        RETURNING version`,
      [workspaceAuth.tenantId, workspaceAuth.agencyId, FT_RECORD_KEY, JSON.stringify(state), next, workspaceAuth.userId || null, version]
    );
    if (!updated.rows.length) throw new Error("Field Training changed in another session. Refresh and retry.");
  }
  return next;
}

async function ftContext(client, auth, tenantId, agencyId) {
  const workspaceAuth = await resolveWorkspaceMembership(client, auth, tenantId, agencyId);
  if (workspaceAuth.error) return workspaceAuth;
  workspaceAuth.userId = auth.userId;
  const abilityMap = workspaceAuth.admin ? new Map() : await loadRoleAbilityMap(client, tenantId, agencyId, workspaceAuth.roleIds);
  const has = ability => workspaceAuth.admin || roleHasAbility(abilityMap, workspaceAuth.roleIds, ability);
  return {
    ...workspaceAuth,
    ftManage: has("ft_manage"),
    ftAssignCover: has("ft_assign_cover") || has("ft_manage"),
    ftParticipate: has("ft_participate") || has("ft_manage"),
    ftTrain: has("ft_train") || has("ft_manage")
  };
}

async function ftMembers(client, workspaceAuth) {
  const result = await client.query(
    `SELECT m.user_id, m.person_id, m.role_ids, COALESCE(u.display_name,u.email,m.person_id::text) AS display_name
       FROM suite_memberships m
       JOIN suite_users u ON u.id=m.user_id
      WHERE m.tenant_id=$1 AND m.agency_id=$2 AND m.status='active'
      ORDER BY display_name`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId]
  );
  return result.rows;
}

function ftEnrollmentFor(state, id) { return state.enrollments.find(x => x.id === id); }
function ftReportFor(state, id) { return state.reports.find(x => x.id === id); }
function ftActiveCoverage(state, enrollmentId, userId, day) {
  return state.coverage.find(c => c.enrollment_id === enrollmentId && c.cover_user === userId && !c.cancelled_at && c.start_on <= day && c.end_on >= day);
}
function ftCanSeeEnrollment(ctx, state, e) {
  if (ctx.ftManage) return true;
  if ([e.trainee_user,e.trainer_user,e.supervisor_user].includes(ctx.userId)) return true;
  return state.coverage.some(c => c.enrollment_id===e.id && c.cover_user===ctx.userId && !c.cancelled_at);
}
function ftCanEditReport(ctx, state, report) {
  return !!report && ["draft","returned"].includes(report.status) && (ctx.ftManage || report.trainer_user===ctx.userId);
}
function ftAssert(condition, message) { if (!condition) { const e = new Error(message); e.statusCode = 403; throw e; } }
function ftVersion(value, expected, label="record") {
  if (expected != null && Number(expected) !== Number(value)) {
    const e = new Error(`This ${label} changed in another session. Refresh and retry.`); e.statusCode=409; throw e;
  }
}

function ftVisibleState(ctx, state, members) {
  const allowedEnrollments = state.enrollments.filter(e => ftCanSeeEnrollment(ctx,state,e));
  const ids = new Set(allowedEnrollments.map(e=>e.id));
  return {
    config: state.config,
    members,
    enrollments: allowedEnrollments,
    reports: state.reports.filter(r=>ids.has(r.enrollment_id)),
    coverage: state.coverage.filter(c=>ids.has(c.enrollment_id)),
    shifts: state.shifts.filter(s=>ids.has(s.enrollment_id)),
    attachments: state.attachments.filter(a=>state.reports.some(r=>r.id===a.report_id && ids.has(r.enrollment_id)))
  };
}

async function fieldTrainingApi(client, auth, body) {
  const tenantId = body?.tenant_id || body?.tenantId;
  const agencyId = body?.agency_id || body?.agencyId;
  const action = String(body?.action || "");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  if (!tenantId || !agencyId || !action) return response(400,{success:false,error:"tenant_id, agency_id, and action are required."});

  const ctx = await ftContext(client, auth, tenantId, agencyId);
  if (ctx.error) return ctx.error;
  if (!ctx.ftParticipate && !ctx.ftManage) return response(403,{success:false,error:"Field Training access is not enabled for this role."});

  if (action === "list") {
    const [{state},members] = await Promise.all([ftLoadState(client,ctx,false),ftMembers(client,ctx)]);
    return response(200,{success:true,data:ftVisibleState(ctx,state,members)});
  }

  await client.query("BEGIN");
  try {
    const loaded = await ftLoadState(client,ctx,true);
    const state = loaded.state;
    let result = {ok:true};

    if (action === "save_config") {
      ftAssert(ctx.ftManage,"Field Training program management permission required.");
      const model = ["san_jose","reno"].includes(payload.model) ? payload.model : null;
      const template = payload.template;
      if (!model || !template || !Array.isArray(template.phases) || !template.phases.length || !Array.isArray(template.categories) || !template.categories.length || !Array.isArray(template.items) || !template.items.length || !Array.isArray(template.ratingScale) || template.ratingScale.length < 2) throw new Error("A valid Field Training template is required.");
      if (state.config) ftVersion(state.config.version,payload.version,"program configuration");
      state.config={model,version:Number(state.config?.version||0)+1,template,updated_at:ftIsoNow(),updated_by:ctx.userId};
      result=state.config;
    } else if (action === "enroll") {
      ftAssert(ctx.ftManage,"Field Training management permission required.");
      if(!state.config) throw new Error("Configure the Field Training program first.");
      const members=await ftMembers(client,ctx), byUser=new Map(members.map(m=>[m.user_id,m]));
      const users=[payload.traineeUser,payload.trainerUser,payload.supervisorUser];
      if(users.some(x=>!byUser.has(x)) || new Set(users).size!==3) throw new Error("Choose three different active agency members.");
      if(!ftDateOk(payload.startedOn)) throw new Error("A valid start date is required.");
      if(state.enrollments.some(e=>e.trainee_user===payload.traineeUser && ["active","extended"].includes(e.status))) throw new Error("That trainee already has an active Field Training file.");
      const trainee=byUser.get(payload.traineeUser);
      const e={id:ftId("fte"),trainee_user:payload.traineeUser,trainee_person:trainee.person_id,trainer_user:payload.trainerUser,supervisor_user:payload.supervisorUser,started_on:payload.startedOn,status:"active",phase_index:0,model:state.config.model,template_version:state.config.version,template:JSON.parse(JSON.stringify(state.config.template)),version:1,created_at:ftIsoNow(),updated_at:ftIsoNow()};
      state.enrollments.push(e); result=e;
    } else if (action === "reassign") {
      ftAssert(ctx.ftManage,"Field Training management permission required.");
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); ftVersion(e.version,payload.version,"trainee file");
      if(new Set([e.trainee_user,payload.trainerUser,payload.supervisorUser]).size!==3) throw new Error("Choose different trainee, trainer, and supervisor participants.");
      e.trainer_user=payload.trainerUser; e.supervisor_user=payload.supervisorUser; e.version++; e.updated_at=ftIsoNow(); result=e;
    } else if (action === "coverage_add") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found.");
      ftAssert(ctx.ftManage || (ctx.ftAssignCover && e.supervisor_user===ctx.userId),"Coverage assignment permission required.");
      if(!ftDateOk(payload.startOn)||!ftDateOk(payload.endOn)||payload.endOn<payload.startOn||ftDaysInclusive(payload.startOn,payload.endOn)>14) throw new Error("Coverage must be between 1 and 14 consecutive days.");
      if(!payload.coverUser || [e.trainee_user,e.trainer_user,e.supervisor_user].includes(payload.coverUser)) throw new Error("Choose a different eligible covering trainer.");
      const c={id:ftId("ftc"),enrollment_id:e.id,cover_user:payload.coverUser,start_on:payload.startOn,end_on:payload.endOn,reason:String(payload.reason||"").slice(0,500),created_at:ftIsoNow(),created_by:ctx.userId,cancelled_at:null}; state.coverage.push(c); result=c;
    } else if (action === "coverage_cancel") {
      const e=ftEnrollmentFor(state,payload.enrollmentId), c=state.coverage.find(x=>x.id===payload.coverageId&&x.enrollment_id===payload.enrollmentId); if(!e||!c) throw new Error("Coverage assignment not found.");
      ftAssert(ctx.ftManage || (ctx.ftAssignCover && e.supervisor_user===ctx.userId),"Coverage assignment permission required."); c.cancelled_at=ftIsoNow(); c.cancelled_by=ctx.userId; result=c;
    } else if (action === "new_report") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e||!["active","extended"].includes(e.status)) throw new Error("Active trainee file not found.");
      ftAssert(ftCanSeeEnrollment(ctx,state,e),"This trainee file is not available to you.");
      if(!ftDateOk(payload.periodStart)||!ftDateOk(payload.periodEnd)||payload.periodEnd<payload.periodStart) throw new Error("A valid report period is required.");
      const cover=ftActiveCoverage(state,e.id,ctx.userId,payload.periodStart);
      const isPrimary=e.trainer_user===ctx.userId;
      ftAssert(ctx.ftManage||isPrimary||!!cover,"Only the assigned or covering trainer may create an evaluation.");
      const kind=String(payload.kind||""); if(!["daily","weekly","phase","final","coverage"].includes(kind)) throw new Error("Unsupported evaluation type.");
      if(cover && !ctx.ftManage && (payload.periodStart<cover.start_on||payload.periodEnd>cover.end_on)) throw new Error("Covered evaluations must stay within the assigned coverage dates.");
      const trainerUser=cover?ctx.userId:e.trainer_user;
      const r={id:ftId("ftr"),enrollment_id:e.id,kind,period_start:payload.periodStart,period_end:payload.periodEnd,phase_index:e.phase_index,trainer_user:trainerUser,supervisor_user:e.supervisor_user,trainee_user:e.trainee_user,status:"draft",content:{ratings:{},items:{},narrative:"",recommendation:""},history:[{action:"created",at:ftIsoNow(),user_id:ctx.userId,note:""}],version:1,created_at:ftIsoNow(),updated_at:ftIsoNow()}; state.reports.push(r); result=r;
    } else if (action === "save_report") {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftAssert(ftCanEditReport(ctx,state,r),"This evaluation is not editable by your account."); ftVersion(r.version,payload.version,"evaluation");
      r.content=payload.content&&typeof payload.content==="object"?payload.content:{}; r.version++; r.updated_at=ftIsoNow(); result={id:r.id,version:r.version,status:r.status};
    } else if (["submit","approve","return","acknowledge","dispute"].includes(action)) {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftVersion(r.version,payload.version,"evaluation");
      const note=String(payload.note||"").slice(0,3000);
      if(action==="submit"){ftAssert((ctx.ftManage||r.trainer_user===ctx.userId)&&["draft","returned"].includes(r.status),"Only the trainer may submit this evaluation.");r.status="supervisor_review";}
      if(action==="approve"){ftAssert((ctx.ftManage||r.supervisor_user===ctx.userId)&&r.status==="supervisor_review","Only the assigned supervisor or a Field Training manager may approve this evaluation.");r.status="trainee_ack";}
      if(action==="return"){ftAssert((ctx.ftManage||r.supervisor_user===ctx.userId)&&r.status==="supervisor_review","Only the assigned supervisor or a Field Training manager may return this evaluation.");r.status="returned";}
      if(action==="acknowledge"){ftAssert(r.trainee_user===ctx.userId&&r.status==="trainee_ack","Only the trainee may acknowledge this evaluation.");r.status="acknowledged";}
      if(action==="dispute"){ftAssert(r.trainee_user===ctx.userId&&r.status==="trainee_ack","Only the trainee may respond to this evaluation.");r.status="disputed";}
      r.history=Array.isArray(r.history)?r.history:[]; r.history.push({action,at:ftIsoNow(),user_id:ctx.userId,note}); r.version++; r.updated_at=ftIsoNow(); result={id:r.id,version:r.version,status:r.status};
    } else if (action === "advance") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); ftVersion(e.version,payload.version,"trainee file");
      ftAssert(ctx.ftManage||e.supervisor_user===ctx.userId,"Only the assigned supervisor or Field Training administrator may record a phase decision.");
      const outcome=payload.outcome;
      if(outcome==="completed"){
        const ok=state.reports.some(r=>r.enrollment_id===e.id&&r.kind==="final"&&["trainee_ack","acknowledged","disputed"].includes(r.status)); if(!ok) throw new Error("An approved end-of-training report is required before completing training."); e.status="completed";
      } else if(outcome==="separated") e.status="separated";
      else {
        const ok=state.reports.some(r=>r.enrollment_id===e.id&&r.kind==="phase"&&r.phase_index===e.phase_index&&["trainee_ack","acknowledged","disputed"].includes(r.status)); if(!ok) throw new Error("An approved end-of-phase report is required before recording a phase decision.");
        if(outcome==="next"){if(e.phase_index>=e.template.phases.length-1) throw new Error("This trainee is already in the final phase. Use Complete training after the final report is approved.");e.phase_index++;e.status="active";}
        else if(outcome==="extended") e.status="extended"; else throw new Error("Unsupported phase decision.");
      }
      e.version++; e.updated_at=ftIsoNow(); result=e;
    } else if (action === "shift_add") {
      const e=ftEnrollmentFor(state,payload.enrollmentId); if(!e) throw new Error("Trainee file not found."); if(!ftDateOk(payload.shiftOn)) throw new Error("A valid training date is required.");
      const hours=Number(payload.hours); if(!(hours>=0.25&&hours<=24)) throw new Error("Training hours must be between 0.25 and 24.");
      const cover=ftActiveCoverage(state,e.id,ctx.userId,payload.shiftOn); const allowed=ctx.ftManage||e.supervisor_user===ctx.userId||e.trainer_user===ctx.userId||!!cover; ftAssert(allowed,"You cannot log a training shift for this file.");
      const expectedTrainer=cover?ctx.userId:e.trainer_user; if(!ctx.ftManage&&payload.trainerUser!==expectedTrainer) throw new Error("Trainer does not match the assignment for this date.");
      const sh={id:ftId("fts"),enrollment_id:e.id,shift_on:payload.shiftOn,hours,trainer_user:payload.trainerUser||expectedTrainer,notes:String(payload.notes||"").slice(0,1000),recorded_by:ctx.userId,created_at:ftIsoNow(),cancelled_at:null}; state.shifts.push(sh); result=sh;
    } else if (action === "shift_cancel") {
      const e=ftEnrollmentFor(state,payload.enrollmentId), sh=state.shifts.find(x=>x.id===payload.shiftId&&x.enrollment_id===payload.enrollmentId); if(!e||!sh) throw new Error("Training shift not found.");
      ftAssert(ctx.ftManage||e.supervisor_user===ctx.userId||sh.recorded_by===ctx.userId,"You cannot void this training shift."); sh.cancelled_at=ftIsoNow(); sh.cancelled_by=ctx.userId; result=sh;
    } else if (action === "confirm_attachment") {
      const r=ftReportFor(state,payload.reportId); if(!r) throw new Error("Evaluation not found."); ftAssert(ftCanEditReport(ctx,state,r),"This evaluation is not editable by your account.");
      const key=String(payload.storageKey||""); const expected=`tenants/${ctx.tenantId}/agencies/${ctx.agencyId}/attachments/`; if(!key.startsWith(expected)) throw new Error("Attachment does not belong to this workspace.");
      const a={id:ftId("fta"),report_id:r.id,file_name:String(payload.fileName||"attachment").slice(0,255),content_type:String(payload.contentType||"application/octet-stream").slice(0,150),byte_count:Number(payload.byteCount||0),description:String(payload.description||"").slice(0,500),storage_key:key,uploaded_at:ftIsoNow(),uploaded_by:ctx.userId}; state.attachments.push(a); result=a;
    } else {
      return response(400,{success:false,error:"Unsupported Field Training action."});
    }

    await ftSaveState(client,ctx,state,loaded.version);
    await client.query("COMMIT");
    return response(200,{success:true,data:result});
  } catch(error) {
    await client.query("ROLLBACK");
    return response(error.statusCode||400,{success:false,error:error.message});
  }
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
      workspaceAuth.roleIds.includes("role_supervisor") ||
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

    const id = ftId("notice");

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

const RESERVED_AGENCY_SUBDOMAINS = new Set(['www','app','login','auth','api','admin','support','static','assets','mail','email']);

function cleanAgencySubdomain(value) {
  const subdomain = String(value || '').trim().toLowerCase();
  if (!subdomain) return '';
  if (subdomain.length > 63 || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    throw new Error('Agency URL must use only lowercase letters, numbers, and hyphens, and cannot begin or end with a hyphen.');
  }
  if (RESERVED_AGENCY_SUBDOMAINS.has(subdomain)) {
    throw new Error(`The agency URL ${subdomain}.sonomarzi.com is reserved.`);
  }
  return subdomain;
}

async function ensureAgencySubdomainSchema(client) {
  await client.query(`ALTER TABLE suite_agencies ADD COLUMN IF NOT EXISTS subdomain TEXT`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS suite_agencies_subdomain_unique_idx ON suite_agencies (lower(subdomain)) WHERE subdomain IS NOT NULL AND subdomain <> ''`);
  // Preserve the existing Demo PD branded URL on first deployment. This is safe and idempotent.
  await client.query(`
    UPDATE suite_agencies
       SET subdomain='demo'
     WHERE tenant_id='f15865be-cf46-41e0-9d60-7cd753437501'::uuid
       AND id='64624bcc-232d-4af5-bae6-a8e621cde447'::uuid
       AND (subdomain IS NULL OR subdomain='')
       AND NOT EXISTS (SELECT 1 FROM suite_agencies WHERE lower(subdomain)='demo')
  `);
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

    await platformEvent(client, auth, tenantId,
      `${needsActivation ? 'Invited' : 'Added'} user ${name} (${email}) to ${agencyInfo.rows[0].agency_name}`);

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



/*
 * ---------------------------------------------------------
 * WORKFLOWS / APPROVALS (AWS/RDS)
 * ---------------------------------------------------------
 * Stores the workflow subsystem as one versioned JSON document per agency.
 * This replaces the legacy suite_workflow_api Supabase RPC.
 */
const WORKFLOW_RECORD_KEY = JSON.stringify([["workflows"], "$state"]);
function workflowEmptyState(){ return {templates:[],items:[]}; }
function workflowNow(){ return new Date().toISOString(); }
function workflowId(){ return crypto.randomUUID(); }
function workflowAssert(ok,message,statusCode=403){ if(!ok){ const e=new Error(message); e.statusCode=statusCode; throw e; } }
async function workflowLoadState(client,ctx,lock=false){
  const q=await client.query(
    `SELECT value, version FROM suite_records
      WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND deleted=false
      ${lock?'FOR UPDATE':''}`,
    [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY]
  );
  if(!q.rows.length) return {state:workflowEmptyState(),version:0};
  const v=q.rows[0].value||{};
  return {state:{templates:Array.isArray(v.templates)?v.templates:[],items:Array.isArray(v.items)?v.items:[]},version:Number(q.rows[0].version||0)};
}
async function workflowSaveState(client,ctx,state,version){
  const next=version+1;
  if(version===0){
    await client.query(
      `INSERT INTO suite_records (tenant_id,agency_id,key,value,version,deleted,updated_at,updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,false,now(),$6)`,
      [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY,JSON.stringify(state),next,ctx.userId]
    );
  }else{
    const q=await client.query(
      `UPDATE suite_records SET value=$4::jsonb,version=$5,updated_at=now(),updated_by=$6
        WHERE tenant_id=$1 AND agency_id=$2 AND key=$3 AND version=$7 AND deleted=false RETURNING version`,
      [ctx.tenantId,ctx.agencyId,WORKFLOW_RECORD_KEY,JSON.stringify(state),next,ctx.userId,version]
    );
    if(!q.rows.length){ const e=new Error('Workflows changed in another session. Refresh and retry.'); e.statusCode=409; throw e; }
  }
  return next;
}
async function workflowContext(client,auth,tenantId,agencyId){
  const ctx=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);
  if(ctx.error) return ctx;
  ctx.userId=auth.userId;
  const abilityMap=ctx.admin?new Map():await loadRoleAbilityMap(client,tenantId,agencyId,ctx.roleIds);
  const has=a=>ctx.admin||roleHasAbility(abilityMap,ctx.roleIds,a);
  return {...ctx,manage:has('workflow_manage'),approve:has('workflow_approve'),use:has('workflow_use')};
}
async function workflowApi(client,auth,body){
  const tenantId=body?.tenantId||body?.tenant_id;
  const agencyId=body?.agencyId||body?.agency_id;
  const action=String(body?.action||'');
  const payload=body?.payload&&typeof body.payload==='object'?body.payload:{};
  if(!tenantId||!agencyId||!action) return response(400,{success:false,error:'tenantId, agencyId, and action are required.'});
  const ctx=await workflowContext(client,auth,tenantId,agencyId);
  if(ctx.error) return ctx.error;
  if(!ctx.manage&&!ctx.approve&&!ctx.use) return response(403,{success:false,error:'Workflow access is not enabled for this role.'});
  if(action==='list'){
    const {state}=await workflowLoadState(client,ctx,false);
    const items=ctx.manage?state.items:state.items.filter(i=>i.requester_id===ctx.personId || (ctx.approve&&i.status==='pending'&&ctx.roleIds.includes(i.definition?.steps?.[i.step_index]?.roleId)));
    return response(200,{success:true,data:{templates:state.templates.filter(t=>ctx.manage||t.active),items}});
  }
  await client.query('BEGIN');
  try{
    const loaded=await workflowLoadState(client,ctx,true), state=loaded.state, now=workflowNow();
    let result;
    if(action==='save_template'){
      workflowAssert(ctx.manage,'Workflow management access is required.');
      const name=String(payload.name||'').trim(), description=String(payload.description||'').trim(), definition=payload.definition;
      workflowAssert(name.length>=3 && definition && Array.isArray(definition.fields) && definition.fields.length && Array.isArray(definition.steps) && definition.steps.length,'A valid workflow name, fields, and approval steps are required.',400);
      let t=payload.id?state.templates.find(x=>x.id===payload.id):null;
      if(t && Number(t.version)!==Number(payload.version)){ const e=new Error('Workflow changed. Reload before editing.'); e.statusCode=409; throw e; }
      if(!t && payload.clientId){
        t=state.templates.find(x=>x.client_id===payload.clientId);
        if(t){
          if(t.name!==name||t.description!==description||JSON.stringify(t.definition)!==JSON.stringify(definition)){ const e=new Error('This workflow was already created with different content. Refresh before editing.'); e.statusCode=409; throw e; }
          result=t;
        }
      }
      if(!result){
        if(t) Object.assign(t,{name,description,definition,version:Number(t.version||0)+1,updated_at:now});
        else { t={id:workflowId(),client_id:payload.clientId||null,name,description,definition,active:false,version:1,updated_at:now}; state.templates.push(t); }
        result=t;
      }
    } else if(action==='set_active'){
      workflowAssert(ctx.manage,'Workflow management access is required.');
      const t=state.templates.find(x=>x.id===payload.id);
      workflowAssert(t && Number(t.version)===Number(payload.version),'Workflow changed. Reload before editing.',409);
      t.active=!!payload.active; t.version=Number(t.version||0)+1; t.updated_at=now; result=t;
    } else if(action==='submit'){
      workflowAssert(ctx.use||ctx.manage,'Workflow submission access is required.');
      let item=payload.clientId?state.items.find(x=>x.client_id===payload.clientId):null;
      if(!item){
        const t=state.templates.find(x=>x.id===payload.templateId&&x.active);
        workflowAssert(t,'Workflow unavailable.',404);
        const first=t.definition?.steps?.[0];
        item={id:workflowId(),template_id:t.id,definition:JSON.parse(JSON.stringify(t.definition)),answers:payload.answers||{},title:t.name,requester_id:ctx.personId,requester_person_id:ctx.personId,status:'pending',step_index:0,due_at:new Date(Date.now()+(Number(first?.dueDays??2))*86400000).toISOString(),version:1,history:[{action:'submitted',by:ctx.personId,at:now}],created_at:now,updated_at:now,client_id:payload.clientId||null};
        state.items.push(item);
      }
      result=item;
    } else if(['approve','reject','cancel'].includes(action)){
      const item=state.items.find(x=>x.id===payload.id);
      workflowAssert(item && Number(item.version)===Number(payload.version) && item.status==='pending','Request changed. Reload before deciding.',409);
      if(action==='cancel') workflowAssert(item.requester_id===ctx.personId||ctx.manage,'Only the requester can cancel.');
      else {
        const role=item.definition?.steps?.[item.step_index]?.roleId;
        workflowAssert(ctx.manage||(ctx.approve&&ctx.roleIds.includes(role)),'This approval is assigned to another role.');
      }
      if(action==='cancel') item.status='cancelled';
      else if(action==='reject') item.status='rejected';
      else if(++item.step_index >= (item.definition?.steps?.length||0)) item.status='approved';
      item.due_at=item.status==='pending'?new Date(Date.now()+(Number(item.definition.steps[item.step_index]?.dueDays??2))*86400000).toISOString():null;
      item.version=Number(item.version||0)+1; item.updated_at=now; item.history=Array.isArray(item.history)?item.history:[]; item.history.push({action,by:ctx.personId,at:now,note:String(payload.note||'')}); result=item;
    } else {
      return response(400,{success:false,error:'Unsupported workflow action.'});
    }
    await workflowSaveState(client,ctx,state,loaded.version);
    await client.query('COMMIT');
    return response(200,{success:true,data:result});
  }catch(error){
    await client.query('ROLLBACK');
    if(error.statusCode) return response(error.statusCode,{success:false,error:error.message});
    throw error;
  }
}


/*
 * ---------------------------------------------------------
 * ROUTER
 * ---------------------------------------------------------
 */

export const handler = async event => {
  let client;

  try {
    if (event?.sonomarziInternal === true) {
      client = await connectDatabase();
      return await internalIdentityApi(client, event);
    }

    const method =
      event?.requestContext?.http?.method ||
      event?.httpMethod ||
      "";

    const path =
      event?.rawPath ||
      event?.path ||
      "";

    if (
      method !== "POST" &&
      method !== "GET"
    ) {
      return response(404, {
        success: false,
        error: "Route not found."
      });
    }

    const allowedPaths = new Set([
      "/me",
      "/workspace",
      "/apply-changes",
      "/attachments/upload-url",
      "/attachments/download-url",
      "/attachments/delete",
      "/field-training",
      "/workflow",
      "/staff-notices",
      "/tenant-admin",
      "/audit-log"
    ]);

    if (!allowedPaths.has(path)) {
      return response(404, {
        success: false,
        error: "Route not found."
      });
    }

    if (path === "/apply-changes" && method !== "POST") {
      return response(405, { success: false, error: "Method not allowed." });
    }

    if (
      (
        path === "/attachments/upload-url" ||
        path === "/attachments/download-url" ||
        path === "/attachments/delete" ||
        path === "/field-training" ||
        path === "/workflow" ||
        path === "/staff-notices" ||
        path === "/tenant-admin" ||
        path === "/audit-log"
      ) &&
      method !== "POST"
    ) {
      return response(405, {
        success: false,
        error: "Method not allowed."
      });
    }

    if (
      (path === "/me" || path === "/workspace") &&
      method !== "GET"
    ) {
      return response(405, {
        success: false,
        error: "Method not allowed."
      });
    }

    client = await connectDatabase();

    const userAuth = await authenticateUser(client, event);
    if (userAuth.error) return userAuth.error;

    if (path === "/me") {
      return await getMe(client, userAuth);
    }

    if (path === "/workspace") {
      return await getWorkspace(client, userAuth, event);
    }

    const body = parseBody(event);

    if (path === "/attachments/upload-url") {
      return await createAttachmentUploadUrl(client, userAuth, body);
    }

    if (path === "/attachments/download-url") {
      return await createAttachmentDownloadUrl(client, userAuth, body);
    }

    if (path === "/attachments/delete") {
      return await deleteAttachment(client, userAuth, body);
    }

    if (path === "/field-training") {
      return await fieldTrainingApi(client, userAuth, body);
    }

    if (path === "/workflow") {
      return await workflowApi(client, userAuth, body);
    }

    if (path === "/staff-notices") {
      return await staffNoticesApi(client, userAuth, body);
    }

    if (path === "/audit-log") {
      return await auditLogApi(client, userAuth, body, event);
    }

    if (path === "/tenant-admin") {
      return await tenantAdminDbApi(client, userAuth, body);
    }

    return await applyChanges(client, userAuth, body);
  } catch (error) {
    console.error(
      "Migration API error:",
      error
    );

    return response(500, {
      success: false,
      error: error.message
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
};