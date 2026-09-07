export type TaskPriority = 'critical' | 'high' | 'medium' | 'normal'
export type MarketPack = 'GLOBAL' | 'US' | 'AU'
export type ActingRole = 'operations' | 'sales' | 'finance' | 'admin'
export type RaciMark = 'R' | 'A' | 'C' | 'I'
export type DeskQueue = 'myTasks' | 'myApprovals' | 'myWatch'
export type NodeType = 'task' | 'gate'
export type ComplianceLight = 'ok' | 'warn' | 'idle'
export type HoldType = 'customs' | 'docs' | 'invoice'

/** Line of business — drives mandatory job-number prefix (AE / AI / SE / SI / RE / RI). */
export type LineOfBusiness =
  | 'air_export'
  | 'air_import'
  | 'sea_export'
  | 'sea_import'
  | 'road_export'
  | 'road_import'

export interface TaskItem {
  id: string
  priority: TaskPriority
  title: string
  shipmentId: number
  /** LOB slug for desk — derive from identity.lob when API provides identity */
  lob: LineOfBusiness
  /** Display job number — must match legacy `identity.jobNo` when wired */
  jobNo: string
  pack: MarketPack
  /** Pack version label for inspector (e.g. US Pack v1.8.0) */
  packVersion?: string
  /** Per acting-role mark — drives OsDeskVO queues */
  roleMarks: Record<ActingRole, RaciMark>
  nodeType: NodeType
  responsible: string
  /** Desk role title for Responsible (inspector) */
  responsibleTitle?: string
  accountable?: string
  accountableTitle?: string
  /** Legacy soft due — prefer cutoffLabel for desk */
  dueLabel: string
  /** Short why / task reason shown as single truncated line on desk */
  why: string
  /** House AWB — null/empty → show No AWB */
  hawb: string | null
  /** Master AWB — null/empty → show No AWB on master line when both missing */
  mawb: string | null
  lane: string
  customer: string
  /** Full cutoff sentence; desk shows parsed target + short label */
  cutoffLabel: string
  /** Short cutoff kind for dense table (e.g. Docs Cutoff) */
  cutoffKind?: string
  /** Bold target clock for dense table (e.g. 28 Jul 14:00) */
  cutoffAt?: string
  etdLabel: string
  etaLabel?: string
  flightLabel?: string
  /** Freight-language primary CTA when mark is R */
  primaryCta: string
  /** Freight-language CTA when mark is A (Approvals desk) */
  approveCta?: string
  /** OS lifecycle projection (Hugh M-G-T) */
  milestoneId?: string
  gateId?: string
  /** Active gate title for inspector */
  gateTitle?: string
  /** Market-pack regulatory reason for inspector */
  regulatoryReason?: string
  /** Money / lifecycle actions blocked by the gate */
  blockedActions?: string[]
  trigger?: string
  dataRequired?: string[]
  output?: string
  /** Freight hold chip on Needs You (gates / clearance) */
  holdType?: HoldType
  /** Money-risk chip (variance, unsigned charges, GP gate) */
  moneyRisk?: boolean
  /**
   * Hugh A still open on this gate/task — money / compliance / release stamp.
   * Prefer deriving from pack rulebook; fixtures may set explicitly.
   */
  approvalGate?: TaskApprovalGate
  /** One-step next desk after this item clears (usually next R) */
  nextHandoff?: TaskNextHandoff
  /** Gate fulfil checklist (Ops R items + auto-verified) */
  gateChecklist?: GateChecklistItem[]
}

/** Single checklist row on an open gate */
export interface GateChecklistItem {
  itemCode: string
  itemName: string
  met: boolean
  metBy?: string
  metAt?: string
  /** Who must fulfil — auto = system verified at gate open */
  fulfilRole?: 'operations' | 'finance' | 'auto'
}

/** GET /jobs/:id/gates/:gateId — checklist + stamp readiness */
export interface GateDetailPayload {
  gateId: string
  title: string
  status: 'open' | 'cleared'
  items: GateChecklistItem[]
  canStamp: boolean
  approvalRequired: boolean
  approverSeat?: string
  approverName?: string
}

/** Open Accountable stamp before the job may proceed */
export interface TaskApprovalGate {
  open: boolean
  /** Seat / role title (Hugh-stable) */
  approverSeat: string
  /** Optional person name */
  approverName?: string
  /** Plain-language reason (pack / rulebook) */
  reason: string
}

/** Next desk recipient after current step clears */
export interface TaskNextHandoff {
  taskTitle: string
  /** Seat / role title */
  seat: string
  personName?: string
  /** Who that next desk cares about — usually R */
  mark: 'R' | 'A'
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

export type JobClearanceStatus =
  | 'not_started'
  | 'in_progress'
  | 'held'
  | 'cleared'

/** AU Local Frame clearance chip — mock/manual; not N10 form */
export interface JobClearance {
  provider: 'mock' | 'manual' | 'ctrlx'
  status: JobClearanceStatus
  blockers?: Array<{ code: string; label: string }>
  note?: string
  externalRef?: string | null
}

/** Legacy-backed operate fields (Bucket A) — adapter maps from booking */
export interface JobHostFacts {
  ownerName?: string
  ownerId?: string
  ownerContact?: string
  ownerRef?: string
  incoTerm?: string
  invoiceTotal?: string
  overseasFreight?: string
  insurance?: string
  airlineCode?: string
  airlineName?: string
  loadingPort?: string
  dischargingPort?: string
  destinationPort?: string
  /** ISO date — ETA or ATA from legacy */
  firstArrivalDate?: string
  marksAndNumbers?: string
  deliveryAddress?: string
  supplierName?: string
  declarationId?: string | null
}

export type JobLob = 'AE' | 'AI' | 'SE' | 'SI' | 'RE' | 'RI'

/** Legacy / Echo identity block — source of truth for display jobNo (JOB_NO). */
export interface JobIdentity {
  /** OS or legacy UUID — primary key at wire time */
  jobId: string
  /** Human-readable number from legacy `JOB_NO` — always prefer for UI display */
  jobNo: string
  lob: JobLob
  mbl?: string | null
  hbl?: string | null
}

export interface JobContext {
  shipmentId: number
  /** Legacy-shaped identity — required on API responses; MSW enriches from fixtures */
  identity?: JobIdentity
  /** Line of business — drives essentials visibility for AI import */
  lob?: JobLob
  pack: MarketPack
  /**
   * Enabled packs for this job (tenant Required ∪ corridor).
   * Operator sees read-only badges — never a toolbar country picker.
   */
  activePacks?: MarketPack[]
  /** Home currency hint from pack/branch (AU→AUD) */
  homeCurrency?: 'AUD' | 'USD'
  /** AU import clearance chip (Local Frame) */
  clearance?: JobClearance
  /** Operate/host facts from legacy (read-only in OS) */
  hostFacts?: JobHostFacts
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
