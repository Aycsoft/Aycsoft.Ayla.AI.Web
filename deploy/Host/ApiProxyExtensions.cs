using Microsoft.Net.Http.Headers;

namespace CrossCart.AI.Web.Host;

/// <summary>
/// 工作台同源 API 转发。只负责传输，不承担用户认证、业务授权或持久化。
/// </summary>
internal static class ApiProxyExtensions
{
    /// <summary>
    /// 保留完整路径、查询与请求体；流式响应不提前缓冲，浏览器断开时终止上游读取。
    /// 此中间件必须位于静态文件和 SPA 回退之前。
    /// </summary>
    public static IApplicationBuilder UseAiApiProxy(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            if (!context.Request.Path.StartsWithSegments("/api"))
            {
                await next();
                return;
            }

            var target = new Uri(context.Request.Path + context.Request.QueryString, UriKind.Relative);
            using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), target);
            if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey(HeaderNames.TransferEncoding))
            {
                request.Content = new StreamContent(context.Request.Body);
            }

            // 内容头与普通请求头分开处理；Host 使用命名客户端的上游地址。
            foreach (var header in context.Request.Headers)
            {
                if (header.Key.Equals(HeaderNames.Host, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                {
                    request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                }
            }

            request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", context.Request.Scheme);
            request.Headers.TryAddWithoutValidation("X-Forwarded-For", context.Connection.RemoteIpAddress?.ToString());

            using var response = await context.RequestServices.GetRequiredService<IHttpClientFactory>()
                .CreateClient("ai")
                .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
            context.Response.StatusCode = (int)response.StatusCode;
            foreach (var header in response.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            foreach (var header in response.Content.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            // 分块编码属于当前连接，由 Kestrel 重新生成，不能照抄上游的编码头。
            context.Response.Headers.Remove(HeaderNames.TransferEncoding);
            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
        });
    }
}
