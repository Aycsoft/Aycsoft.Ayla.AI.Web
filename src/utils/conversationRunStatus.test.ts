import { describe, expect, it } from 'vitest'
import { conversationRunStatus, normalizeConversationRunStatus } from './conversationRunStatus'

describe('conversation run status', () => {
  it('normalizes backend statuses', () => {
    expect(normalizeConversationRunStatus('streaming')).toBe('running')
    expect(normalizeConversationRunStatus('completed')).toBe('succeeded')
    expect(normalizeConversationRunStatus('error')).toBe('failed')
    expect(normalizeConversationRunStatus('cancelled')).toBe('stopped')
  })
  it('prefers current GenerationStatus', () => expect(conversationRunStatus({ Id: '1', AssistantId: 'a', Title: '', LastRunStatus: 'failed', GenerationStatus: 'running' })).toBe('running'))
})
