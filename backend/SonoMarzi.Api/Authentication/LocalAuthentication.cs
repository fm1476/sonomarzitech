using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using SonoMarzi.Api.Contracts;
namespace SonoMarzi.Api.Authentication;
public sealed class LocalSessions(IConfiguration config, IWebHostEnvironment env)
{
    private readonly ConcurrentDictionary<string, (string Subject, DateTimeOffset Expires)> sessions = [];
    public string Login(string email, string password)
    {
        if (!env.IsDevelopment()) throw new ApiException(404, "Route not found.");
        var subject = email.Equals(config["Local:Email"] ?? "admin@local.test", StringComparison.OrdinalIgnoreCase) ? "local-admin" : email.Equals("officer@local.test", StringComparison.OrdinalIgnoreCase) ? "local-officer" : email.Equals("trainer@local.test", StringComparison.OrdinalIgnoreCase) ? "local-trainer" : email.Equals("supervisor@local.test", StringComparison.OrdinalIgnoreCase) ? "local-supervisor" : "";
        var expected = config["Local:Password"] ?? throw new InvalidOperationException("Set Local:Password for local testing.");
        if (!CryptographicOperations.FixedTimeEquals(SHA256.HashData(Encoding.UTF8.GetBytes(password)), SHA256.HashData(Encoding.UTF8.GetBytes(expected))) || subject.Length == 0) throw new ApiException(401, "Unable to sign in with those credentials.");
        foreach (var expired in sessions.Where(s => s.Value.Expires <= DateTimeOffset.UtcNow)) sessions.TryRemove(expired.Key, out _);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)); sessions[token] = (subject, DateTimeOffset.UtcNow.AddHours(8)); return token;
    }
    public string? Resolve(string token) => sessions.TryGetValue(token, out var s) && s.Expires > DateTimeOffset.UtcNow ? s.Subject : null;
    public void Revoke(string token) => sessions.TryRemove(token, out _);
}
public sealed class LocalAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, LocalSessions sessions) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return Task.FromResult(AuthenticateResult.NoResult());
        var subject = sessions.Resolve(header[7..]);
        if (subject is null) return Task.FromResult(AuthenticateResult.Fail("Invalid or expired session."));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", subject)], Scheme.Name)), Scheme.Name)));
    }
}
