import type { SpineLobPrefix } from '@/types/spineLob'
import type { OperateType } from '@/lib/splitBooking'
import type { AuBiosecurityRisk, AuFreightTerm } from '@/types/auAirImport'

/** How the operator starts the file — CargoWise-style entry, not transport cards. */
export type BookingEntryPath = 'from_quote' | 'direct'

/** File structure decided at create — drives whether Consolidation step appears. */
export type BookingFileStructure = 'direct' | 'console' | 'back_to_back'

export type BookingWizardStepId =
  | 'shipment'
  | 'clearance'
  | 'billing'
  | 'consolidation'
  | 'review'

export interface BookingWizardStepMeta {
  id: BookingWizardStepId
  label: string
  hint: string
}

export interface BookingChargeLine {
  id: string
  code: string
  description: string
  side: 'AR' | 'AP'
  amount: number
  currency: string
  inheritedFrom: 'quote' | 'template' | 'manual'
}

export interface BookingInheritFlash {
  field: string
  label: string
  from: string
  stepId: BookingWizardStepId
}

export interface BookingQuoteSeed {
  id: string
  quoteNo: string
  customer: string
  lobPrefix: SpineLobPrefix
  route: string
  origin: string
  destination: string
  airline: string
  pieces: string
  weightKg: string
  volumeCbm: string
  commodity: string
  sellTotal: number
  currency: string
  chargeLines: Omit<BookingChargeLine, 'id' | 'inheritedFrom'>[]
}

/** AU Air Import clearance handoff — operate fields (not N10 Section C). */
export interface BookingClearanceDraft {
  ownerAbn: string
  brokerRef: string
  countryOfOrigin: string
  commodityHs: string
  freightTerm: AuFreightTerm
  biosecurityRisk: AuBiosecurityRisk
  permitHint: string
  dutyAmountEst: string
  gstAmountEst: string
  /** Who owns the next gate after create (RACI projection). */
  responsibleSeat: string
  accountableSeat: string
  nextTask: string
}

export interface BookingDraft {
  entryPath: BookingEntryPath
  quoteId: string | null
  quoteNo: string | null
  lobPrefix: SpineLobPrefix
  structure: BookingFileStructure
  /** Shipment */
  customer: string
  shipper: string
  consignee: string
  origin: string
  destination: string
  airline: string
  etd: string
  eta: string
  pieces: string
  weightKg: string
  volumeCbm: string
  commodity: string
  hawb: string
  mawb: string
  notes: string
  /** Billing */
  charges: BookingChargeLine[]
  /** Consolidation (master facts + planned houses) */
  masterMawb: string
  houseCount: number
  houseCustomers: string[]
  inheritFlashes: BookingInheritFlash[]
  /** AU AI clearance — only used when lobPrefix === 'AI' */
  clearance: BookingClearanceDraft
}

export function emptyClearanceDraft(
  partial?: Partial<BookingClearanceDraft>,
): BookingClearanceDraft {
  return {
    ownerAbn: '',
    brokerRef: '',
    countryOfOrigin: '',
    commodityHs: '',
    freightTerm: '',
    biosecurityRisk: '',
    permitHint: '',
    dutyAmountEst: '',
    gstAmountEst: '',
    responsibleSeat: 'Import Air Ops — Priya Nair',
    accountableSeat: 'Finance — Claire Nguyen',
    nextTask: 'Customs entry — Priya (R); Claire stamps release (A)',
    ...partial,
  }
}

export function operateTypeFromStructure(structure: BookingFileStructure): OperateType {
  if (structure === 'console') return 'console'
  if (structure === 'back_to_back') return 'back_to_back'
  return 'direct'
}

/** Hierarchical Book ladder — Clearance only for Air Import (AU). */
export function wizardStepsFor(
  structure: BookingFileStructure,
  lobPrefix: SpineLobPrefix = 'AI',
): BookingWizardStepMeta[] {
  const steps: BookingWizardStepMeta[] = [
    {
      id: 'shipment',
      label: 'Shipment',
      hint: 'Parties, route, cargo, AWB refs',
    },
  ]
  if (lobPrefix === 'AI') {
    steps.push({
      id: 'clearance',
      label: 'Clearance',
      hint: 'ABN · broker · DAFF — not N10 form',
    })
  }
  steps.push({
    id: 'billing',
    label: 'Billing',
    hint: 'AR / AP charge draft',
  })
  if (structure === 'console' || structure === 'back_to_back') {
    steps.push({
      id: 'consolidation',
      label: 'Consolidation',
      hint: 'Master MBL + houses · inherit',
    })
  }
  steps.push({
    id: 'review',
    label: 'Review',
    hint: 'Create file · open workspace',
  })
  return steps
}

export function emptyBookingDraft(
  partial?: Partial<BookingDraft> & Pick<BookingDraft, 'entryPath' | 'lobPrefix' | 'structure'>,
): BookingDraft {
  const clearancePartial = partial?.clearance
  const rest = { ...partial }
  delete rest.clearance
  return {
    entryPath: 'direct',
    quoteId: null,
    quoteNo: null,
    lobPrefix: 'AI',
    structure: 'direct',
    customer: '',
    shipper: '',
    consignee: '',
    origin: '',
    destination: '',
    airline: '',
    etd: '',
    eta: '',
    pieces: '',
    weightKg: '',
    volumeCbm: '',
    commodity: '',
    hawb: '',
    mawb: '',
    notes: '',
    charges: [],
    masterMawb: '',
    houseCount: 1,
    houseCustomers: [''],
    inheritFlashes: [],
    ...rest,
    clearance: emptyClearanceDraft(clearancePartial),
  }
}
