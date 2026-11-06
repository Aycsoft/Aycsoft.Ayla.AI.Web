export interface MediaJob {
  JobId: string
  Title: string
  Status: string
  Progress: number | null
  CanResume: boolean
  LocalStopRequested: boolean
  LocalStopNotice: string
  UpdatedAt: string
  FileName?: string
}

export const mediaJobId = (value: unknown): string =>
  typeof value === 'string' && /^[a-fA-F0-9]{32}$/.test(value) ? value : ''

// 服务端快照决定可恢复性；不按标题、百分比或前端时间推测供应商终态。
export const normalizeMediaJob = (value: unknown): MediaJob | null => {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const get = (name: string) => row[name] ?? row[name[0].toLowerCase() + name.slice(1)]
  const JobId = mediaJobId(get('JobId'))
  if (!JobId) return null
  const progress = get('Progress')
  return {
    JobId,
    Title: String(get('Title') || '视频任务'),
    Status: String(get('Status') || 'unknown'),
    Progress:
      typeof progress === 'number' && Number.isFinite(progress)
        ? Math.max(0, Math.min(100, progress))
        : null,
    CanResume: get('CanResume') === true,
    LocalStopRequested: get('LocalStopRequested') === true,
    LocalStopNotice: String(
      get('LocalStopNotice') || '仅停止本地等待，不代表供应商取消或停止计费。',
    ),
    UpdatedAt: String(get('UpdatedAt') || ''),
    FileName: typeof get('FileName') === 'string' ? String(get('FileName')) : undefined,
  }
}

export const mediaJobStatus = (status: string): string =>
  ({
    submitting: '正在提交',
    accepted: '供应商已受理',
    polling: '正在查询',
    paused: '本地等待已停止',
    provider_completed: '生成完成，文件待保存',
    persisting: '正在保存文件',
    succeeded: '文件已就绪',
    preparation_failed: '准备未完成，未提交供应商',
    submission_rejected: '供应商未受理，本轮已停止',
    provider_failed: '供应商生成失败',
    submission_unknown: '受理状态待核对',
    needs_reconciliation: '文件保存结果待核对',
    expired: '查询期限已过',
  })[status] || '状态待确认'

export const mediaJobCanStop = (job: MediaJob) =>
  !job.LocalStopRequested &&
  ['submitting', 'accepted', 'polling', 'provider_completed', 'persisting'].includes(job.Status)

export const mediaJobNeedsRefresh = (job: MediaJob) =>
  ['submitting', 'accepted', 'polling', 'provider_completed', 'persisting'].includes(job.Status)
