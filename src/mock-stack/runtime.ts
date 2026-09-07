import { cloneCharges } from '@/mocks/fixtures/charges'
import { cloneInvoice } from '@/mocks/fixtures/invoice'
import { cloneLifecycle } from '@/mocks/fixtures/lifecycle'
import type { ChargesPayload, InvoicePayload } from '@/api/types'
import type { JobLifecycle } from '@/os/types'
import { applyCafToLines } from '@/lib/chargesMoney'
import { moneyBlockedByGates } from '@/os/engine'

/** Shared in-memory runtime — simulates control-plane + legacy SoR until Echo wires real services. */
const runtimeCharges: Record<number, ChargesPayload> = {}
const runtimeInvoice: Record<number, InvoicePayload> = {}
const runtimeLife: Record<number, JobLifecycle> = {}
const runtimeNumbering: Record<number, { jobNo: string; hawb: string | null }> = {}

export function getLife(shipmentId: number): JobLifecycle | null {
  if (!runtimeLife[shipmentId]) {
    const cloned = cloneLifecycle(shipmentId)
    if (!cloned) return null
    runtimeLife[shipmentId] = cloned
  }
  return runtimeLife[shipmentId]
}

export function setLife(shipmentId: number, life: JobLifecycle) {
  runtimeLife[shipmentId] = life
}

export function getNumberingOverlay(shipmentId: number) {
  return runtimeNumbering[shipmentId]
}

export function setNumberingOverlay(
  shipmentId: number,
  nums: { jobNo: string; hawb: string | null },
) {
  runtimeNumbering[shipmentId] = nums
  const life = getLife(shipmentId)
  if (life) {
    life.jobNo = nums.jobNo
    life.hawb = nums.hawb
  }
}

export function getCharges(shipmentId: number): ChargesPayload | null {
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

export function getInvoice(shipmentId: number): InvoicePayload | null {
  if (!runtimeInvoice[shipmentId]) {
    const cloned = cloneInvoice(shipmentId)
    if (!cloned) return null
    runtimeInvoice[shipmentId] = cloned
  }
  return runtimeInvoice[shipmentId]
}

export function syncInvoiceFromCharges(invoice: InvoicePayload) {
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

export function refreshChargesCaf(shipmentId: number) {
  const charges = getCharges(shipmentId)
  if (charges) applyCafToLines(charges)
}
