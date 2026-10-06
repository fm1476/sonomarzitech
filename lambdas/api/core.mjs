import { cleanAgencySubdomain, ensureAgencySubdomainSchema } from "./lib/agency-subdomains.mjs";

import pg from "pg";
import { readFileSync } from "node:fs";

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

let cachedDbCredentials = null;
let cachedDbCredentialsAt = 0;
const DB_CREDENTIAL_CACHE_MS = 5 * 60 * 1000;

async function getDbCredentials() {
  const now = Date.now();
  if (cachedDbCredentials && (now - cachedDbCredentialsAt) < DB_CREDENTIAL_CACHE_MS) {
    return cachedDbCredentials;
  }

  const result = await secrets.send(
    new GetSecretValueCommand({
      SecretId: process.env.DB_SECRET_ARN
    })
  );

  cachedDbCredentials = JSON.parse(result.SecretString);
  cachedDbCredentialsAt = now;
  return cachedDbCredentials;
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
      rejectUnauthorized: true,
      ca: readFileSync(
        new URL("./certs/us-east-2-bundle.pem", import.meta.url),
        "utf8"
      )
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
       t.metadata,
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
    mfaPolicy: ['off','admins','all_users'].includes(String(row.metadata?.security?.mfaPolicy || 'off'))
      ? String(row.metadata?.security?.mfaPolicy || 'off')
      : 'off',
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
    "eod", "subpoena", "grants", "civil", "permits"
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
      const abilities = { ...(row.value?.abilities || {}) };
      if ([
        "role_qm_admin",
        "role_fleet_admin",
        "role_k9_admin",
        "role_drone_admin",
        "role_eod_admin",
        "role_subpoena_admin",
        "role_grants_admin",
        "role_civil_admin",
        "role_permits_admin"
      ].includes(roleId)) {
        abilities.personnel_manage = false;
      }
      if (!["role_admin","role_platform_admin"].includes(roleId)) {
        abilities.admin_roles = false;
      }
      map.set(roleId, abilities);
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

  // My Work must be able to render the signed-in employee's own duty schedule even when
  // their role does not include department-wide roster visibility. Keep this owner-scoped:
  // only their assignment rows and the shift definitions those rows reference are exposed.
  const canViewSchedule =
    roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "pm_schedule_view"
    );

  const ownScheduleAssignments = records.filter(record => {
    try {
      const parsed = collectionFromRecordKey(record.key);
      if (parsed.collection !== "pm.scheduleAssignments" || record.deleted === true) return false;
      if (parsed.itemId === "$value" && Array.isArray(record.value)) {
        return record.value.some(a => a?.personId === workspaceAuth.personId);
      }
      return parsed.itemId !== "$order" && record.value?.personId === workspaceAuth.personId;
    } catch {
      return false;
    }
  });

  const ownShiftIds = new Set();
  for (const record of ownScheduleAssignments) {
    if (Array.isArray(record.value)) {
      record.value.filter(a => a?.personId === workspaceAuth.personId).forEach(a => {
        if (a?.shiftId) ownShiftIds.add(String(a.shiftId));
      });
    } else if (record.value?.shiftId) {
      ownShiftIds.add(String(record.value.shiftId));
    }
  }

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

    if (collection === "pm.scheduleAssignments") {
      if (canViewSchedule) {
        visible.push(record);
      } else if (itemId === "$order" && Array.isArray(record.value)) {
        const ownIds = new Set(
          ownScheduleAssignments
            .filter(r => {
              try { return collectionFromRecordKey(r.key).itemId !== "$value"; } catch { return false; }
            })
            .map(r => {
              try { return collectionFromRecordKey(r.key).itemId; } catch { return null; }
            })
            .filter(Boolean)
        );
        visible.push({ ...record, value: record.value.filter(id => ownIds.has(String(id))) });
      } else if (itemId === "$value" && Array.isArray(record.value)) {
        visible.push({ ...record, value: record.value.filter(a => a?.personId === workspaceAuth.personId) });
      } else if (record.value?.personId === workspaceAuth.personId) {
        visible.push(record);
      }
      continue;
    }

    if (collection === "pm.scheduleShifts") {
      if (canViewSchedule) {
        visible.push(record);
      } else if (itemId === "$order" && Array.isArray(record.value)) {
        visible.push({ ...record, value: record.value.filter(id => ownShiftIds.has(String(id))) });
      } else if (itemId === "$value" && Array.isArray(record.value)) {
        visible.push({ ...record, value: record.value.filter(s => ownShiftIds.has(String(s?.id))) });
      } else if (ownShiftIds.has(String(record.value?.id || itemId))) {
        visible.push(record);
      }
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
    if (collection.startsWith("permits.")) {
      const hasModule = roleHasAbility(
        abilityMap,
        workspaceAuth.roleIds,
        "module_permits"
      );

      if (!hasModule) {
        continue;
      }

      let ability = "permits_view";

      if (collection === "permits.investigations") {
        ability = "permits_background_view";
      } else if (collection === "permits.inspections") {
        ability = "permits_inspection_view";
      } else if (
        collection === "permits.payments" ||
        collection === "permits.feeAdjustments"
      ) {
        ability = "permits_fee_view";
      } else if (
        collection === "permits.savedReports"
      ) {
        ability = "permits_reports_view";
      } else if (
        collection === "permits.permitTypes" ||
        collection === "permits.templates" ||
        collection === "permits.numbering" ||
        collection === "permits.settings" ||
        collection === "permits.correspondenceTemplates"
      ) {
        ability = "permits_admin";
      }

      if (
        roleHasAbility(
          abilityMap,
          workspaceAuth.roleIds,
          ability
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

    if (collection === "pm.leaveRequests" && !hasElevated) {
      const beforeStatus = String(existingValue?.status || "pending");
      const afterStatus = String(incoming?.status || "pending");
      const allowedKeys = new Set([
        "id","personId","code","startDate","endDate","reason","status",
        "submittedAt","submittedBy","rescindedAt","rescindedBy"
      ]);
      const changedOutsideRescind = Object.keys({
        ...(existingValue || {}),
        ...(incoming || {})
      }).some(key =>
        !allowedKeys.has(key) ||
        JSON.stringify(existingValue?.[key]) !== JSON.stringify(incoming?.[key]) &&
        !["status","rescindedAt","rescindedBy"].includes(key)
      );

      if (
        beforeStatus !== "pending" ||
        afterStatus !== "cancelled" ||
        changedOutsideRescind
      ) {
        return {
          allowed: false,
          error: "You may only rescind your own pending time-off request."
        };
      }
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
        ["generatedDocuments","attachedDocuments","fieldHistory"]
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


async function authorizePermitsChange(
  workspaceAuth,
  abilityMap,
  change,
  existingRow
) {
  const collection = change.path.map(String).join(".");
  if (!collection.startsWith("permits.")) return null;

  const roleIds = workspaceAuth.roleIds;
  const hasModule = roleHasAbility(
    abilityMap,
    roleIds,
    "module_permits"
  );

  if (!hasModule) {
    return {
      allowed:false,
      error:"Licensing & Permits is not available to this role."
    };
  }

  const creating = !existingRow || existingRow.deleted === true;
  const deleting = change.deleted === true;
  const beforeValue = existingRow?.value ?? null;
  const afterValue = change.value;

  const has = ability =>
    roleHasAbility(abilityMap, roleIds, ability);

  const manageOnly = new Set([
    "permits.permitTypes",
    "permits.templates",
    "permits.numbering",
    "permits.settings",
    "permits.correspondenceTemplates"
  ]);

  if (manageOnly.has(collection)) {
    return {
      allowed: has("permits_admin"),
      error:"You cannot change Licensing & Permits administration settings."
    };
  }

  if (
    collection === "permits.applicants" ||
    collection === "permits.locations"
  ) {
    return {
      allowed:
        deleting
          ? has("permits_admin")
          : creating
            ? has("permits_create") || has("permits_edit")
            : has("permits_edit"),
      error:"You cannot change applicant or location records."
    };
  }

  if (collection === "permits.applications") {
    if (deleting) {
      return {
        allowed: has("permits_admin"),
        error:"Only Licensing & Permits administrators can delete applications."
      };
    }

    if (creating) {
      return {
        allowed: has("permits_create"),
        error:"You cannot create permit applications."
      };
    }

    if (
      has("permits_edit") &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        [
          "applicationNumber",
          "permitTypeId",
          "applicationType",
          "applicantId",
          "locationId",
          "submittedOn",
          "notes",
          "requirements",
          "history",
          "weapons",
          "documents",
          "fieldValues"
        ]
      )
    ) {
      return { allowed:true };
    }

    if (
      has("permits_approve") &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        [
          "status",
          "workflowStageIndex",
          "stageStartedAt",
          "stageDueDate",
          "approvals",
          "history",
          "decisionReason",
          "pendingApplicantRequest",
          "assignedTo",
          "slaDays"
        ]
      )
    ) {
      return { allowed:true };
    }

    if (
      has("permits_issue") &&
      onlyFieldsChanged(
        beforeValue,
        afterValue,
        [
          "status",
          "history",
          "decisionReason",
          "correspondence"
        ]
      )
    ) {
      return { allowed:true };
    }

    return {
      allowed:false,
      error:"You cannot edit this permit application."
    };
  }

  if (collection === "permits.licenses") {
    return {
      allowed:
        !deleting &&
        (
          has("permits_issue") ||
          has("permits_admin")
        ),
      error:"You cannot issue or change permit credentials."
    };
  }

  if (collection === "permits.investigations") {
    return {
      allowed:
        !deleting
          ? has("permits_background_edit")
          : has("permits_admin"),
      error:"You cannot change permit investigations."
    };
  }

  if (collection === "permits.inspections") {
    return {
      allowed:
        !deleting
          ? has("permits_inspection_manage")
          : has("permits_admin"),
      error:"You cannot change permit inspections."
    };
  }

  if (collection === "permits.payments") {
    return {
      allowed:
        deleting
          ? has("permits_fee_manage")
          : has("permits_payment_record") || has("permits_fee_manage"),
      error:"You cannot change permit payments."
    };
  }

  if (collection === "permits.feeAdjustments") {
    return {
      allowed: has("permits_fee_manage"),
      error:"You cannot change permit fee adjustments."
    };
  }

  if (collection === "permits.savedReports") {
    return {
      allowed:
        has("permits_reports_view") ||
        has("permits_reports_export"),
      error:"You cannot save Licensing & Permits reports."
    };
  }

  if (
    collection === "permits.savedQueries" ||
    collection === "permits.renewalNotices"
  ) {
    return {
      allowed:
        has("permits_view") &&
        (
          has("permits_edit") ||
          has("permits_create")
        ),
      error:"You cannot change this Licensing & Permits record."
    };
  }

  if (collection === "permits.notifications") {
    return {
      allowed: has("permits_view"),
      error:"You cannot change Licensing & Permits notifications."
    };
  }

  // Unknown permit collections are denied by default. This keeps future
  // additions from silently bypassing server-side authorization.
  return {
    allowed:false,
    error:"This Licensing & Permits collection is not authorized for this role."
  };
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

  if (collection === "roles") {
    return {
      allowed: false,
      error: "System Admin or Platform Admin access is required to modify roles."
    };
  }

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

async function attachmentReadAllowed(
  client,
  auth,
  workspaceAuth,
  key
) {
  if (workspaceAuth.admin) return true;

  const matches = await client.query(
    `SELECT key, value, version, deleted, updated_at, updated_by
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND deleted = false
        AND value::text LIKE '%' || $3 || '%'`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId, key]
  );

  if (!matches.rows.length) return false;

  const genericRows = [];
  const fieldTrainingRows = [];

  for (const row of matches.rows) {
    let parsed;
    try {
      parsed = collectionFromRecordKey(row.key);
    } catch {
      continue;
    }

    if (parsed.collection === "fieldTraining") {
      fieldTrainingRows.push(row);
    } else {
      genericRows.push(row);
    }
  }

  if (genericRows.length) {
    const visible = await filterOfficerWorkspaceRecords(
      client,
      workspaceAuth,
      genericRows
    );

    if (
      visible.some(row =>
        JSON.stringify(row.value ?? null).includes(key)
      )
    ) {
      return true;
    }
  }

  let fieldTrainingManager = false;
  if (fieldTrainingRows.length) {
    const abilityMap = await loadRoleAbilityMap(
      client,
      workspaceAuth.tenantId,
      workspaceAuth.agencyId,
      workspaceAuth.roleIds
    );
    fieldTrainingManager = roleHasAbility(
      abilityMap,
      workspaceAuth.roleIds,
      "ft_manage"
    );
  }

  for (const row of fieldTrainingRows) {
    const state = row.value && typeof row.value === "object"
      ? row.value
      : {};

    const attachment = Array.isArray(state.attachments)
      ? state.attachments.find(item =>
          item?.storage_key === key || item?.storageKey === key
        )
      : null;

    if (!attachment) continue;

    const report = Array.isArray(state.reports)
      ? state.reports.find(item => item?.id === attachment.report_id)
      : null;
    if (!report) continue;

    const enrollment = Array.isArray(state.enrollments)
      ? state.enrollments.find(item => item?.id === report.enrollment_id)
      : null;
    if (!enrollment) continue;

    if (
      fieldTrainingManager ||
      [
        enrollment.trainee_user,
        enrollment.trainer_user,
        enrollment.supervisor_user
      ].includes(auth.userId)
    ) {
      return true;
    }

    const covered = Array.isArray(state.coverage) &&
      state.coverage.some(item =>
        item?.enrollment_id === enrollment.id &&
        item?.cover_user === auth.userId &&
        !item?.cancelled_at
      );

    if (covered) return true;
  }

  return false;
}


async function attachmentParentWriteAllowed(
  client,
  workspaceAuth,
  parentCollection,
  parentId
) {
  if (!parentCollection || !parentId) {
    return { allowed:false, error:"Attachment parent collection and record are required." };
  }

  const supported = new Set([
    "qm.equipment",
    "fleet.vehicles",
    "grants.seizures",
    "subpoena.subpoenas",
    "civil.papers",
    "permits.applications"
  ]);

  if (!supported.has(parentCollection)) {
    return { allowed:false, error:"Attachments are not enabled for this record type." };
  }

  const recordKey = JSON.stringify([parentCollection.split("."), String(parentId)]);
  const parent = await client.query(
    `SELECT key, value, deleted
       FROM suite_records
      WHERE tenant_id = $1
        AND agency_id = $2
        AND key = $3
      LIMIT 1`,
    [workspaceAuth.tenantId, workspaceAuth.agencyId, recordKey]
  );

  if (!parent.rows.length || parent.rows[0].deleted === true) {
    return { allowed:false, error:"Attachment parent record was not found." };
  }

  if (workspaceAuth.admin) {
    return { allowed:true, parent:parent.rows[0] };
  }

  const abilityMap = await loadRoleAbilityMap(
    client,
    workspaceAuth.tenantId,
    workspaceAuth.agencyId,
    workspaceAuth.roleIds
  );

  const has = ability =>
    roleHasAbility(abilityMap, workspaceAuth.roleIds, ability);

  const value = parent.rows[0].value || {};
  let allowed = false;

  if (parentCollection === "qm.equipment") {
    allowed =
      has("qm_equip_edit") &&
      await qmEquipmentVisible(
        client,
        workspaceAuth,
        abilityMap,
        value,
        String(parentId)
      );
  } else if (parentCollection === "fleet.vehicles") {
    allowed =
      has("fleet_vehicle_edit") &&
      await fleetVehicleVisible(
        client,
        workspaceAuth,
        abilityMap,
        value
      );
  } else if (parentCollection === "grants.seizures") {
    allowed = has("grants_seizure_manage");
  } else if (parentCollection === "subpoena.subpoenas") {
    allowed =
      has("subpoena_document_upload") &&
      (
        has("subpoena_view_all") ||
        value?.personId === workspaceAuth.personId
      );
  } else if (parentCollection === "civil.papers") {
    allowed =
      has("civil_document_generate") &&
      civilPaperReadable(
        workspaceAuth,
        abilityMap,
        String(parentId),
        value
      );
  } else if (parentCollection === "permits.applications") {
    allowed = has("permits_edit") || has("permits_admin");
  }

  return {
    allowed,
    parent: parent.rows[0],
    error: allowed ? null : "You are not authorized to attach files to this record."
  };
}

function parentReferencesAttachment(parentRow, key) {
  return !!parentRow &&
    JSON.stringify(parentRow.value ?? null).includes(String(key || ""));
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
  const parentCollection = body?.parent_collection || body?.parentCollection;
  const parentId = body?.parent_id || body?.parentId;
  const contentType =
    body?.content_type ||
    body?.contentType ||
    "application/octet-stream";

  const sizeBytes = Number(
    body?.size_bytes ??
    body?.sizeBytes ??
    0
  );

  if (!tenantId || !agencyId || !fileName || !parentCollection || !parentId) {
    return response(400, {
      success: false,
      error:
        "tenant_id, agency_id, file_name, parent_collection, and parent_id are required."
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

  const parentAccess = await attachmentParentWriteAllowed(
    client,
    workspaceAuth,
    String(parentCollection),
    String(parentId)
  );

  if (!parentAccess.allowed) {
    return response(403, {
      success:false,
      error: parentAccess.error || "You are not authorized to attach files to this record."
    });
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
        uploaded_by: auth.userId,
        parent_collection: String(parentCollection),
        parent_id: String(parentId)
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

  if (
    !(await attachmentReadAllowed(
      client,
      auth,
      workspaceAuth,
      key
    ))
  ) {
    return response(403, {
      success: false,
      error: "You are not authorized to access this attachment."
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
  const parentCollection = body?.parent_collection || body?.parentCollection;
  const parentId = body?.parent_id || body?.parentId;

  if (!tenantId || !agencyId || !key || !parentCollection || !parentId) {
    return response(400, {
      success: false,
      error: "tenant_id, agency_id, key, parent_collection, and parent_id are required."
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

  const parentAccess = await attachmentParentWriteAllowed(
    client,
    workspaceAuth,
    String(parentCollection),
    String(parentId)
  );

  if (!parentAccess.allowed) {
    return response(403, {
      success:false,
      error: parentAccess.error || "You are not authorized to remove attachments from this record."
    });
  }

  if (!parentReferencesAttachment(parentAccess.parent, key)) {
    return response(403, {
      success:false,
      error:"This attachment is not referenced by the specified parent record."
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

async function getWorkspaceRevision(client, auth, event) {
  const params = event?.queryStringParameters || {};
  const tenantId = params.tenantId || params.tenant_id || null;
  const agencyId = params.agencyId || params.agency_id || null;

  if (!tenantId || !agencyId) {
    return response(400, { success:false, error:"tenantId and agencyId are required." });
  }

  const workspaceAuth = await resolveWorkspaceMembership(client, auth, tenantId, agencyId);
  if (workspaceAuth.error) return workspaceAuth.error;

  const recordResult = await client.query(
    `SELECT COALESCE(MAX(updated_at), TIMESTAMPTZ 'epoch') AS records_revision
       FROM suite_records
      WHERE tenant_id = $1 AND agency_id = $2`,
    [tenantId, agencyId]
  );

  let auditRevision = 0;
  const auditTable = await client.query(`SELECT to_regclass('suite_activity_log') AS name`);
  if (auditTable.rows[0]?.name) {
    const auditResult = await client.query(
      `SELECT COALESCE(MAX(id),0)::bigint AS audit_revision
         FROM suite_activity_log
        WHERE tenant_id = $1 AND agency_id = $2`,
      [tenantId, agencyId]
    );
    auditRevision = Number(auditResult.rows[0]?.audit_revision || 0);
  }

  return response(200, {
    success:true,
    data:{
      records_revision: recordResult.rows[0]?.records_revision || null,
      audit_revision: auditRevision
    }
  });
}

async function getWorkspace(client, auth, event) {
  const params = event?.queryStringParameters || {};
  let tenantId = params.tenantId || params.tenant_id || null;
  let agencyId = params.agencyId || params.agency_id || null;
  const requestedSubdomain = String(params.subdomain || '').trim().toLowerCase();

  // Lightweight live-sync probe. Reuse the existing authenticated /workspace route so
  // deployments do not need an additional API Gateway route just for polling.
  if (String(params.revision || '') === '1' && tenantId && agencyId && !requestedSubdomain) {
    return await getWorkspaceRevision(client, auth, event);
  }

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

  // These workspace reads are independent. Run them together instead of
  // paying four sequential database round trips during every sign-in.
  const [tenantResult, agencyResult, recordsResult, templateResult] = await Promise.all([
    client.query(
      `SELECT id, slug, name, timezone, plan, status, enabled_modules, metadata
         FROM suite_tenants WHERE id = $1 LIMIT 1`,
      [tenantId]
    ),
    client.query(
      `SELECT id, tenant_id, name, abbreviation, agency_type, ori, status, branding, subdomain
         FROM suite_agencies WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, agencyId]
    ),
    client.query(
      `SELECT key, value, version, deleted, updated_at, updated_by
         FROM suite_records
        WHERE tenant_id = $1 AND agency_id = $2
        ORDER BY key`,
      [tenantId, agencyId]
    ),
    client.query(
      `SELECT empty_state
         FROM suite_templates
        WHERE tenant_id = $1 AND agency_id = $2
        LIMIT 1`,
      [tenantId, agencyId]
    )
  ]);

  if (!tenantResult.rows.length || !agencyResult.rows.length) {
    return response(404, { success: false, error: "Workspace not found." });
  }

  const workspaceRecords = workspaceAuth.admin
    ? recordsResult.rows
    : await filterOfficerWorkspaceRecords(
        client,
        workspaceAuth,
        recordsResult.rows
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
    mfa_policy: workspaceAuth.mfaPolicy,
    records: workspaceRecords,
    template: templateResult.rows[0]?.empty_state || {},
    tenant: tenantResult.rows[0],
    agency: agencyResult.rows[0]
  });
}

export {
  DEMO_TENANT_ID,
  DEMO_AGENCY_ID,
  parseBody,
  response,
  connectDatabase,
  authenticateUser,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility,
  authorizeOfficerSelfServiceChange,
  authorizeFleetQmChange,
  authorizeK9SubpoenaCivilChange,
  authorizePermitsChange,
  authorizeDroneEodGrantsChange,
  authorizePersonnelSharedChange,
  createAttachmentUploadUrl,
  createAttachmentDownloadUrl,
  deleteAttachment,
  getMe,
  getWorkspace,
  getWorkspaceRevision
};
