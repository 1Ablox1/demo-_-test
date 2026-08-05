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
import type { ChargesPayload, InvoicePayload, MyTasksPayload } from '@/api/types'
import { applyCafToLines } from '@/lib/chargesMoney'
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
  const life = getLife(shipmentId)
  if (life) {
    const block = moneyBlockedByGates(life)
    charges.blocked = block.blocked
    charges.blockMessage = block.message
    charges.blockReason =
      block.holdType === 'none' || !block.holdType || block.holdType === 'margin'
        ? charges.blockReason
        : block.holdType
  }
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
  const life = getLife(invoice.shipmentId)
  const docsBlocker = invoice.blockers.find((b) => b.id === 'docs')
  if (life && docsBlocker) {
    const openDocs = life.gates.filter(
      (g) =>
        g.status === 'open' &&
        (g.milestoneId === 'documents' || g.holdType === 'docs' || g.holdType === 'customs'),
    )
    docsBlocker.cleared = openDocs.length === 0
    docsBlocker.label =
      openDocs.length === 0 ? 'Docs / customs holds' : openDocs[0].title
  }
  const open = invoice.blockers.some((b) => !b.cleared)
  if (invoice.state === 'draft' || invoice.state === 'ready') {
    invoice.state = open ? 'draft' : 'ready'
    invoice.paymentChip = open ? 'blocked' : 'unpaid'
  }
}

function buildDeskPayload(): MyTasksPayload {
  const tasks = allLifecycleShipments().flatMap((id) => {
    const life = getLife(id)
    return life ? projectDeskTasks(life) : []
  })
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
    const job = jobContextByShipment[shipmentId]
    const life = getLife(shipmentId)
    if (!job && !life) {
      return HttpResponse.json({ message: 'Job not found' }, { status: 404 })
    }
    // Prefer static L2 enrichment; overlay hold from lifecycle
    if (job && life) {
      const open = life.gates.find((g) => g.status === 'open')
      const enriched = structuredClone(job)
      if (open && open.holdType !== 'none') {
        enriched.ops.holdType = open.holdType === 'margin' ? 'invoice' : open.holdType
      }
      enriched.nextAction =
        life.tasks.find((t) => t.status === 'open')?.title ?? enriched.nextAction
      return HttpResponse.json(enriched)
    }
    if (job) return HttpResponse.json(job)
    return HttpResponse.json({ message: 'Job not found' }, { status: 404 })
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
    runtimeLife[shipmentId] = clearGate(life, gateId)
    // Unblock charge tasks when docs clear
    const next = runtimeLife[shipmentId]
    for (const t of next.tasks) {
      if (t.status === 'blocked' && t.milestoneId === 'charges') {
        const block = moneyBlockedByGates(next)
        if (!block.blocked) t.status = 'open'
      }
      if (t.status === 'blocked' && t.milestoneId === 'invoice') {
        const docsOpen = next.gates.some(
          (g) => g.milestoneId === 'documents' && g.status === 'open',
        )
        if (!docsOpen) t.status = 'open'
      }
    }
    return HttpResponse.json({
      lifecycle: runtimeLife[shipmentId],
      milestones: milestoneViews(runtimeLife[shipmentId]),
    })
  }),

  http.post('/api/jobs/:shipmentId/tasks/:taskId/complete', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const taskId = String(params.taskId)
    const life = getLife(shipmentId)
    if (!life) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
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
    if (!charges.allowedActions.includes('approve')) {
      charges.allowedActions = ['approve', 'open_invoice']
    }
    applyCafToLines(charges)
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
    charges.allowedActions = ['open_invoice']
    applyCafToLines(charges)
    const life = getLife(shipmentId)
    if (life) {
      runtimeLife[shipmentId] = clearGate(life, 'gate-charges-approve')
    }
    const inv = getInvoice(shipmentId)
    if (inv) syncInvoiceFromCharges(inv)
    return HttpResponse.json(charges)
  }),

  http.get('/api/jobs/:shipmentId/invoice', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const invoice = getInvoice(shipmentId)
    if (!invoice) return HttpResponse.json({ message: 'Invoice not found' }, { status: 404 })
    syncInvoiceFromCharges(invoice)
    return HttpResponse.json(invoice)
  }),

  http.post('/api/jobs/:shipmentId/invoice/issue', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const invoice = getInvoice(shipmentId)
    if (!invoice) return HttpResponse.json({ message: 'Invoice not found' }, { status: 404 })
    syncInvoiceFromCharges(invoice)
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
    const life = getLife(shipmentId)
    if (life) {
      const g = life.gates.find((x) => x.id.startsWith('gate-invoice'))
      if (g) runtimeLife[shipmentId] = clearGate(life, g.id)
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
