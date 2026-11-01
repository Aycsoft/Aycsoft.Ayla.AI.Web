/** 历史消息与来源展示适配，不修改原始消息内容或引用记录。 */
import type { Citation, Message } from '@/types/ai'
import { isSafeMarkdownLink } from './safeMarkdown'
import { parseApiTime } from './apiTime'

const LEGACY_FOOTERS = [
  /(?:\r?\n){0,2}---(?:\r?\n)+内容由 AI 生成，重要信息请务必核查。作者备案：杨鹏 \/ Peng Yang \(Perry Yang\)\s*$/u,
  /(?:\r?\n){0,2}内容由 AI 生成，重要信息请务必核查(?:。|\.)?(?:\s*[·｜|]\s*)?作者备案：杨鹏 \/ Peng Yang \(Perry Yang\)\s*$/u,
]

/** 清除已废弃的固定页脚，并将旧生成文件链接转到鉴权代理。 */
export function stripLegacyAiFooter(value: string): string {
  const normalizedLinks = (value || '').replace(
    /\/api\/AI\/GeneratedFiles\/([A-Za-z0-9_-]+)(?:\/Preview)?(?:\?[^\s)\]]*)?/giu,
    '/api/workspace/artifacts/$1?download=1',
  )
  return LEGACY_FOOTERS.reduce(
    (content, pattern) => content.replace(pattern, ''),
    normalizedLinks,
  ).trimEnd()
}

/** 从兼容字段选择来源地址，只返回通过链接协议白名单的值。 */
export function citationUrl(source: Citation): string {
  const record = source as Citation & Record<string, unknown>
  const value = String(
    source.Url ||
      source.ContentUrl ||
      record.URL ||
      record.SourceUrl ||
      record.SourceURL ||
      record.Uri ||
      record.uri ||
      '',
  ).trim()
  return value && isSafeMarkdownLink(value) ? value : ''
}

/** 优先文档名和标题，历史来源名称字段作为回退。 */
export function citationTitle(source: Citation): string {
  const record = source as Citation & Record<string, unknown>
  return String(
    source.DocumentName || source.Title || record.Name || record.SourceName || '参考来源',
  )
}

/** 提取来源主机用于展示；非法地址不显示主机。 */
export function citationHost(source: Citation): string {
  const value = citationUrl(source)
  if (!value) return ''
  try {
    return new URL(value, window.location.origin).hostname
  } catch {
    return ''
  }
}

/** 使用 HTTP(S) 来源站点的 favicon，不将邮件或其他协议作为图片请求。 */
export function citationIconUrl(value: string): string {
  try {
    const target = new URL(value, window.location.origin)
    return target.protocol === 'http:' || target.protocol === 'https:'
      ? `${target.origin}/favicon.ico`
      : ''
  } catch {
    return ''
  }
}

/** 发布日期与本次检索日期各自展示，不能拿抓取时间冒充来源发布时间。 */
export function citationDateLabel(source: Citation): string {
  if (!/^https?:\/\//i.test(citationUrl(source))) return ''
  const record = source as Citation & Record<string, unknown>
  const format = (value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) return ''
    const date = parseApiTime(value)
    return Number.isFinite(date.getTime())
      ? date.toLocaleDateString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : ''
  }
  const published = format(source.PublishedAt)
  const retrieved = format(record.RetrievedAt)
  return `${published ? `发布 ${published}` : '发布日期未知'}${retrieved ? ` · 检索 ${retrieved}（北京时间）` : ''}`
}

/** 正文和终态独立展示；优先服务端终态，不能把部分内容或已生成文件当作整轮完成。 */
export function messageResponseNotice(message: Message) {
  if (message.Role !== 'assistant' || message.Status === 'stopped') return null
  const status = (
    message.Status === 'error' ? 'error' : message.GenerationStatus || message.Status || ''
  ).toLowerCase()
  const incomplete = ['partial', 'incomplete'].includes(status)
  const failed = ['error', 'failed', 'tool_failed', 'document_evidence_unavailable'].includes(
    status,
  )
  if (!incomplete && !failed) return null
  const existingJob =
    message.ErrorCode === 'MEDIA_SUBMISSION_UNKNOWN' ||
    message.ToolSteps?.some((step) => step.JobId)
  const detail = message.ErrorMessage?.trim()
  return {
    title: existingJob ? '视频任务状态待核对' : incomplete ? '回答尚未完成' : '本次请求未完成',
    detail: existingJob
      ? [detail, '请打开“视频任务”核对原任务，勿重复提交；停止本地等待不代表停止计费。']
          .filter(Boolean)
          .join(' ')
      : detail || '已保留收到的内容和产物，请查看原回复中的限制。',
  }
}
