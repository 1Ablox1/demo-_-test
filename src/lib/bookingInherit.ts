import { quoteById } from '@/data/bookingQuotes'
import {
  emptyBookingDraft,
  type BookingChargeLine,
  type BookingDraft,
  type BookingEntryPath,
  type BookingFileStructure,
  type BookingInheritFlash,
} from '@/types/bookingWizard'
import type { SpineLobPrefix } from '@/types/spineLob'

let chargeSeq = 0

function nextChargeId() {
  chargeSeq += 1
  return `chg-${chargeSeq}`
}

/** Seed draft from entry modal + optional quote — CargoWise inherit pattern. */
export function seedDraftFromEntry(input: {
  entryPath: BookingEntryPath
  lobPrefix: SpineLobPrefix
  structure: BookingFileStructure
  quoteId?: string | null
}): BookingDraft {
  const flashes: BookingInheritFlash[] = []
  const base = emptyBookingDraft({
    entryPath: input.entryPath,
    lobPrefix: input.lobPrefix,
    structure: input.structure,
    quoteId: input.quoteId ?? null,
  })

  if (input.entryPath === 'from_quote' && input.quoteId) {
    const q = quoteById(input.quoteId)
    if (q) {
      base.quoteNo = q.quoteNo
      base.customer = q.customer
      base.origin = q.origin
      base.destination = q.destination
      base.airline = q.airline
      base.pieces = q.pieces
      base.weightKg = q.weightKg
      base.volumeCbm = q.volumeCbm
      base.commodity = q.commodity
      base.lobPrefix = q.lobPrefix
      base.charges = q.chargeLines.map(
        (c): BookingChargeLine => ({
          ...c,
          id: nextChargeId(),
          inheritedFrom: 'quote',
        }),
      )
      flashes.push(
        { field: 'customer', label: 'Customer', from: q.quoteNo, stepId: 'shipment' },
        { field: 'route', label: 'Route', from: q.quoteNo, stepId: 'shipment' },
        { field: 'cargo', label: 'Cargo', from: q.quoteNo, stepId: 'shipment' },
        { field: 'charges', label: `${q.chargeLines.length} charge lines`, from: q.quoteNo, stepId: 'billing' },
      )
    }
  } else {
    base.charges = defaultTemplateCharges(input.lobPrefix)
    flashes.push({
      field: 'charges',
      label: 'Charge template',
      from: `${input.lobPrefix} pack`,
      stepId: 'billing',
    })
  }

  if (input.structure === 'console' || input.structure === 'back_to_back') {
    base.houseCount = input.structure === 'back_to_back' ? 1 : 2
    base.houseCustomers = Array.from({ length: base.houseCount }, (_, i) =>
      i === 0 ? base.customer : '',
    )
    if (base.mawb) base.masterMawb = base.mawb
    flashes.push({
      field: 'structure',
      label: input.structure === 'back_to_back' ? 'Back-to-back' : 'Console',
      from: 'file structure',
      stepId: 'consolidation',
    })
  }

  if (input.lobPrefix === 'AI') {
    const dest = (base.destination || '').toUpperCase()
    const toAu = /SYD|MEL|BNE|ADL|PER|AU/.test(dest) || !dest
    if (toAu && !base.clearance.countryOfOrigin) {
      base.clearance = {
        ...base.clearance,
        countryOfOrigin: base.origin?.slice(0, 2)?.toUpperCase() === 'PV' ? 'CN' : base.clearance.countryOfOrigin || 'CN',
        nextTask: 'Customs entry — Priya Nair (R); Claire Nguyen stamps release (A)',
        responsibleSeat: 'Import Air Ops — Priya Nair',
        accountableSeat: 'Finance — Claire Nguyen',
      }
      flashes.push({
        field: 'clearance',
        label: 'AU clearance lane',
        from: 'Air Import pack',
        stepId: 'clearance',
      })
    }
  }

  base.inheritFlashes = flashes
  return base
}

function defaultTemplateCharges(lob: SpineLobPrefix): BookingChargeLine[] {
  const air = lob === 'AI' || lob === 'AE'
  return [
    {
      id: nextChargeId(),
      code: air ? 'AFR' : lob === 'TR' ? 'FTL' : 'OFR',
      description: air ? 'Air freight sell' : lob === 'TR' ? 'Truck freight' : 'Ocean freight',
      side: 'AR',
      amount: air ? 2800 : 4500,
      currency: 'AUD',
      inheritedFrom: 'template',
    },
    {
      id: nextChargeId(),
      code: 'DOC',
      description: 'Documentation',
      side: 'AR',
      amount: 120,
      currency: 'AUD',
      inheritedFrom: 'template',
    },
    {
      id: nextChargeId(),
      code: air ? 'AFR' : 'OFR',
      description: 'Carrier buy',
      side: 'AP',
      amount: air ? 2100 : 3800,
      currency: 'AUD',
      inheritedFrom: 'template',
    },
  ]
}

/** When master MAWB is set on consol step, push inherit onto draft + flash. */
export function applyMasterMawbInherit(draft: BookingDraft, mawb: string): BookingDraft {
  const next = { ...draft, masterMawb: mawb, mawb }
  const flashes = draft.inheritFlashes.filter((f) => f.field !== 'mawb')
  if (mawb.trim()) {
    flashes.push({
      field: 'mawb',
      label: 'MBL / MAWB',
      from: 'master',
      stepId: 'consolidation',
    })
  }
  next.inheritFlashes = flashes
  return next
}

/** Sync house customer slots when house count changes. */
export function resizeHouseCustomers(draft: BookingDraft, count: number): BookingDraft {
  const n = Math.max(1, Math.min(draft.structure === 'back_to_back' ? 1 : 12, count))
  const houseCustomers = Array.from({ length: n }, (_, i) => draft.houseCustomers[i] ?? '')
  if (!houseCustomers[0] && draft.customer) houseCustomers[0] = draft.customer
  return { ...draft, houseCount: n, houseCustomers }
}

export function billingTotals(draft: BookingDraft) {
  const ar = draft.charges.filter((c) => c.side === 'AR').reduce((s, c) => s + c.amount, 0)
  const ap = draft.charges.filter((c) => c.side === 'AP').reduce((s, c) => s + c.amount, 0)
  return { ar, ap, margin: ar - ap }
}

export function flashesForStep(draft: BookingDraft, stepId: BookingDraft['inheritFlashes'][0]['stepId']) {
  return draft.inheritFlashes.filter((f) => f.stepId === stepId)
}
