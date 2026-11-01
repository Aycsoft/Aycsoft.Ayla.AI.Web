import { apiUrl, request, ApiError } from './http'
import { mediaJobId, normalizeMediaJob, type MediaJob } from '@/utils/mediaJobs'

const root = '/workspace/media/jobs'
const path = (id: string) => {
  if (!mediaJobId(id)) throw new Error('无效任务编号')
  return `${root}/${id}`
}

// 工作台只使用受保护Cookie会话；调用方不能传入owner/provider任务定位。
export const mediaJobsApi = {
  async list(): Promise<MediaJob[]> {
    const result = await request<unknown>(root)
    return Array.isArray(result)
      ? result.map(normalizeMediaJob).filter((row): row is MediaJob => Boolean(row))
      : []
  },
  async act(id: string, action: 'resume' | 'local-stop') {
    return normalizeMediaJob(
      await request<unknown>(`${path(id)}/${action}`, { method: 'POST', body: '{}' }),
    )
  },
  async file(id: string): Promise<Blob> {
    const response = await fetch(apiUrl(`${path(id)}/file?download=true`), {
      credentials: 'include',
    })
    if (!response.ok) throw new ApiError('视频文件暂不可用', response.status)
    if (response.headers.get('Content-Type')?.split(';')[0] !== 'video/mp4')
      throw new Error('视频文件类型不匹配')
    return response.blob()
  },
}
