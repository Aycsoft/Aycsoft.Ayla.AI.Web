/** 部署导航回归：固定 origin/base 测试 hash 查询、ERP 回调编码和探测失败回退。 */
import { describe, expect, it } from 'vitest'
import {
  buildErpAuthorizeUrl,
  buildWorkspaceRouteUrl,
  routeAfterSessionProbeFailure,
} from './navigation'

describe('workspace navigation', () => {
  it('builds the deployed hash callback below /ai-workbench/', () => {
    expect(
      buildWorkspaceRouteUrl(
        '/auth/sso/callback',
        { conversationId: 'c-1' },
        'https://erp.example.com',
        '/ai-workbench/',
      ).toString(),
    ).toBe('https://erp.example.com/ai-workbench/#/auth/sso/callback?conversationId=c-1')
  })

  it('puts the return URL inside the ERP hash-route query', () => {
    const callback = 'https://erp.example.com/ai-workbench/#/auth/sso/callback'
    expect(
      buildErpAuthorizeUrl('/#/ai/sso/authorize', callback, 'https://erp.example.com').toString(),
    ).toBe(
      'https://erp.example.com/#/ai/sso/authorize?returnUrl=https%3A%2F%2Ferp.example.com%2Fai-workbench%2F%23%2Fauth%2Fsso%2Fcallback',
    )
  })

  it('keeps the chat workspace mounted when the session service is unavailable', () => {
    expect(routeAfterSessionProbeFailure('chat')).toBe(true)
    expect(routeAfterSessionProbeFailure('knowledge')).toEqual({ name: 'chat' })
  })

  it('uses the canonical workspace domain and keeps the ERP authorize hash route', () => {
    const callback = buildWorkspaceRouteUrl(
      '/auth/sso/callback',
      { conversationId: 'c-1' },
      'https://aichat.yueyaoinfo.com',
      '/ai-workbench/',
    ).toString()
    const target = buildErpAuthorizeUrl(
      'https://www.yueyaoinfo.com/#/ai/sso/authorize',
      callback,
      'http://localhost:5176',
    )
    expect(target.origin).toBe('https://www.yueyaoinfo.com')
    expect(target.hash.split('?')[0]).toBe('#/ai/sso/authorize')
    expect(new URLSearchParams(target.hash.split('?')[1]).get('returnUrl')).toBe(
      'https://aichat.yueyaoinfo.com/ai-workbench/#/auth/sso/callback?conversationId=c-1',
    )
  })
})
