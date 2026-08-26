import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'

const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i
const MAX_DATA_IMAGE_LENGTH = 2_800_000

function currentOrigin(): string {
  return typeof window === 'undefined' ? 'https://ayla.invalid' : window.location.origin
}

export function isSafeMarkdownLink(value: string): boolean {
  const href = value.trim()
  if (!href || href.startsWith('#')) return true
  try {
    const url = new URL(href, currentOrigin())
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function isSafeMarkdownImage(value: string): boolean {
  const src = value.trim()
  if (src.length <= MAX_DATA_IMAGE_LENGTH && SAFE_DATA_IMAGE.test(src)) return true
  try {
    const url = new URL(src, currentOrigin())
    if (url.origin === currentOrigin() && ['http:', 'https:'].includes(url.protocol)) return true
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: false,
})
  .use(footnote)
  .use(taskLists, { enabled: false, label: true, labelAfter: true })

// Parsing must reject active protocols before a token can become an element.
markdown.validateLink = (url) => isSafeMarkdownLink(url) || isSafeMarkdownImage(url)

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const hrefIndex = token.attrIndex('href')
  const href = String(hrefIndex >= 0 ? token.attrs?.[hrefIndex]?.[1] ?? '' : '')
  if (!isSafeMarkdownLink(href)) token.attrSet('href', '#unsafe-link')
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer nofollow')
  return defaultLinkOpen ? defaultLinkOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options)
}

markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index]
  const src = String(token.attrGet('src') ?? '')
  const alt = String(token.content || token.attrGet('alt') || '图片')
  if (!isSafeMarkdownImage(src)) return `<span class="gfm-image-blocked">[已拦截不安全图片：${markdown.utils.escapeHtml(alt)}]</span>`
  const title = token.attrGet('title')
  return `<img src="${markdown.utils.escapeHtml(src)}" alt="${markdown.utils.escapeHtml(alt)}"${title ? ` title="${markdown.utils.escapeHtml(String(title))}"` : ''} loading="lazy" decoding="async" referrerpolicy="no-referrer">`
}

markdown.renderer.rules.table_open = () => '<div class="gfm-table-scroll" tabindex="0"><table>\n'
markdown.renderer.rules.table_close = () => '</table></div>\n'

/** Raw HTML is deliberately disabled; only MarkdownIt-created markup reaches v-html. */
export function renderMarkdownSafe(value: string): string {
  return markdown.render(value ?? '')
}
