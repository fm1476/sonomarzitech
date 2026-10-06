import { schedulingSnapshot, scheduleWriteDecision, scopedScheduleCollections, validateSchedulingBatch } from "./lib/scheduling-access.mjs";
import {
  DEMO_TENANT_ID,
  DEMO_AGENCY_ID,
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  authorizeOfficerSelfServiceChange,
  authorizeFleetQmChange,
  authorizeK9SubpoenaCivilChange,
  authorizePermitsChange,
  authorizeDroneEodGrantsChange,
  authorizePersonnelSharedChange
} from "./core.mjs";

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
    const needsScheduleScope = validated.some(c => scopedScheduleCollections.has(c.path.join('.')) || ['pm.scheduleWorkGroups','pm.schedulingSettings','pm.records','pm.refData'].includes(c.path.join('.')));
    if(needsScheduleScope)await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${tenantId}:${agencyId}:scheduling`]);
    const scheduleRows = needsScheduleScope ? await client.query(
      `SELECT key, value, deleted FROM suite_records
       WHERE tenant_id = $1 AND agency_id = $2 AND deleted = false
       AND (key::jsonb -> 0 ->> 0) IN ('pm','personnel')`,
      [tenantId, agencyId]
    ) : {rows:[]};
    const scheduleState = schedulingSnapshot(scheduleRows.rows);
    if(needsScheduleScope)validateSchedulingBatch(scheduleState,validated);
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
        conflict.conflictKey = change.key;
        conflict.expectedVersion = change.expectedVersion;
        conflict.currentVersion = currentVersion;
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
          const permitsDecision =
            await authorizePermitsChange(
              workspaceAuth,
              abilityMap,
              change,
              existing.rows[0] || null
            );

          if (permitsDecision) {
            decision = permitsDecision;
          }
        }

        const scheduleDecision = scheduleWriteDecision(
          change.path.map(String).join('.'), change, existing.rows[0]?.deleted ? null : existing.rows[0]?.value,
          scheduleState, workspaceAuth.personId,
          ability => workspaceAuth.roleIds.some(id => abilityMap.get(id)?.[ability] === true), validated
        );
        if (scheduleDecision) decision = scheduleDecision;
        if (scheduleDecision?.allowed && change.itemId === '$order') {
          const removed = new Set(validated.filter(c => c.deleted && c.path.join('.') === change.path.join('.')).map(c => c.itemId));
          const priorIds = Array.isArray(existing.rows[0]?.value) ? existing.rows[0].value : [];
          change.value = [...priorIds.filter(id => !removed.has(id)), ...change.value.filter(id => !priorIds.includes(id))];
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
        error: "Record changed in another session. Reload before retrying.",
        conflict_key: error.conflictKey || null,
        expected_version: Number.isSafeInteger(error.expectedVersion) ? error.expectedVersion : null,
        current_version: Number.isSafeInteger(error.currentVersion) ? error.currentVersion : null
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

export { applyChanges };
