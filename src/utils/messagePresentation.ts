import type { Citation } from '@/types/ai'
import { isSafeMarkdownLink } from './safeMarkdown'

const LEGACY_FOOTERS = [
  /(?:\r?\n){0,2}---(?:\r?\n)+内容由 AI 生成，重要信息请务必核查。作者备案：杨鹏 \/ Peng Yang \(Perry Yang\)\s*$/u,
  /(?:\r?\n){0,2}内容由 AI 生成，重要信息请务必核查(?:。|\.)?(?:\s*[·｜|]\s*)?作者备案：杨鹏 \/ Peng Yang \(Perry Yang\)\s*$/u,
]

export function stripLegacyAiFooter(value: string): string {
  const normalizedLinks = (value || '').replace(
    /\/api\/AI\/GeneratedFiles\/([A-Za-z0-9_-]+)(?:\/Preview)?(?:\?[^\s)\]]*)?/giu,
    '/api/workspace/artifacts/$1?download=1',
  )
  return LEGACY_FOOTERS.reduce((content, pattern) => content.replace(pattern, ''), normalizedLinks).trimEnd()
}

export function citationUrl(source: Citation): string {
  const record = source as Citation & Record<string, unknown>
  const value = String(source.Url || source.ContentUrl || record.URL || record.SourceUrl || record.SourceURL || record.Uri || record.uri || '').trim()
  return value && isSafeMarkdownLink(value) ? value : ''
}

export function citationTitle(source: Citation): string {
  const record = source as Citation & Record<string, unknown>
  return String(source.DocumentName || source.Title || record.Name || record.SourceName || '参考来源')
}

export function citationHost(source: Citation): string {
  const value = citationUrl(source)
  if (!value) return ''
  try { return new URL(value, window.location.origin).hostname }
  catch { return '' }
}
