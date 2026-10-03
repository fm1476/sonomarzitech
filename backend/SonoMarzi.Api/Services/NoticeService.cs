using System.Text.Json.Nodes;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Persistence;
using SonoMarzi.Api.Authorization;
namespace SonoMarzi.Api.Services;
public sealed class NoticeService(IWorkspaceStore store)
{
    private static bool Send(PolicyScope scope)=>scope.Has("staff_notify_send");
    public async Task<JsonNode> Execute(RecordSession session,string name,JsonObject p,CancellationToken ct)
    {
        var person=session.Context.PersonId;var notices=session.List("notices.messages");var receipts=session.List("notices.receipts");
        if(name=="suite_notify_inbox")return Json.Array(receipts.Where(r=>Json.String(r,"personId")==person && r?["cleared_at"] is null).Select(r=>{
            var notice=notices.FirstOrDefault(n=>Json.String(n,"id")==Json.String(r,"notice_id"));if(notice is null)return null;var copy=notice.DeepClone().AsObject();copy["read_at"]=r?["read_at"]?.DeepClone();copy["response"]=r?["response"]?.DeepClone();return (JsonNode)copy;
        }).Where(n=>n is not null));
        if(name=="suite_notify_create")
        {
            var body=RecordSession.Required(p,"p_body",4000);var clientId=RecordSession.Required(p,"p_client_id");
            var duplicate=notices.FirstOrDefault(n=>Json.String(n,"client_id")==clientId&&Json.String(n,"senderPersonId")==person);if(duplicate is not null){if(Json.String(duplicate,"body")!=body)throw new ApiException(409,"This notice ID has different content.");return duplicate.DeepClone();}
            var people=Json.Strings(p["p_people"]).ToHashSet();var units=Json.Strings(p["p_units"]);var roster=session.List("personnel");foreach(var member in roster.Where(m=>units.Contains(Json.String(m,"unit"))))people.Add(Json.String(member,"id"));
            var onDate=RecordSession.Date(p,"p_on_date");var shiftIds=Json.Strings(p["p_shifts"]);foreach(var assignment in session.List("pm.scheduleAssignments").Where(a=>shiftIds.Contains(Json.String(a,"shiftId"))&&string.CompareOrdinal(Json.String(a,"startDate"),onDate)<=0&&(Json.String(a,"endDate").Length==0||string.CompareOrdinal(Json.String(a,"endDate"),onDate)>=0)))people.Add(Json.String(assignment,"personId"));
            var members=await store.WorkspaceMembers(session.Context,ct);people.IntersectWith(members.Select(m=>Json.String(m,"person_id")));if(people.Count is <1 or >1000)throw new ApiException(400,"Choose at least one active recipient.");
            var notice=new JsonObject { ["id"]=Guid.NewGuid().ToString(),["client_id"]=clientId,["body"]=body,["senderPersonId"]=person,["created_at"]=DateTimeOffset.UtcNow,["recipients"]=people.Count };
            var values=new List<(string,JsonObject)>{("notices.messages",notice)};foreach(var id in people)values.Add(("notices.receipts",new JsonObject { ["id"]=Json.String(notice,"id")+"-"+id,["notice_id"]=Json.String(notice,"id"),["personId"]=id }));
            await session.Save(values,Send,ct);return notice;
        }
        var noticeId=Json.String(p,"p_notice");
        if(name is "suite_notify_respond" or "suite_notify_clear")
        {
            var receipt=session.Require("notices.receipts",noticeId+"-"+person);if(name=="suite_notify_clear"){if(receipt["response"] is null)throw new ApiException(400,"Respond before clearing a notice.");receipt["cleared_at"]=DateTimeOffset.UtcNow;}
            else {var response=RecordSession.Required(p,"p_response");if(response is not ("read" or "acknowledged" or "interested" or "declined"))throw new ApiException(400,"Invalid response.");receipt["read_at"]??=JsonValue.Create(DateTimeOffset.UtcNow);if(response!="read")receipt["response"]=response;}
            await session.Save([("notices.receipts",receipt)],_=>Json.String(receipt,"personId")==person,ct);return receipt;
        }
        if(name=="suite_notify_history")return Json.Array(notices.Where(n=>Json.String(n,"senderPersonId")==person||session.Context.Admin).Select(n=>{var copy=n!.DeepClone().AsObject();var rs=receipts.Where(r=>Json.String(r,"notice_id")==Json.String(n,"id")).ToArray();copy["read_count"]=rs.Count(r=>r?["read_at"] is not null);copy["interested"]=rs.Count(r=>Json.String(r,"response")=="interested");copy["declined"]=rs.Count(r=>Json.String(r,"response")=="declined");copy["pushed"]=0;return (JsonNode)copy;}));
        if(name=="suite_notify_responses")
        {
            var notice=session.Require("notices.messages",noticeId);if(!session.Context.Admin&&Json.String(notice,"senderPersonId")!=person)throw new ApiException(403,"Only the sender may inspect recipients.");var members=await store.WorkspaceMembers(session.Context,ct);return Json.Array(receipts.Where(r=>Json.String(r,"notice_id")==noticeId).Select(r=>{var copy=r!.DeepClone().AsObject();copy["name"]=Json.String(members.FirstOrDefault(m=>Json.String(m,"person_id")==Json.String(r,"personId")),"display_name");copy["push_status"]="not_configured";return (JsonNode)copy;}));
        }
        if(name=="suite_notify_device_enabled")return JsonValue.Create(false)!;
        if(name is "suite_notify_push_key" or "suite_notify_subscribe" or "suite_notify_unsubscribe")throw new ApiException(503,"Push delivery is not configured. In-app notices are available.");
        throw new ApiException(404,"Unknown notice operation.");
    }
}
