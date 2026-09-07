import { AU_LANES, AU_PARTIES, laneById, partyById } from '@/data/auAirImportRegistry'
import type {
  AuImportFields,
  AuImportStepId,
  InheritFlash,
} from '@/types/auAirImport'
import { AU_IMPORT_STEPS } from '@/types/auAirImport'
import type { ConsolidationRecord, ShipmentRecord } from '@/stores/freight'

export function emptyAuImportFields(): AuImportFields {
  return {
    customerId: '',
    ownerAbn: '',
    ownerContact: '',
    ownerRef: '',
    incoTerm: '',
    shipperId: '',
    consigneeId: '',
    notifyParty: '',
    laneId: '',
    loadingPort: '',
    dischargingPort: '',
    destinationPort: '',
    airlineCode: '',
    pieces: '',
    grossWeightKg: '',
    marksAndNumbers: '',
    cargoDescription: '',
    countryOfOrigin: '',
    commodityHs: '',
    deliveryAddress: '',
    freightTerm: '',
    brokerRef: '',
    biosecurityRisk: '',
    permitHint: '',
    dutyAmountEst: '',
    gstAmountEst: '',
    invoiceTotal: '',
    overseasFreight: '',
    insurance: '',
    declarationId: null,
  }
}

/** Seed AU fields from flat shipment row when opening legacy-shaped data. */
export function auImportFromShipment(s: ShipmentRecord): AuImportFields {
  if (s.auImport) return { ...s.auImport }
  const base = emptyAuImportFields()
  const lane = lanesMatchRoute(s.route)
  if (lane) {
    base.laneId = lane.id
    base.loadingPort = lane.loadingPort
    base.dischargingPort = lane.dischargingPort
    base.destinationPort = lane.destinationPort
    base.airlineCode = lane.airlineCode
    base.countryOfOrigin = lane.defaultCountryOfOrigin
    base.commodityHs = lane.defaultCommodityHs
    base.biosecurityRisk = lane.defaultBiosecurityRisk
    base.overseasFreight = `AUD ${lane.typicalFreightAud}`
    base.insurance = `AUD ${lane.typicalInsuranceAud}`
    base.freightTerm = base.incoTerm === 'CIF' || base.incoTerm === 'CFR' ? 'prepaid' : ''
  }
  const cust = partiesMatchName(s.customer)
  if (cust) {
    base.customerId = cust.id
    base.ownerContact = cust.contact
    base.ownerAbn = cust.abn ?? ''
    base.ownerRef = `${cust.defaultRefPrefix}-${new Date().getMonth() + 1}${String(new Date().getDate()).padStart(2, '0')}`
    base.deliveryAddress = cust.defaultDelivery ?? ''
    if (cust.role === 'customer') {
      const cons = partiesForConsignee(cust.name)
      if (cons) base.consigneeId = cons.id
    }
  }
  const cargoParts = parseCargoLine(s.chargeableWt, s.notes)
  base.pieces = cargoParts.pieces
  base.grossWeightKg = cargoParts.grossKg
  base.cargoDescription = cargoParts.description
  return base
}

function lanesMatchRoute(route: string) {
  const norm = route.replace(/\s/g, '').toUpperCase()
  return AU_LANES.find((l) => norm.includes(l.loadingPort) && norm.includes(l.dischargingPort))
}

function partiesMatchName(name: string) {
  const n = name.trim().toLowerCase()
  return AU_PARTIES.find(
    (p) => p.role === 'customer' && p.name.toLowerCase().includes(n.split(' ')[0] ?? ''),
  )
}

function partiesForConsignee(name: string) {
  return AU_PARTIES.find((p) => p.role === 'consignee' && p.name === name)
}

function parseCargoLine(chargeableWt: string, notes: string) {
  const piecesMatch = notes.match(/(\d+)\s*(?:pallets?|cartons?|pcs?)/i) ?? chargeableWt.match(/(\d+)/)
  const grossMatch = chargeableWt.match(/([\d,]+)\s*kg/i) ?? notes.match(/Gross\s*([\d,]+)/i)
  const desc = notes.split('·')[0]?.trim() || ''
  return {
    pieces: piecesMatch ? Number(piecesMatch[1]) : ('' as const),
    grossKg: grossMatch ? Number(grossMatch[1].replace(/,/g, '')) : ('' as const),
    description: desc,
  }
}

export function applyCustomerPick(
  customerId: string,
  fields: AuImportFields,
): { fields: AuImportFields; flashes: InheritFlash[] } {
  const c = partyById(customerId)
  if (!c) return { fields, flashes: [] }
  const flashes: InheritFlash[] = []
  const next = { ...fields, customerId }
  if (c.abn) {
    next.ownerAbn = c.abn
    flashes.push({ field: 'ownerAbn', label: 'Owner ABN', from: c.name, stepId: 'commercial' })
  }
  if (c.contact) {
    next.ownerContact = c.contact
    flashes.push({ field: 'ownerContact', label: 'Owner contact', from: c.name, stepId: 'commercial' })
  }
  if (c.defaultRefPrefix) {
    const ref = `${c.defaultRefPrefix}-${new Date().getMonth() + 1}${String(new Date().getDate()).padStart(2, '0')}`
    next.ownerRef = ref
    flashes.push({ field: 'ownerRef', label: 'Owner reference', from: c.name, stepId: 'commercial' })
  }
  if (c.defaultDelivery) {
    next.deliveryAddress = c.defaultDelivery
    flashes.push({ field: 'deliveryAddress', label: 'Delivery address', from: c.name, stepId: 'parties_delivery' })
  }
  const cons = partiesForConsignee(c.name)
  if (cons) {
    next.consigneeId = cons.id
    flashes.push({ field: 'consigneeId', label: 'Consignee', from: c.name, stepId: 'parties_delivery' })
  }
  return { fields: next, flashes }
}

export function applyLanePick(
  laneId: string,
  fields: AuImportFields,
): { fields: AuImportFields; flashes: InheritFlash[]; routeDisplay: string; airlineName: string; etd: string; eta: string } {
  const lane = laneById(laneId)
  if (!lane) return { fields, flashes: [], routeDisplay: '', airlineName: '', etd: '', eta: '' }
  const flashes: InheritFlash[] = []
  const next = { ...fields, laneId }
  next.loadingPort = lane.loadingPort
  next.dischargingPort = lane.dischargingPort
  next.destinationPort = lane.destinationPort
  next.airlineCode = lane.airlineCode
  next.overseasFreight = `AUD ${lane.typicalFreightAud}`
  next.insurance = `AUD ${lane.typicalInsuranceAud}`
  if (lane.defaultCountryOfOrigin) {
    next.countryOfOrigin = lane.defaultCountryOfOrigin
    flashes.push({ field: 'countryOfOrigin', label: 'Country of origin', from: lane.label, stepId: 'awb_cargo' })
  }
  if (lane.defaultCommodityHs) {
    next.commodityHs = lane.defaultCommodityHs
    flashes.push({ field: 'commodityHs', label: 'HS hint', from: lane.label, stepId: 'awb_cargo' })
  }
  if (lane.defaultBiosecurityRisk) {
    next.biosecurityRisk = lane.defaultBiosecurityRisk
    flashes.push({ field: 'biosecurityRisk', label: 'DAFF risk', from: lane.label, stepId: 'customs_handoff' })
  }
  if (next.incoTerm === 'CIF' || next.incoTerm === 'CFR') {
    next.freightTerm = 'prepaid'
    flashes.push({ field: 'freightTerm', label: 'Freight term', from: next.incoTerm, stepId: 'customs_handoff' })
  }
  flashes.push(
    { field: 'loadingPort', label: 'Loading port', from: lane.label, stepId: 'route' },
    { field: 'airlineCode', label: 'Airline', from: lane.label, stepId: 'route' },
    { field: 'overseasFreight', label: 'Overseas freight', from: lane.label, stepId: 'money_preview' },
  )
  return {
    fields: next,
    flashes,
    routeDisplay: lane.routeDisplay,
    airlineName: lane.airlineName,
    etd: lane.typicalEtd,
    eta: lane.typicalEta,
  }
}

export function applyShipperPick(
  shipperId: string,
  fields: AuImportFields,
): { fields: AuImportFields; flashes: InheritFlash[] } {
  const s = partyById(shipperId)
  if (!s) return { fields, flashes: [] }
  const flashes: InheritFlash[] = []
  const next = { ...fields, shipperId }
  if (!next.marksAndNumbers.trim()) {
    next.marksAndNumbers = `SHIPPER ${s.defaultRefPrefix} · CARTON 1-N`
    flashes.push({ field: 'marksAndNumbers', label: 'Marks & numbers', from: s.name, stepId: 'awb_cargo' })
  }
  return { fields: next, flashes }
}

export function applyMasterInheritance(
  con: ConsolidationRecord,
  fields: AuImportFields,
  _shipment: ShipmentRecord,
): { fields: AuImportFields; shipmentPatch: Partial<ShipmentRecord>; flashes: InheritFlash[] } {
  const flashes: InheritFlash[] = []
  const next = { ...fields }
  const shipmentPatch: Partial<ShipmentRecord> = {}
  if (con.mawb) {
    shipmentPatch.mawb = con.mawb
    flashes.push({ field: 'mawb', label: 'MAWB', from: con.masterJobNo, stepId: 'awb_cargo' })
  }
  if (con.route) {
    shipmentPatch.route = con.route
    flashes.push({ field: 'route', label: 'Route', from: con.masterJobNo, stepId: 'route' })
  }
  if (con.airline) {
    shipmentPatch.airline = con.airline
    flashes.push({ field: 'airline', label: 'Airline', from: con.masterJobNo, stepId: 'route' })
  }
  if (con.etd) shipmentPatch.etd = con.etd
  if (con.eta) shipmentPatch.eta = con.eta
  return { fields: next, shipmentPatch, flashes }
}

export function estimateInvoiceTotal(fields: AuImportFields): string {
  const freight = parseAud(fields.overseasFreight)
  const ins = parseAud(fields.insurance)
  const goods = parseAud(fields.invoiceTotal) > 0 ? parseAud(fields.invoiceTotal) : freight * 1.15
  if (!freight && !ins && !goods) return ''
  const total = goods + freight + ins
  return `AUD ${total.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function parseAud(s: string): number {
  const m = s.replace(/[^\d.]/g, '')
  return m ? Number(m) : 0
}

export function estimateDutyGst(fields: AuImportFields): { duty: string; gst: string } {
  const customsValue = parseAud(estimateInvoiceTotal(fields))
  if (!customsValue) return { duty: '', gst: '' }
  const duty = Math.round(customsValue * 0.05)
  const gst = Math.round((customsValue + duty) * 0.1)
  return {
    duty: `AUD ${duty.toLocaleString('en-AU')}`,
    gst: `AUD ${gst.toLocaleString('en-AU')}`,
  }
}

export function stepCompletion(fields: AuImportFields, shipment: ShipmentRecord): Record<AuImportStepId, boolean> {
  return {
    commercial: Boolean(
      fields.customerId &&
        fields.incoTerm &&
        fields.ownerContact &&
        (fields.ownerAbn.trim() || fields.customerId === 'cust-pharma'),
    ),
    route: Boolean(
      fields.loadingPort &&
        fields.dischargingPort &&
        fields.destinationPort &&
        fields.airlineCode &&
        shipment.etd &&
        shipment.eta,
    ),
    awb_cargo: Boolean(
      shipment.hawb &&
        (shipment.mawb || shipment.kind === 'house') &&
        fields.pieces !== '' &&
        fields.grossWeightKg !== '' &&
        fields.cargoDescription.trim() &&
        fields.countryOfOrigin,
    ),
    parties_delivery: Boolean(fields.shipperId && fields.consigneeId && fields.deliveryAddress.trim()),
    customs_handoff: Boolean(fields.brokerRef.trim() && fields.freightTerm && fields.biosecurityRisk),
    money_preview: Boolean(
      fields.overseasFreight || fields.insurance || fields.invoiceTotal || fields.dutyAmountEst || fields.gstAmountEst,
    ),
  }
}

export function stepProgress(completion: Record<AuImportStepId, boolean>): number {
  const done = AU_IMPORT_STEPS.filter((s) => completion[s.id]).length
  return Math.round((done / AU_IMPORT_STEPS.length) * 100)
}

export function nextIncompleteStep(completion: Record<AuImportStepId, boolean>): AuImportStepId {
  for (const s of AU_IMPORT_STEPS) {
    if (!completion[s.id]) return s.id
  }
  return 'money_preview'
}

export function fieldToStep(field: string): AuImportStepId {
  const map: Record<string, AuImportStepId> = {
    customerId: 'commercial',
    ownerContact: 'commercial',
    ownerRef: 'commercial',
    incoTerm: 'commercial',
    ownerAbn: 'commercial',
    laneId: 'route',
    loadingPort: 'route',
    dischargingPort: 'route',
    destinationPort: 'route',
    airlineCode: 'route',
    etd: 'route',
    eta: 'route',
    route: 'route',
    airline: 'route',
    mawb: 'awb_cargo',
    hawb: 'awb_cargo',
    pieces: 'awb_cargo',
    grossWeightKg: 'awb_cargo',
    marksAndNumbers: 'awb_cargo',
    cargoDescription: 'awb_cargo',
    countryOfOrigin: 'awb_cargo',
    commodityHs: 'awb_cargo',
    chargeableWt: 'awb_cargo',
    shipperId: 'parties_delivery',
    consigneeId: 'parties_delivery',
    deliveryAddress: 'parties_delivery',
    notifyParty: 'parties_delivery',
    freightTerm: 'customs_handoff',
    brokerRef: 'customs_handoff',
    biosecurityRisk: 'customs_handoff',
    permitHint: 'customs_handoff',
    dutyAmountEst: 'money_preview',
    gstAmountEst: 'money_preview',
    declarationId: 'customs_handoff',
    overseasFreight: 'money_preview',
    insurance: 'money_preview',
    invoiceTotal: 'money_preview',
  }
  return map[field] ?? 'commercial'
}
