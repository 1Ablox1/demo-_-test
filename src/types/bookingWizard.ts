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
  /**
   * Shipment — labels for display; *Id / *Code hold MDM keys (cmpIdx, IATA, userId).
   * Echo Form Display fields from 02_air-import-job-fields (parties / ports / terms / staff).
   */
  customer: string
  customerId: string
  shipper: string
  shipperId: string
  consignee: string
  consigneeId: string
  notifyParty: string
  notifyPartyId: string
  bookingAgent: string
  bookingAgentId: string
  nominatedAgent: string
  nominatedAgentId: string
  origin: string
  originCode: string
  destination: string
  destinationCode: string
  airline: string
  airlineId: string
  etd: string
  eta: string
  pieces: string
  weightKg: string
  volumeCbm: string
  chargeWeight: string
  commodity: string
  packing: string
  packingCode: string
  cargoType: string
  cargoTypeCode: string
  hawb: string
  mawb: string
  cargoSource: 'SC' | 'NC' | ''
  incoTerm: string
  freightTerm: string
  paymentTermHbl: string
  /** Echo paymentTermMBL — Priority A */
  paymentTermMbl: string
  opOffice: string
  opOfficeId: string
  opDepartment: string
  opDepartmentId: string
  /** Echo `op` — ops user (Priority A) */
  op: string
  opId: string
  sales: string
  salesId: string
  /** Flight / vessel (Priority A) */
  voyageFlight: string
  vessel: string
  /** Customs broker party (Priority A) */
  customsBroker: string
  customsBrokerId: string
  /** Echo `customs` Y/N — needs customs clearance */
  customsRequired: '' | 'Y' | 'N'
  /** HS code — mirrored to clearance.commodityHs for AI */
  hsCode: string
  /** Echo remarks */
  notes: string
  /** Echo satisfiedRequests — special requirements */
  specialReqs: string
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
      hint: 'Parties, route, flight, terms, ops',
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
    customerId: '',
    shipper: '',
    shipperId: '',
    consignee: '',
    consigneeId: '',
    notifyParty: '',
    notifyPartyId: '',
    bookingAgent: '',
    bookingAgentId: '',
    nominatedAgent: '',
    nominatedAgentId: '',
    origin: '',
    originCode: '',
    destination: '',
    destinationCode: '',
    airline: '',
    airlineId: '',
    etd: '',
    eta: '',
    pieces: '',
    weightKg: '',
    volumeCbm: '',
    chargeWeight: '',
    commodity: '',
    packing: '',
    packingCode: '',
    cargoType: '',
    cargoTypeCode: '',
    hawb: '',
    mawb: '',
    cargoSource: 'SC',
    incoTerm: '',
    freightTerm: '',
    paymentTermHbl: '',
    paymentTermMbl: '',
    opOffice: '',
    opOfficeId: '',
    opDepartment: '',
    opDepartmentId: '',
    op: '',
    opId: '',
    sales: '',
    salesId: '',
    voyageFlight: '',
    vessel: '',
    customsBroker: '',
    customsBrokerId: '',
    customsRequired: '',
    hsCode: '',
    notes: '',
    specialReqs: '',
    charges: [],
    masterMawb: '',
    houseCount: 1,
    houseCustomers: [''],
    inheritFlashes: [],
    ...rest,
    clearance: emptyClearanceDraft(clearancePartial),
  }
}
