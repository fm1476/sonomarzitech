using Amazon;
using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using Npgsql;
using System.Text.Json.Nodes;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Persistence;

public sealed class RdsConnectionFactory(IConfiguration config) : IAsyncDisposable
{
    private readonly SemaphoreSlim mutex = new(1, 1);
    private NpgsqlDataSource? source;
    public async Task<NpgsqlConnection> Open(CancellationToken ct)
    {
        await mutex.WaitAsync(ct);
        try
        {
            if (source is null)
            {
                var connection = new NpgsqlConnectionStringBuilder { Host = config["AWS:DatabaseHost"] ?? throw new InvalidOperationException("AWS:DatabaseHost is required."), Port = config.GetValue("AWS:DatabasePort", 5432), Database = config["AWS:DatabaseName"] ?? "postgres", SslMode = SslMode.VerifyFull, Timeout = 15, CommandTimeout = 30, IncludeErrorDetail = false };
                var arn = config["AWS:DatabaseSecretArn"] ?? throw new InvalidOperationException("AWS:DatabaseSecretArn is required.");
                using var secrets = new AmazonSecretsManagerClient(RegionEndpoint.GetBySystemName(config["AWS:Region"] ?? "us-east-2"));
                var secret = await secrets.GetSecretValueAsync(new GetSecretValueRequest { SecretId = arn }, ct);
                var data = JsonNode.Parse(secret.SecretString)!;
                connection.Username = Json.String(data, "username"); connection.Password = Json.String(data, "password");
                if (!string.IsNullOrWhiteSpace(config["AWS:DatabaseRootCertificate"])) connection.RootCertificate = config["AWS:DatabaseRootCertificate"];
                source = NpgsqlDataSource.Create(connection.ConnectionString);
            }
        }
        finally { mutex.Release(); }
        return await source.OpenConnectionAsync(ct);
    }
    public async ValueTask DisposeAsync() { if (source is not null) await source.DisposeAsync(); mutex.Dispose(); }
}
public sealed class RdsWorkspaceStore(RdsConnectionFactory factory, WorkspacePolicy policy) : IWorkspaceStore
{
    private static Guid Id(string value) => Guid.TryParse(value, out var id) ? id : throw new ApiException(400, "Invalid workspace identity.");
    private static async Task<JsonArray> Query(NpgsqlConnection connection, string sql, CancellationToken ct, params object[] values)
    {
        await using var cmd = new NpgsqlCommand(sql, connection);
        foreach (var value in values) cmd.Parameters.Add(new NpgsqlParameter { Value = value });
        await using var reader = await cmd.ExecuteReaderAsync(ct); var result = new JsonArray();
        while (await reader.ReadAsync(ct)) result.Add(JsonNode.Parse(reader.GetString(0)));
        return result;
    }
    public async Task<Actor> FindActor(string subject, CancellationToken ct)
    {
        await using var connection = await factory.Open(ct);
        var rows = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT u.id, u.cognito_sub, u.email, u.display_name, u.status, COALESCE(pa.enabled,false) AS platform_admin, pa.person_id AS platform_person_id FROM suite_users u LEFT JOIN suite_platform_admins pa ON pa.user_id=u.id WHERE u.cognito_sub=$1 LIMIT 1) x", ct, subject);
        if (rows.Count == 0 || Json.String(rows[0], "status") != "active") throw new ApiException(403, "An active linked SonoMarzi user is required.");
        var row = rows[0]; return new(Json.String(row, "id"), subject, Json.String(row, "email"), Json.String(row, "display_name"), Json.Bool(row, "platform_admin"), Json.String(row, "platform_person_id"));
    }
    public async Task<JsonArray> WorkspaceMembers(WorkspaceContext context, CancellationToken ct)
    {
        await using var connection=await factory.Open(ct);
        return await Query(connection,"SELECT to_jsonb(x)::text FROM (SELECT m.user_id,m.person_id,m.role_ids,u.display_name,u.email FROM suite_memberships m JOIN suite_users u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.agency_id=$2 AND m.status='active' AND u.status='active' ORDER BY u.display_name) x",ct,Id(context.TenantId),Id(context.AgencyId));
    }
    public async Task<JsonArrayResult> Memberships(Actor actor, CancellationToken ct)
    {
        await using var connection = await factory.Open(ct);
        return new(await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT m.tenant_id,m.agency_id,m.person_id,m.role_ids,m.status,t.slug AS tenant_slug,t.name AS tenant_name,t.timezone,t.plan,t.status AS tenant_status,t.enabled_modules,a.name AS agency_name,a.abbreviation,a.agency_type,a.status AS agency_status FROM suite_memberships m JOIN suite_tenants t ON t.id=m.tenant_id JOIN suite_agencies a ON a.tenant_id=m.tenant_id AND a.id=m.agency_id WHERE m.user_id=$1 ORDER BY t.name,a.name) x", ct, Id(actor.Id)));
    }
    private static async Task<WorkspaceContext> ResolveOn(NpgsqlConnection connection, Actor actor, string tenant, string agency, CancellationToken ct)
    {
        var rows = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT t.status AS tenant_status,t.enabled_modules,a.status AS agency_status,m.person_id,m.role_ids,m.status AS membership_status FROM suite_tenants t JOIN suite_agencies a ON a.tenant_id=t.id AND a.id=$2 LEFT JOIN suite_memberships m ON m.tenant_id=t.id AND m.agency_id=a.id AND m.user_id=$3 WHERE t.id=$1 LIMIT 1) x", ct, Id(tenant), Id(agency), Id(actor.Id));
        if (rows.Count == 0) throw new ApiException(404, "Workspace not found.");
        var row = rows[0];
        if (Json.String(row, "tenant_status") is not ("setup" or "active") || Json.String(row, "agency_status") is not ("setup" or "active")) throw new ApiException(403, "Tenant or agency is not active.");
        if (Json.String(row, "membership_status") != "active" && !actor.PlatformAdmin) throw new ApiException(403, "Active agency membership required.");
        var roles = Json.Strings(row?["role_ids"]); var person = Json.String(row, "person_id");
        if (person.Length == 0 && actor.PlatformAdmin) person = actor.PlatformPersonId ?? "";
        if (person.Length == 0) throw new ApiException(409, "Person identity is not configured for this workspace.");
        return new(tenant, agency, person, roles, Json.Strings(row?["enabled_modules"]), actor.PlatformAdmin || roles.Contains("role_admin"));
    }
    public async Task<WorkspaceContext> Resolve(Actor actor, string tenant, string agency, CancellationToken ct) { await using var connection = await factory.Open(ct); return await ResolveOn(connection, actor, tenant, agency, ct); }
    private static async Task<IReadOnlyList<StoredRecord>> Records(NpgsqlConnection connection, WorkspaceContext context, CancellationToken ct)
    {
        var rows = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT key,value,version,deleted,updated_at,updated_by FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 ORDER BY key) x", ct, Id(context.TenantId), Id(context.AgencyId));
        return rows.Select(n => new StoredRecord(Json.String(n, "key"), n?["value"]?.DeepClone(), n!["version"]!.GetValue<long>(), Json.Bool(n, "deleted"), DateTimeOffset.Parse(Json.String(n, "updated_at")), Json.String(n, "updated_by"))).ToArray();
    }
    public async Task<Snapshot> Load(WorkspaceContext context, CancellationToken ct)
    {
        await using var connection = await factory.Open(ct);
        await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
        var tenants = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT id,slug,name,timezone,plan,status,enabled_modules,metadata FROM suite_tenants WHERE id=$1) x", ct, Id(context.TenantId));
        var agencies = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT id,tenant_id,name,abbreviation,agency_type,ori,status,branding FROM suite_agencies WHERE tenant_id=$1 AND id=$2) x", ct, Id(context.TenantId), Id(context.AgencyId));
        var templates = await Query(connection, "SELECT empty_state::text FROM suite_templates WHERE tenant_id=$1 AND agency_id=$2 LIMIT 1", ct, Id(context.TenantId), Id(context.AgencyId));
        var records = await Records(connection, context, ct);
        await transaction.CommitAsync(ct);
        return new(tenants[0]!.AsObject(), agencies[0]!.AsObject(), templates.FirstOrDefault()?.AsObject() ?? new(), records);
    }
    public async Task<IReadOnlyList<StoredRecord>> Apply(Actor actor, WorkspaceContext context, IReadOnlyList<Change> changes, CancellationToken ct, Func<WorkspaceContext, IReadOnlyList<StoredRecord>, bool>? serviceAuthorization = null)
    {
        await using var connection = await factory.Open(ct);
        await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        try
        {
            // A workspace lock also covers missing rows and cross-record authorization dependencies.
            await using (var lockCmd = new NpgsqlCommand("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", connection)) { lockCmd.Parameters.Add(new NpgsqlParameter { Value = context.TenantId + "/" + context.AgencyId }); await lockCmd.ExecuteNonQueryAsync(ct); }
            // Re-check active user and administrator rights in the same transaction as the write.
            var active = await Query(connection, "SELECT to_jsonb(x)::text FROM (SELECT u.status,COALESCE(pa.enabled,false) AS platform_admin,pa.person_id AS platform_person_id FROM suite_users u LEFT JOIN suite_platform_admins pa ON pa.user_id=u.id WHERE u.id=$1 FOR UPDATE OF u) x", ct, Id(actor.Id));
            if (Json.String(active.FirstOrDefault(), "status") != "active") throw new ApiException(403, "User is no longer active.");
            var refreshedActor=actor with {PlatformAdmin=Json.Bool(active[0],"platform_admin"),PlatformPersonId=Json.String(active[0],"platform_person_id")};
            var currentContext = await ResolveOn(connection, refreshedActor, context.TenantId, context.AgencyId, ct);
            var all = await Records(connection, currentContext, ct);
            if (serviceAuthorization is not null && !serviceAuthorization(currentContext, all)) throw new ApiException(403, "Service access denied.");
            var byKey = all.ToDictionary(r => r.Key); var scope = policy.For(currentContext, all); var result = new List<StoredRecord>();
            foreach (var change in changes)
            {
                byKey.TryGetValue(change.Key, out var current);
                if ((current?.Version ?? 0) != change.ExpectedVersion) throw new ApiException(409, "Record changed in another session. Reload before retrying.");
                if (serviceAuthorization is null && !scope.CanWrite(change, current, changes)) throw new ApiException(403, "You cannot change this collection or record.");
                var version = (current?.Version ?? 0) + 1;
                await using var cmd = new NpgsqlCommand("INSERT INTO suite_records(tenant_id,agency_id,key,value,version,deleted,updated_at,updated_by) VALUES($1,$2,$3,$4::jsonb,$5,$6,now(),$7) ON CONFLICT(tenant_id,agency_id,key) DO UPDATE SET value=excluded.value,version=excluded.version,deleted=excluded.deleted,updated_at=excluded.updated_at,updated_by=excluded.updated_by", connection);
                foreach (var value in new object[] { Id(context.TenantId), Id(context.AgencyId), change.Key, change.Value?.ToJsonString() ?? "null", version, change.Deleted, Id(actor.Id) }) cmd.Parameters.Add(new NpgsqlParameter { Value = value });
                await cmd.ExecuteNonQueryAsync(ct);
                result.Add(new(change.Key, change.Value?.DeepClone(), version, change.Deleted, DateTimeOffset.UtcNow, actor.Id));
            }
            await transaction.CommitAsync(ct); return result;
        }
        catch (PostgresException e) when (e.SqlState is "40001" or "40P01" or "23505") { throw new ApiException(409, "Record changed in another session. Reload before retrying."); }
    }
}
