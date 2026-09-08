/** 结构化反馈回归：验证关联字段独立传输及空白清理，防止退回拼接 Comment 的旧协议。 */
import { describe, expect, it } from 'vitest'
import { buildFeedbackPayload } from './feedbackContract'

describe('structured feedback contract', () => {
  it('keeps association fields separate instead of packing them into Comment', () => {
    const payload = buildFeedbackPayload({
      Rating: -1,
      Type: ' incorrect ',
      Description: ' wrong ',
      ConversationId: 'c1',
      ModelAlias: 'aycsoft-pro-2.1',
      ScreenshotFileId: 'f1',
      Contact: 'mail@example.com',
    })
    expect(payload).toEqual({
      Rating: -1,
      Type: 'incorrect',
      Description: 'wrong',
      ConversationId: 'c1',
      ModelAlias: 'aycsoft-pro-2.1',
      ScreenshotFileId: 'f1',
      Contact: 'mail@example.com',
    })
    expect(payload).not.toHaveProperty('Comment')
  })
})
