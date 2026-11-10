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
    businessAssociations?: SelectionBusinessAssociation[]
    analyses: {
      candidateId: string
      recommendation: string
      reason: string
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
const envelope = async (action: Promise<SelectionProject>) => ({
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
export const analyzeSelectionProject = (id: string, expectedVersion: number) =>
  envelope(
    request<SelectionProject>(`${base}/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion }),
      signal: AbortSignal.timeout(120000),
    }),
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
