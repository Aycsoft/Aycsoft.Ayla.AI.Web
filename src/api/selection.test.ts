/** 方案返回合同回归：错误负载不得解锁编辑、分析或导出。 */
import { afterEach, expect, test, vi } from 'vitest'
import {
  analyzeSelectionProject,
  getActiveSelectionAnalysis,
  getSelectionAnalysisOperation,
  cancelSelectionAnalysisOperation,
  isSelectionProject,
  saveSelectionProject,
  type SelectionProjectUpdate,
} from './selection'
afterEach(() => vi.unstubAllGlobals())

test('拒绝失败响应、未解包响应和缺失候选的项目', () => {
  const good = { id: 'project-1', version: 1, title: '选品', brief: '', candidates: [] }
  for (const value of [
    null,
    undefined,
    {},
    { error: 'not found' },
    { Status: 1, Item: good },
    { ...good, candidates: undefined },
    { ...good, version: undefined },
    { ...good, id: '' },
    { ...good, candidates: [null] },
  ]) {
    expect(isSelectionProject(value)).toBe(false)
  }
  expect(isSelectionProject(good)).toBe(true)
  expect(
    isSelectionProject({
      ...good,
      candidates: [{ id: 'candidate-1', product: { name: '真实来源商品' } }],
    }),
  ).toBe(true)
})

test('嵌套错误合同不能解锁成本回显或分析页面；零贡献利润保留', () => {
  const base = {
    id: 'p',
    version: 2,
    title: '选品',
    brief: '',
    candidates: [{ id: 'c', product: { name: '灯具' } }],
  }
  const result = {
    candidateId: 'c',
    label: '基准',
    currency: 'USD',
    contributionPerUnit: 0,
    marginPercent: 0,
    missingFields: [],
  }
  expect(isSelectionProject({ ...base, costResults: [result] })).toBe(true)
  expect(
    isSelectionProject({ ...base, costResults: [{ ...result, contributionPerUnit: '0' }] }),
  ).toBe(false)
  expect(isSelectionProject({ ...base, costs: {} })).toBe(false)
  expect(
    isSelectionProject({ ...base, candidates: [{ id: 'c', product: { Name: '错误大小写' } }] }),
  ).toBe(false)
  expect(
    isSelectionProject({
      ...base,
      analysis: {
        analyses: [{ candidateId: 'c', risks: null, nextActions: [], evidenceUrls: [] }],
      },
    }),
  ).toBe(false)
})

test('保存实际传输保留清空费用null与明确零，读取camelCase成本结果', async () => {
  const payload = {
    id: 'p',
    version: 3,
    title: '选品',
    brief: '',
    candidates: [],
    costResults: [
      {
        candidateId: 'c',
        label: '基准',
        currency: 'USD',
        contributionPerUnit: 0,
        marginPercent: 0,
        missingFields: [],
      },
    ],
  }
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const update = {
    expectedVersion: 2,
    title: '选品',
    brief: '',
    costs: [{ candidateId: 'c', sellingPrice: 0, purchaseCost: undefined }],
    specificationBriefs: [],
    trials: [],
    reviews: [],
  } as unknown as SelectionProjectUpdate
  const response = await saveSelectionProject('p', update)
  const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
  const sent = JSON.parse(init[1].body as string)
  expect(sent.costs[0].sellingPrice).toBe(0)
  expect(sent.costs[0].purchaseCost).toBeNull()
  expect(sent.expectedVersion).toBe(2)
  expect(response.Item.costResults[0]!.contributionPerUnit).toBe(0)
  expect(isSelectionProject(response.Item)).toBe(true)
})

test('新分析事实与假设合同保留来源、采集时间、零评价及缺项，兼容历史无新字段', () => {
  const row = {
    candidateId: 'c',
    risks: [],
    nextActions: [],
    evidenceUrls: ['https://example.com/p'],
  }
  const project = {
    id: 'p',
    version: 2,
    title: '选品',
    brief: '',
    candidates: [],
    analysis: { analyses: [row] },
  }
  expect(isSelectionProject(project)).toBe(true)
  const analysis = {
    gaps: ['缺少交期'],
    scopeNotes: ['目录顺序不代表销量'],
    analyses: [
      {
        ...row,
        facts: [
          {
            field: '页面评价数',
            value: '0',
            sourceUrl: 'https://example.com/p',
            observedAt: '2026-11-10T00:00:00Z',
          },
        ],
        hypotheses: ['先小批测试'],
      },
    ],
  }
  expect(isSelectionProject({ ...project, analysis })).toBe(true)
  expect(isSelectionProject({ ...project, analysis: { ...analysis, gaps: '错误数组合同' } })).toBe(
    false,
  )
  expect(
    isSelectionProject({
      ...project,
      analysis: { ...analysis, analyses: [{ ...row, facts: [{ Field: '错误大小写' }] }] },
    }),
  ).toBe(false)
})

test('后台分析202受理与恢复取消合同，不把受理当成分析成功', async () => {
  const operation = {
    id: 'op-1',
    projectId: 'p-1',
    expectedVersion: 3,
    status: 'queued',
    stage: 'queued',
    attempt: 0,
    cancelRequested: false,
  }
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(reply(operation, 202))
    .mockResolvedValueOnce(reply({ operation }))
    .mockResolvedValueOnce(reply({ ...operation, status: 'running' }))
    .mockResolvedValueOnce(reply({ ...operation, cancelRequested: true }))
  vi.stubGlobal('fetch', fetcher)
  const started = await analyzeSelectionProject('p-1', 3, 'same-key')
  expect(started.Item.status).toBe('queued')
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
    expectedVersion: 3,
    idempotencyKey: 'same-key',
  })
  expect((await getActiveSelectionAnalysis('p-1')).Item.operation?.id).toBe('op-1')
  expect((await getSelectionAnalysisOperation('p-1', 'op-1')).Item.status).toBe('running')
  expect((await cancelSelectionAnalysisOperation('p-1', 'op-1')).Item.cancelRequested).toBe(true)
  expect(fetcher.mock.calls.map(([url, init]) => [url, init.method || 'GET'])).toEqual([
    ['/api/workspace/selection-projects/p-1/analyze', 'POST'],
    ['/api/workspace/selection-projects/p-1/operations/active', 'GET'],
    ['/api/workspace/selection-projects/p-1/operations/op-1', 'GET'],
    ['/api/workspace/selection-projects/p-1/operations/op-1/cancel', 'POST'],
  ])
})
