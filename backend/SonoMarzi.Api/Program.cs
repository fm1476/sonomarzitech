using Amazon.Lambda.AspNetCoreServer.Hosting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SonoMarzi.Api.Authentication;
using SonoMarzi.Api.Authorization;
using SonoMarzi.Api.Attachments;
using SonoMarzi.Api.Contracts;
using SonoMarzi.Api.Endpoints;
using SonoMarzi.Api.Persistence;
using SonoMarzi.Api.Services;

var builder = WebApplication.CreateBuilder(args);
if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AWS_LAMBDA_FUNCTION_NAME"))) builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);
var local = builder.Configuration.GetValue<bool>("Local:Enabled");
if (local && !builder.Environment.IsDevelopment()) throw new InvalidOperationException("Local mode requires ASPNETCORE_ENVIRONMENT=Development.");
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 32 * 1024 * 1024);
builder.Services.AddSingleton<WorkspacePolicy>();
builder.Services.AddSingleton<AttachmentService>();
builder.Services.AddSingleton<FieldTrainingService>();
builder.Services.AddSingleton<WorkflowService>();
builder.Services.AddSingleton<NoticeService>();
if (local)
{
    builder.Services.AddSingleton<LocalSessions>(); builder.Services.AddSingleton<IWorkspaceStore, LocalWorkspaceStore>();
    builder.Services.AddAuthentication("Local").AddScheme<AuthenticationSchemeOptions, LocalAuthenticationHandler>("Local", _ => { });
}
else
{
    var issuer = builder.Configuration["Cognito:Issuer"] ?? throw new InvalidOperationException("Cognito:Issuer is required.");
    var client = builder.Configuration["Cognito:ClientId"] ?? throw new InvalidOperationException("Cognito:ClientId is required.");
    if (!Uri.TryCreate(issuer, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !uri.Host.EndsWith(".amazonaws.com", StringComparison.Ordinal)) throw new InvalidOperationException("Cognito:Issuer must be an HTTPS AWS Cognito issuer.");
    builder.Services.AddSingleton<RdsConnectionFactory>(); builder.Services.AddSingleton<IWorkspaceStore, RdsWorkspaceStore>();
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
    {
        o.Authority = issuer; o.Audience = client; o.MapInboundClaims = false; o.RequireHttpsMetadata = true;
        o.TokenValidationParameters = new() { ValidateIssuer = true, ValidIssuer = issuer, ValidateAudience = true, ValidAudience = client, ValidateLifetime = true, ValidateIssuerSigningKey = true, ValidAlgorithms = [SecurityAlgorithms.RsaSha256], ClockSkew = TimeSpan.FromSeconds(30) };
        o.Events = new JwtBearerEvents { OnTokenValidated = ctx => { if (ctx.Principal?.FindFirst("token_use")?.Value != "id" || string.IsNullOrWhiteSpace(ctx.Principal.FindFirst("sub")?.Value)) ctx.Fail("A Cognito ID token is required."); return Task.CompletedTask; } };
    });
}
builder.Services.AddAuthorization();
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
if (origins.Length > 0) builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.Use(async (http, next) =>
{
    http.Response.Headers["X-Content-Type-Options"] = "nosniff";
    http.Response.Headers["Cache-Control"] = "no-store";
    try { await next(); }
    catch (ApiException error) { http.Response.StatusCode = error.Status; await http.Response.WriteAsJsonAsync(new { success = false, code = error.Status == 409 ? "40001" : error.Status == 403 ? "42501" : null, error = error.Message }); }
    catch (Exception error) when (error is System.Text.Json.JsonException or BadHttpRequestException) { http.Response.StatusCode = 400; await http.Response.WriteAsJsonAsync(new { success = false, error = "Invalid JSON request." }); }
    catch (OperationCanceledException) when (http.RequestAborted.IsCancellationRequested) { }
    catch (Exception error) { app.Logger.LogError(error, "Request failed: {TraceId}", http.TraceIdentifier); http.Response.StatusCode = 500; await http.Response.WriteAsJsonAsync(new { success = false, error = "The request could not be completed.", trace_id = http.TraceIdentifier }); }
});
if (origins.Length > 0) app.UseCors();
app.UseAuthentication(); app.UseAuthorization();
WorkspaceEndpoints.Map(app, local);
ServiceEndpoints.Map(app);
app.MapFallback("/api/{**path}", () => Results.Json(new { success = false, error = "Route not found." }, statusCode: 404));
app.Run();
public partial class Program { }
