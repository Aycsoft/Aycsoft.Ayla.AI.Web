/** 服务端模型目录的搜索与默认选择，不推测未声明的模型能力或可用性。 */
import type { WorkspaceModel } from '@/types/ai'

/** 只搜索公开选择别名、显示名称和用途描述；空关键词匹配所有模型。 */
export const matchesModelSearch = (model: WorkspaceModel, keyword: string) => {
  const query = keyword.trim().toLocaleLowerCase()
  if (!query) return true
  return [model.SelectionAlias, model.DisplayName, model.BestFor]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase().includes(query))
}

/** 从免费、可用且有选择别名的兼容模型中选默认项，聊天必须由服务端明确指定。 */
export const preferredModelForCapability = (
  models: WorkspaceModel[],
  capability: 'chat' | 'image' | 'video',
) => {
  const compatible = models.filter(
    (model) =>
      model.IsFree &&
      model.Available &&
      model.SelectionAlias &&
      (capability === 'image'
        ? model.SupportsImageGeneration
        : capability === 'video'
          ? model.SupportsVideoGeneration
          : model.SupportsStreaming),
  )
  // 聊天不回退到第一个可用模型；服务端未声明默认值时保持缺失，避免静默切换模型。
  return capability === 'chat' ? compatible.find((model) => model.IsDefault) : compatible[0]
}
