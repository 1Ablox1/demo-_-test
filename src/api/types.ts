export type TaskPriority = 'critical' | 'high' | 'medium' | 'normal'
export type MarketPack = 'GLOBAL' | 'US' | 'AU'
export type ActingRole = 'operations' | 'sales' | 'finance' | 'admin'
export type RaciMark = 'R' | 'A' | 'C' | 'I'
export type DeskQueue = 'myTasks' | 'myApprovals' | 'myWatch'
export type NodeType = 'task' | 'gate'
export type ComplianceLight = 'ok' | 'warn' | 'idle'

export interface TaskItem {
  id: string
  priority: TaskPriority
  title: string
  shipmentId: number
  /** Monospace job / file id shown on desk (e.g. AF-1024) */
  jobNo: string
  pack: MarketPack
  /** Per acting-role mark — drives OsDeskVO queues */
  roleMarks: Record<ActingRole, RaciMark>
  nodeType: NodeType
  responsible: string
  accountable?: string
  /** Legacy soft due — prefer cutoffLabel for desk */
  dueLabel: string
  /** Freight why with deadline impact */
  why: string
  /** House AWB — null/empty → show No AWB */
  hawb: string | null
  /** Master AWB — null/empty → show No AWB on master line when both missing */
  mawb: string | null
  lane: string
  customer: string
  /** Docs / AES / GST cutoff or ETD clock label */
  cutoffLabel: string
  etdLabel: string
  /** Freight-language primary CTA when mark is R */
  primaryCta: string
  /** Freight-language CTA when mark is A (Approvals desk) */
  approveCta?: string
  /** OS lifecycle projection (Hugh M-G-T) */
  milestoneId?: string
  gateId?: string
  trigger?: string
  dataRequired?: string[]
  output?: string
}

export interface WorkboardJob {
  id: string
  shipmentId: number
  label: string
  route?: string
  status?: string
}

export interface MyTasksSummary {
  exceptions: number
  activeJobs: number
  priorityCounts: Record<'critical' | 'high' | 'medium', number>
}

export interface MyTasksPayload {
  tasks: TaskItem[]
  workboard: WorkboardJob[]
  summary: MyTasksSummary
}

export interface JobCompliance {
  customs: ComplianceLight
  documents: ComplianceLight
  invoice: ComplianceLight
}

export interface JobSummary {
  customer: string
  route: string
  status: string
  priority: string
}

export interface JobDocuments {
  completed: number
  total: number
  done: string[]
  missing: string[]
  impact: string
}

export interface TimelineItem {
  label: string
  date: string
  state: 'done' | 'current' | 'pending'
}

export interface JobRaci {
  responsible: string
  accountable: string
}

export type HoldType = 'customs' | 'docs' | 'invoice'

export type JobMoneyState =
  | 'open_wip'
  | 'provisioned'
  | 'charges_approved'
  | 'part_invoiced'
  | 'invoiced'
  | 'actuals_posted'
  | 'verified'
  | 'closed'
  | 'blocked'

export interface JobOpsFacts {
  hawb: string | null
  mawb: string | null
  airline: string
  pieces: number
  grossWeightKg: number
  chargeableWeightKg: number
  slaLabel: string
  sellAmount: string
  costAmount: string
  moneyAtRisk: string
  marginPct: string
  /** Provisional GP when job is provisioned (AF-05 / L2) */
  provisionalGp?: string
  moneyState?: JobMoneyState
  etdLabel: string
  etaLabel: string
  /** Freight hold for exception drawer */
  holdType?: HoldType
}

/** AF-05 charge line accrual states (Hugh Q2C → FINANCIAL-Q2C-LIFECYCLE) */
export type ChargeLineState =
  | 'draft'
  | 'rated'
  | 'safeguard'
  | 'accrued'
  | 'approved'
  | 'invoiced_ar'
  | 'actual_ap'
  | 'variance'
  | 'posted'

export type ChargeSide = 'AR' | 'AP'

export type ChargeAuditKind = 'accrual' | 'actual' | 'variance_approved' | 'posted'

export interface ChargeAuditEvent {
  id: string
  kind: ChargeAuditKind
  at: string
  by: string
  amount?: number
  note?: string
}

export interface ChargeLine {
  id: string
  code: string
  description: string
  side: ChargeSide
  /** Original-currency amount (accrued / billed face) */
  amount: number
  /** Base before CAF (AP foreign currency) */
  baseAmount?: number
  currency: string
  /** Home currency (AUD) equivalent */
  amountAud: number
  rateSource: 'tariff' | 'safeguard' | 'manual' | 'actual'
  state: ChargeLineState
  accruedAmount?: number
  actualAmount?: number
  /** Actual in home currency */
  actualAmountAud?: number
  varianceAmount?: number
  partyName?: string
  ratingBasis?: string
  oversea?: boolean
  /** CAF applied on this AP accrual */
  cafApplied?: boolean
  posted?: boolean
  varianceNote?: string
  /** True when variance over threshold was explained */
  varianceCleared?: boolean
  audit?: ChargeAuditEvent[]
}

export interface ChargesGpSummary {
  /** Always home currency (AUD) */
  sellTotal: number
  accruedCostTotal: number
  provisionalGp: number
  actualCostTotal: number | null
  actualGp: number | null
  varianceTotal: number | null
  currency: string
  wip: boolean
  postedCount: number
  unpostedCount: number
}

export interface ChargesPayload {
  shipmentId: number
  jobNo: string
  /** Market pack — drives home currency mock */
  pack: MarketPack
  moneyState: JobMoneyState
  blocked: boolean
  blockReason?: HoldType | 'none'
  blockMessage?: string
  /** Currency Adjustment Factor % — Finance editable */
  cafPercent: number
  /** Job FX: 1 unit of foreign currency → home (mock; Admin can override) */
  fxToAud: number
  homeCurrency: 'AUD' | 'USD'
  varianceThresholdPct: number
  lines: ChargeLine[]
  gp: ChargesGpSummary
  allowedActions: Array<'accrue' | 'approve' | 'post_actuals' | 'open_invoice'>
}

/** AF-06 invoice states */
export type InvoiceState = 'draft' | 'ready' | 'issued' | 'part_paid' | 'paid'

export type InvoicePaymentChip = 'unpaid' | 'part_paid' | 'paid' | 'blocked'

export interface InvoiceBlocker {
  id: string
  label: string
  cleared: boolean
}

export interface InvoiceLine {
  id: string
  code: string
  description: string
  amount: number
  currency: string
  amountAud: number
}

export interface InvoicePayload {
  shipmentId: number
  jobNo: string
  state: InvoiceState
  customer: string
  lane: string
  homeCurrency: 'AUD' | 'USD'
  fxToAud: number
  /** Bill-to / settlement hint — not a dual bill UI */
  settlementHint: string
  lines: InvoiceLine[]
  subtotalAud: number
  taxAud: number
  totalAud: number
  blockers: InvoiceBlocker[]
  paymentChip: InvoicePaymentChip
  invoiceNo: string | null
  issuedAt: string | null
  hawb: string | null
  mawb: string | null
}

export interface JobContext {
  shipmentId: number
  pack: MarketPack
  compliance: JobCompliance
  summary: JobSummary
  documents: JobDocuments
  nextAction: string
  timeline: TimelineItem[]
  raci: JobRaci
  ops: JobOpsFacts
}

/** Map mark → OsDeskVO queue (RA treated as R for myTasks). */
export function queueForMark(mark: RaciMark): DeskQueue {
  if (mark === 'R') return 'myTasks'
  if (mark === 'A') return 'myApprovals'
  return 'myWatch'
}

/** Fallback when fixture has no primaryCta — freight verbs, not PM Review/Open. */
export function ctaForMark(mark: RaciMark): string {
  if (mark === 'R') return 'Open job'
  if (mark === 'A') return 'Approve'
  return 'View only'
}

export function ctaForTask(task: TaskItem, mark: RaciMark): string {
  if (mark === 'C' || mark === 'I') return 'View only'
  if (mark === 'A') return task.approveCta?.trim() || 'Approve'
  if (task.primaryCta?.trim()) return task.primaryCta
  return ctaForMark(mark)
}

/** HAWB · MAWB line for desk rows/cards */
export function awbDisplay(task: TaskItem): string {
  const hawb = task.hawb?.trim()
  const mawb = task.mawb?.trim()
  if (!hawb && !mawb) return 'No AWB'
  const parts: string[] = []
  parts.push(hawb ? `HAWB ${hawb}` : 'HAWB —')
  parts.push(mawb ? `MAWB ${mawb}` : 'MAWB —')
  return parts.join(' · ')
}
