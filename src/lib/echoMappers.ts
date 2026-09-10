import type {
  GateChecklistItem,
  GateDetailPayload,
  JobClearance,
  JobContext,
  MyTasksPayload,
  RaciMark,
  TaskItem,
  TaskPriority,
} from '@/api/types'
import type {
  OsAirImportJob,
  OsDeskItem,
  OsDeskPayload,
  OsGateState,
} from '@/api/echo/types'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'
import { lineOfBusinessFromJobLob } from '@/lib/jobIdentity'
import { mockIdentityForShipment } from '@/mocks/fixtures/jobIdentities'
import { jobContextByShipment } from '@/mocks/fixtures/jobs'
import { isEchoWiredShipment, shipmentIdForEchoJob } from '@/lib/echoJobMap'

function formatEpoch(ms?: number | null): string {
  if (!ms) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

function laneFromRoute(loading?: string, discharging?: string): string {
  const from = loading?.trim() || '—'
  const to = discharging?.trim() || '—'
  return `${from} → ${to}`
}

function roleMarksForQueue(queue: 'R' | 'A' | 'C'): Record<'operations' | 'sales' | 'finance' | 'admin', RaciMark> {
  if (queue === 'R') {
    return { operations: 'R', sales: 'I', finance: 'I', admin: 'I' }
  }
  if (queue === 'A') {
    return { operations: 'I', sales: 'I', finance: 'A', admin: 'C' }
  }
  return { operations: 'I', sales: 'C', finance: 'I', admin: 'I' }
}

function mapDeskItem(item: OsDeskItem, queue: 'R' | 'A' | 'C'): TaskItem | null {
  const shipmentId = shipmentIdForEchoJob(item.jobId)
  if (shipmentId == null) return null

  const identity = mockIdentityForShipment(shipmentId)
  const lob = lineOfBusinessFromJobLob((item.lob || identity.lob) as 'AI')
  const lane = laneFromRoute(item.route?.loadingPortCode, item.route?.dischargingPortCode)
  const nodeType = item.nodeType === 'GATE' ? 'gate' : 'task'
  const priority: TaskPriority = nodeType === 'gate' ? 'high' : 'medium'

  return {
    id: `echo-${item.jobId}-${item.taskCode}-${queue}`,
    priority,
    title: item.taskName,
    shipmentId,
    jobNo: item.jobNo?.trim() || identity.jobNo || '—',
    lob,
    pack: 'AU',
    packVersion: 'AU Pack v1.0.0',
    roleMarks: roleMarksForQueue(queue),
    nodeType,
    responsible: 'Sarah Jenkins',
    responsibleTitle: 'Air Import',
    dueLabel: 'Open',
    why: item.taskName,
    hawb: identity.hbl ?? null,
    mawb: identity.mbl ?? null,
    lane,
    customer: '—',
    cutoffLabel: item.eta ? `ETA ${formatEpoch(item.eta)}` : 'No cutoff',
    etdLabel: '—',
    primaryCta: queue === 'A' ? 'Approve gate' : 'Open job',
    approveCta: queue === 'A' ? 'Stamp release' : undefined,
    milestoneId: 'documents',
    gateId: nodeType === 'gate' ? `echo-gate-${item.taskCode}` : undefined,
    holdType: nodeType === 'gate' ? 'customs' : undefined,
  }
}

export function mapEchoDeskToPayload(desk: OsDeskPayload): MyTasksPayload {
  const tasks: TaskItem[] = []
  for (const item of desk.myTasks ?? []) {
    const mapped = mapDeskItem(item, 'R')
    if (mapped) tasks.push(mapped)
  }
  for (const item of desk.myApprovals ?? []) {
    const mapped = mapDeskItem(item, 'A')
    if (mapped) tasks.push(mapped)
  }
  for (const item of desk.myWatch ?? []) {
    const mapped = mapDeskItem(item, 'C')
    if (mapped) tasks.push(mapped)
  }

  const workboard = tasks.reduce<MyTasksPayload['workboard']>((acc, t) => {
    if (acc.some((w) => w.shipmentId === t.shipmentId)) return acc
    acc.push({
      id: `wb-echo-${t.shipmentId}`,
      shipmentId: t.shipmentId,
      label: t.jobNo,
      route: t.lane,
      status: t.milestoneId ?? 'active',
    })
    return acc
  }, [])

  return {
    tasks,
    workboard,
    summary: {
      exceptions: tasks.filter((t) => t.nodeType === 'gate').length,
      activeJobs: workboard.length,
      priorityCounts: {
        critical: tasks.filter((t) => t.priority === 'critical').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
      },
    },
  }
}

export function mapEchoJobToContext(job: OsAirImportJob, shipmentId: number): JobContext {
  const identity = {
    jobId: job.identity.jobId,
    jobNo: job.identity.jobNo,
    lob: (job.identity.lob || 'AI') as 'AI',
    mbl: job.identity.mbl ?? job.identity.mawbNo ?? null,
    hbl: job.identity.hbl ?? job.identity.hawbNo ?? null,
  }

  const route = laneFromRoute(job.route?.loadingPortCode, job.route?.dischargingPortCode)
  const customer = job.parties?.customerName?.trim() || '—'
  const activeCodes = job.osContext?.currentActiveTaskCodes ?? []
  const status =
    activeCodes.length > 0 ? `Active · ${activeCodes.join(', ')}` : 'In progress'

  const base: JobContext = {
    shipmentId,
    identity,
    lob: identity.lob,
    pack: 'AU',
    activePacks: ['GLOBAL', 'AU'],
    homeCurrency: 'AUD',
    compliance: {
      customs: 'idle',
      documents: 'ok',
      invoice: 'idle',
    },
    summary: {
      customer,
      route,
      status,
      priority: 'Medium',
    },
    documents: {
      completed: 0,
      total: 0,
      done: [],
      missing: [],
      impact: 'Echo read — documents from legacy adapter pending.',
    },
    nextAction: activeCodes[0] ? `Complete ${activeCodes[0]}` : 'Review job',
    timeline: [],
    raci: {
      responsible: 'Sarah Jenkins',
      accountable: 'Marcello Vance',
    },
    ops: {
      hawb: identity.hbl ?? null,
      mawb: identity.mbl ?? null,
      airline: job.parties?.carrierName?.trim() || job.route?.vessel || '—',
      pieces: job.cargo?.quantityActual ?? 0,
      grossWeightKg: job.cargo?.weightActual ?? 0,
      chargeableWeightKg: job.cargo?.chargeWeight ?? 0,
      slaLabel: job.route?.eta ? `ETA ${formatEpoch(job.route.eta)}` : '—',
      sellAmount: '—',
      costAmount: '—',
      moneyAtRisk: '—',
      marginPct: '—',
      etdLabel: job.route?.etd ? `ETD ${formatEpoch(job.route.etd)}` : '—',
      etaLabel: job.route?.eta ? `ETA ${formatEpoch(job.route.eta)}` : '—',
    },
  }

  return mergeModule1Overlay(base, shipmentId)
}

/**
 * When Echo clearance is Cleared, strip held-fixture money locks so shell tabs
 * and Action Required stay consistent with the gate (hybrid Module 1).
 * Does NOT reset Accrue/Approve/Invoice progress if money already advanced.
 */
export function applyClearanceToJobContext(
  ctx: JobContext,
  clearance: JobClearance,
): JobContext {
  if (clearance.status !== 'cleared') {
    return { ...ctx, clearance }
  }

  const money = ctx.ops.moneyState
  const pastAccrue =
    money === 'provisioned' ||
    money === 'charges_approved' ||
    money === 'invoiced' ||
    money === 'part_invoiced' ||
    money === 'actuals_posted' ||
    money === 'verified' ||
    money === 'closed'

  const { holdType: _dropHold, ...opsRest } = ctx.ops
  return {
    ...ctx,
    clearance,
    compliance: {
      customs: 'ok',
      documents: ctx.compliance.documents === 'warn' ? 'ok' : ctx.compliance.documents,
      invoice: pastAccrue && money === 'invoiced' ? 'ok' : 'idle',
    },
    summary: {
      ...ctx.summary,
      status: pastAccrue ? ctx.summary.status : 'Clearance cleared',
    },
    documents: {
      ...ctx.documents,
      impact: pastAccrue
        ? ctx.documents.impact
        : 'Clearance Cleared — Ops may Accrue on Charges; Finance approves before Invoice.',
      missing: [],
    },
    nextAction: pastAccrue ? ctx.nextAction : 'Accrue charge lines on Charges',
    ops: {
      ...opsRest,
      moneyState: pastAccrue ? money : 'open_wip',
      moneyAtRisk: pastAccrue ? ctx.ops.moneyAtRisk : 'AUD 6,400 ready to accrue',
    },
  }
}

/** Module 1 MSW overlay — clearance from Echo gate when provided; else fixture held. */
export function mergeModule1Overlay(
  ctx: JobContext,
  shipmentId: number,
  echoClearance?: JobClearance | null,
): JobContext {
  if (!isEchoWiredShipment(shipmentId)) return ctx
  const overlay = jobContextByShipment[shipmentId]
  if (!overlay) return ctx

  const merged: JobContext = {
    ...ctx,
    activePacks: overlay.activePacks ?? ctx.activePacks,
    homeCurrency: overlay.homeCurrency ?? ctx.homeCurrency,
    clearance: echoClearance ?? overlay.clearance ?? ctx.clearance,
    hostFacts: overlay.hostFacts ?? ctx.hostFacts,
    compliance: overlay.compliance ?? ctx.compliance,
    documents: overlay.documents ?? ctx.documents,
    nextAction: overlay.nextAction ?? ctx.nextAction,
    timeline: overlay.timeline?.length ? overlay.timeline : ctx.timeline,
    raci: overlay.raci ?? ctx.raci,
    ops: { ...ctx.ops, ...overlay.ops, hawb: ctx.ops.hawb, mawb: ctx.ops.mawb },
    identity: ctx.identity ?? mockIdentityForShipment(shipmentId),
  }

  if (echoClearance) {
    return applyClearanceToJobContext(merged, echoClearance)
  }
  return merged
}

export function clearanceFromEchoGate(gate: OsGateState): JobClearance {
  const state = gate.nodeState?.toLowerCase() ?? ''
  if (state === 'passed' || state === 'done') {
    return {
      provider: 'mock',
      status: 'cleared',
      blockers: [],
      note: 'AU clearance released (Echo stamp) — money pages unlocked.',
      externalRef: gate.taskCode,
    }
  }
  const unmet = gate.blockDetail?.length
    ? gate.blockDetail
    : gate.checklist?.filter((i) => !i.met).map((i) => i.itemCode) ?? []
  return {
    provider: 'mock',
    status: 'held',
    blockers: unmet.length
      ? unmet.map((code) => ({ code, label: code }))
      : [{ code: 'CLEARANCE', label: 'Clearance held' }],
    note: 'AU pack — clearance held; Accrue / Invoice stay locked until Cleared.',
    externalRef: gate.taskCode,
  }
}

function fulfilRoleForItem(owner?: string | null, source?: string): GateChecklistItem['fulfilRole'] {
  if (source === 'digital' || source === 'engine' || !owner) return 'auto'
  if (owner === 'billing' || owner === 'credit') return 'finance'
  return 'operations'
}

export function mapEchoGateToDetail(gate: OsGateState, gateId = AU_CLEARANCE_GATE_ID): GateDetailPayload {
  const state = gate.nodeState?.toLowerCase() ?? 'active'
  const status: GateDetailPayload['status'] =
    state === 'passed' || state === 'done' ? 'cleared' : 'open'

  const items: GateChecklistItem[] = (gate.checklist ?? []).map((item) => ({
    itemCode: item.itemCode,
    itemName: item.itemName,
    met: item.met,
    metBy: item.metBy != null ? String(item.metBy) : undefined,
    metAt: item.metAt ?? undefined,
    fulfilRole: fulfilRoleForItem(item.owner, item.source),
  }))

  const allMet = items.length > 0 && items.every((i) => i.met)

  return {
    gateId,
    title: gate.taskName || 'AU import clearance',
    status,
    items,
    canStamp: status === 'open' && (gate.canStamp || allMet),
    approvalRequired: true,
    approverSeat: 'Finance',
    approverName: 'Marcello Vance',
  }
}

export function mergeHybridDesk(echo: MyTasksPayload, msw: MyTasksPayload): MyTasksPayload {
  // Prefer Echo desk rows for wired Module-1 jobs when Echo returns any;
  // fall back to MSW Module-1 fixtures if Echo desk is empty / down for that job.
  const echoWired = echo.tasks.filter((t) => isEchoWiredShipment(t.shipmentId))
  const echoOther = echo.tasks.filter((t) => !isEchoWiredShipment(t.shipmentId))
  const mswModule1 = msw.tasks.filter((t) => isEchoWiredShipment(t.shipmentId))
  const echoShipmentIds = new Set(echo.tasks.map((t) => t.shipmentId))
  const mswOther = msw.tasks.filter(
    (t) => !isEchoWiredShipment(t.shipmentId) && !echoShipmentIds.has(t.shipmentId),
  )
  const module1 = echoWired.length > 0 ? echoWired : mswModule1
  const tasks = [...module1, ...echoOther, ...mswOther]
  const workboard = [...msw.workboard]
  for (const wb of echo.workboard) {
    if (!workboard.some((w) => w.shipmentId === wb.shipmentId)) workboard.push(wb)
  }
  return {
    tasks,
    workboard,
    summary: {
      exceptions: tasks.filter((t) => t.nodeType === 'gate' || t.priority === 'critical').length,
      activeJobs: workboard.length,
      priorityCounts: {
        critical: tasks.filter((t) => t.priority === 'critical').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
      },
    },
  }
}
