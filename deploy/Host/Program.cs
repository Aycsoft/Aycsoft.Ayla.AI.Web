// 宿主入口：注册流式上游客户端，再依次处理 API、静态文件和站点路由。
using CrossCart.AI.Web.Host;
using Microsoft.Extensions.FileProviders;
using System.Net;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://+:8080");
builder.Services.AddHttpClient("ai", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["AiApiBaseUrl"] ?? "http://crosscart-ai:8080");
    // SSE 由客户端断开信号取消，不能套用 HttpClient 默认的短请求超时。
    client.Timeout = Timeout.InfiniteTimeSpan;
});
var app = builder.Build();
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var siteLastModified = File.Exists(Path.Combine(webRoot, "index.html"))
    ? File.GetLastWriteTimeUtc(Path.Combine(webRoot, "index.html")).ToString("yyyy-MM-dd")
    : DateTime.UtcNow.ToString("yyyy-MM-dd");

// 必须先转发 /api，防止接口请求落入 SPA 回退并返回 HTML。
app.UseAiApiProxy();

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
    // 只有工作台子路径使用 SPA 回退，其他未知路径保留真正的 404。
    if (!context.Request.Path.StartsWithSegments("/ai-workbench"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(Path.Combine(webRoot, "index.html"), context.RequestAborted);
});
app.Run();

// 保留既有公开站点 URL 生成约定；生产入口必须覆盖不可信的转发头和 Host。
static string GetPublicOrigin(HttpRequest request)
{
    var forwardedScheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
    var scheme = forwardedScheme is "http" or "https" ? forwardedScheme : request.Scheme;
    return $"{scheme}://{request.Host}";
}
