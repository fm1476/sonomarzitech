using System.Text.Json.Nodes;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Services;
public sealed class WorkflowService
{
    public async Task<JsonNode> Execute(RecordSession session, string action, JsonObject p, CancellationToken ct)
    {
        var permissions = session.Permissions; var context = session.Context;
        bool Manage(SonoMarzi.Api.Authorization.PolicyScope scope) => scope.Has("workflow_manage");
        bool Use(SonoMarzi.Api.Authorization.PolicyScope scope) => scope.Has("workflow_use");
        bool Approve(SonoMarzi.Api.Authorization.PolicyScope scope) => scope.Has("workflow_approve");
        var templates = session.List("workflows.templates"); var items = session.List("workflows.items");
        bool ReadItem(JsonNode? item) => context.Admin || Json.String(item, "requester_person_id") == context.PersonId || (item?["definition"]?["steps"] is JsonArray steps && steps.Any(s => context.RoleIds.Contains(Json.String(s, "roleId"))));
        if (action == "list") return new JsonObject { ["templates"] = Json.Array(templates.Where(t => Manage(permissions) || Use(permissions) && Json.Bool(t, "active"))), ["items"] = Json.Array(items.Where(ReadItem)) };
        if (action == "save_template")
        {
            if (!Manage(permissions)) throw new ApiException(403, "Workflow management access required.");
            if (p["definition"] is not JsonObject definition || definition["steps"] is not JsonArray { Count: > 0 and <= 50 } steps || steps.Any(s => Json.String(s,"roleId").Length==0)) throw new ApiException(400, "At least one approval step is required.");
            var id = Json.String(p, "id"); var template = id.Length > 0 ? session.Require("workflows.templates", id) : new JsonObject { ["id"] = Guid.NewGuid().ToString(), ["active"] = false, ["client_id"] = Json.String(p,"clientId") };
            if(id.Length>0) RecordSession.CheckVersion(p,template);
            var duplicate = templates.FirstOrDefault(t => Json.String(p,"clientId").Length>0 && Json.String(t,"client_id")==Json.String(p,"clientId"));
            if(id.Length==0 && duplicate is not null) { if(Json.String(duplicate,"name")!=Json.String(p,"name") || !JsonNode.DeepEquals(duplicate["definition"],definition))throw new ApiException(409,"This request ID was used with different content.");return duplicate.DeepClone(); }
            template["name"]=RecordSession.Required(p,"name",200);template["description"]=Json.String(p,"description");template["definition"]=definition.DeepClone();RecordSession.Touch(template);
            await session.Save([("workflows.templates",template)],Manage,ct);return template;
        }
        if(action=="set_active") { var t=session.Require("workflows.templates",RecordSession.Required(p,"id"));RecordSession.CheckVersion(p,t);if(p["active"] is not JsonValue active || !active.TryGetValue<bool>(out var enabled))throw new ApiException(400,"Invalid active flag.");t["active"]=enabled;RecordSession.Touch(t);await session.Save([("workflows.templates",t)],Manage,ct);return t; }
        if(action=="submit")
        {
            var clientId=RecordSession.Required(p,"clientId");var duplicate=items.FirstOrDefault(i=>Json.String(i,"client_id")==clientId && Json.String(i,"requester_person_id")==context.PersonId);if(duplicate is not null){if(!JsonNode.DeepEquals(duplicate["answers"],p["answers"]))throw new ApiException(409,"This submission ID has different answers.");return duplicate.DeepClone();}
            var t=session.Require("workflows.templates",RecordSession.Required(p,"templateId"));if(!Json.Bool(t,"active"))throw new ApiException(403,"Workflow unavailable.");
            var item=new JsonObject { ["id"]=Guid.NewGuid().ToString(),["client_id"]=clientId,["template_id"]=Json.String(t,"id"),["title"]=Json.String(t,"name"),["definition"]=t["definition"]?.DeepClone(),["answers"]=p["answers"]?.DeepClone(),["requester_id"]=context.PersonId,["requester_person_id"]=context.PersonId,["requester_user_id"]=session.Actor.Id,["status"]="pending",["step_index"]=0,["created_at"]=DateTimeOffset.UtcNow,["history"]=new JsonArray() };
            item["due_at"]=DateTimeOffset.UtcNow.AddDays(2);RecordSession.Touch(item);RecordSession.History(item,"submitted",session.Actor.Id);
            await session.Save([("workflows.items",item)],s=>Manage(s)||Use(s),ct);return item;
        }
        if(action is not ("approve" or "reject" or "cancel"))throw new ApiException(400,"Unknown workflow action.");
        var current=session.Require("workflows.items",RecordSession.Required(p,"id"));RecordSession.CheckVersion(p,current);if(Json.String(current,"status")!="pending")throw new ApiException(409,"Request is no longer pending.");
        var index=current["step_index"]!.GetValue<int>();var definitionSteps=current["definition"]?["steps"] as JsonArray ?? throw new ApiException(400,"Invalid workflow.");
        bool Allowed(SonoMarzi.Api.Authorization.PolicyScope scope)=>Manage(scope)||(action=="cancel"?Json.String(current,"requester_user_id")==session.Actor.Id:Approve(scope)&&context.RoleIds.Contains(Json.String(definitionSteps[index],"roleId")));
        if(!Allowed(permissions))throw new ApiException(403,"This approval is assigned to another role.");
        if(action=="cancel")current["status"]="cancelled";else if(action=="reject")current["status"]="rejected";else {current["step_index"]=index+1;if(index+1>=definitionSteps.Count)current["status"]="approved";}
        current["due_at"]=Json.String(current,"status")=="pending"?JsonValue.Create(DateTimeOffset.UtcNow.AddDays(2)):null;RecordSession.Touch(current);RecordSession.History(current,action,session.Actor.Id,Json.String(p,"note"));await session.Save([("workflows.items",current)],Allowed,ct);return current;
    }
}
