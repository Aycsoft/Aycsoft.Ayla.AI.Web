import { describe, expect, it } from 'vitest'
import { buildFeedbackPayload } from './feedbackContract'

describe('structured feedback contract', () => {
  it('keeps association fields separate instead of packing them into Comment', () => {
    const payload = buildFeedbackPayload({ Rating: -1, Type: ' incorrect ', Description: ' wrong ', ConversationId: 'c1', ModelAlias: 'aycsoft-pro-2.1', ScreenshotFileId: 'f1', Contact: 'mail@example.com' })
    expect(payload).toEqual({ Rating: -1, Type: 'incorrect', Description: 'wrong', ConversationId: 'c1', ModelAlias: 'aycsoft-pro-2.1', ScreenshotFileId: 'f1', Contact: 'mail@example.com' })
    expect(payload).not.toHaveProperty('Comment')
  })
})
