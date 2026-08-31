using Microsoft.Extensions.FileProviders;
using Microsoft.Net.Http.Headers;
using System.Net;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://+:8080");
builder.Services.AddHttpClient("ai", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["AiApiBaseUrl"] ?? "http://crosscart-ai:8080");
    client.Timeout = Timeout.InfiniteTimeSpan;
});
var app = builder.Build();
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var siteLastModified = File.Exists(Path.Combine(webRoot, "index.html"))
    ? File.GetLastWriteTimeUtc(Path.Combine(webRoot, "index.html")).ToString("yyyy-MM-dd")
    : DateTime.UtcNow.ToString("yyyy-MM-dd");

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/api"))
    {
        await next();
        return;
    }

    var target = new Uri(context.Request.Path + context.Request.QueryString, UriKind.Relative);
    using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), target);
    if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey(HeaderNames.TransferEncoding))
        request.Content = new StreamContent(context.Request.Body);
    foreach (var header in context.Request.Headers)
    {
        if (header.Key.Equals(HeaderNames.Host, StringComparison.OrdinalIgnoreCase)) continue;
        if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
    }
    request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", context.Request.Scheme);
    request.Headers.TryAddWithoutValidation("X-Forwarded-For", context.Connection.RemoteIpAddress?.ToString());

    using var response = await context.RequestServices.GetRequiredService<IHttpClientFactory>()
        .CreateClient("ai")
        .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
    context.Response.StatusCode = (int)response.StatusCode;
    foreach (var header in response.Headers)
        context.Response.Headers[header.Key] = header.Value.ToArray();
    foreach (var header in response.Content.Headers)
        context.Response.Headers[header.Key] = header.Value.ToArray();
    context.Response.Headers.Remove(HeaderNames.TransferEncoding);
    await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRoot),
    RequestPath = "/ai-workbench"
});
app.MapGet("/", () => Results.Redirect("/ai-workbench/"));
app.MapGet("/robots.txt", (HttpRequest request) => Results.Text(
    $"User-agent: *\nAllow: /\nSitemap: {GetPublicOrigin(request)}/sitemap.xml\n",
    "text/plain; charset=utf-8"));
app.MapGet("/sitemap.xml", (HttpRequest request) =>
{
    var origin = WebUtility.HtmlEncode(GetPublicOrigin(request));
    var xml = $$"""
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
            <loc>{{origin}}/ai-workbench/</loc>
            <lastmod>{{siteLastModified}}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>1.0</priority>
          </url>
          <url>
            <loc>{{origin}}/ai-workbench/about.html</loc>
            <lastmod>{{siteLastModified}}</lastmod>
            <changefreq>monthly</changefreq>
            <priority>0.8</priority>
          </url>
        </urlset>
        """;
    return Results.Text(xml, "application/xml; charset=utf-8");
});
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapFallback(async context =>
{
    if (!context.Request.Path.StartsWithSegments("/ai-workbench"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(Path.Combine(webRoot, "index.html"), context.RequestAborted);
});
app.Run();

static string GetPublicOrigin(HttpRequest request)
{
    var forwardedScheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
    var scheme = forwardedScheme is "http" or "https" ? forwardedScheme : request.Scheme;
    return $"{scheme}://{request.Host}";
}
