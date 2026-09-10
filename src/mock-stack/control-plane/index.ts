import { jobContextByShipment } from '@/mocks/fixtures/jobs'
import { allLifecycleShipments } from '@/mocks/fixtures/lifecycle'
import type { ActingRole, JobContext, MyTasksPayload } from '@/api/types'
import type { AllowedAction, JobLifecycle, MilestoneView } from '@/os/types'
import { cargowareAdapter } from '@/mock-stack/adapter/cargowareAdapter'
import { legacyBooking } from '@/mock-stack/legacy/booking'
import {
  getCharges,
  getInvoice,
  getLife,
  getNumberingOverlay,
  refreshChargesCaf,
  setLife,
  syncInvoiceFromCharges,
} from '@/mock-stack/runtime'
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

export interface GuidanceChip {
  id: string
  workerId: string
  title: string
  detail: string
  tone: 'info' | 'warn' | 'suggest'
  ctaLabel?: string
  href?: string
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
  const exceptions = tasks.filter((t) => t.nodeType === 'gate' || t.priority === 'critical').length
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

function enrichJobContext(shipmentId: number): JobContext | null {
  const job = jobContextByShipment[shipmentId]
  const life = getLife(shipmentId)
  if (!job && !life) return null
  if (job && life) {
    const open = life.gates.find((g) => g.status === 'open')
    const enriched = structuredClone(job)
    const nums = getNumberingOverlay(shipmentId)
    const legacy = legacyBooking.getAirExportJob(shipmentId)
    if (nums || legacy) {
      enriched.ops.hawb = legacy?.hawb ?? nums?.hawb ?? enriched.ops.hawb
      if (enriched.summary && nums) {
        enriched.summary.status = enriched.summary.status.replace('Draft quote', 'Quote assigned')
      }
    }
    if (open && open.holdType !== 'none') {
      enriched.ops.holdType = open.holdType === 'margin' ? 'invoice' : open.holdType
    }
    enriched.nextAction =
      life.tasks.find((t) => t.status === 'open')?.title ?? enriched.nextAction
    return enriched
  }
  return job ? structuredClone(job) : null
}

export const controlPlane = {
  health() {
    return {
      status: 'ok',
      layer: 'os-control-plane-mock',
      adapter: 'cargoware-acl-mock',
      legacy: 'in-process fixtures',
    }
  },

  getDesk() {
    return buildDeskPayload()
  },

  getJobContext(shipmentId: number) {
    const ctx = enrichJobContext(shipmentId)
    if (!ctx) return { error: 'Job not found', status: 404 as const }
    return ctx
  },

  getLifecycle(shipmentId: number, role: ActingRole) {
    const life = getLife(shipmentId)
    if (!life) return { error: 'Not found', status: 404 as const }
    return {
      lifecycle: life,
      milestones: milestoneViews(life),
      allowedActions: computeAllowedActions(life, role),
      moneyBlock: moneyBlockedByGates(life),
    }
  },

  clearGate(shipmentId: number, gateId: string) {
    const life = getLife(shipmentId)
    if (!life) return { error: 'Not found', status: 404 as const }
    setLife(shipmentId, clearGate(life, gateId))
    const next = getLife(shipmentId)!
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
    return {
      lifecycle: getLife(shipmentId)!,
      milestones: milestoneViews(getLife(shipmentId)!),
    }
  },

  completeTask(shipmentId: number, taskId: string) {
    const life = getLife(shipmentId)
    if (!life) return { error: 'Not found', status: 404 as const }
    let next = completeTask(life, taskId)
    const t = next.tasks.find((x) => x.id === taskId)
    if (
      t?.gateId &&
      (t.approveCta?.toLowerCase().includes('stamp') ||
        t.approveCta?.toLowerCase().includes('clear'))
    ) {
      next = clearGate(next, t.gateId)
    }
    setLife(shipmentId, next)
    return {
      lifecycle: getLife(shipmentId)!,
      milestones: milestoneViews(getLife(shipmentId)!),
    }
  },

  getCharges(shipmentId: number) {
    const charges = getCharges(shipmentId)
    if (!charges) return { error: 'Charges not found', status: 404 as const }
    refreshChargesCaf(shipmentId)
    return charges
  },

  accrueCharges(shipmentId: number) {
    const charges = getCharges(shipmentId)
    if (!charges) return { error: 'Charges not found', status: 404 as const }
    if (charges.blocked) {
      return { error: charges.blockMessage ?? 'Blocked', status: 409 as const }
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
    return charges
  },

  approveCharges(shipmentId: number) {
    const charges = getCharges(shipmentId)
    if (!charges) return { error: 'Charges not found', status: 404 as const }
    if (charges.blocked) {
      return { error: charges.blockMessage ?? 'Blocked', status: 409 as const }
    }
    for (const line of charges.lines) {
      if (line.state === 'accrued') line.state = 'approved'
    }
    charges.moneyState = 'charges_approved'
    charges.allowedActions = ['open_invoice']
    applyCafToLines(charges)
    const life = getLife(shipmentId)
    if (life) {
      const chargeGate =
        life.gates.find((x) => x.id === 'gate-charges-4096' || x.id === 'gate-charges-approve') ??
        life.gates.find((x) => x.milestoneId === 'charges' && x.status === 'open')
      if (chargeGate) setLife(shipmentId, clearGate(life, chargeGate.id))
    }
    const inv = getInvoice(shipmentId)
    if (inv) syncInvoiceFromCharges(inv)
    return charges
  },

  getInvoice(shipmentId: number) {
    const invoice = getInvoice(shipmentId)
    if (!invoice) return { error: 'Invoice not found', status: 404 as const }
    syncInvoiceFromCharges(invoice)
    return invoice
  },

  issueInvoice(shipmentId: number) {
    const invoice = getInvoice(shipmentId)
    if (!invoice) return { error: 'Invoice not found', status: 404 as const }
    syncInvoiceFromCharges(invoice)
    const open = invoice.blockers.filter((b) => !b.cleared)
    if (open.length > 0) {
      return {
        error: `Cannot issue — ${open.map((b) => b.label).join('; ')}`,
        status: 409 as const,
      }
    }
    if (invoice.state !== 'draft' && invoice.state !== 'ready') {
      return { error: 'Invoice already issued', status: 409 as const }
    }
    invoice.state = 'issued'
    invoice.invoiceNo = `INV-AU-${shipmentId}-01`
    invoice.issuedAt = new Date().toISOString().slice(0, 10)
    invoice.paymentChip = 'unpaid'
    const life = getLife(shipmentId)
    if (life) {
      const g = life.gates.find((x) => x.id.startsWith('gate-invoice'))
      if (g) setLife(shipmentId, clearGate(life, g.id))
    }
    return invoice
  },

  markInvoicePaid(shipmentId: number) {
    const invoice = getInvoice(shipmentId)
    if (!invoice) return { error: 'Invoice not found', status: 404 as const }
    if (invoice.state !== 'issued' && invoice.state !== 'part_paid') {
      return { error: 'Invoice not issued', status: 409 as const }
    }
    invoice.state = 'paid'
    invoice.paymentChip = 'paid'
    return invoice
  },

  /** Day 8 — suggest-only digital worker chips (never Finance A). */
  getGuidance(
    shipmentId: number,
    role: ActingRole,
    workers: {
      quoteAssist?: boolean
      marginGuard?: boolean
      chargeDraft?: boolean
      gateWatch?: boolean
    },
  ): GuidanceChip[] {
    const life = getLife(shipmentId)
    if (!life) return []
    const chips: GuidanceChip[] = []
    const openGate = life.gates.find((g) => g.status === 'open')
    const charges = getCharges(shipmentId)

    if (workers.quoteAssist && life.currentMilestoneId === 'quote') {
      chips.push({
        id: 'dw-quote-assist',
        workerId: 'dw-quote-assist',
        title: 'Quote assist',
        detail: 'Lane PVG→LAX — check chargeable weight vs 167 kg/m³ before confirming rate.',
        tone: 'suggest',
        ctaLabel: 'Review weight',
      })
    }
    if (workers.marginGuard && charges) {
      const sell = charges.gp.sellTotal
      const marginPct = sell > 0 ? (charges.gp.provisionalGp / sell) * 100 : null
      if (marginPct != null && marginPct < 12) {
        chips.push({
          id: 'dw-margin-guard',
          workerId: 'dw-margin-guard',
          title: 'Margin guard',
          detail: `Provisional margin ${marginPct.toFixed(1)}% is below 12% gate — Finance review suggested.`,
          tone: 'warn',
        })
      }
    }
    if (workers.chargeDraft && role === 'operations' && life.currentMilestoneId === 'charges') {
      chips.push({
        id: 'dw-charge-draft',
        workerId: 'dw-charge-draft',
        title: 'Charge draft',
        detail: '3 AP lines still Draft — accrue before ETD cutoff.',
        tone: 'info',
        ctaLabel: 'Open Charges & Invoice',
        href: `/shipments/${shipmentId}?step=money_preview`,
      })
    }
    if (workers.gateWatch && openGate) {
      chips.push({
        id: 'dw-gate-watch',
        workerId: 'dw-gate-watch',
        title: 'Gate watch',
        detail: openGate.title,
        tone: openGate.holdType === 'margin' ? 'warn' : 'info',
      })
    }
    return chips
  },

  // Numbering — adapter for assign; direct read for admin policies
  numbering: numberingMockDb,
  adapter: cargowareAdapter,
}

export type ControlPlaneLifecycle = {
  lifecycle: JobLifecycle
  milestones: MilestoneView[]
  allowedActions: AllowedAction[]
  moneyBlock: { blocked: boolean; message?: string }
}
