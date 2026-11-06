import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  mediaJobId,
  normalizeMediaJob,
  mediaJobCanStop,
  mediaJobNeedsRefresh,
  mediaJobStatus,
} from './mediaJobs'
const id = 'a'.repeat(32)
test('任务ID不能接受供应商URL、路径或身份参数', () => {
  for (const value of ['../x', 'https://example.test/a', '', 'a'.repeat(31), undefined, 1])
    assert.equal(mediaJobId(value), '')
  assert.equal(mediaJobId(id), id)
})
test('服务端真实零进度保留，未知进度不伪造', () => {
  assert.equal(normalizeMediaJob({ JobId: id, Progress: 0 })?.Progress, 0)
  assert.equal(normalizeMediaJob({ jobId: id, progress: null })?.Progress, null)
  assert.equal(normalizeMediaJob({ JobId: id, Progress: '50' })?.Progress, null)
})
test('可恢复仅接受服务端布尔，不推测已完成或可重投', () => {
  assert.equal(
    normalizeMediaJob({ JobId: id, Status: 'paused', CanResume: 'true' })?.CanResume,
    false,
  )
  assert.equal(normalizeMediaJob({ JobId: id, CanResume: true })?.CanResume, true)
  assert.equal(normalizeMediaJob({ JobId: '../other' }), null)
})
test('等待状态可停止但未就绪不能下载；已停止不重复发stop', () => {
  const job = normalizeMediaJob({ JobId: id, Status: 'polling' })!
  assert.equal(mediaJobCanStop(job), true)
  assert.equal(mediaJobNeedsRefresh(job), true)
  assert.equal(mediaJobCanStop({ ...job, LocalStopRequested: true }), false)
  assert.equal(mediaJobNeedsRefresh({ ...job, Status: 'needs_reconciliation' }), false)
  assert.equal(mediaJobStatus('submission_unknown'), '受理状态待核对')
})
test('准备失败明确未提交且不继续轮询或停止供应商任务', () => {
  const job = normalizeMediaJob({ JobId: id, Status: 'preparation_failed', CanResume: false })!
  assert.equal(mediaJobStatus(job.Status), '准备未完成，未提交供应商')
  assert.equal(job.CanResume, false)
  assert.equal(mediaJobCanStop(job), false)
  assert.equal(mediaJobNeedsRefresh(job), false)
})

test('受理及生成完成过渡状态持续刷新，暂停未知与终态不自动查询', () => {
  const job = normalizeMediaJob({ JobId: id, Status: 'accepted' })!
  for (const Status of ['submitting', 'accepted', 'polling', 'provider_completed', 'persisting'])
    assert.equal(mediaJobNeedsRefresh({ ...job, Status }), true)
  for (const Status of [
    'paused',
    'submission_unknown',
    'needs_reconciliation',
    'succeeded',
    'provider_failed',
    'submission_rejected',
    'expired',
    'unknown',
  ])
    assert.equal(mediaJobNeedsRefresh({ ...job, Status }), false)
})
