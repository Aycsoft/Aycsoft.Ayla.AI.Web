/** Markdown 展示安全边界：关闭原始 HTML，对链接和图片使用独立白名单。 */
import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'

const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i
const MAX_DATA_IMAGE_LENGTH = 2_800_000

function currentOrigin(): string {
  return typeof window === 'undefined' ? 'https://ayla.invalid' : window.location.origin
}

/** 允许站内锚点、HTTP(S) 与邮件链接，阻止 javascript/data 等主动协议。 */
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

/** 允许限长栅格 data 图、同源 HTTP(S) 及远程 HTTPS；不允许 data SVG。 */
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

// 在 token 变为 DOM 前拦截主动协议；渲染器仍分别检查链接和图片，防止白名单混用。
markdown.validateLink = (url) => isSafeMarkdownLink(url) || isSafeMarkdownImage(url)

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const hrefIndex = token.attrIndex('href')
  const href = String(hrefIndex >= 0 ? (token.attrs?.[hrefIndex]?.[1] ?? '') : '')
  if (!isSafeMarkdownLink(href)) token.attrSet('href', '#unsafe-link')
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer nofollow')
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}

markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index]
  const src = String(token.attrGet('src') ?? '')
  const alt = String(token.content || token.attrGet('alt') || '图片')
  if (!isSafeMarkdownImage(src))
    return `<span class="gfm-image-blocked">[已拦截不安全图片：${markdown.utils.escapeHtml(alt)}]</span>`
  const title = token.attrGet('title')
  return `<img src="${markdown.utils.escapeHtml(src)}" alt="${markdown.utils.escapeHtml(alt)}"${title ? ` title="${markdown.utils.escapeHtml(String(title))}"` : ''} loading="lazy" decoding="async" referrerpolicy="no-referrer">`
}

markdown.renderer.rules.table_open = () => '<div class="gfm-table-scroll" tabindex="0"><table>\n'
markdown.renderer.rules.table_close = () => '</table></div>\n'

/** 禁止原始 HTML，仅将 MarkdownIt 生成并经过上述规则处理的标记交给 v-html。 */
export function renderMarkdownSafe(value: string): string {
  return markdown.render(value ?? '')
}
