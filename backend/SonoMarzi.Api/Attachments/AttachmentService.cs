using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Attachments;
public sealed record SignedAttachment(string Key, string Url, int ExpiresIn = 300);
public sealed class AttachmentService(IConfiguration config, IWebHostEnvironment env) : IDisposable
{
    public const long MaxBytes = 25 * 1024 * 1024;
    private readonly bool local = config.GetValue<bool>("Local:Enabled") && env.IsDevelopment();
    private readonly ConcurrentDictionary<string, (string Key, bool Upload, string Type, DateTimeOffset Expires)> tickets = [];
    private readonly IAmazonS3? s3 = config.GetValue<bool>("Local:Enabled") ? null : new AmazonS3Client(RegionEndpoint.GetBySystemName(config["AWS:Region"] ?? "us-east-2"));
    private string Bucket => config["AWS:AttachmentsBucket"] ?? throw new InvalidOperationException("AWS:AttachmentsBucket is required.");
    private string PathFor(string key) => Path.Combine(env.ContentRootPath, ".local/attachments", Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key))));
    public static void CheckKey(WorkspaceContext context, string key)
    {
        if (!key.StartsWith($"tenants/{context.TenantId}/agencies/{context.AgencyId}/attachments/", StringComparison.Ordinal) || key.Length > 1024 || key.Contains("..", StringComparison.Ordinal) || key.Contains('\\')) throw new ApiException(403, "Attachment does not belong to this workspace.");
    }
    public async Task<SignedAttachment> Upload(WorkspaceContext context, string fileName, string contentType, long size, string baseUrl)
    {
        if (size < 0 || size > MaxBytes) throw new ApiException(400, "Attachment size must be at most 25 MB.");
        if (contentType.Length > 200 || contentType.Contains('\r') || contentType.Contains('\n')) throw new ApiException(400, "Invalid content type.");
        var safeName = Regex.Replace(fileName, @"[^\w.\- ()]+", "_"); safeName = Regex.Replace(safeName, "_+", "_"); if (safeName.Length > 180) safeName = safeName[..180]; if (safeName.Length == 0) safeName = "attachment";
        var key = $"tenants/{context.TenantId}/agencies/{context.AgencyId}/attachments/{DateTimeOffset.UtcNow:yyyy-MM-ddTHH-mm-ss}-{Guid.NewGuid()}_{safeName}";
        return await Sign(key, true, contentType, baseUrl);
    }
    public Task<SignedAttachment> Download(WorkspaceContext context, string key, string baseUrl) { CheckKey(context, key); return Sign(key, false, "application/octet-stream", baseUrl); }
    private async Task<SignedAttachment> Sign(string key, bool upload, string type, string baseUrl)
    {
        if (local)
        {
            foreach (var expired in tickets.Where(t => t.Value.Expires <= DateTimeOffset.UtcNow)) tickets.TryRemove(expired.Key, out _);
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)); tickets[token] = (key, upload, type, DateTimeOffset.UtcNow.AddMinutes(5));
            return new(key, $"{baseUrl}/api/attachments/local/{token}");
        }
        var request = new GetPreSignedUrlRequest { BucketName = Bucket, Key = key, Verb = upload ? HttpVerb.PUT : HttpVerb.GET, Expires = DateTime.UtcNow.AddMinutes(5), ContentType = upload ? type : null, Protocol = Protocol.HTTPS };
        return new(key, await s3!.GetPreSignedURLAsync(request));
    }
    public async Task<bool> Exists(string key,CancellationToken ct)
    {
        if(local)return File.Exists(PathFor(key));
        try { await s3!.GetObjectMetadataAsync(new GetObjectMetadataRequest {BucketName=Bucket,Key=key},ct);return true; }
        catch(AmazonS3Exception e) when(e.StatusCode==System.Net.HttpStatusCode.NotFound){return false;}
    }
    public async Task Delete(WorkspaceContext context, string key, CancellationToken ct)
    {
        CheckKey(context, key); if (!context.Admin) throw new ApiException(403, "Attachment deletion is limited to agency administrators.");
        if (local) { var path = PathFor(key); if (File.Exists(path)) File.Delete(path); foreach (var ticket in tickets.Where(t => t.Value.Key == key)) tickets.TryRemove(ticket.Key, out _); }
        else await s3!.DeleteObjectAsync(new DeleteObjectRequest { BucketName = Bucket, Key = key }, ct);
    }
    public async Task<IResult> Transfer(HttpContext http, string token, CancellationToken ct)
    {
        if (!local || !tickets.TryGetValue(token, out var ticket) || ticket.Expires <= DateTimeOffset.UtcNow) throw new ApiException(403, "Invalid or expired attachment URL.");
        var path = PathFor(ticket.Key);
        if (!ticket.Upload)
        {
            if (!HttpMethods.IsGet(http.Request.Method)) throw new ApiException(405, "Method not allowed.");
            return File.Exists(path) ? Results.File(path, "application/octet-stream", Path.GetFileName(ticket.Key)) : throw new ApiException(404, "Attachment not found.");
        }
        if (!HttpMethods.IsPut(http.Request.Method)) throw new ApiException(405, "Method not allowed.");
        if (http.Request.ContentLength > MaxBytes) throw new ApiException(413, "Attachment exceeds 25 MB.");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!); var temporary = path + "." + Guid.NewGuid().ToString("N");
        try
        {
            await using (var output = File.Create(temporary))
            {
                var buffer = new byte[65536]; long total = 0; int count;
                while ((count = await http.Request.Body.ReadAsync(buffer, ct)) > 0) { total += count; if (total > MaxBytes) throw new ApiException(413, "Attachment exceeds 25 MB."); await output.WriteAsync(buffer.AsMemory(0, count), ct); }
            }
            File.Move(temporary, path, true); tickets.TryRemove(token, out _); return Results.Ok();
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    public void Dispose() => s3?.Dispose();
}
