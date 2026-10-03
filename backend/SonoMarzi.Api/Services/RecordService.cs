using System.Text.Json.Nodes;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Persistence;
namespace SonoMarzi.Api.Services;
public sealed class RecordSession(IWorkspaceStore store, WorkspacePolicy policy, Actor actor, WorkspaceContext context, Snapshot snapshot)
{
    public Actor Actor => actor;
    public WorkspaceContext Context => context;
    public PolicyScope Permissions => policy.For(context, snapshot.Records);
    public IEnumerable<StoredRecord> Rows(string collection) => snapshot.Records.Where(r => !r.Deleted && Change.ParseKey(r.Key).Collection == collection);
    public JsonArray List(string collection) => Json.Array(Rows(collection).Select(r => r.Value));
    public StoredRecord? Row(string collection, string id) => Rows(collection).FirstOrDefault(r => Change.ParseKey(r.Key).ItemId == id);
    public JsonObject Require(string collection, string id) => Row(collection, id)?.Value?.DeepClone().AsObject() ?? throw new ApiException(404, "Record not found.");
    public static void CheckVersion(JsonObject payload, JsonObject existing) { if (payload["version"] is null || !JsonNode.DeepEquals(payload["version"], existing["version"])) throw new ApiException(409, "Record changed. Reload before editing."); }
    public async Task Save(IReadOnlyList<(string Collection, JsonObject Value)> values, Func<PolicyScope, bool> permitted, CancellationToken ct)
    {
        if (!permitted(Permissions)) throw new ApiException(403, "Service access denied.");
        var changes = values.Select(v => { var id = Json.String(v.Value, "id"); var row = Row(v.Collection, id); return new Change(row?.Key ?? Json.Key(v.Collection, id), v.Value.DeepClone(), row?.Version ?? 0, false, v.Collection, id); }).ToArray();
        await store.Apply(actor, context, changes, ct, (fresh, rows) =>
        {
            // Service decisions may depend on linked records (enrollment, roles, approvals).
            // Reject stale snapshots before applying any part of the batch.
            var original = snapshot.Records.ToDictionary(r => r.Key, r => r.Version);
            if (rows.Count != original.Count || rows.Any(r => !original.TryGetValue(r.Key, out var version) || version != r.Version)) throw new ApiException(409,"Workspace changed. Reload before retrying.");
            return permitted(policy.For(fresh, rows));
        });
    }
    public static void History(JsonObject obj, string action, string actor, string note = "")
    {
        var history = obj["history"] as JsonArray ?? []; if (obj["history"] is null) obj["history"] = history;
        history.Add(new JsonObject { ["action"] = action, ["by"] = actor, ["at"] = DateTimeOffset.UtcNow, ["note"] = note });
    }
    public static void Touch(JsonObject obj) { obj["version"] = (obj["version"]?.GetValue<long>() ?? 0) + 1; obj["updated_at"] = DateTimeOffset.UtcNow; }
    public static string Required(JsonObject obj, string field, int max = 500)
    {
        var value = Json.String(obj, field).Trim(); if (value.Length == 0 || value.Length > max) throw new ApiException(400, $"Invalid {field}."); return value;
    }
    public static string Date(JsonObject obj, string field) { var value = Required(obj, field, 10); if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", out _)) throw new ApiException(400, $"Invalid {field}."); return value; }
}
