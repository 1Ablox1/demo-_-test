/**
 * Australian AU Air Import lifecycle rules for Lifecycle Handoff spine.
 * Aligns CargoWise-style credit control, ABF/ICS holds, and ATO GST.
 */

import type { HandoffNodeId } from '@/components/job/JobHandoffSpine.vue'
import type { AuImportFields, AuBiosecurityRisk } from '@/types/auAirImport'
import type { ShipmentRecord } from '@/stores/freight'

export type AuCreditTerms = 'cod' | 'account' | ''

export type AuIcsHoldKind = 'none' | 'ics_hold' | 'sac_block' | 'physical_inspection' | 'daff'

export interface AuCustomsHoldResult {
  held: boolean
  /** Short badge text when held */
  badge: string
  /** SLA / popover detail */
  detail: string
  kinds: AuIcsHoldKind[]
}

export interface AuCreditGateResult {
  /** COD / non-credit — must pay duty/GST proforma before D/O */
  requiresPrepay: boolean
  creditTerms: AuCreditTerms
  /** True when COD and duty/GST not marked prepaid */
  blocked: boolean
  message: string
}

export interface AuGstLineClassification {
  code: string
  name: string
  /** ATO treatment */
  gst: 'gst_free' | 'gst_10' | 'non_taxable' | 'import_gst'
  ratePct: number
  hint: string
}

/** Spine click → primary field focus (AU operate desk). */
export const AU_SPINE_FOCUS_FIELD: Record<HandoffNodeId, string> = {
  booking: 'customerId',
  flight: 'etd',
  customs: 'brokerRef',
  arrival: 'hawb',
  delivery: 'deliveryAddress',
  billing: 'customsValueAud',
}

/** Accountable lead shown in hover popover (A). */
export const AU_SPINE_ACCOUNTABLE: Record<HandoffNodeId, string> = {
  booking: 'A · Mei Chen (Sales)',
  flight: 'A · Alex Rivera (Export Air Ops)',
  customs: 'A · Claire Nguyen (Finance) · ABF/ICS stamp',
  arrival: 'A · Priya Nair (Import Air Ops)',
  delivery: 'A · Hana Park (Terminal Ops) · Cartage / POD',
  billing: 'A · Rita Gomez (Billing) · ATO GST invoice',
}

export function detectAuCustomsHold(
  shipment?: ShipmentRecord | null,
  au?: Partial<AuImportFields> | null,
  houses?: ShipmentRecord[],
): AuCustomsHoldResult {
  const kinds: AuIcsHoldKind[] = []
  const rows = houses?.length ? houses : shipment ? [shipment] : []

  for (const h of rows) {
    const bio = (h.auImport?.biosecurityRisk ?? au?.biosecurityRisk ?? '') as AuBiosecurityRisk
    const gate = h.extras?.clearanceGate
    const ics = h.extras?.icsHold || h.extras?.sacBlock || h.extras?.abfHold

    if (bio === 'daff_review' || bio === 'permit_required') kinds.push('daff')
    if (gate === 'held' || ics === 'ics_hold' || ics === 'true' || ics === '1') kinds.push('ics_hold')
    if (ics === 'sac_block' || h.extras?.sacBlock === 'true') kinds.push('sac_block')
    if (ics === 'physical_inspection' || h.extras?.physicalInspection === 'true') {
      kinds.push('physical_inspection')
    }
  }

  if (au?.biosecurityRisk === 'daff_review' || au?.biosecurityRisk === 'permit_required') {
    if (!kinds.includes('daff')) kinds.push('daff')
  }

  const unique = [...new Set(kinds.filter((k) => k !== 'none'))]
  if (!unique.length) {
    return { held: false, badge: 'Active', detail: 'Clearance open · N10 ready', kinds: [] }
  }

  const hasDaff = unique.includes('daff')
  const hasIcs =
    unique.includes('ics_hold') ||
    unique.includes('sac_block') ||
    unique.includes('physical_inspection')

  const badge =
    hasDaff && hasIcs
      ? 'HELD: DAFF/ICS'
      : hasDaff
        ? 'HELD: DAFF'
        : unique.includes('sac_block')
          ? 'HELD: SAC'
          : unique.includes('physical_inspection')
            ? 'HELD: Inspect'
            : 'HELD: ICS'

  return {
    held: true,
    badge,
    detail: `${badge} — D/O auto-generation blocked until release`,
    kinds: unique,
  }
}

/** Parse credit terms from AU fields or shipment extras. */
export function resolveCreditTerms(
  au?: Partial<AuImportFields> | null,
  shipment?: ShipmentRecord | null,
): AuCreditTerms {
  const raw =
    (au as { creditTerms?: string } | null | undefined)?.creditTerms ||
    shipment?.extras?.creditTerms ||
    ''
  if (raw === 'cod' || raw === 'COD' || raw === 'non_credit') return 'cod'
  if (raw === 'account' || raw === 'credit' || raw === 'on_account') return 'account'
  // Demo default: pharma on account, others COD if unknown
  if (au?.customerId === 'cust-pharma') return 'account'
  if (shipment?.customer?.toLowerCase().includes('pharma')) return 'account'
  if (au?.customerId || shipment?.customer) return 'cod'
  return ''
}

export function evaluateCreditGate(
  au?: Partial<AuImportFields> | null,
  shipment?: ShipmentRecord | null,
): AuCreditGateResult {
  const creditTerms = resolveCreditTerms(au, shipment)
  const prepaid =
    shipment?.extras?.dutyGstPrepaid === 'true' ||
    shipment?.extras?.proformaPaid === 'true' ||
    (au as { dutyGstPrepaid?: boolean } | null | undefined)?.dutyGstPrepaid === true

  if (creditTerms === 'account') {
    return {
      requiresPrepay: false,
      creditTerms,
      blocked: false,
      message: 'On Account — credit gate passed · D/O allowed · final AR open until post-delivery',
    }
  }

  if (creditTerms === 'cod') {
    return {
      requiresPrepay: true,
      creditTerms,
      blocked: !prepaid,
      message: prepaid
        ? 'COD — Duty/GST proforma paid · D/O unlocked'
        : 'COD — require Duty/GST Pre-Alert / Proforma before Delivery Order (D/O)',
    }
  }

  return {
    requiresPrepay: false,
    creditTerms: '',
    blocked: false,
    message: 'Set customer credit terms (COD vs On Account)',
  }
}

/** Final invoice locked until POD returned (cartage adjustments). */
export function isFinalInvoiceLockedForPod(
  shipment?: ShipmentRecord | null,
  au?: Partial<AuImportFields> | { podReceived?: boolean } | null,
): boolean {
  if ((au as { podReceived?: boolean } | null | undefined)?.podReceived) return false
  if (!shipment) return true
  if (shipment.extras?.podReceived === 'true') return false
  if ((shipment as { podReceived?: boolean }).podReceived) return false
  return true
}

export function parseAud(s: string | number | undefined | null): number {
  if (typeof s === 'number') return s
  if (!s) return 0
  const m = String(s).replace(/[^\d.]/g, '')
  return m ? Number(m) : 0
}

/**
 * ABF N10-style duty & import GST on Taxable Importation Value.
 * TIV = Customs Value + Duty + Transport & Insurance
 * Import GST = 10% × TIV
 */
export function calculateAbfN10Liabilities(input: {
  customsValue: number
  dutyRatePct?: number
  overseasFreight: number
  insurance: number
}): {
  customsValue: number
  duty: number
  transportInsurance: number
  taxableImportationValue: number
  importGst: number
  dutyLabel: string
  gstLabel: string
  tivLabel: string
} {
  const customsValue = Math.max(0, input.customsValue)
  const dutyRate = input.dutyRatePct ?? 5
  const duty = Math.round(customsValue * (dutyRate / 100))
  const transportInsurance = Math.max(0, input.overseasFreight) + Math.max(0, input.insurance)
  const taxableImportationValue = customsValue + duty + transportInsurance
  const importGst = Math.round(taxableImportationValue * 0.1)
  const fmt = (n: number) =>
    `AUD ${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return {
    customsValue,
    duty,
    transportInsurance,
    taxableImportationValue,
    importGst,
    dutyLabel: fmt(duty),
    gstLabel: fmt(importGst),
    tivLabel: fmt(taxableImportationValue),
  }
}

/** ATO GST classification for charge codes (AU forwarder invoice). */
export function classifyAuChargeGst(code: string): AuGstLineClassification {
  const c = code.trim().toUpperCase()
  if (['AFRT', 'FREIGHT', 'OCEAN', 'OFRT', 'AIR'].includes(c)) {
    return {
      code: c,
      name: 'Main carriage freight',
      gst: 'gst_free',
      ratePct: 0,
      hint: 'GST-free (inbound/outbound international freight)',
    }
  }
  if (['DUTY', 'DUT'].includes(c)) {
    return {
      code: c,
      name: 'Import duty',
      gst: 'non_taxable',
      ratePct: 0,
      hint: 'Non-taxable disbursement (not subject to GST)',
    }
  }
  if (['IGST', 'IMPGST', 'GSTIMP'].includes(c)) {
    return {
      code: c,
      name: 'Import GST',
      gst: 'import_gst',
      ratePct: 10,
      hint: '10% on Taxable Importation Value (CV + Duty + T&I)',
    }
  }
  if (['PICK', 'DELV', 'CART', 'THC', 'STOR', 'HAND', 'DOC', 'CCF', 'DCH', 'AMS'].includes(c)) {
    return {
      code: c,
      name: 'Local / clearance service',
      gst: 'gst_10',
      ratePct: 10,
      hint: 'Taxable supply — GST 10% (cartage, THC, storage, clearance)',
    }
  }
  return {
    code: c || 'MISC',
    name: 'Other charge',
    gst: 'gst_10',
    ratePct: 10,
    hint: 'Default taxable · confirm ATO treatment',
  }
}

export function auSpineFocusField(id: HandoffNodeId): string {
  return AU_SPINE_FOCUS_FIELD[id]
}
