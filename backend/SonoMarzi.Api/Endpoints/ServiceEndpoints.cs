using System.Text.Json.Nodes;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Persistence;
using SonoMarzi.Api.Services;
namespace SonoMarzi.Api.Endpoints;
public static class ServiceEndpoints
{
    public static void Map(WebApplication app)
    {
        var api=app.MapGroup("/api").RequireAuthorization();
        api.MapPost("/rpc/{name}",async (string name,HttpContext http,IWorkspaceStore store,WorkspacePolicy policy,FieldTrainingService training,WorkflowService workflows,NoticeService notices,NotificationReadService notificationReads,CancellationToken ct)=>{
            var p=await WorkspaceEndpoints.Body(http,ct);var actor=await WorkspaceEndpoints.Actor(http,store,ct);
            var tenant=Json.String(p,"p_tenant_id",Json.String(p,"p_tenant"));var agency=Json.String(p,"p_agency_id",Json.String(p,"p_agency"));
            if(tenant.Length==0&&agency.Length==0){var members=(await store.Memberships(actor,ct)).Items.Where(n=>Json.String(n,"status")=="active").ToArray();if(members.Length!=1)throw new ApiException(409,"Choose a workspace first.");tenant=Json.String(members[0],"tenant_id");agency=Json.String(members[0],"agency_id");}
            var context=await store.Resolve(actor,tenant,agency,ct);var snapshot=await store.Load(context,ct);var session=new RecordSession(store,policy,actor,context,snapshot);
            if(name=="suite_ft_api")return Results.Ok(await training.Execute(session,RecordSession.Required(p,"p_action"),p["p_payload"]?.AsObject()??new(),$"{http.Request.Scheme}://{http.Request.Host}",ct));
            if(name=="suite_workflow_api")return Results.Ok(await workflows.Execute(session,RecordSession.Required(p,"p_action"),p["p_payload"]?.AsObject()??new(),ct));
            if(name=="suite_notification_reads")return Results.Ok(await notificationReads.Execute(session,p,ct));
            if(name.StartsWith("suite_notify_",StringComparison.Ordinal))return Results.Ok(await notices.Execute(session,name,p,ct));
            if(name=="suite_load_workspace")return Results.Ok(new {success=true,tenant_id=tenant,agency_id=agency,person_id=context.PersonId,role_ids=context.RoleIds,records=policy.For(context,snapshot.Records).Filter().Select(r=>r.ToJson()),template=WorkspaceEndpoints.SafeTemplate(snapshot.Template),tenant=snapshot.Tenant,agency=snapshot.Agency});
            if(name=="suite_log_activity") {var entry=new JsonObject { ["id"]=Guid.NewGuid().ToString(),["actor_id"]=actor.Id,["actor_person_id"]=context.PersonId,["module"]=RecordSession.Required(p,"p_module",100),["description"]=RecordSession.Required(p,"p_description",4000),["entity_type"]=Json.String(p,"p_entity_type"),["created_at"]=DateTimeOffset.UtcNow };await session.Save([("serverAudit",entry)],_=>true,ct);return Results.Ok(entry);}
            if(name=="suite_get_activity_log") {if(!session.Permissions.Any("view_audit_log","audit_view","audit_log_view"))throw new ApiException(403,"Audit access required.");return Results.Ok(session.List("serverAudit"));}
            if(name=="suite_resolve_actor_names"){var ids=Json.Strings(p["p_actor_ids"]);return Results.Ok(Json.Array((await store.WorkspaceMembers(context,ct)).Where(m=>ids.Contains(Json.String(m,"user_id"))).Select(m=>new JsonObject {["actor_id"]=Json.String(m,"user_id"),["display_name"]=Json.String(m,"display_name"),["email"]=Json.String(m,"email")})));}
            if(name=="suite_list_contexts")return Results.Ok(new {tenants=await store.TenantCatalog(actor,context,ct),current=new {tenantId=tenant,agencyId=agency}});
            if(name=="suite_submit_vehicle_inspection")
            {
                if(p["p_inspection"] is not JsonObject inspection)throw new ApiException(400,"Inspection required.");var clientId=RecordSession.Required(p,"p_client_id");var duplicate=session.List("fleet.inspections").FirstOrDefault(r=>Json.String(r,"client_id")==clientId);if(duplicate is not null)return Results.Ok(duplicate);
                inspection=inspection.DeepClone().AsObject();inspection["id"]="inspection-"+clientId;inspection["client_id"]=clientId;inspection["submittedByPersonId"]=context.PersonId;inspection["submitted_at"]=DateTimeOffset.UtcNow;
                await session.Save([("fleet.inspections",inspection)],s=>s.Has("fleet_inspection_conduct"),ct);return Results.Ok(inspection);
            }
            throw new ApiException(404,"Unknown operation.");
        });
        api.MapPost("/services/{name}",async(string name,HttpContext http,IWorkspaceStore store,CancellationToken ct)=>{
            var body=await WorkspaceEndpoints.Body(http,ct);await WorkspaceEndpoints.Actor(http,store,ct);
            if(name=="staff-notify")throw new ApiException(503,"Push delivery is not configured. The in-app notice was saved.");
            // External provisioning/integration contracts require the actual database schema and provider setup.
            throw new ApiException(503,"This administrative integration requires the AWS schema and provider configuration. No changes were made.");
        });
    }
}
