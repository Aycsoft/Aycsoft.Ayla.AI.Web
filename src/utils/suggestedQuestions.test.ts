import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  applySuggestedQuestions,
  getSuggestedQuestions,
  normalizeSuggestedQuestions,
} from './suggestedQuestions'

test('旧历史不补默认追问，过滤格式并去重至三条', () => {
  assert.deepEqual(getSuggestedQuestions({}), [])
  assert.deepEqual(
    normalizeSuggestedQuestions([
      ' 问题一？ ',
      '问题一?',
      1,
      '',
      '二'.repeat(81),
      '问题二',
      '问题三',
      '问题四',
    ]),
    ['问题一？', '问题二', '问题三'],
  )
})

test('终态字段支持大小写，缺失保留但显式空数组清除', () => {
  const message = { Status: 'completed', SuggestedQuestions: ['旧问题？'] }
  applySuggestedQuestions(message, {})
  assert.deepEqual(message.SuggestedQuestions, ['旧问题？'])
  applySuggestedQuestions(message, { suggestedQuestions: ['新问题？'] })
  assert.deepEqual(message.SuggestedQuestions, ['新问题？'])
  applySuggestedQuestions(message, { SuggestedQuestions: [] })
  assert.deepEqual(message.SuggestedQuestions, [])
})

test('失败、停止与生成中的消息不显示追问，失败终态清空', () => {
  for (const Status of ['streaming', 'error', 'stopped', 'failed', 'cancelled'])
    assert.deepEqual(getSuggestedQuestions({ Status, SuggestedQuestions: ['问题？'] }), [])
  const message = { Status: 'error', SuggestedQuestions: ['旧问题？'] }
  applySuggestedQuestions(message, { SuggestedQuestions: ['新问题？'] })
  assert.deepEqual(message.SuggestedQuestions, [])
})
