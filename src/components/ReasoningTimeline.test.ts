import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ReasoningTimeline from './ReasoningTimeline.vue'

const state = vi.hoisted(() => ({
  streaming: true,
  traces: [{ StepId: 'search', Status: 'completed', Title: '已取得资料', Detail: '' }],
}))
vi.mock('@/stores/chat', () => ({ useChatStore: () => state }))

const render = () => renderToString(createSSRApp({ render: () => h(ReasoningTimeline) }))

describe('执行摘要的持续 Loading', () => {
  it('工具步骤全部完成但正文仍生成时继续显示动画指示', async () => {
    state.streaming = true
    state.traces[0]!.Status = 'completed'
    const html = await render()
    expect(html).toContain('reasoning-active-spinner')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('执行中')
  })

  it.each(['completed', 'failed', 'cancelled'])('请求结束后停止动画：%s', async (status) => {
    state.streaming = false
    state.traces[0]!.Status = status
    const html = await render()
    expect(html).not.toContain('reasoning-active-spinner')
    expect(html).toContain('aria-busy="false"')
    expect(html).toContain('执行记录 · 1 个步骤')
  })
})
