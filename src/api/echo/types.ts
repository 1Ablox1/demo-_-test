/** Echo OsResult envelope — all /os/* responses (Java field is `success`; docs sometimes say `ok`) */
export interface OsResult<T> {
  /** Java OsResult.success */
  success?: boolean
  /** Doc / smoke alias — accept either */
  ok?: boolean
  code?: string
  message?: string
  data: T
}

export function osResultOk(res: OsResult<unknown> | null | undefined): boolean {
  if (!res) return false
  if (typeof res.success === 'boolean') return res.success
  if (typeof res.ok === 'boolean') return res.ok
  return false
}

export interface OsSession {
  sessionId: string
  userId: number
  /** Legacy company / OS company id (Alice stub = 9001) */
  companyId: number
  companyName: string
  userName: string
  roleIntents: string[]
  locale: string
  actorKind: string
  /** Present on live validateSession path (auth design §2) */
  tenantId?: number | string
}

export interface OsDeskRoute {
  loadingPortCode?: string
  dischargingPortCode?: string
}

/** Echo OsChecklistSummaryVO — { met, total } (not metCount/totalCount) */
export interface OsChecklistSummary {
  met: number
  total: number
  /** Legacy FE aliases — normalize before use */
  metCount?: number
  totalCount?: number
}

export function normalizeChecklistSummary(
  raw?: OsChecklistSummary | null,
): { met: number; total: number } | null {
  if (!raw) return null
  const met = typeof raw.met === 'number' ? raw.met : raw.metCount
  const total = typeof raw.total === 'number' ? raw.total : raw.totalCount
  if (typeof met !== 'number' || typeof total !== 'number') return null
  return { met, total }
}

export interface OsDeskItem {
  jobId: string
  jobNo: string
  lob: string
  taskCode: string
  taskName: string
  nodeType: string
  nodeState: string
  route?: OsDeskRoute
  eta?: number
  activatedAt?: number | null
  checklistSummary?: OsChecklistSummary | null
}

export interface OsDeskPayload {
  myTasks: OsDeskItem[]
  myApprovals: OsDeskItem[]
  myWatch: OsDeskItem[]
}

export interface OsJobIdentity {
  jobId: string
  jobNo: string
  lob: string
  mbl?: string | null
  hbl?: string | null
  /** Java aliases on some VOs */
  mawbNo?: string | null
  hawbNo?: string | null
  masterFlag?: boolean | null
}

export interface OsAirImportJob {
  identity: OsJobIdentity
  route?: {
    loadingPortCode?: string
    dischargingPortCode?: string
    vessel?: string
    voyageFlight?: string
    etd?: number
    eta?: number
  }
  cargo?: {
    quantityActual?: number
    weightActual?: number
    chargeWeight?: number
    cargoEnglishName?: string
  }
  parties?: {
    customerName?: string
    shipperName?: string
    consigneeName?: string
    carrierName?: string
  }
  aiSpecific?: {
    freightTerm?: string
    incoTerm?: string
    customs?: boolean
    deliveryAddress?: string
  }
  osContext?: {
    artifactFingerprint?: string
    currentActiveTaskCodes?: string[]
    openExceptionCount?: number
    stale?: boolean
  }
}

/** GET /os/air-import/jobs/{id}/nodes/{taskCode}/gate */
export interface OsChecklistItem {
  itemCode: string
  itemName: string
  met: boolean
  metBy?: number | null
  metAt?: string | null
  source?: string
  owner?: string | null
}

export interface OsGateState {
  taskCode: string
  taskName: string
  /** active | passed | done | pending | blocked | … */
  nodeState: string
  checklist: OsChecklistItem[]
  canStamp: boolean
  blockType?: string | null
  blockDetail?: string[]
}

/** POST …/fulfil — Echo returns checklistSummary { met, total } */
export interface OsFulfilResponse {
  itemCode: string
  met: boolean
  checklistSummary?: OsChecklistSummary
  gateUnblocked?: boolean
}

/** Single transition entry from stamp / work */
export interface OsTransition {
  taskCode: string
  from: string
  to: string
}

/** POST …/gate (stamp) — Echo OsNodeTransitionResponseVO */
export interface OsNodeTransitionResponse {
  transitions?: OsTransition[]
  auditId?: string
  stampedBy?: number
  stampedAt?: string
  /** Convenience: first transition (not always present on wire) */
  jobId?: string
  taskCode?: string
  fromState?: string
  toState?: string
  gateUnblocked?: boolean
}

export interface OsBlock {
  type: string
  detail?: string | null
}

export interface OsNodeActionVerb {
  verb: string
  allowed: boolean
  blockType?: string | null
  blockDetail?: string[]
  highestMark?: string | null
  blocks?: OsBlock[]
}

export interface OsNodeActions {
  taskCode: string
  taskName?: string
  nodeType?: string
  nodeState?: string
  seq?: number
  actions?: OsNodeActionVerb[]
  checklistSummary?: OsChecklistSummary | null
}
