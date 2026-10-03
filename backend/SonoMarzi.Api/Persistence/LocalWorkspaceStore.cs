using System.Text.Json.Nodes;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Persistence;

/// <summary>Development-only durable test workspace. Never connects to AWS.</summary>
public sealed class LocalWorkspaceStore : IWorkspaceStore
{
    public const string TenantId = "f15865be-cf46-41e0-9d60-7cd753437501";
    public const string AgencyId = "64624bcc-232d-4af5-bae6-a8e621cde447";
    private readonly SemaphoreSlim mutex = new(1, 1);
    private readonly WorkspacePolicy policy;
    private readonly string file;
    private Dictionary<string, StoredRecord> records = [];
    private readonly JsonObject seed;
    public LocalWorkspaceStore(WorkspacePolicy policy, IConfiguration config, IWebHostEnvironment env)
    {
        if (!env.IsDevelopment()) throw new InvalidOperationException("Local storage requires Development.");
        this.policy = policy;
        file = Path.GetFullPath(config["Local:DataPath"] ?? Path.Combine(env.ContentRootPath, ".local/workspace.json"));
        seed = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Development/seed.json")))!.AsObject();
        if (File.Exists(file)) records = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, StoredRecord>>(File.ReadAllText(file)) ?? [];
        else Flatten(seed, []);
    }
    private void Flatten(JsonNode? node, string[] path)
    {
        void Add(string id, JsonNode? value)
        {
            var key = new JsonArray(new JsonArray(path.Select(p => (JsonNode?)JsonValue.Create(p)).ToArray()), id).ToJsonString();
            records[key] = new(key, value?.DeepClone(), 1, false, DateTimeOffset.UtcNow, "local-admin");
        }
        if (node is JsonObject obj && path.Length == 0)
        {
            foreach (var (key, value) in obj)
            {
                if (key is "accounts" or "currentRoleIds" or "currentRoleId" or "auditLog") continue;
                Flatten(value, [key]);
            }
            return;
        }
        if (node is JsonObject module && path.Length == 1 && new[] {"qm","fleet","pm","k9","drone","eod","subpoena","grants","civil"}.Contains(path[0]))
        {
            foreach (var (key, value) in module) Flatten(value,[path[0],key]);
            return;
        }
        var selfService=path.Length==2 && path[0]=="pm" && path[1] is "trainingCheckins" or "leaveRequests";
        if (node is JsonArray array && (selfService || array.Count > 0 && array.All(n=>n is JsonObject o && (Json.String(o,"id").Length>0 || Json.String(o,"personId").Length>0))))
        {
            var ids=array.Select(n=>Json.String(n,"id",Json.String(n,"personId"))).ToArray();
            if(ids.Distinct().Count()==ids.Length)
            {
                Add("$order",Json.Array(ids.Select(n=>(JsonNode?)JsonValue.Create(n))));
                for(var i=0;i<array.Count;i++) Add(ids[i],array[i]);
                return;
            }
        }
        if(path.Length>0)Add("$value",node);
    }
    public static Actor Actor(string subject) => subject switch
    {
        "local-admin" => new("local-admin",subject,"admin@local.test","Local Administrator",false,"p1"),
        "local-officer" => new("local-officer",subject,"officer@local.test","Local Officer",false,"p2"),
        "local-trainer" => new("local-trainer",subject,"trainer@local.test","Local Trainer",false,"p3"),
        "local-supervisor" => new("local-supervisor",subject,"supervisor@local.test","Local Supervisor",false,"p4"),
        _ => throw new ApiException(403,"Unknown local user.")
    };
    private static string Role(string subject) => subject switch {"local-admin"=>"role_admin","local-trainer"=>"role_fto","local-supervisor"=>"role_supervisor",_=>"role_officer"};
    public Task<Actor> FindActor(string subject, CancellationToken ct) => Task.FromResult(Actor(subject));
    public Task<JsonArray> WorkspaceMembers(WorkspaceContext context, CancellationToken ct) => Task.FromResult(new JsonArray(
        new JsonObject { ["user_id"]="local-admin",["person_id"]="p1",["display_name"]="Local Administrator",["role_ids"]=new JsonArray("role_admin") },
        new JsonObject { ["user_id"]="local-officer",["person_id"]="p2",["display_name"]="Local Officer",["role_ids"]=new JsonArray("role_officer") },
        new JsonObject { ["user_id"]="local-trainer",["person_id"]="p3",["display_name"]="Local Trainer",["role_ids"]=new JsonArray("role_fto") },
        new JsonObject { ["user_id"]="local-supervisor",["person_id"]="p4",["display_name"]="Local Supervisor",["role_ids"]=new JsonArray("role_supervisor") }));
    public Task<JsonArrayResult> Memberships(Actor actor, CancellationToken ct) => Task.FromResult(new JsonArrayResult(new JsonArray(new JsonObject { ["tenant_id"] = TenantId, ["agency_id"] = AgencyId, ["person_id"] = actor.PlatformPersonId, ["role_ids"] = new JsonArray(Role(actor.Subject)), ["status"] = "active", ["tenant_name"] = "Local Test Tenant", ["agency_name"] = "Local Test Agency" })));
    public Task<WorkspaceContext> Resolve(Actor actor, string tenant, string agency, CancellationToken ct)
    {
        if (tenant != TenantId || agency != AgencyId) throw new ApiException(403, "Active agency membership required.");
        return Task.FromResult(new WorkspaceContext(tenant, agency, actor.PlatformPersonId!, [Role(actor.Subject)], ["qm", "fleet", "personnel", "k9", "drone", "eod", "subpoena", "grants", "civil"], actor.Subject == "local-admin"));
    }
    public async Task<Snapshot> Load(WorkspaceContext context, CancellationToken ct)
    {
        await mutex.WaitAsync(ct);
        try { return new(new JsonObject { ["id"] = TenantId, ["slug"] = "local", ["name"] = "Local Test Tenant", ["timezone"] = "America/Chicago", ["plan"] = "enterprise", ["status"] = "active", ["enabled_modules"] = new JsonArray(context.EnabledModules.Select(s => (JsonNode?)JsonValue.Create(s)).ToArray()) }, new JsonObject { ["id"] = AgencyId, ["tenant_id"] = TenantId, ["name"] = "Local Test Agency", ["abbreviation"] = "TEST", ["status"] = "active", ["branding"] = new JsonObject() }, new JsonObject(), records.Values.Select(r => r with { Value = r.Value?.DeepClone() }).ToArray()); }
        finally { mutex.Release(); }
    }
    public async Task<IReadOnlyList<StoredRecord>> Apply(Actor actor, WorkspaceContext context, IReadOnlyList<Change> changes, CancellationToken ct, Func<WorkspaceContext, IReadOnlyList<StoredRecord>, bool>? serviceAuthorization = null)
    {
        await mutex.WaitAsync(ct);
        try
        {
            if (serviceAuthorization is not null && !serviceAuthorization(context, records.Values.ToArray())) throw new ApiException(403, "Service access denied.");
            var scope = policy.For(context, records.Values.ToArray());
            var next = new Dictionary<string, StoredRecord>(records); var result = new List<StoredRecord>();
            foreach (var change in changes)
            {
                next.TryGetValue(change.Key, out var current);
                if ((current?.Version ?? 0) != change.ExpectedVersion) throw new ApiException(409, "Record changed in another session. Reload before retrying.");
                if (serviceAuthorization is null && !scope.CanWrite(change, current, changes)) throw new ApiException(403, "You cannot change this collection or record.");
                var row = new StoredRecord(change.Key, change.Value?.DeepClone(), (current?.Version ?? 0) + 1, change.Deleted, DateTimeOffset.UtcNow, actor.Id);
                next[change.Key] = row; result.Add(row);
            }
            Directory.CreateDirectory(Path.GetDirectoryName(file)!);
            var temporary = file + "." + Guid.NewGuid().ToString("N");
            try { await File.WriteAllTextAsync(temporary, System.Text.Json.JsonSerializer.Serialize(next), ct); File.Move(temporary, file, true); records = next; }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
            return result;
        }
        finally { mutex.Release(); }
    }
}
