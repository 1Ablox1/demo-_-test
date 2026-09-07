import type { InvoicePayload } from '@/api/types'
import { legacyJobNoForShipment } from './jobIdentities'

/**
 * AF-06 fixtures — one invoice surface (no domestic/international tabs).
 * 1024 blocked · 2048 ready to issue · 4096 issued / part paid
 */
export const invoiceByShipment: Record<number, InvoicePayload> = {
  1024: {
    shipmentId: 1024,
    jobNo: 'AF-1024',
    state: 'draft',
    customer: 'ABC Logistics Inc.',
    lane: 'PVG → LAX',
    homeCurrency: 'AUD',
    fxToAud: 1.53,
    settlementHint: 'Customer bill · USD lines settled in AUD at job FX',
    lines: [
      {
        id: 'inv-1024-1',
        code: 'AFRT',
        description: 'Air freight',
        amount: 4200,
        currency: 'USD',
        amountAud: 6426,
      },
      {
        id: 'inv-1024-2',
        code: 'FSC',
        description: 'Fuel surcharge',
        amount: 620,
        currency: 'USD',
        amountAud: 948.6,
      },
    ],
    subtotalAud: 7374.6,
    taxAud: 0,
    totalAud: 7374.6,
    blockers: [
      { id: 'docs', label: 'Docs hold — customs declaration missing', cleared: false },
      { id: 'charges', label: 'Charges not approved by Finance', cleared: false },
    ],
    paymentChip: 'blocked',
    invoiceNo: null,
    issuedAt: null,
    hawb: '180-58439211',
    mawb: '999-12345675',
  },

  2048: {
    shipmentId: 2048,
    jobNo: 'AF-2048',
    state: 'draft',
    customer: 'Pacific Trade Co.',
    lane: 'LAX → SYD',
    homeCurrency: 'AUD',
    fxToAud: 1.53,
    settlementHint: 'Customer bill · one invoice surface (AU GST mock 0 on this demo)',
    lines: [
      {
        id: 'inv-2048-1',
        code: 'AFRT',
        description: 'Air freight',
        amount: 5200,
        currency: 'USD',
        amountAud: 7956,
      },
      {
        id: 'inv-2048-2',
        code: 'THC',
        description: 'Terminal handling',
        amount: 920,
        currency: 'AUD',
        amountAud: 920,
      },
    ],
    subtotalAud: 8876,
    taxAud: 0,
    totalAud: 8876,
    blockers: [
      { id: 'docs', label: 'Docs / customs holds', cleared: true },
      { id: 'charges', label: 'Charges not approved by Finance', cleared: false },
      { id: 'awb', label: 'HAWB / MAWB on file', cleared: true },
    ],
    paymentChip: 'blocked',
    invoiceNo: null,
    issuedAt: null,
    hawb: '618-90221144',
    mawb: '180-77889900',
  },

  4096: {
    shipmentId: 4096,
    jobNo: 'AF-4096',
    state: 'draft',
    customer: 'Sydney Retail Group',
    lane: 'PVG → SYD',
    homeCurrency: 'AUD',
    fxToAud: 1.53,
    settlementHint: 'Customer bill · unlocks after AU clearance Cleared and Finance approve',
    lines: [
      {
        id: 'inv-4096-1',
        code: 'AFRT',
        description: 'Air freight',
        amount: 3800,
        currency: 'USD',
        amountAud: 5814,
      },
      {
        id: 'inv-4096-2',
        code: 'CFS',
        description: 'Origin CFS',
        amount: 450,
        currency: 'USD',
        amountAud: 688.5,
      },
    ],
    subtotalAud: 6502.5,
    taxAud: 0,
    totalAud: 6502.5,
    blockers: [
      {
        id: 'clearance',
        label: 'AU import clearance held — biosecurity pending',
        cleared: false,
      },
      { id: 'docs', label: 'Docs / customs holds', cleared: true },
      { id: 'charges', label: 'Charges not approved by Finance', cleared: false },
      { id: 'awb', label: 'HAWB / MAWB on file', cleared: true },
    ],
    paymentChip: 'blocked',
    invoiceNo: null,
    issuedAt: null,
    hawb: '160-44112233',
    mawb: '999-55443322',
  },
}

export function cloneInvoice(shipmentId: number): InvoicePayload | null {
  const seed = invoiceByShipment[shipmentId]
  if (!seed) return null
  const clone = structuredClone(seed)
  const legacyNo = legacyJobNoForShipment(shipmentId)
  if (legacyNo) clone.jobNo = legacyNo
  return clone
}
