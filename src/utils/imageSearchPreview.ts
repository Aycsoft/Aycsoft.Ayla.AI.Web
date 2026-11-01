/** 图库预览只接受后端命中的精确作用域与不透明文件ID，旧URL不具备授权语义。 */
export const isImageSearchScope = (scope: unknown): scope is 'file-library' | 'developer-gallery' =>
  scope === 'file-library' || scope === 'developer-gallery'

export const imageSearchPreviewUrl = (result: {
  Scope?: unknown
  FileId?: unknown
  PreviewAvailable?: unknown
}): string => {
  if (
    result.PreviewAvailable === false ||
    !isImageSearchScope(result.Scope) ||
    typeof result.FileId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(result.FileId)
  )
    return ''
  return `/api/sso/visual-search-files/${result.Scope}/${encodeURIComponent(result.FileId)}`
}
