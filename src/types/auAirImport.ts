/**
 * AU Air Import — Bucket A host facts + operate fields (not N10 Section C).
 * Aligns with AI-HOSTFACTS-UI-MAP H1–H16 and AU-AIR-IMPORT-REFINED-PLAN §3.
 */

export type AuImportStepId =
  | 'commercial'
  | 'route'
  | 'awb_cargo'
  | 'parties_delivery'
  | 'customs_handoff'
  | 'money_preview'

export type AuFreightTerm = 'prepaid' | 'collect' | ''
export type AuBiosecurityRisk = 'none' | 'daff_review' | 'permit_required' | ''

export interface AuImportFields {
  customerId: string
  /** H1 — Owner ID / ABN for ICS & GST (11 digits when known) */
  ownerAbn: string
  ownerContact: string
  ownerRef: string
  incoTerm: string
  shipperId: string
  consigneeId: string
  notifyParty: string
  laneId: string
  loadingPort: string
  dischargingPort: string
  destinationPort: string
  airlineCode: string
  pieces: number | ''
  grossWeightKg: number | ''
  marksAndNumbers: string
  cargoDescription: string
  /** Country of origin — customs / preference (not Section C lines) */
  countryOfOrigin: string
  /** HS / tariff hint — broker validates; read-only pending in Ctrl-X */
  commodityHs: string
  deliveryAddress: string
  /** Prepaid / collect — legacy freightTerm */
  freightTerm: AuFreightTerm
  /** Licensed broker reference — Module 1 clearance checklist */
  brokerRef: string
  biosecurityRisk: AuBiosecurityRisk
  permitHint: string
  /** Legacy manual duty / GST job amounts — estimates until Ctrl-X */
  dutyAmountEst: string
  gstAmountEst: string
  invoiceTotal: string
  overseasFreight: string
  insurance: string
  declarationId: string | null
}

export interface AuImportParty {
  id: string
  name: string
  abnHint: string
  /** 11-digit ABN when on file in MDM */
  abn?: string
  contact: string
  defaultRefPrefix: string
  defaultDelivery?: string
  role: 'customer' | 'shipper' | 'consignee'
}

export interface AuImportLane {
  id: string
  label: string
  routeDisplay: string
  defaultCountryOfOrigin: string
  defaultCommodityHs: string
  defaultBiosecurityRisk: AuBiosecurityRisk
  loadingPort: string
  dischargingPort: string
  destinationPort: string
  airlineCode: string
  airlineName: string
  typicalEtd: string
  typicalEta: string
  typicalFreightAud: string
  typicalInsuranceAud: string
}

export interface InheritFlash {
  field: string
  label: string
  from: string
  stepId: AuImportStepId
}

export const AU_IMPORT_STEPS: { id: AuImportStepId; label: string; hint: string }[] = [
  { id: 'commercial', label: 'Booking', hint: 'Importer, ABN, Incoterm' },
  { id: 'route', label: 'Flight', hint: 'Ports, airline, ETD/ETA' },
  { id: 'awb_cargo', label: 'AWB & cargo', hint: 'MAWB/HAWB, weight, goods' },
  { id: 'parties_delivery', label: 'Delivery', hint: 'Shipper, consignee, deliver-to' },
  { id: 'customs_handoff', label: 'Customs', hint: 'Broker, freight terms, DAFF' },
  { id: 'money_preview', label: 'Duty / GST', hint: 'Valuation estimates (not N10)' },
]

export const INCO_TERMS = ['EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP'] as const
