/** 结构化反馈协议；会话、模型与截图分别关联，不混入描述文本。 */
export interface FeedbackPayload {
  Rating: 1 | -1
  Type: string
  Description?: string
  ConversationId?: string
  ModelAlias?: string
  ScreenshotFileId?: string
  Contact?: string
}

/** 清理表单空白；可选空字段省略，未指定分类回退 general。 */
export function buildFeedbackPayload(value: FeedbackPayload): FeedbackPayload {
  return {
    Rating: value.Rating,
    Type: value.Type.trim() || 'general',
    Description: value.Description?.trim() || undefined,
    ConversationId: value.ConversationId?.trim() || undefined,
    ModelAlias: value.ModelAlias?.trim() || undefined,
    ScreenshotFileId: value.ScreenshotFileId?.trim() || undefined,
    Contact: value.Contact?.trim() || undefined,
  }
}
