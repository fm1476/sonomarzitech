using System.Text.Json.Nodes;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Authorization;

/// <summary>Server-side permissions, ownership, agency/unit scopes and sensitive-field redaction.</summary>
public sealed class WorkspacePolicy
{
    private readonly JsonObject rules;
    public WorkspacePolicy() => rules = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Authorization/rules.json")))!.AsObject();
    public PolicyScope For(WorkspaceContext context, IReadOnlyList<StoredRecord> records) => new(context, records, rules);
}
public sealed class PolicyScope
{
    private readonly WorkspaceContext context;
    private readonly IReadOnlyList<StoredRecord> records;
    private readonly JsonObject rules;
    private readonly JsonObject[] roles;
    public PolicyScope(WorkspaceContext context, IReadOnlyList<StoredRecord> records, JsonObject rules)
    {
        this.context = context; this.records = records; this.rules = rules;
        roles = records.Where(r => !r.Deleted && Collection(r) == "roles" && context.RoleIds.Contains(Json.String(r.Value, "id"))).Select(r => r.Value).OfType<JsonObject>().ToArray();
    }
    private static string Collection(StoredRecord r) { try { return Change.ParseKey(r.Key).Collection; } catch (ApiException) { return ""; } }
    private static string Item(StoredRecord r) { try { return Change.ParseKey(r.Key).ItemId; } catch (ApiException) { return ""; } }
    public bool Has(string ability) => context.Admin || roles.Any(r => Json.Bool(r["abilities"], ability));
    public bool Any(params string[] abilities) => abilities.Any(Has);
    private bool Licensed(string collection)
    {
        var prefix = collection.Split('.')[0];
        return prefix is not ("qm" or "fleet" or "pm" or "k9" or "drone" or "eod" or "subpoena" or "grants" or "civil") || context.EnabledModules.Contains(prefix == "pm" ? "personnel" : prefix);
    }
    private StoredRecord? Find(string collection, string id) => records.FirstOrDefault(r => !r.Deleted && Collection(r) == collection && Item(r) == id);
    private bool Own(JsonNode? value, string field) => Json.String(value, field) == context.PersonId;
    private static bool Special(string item) => item is "$order" or "$value";
    private bool AssetVisible(JsonNode? value, string prefix, string item)
    {
        if (prefix == "qm" && Special(item)) return true;
        if (prefix == "fleet" && !Has("fleet_vehicle_view")) return false;
        var scoped = roles.Where(r => Json.Strings(r["agencyScope"]).Length > 0).ToArray();
        if (scoped.Length > 0 && scoped.Length == roles.Length && !scoped.Any(r => Json.Strings(r["agencyScope"]).Contains(Json.String(value, "agency"))) && !Json.Bool(value, "isSharedAsset")) return false;
        if (!Has(prefix + "_unit_scope") || Has(prefix + "_bypass_unit_scope")) return true;
        if (prefix == "fleet" && Json.String(value, "assignedToType") == "person" && Json.String(value, "assignedTo") == context.PersonId) return true;
        var unit = Json.String(Find("personnel", context.PersonId)?.Value, "unit");
        if (unit.Length == 0) return false;
        if (prefix == "qm" && Json.String(value, "homeUnit") == unit) return true;
        if (prefix == "fleet" && Json.String(value, "assignedToType") == "unit") return Json.String(value, "assignedTo") == unit;
        return Json.String(value, "assignedToType") == "person" && Json.String(Find("personnel", Json.String(value, "assignedTo"))?.Value, "unit") == unit;
    }
    private bool SideEffect(string collection, bool write)
    {
        var parts = collection.Split('.');
        if (parts.Length != 2 || parts[1] is not ("activity" or "notifications") || rules["sideEffects"]?[parts[0]] is not JsonObject rule) return false;
        return Has("module_" + parts[0]) && Any(Json.Strings(rule[write ? "write" : "read"]));
    }
    private bool Read(string collection, string item, JsonNode? value)
    {
        if (!Licensed(collection) || collection == "accounts") return false;
        if (Json.Strings(rules["universal"]).Contains(collection)) return true;
        if (collection.EndsWith(".refData", StringComparison.Ordinal)) return Has("module_" + (collection.StartsWith("pm.", StringComparison.Ordinal) ? "personnel" : collection.StartsWith("qm.", StringComparison.Ordinal) ? "quartermaster" : collection.Split('.')[0]));
        if (collection is "pm.trainingCheckins" or "pm.leaveRequests")
        {
            var elevated = collection == "pm.trainingCheckins" ? "pm_instructor_manage" : "pm_leave_request_approve";
            var submit = collection == "pm.trainingCheckins" ? "pm_training_checkin_submit" : "pm_leave_request_submit";
            return Has(elevated) || Has(submit) && (item == "$order" || item == "$value" && value is JsonArray { Count: 0 } || Own(value, "personId"));
        }
        if (collection == "fleet.vehicles") return AssetVisible(value, "fleet", item);
        if (collection == "fleet.maintenance") return Has("fleet_vehicle_view") && (Special(item) || Find("fleet.vehicles", Json.String(value, "vehicleId")) is { } vehicle && AssetVisible(vehicle.Value, "fleet", Item(vehicle)));
        if (collection == "fleet.inspections") return Has("fleet_inspection_view_all") || Has("fleet_inspection_conduct") && (Special(item) || Own(value, "submittedByPersonId") || Json.Strings(value?["personnelIds"]).Contains(context.PersonId));
        if (collection == "qm.equipment") return Has("qm_equip_view") && AssetVisible(value, "qm", item);
        if (collection == "qm.assignments") return Any("qm_assign_history", "qm_assign_checkout");
        if (collection == "qm.requests") return Any("qm_request_view_all", "qm_request_approve") || Has("qm_request_submit") && (Special(item) || Own(value, "requesterId"));
        if (collection == "subpoena.subpoenas") return Has("subpoena_view_all") || Has("subpoena_view_own") && (Special(item) || Own(value, "personId"));
        if (collection == "civil.papers") return Has("civil_paper_view_all") || Has("civil_paper_view_own") && (Special(item) || Own(value, "assignedServerId"));
        var ability = collection switch
        {
            "qm.audits" => "qm_audit_view", "qm.consumptionLog" or "qm.maintenance" => "qm_equip_view",
            "k9.k9s" => "k9_roster_view", "k9.certifications" => "k9_certification_view", "k9.deployments" => "k9_deployment_view", "k9.incidents" => "k9_incident_view", "k9.trainingSessions" => "k9_training_view",
            "civil.cashierReconciliations" => "civil_fee_manage", "civil.enforcements" => "civil_paper_view_all",
            "drone.drones" => "drone_fleet_view", "drone.flights" => "drone_flight_view", "drone.incidents" => "drone_incident_view", "drone.maintenanceRecords" => "drone_maint_view", "drone.operators" => "drone_operator_view",
            "eod.incidents" => "eod_incident_view", "eod.inventory" => "eod_inventory_view", "eod.magazines" or "eod.magazineInspections" => "eod_magazine_view", "eod.technicians" => "eod_technician_view", "eod.theftLossReports" => "eod_theft_report_view",
            "grants.grants" => "grants_award_view", "grants.seizures" => "grants_seizure_view", "agencyBranding" => "manage_branding", "fieldLabels" => "manage_field_labels", _ => ""
        };
        if (ability.Length > 0) return Has(ability);
        if (SideEffect(collection, false)) return true;
        if (rules["personnel"]?[collection] is JsonObject rule) return Any(Json.Strings(rule["read"])) || Json.String(rule, "ownRead") is { Length: > 0 } ownRead && Has(ownRead) && (Special(item) || Own(value, Json.String(rule, "ownerField")));
        // Additional C# services store their records in scoped collections.
        if (collection.StartsWith("ft.", StringComparison.Ordinal)) return Has("ft_manage") || Has("ft_participate") && (Own(value, "trainee_person") || Own(value, "trainer_person") || Own(value, "supervisor_person"));
        if (collection == "notices") return Own(value, "recipientPersonId") || Own(value, "senderPersonId");
        if (collection == "notificationReads") return Own(value, "personId");
        return false;
    }
    public IReadOnlyList<StoredRecord> Filter()
    {
        if (context.Admin) return records.Where(r => Collection(r) != "notificationReads" || Own(r.Value, "personId")).ToArray();
        var result = new List<StoredRecord>();
        foreach (var record in records)
        {
            var collection = Collection(record); var item = Item(record);
            if (!Read(collection, item, record.Value)) continue;
            var value = record.Value?.DeepClone();
            if (!Special(item) && value is JsonObject obj)
            {
                if (collection == "personnel") foreach (var field in obj.Select(x => x.Key).Except(new[] { "id", "name", "badge", "unit", "email", "roleIds", "qualifications" }).ToArray()) obj.Remove(field);
                if (collection == "k9.k9s") { if (!Has("k9_medical_view")) obj.Remove("medical"); if (!Has("k9_gps_view")) foreach (var field in new[] { "locationHistory", "lastKnownLocation", "gpsCollarId" }) obj.Remove(field); }
                if (collection == "eod.incidents" && !Has("eod_rsp_view")) obj.Remove("rsp");
                if (collection == "pm.records") { if (!Has("pm_medical_view")) { obj.Remove("medical"); obj.Remove("bloodType"); } if (!Has("pm_lodd_view")) obj.Remove("lodd"); }
            }
            result.Add(record with { Value = value });
        }
        return result;
    }
    public static bool OnlyFields(JsonNode? before, JsonNode? after, params string[] allowed)
    {
        if (before is not JsonObject b || after is not JsonObject a) return false;
        return b.Select(x => x.Key).Union(a.Select(x => x.Key)).Where(k => !JsonNode.DeepEquals(b[k], a[k])).All(allowed.Contains);
    }
    public bool CanWrite(Change change, StoredRecord? existing, IReadOnlyList<Change> batch)
    {
        if (context.Admin) return true;
        var c = change.Collection; var item = change.ItemId; var before = existing?.Value; var after = change.Value;
        var create = existing is null || existing.Deleted; var delete = change.Deleted;
        if (!Licensed(c)) return false;
        if (c is "pm.trainingCheckins" or "pm.leaveRequests")
        {
            if (!Any(c == "pm.trainingCheckins" ? "pm_training_checkin_submit" : "pm_leave_request_submit", c == "pm.trainingCheckins" ? "pm_instructor_manage" : "pm_leave_request_approve")) return false;
            if (item == "$order") return !delete && after is JsonArray && (before is not JsonArray oldOrder || oldOrder.All(id => (after as JsonArray)!.Any(n => JsonNode.DeepEquals(n, id)) || batch.Any(b => b.Collection == c && b.ItemId == id?.GetValue<string>() && b.Deleted)));
            if (item == "$value" && delete && before is JsonArray { Count: 0 }) return true;
            return !delete && Own(after, "personId") && (create || Own(before, "personId"));
        }
        if (c is "fleet.vehicles" or "qm.equipment")
        {
            var fleet = c == "fleet.vehicles"; var p = fleet ? "fleet_vehicle" : "qm_equip";
            if (!create && !AssetVisible(before ?? after, fleet ? "fleet" : "qm", item)) return false;
            if (delete) return Has(p + "_delete");
            if (create) return Has(p + "_add");
            if (Has(p + "_edit")) return true;
            if (fleet) return Has("fleet_maint_outofservice") && Json.String(after, "status") == "Out of Service" && OnlyFields(before, after, "status") || Has("fleet_vehicle_retire") && Json.String(after, "status") == "Retired" && OnlyFields(before, after, "status", "disposal");
            return Any("qm_assign_checkout", "qm_assign_checkin") && Json.String(after, "status") is "Assigned" or "Available" && OnlyFields(before, after, "status", "assignedTo", "assignedToType") || Has("qm_equip_retire") && Json.String(after, "status") == "Retired" && OnlyFields(before, after, "status", "disposal") || Has("qm_maint_outofservice") && Json.String(after, "status") == "Maintenance" && OnlyFields(before, after, "status");
        }
        if (c == "fleet.maintenance") return delete ? Has("fleet_maint_log") : Any("fleet_maint_log", "fleet_maint_schedule");
        if (c == "fleet.inspections") return Has(delete ? "fleet_inspection_delete" : "fleet_inspection_conduct");
        if (c == "qm.assignments") return Has(delete ? "qm_assign_approve" : create ? "qm_assign_checkout" : "qm_assign_checkin") || !create && !delete && Has("qm_assign_approve");
        if (c == "qm.audits") return Has("qm_audit_conduct");
        if (c == "qm.consumptionLog") return Has(create && !delete ? "qm_assign_checkout" : "qm_equip_edit");
        if (c == "qm.maintenance") return Any("qm_maint_log", "qm_maint_schedule");
        if (c == "qm.requests") return Has("qm_request_approve") || create && !delete && Has("qm_request_submit") && Own(after, "requesterId");
        if (c == "k9.k9s") return Has(delete ? "k9_roster_delete" : "k9_roster_edit") || !create && !delete && Has("k9_medical_manage") && OnlyFields(before, after, "medical");
        if (c == "k9.certifications") return Has("k9_certification_manage");
        if (c is "k9.deployments" or "k9.incidents" or "k9.trainingSessions") return delete ? Has("k9_roster_delete") : Has("k9_roster_edit") || Has(c == "k9.deployments" ? "k9_deployment_log" : c == "k9.incidents" ? "k9_incident_manage" : "k9_training_manage") && Own(after, "handlerId") && (create || Own(before, "handlerId")) && Own(Find("k9.k9s", Json.String(after, "k9Id"))?.Value, "handlerId");
        if (c == "subpoena.subpoenas")
        {
            if (Has("subpoena_manage")) return true;
            if (create || delete) return false;
            var visible = Has("subpoena_view_all") || Own(before, "personId");
            return visible && (Has("subpoena_document_upload") && OnlyFields(before, after, "attachments", "fieldHistory") || Has("subpoena_notify") && OnlyFields(before, after, "notifiedDate", "notifiedBy", "fieldHistory")) || Own(before, "personId") && Own(after, "personId") && Has("subpoena_acknowledge") && Own(after, "acknowledgedBy") && OnlyFields(before, after, "acknowledgedDate", "acknowledgedBy", "fieldHistory");
        }
        if (c == "civil.cashierReconciliations") return Has("civil_fee_manage");
        if (c == "civil.enforcements") return delete ? Has("civil_paper_intake") : Any("civil_paper_intake", "civil_fee_manage");
        if (c == "civil.papers")
        {
            if (Has("civil_paper_intake")) return true;
            if (create || delete) return false;
            var visible = Has("civil_paper_view_all") || Own(before, "assignedServerId");
            return visible && (Has("civil_document_generate") && OnlyFields(before, after, "generatedDocuments", "fieldHistory") || Has("civil_fee_manage") && OnlyFields(before, after, "feePayments", "deposits", "feeLineItems", "fieldHistory")) || Own(before, "assignedServerId") && Own(after, "assignedServerId") && Has("civil_paper_log_attempt") && OnlyFields(before, after, "attempts", "stage", "servedDate", "servedTime", "servedOnName", "serviceMethod", "mileage", "fieldHistory", "notes");
        }
        var simple = c switch
        {
            "drone.drones" => delete ? "drone_fleet_delete" : "drone_fleet_edit", "drone.incidents" => "drone_incident_manage", "drone.maintenanceRecords" => "drone_maint_manage", "drone.operators" => "drone_operator_manage",
            "eod.inventory" => "eod_inventory_manage", "eod.magazines" => "eod_magazine_manage", "eod.technicians" or "eod.incidents" => "eod_technician_manage", "eod.theftLossReports" => "eod_theft_report_manage",
            "grants.grants" => "grants_award_manage", "grants.seizures" => "grants_seizure_manage",
            "drone.refData" => "drone_admin_categories", "eod.refData" => "eod_admin_categories", "grants.refData" => "grants_admin_categories", "personnel" => "personnel_manage", _ => ""
        };
        if (simple.Length > 0) return Has(simple);
        if (c == "drone.flights") return Has("drone_operator_manage") || create && !delete && Has("drone_flight_log") && Own(after, "operatorId");
        if (c == "eod.magazineInspections") return Has("eod_magazine_manage") || create && !delete && Has("eod_inspection_log") && Own(after, "inspectorId");
        if (SideEffect(c, true)) return !delete && (item == "$order" || after is JsonArray a && (before is not JsonArray b || a.Count >= b.Count && b.Select((v, i) => JsonNode.DeepEquals(v, a[i])).All(x => x)));
        if (c is "agencyBranding" or "fieldLabels") return !create && !delete && Has(c == "agencyBranding" ? "manage_branding" : "manage_field_labels");
        if (rules["personnel"]?[c] is not JsonObject rule) return false;
        if (Any(Json.Strings(rule[delete ? "delete" : create ? "create" : "update"]))) return true;
        var ownerField = Json.String(rule, "ownerField");
        if (create && !delete && Json.String(rule, "ownCreate") is { Length: > 0 } ownCreate && Has(ownCreate) && Own(after, ownerField)) return true;
        if (!create && !delete && Json.String(rule, "ownUpdate") is { Length: > 0 } ownUpdate && Has(ownUpdate) && Own(before, ownerField) && Own(after, ownerField)) return true;
        if (!create && !delete && c == "pm.records") return Has("pm_medical_manage") && OnlyFields(before, after, "medical", "bloodType") || Has("pm_lodd_manage") && OnlyFields(before, after, "lodd") || Has("pm_documents_manage") && OnlyFields(before, after, "documents");
        if (!create && !delete && c == "pm.bidCycles" && Has("pm_bidding_submit") && OnlyFields(before, after, "submissions"))
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var opens = Json.String(before, "opensDate"); var closes = Json.String(before, "closesDate");
            var oldSubs = before?["submissions"] as JsonArray ?? []; var newSubs = after?["submissions"] as JsonArray ?? [];
            return Json.String(before, "status") == "open" && opens.Length > 0 && closes.Length > 0 && string.CompareOrdinal(today, opens) >= 0 && string.CompareOrdinal(today, closes) <= 0 && JsonNode.DeepEquals(Json.Array(oldSubs.Where(n => !Own(n, "personId"))), Json.Array(newSubs.Where(n => !Own(n, "personId")))) && newSubs.Count(n => Own(n, "personId")) <= 1;
        }
        return false;
    }
}
