using System.Text.Json.Nodes;
using SonoMarzi.Api.Authentication;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Attachments;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Persistence;
namespace SonoMarzi.Api.Endpoints;
public static class WorkspaceEndpoints
{
    public static async Task<Actor> Actor(HttpContext http, IWorkspaceStore store, CancellationToken ct) => await store.FindActor(http.User.FindFirst("sub")?.Value ?? throw new ApiException(401, "Authenticated identity required."), ct);
    public static async Task<WorkspaceContext> Context(HttpContext http, IWorkspaceStore store, string tenant, string agency, CancellationToken ct) => await store.Resolve(await Actor(http, store, ct), tenant, agency, ct);
    public static async Task<JsonObject> Body(HttpContext http, CancellationToken ct) => (await http.Request.ReadFromJsonAsync<JsonObject>(ct)) ?? throw new ApiException(400, "JSON body required.");
    public static (string Tenant, string Agency) Ids(JsonObject body)
    {
        var tenant = Json.String(body, "tenant_id", Json.String(body, "tenantId")); var agency = Json.String(body, "agency_id", Json.String(body, "agencyId"));
        if (tenant.Length == 0 || agency.Length == 0) throw new ApiException(400, "tenant_id and agency_id are required.");
        return (tenant, agency);
    }
    public static void Map(WebApplication app, bool local)
    {
        app.MapGet("/api/health", () => Results.Ok(new { status = "ok", backend = "dotnet", mode = local ? "local" : "aws" }));
        app.MapGet("/api/config", (IConfiguration c) => Results.Ok(new { mode = local ? "local" : "aws", apiBase = "/api", clientId = local ? "" : c["Cognito:ClientId"], cognitoDomain = local ? "" : c["Cognito:Domain"], redirectUri = local ? "" : c["Cognito:RedirectUri"] }));
        if (local)
        {
            app.MapPost("/api/auth/login", async (HttpContext http, LocalSessions sessions, CancellationToken ct) => { var body = await Body(http, ct); return Results.Ok(new { token = sessions.Login(Json.String(body, "email").Trim(), Json.String(body, "password")), expires_in = 28800 }); });
            app.MapPost("/api/auth/logout", (HttpContext http, LocalSessions sessions) => { var header = http.Request.Headers.Authorization.ToString(); if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) sessions.Revoke(header[7..]); return Results.Ok(new { success = true }); });
            app.MapMethods("/api/attachments/local/{token}", ["GET", "PUT"], (HttpContext http, string token, AttachmentService attachments, CancellationToken ct) => attachments.Transfer(http, token, ct));
        }
        var api = app.MapGroup("/api").RequireAuthorization();
        api.MapGet("/me", async (HttpContext http, IWorkspaceStore store, CancellationToken ct) => { var actor = await Actor(http, store, ct); return Results.Ok(new { success = true, user = new { id = actor.Id, email = actor.Email, display_name = actor.DisplayName, platform_admin = actor.PlatformAdmin }, memberships = (await store.Memberships(actor, ct)).Items }); });
        api.MapGet("/workspace", async (HttpContext http, IWorkspaceStore store, WorkspacePolicy policy, CancellationToken ct) =>
        {
            var actor = await Actor(http, store, ct); var tenant = http.Request.Query["tenantId"].ToString(); var agency = http.Request.Query["agencyId"].ToString();
            if (tenant.Length == 0) tenant = http.Request.Query["tenant_id"].ToString(); if (agency.Length == 0) agency = http.Request.Query["agency_id"].ToString();
            if (tenant.Length == 0 && agency.Length == 0)
            {
                var memberships = (await store.Memberships(actor, ct)).Items.Where(n => Json.String(n, "status") == "active").ToArray();
                if (memberships.Length == 0) throw new ApiException(actor.PlatformAdmin ? 409 : 403, "Workspace selection required.");
                if (memberships.Length != 1) return Results.Json(new { success = false, error = "Workspace selection required.", memberships = Json.Array(memberships) }, statusCode: 409);
                tenant = Json.String(memberships[0], "tenant_id"); agency = Json.String(memberships[0], "agency_id");
            }
            if (tenant.Length == 0 || agency.Length == 0) throw new ApiException(400, "Both tenantId and agencyId are required.");
            var context = await store.Resolve(actor, tenant, agency, ct); var snapshot = await store.Load(context, ct); var records = policy.For(context, snapshot.Records).Filter();
            return Results.Ok(new { success = true, tenant_id = tenant, agency_id = agency, person_id = context.PersonId, role_ids = context.RoleIds.Concat(actor.PlatformAdmin ? ["role_platform_admin"] : Array.Empty<string>()).Distinct(), records = records.Select(r => r.ToJson()), template = snapshot.Template, tenant = snapshot.Tenant, agency = snapshot.Agency });
        });
        api.MapPost("/apply-changes", async (HttpContext http, IWorkspaceStore store, CancellationToken ct) =>
        {
            var body = await Body(http, ct); var (tenant, agency) = Ids(body);
            if ((body["changes"] ?? body["p_changes"]) is not JsonArray { Count: > 0 and <= 5000 } raw) throw new ApiException(400, "A changes array of 1 to 5000 items is required.");
            var changes = raw.Select(Change.Parse).ToArray();
            if (changes.Select(c => c.Key).Distinct(StringComparer.Ordinal).Count() != changes.Length) throw new ApiException(400, "A batch cannot contain duplicate record keys.");
            var actor = await Actor(http, store, ct); var context = await store.Resolve(actor, tenant, agency, ct);
            var result = await store.Apply(actor, context, changes, ct); return Results.Ok(result.Select(r => new { key = r.Key, version = r.Version }));
        });
        api.MapPost("/attachments/{action}", async (string action, HttpContext http, IWorkspaceStore store, AttachmentService attachments, CancellationToken ct) =>
        {
            var body = await Body(http, ct); var (tenant, agency) = Ids(body); var context = await Context(http, store, tenant, agency, ct); var baseUrl = $"{http.Request.Scheme}://{http.Request.Host}";
            if (action == "upload-url")
            {
                long size = 0; if ((body["size_bytes"] ?? body["sizeBytes"]) is JsonValue v && !v.TryGetValue<long>(out size)) throw new ApiException(400, "Invalid attachment size.");
                var result = await attachments.Upload(context, Json.String(body, "file_name", Json.String(body, "fileName", "attachment")), Json.String(body, "content_type", Json.String(body, "contentType", "application/octet-stream")), size, baseUrl);
                return Results.Ok(new { success = true, key = result.Key, upload_url = result.Url, expires_in = result.ExpiresIn, max_size_bytes = AttachmentService.MaxBytes });
            }
            var key = Json.String(body, "key");
            if (action == "download-url") { var result = await attachments.Download(context, key, baseUrl); return Results.Ok(new { success = true, key, download_url = result.Url, expires_in = result.ExpiresIn }); }
            if (action == "delete") { await attachments.Delete(context, key, ct); return Results.Ok(new { success = true, key, deleted = true }); }
            throw new ApiException(404, "Route not found.");
        });
    }
}
