import { expect, test } from 'vitest'
import { selectionOperationNotice, selectionOperationTitle } from './selectionOperation'
test('终态恢复显示核验失败原因，不冒充新结果或暴露异常正文', () => {
  expect(selectionOperationNotice('failed', 'analysis_validation_failed')).toContain('内容或引用未通过核验')
  expect(selectionOperationNotice('failed', 'private stack trace')).not.toContain('private stack trace')
  expect(selectionOperationNotice('superseded')).toContain('未覆盖新版本')
  expect(selectionOperationNotice('cancelled')).toContain('已取消')
  expect(selectionOperationNotice('running')).toBe('')
})
test('失败取消成功的终态标题不受旧analyzing阶段影响', () => {
  for (const [status, title] of [['failed', '本次分析暂未完成'], ['cancelled', '分析已取消'], ['succeeded', '分析结果已保存'], ['superseded', '方案已有更新']]) {
    expect(selectionOperationTitle({status: status!, stage: 'analyzing', cancelRequested: true})).toBe(title)
  }
  expect(selectionOperationTitle({status: 'running', stage: 'analyzing', cancelRequested: false})).toContain('正在分析')
  expect(selectionOperationTitle({status: 'running', stage: 'analyzing', cancelRequested: true})).toContain('正在取消')
})