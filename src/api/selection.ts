import { request } from './http'
// 选品方案接口沿用工作区会话，不直连ERP或创建业务单据。

export interface SelectionProduct {
  name: string
  platform: string
  productUrl?: string | null
  imageUrl?: string | null
  sourceUrl: string
  observedAt: string
  displayedPrice?: string | null
  rating?: number | null
  reviewCount?: number | null
  rank?: number | null
  observationKind?: string | null
}

export interface SelectionHistoryPoint {
  observedAt: string
  sourceUrl: string
  displayValue: string
  numericValue: number | null
  currency: string | null
  evidenceKind: string
}

export interface SelectionHistorySeries {
  metric: string
  status: string
  canDescribeChange: boolean
  change: number | null
  points: SelectionHistoryPoint[]
  explanation: string
}

export interface SelectionProductHistory {
  platform: string
  productUrl: string
  readAt: string
  from?: string | null
  to?: string | null
  status: 'complete' | 'partial'
  skippedFiles: number
  price: SelectionHistorySeries
  rating: SelectionHistorySeries
  reviewCount: SelectionHistorySeries
}

export interface SelectionCostScenario {
  candidateId: string
  label: string
  currency: string
  sellingPrice: number | null
  discountPerUnit: number | null
  refundPerUnit: number | null
  purchaseCost: number | null
  inboundCost: number | null
  channelCost: number | null
  fulfillmentCost: number | null
  advertisingCost: number | null
  returnHandlingCost: number | null
  assumptions: string
}

export interface SelectionSpecificationBrief {
  candidateId: string
  targetCustomer: string
  room: string
  designChanges: string
  specifications: string
  packaging: string
  validation: string
  risks: string
}

export interface SelectionTrialPlan {
  candidateId: string
  currency?: string
  channel: string
  quantity: number | null
  minimumOrderQuantity: number | null
  packSize: number | null
  unitBudget: number | null
  budget: number | null
  leadDays: number | null
  launchDate: string | null
  hypothesis: string
  successCriteria: string
  stopCriteria: string
  status: 'draft' | 'sampling' | 'testing' | 'scale' | 'stop'
}

export interface SelectionTrialReview {
  candidateId: string
  reviewDate: string
  soldUnits: number | null
  returnedUnits: number | null
  actualContribution: number | null
  currency: string
  findings: string
  decision: 'continue' | 'revise' | 'scale' | 'stop'
}

export interface SelectionProject {
  analysis?: {
    projectId: string
    projectVersion: number
    overview: string
    gaps?: string[]
    scopeNotes?: string[]
    businessAssociations?: SelectionBusinessAssociation[]
    analyses: {
      candidateId: string
      recommendation: string
      reason: string
      facts?: { field: string; value: string; sourceUrl: string; observedAt?: string | null }[]
      hypotheses?: string[]
      claims?: {
        field: string
        kind: 'fact' | 'inference' | 'action'
        text: string
        support: { sourceUrl: string; exactQuote: string }[]
        basis?: string | null
        limitation?: string | null
      }[]
      evidenceUrls: string[]
      risks: string[]
      nextActions: string[]
    }[]
  } | null
  id: string
  version: number
  title: string
  conversationId: string
  messageId: string
  createdAt: string
  updatedAt: string
  brief: string
  candidates: { id: string; position: number; product: SelectionProduct }[]
  costs: SelectionCostScenario[]
  specificationBriefs: SelectionSpecificationBrief[]
  trials: SelectionTrialPlan[]
  reviews: SelectionTrialReview[]
  costResults: {
    candidateId: string
    label: string
    currency: string
    contributionPerUnit: number | null
    marginPercent: number | null
    missingFields: string[]
  }[]
}

export interface SelectionBusinessAssociation {
  candidateId: string
  productId: string
  sku: string
  productName: string
  relation: string
  category: string
  warnings: string[]
  facts: {
    toolCode: string
    invocationId?: string | null
    values: Record<string, unknown>
    period?: Record<string, unknown> | null
  }[]
}

export type SelectionProjectUpdate = Pick<
  SelectionProject,
  'title' | 'brief' | 'costs' | 'specificationBriefs' | 'trials' | 'reviews'
> & { expectedVersion: number }

const base = '/workspace/selection-projects'
export const listSelectionProjects = async () => ({
  Status: 1,
  Item: await request<SelectionProject[]>(base),
  Message: '',
})
const envelope = async <T>(action: Promise<T>) => ({
  Status: 1,
  Item: await action,
  Message: '',
})
export const createSelectionProject = (conversationId: string, messageId: string) =>
  envelope(
    request<SelectionProject>(base, {
      method: 'POST',
      body: JSON.stringify({ conversationId, messageId }),
      signal: AbortSignal.timeout(60000),
    }),
  )
export const getSelectionProject = (id: string) =>
  envelope(
    request<SelectionProject>(`${base}/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(60000),
    }),
  )
export const saveSelectionProject = (id: string, data: SelectionProjectUpdate) =>
  envelope(
    request<SelectionProject>(`${base}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data, (_key, value) => (value === undefined ? null : value)),
      signal: AbortSignal.timeout(60000),
    }),
  )
export interface SelectionAnalysisOperation {
  id: string
  projectId: string
  expectedVersion: number
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'superseded'
  stage: string
  attempt: number
  canResume?: boolean
  cancelRequested: boolean
  createdAt: string
  updatedAt: string
  resultProjectVersion?: number | null
  errorCode?: string | null
}

const operationSignal = (signal?: AbortSignal) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)

/** 启动持久后台任务，HTTP只等待受理结果，不等待模型完成。 */
export const analyzeSelectionProject = (
  id: string,
  expectedVersion: number,
  idempotencyKey: string,
) =>
  envelope(
    request<SelectionAnalysisOperation>(`${base}/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, idempotencyKey }),
      signal: operationSignal(),
    }),
  )

export const getActiveSelectionAnalysis = (id: string, signal?: AbortSignal) =>
  envelope(
    request<{
      operation: SelectionAnalysisOperation | null
      latest?: SelectionAnalysisOperation | null
    }>(`${base}/${encodeURIComponent(id)}/operations/active`, { signal: operationSignal(signal) }),
  )

export const getSelectionAnalysisOperation = (
  id: string,
  operationId: string,
  signal?: AbortSignal,
) =>
  envelope(
    request<SelectionAnalysisOperation>(
      `${base}/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}`,
      { signal: operationSignal(signal) },
    ),
  )

/** 只有用户点击取消才调用；关闭面板或组件卸载不会调用。 */
export const cancelSelectionAnalysisOperation = (id: string, operationId: string) =>
  envelope(
    request<SelectionAnalysisOperation>(
      `${base}/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}/cancel`,
      { method: 'POST', signal: operationSignal() },
    ),
  )

export const getSelectionProductHistory = async (
  id: string,
  candidateId: string,
  from?: string,
  to?: string,
) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return {
    Status: 1,
    Message: '',
    Item: await request<SelectionProductHistory>(
      `${base}/${encodeURIComponent(id)}/candidates/${encodeURIComponent(candidateId)}/history?${params}`,
      { signal: AbortSignal.timeout(60000) },
    ),
  }
}

/** 在改变当前编辑状态前校验返回合同，错误对象不能被当作已创建方案。 */
export function isSelectionProject(value: unknown): value is SelectionProject {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<SelectionProject>
  const rows = (items: unknown, predicate: (item: Record<string, unknown>) => boolean) =>
    items == null ||
    (Array.isArray(items) &&
      items.every((item) => item && typeof item === 'object' && predicate(item)))
  const textList = (items: unknown) =>
    Array.isArray(items) && items.every((item) => typeof item === 'string')
  const numberOrNull = (item: unknown) =>
    item == null || (typeof item === 'number' && Number.isFinite(item))
  const candidateRow = (item: Record<string, unknown>) => typeof item.candidateId === 'string'
  return (
    typeof project.id === 'string' &&
    project.id.length > 0 &&
    Number.isInteger(project.version) &&
    Number(project.version) >= 1 &&
    typeof project.title === 'string' &&
    typeof project.brief === 'string' &&
    Array.isArray(project.candidates) &&
    project.candidates.every(
      (candidate) =>
        candidate &&
        typeof candidate.id === 'string' &&
        candidate.product &&
        typeof candidate.product.name === 'string',
    ) &&
    rows(project.costs, candidateRow) &&
    rows(project.specificationBriefs, candidateRow) &&
    rows(project.trials, candidateRow) &&
    rows(project.reviews, candidateRow) &&
    rows(
      project.costResults,
      (item) =>
        candidateRow(item) &&
        numberOrNull(item.contributionPerUnit) &&
        numberOrNull(item.marginPercent) &&
        textList(item.missingFields),
    ) &&
    (project.analysis == null ||
      ((project.analysis.gaps == null || textList(project.analysis.gaps)) &&
        (project.analysis.scopeNotes == null || textList(project.analysis.scopeNotes)) &&
        Array.isArray(project.analysis.analyses) &&
        project.analysis.analyses.every(
          (item) =>
            item &&
            typeof item.candidateId === 'string' &&
            textList(item.risks) &&
            textList(item.nextActions) &&
            textList(item.evidenceUrls) &&
            (item.hypotheses == null || textList(item.hypotheses)) &&
            rows(
              item.facts,
              (fact) =>
                typeof fact.field === 'string' &&
                typeof fact.value === 'string' &&
                typeof fact.sourceUrl === 'string',
            ),
        )))
  )
}

/** 显式续跑失败任务，服务端再次核验原始输入版本与checkpoint。 */
export const resumeSelectionAnalysisOperation = (
  id: string,
  operationId: string,
  expectedVersion: number,
  idempotencyKey: string,
) =>
  envelope(
    request<SelectionAnalysisOperation>(
      `${base}/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}/resume`,
      {
        method: 'POST',
        body: JSON.stringify({ expectedVersion, idempotencyKey }),
        signal: operationSignal(),
      },
    ),
  )
