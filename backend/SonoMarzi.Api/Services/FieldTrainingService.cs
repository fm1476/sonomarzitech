using System.Text.Json.Nodes;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Attachments;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Persistence;
namespace SonoMarzi.Api.Services;

/// <summary>Versioned trainee files, immutable enrollment templates, evaluations and approval transitions.</summary>
public sealed class FieldTrainingService(IWorkspaceStore store, AttachmentService attachments)
{
    private static bool Manage(PolicyScope scope) => scope.Has("ft_manage");
    private static JsonObject New() => new() { ["id"] = Guid.NewGuid().ToString(), ["version"] = 1, ["created_at"] = DateTimeOffset.UtcNow, ["updated_at"] = DateTimeOffset.UtcNow };
    private static bool Assigned(JsonNode? enrollment, string user) => new[] { "trainee_user", "trainer_user", "supervisor_user" }.Any(f => Json.String(enrollment, f) == user);
    public async Task<JsonNode> Execute(RecordSession session, string action, JsonObject p, string baseUrl, CancellationToken ct)
    {
        var user = session.Actor.Id; var permissions = session.Permissions; var context = session.Context;
        var enrollments = session.List("ft.enrollments"); var reports = session.List("ft.reports"); var coverage = session.List("ft.coverage"); var shifts = session.List("ft.shifts"); var attachmentRows = session.List("ft.attachments");
        bool Visible(JsonNode? e) => Manage(permissions) || Assigned(e,user) || coverage.Any(c => Json.String(c,"enrollment_id")==Json.String(e,"id") && Json.String(c,"cover_user")==user && c?["cancelled_at"] is null);
        JsonObject Enrollment(string id) { var e=session.Require("ft.enrollments",id);if(!Visible(e))throw new ApiException(403,"This trainee file is not assigned to you.");return e; }
        bool Trainer(JsonObject e) => Json.String(e,"trainer_user")==user || coverage.Any(c=>Json.String(c,"enrollment_id")==Json.String(e,"id") && Json.String(c,"cover_user")==user && c?["cancelled_at"] is null && string.CompareOrdinal(Json.String(c,"start_on"),DateTime.UtcNow.ToString("yyyy-MM-dd"))<=0 && string.CompareOrdinal(Json.String(c,"end_on"),DateTime.UtcNow.ToString("yyyy-MM-dd"))>=0);
        if(action=="list")
        {
            var visible=enrollments.Where(Visible).ToArray();var ids=visible.Select(e=>Json.String(e,"id")).ToHashSet();
            return new JsonObject { ["config"]=session.Rows("ft.config").FirstOrDefault()?.Value?.DeepClone(),["members"]=await store.WorkspaceMembers(context,ct),["enrollments"]=Json.Array(visible),["reports"]=Json.Array(reports.Where(r=>ids.Contains(Json.String(r,"enrollment_id")))),["coverage"]=Json.Array(coverage.Where(c=>ids.Contains(Json.String(c,"enrollment_id")))),["shifts"]=Json.Array(shifts.Where(s=>ids.Contains(Json.String(s,"enrollment_id")))),["attachments"]=Json.Array(attachmentRows.Where(a=>a?["confirmed_at"] is not null && reports.Any(r=>Json.String(r,"id")==Json.String(a,"report_id")&&ids.Contains(Json.String(r,"enrollment_id"))))) };
        }
        if(action=="save_config")
        {
            var model=RecordSession.Required(p,"model");if(model is not ("san_jose" or "reno"))throw new ApiException(400,"Unknown training model.");
            if(p["template"] is not JsonObject template)throw new ApiException(400,"Program template required.");
            foreach(var field in new[]{"phases","ratingScale","categories","items"})if(template[field] is not JsonArray {Count:>0 and <=100} rows || rows.Any(n=>Json.String(n,"id").Length==0 || (Json.String(n,"label").Length==0 && Json.String(n,"name").Length==0)) || rows.Select(n=>Json.String(n,"id")).Distinct().Count()!=rows.Count)throw new ApiException(400,$"Invalid {field}.");
            var config=session.Row("ft.config","program")?.Value?.DeepClone().AsObject() ?? New();if(session.Row("ft.config","program") is not null)RecordSession.CheckVersion(p,config);config["id"]="program";config["model"]=model;config["template"]=template.DeepClone();if(session.Row("ft.config","program") is not null)RecordSession.Touch(config);await session.Save([("ft.config",config)],Manage,ct);return config;
        }
        if(action=="enroll")
        {
            var config=session.Require("ft.config","program");var members=await store.WorkspaceMembers(context,ct);
            var trainee=RecordSession.Required(p,"traineeUser");var trainer=RecordSession.Required(p,"trainerUser");var supervisor=RecordSession.Required(p,"supervisorUser");
            if(new[]{trainee,trainer,supervisor}.Distinct().Count()!=3 || new[]{trainee,trainer,supervisor}.Any(id=>!members.Any(m=>Json.String(m,"user_id")==id)))throw new ApiException(400,"Choose three different active members.");
            if(enrollments.Any(e=>Json.String(e,"trainee_user")==trainee && Json.String(e,"status") is "active" or "extended"))throw new ApiException(409,"Trainee is already enrolled.");
            var trainerMember=members.First(m=>Json.String(m,"user_id")==trainer)!;var traineeMember=members.First(m=>Json.String(m,"user_id")==trainee)!;var supervisorMember=members.First(m=>Json.String(m,"user_id")==supervisor)!;
            var e=New();e["model"]=config["model"]?.DeepClone();e["template"]=config["template"]?.DeepClone();e["template_version"]=config["version"]?.DeepClone();e["trainee_user"]=trainee;e["trainer_user"]=trainer;e["supervisor_user"]=supervisor;e["trainee_person"]=Json.String(traineeMember,"person_id");e["trainer_person"]=Json.String(trainerMember,"person_id");e["supervisor_person"]=Json.String(supervisorMember,"person_id");e["started_on"]=RecordSession.Date(p,"startedOn");e["phase_index"]=0;e["status"]="active";
            await session.Save([("ft.enrollments",e)],Manage,ct);return e;
        }
        if(action is "coverage_add" or "coverage_cancel" or "reassign" or "advance" or "shift_add" or "shift_cancel" or "new_report")
        {
            var e=Enrollment(RecordSession.Required(p,"enrollmentId"));var enrollmentId=Json.String(e,"id");
            if(Json.String(e,"status") is not ("active" or "extended") && action is not ("coverage_cancel" or "shift_cancel"))throw new ApiException(409,"This trainee file is closed.");
            if(action=="coverage_add")
            {
                var start=RecordSession.Date(p,"startOn");var end=RecordSession.Date(p,"endOn");if(string.CompareOrdinal(start,end)>0)throw new ApiException(400,"Coverage ends before it starts.");var coverUser=RecordSession.Required(p,"coverUser");if(!(await store.WorkspaceMembers(context,ct)).Any(m=>Json.String(m,"user_id")==coverUser))throw new ApiException(400,"Active covering trainer required.");
                var c=New();c["enrollment_id"]=enrollmentId;c["cover_user"]=coverUser;c["start_on"]=start;c["end_on"]=end;c["reason"]=RecordSession.Required(p,"reason",1000);await session.Save([("ft.coverage",c)],s=>Manage(s)||s.Has("ft_assign_cover"),ct);return c;
            }
            if(action=="coverage_cancel") {var c=session.Require("ft.coverage",RecordSession.Required(p,"coverageId"));if(Json.String(c,"enrollment_id")!=enrollmentId)throw new ApiException(403,"Coverage belongs to another file.");c["cancelled_at"]=DateTimeOffset.UtcNow;RecordSession.Touch(c);await session.Save([("ft.coverage",c)],s=>Manage(s)||s.Has("ft_assign_cover"),ct);return c;}
            if(action=="reassign") {RecordSession.CheckVersion(p,e);var trainer=RecordSession.Required(p,"trainerUser");var supervisor=RecordSession.Required(p,"supervisorUser");var members=await store.WorkspaceMembers(context,ct);if(trainer==supervisor || new[]{trainer,supervisor}.Contains(Json.String(e,"trainee_user")) || new[]{trainer,supervisor}.Any(id=>!members.Any(m=>Json.String(m,"user_id")==id)))throw new ApiException(400,"Choose different active members.");e["trainer_user"]=trainer;e["supervisor_user"]=supervisor;RecordSession.Touch(e);RecordSession.History(e,"reassigned",user);await session.Save([("ft.enrollments",e)],Manage,ct);return e;}
            if(action=="advance")
            {
                RecordSession.CheckVersion(p,e);var outcome=RecordSession.Required(p,"outcome");var phase=e["phase_index"]!.GetValue<int>();
                if(outcome is not ("next" or "extended" or "completed" or "separated"))throw new ApiException(400,"Invalid outcome.");
                if(outcome is "next" or "completed" && !reports.Any(r=>Json.String(r,"enrollment_id")==enrollmentId && Json.String(r,"kind")== (outcome=="next"?"phase":"final") && r?["phase_index"]?.GetValue<int>()==phase && Json.String(r,"status") is "trainee_ack" or "acknowledged" or "disputed"))throw new ApiException(409,"A supervisor-approved milestone report is required.");
                if(outcome=="next"){if(phase+1>=(e["template"]?["phases"] as JsonArray)!.Count)throw new ApiException(400,"Already in the final phase.");e["phase_index"]=phase+1;e["status"]="active";}else e["status"]=outcome;
                RecordSession.Touch(e);RecordSession.History(e,outcome,user);await session.Save([("ft.enrollments",e)],Manage,ct);return e;
            }
            if(action=="shift_add")
            {
                var trainer=RecordSession.Required(p,"trainerUser");if(!Manage(permissions)&&(!Trainer(e)||trainer!=user))throw new ApiException(403,"Only an assigned trainer can log their shift.");
                if(p["hours"] is not JsonValue v || !v.TryGetValue<double>(out var hours) || !double.IsFinite(hours) || hours<=0 || hours>24)throw new ApiException(400,"Shift hours must be between 0 and 24.");
                var s=New();s["enrollment_id"]=enrollmentId;s["trainer_user"]=trainer;s["shift_on"]=RecordSession.Date(p,"shiftOn");s["phase_index"]=e["phase_index"]?.DeepClone();s["hours"]=hours;s["notes"]=Json.String(p,"notes");await session.Save([("ft.shifts",s)],scope=>Manage(scope)||scope.Has("ft_train")&&Trainer(e),ct);return s;
            }
            if(action=="shift_cancel") {var s=session.Require("ft.shifts",RecordSession.Required(p,"shiftId"));if(Json.String(s,"enrollment_id")!=enrollmentId)throw new ApiException(403,"Shift belongs to another file.");s["cancelled_at"]=DateTimeOffset.UtcNow;RecordSession.Touch(s);await session.Save([("ft.shifts",s)],Manage,ct);return s;}
            var kind=RecordSession.Required(p,"kind");if(kind is not ("daily" or "weekly" or "phase" or "final" or "coverage"))throw new ApiException(400,"Unknown report type.");
            var startOn=RecordSession.Date(p,"periodStart");var endOn=RecordSession.Date(p,"periodEnd");if(string.CompareOrdinal(startOn,endOn)>0)throw new ApiException(400,"Report period ends before it starts.");
            var report=New();report["enrollment_id"]=enrollmentId;report["kind"]=kind;report["period_start"]=startOn;report["period_end"]=endOn;report["phase_index"]=e["phase_index"]?.DeepClone();report["trainer_user"]=user;report["supervisor_user"]=e["supervisor_user"]?.DeepClone();report["trainee_user"]=e["trainee_user"]?.DeepClone();report["status"]="draft";report["content"]=new JsonObject();report["history"]=new JsonArray();
            await session.Save([("ft.reports",report)],s=>Manage(s)||s.Has("ft_train")&&Trainer(e),ct);return report;
        }
        var r=session.Require("ft.reports",RecordSession.Required(p,"reportId"));var enrollment=Enrollment(Json.String(r,"enrollment_id"));
        var status=Json.String(r,"status");bool CanEdit(PolicyScope scope)=> status is "draft" or "returned" && (Manage(scope)||scope.Has("ft_train")&&Json.String(r,"trainer_user")==user);
        if(action=="save_report") {RecordSession.CheckVersion(p,r);if(p["content"] is not JsonObject content || Json.String(content,"narrative").Length>12000 || Json.String(content,"recommendation").Length>3000)throw new ApiException(400,"Invalid report content.");r["content"]=content.DeepClone();RecordSession.Touch(r);await session.Save([("ft.reports",r)],CanEdit,ct);return r;}
        if(action=="reserve_attachment")
        {
            if(!CanEdit(permissions))throw new ApiException(403,"Only an editable report may receive attachments.");
            var size=p["byteCount"]?.GetValue<long>()??0;if(size<=0||size>10*1024*1024)throw new ApiException(400,"Choose a supported file up to 10 MB.");
            var upload=await attachments.Upload(context,RecordSession.Required(p,"fileName"),RecordSession.Required(p,"contentType"),size,baseUrl);
            var a=New();a["report_id"]=Json.String(r,"id");a["object_path"]=upload.Key;a["file_name"]=Json.String(p,"fileName");a["description"]=Json.String(p,"description");a["byte_count"]=size;await session.Save([("ft.attachments",a)],CanEdit,ct);var response=a.DeepClone().AsObject();response["upload_url"]=upload.Url;return response;
        }
        if(action is "confirm_attachment" or "download")
        {
            var a=session.Require("ft.attachments",RecordSession.Required(p,"attachmentId"));if(Json.String(a,"report_id")!=Json.String(r,"id"))throw new ApiException(403,"Attachment belongs to another report.");
            if(action=="download") {if(a["confirmed_at"] is null)throw new ApiException(404,"Attachment upload is incomplete.");return a;}
            if(!await attachments.Exists(Json.String(a,"object_path"),ct))throw new ApiException(409,"Attachment upload has not completed.");a["confirmed_at"]=DateTimeOffset.UtcNow;RecordSession.Touch(a);await session.Save([("ft.attachments",a)],CanEdit,ct);return a;
        }
        RecordSession.CheckVersion(p,r);string next;Func<PolicyScope,bool> allowed;
        switch(action)
        {
            case "submit": next="supervisor_review";allowed=s=>s.Has("ft_train")&&status is "draft" or "returned"&&Json.String(r,"trainer_user")==user;if(Json.String(r["content"],"narrative").Length==0)throw new ApiException(400,"Add observations before submitting.");r["trainer_submitted_at"]=DateTimeOffset.UtcNow;break;
            case "return": case "approve": next=action=="approve"?"trainee_ack":"returned";allowed=s=>s.Has("ft_participate")&&status=="supervisor_review"&&Json.String(r,"supervisor_user")==user;if(action=="approve")r["supervisor_approved_at"]=DateTimeOffset.UtcNow;break;
            case "acknowledge": case "dispute": next=action=="acknowledge"?"acknowledged":"disputed";allowed=s=>s.Has("ft_participate")&&status=="trainee_ack"&&Json.String(r,"trainee_user")==user;if(action=="dispute"&&Json.String(p,"note").Trim().Length==0)throw new ApiException(400,"Explain the dispute.");r["trainee_responded_at"]=DateTimeOffset.UtcNow;break;
            default:throw new ApiException(400,"Unknown Field Training action.");
        }
        r["status"]=next;RecordSession.Touch(r);RecordSession.History(r,action,user,Json.String(p,"note"));await session.Save([("ft.reports",r)],allowed,ct);return r;
    }
}
