export interface FeedbackPayload {
  Rating: 1 | -1
  Type: string
  Description?: string
  ConversationId?: string
  ModelAlias?: string
  ScreenshotFileId?: string
  Contact?: string
}

export function buildFeedbackPayload(value: FeedbackPayload): FeedbackPayload {
  return {
    Rating: value.Rating,
    Type: value.Type.trim() || 'general',
    Description: value.Description?.trim() || undefined,
    ConversationId: value.ConversationId?.trim() || undefined,
    ModelAlias: value.ModelAlias?.trim() || undefined,
    ScreenshotFileId: value.ScreenshotFileId?.trim() || undefined,
    Contact: value.Contact?.trim() || undefined
  }
}
