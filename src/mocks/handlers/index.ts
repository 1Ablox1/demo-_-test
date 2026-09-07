import { http, HttpResponse } from 'msw'
import { jobContextByShipment } from '@/mocks/fixtures/jobs'
import { cloneCharges } from '@/mocks/fixtures/charges'
import { cloneInvoice } from '@/mocks/fixtures/invoice'
import {
  allLifecycleShipments,
  cloneLifecycle,
} from '@/mocks/fixtures/lifecycle'
import type { JobLifecycle } from '@/os/types'
import type { ActingRole as Role } from '@/api/types'
import type { ChargesPayload, InvoicePayload, JobContext, MyTasksPayload } from '@/api/types'
import { applyCafToLines } from '@/lib/chargesMoney'
import { allowedActionsForMoneyState } from '@/lib/chargesAllowedActions'
import {
  AU_CLEARANCE_GATE_ID,
  enrichClearanceDeskTask,
  opsChecklistItemsMet,
} from '@/lib/gateChecklist'
import { clearanceBlocksMoney, moneyBlockFromJob } from '@/lib/moneyGates'
import { seedAuClearanceGateDetail } from '@/mocks/fixtures/gateChecklists'
import type { GateDetailPayload, TaskItem } from '@/api/types'
import {
  clearGate,
  completeTask,
  computeAllowedActions,
  milestoneViews,
  moneyBlockedByGates,
  projectDeskTasks,
} from '@/os/engine'
import { numberingMockDb } from '@/mocks/numberingStore'

const runtimeCharges: Record<number, ChargesPayload> = {}
const runtimeInvoice: Record<number, InvoicePayload> = {}
const runtimeLife: Record<number, JobLifecycle> = {}
const runtimeJobs: Record<number, JobContext> = {}
const runtimeGateChecklists: Record<string, GateDetailPayload> = {}

function gateChecklistKey(shipmentId: number, gateId: string) {
  return `${shipmentId}:${gateId}`
}

function getGateChecklistDetail(shipmentId: number, gateId: string): GateDetailPayload | null {
  if (gateId !== AU_CLEARANCE_GATE_ID) return null
  const key = gateChecklistKey(shipmentId, gateId)
  if (!runtimeGateChecklists[key]) {
    if (shipmentId === 4096) {
      runtimeGateChecklists[key] = seedAuClearanceGateDetail()
    } else {
      return null
    }
  }
  const detail = runtimeGateChecklists[key]
  const life = getLife(shipmentId)
  const gateOpen = life?.gates.some((g) => g.id === gateId && g.status === 'open') ?? false
  detail.status = gateOpen ? 'open' : 'cleared'
  detail.canStamp = gateOpen && opsChecklistItemsMet(detail.items)
  return detail
}

function refreshGateChecklistCanStamp(shipmentId: number, gateId: string) {
  const detail = getGateChecklistDetail(shipmentId, gateId)
  if (!detail) return
  const life = getLife(shipmentId)
  const gateOpen = life?.gates.some((g) => g.id === gateId && g.status === 'open') ?? false
  detail.canStamp = gateOpen && opsChecklistItemsMet(detail.items)
}

function enrichDeskTasksForClearance(tasks: TaskItem[]): TaskItem[] {
  return tasks.map((task) => {
    if (
      task.shipmentId !== 4096 ||
      (task.gateId !== AU_CLEARANCE_GATE_ID &&
        task.id !== `gate-card-${AU_CLEARANCE_GATE_ID}` &&
        task.id !== 'task-4096-clear-clearance')
    ) {
      return task
    }
    const detail = getGateChecklistDetail(task.shipmentId, AU_CLEARANCE_GATE_ID)
    if (!detail) return task
    const gateOpen = detail.status === 'open'
    return enrichClearanceDeskTask(task, detail.items, gateOpen)
  })
}

function getJob(shipmentId: number): JobContext | null {
  if (!runtimeJobs[shipmentId]) {
    const base = jobContextByShipment[shipmentId]
    if (!base) return null
    runtimeJobs[shipmentId] = structuredClone(base)
  }
  return runtimeJobs[shipmentId]
}

function applyClearanceToJob(job: JobContext, status: 'cleared' | 'held') {
  if (!job.clearance) return
  job.clearance.status = status
  if (status === 'cleared') {
    job.clearance.blockers = []
    job.clearance.note = 'AU clearance Cleared (mock) — money pages unlocked.'
    job.clearance.externalRef = 'MOCK-ATD-4096'
    job.compliance.customs = 'ok'
    job.summary.status = 'Clearance cleared'
    delete job.ops.holdType
    job.ops.moneyState = 'open_wip'
    job.ops.moneyAtRisk = 'AUD 6,400 ready to accrue'
    job.nextAction = 'Accrue charge lines on AF-05'
    job.documents.impact = 'Clearance Cleared — Ops may accrue; Finance approves before invoice.'
  }
}

function unblockMoneyTasks(life: JobLifecycle) {
  for (const t of life.tasks) {
    if (t.status !== 'blocked') continue
    if (t.id === 'task-4096-accrue') {
      t.status = 'open'
      continue
    }
    if (t.milestoneId === 'charges' && t.id.includes('accrue')) {
      t.status = 'open'
    }
  }
}

function applyMoneyBlockToCharges(shipmentId: number, charges: ChargesPayload) {
  const job = getJob(shipmentId)
  const life = getLife(shipmentId)
  const jobBlock = moneyBlockFromJob(job)
  const lifeBlock = life ? moneyBlockedByGates(life) : { blocked: false }

  const blocked = jobBlock.blocked || lifeBlock.blocked
  const message =
    jobBlock.blocked && jobBlock.message
      ? jobBlock.message
      : lifeBlock.message ?? jobBlock.message

  if (blocked) {
    charges.blocked = true
    charges.blockMessage = message ?? 'Money locked'
    charges.blockReason =
      jobBlock.holdType !== 'none'
        ? jobBlock.holdType
        : lifeBlock.holdType && lifeBlock.holdType !== 'margin'
          ? lifeBlock.holdType
          : charges.blockReason
    charges.allowedActions = []
    if (clearanceBlocksMoney(job?.clearance)) {
      charges.moneyState = 'blocked'
    }
  } else {
    charges.blocked = false
    charges.blockReason = 'none'
    charges.blockMessage = undefined
    if (charges.moneyState === 'blocked') {
      charges.moneyState = 'open_wip'
    }
    charges.allowedActions = allowedActionsForMoneyState(charges.moneyState, false)
  }
}

function syncInvoiceBlockers(invoice: InvoicePayload, shipmentId: number) {
  const job = getJob(shipmentId)
  const life = getLife(shipmentId)
  const charges = getCharges(shipmentId)

  let clearance = invoice.blockers.find((b) => b.id === 'clearance')
  if (!clearance) {
    clearance = { id: 'clearance', label: 'AU clearance', cleared: true }
    invoice.blockers.unshift(clearance)
  }
  clearance.cleared = !clearanceBlocksMoney(job?.clearance)
  clearance.label = clearance.cleared
    ? 'AU import clearance Cleared'
    : job?.clearance?.blockers?.[0]?.label ??
      'AU import clearance held — biosecurity pending'

  syncInvoiceFromCharges(invoice)

  const docsBlocker = invoice.blockers.find((b) => b.id === 'docs')
  if (life && docsBlocker) {
    const openDocs = life.gates.filter(
      (g) =>
        g.status === 'open' &&
        (g.milestoneId === 'documents' || g.holdType === 'docs' || g.holdType === 'customs'),
    )
    docsBlocker.cleared = openDocs.length === 0 && clearance.cleared
  }

  const open = invoice.blockers.some((b) => !b.cleared)
  if (invoice.state === 'draft' || invoice.state === 'ready') {
    invoice.state = open ? 'draft' : 'ready'
    invoice.paymentChip = open ? 'blocked' : 'unpaid'
  }

  if (charges && !charges.blocked && clearance.cleared) {
    const chargesBlocker = invoice.blockers.find((b) => b.id === 'charges')
    if (chargesBlocker && charges.moneyState === 'charges_approved') {
      chargesBlocker.cleared = true
      chargesBlocker.label = 'Charges approved by Finance'
    }
  }
}

function clearAuClearance(shipmentId: number) {
  const job = getJob(shipmentId)
  let life = getLife(shipmentId)
  if (!job || !life) return null

  // Idempotent: do not wipe Accrue/Approve progress on every hybrid job reload
  const alreadyCleared = job.clearance?.status === 'cleared'

  if (!alreadyCleared) {
    applyClearanceToJob(job, 'cleared')
    delete runtimeCharges[shipmentId]
    delete runtimeInvoice[shipmentId]
  }

  const gate = life.gates.find((g) => g.id === AU_CLEARANCE_GATE_ID)
  if (gate && gate.status === 'open') {
    life = clearGate(life, AU_CLEARANCE_GATE_ID)
  }

  for (const t of life.tasks) {
    if (t.id === 'task-4096-clear-clearance') t.status = 'done'
  }
  if (!alreadyCleared) {
    unblockMoneyTasks(life)
  }
  // Hugh spine: documents milestone complete → charges is current
  if (life.currentMilestoneId === 'documents') {
    life.currentMilestoneId = 'charges'
  }
  runtimeLife[shipmentId] = life

  return job
}

function getLife(shipmentId: number): JobLifecycle | null {
  if (!runtimeLife[shipmentId]) {
    const cloned = cloneLifecycle(shipmentId)
    if (!cloned) return null
    runtimeLife[shipmentId] = cloned
  }
  return runtimeLife[shipmentId]
}

function getCharges(shipmentId: number): ChargesPayload | null {
  if (!runtimeCharges[shipmentId]) {
    const cloned = cloneCharges(shipmentId)
    if (!cloned) return null
    runtimeCharges[shipmentId] = cloned
  }
  const charges = runtimeCharges[shipmentId]
  applyMoneyBlockToCharges(shipmentId, charges)
  return charges
}

function getInvoice(shipmentId: number): InvoicePayload | null {
  if (!runtimeInvoice[shipmentId]) {
    const cloned = cloneInvoice(shipmentId)
    if (!cloned) return null
    runtimeInvoice[shipmentId] = cloned
  }
  return runtimeInvoice[shipmentId]
}

function syncInvoiceFromCharges(invoice: InvoicePayload) {
  const charges = getCharges(invoice.shipmentId)
  if (!charges) return
  const chargesBlocker = invoice.blockers.find((b) => b.id === 'charges')
  if (!chargesBlocker) return
  const approved = [
    'charges_approved',
    'part_invoiced',
    'invoiced',
    'actuals_posted',
    'verified',
    'closed',
  ].includes(charges.moneyState)
  chargesBlocker.cleared = approved
  chargesBlocker.label = approved
    ? 'Charges approved by Finance'
    : 'Charges not approved by Finance'
}

function buildDeskPayload(): MyTasksPayload {
  const tasks = enrichDeskTasksForClearance(
    allLifecycleShipments().flatMap((id) => {
      const life = getLife(id)
      return life ? projectDeskTasks(life) : []
    }),
  )
  const workboard = allLifecycleShipments().map((id) => {
    const life = getLife(id)!
    return {
      id: `wb-${id}`,
      shipmentId: id,
      label: life.jobNo,
      route: life.lane,
      status: life.currentMilestoneId,
    }
  })
  const exceptions = tasks.filter((t) => t.nodeType === 'gate' || t.priority === 'critical')
    .length
  return {
    tasks,
    workboard,
    summary: {
      exceptions,
      activeJobs: workboard.length,
      priorityCounts: {
        critical: tasks.filter((t) => t.priority === 'critical').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
      },
    },
  }
}

export const handlers = [
  http.get('/api/my-tasks', () => HttpResponse.json(buildDeskPayload())),

  http.get('/api/jobs/:shipmentId', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const job = getJob(shipmentId)
    const life = getLife(shipmentId)
    if (!job && !life) {
      return HttpResponse.json({ message: 'Job not found' }, { status: 404 })
    }
    if (job && life) {
      const enriched = structuredClone(job)
      // Do not paint invoice/charges "next step" gates as ops.holdType locks —
      // those gates are work remaining, not tab locks after clearance Cleared.
      const blocking = life.gates.find(
        (g) =>
          g.status === 'open' &&
          g.id !== AU_CLEARANCE_GATE_ID &&
          (g.holdType === 'docs' || g.holdType === 'customs') &&
          g.milestoneId === 'documents',
      )
      if (
        blocking &&
        !clearanceBlocksMoney(enriched.clearance) &&
        (blocking.holdType === 'docs' || blocking.holdType === 'customs')
      ) {
        enriched.ops.holdType = blocking.holdType
      } else if (
        enriched.ops.moneyState === 'charges_approved' ||
        enriched.ops.moneyState === 'invoiced' ||
        enriched.ops.moneyState === 'provisioned' ||
        !clearanceBlocksMoney(enriched.clearance)
      ) {
        delete enriched.ops.holdType
      }
      const openTask = life.tasks.find((t) => t.status === 'open')
      enriched.nextAction = openTask?.title ?? enriched.nextAction
      return HttpResponse.json(enriched)
    }
    if (job) return HttpResponse.json(job)
    return HttpResponse.json({ message: 'Job not found' }, { status: 404 })
  }),

  /** Hybrid Echo→MSW money sync after stamp (or when Echo gate already passed). */
  http.post('/api/jobs/:shipmentId/clearance/clear', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const job = clearAuClearance(shipmentId)
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(job)
  }),

  http.get('/api/jobs/:shipmentId/gates/:gateId', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const gateId = String(params.gateId)
    const detail = getGateChecklistDetail(shipmentId, gateId)
    if (!detail) return HttpResponse.json({ message: 'Gate not found' }, { status: 404 })
    return HttpResponse.json(detail)
  }),

  http.post('/api/jobs/:shipmentId/gates/:gateId/fulfil', async ({ params, request }) => {
    const shipmentId = Number(params.shipmentId)
    const gateId = String(params.gateId)
    const body = (await request.json()) as { itemCode?: string }
    const detail = getGateChecklistDetail(shipmentId, gateId)
    if (!detail) return HttpResponse.json({ message: 'Gate not found' }, { status: 404 })
    if (detail.status !== 'open') {
      return HttpResponse.json({ message: 'Gate already cleared' }, { status: 409 })
    }

    const item = detail.items.find((i) => i.itemCode === body.itemCode)
    if (!item) return HttpResponse.json({ message: 'Unknown checklist item' }, { status: 404 })
    if (item.fulfilRole !== 'operations') {
      return HttpResponse.json({ message: 'Item cannot be fulfilled by Ops' }, { status: 409 })
    }
    if (item.met) return HttpResponse.json(detail)

    item.met = true
    item.metBy = 'Sarah Jenkins'
    item.metAt = new Date().toISOString().slice(0, 10)
    refreshGateChecklistCanStamp(shipmentId, gateId)
    return HttpResponse.json(detail)
  }),

  http.post('/api/jobs/:shipmentId/gates/:gateId/stamp', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const gateId = String(params.gateId)
    if (gateId !== AU_CLEARANCE_GATE_ID) {
      return HttpResponse.json({ message: 'Stamp not supported for this gate' }, { status: 409 })
    }
    const detail = getGateChecklistDetail(shipmentId, gateId)
    if (!detail) return HttpResponse.json({ message: 'Gate not found' }, { status: 404 })
    if (!detail.canStamp) {
      return HttpResponse.json(
        { message: 'Cannot stamp — Ops checklist incomplete or gate already cleared' },
        { status: 409 },
      )
    }

    const job = clearAuClearance(shipmentId)
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

    detail.status = 'cleared'
    detail.canStamp = false
    for (const item of detail.items) {
      item.met = true
    }

    const life = getLife(shipmentId)!
    return HttpResponse.json({
      gate: detail,
      job,
      lifecycle: life,
      milestones: milestoneViews(life),
    })
  }),

  http.get('/api/jobs/:shipmentId/lifecycle', ({ params, request }) => {
    const shipmentId = Number(params.shipmentId)
    const life = getLife(shipmentId)
    if (!life) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const url = new URL(request.url)
    const role = (url.searchParams.get('role') || 'operations') as Role
    return HttpResponse.json({
      lifecycle: life,
      milestones: milestoneViews(life),
      allowedActions: computeAllowedActions(life, role),
      moneyBlock: moneyBlockedByGates(life),
    })
  }),

  http.post('/api/jobs/:shipmentId/gates/:gateId/clear', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const gateId = String(params.gateId)
    const life = getLife(shipmentId)
    if (!life) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

    if (gateId === AU_CLEARANCE_GATE_ID) {
      return HttpResponse.json(
        {
          message:
            'AU clearance gate requires checklist fulfil + Finance A stamp — use /gates/:id/stamp',
        },
        { status: 409 },
      )
    } else {
      runtimeLife[shipmentId] = clearGate(life, gateId)
      const next = runtimeLife[shipmentId]
      for (const t of next.tasks) {
        if (t.status === 'blocked' && t.milestoneId === 'charges') {
          const block = moneyBlockedByGates(next)
          const job = getJob(shipmentId)
          if (!block.blocked && !clearanceBlocksMoney(job?.clearance)) t.status = 'open'
        }
        if (t.status === 'blocked' && t.milestoneId === 'invoice') {
          const docsOpen = next.gates.some(
            (g) => g.milestoneId === 'documents' && g.status === 'open',
          )
          if (!docsOpen) t.status = 'open'
        }
      }
    }

    return HttpResponse.json({
      lifecycle: runtimeLife[shipmentId],
      milestones: milestoneViews(runtimeLife[shipmentId]!),
    })
  }),

  http.post('/api/jobs/:shipmentId/tasks/:taskId/complete', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const taskId = String(params.taskId)
    const life = getLife(shipmentId)
    if (!life) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

    if (taskId === 'task-4096-clear-clearance') {
      return HttpResponse.json(
        {
          message:
            'Complete clearance checklist on job workspace — Finance A stamp required.',
        },
        { status: 409 },
      )
    }

    let next = completeTask(life, taskId)
    const t = next.tasks.find((x) => x.id === taskId)
    // Completing file-customs style task also clears its gate in mock (Ops R done → ready for A clear)
    if (t?.gateId && t.primaryCta.toLowerCase().includes('file')) {
      // leave gate open for A stamp — mark task done only
    }
    if (t?.gateId && (t.approveCta?.toLowerCase().includes('stamp') || t.approveCta?.toLowerCase().includes('clear'))) {
      next = clearGate(next, t.gateId)
    }
    runtimeLife[shipmentId] = next
    return HttpResponse.json({
      lifecycle: runtimeLife[shipmentId],
      milestones: milestoneViews(runtimeLife[shipmentId]),
    })
  }),

  http.get('/api/jobs/:shipmentId/charges', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const charges = getCharges(shipmentId)
    if (!charges) return HttpResponse.json({ message: 'Charges not found' }, { status: 404 })
    applyCafToLines(charges)
    return HttpResponse.json(charges)
  }),

  http.post('/api/jobs/:shipmentId/charges/accrue', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const charges = getCharges(shipmentId)
    if (!charges) return HttpResponse.json({ message: 'Charges not found' }, { status: 404 })
    if (charges.blocked) {
      return HttpResponse.json({ message: charges.blockMessage ?? 'Blocked' }, { status: 409 })
    }
    for (const line of charges.lines) {
      if (line.state === 'draft' || line.state === 'rated' || line.state === 'safeguard') {
        line.state = 'accrued'
      }
    }
    charges.moneyState = 'provisioned'
    charges.allowedActions = allowedActionsForMoneyState('provisioned', false)
    applyCafToLines(charges)

    // Hugh spine: Accrue completes the Ops task and opens Finance approve
    let life = getLife(shipmentId)
    if (life) {
      for (const t of life.tasks) {
        if (t.id === 'task-4096-accrue') t.status = 'done'
        if (t.id === 'task-4096-approve-charges' && t.status === 'blocked') {
          t.status = 'open'
        }
      }
      life.currentMilestoneId = 'charges'
      runtimeLife[shipmentId] = life
    }
    const job = getJob(shipmentId)
    if (job) {
      job.ops.moneyState = 'provisioned'
      job.ops.moneyAtRisk = 'AUD provisioned — Finance approve next'
      job.nextAction = 'Approve charges (Finance A)'
      job.documents.impact =
        'Charges accrued — Finance A must approve before Invoice unlocks.'
      job.summary.status = 'Charges provisioned'
    }

    return HttpResponse.json(charges)
  }),

  http.post('/api/jobs/:shipmentId/charges/approve', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const charges = getCharges(shipmentId)
    if (!charges) return HttpResponse.json({ message: 'Charges not found' }, { status: 404 })
    if (charges.blocked) {
      return HttpResponse.json({ message: charges.blockMessage ?? 'Blocked' }, { status: 409 })
    }
    for (const line of charges.lines) {
      if (line.state === 'accrued') line.state = 'approved'
    }
    charges.moneyState = 'charges_approved'
    charges.allowedActions = allowedActionsForMoneyState('charges_approved', false)
    applyCafToLines(charges)

    let life = getLife(shipmentId)
    if (life) {
      for (const t of life.tasks) {
        if (t.id === 'task-4096-approve-charges') t.status = 'done'
        if (t.id === 'task-4096-issue' && t.status === 'blocked') {
          t.status = 'open'
        }
      }
      life = clearGate(life, 'gate-charges-4096')
      life.currentMilestoneId = 'invoice'
      runtimeLife[shipmentId] = life
    }
    const job = getJob(shipmentId)
    if (job) {
      job.ops.moneyState = 'charges_approved'
      job.ops.moneyAtRisk = 'Ready to invoice'
      job.nextAction = 'Issue customer invoice'
      job.documents.impact = 'Charges approved — open Invoice to issue.'
      job.summary.status = 'Charges approved'
      delete job.ops.holdType
    }
    const inv = getInvoice(shipmentId)
    if (inv) syncInvoiceFromCharges(inv)
    return HttpResponse.json(charges)
  }),

  http.get('/api/jobs/:shipmentId/invoice', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const invoice = getInvoice(shipmentId)
    if (!invoice) return HttpResponse.json({ message: 'Invoice not found' }, { status: 404 })
    syncInvoiceBlockers(invoice, shipmentId)
    return HttpResponse.json(invoice)
  }),

  http.post('/api/jobs/:shipmentId/invoice/issue', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const invoice = getInvoice(shipmentId)
    if (!invoice) return HttpResponse.json({ message: 'Invoice not found' }, { status: 404 })
    syncInvoiceBlockers(invoice, shipmentId)
    const open = invoice.blockers.filter((b) => !b.cleared)
    if (open.length > 0) {
      return HttpResponse.json(
        { message: `Cannot issue — ${open.map((b) => b.label).join('; ')}` },
        { status: 409 },
      )
    }
    if (invoice.state !== 'draft' && invoice.state !== 'ready') {
      return HttpResponse.json({ message: 'Invoice already issued' }, { status: 409 })
    }
    invoice.state = 'issued'
    invoice.invoiceNo = `INV-AU-${shipmentId}-01`
    invoice.issuedAt = new Date().toISOString().slice(0, 10)
    invoice.paymentChip = 'unpaid'

    let life = getLife(shipmentId)
    if (life) {
      for (const t of life.tasks) {
        if (t.id === 'task-4096-issue' || t.id.includes('issue')) {
          if (t.milestoneId === 'invoice') t.status = 'done'
        }
      }
      const g = life.gates.find((x) => x.id.startsWith('gate-invoice'))
      if (g && g.status === 'open') {
        life = clearGate(life, g.id)
      }
      life.currentMilestoneId = 'history'
      runtimeLife[shipmentId] = life
    }

    const job = getJob(shipmentId)
    if (job) {
      job.ops.moneyState = 'invoiced'
      job.ops.moneyAtRisk = 'Invoice issued — awaiting payment'
      job.nextAction = 'Record payment (optional)'
      job.documents.impact = 'Invoice issued — Module 1 money path complete.'
      job.summary.status = 'Invoice issued'
      delete job.ops.holdType
    }
    const charges = getCharges(shipmentId)
    if (charges) {
      charges.moneyState = 'invoiced'
      charges.allowedActions = allowedActionsForMoneyState('invoiced', false)
    }

    return HttpResponse.json(invoice)
  }),

  http.post('/api/jobs/:shipmentId/invoice/paid', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const invoice = getInvoice(shipmentId)
    if (!invoice) return HttpResponse.json({ message: 'Invoice not found' }, { status: 404 })
    if (invoice.state !== 'issued' && invoice.state !== 'part_paid') {
      return HttpResponse.json({ message: 'Invoice not issued' }, { status: 409 })
    }
    invoice.state = 'paid'
    invoice.paymentChip = 'paid'
    return HttpResponse.json(invoice)
  }),

  // ——— Numbering Policy (OS mock · localStorage “DB”) ———
  http.get('/api/os/numbering-policies', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') ?? undefined
    const officeId = url.searchParams.get('officeId') ?? undefined
    return HttpResponse.json({ items: numberingMockDb.listPolicies(type, officeId) })
  }),

  http.get('/api/os/numbering-policies/:id', ({ params }) => {
    const p = numberingMockDb.getPolicy(String(params.id))
    if (!p) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(p)
  }),

  http.put('/api/os/numbering-policies/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const p = numberingMockDb.updatePolicy(String(params.id), body as never)
    if (!p) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(p)
  }),

  http.post('/api/os/numbering/preview', async ({ request }) => {
    const body = (await request.json()) as {
      type: 'SHIPMENT' | 'HAWB' | 'REFERENCE'
      officeId?: string
      template?: string
      mode?: string
    }
    return HttpResponse.json(numberingMockDb.preview(body as never))
  }),

  http.post('/api/os/numbering/generate', async ({ request }) => {
    const body = (await request.json()) as {
      type: 'SHIPMENT' | 'HAWB' | 'REFERENCE'
      officeId: string
      entityType?: string
      entityId?: string
      createdBy?: string
    }
    const result = numberingMockDb.generate(body)
    if ('error' in result) {
      return HttpResponse.json({ message: result.error }, { status: result.status })
    }
    return HttpResponse.json(result)
  }),

  http.get('/api/os/numbering/audits', () => {
    return HttpResponse.json({ items: numberingMockDb.listAudits() })
  }),

  http.post('/api/os/numbering/reset-mock', () => {
    return HttpResponse.json(numberingMockDb.reset())
  }),

  // ——— MAWB pools (separate from template engine) ———
  http.get('/api/os/mawb/airlines', () => {
    return HttpResponse.json({ items: numberingMockDb.listAirlines() })
  }),

  http.get('/api/os/mawb/pools', () => {
    return HttpResponse.json({ items: numberingMockDb.listPools() })
  }),

  http.post('/api/os/mawb/allocate', async ({ request }) => {
    const body = (await request.json()) as {
      jobId: string
      jobNo: string
      airlineId?: string
    }
    const result = numberingMockDb.allocateMawb(body.jobId, body.jobNo, body.airlineId)
    if ('error' in result) {
      return HttpResponse.json({ message: result.error }, { status: result.status })
    }
    return HttpResponse.json(result)
  }),

  http.post('/api/os/mawb/validate', async ({ request }) => {
    const body = (await request.json()) as { mawb: string; airlineId?: string }
    const result = numberingMockDb.validateMawb(body.mawb, body.airlineId)
    if (!result.ok) {
      return HttpResponse.json({ valid: false, message: result.reason }, { status: 400 })
    }
    return HttpResponse.json({ valid: true, normalized: result.normalized })
  }),
]
