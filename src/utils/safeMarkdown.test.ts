/** Markdown 安全回归：核对 GFM 输出、链接属性及 HTML/主动协议拦截。 */
import { describe, expect, it } from 'vitest'
import { isSafeMarkdownImage, isSafeMarkdownLink, renderMarkdownSafe } from './safeMarkdown'

describe('safe GFM message rendering', () => {
  it('renders the screenshot heading, emphasis and list sample', () => {
    const html = renderMarkdownSafe(
      '### Ayla 标题\n\n**重点**、*说明* 和 ~~废弃~~\n\n- 第一项\n- 第二项',
    )
    expect(html).toContain('<h3>Ayla 标题</h3>')
    expect(html).toContain('<strong>重点</strong>')
    expect(html).toContain('<em>说明</em>')
    expect(html).toContain('<s>废弃</s>')
    expect(html).toContain('<ul>')
  })

  it('renders GFM structures, task lists, tables, footnotes and inline code', () => {
    const html = renderMarkdownSafe(
      `# H1\n###### H6\n> 引用\n\n---\n\n1. 有序\n2. 列表\n\n- [x] 完成\n- [ ] 待办\n\n| 模型 | 状态 |\n| --- | --- |\n| Ayla | 可用 |\n\n行内 \`const ok = true\`，脚注[^1]。\n\n[^1]: 仅展示安全内容。`,
    )
    expect(html).toContain('<h1>H1</h1>')
    expect(html).toContain('<h6>H6</h6>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<hr>')
    expect(html).toContain('<ol>')
    expect(html).toContain('task-list-item')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('gfm-table-scroll')
    expect(html).toContain('<code>const ok = true</code>')
    expect(html).toContain('footnote-ref')
    expect(html).toContain('footnotes')
  })

  it('allows safe links and raster images with hardened attributes', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    const html = renderMarkdownSafe(
      `[官网](https://example.com/path)\n\n![远程图](https://example.com/a.png)\n\n![内嵌图](${png})`,
    )
    expect(html).toContain('href="https://example.com/path"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
    expect(html.match(/<img /g)).toHaveLength(2)
    expect(html).toContain('loading="lazy"')
    expect(isSafeMarkdownLink('/relative')).toBe(true)
    expect(isSafeMarkdownImage(png)).toBe(true)
  })

  it('never turns raw HTML or active protocols into executable DOM', () => {
    const html = renderMarkdownSafe(
      `<script>alert(1)</script>\n<style>body{display:none}</style>\n<iframe src="https://evil.test"></iframe>\n<img src=x onerror="alert(1)">\n[x](javascript:alert(1))\n![x](data:image/svg+xml;base64,PHN2Zz4=)`,
    )
    expect(html).not.toMatch(/<(?:script|style|iframe)(?:\s|>)/i)
    expect(html).not.toMatch(/<img[^>]+onerror/i)
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('src="data:image/svg+xml')
    expect(html).toContain('&lt;script&gt;')
    expect(isSafeMarkdownLink('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(isSafeMarkdownImage('javascript:alert(1)')).toBe(false)
  })
})
