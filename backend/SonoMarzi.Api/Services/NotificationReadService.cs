using System.Text.Json.Nodes;
using SonoMarzi.Api.Contracts;

namespace SonoMarzi.Api.Services;

public sealed class NotificationReadService
{
    private static readonly HashSet<string> Modules = ["qm", "fleet", "pm", "k9", "drone", "eod", "subpoena", "grants", "civil"];

    public async Task<JsonNode> Execute(RecordSession session, JsonObject request, CancellationToken ct)
    {
        var person = session.Context.PersonId;
        var existing = session.Row("notificationReads", person)?.Value;
        var keys = Json.Strings(existing?["keys"]).ToHashSet(StringComparer.Ordinal);
        var action = Json.String(request, "p_action");
        if (action == "list") return Json.Array(keys.Order(StringComparer.Ordinal).Select(k => (JsonNode?)JsonValue.Create(k)));
        if (action != "mark") throw new ApiException(400, "Invalid notification read action.");
        if (request["p_keys"] is not JsonArray requested || requested.Count is < 1 or > 100)
            throw new ApiException(400, "Choose 1 to 100 notifications.");
        foreach (var node in requested)
        {
            if (node is not JsonValue value || !value.TryGetValue<string>(out var key) || key.Length > 220)
                throw new ApiException(400, "Invalid notification key.");
            var split = key.IndexOf('|');
            if (split < 1 || split == key.Length - 1 || !Modules.Contains(key[..split]) || key[(split + 1)..].Any(char.IsControl))
                throw new ApiException(400, "Invalid notification key.");
            keys.Add(key);
        }
        if (keys.Count > 10000) throw new ApiException(400, "Notification read limit reached.");
        var record = new JsonObject
        {
            ["id"] = person,
            ["personId"] = person,
            ["keys"] = new JsonArray(keys.Order(StringComparer.Ordinal).Select(k => (JsonNode?)JsonValue.Create(k)).ToArray()),
            ["updated_at"] = DateTimeOffset.UtcNow
        };
        await session.Save([("notificationReads", record)], _ => true, ct);
        return Json.Array(keys.Order(StringComparer.Ordinal).Select(k => (JsonNode?)JsonValue.Create(k)));
    }
}
