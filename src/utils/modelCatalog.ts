import type { WorkspaceModel } from '@/types/ai'

export const matchesModelSearch = (model: WorkspaceModel, keyword: string) => {
  const query = keyword.trim().toLocaleLowerCase()
  if (!query) return true
  return [model.SelectionAlias, model.DisplayName, model.BestFor]
    .filter(Boolean)
    .some(value => value!.toLocaleLowerCase().includes(query))
}

export const preferredModelForCapability = (
  models: WorkspaceModel[],
  capability: 'chat' | 'image' | 'video'
) => {
  const compatible = models.filter(model => model.IsFree && model.Available && model.SelectionAlias && (
    capability === 'image' ? model.SupportsImageGeneration
      : capability === 'video' ? model.SupportsVideoGeneration
        : model.SupportsStreaming
  ))
  // Chat intentionally has no "first available" fallback: an absent server-declared default
  // must remain absent so the backend can fail closed instead of silently selecting Ollama.
  return capability === 'chat' ? compatible.find(model => model.IsDefault) : compatible[0]
}
