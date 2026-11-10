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

/** 终态优先于最后执行阶段，不能把失败任务仍展示为正在分析。 */
export function selectionOperationTitle(operation?: { status: string; stage: string; cancelRequested: boolean }) {
  if (!operation) return ''
  const terminal: Record<string, string> = {
    succeeded: '分析结果已保存', failed: '本次分析暂未完成', cancelled: '分析已取消', superseded: '方案已有更新',
  }
  if (terminal[operation.status]) return terminal[operation.status]!
  if (operation.cancelRequested) return '正在取消分析，已保存方案会保留'
  const stages: Record<string, string> = {
    queued: '分析任务已排队', collecting_evidence: '正在收集市场与内部资料', analyzing: '正在分析候选并核对依据', saving: '正在保存分析结果',
  }
  return stages[operation.stage] || '正在处理选品方案'
}