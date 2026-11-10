import { expect, test } from 'vitest'
import { selectionOperationNotice } from './selectionOperation'
test('终态恢复显示核验失败原因，不冒充新结果或暴露异常正文', () => {
  expect(selectionOperationNotice('failed', 'analysis_validation_failed')).toContain('内容或引用未通过核验')
  expect(selectionOperationNotice('failed', 'private stack trace')).not.toContain('private stack trace')
  expect(selectionOperationNotice('superseded')).toContain('未覆盖新版本')
  expect(selectionOperationNotice('cancelled')).toContain('已取消')
  expect(selectionOperationNotice('running')).toBe('')
})