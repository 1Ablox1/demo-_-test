import type { AuImportStepId } from '@/types/auAirImport'
import type { Seat } from '@/stores/auth'
import type { HandoffNodeId } from '@/components/job/JobHandoffSpine.vue'

/** Ops (R) ladder — Next advances within this seat only. */
export const OPS_GATE_STEPS: AuImportStepId[] = [
  'commercial',
  'route',
  'awb_cargo',
  'parties_delivery',
  'customs_handoff',
]

/** Finance (R/A) ladder after Ops handoff. */
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
    title: 'Flight & ports',
    seat: 'operations',
    raci: 'R',
    blurb: 'Port of loading / discharge, airline, ETD / ETA.',
  },
  awb_cargo: {
    stepId: 'awb_cargo',
    handoffId: 'arrival',
    title: 'AWB & cargo',
    seat: 'operations',
    raci: 'R',
    blurb: 'MAWB, HAWB, pieces, weight, goods description.',
  },
  parties_delivery: {
    stepId: 'parties_delivery',
    handoffId: 'delivery',
    title: 'Parties & delivery',
    seat: 'operations',
    raci: 'R',
    blurb: 'Shipper, consignee, delivery address.',
  },
  customs_handoff: {
    stepId: 'customs_handoff',
    handoffId: 'customs',
    title: 'Customs entry',
    seat: 'operations',
    raci: 'R',
    blurb: 'Broker ref, freight terms, DAFF — then hand off.',
  },
  money_preview: {
    stepId: 'money_preview',
    handoffId: 'customs',
    title: 'Duty / GST & stamp',
    seat: 'finance',
    raci: 'A',
    blurb: 'Review valuation estimates and release money gates.',
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
