using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Persistence;
public interface IWorkspaceStore
{
    Task<Actor> FindActor(string subject, CancellationToken ct);
    Task<System.Text.Json.Nodes.JsonArray> WorkspaceMembers(WorkspaceContext context, CancellationToken ct);
    Task<JsonArrayResult> Memberships(Actor actor, CancellationToken ct);
    Task<WorkspaceContext> Resolve(Actor actor, string tenant, string agency, CancellationToken ct);
    Task<Snapshot> Load(WorkspaceContext context, CancellationToken ct);
    Task<IReadOnlyList<StoredRecord>> Apply(Actor actor, WorkspaceContext context, IReadOnlyList<Change> changes, CancellationToken ct, Func<WorkspaceContext, IReadOnlyList<StoredRecord>, bool>? serviceAuthorization = null);
}
public sealed record JsonArrayResult(System.Text.Json.Nodes.JsonArray Items);
