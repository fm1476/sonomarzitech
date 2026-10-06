import {
  parseBody,
  response,
  connectDatabase,
  authenticateUser,
  createAttachmentUploadUrl,
  createAttachmentDownloadUrl,
  deleteAttachment,
  getMe,
  getWorkspace,
  getWorkspaceRevision
} from "./core.mjs";
import { applyChanges } from "./apply-changes.mjs";
import { fieldTrainingApi } from "./field-training.mjs";
import { workflowApi } from "./workflows.mjs";
import { staffNoticesApi } from "./staff-notices.mjs";
import { auditLogApi } from "./audit.mjs";
import { internalIdentityApi, tenantAdminDbApi } from "./tenant-admin.mjs";
import { permitsApi } from "./permits.mjs";

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
      "/workspace-revision",
      "/apply-changes",
      "/attachments/upload-url",
      "/attachments/download-url",
      "/attachments/delete",
      "/field-training",
      "/workflow",
      "/staff-notices",
      "/tenant-admin",
      "/audit-log",
      "/permits/geocode"
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
        path === "/audit-log" ||
        path === "/permits/geocode"
      ) &&
      method !== "POST"
    ) {
      return response(405, {
        success: false,
        error: "Method not allowed."
      });
    }

    if (
      (path === "/me" || path === "/workspace" || path === "/workspace-revision") &&
      method !== "GET"
    ) {
      return response(405, {
        success: false,
        error: "Method not allowed."
      });
    }

    const requestPerf = { startedAt: performance.now() };
    const dbStartedAt = performance.now();
    client = await connectDatabase();
    requestPerf.dbConnectMs = performance.now() - dbStartedAt;

    const authStartedAt = performance.now();
    const userAuth = await authenticateUser(client, event);
    requestPerf.authenticateMs = performance.now() - authStartedAt;
    event.sonomarziPerf = requestPerf;
    if (userAuth.error) return userAuth.error;

    if (path === "/me") {
      return await getMe(client, userAuth);
    }

    if (path === "/workspace") {
      return await getWorkspace(client, userAuth, event);
    }

    if (path === "/workspace-revision") {
      return await getWorkspaceRevision(client, userAuth, event);
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

    if (path === "/permits/geocode") {
      return await permitsApi(client, userAuth, body);
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
      client.release();
    }
  }
};
