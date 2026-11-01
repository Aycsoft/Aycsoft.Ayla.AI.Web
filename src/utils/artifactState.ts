/** 产物状态仅依据服务端结果；过期、失败与权限拒绝不能显示为仍在生成。 */
export const artifactState = (status = '') => {
  const key = status.toLowerCase()
  const errors: Record<string, string> = {
    failed: '生成失败',
    error: '生成失败',
    cancelled: '已取消',
    canceled: '已取消',
    expired: '访问地址已过期',
    missing: '文件已丢失',
    permission_denied: '无权访问',
  }
  if (errors[key]) return { pending: false, unavailable: true, label: errors[key] }
  if (['pending', 'queued', 'running', 'processing', 'generating'].includes(key))
    return { pending: true, unavailable: false, label: '正在生成' }
  return { pending: false, unavailable: false, label: '产物状态待确认' }
}

/** 未返回进度时保持未知，不补造百分比或估时；真实数值只限制到显示区间。 */
export const artifactProgress = (progress?: number) =>
  typeof progress === 'number' && Number.isFinite(progress)
    ? Math.max(0, Math.min(100, progress))
    : undefined
