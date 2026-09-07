/** Echo OsResult envelope — all /os/* responses */
export interface OsResult<T> {
  ok: boolean
  code?: string
  message?: string
  data: T
}

export interface OsSession {
  sessionId: string
  userId: number
  companyId: number
  companyName: string
  userName: string
  roleIntents: string[]
  locale: string
  actorKind: string
}

export interface OsDeskRoute {
  loadingPortCode?: string
  dischargingPortCode?: string
}

export interface OsChecklistSummary {
  metCount: number
  totalCount: number
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
  /** active | passed | pending | … */
  nodeState: string
  checklist: OsChecklistItem[]
  canStamp: boolean
  blockType?: string | null
  blockDetail?: string[]
}

/** POST …/fulfil */
export interface OsFulfilResponse {
  itemCode: string
  met: boolean
  checklistSummary?: { metCount: number; totalCount: number }
  gateUnblocked?: boolean
}

/** POST …/gate (stamp) */
export interface OsNodeTransitionResponse {
  jobId?: string
  taskCode?: string
  fromState?: string
  toState?: string
  gateUnblocked?: boolean
  auditId?: string
  stampedBy?: number
  stampedAt?: string
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
}
