import type { AuImportStepId } from '@/types/auAirImport'
import type { Seat } from '@/stores/auth'
import type { HandoffNodeId } from '@/components/job/JobHandoffSpine.vue'

/** Ops (R) ladder — order mirrors Lifecycle Handoff spine. */
export const OPS_GATE_STEPS: AuImportStepId[] = [
  'commercial',
  'route',
  'customs_handoff',
  'awb_cargo',
  'money_preview',
  'parties_delivery',
]

/** Finance (R/A) ladder after Ops handoff — stamp / issue on Charges desk. */
export const FINANCE_GATE_STEPS: AuImportStepId[] = ['money_preview']

export type JobWorkPhase = 'ops' | 'finance' | 'done'

export interface GateMeta {
  stepId: AuImportStepId
  handoffId: HandoffNodeId
  title: string
  seat: Seat
  raci: 'R' | 'A'
  blurb: string
}

export const GATE_META: Record<AuImportStepId, GateMeta> = {
  commercial: {
    stepId: 'commercial',
    handoffId: 'booking',
    title: 'Booking facts',
    seat: 'operations',
    raci: 'R',
    blurb: 'Importer, contact, Incoterm, ABN — essentials only.',
  },
  route: {
    stepId: 'route',
    handoffId: 'flight',
    title: 'Flight departure',
    seat: 'operations',
    raci: 'R',
    blurb: 'Port of loading / discharge, airline, ETD / ETA.',
  },
  customs_handoff: {
    stepId: 'customs_handoff',
    handoffId: 'customs',
    title: 'Customs entry',
    seat: 'operations',
    raci: 'R',
    blurb: 'Broker ref, freight terms, DAFF — then hand off.',
  },
  awb_cargo: {
    stepId: 'awb_cargo',
    handoffId: 'arrival',
    title: 'Cargo arrival',
    seat: 'operations',
    raci: 'R',
    blurb: 'MAWB, HAWB, pieces, weight, goods description.',
  },
  money_preview: {
    stepId: 'money_preview',
    handoffId: 'billing',
    title: 'Charges & invoice',
    seat: 'operations',
    raci: 'R',
    blurb: 'Unified Ledger — Accrue / Approve; Finance stamps after handoff.',
  },
  parties_delivery: {
    stepId: 'parties_delivery',
    handoffId: 'delivery',
    title: 'Final delivery',
    seat: 'operations',
    raci: 'R',
    blurb: 'Shipper, consignee, delivery address.',
  },
}

export function opsStepIndex(step: AuImportStepId): number {
  return OPS_GATE_STEPS.indexOf(step)
}

export function nextOpsStep(step: AuImportStepId): AuImportStepId | null {
  const i = opsStepIndex(step)
  if (i < 0 || i >= OPS_GATE_STEPS.length - 1) return null
  return OPS_GATE_STEPS[i + 1]!
}

export function isOpsStep(step: AuImportStepId): boolean {
  return OPS_GATE_STEPS.includes(step)
}

export function isFinanceStep(step: AuImportStepId): boolean {
  return FINANCE_GATE_STEPS.includes(step)
}
