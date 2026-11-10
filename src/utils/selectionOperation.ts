/** 将后台安全错误码转为可恢复提示，不显示模型原文或服务异常正文。 */
export function selectionOperationNotice(status: string, errorCode?: string | null) {
  if (status === 'cancelled') return '分析已取消，已有方案和上次分析保持不变。'
  if (status === 'superseded' || errorCode === 'project_version_changed')
    return '方案已有更新，本次分析未覆盖新版本。请重新读取后再分析。'
  if (status !== 'failed') return ''
  if (errorCode === 'analysis_validation_failed')
    return '这次分析的内容或引用未通过核验，上次结果仍保留。可以重新分析。'
  if (errorCode === 'analysis_not_committed')
    return '这次分析没有保存为新结果，上次结果仍保留。可以重新分析。'
  return '这次分析暂未完成，上次结果仍保留。可以重新分析。'
}
