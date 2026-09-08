/** 历史消息与来源展示适配，不修改原始消息内容或引用记录。 */
import type { Citation } from '@/types/ai'
import { isSafeMarkdownLink } from './safeMarkdown'

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
