/** 统一工作区与 ERP 的 hash 路由地址，兼容子目录部署。 */
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

/** 会话探测暂时失败时保留聊天入口，不因服务不可用反复跳转登录。 */
export const routeAfterSessionProbeFailure = (routeName: unknown) =>
  routeName === 'chat' ? true : { name: 'chat' as const }

/** 查询参数放在 hash 路由内，部署 basePath 与页面 route 分开拼装。 */
export function buildWorkspaceRouteUrl(
  route: string,
  query: Record<string, string | undefined> = {},
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL,
) {
  const normalizedBase = `/${trimSlashes(basePath || '/')}${trimSlashes(basePath || '/') ? '/' : ''}`
  const target = new URL(normalizedBase, origin)
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const normalizedRoute = `/${trimSlashes(route)}`
  target.hash = `${normalizedRoute}${search.size ? `?${search}` : ''}`
  return target
}

/** 将完整回调 URL 编码到 ERP 授权 hash 的 returnUrl 参数，保留其他参数。 */
export function buildErpAuthorizeUrl(
  configuredUrl: string,
  returnUrl: string,
  origin = window.location.origin,
) {
  const target = new URL(configuredUrl, origin)
  const rawHash = target.hash.replace(/^#/, '') || '/ai/sso/authorize'
  const [hashPath, hashQuery = ''] = rawHash.split('?', 2)
  const query = new URLSearchParams(hashQuery)
  query.set('returnUrl', returnUrl)
  target.hash = `${hashPath.startsWith('/') ? hashPath : `/${hashPath}`}?${query}`
  return target
}
