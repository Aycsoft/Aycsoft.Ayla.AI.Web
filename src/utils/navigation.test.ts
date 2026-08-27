import { describe, expect, it } from 'vitest'
import { buildErpAuthorizeUrl, buildWorkspaceRouteUrl, routeAfterSessionProbeFailure } from './navigation'

describe('workspace navigation', () => {
  it('builds the deployed hash callback below /ai-workbench/', () => {
    expect(buildWorkspaceRouteUrl('/auth/sso/callback', { conversationId: 'c-1' }, 'https://erp.example.com', '/ai-workbench/').toString())
      .toBe('https://erp.example.com/ai-workbench/#/auth/sso/callback?conversationId=c-1')
  })

  it('puts the return URL inside the ERP hash-route query', () => {
    const callback = 'https://erp.example.com/ai-workbench/#/auth/sso/callback'
    expect(buildErpAuthorizeUrl('/#/ai/sso/authorize', callback, 'https://erp.example.com').toString())
      .toBe('https://erp.example.com/#/ai/sso/authorize?returnUrl=https%3A%2F%2Ferp.example.com%2Fai-workbench%2F%23%2Fauth%2Fsso%2Fcallback')
  })

  it('keeps the chat workspace mounted when the session service is unavailable', () => {
    expect(routeAfterSessionProbeFailure('chat')).toBe(true)
    expect(routeAfterSessionProbeFailure('knowledge')).toEqual({ name: 'chat' })
  })
})
