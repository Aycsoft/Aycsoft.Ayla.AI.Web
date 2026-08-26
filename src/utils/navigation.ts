const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

export function buildWorkspaceRouteUrl(
  route: string,
  query: Record<string, string | undefined> = {},
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL
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

export function buildErpAuthorizeUrl(
  configuredUrl: string,
  returnUrl: string,
  origin = window.location.origin
) {
  const target = new URL(configuredUrl, origin)
  const rawHash = target.hash.replace(/^#/, '') || '/ai/sso/authorize'
  const [hashPath, hashQuery = ''] = rawHash.split('?', 2)
  const query = new URLSearchParams(hashQuery)
  query.set('returnUrl', returnUrl)
  target.hash = `${hashPath.startsWith('/') ? hashPath : `/${hashPath}`}?${query}`
  return target
}
