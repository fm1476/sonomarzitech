using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace SonoMarzi.Api.Contracts;

public sealed class ApiException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
public sealed record Actor(string Id, string Subject, string Email, string DisplayName, bool PlatformAdmin, string? PlatformPersonId);
public sealed record Membership(string TenantId, string AgencyId, string PersonId, string[] RoleIds, string Status);
public sealed record WorkspaceContext(string TenantId, string AgencyId, string PersonId, string[] RoleIds, string[] EnabledModules, bool Admin);
public sealed record StoredRecord(string Key, JsonNode? Value, long Version, bool Deleted, DateTimeOffset UpdatedAt, string? UpdatedBy)
{
    public JsonObject ToJson() => new() { ["key"] = Key, ["value"] = Value?.DeepClone(), ["version"] = Version, ["deleted"] = Deleted, ["updated_at"] = UpdatedAt, ["updated_by"] = UpdatedBy };
}
public sealed record Change(string Key, JsonNode? Value, long ExpectedVersion, bool Deleted, string Collection, string ItemId)
{
    public static Change Parse(JsonNode? node)
    {
        if (node is not JsonObject obj) throw new ApiException(400, "Invalid change.");
        var key = Json.String(obj, "key");
        var (collection, item) = ParseKey(key);
        if (obj["expected_version"] is not JsonValue v || !v.TryGetValue<long>(out var version) || version < 0 || version > 9007199254740991L)
            throw new ApiException(400, "Invalid expected_version.");
        if (obj["deleted"] is not JsonValue d || !d.TryGetValue<bool>(out var deleted)) throw new ApiException(400, "Invalid deleted flag.");
        if (new[] { "accounts", "currentRoleIds", "currentRoleId", "auditLog", "serverAudit", "ft", "workflows", "notices" }.Contains(collection.Split('.')[0])) throw new ApiException(403, "This collection is server managed.");
        if (item.StartsWith('$') && item is not ("$order" or "$value")) throw new ApiException(400, "Reserved record item id.");
        return new(key, obj["value"]?.DeepClone(), version, deleted, collection, item);
    }
    public static (string Collection, string ItemId) ParseKey(string key)
    {
        try
        {
            if (key.Length is < 1 or > 4096) throw new FormatException();
            if (JsonNode.Parse(key) is not JsonArray { Count: 2 } a || a[0] is not JsonArray { Count: > 0 } path || a[1] is not JsonValue id || !id.TryGetValue<string>(out var item)) throw new FormatException();
            var segments = path.Select(n => n is JsonValue s && s.TryGetValue<string>(out var text) && !string.IsNullOrWhiteSpace(text) ? text : throw new FormatException()).ToArray();
            if (segments.Any(s => s.Contains('.') || s is "__proto__" or "prototype" or "constructor")) throw new FormatException();
            return (string.Join('.', segments), item);
        }
        catch (Exception e) when (e is FormatException or System.Text.Json.JsonException) { throw new ApiException(400, "Invalid record key."); }
    }
}
public sealed record Snapshot(JsonObject Tenant, JsonObject Agency, JsonObject Template, IReadOnlyList<StoredRecord> Records);
public static class Json
{
    public static string String(JsonNode? node, string field, string fallback = "") => node is JsonObject o && o[field] is JsonValue v && v.TryGetValue<string>(out var s) ? s : fallback;
    public static bool Bool(JsonNode? node, string field) => node is JsonObject o && o[field] is JsonValue v && v.TryGetValue<bool>(out var b) && b;
    public static string[] Strings(JsonNode? node) => node is JsonArray a ? a.OfType<JsonValue>().Select(v => v.TryGetValue<string>(out var s) ? s : "").Where(s => s.Length > 0).ToArray() : [];
    public static JsonArray Array(IEnumerable<JsonNode?> values) => new(values.Select(v => v?.DeepClone()).ToArray());
    public static string Key(string collection, string id) => new JsonArray(new JsonArray(collection.Split('.').Select(s => (JsonNode?)JsonValue.Create(s)).ToArray()), id).ToJsonString(new() { WriteIndented = false });
}
