import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { formatJobNo, type LobCode } from '@/lib/lob'
import {
  DEFAULT_MAWB_POOL,
  houseJobNo,
  masterJobNo,
  nextHawb,
  type MawbPoolRow,
  type OperateType,
  validateMawbMod7,
} from '@/lib/splitBooking'
import type { AuImportFields } from '@/types/auAirImport'
import type { BookingDraft } from '@/types/bookingWizard'
import { operateTypeFromStructure } from '@/types/bookingWizard'
import type { SpineLobPrefix } from '@/types/spineLob'
import { auImportFromShipment, emptyAuImportFields } from '@/lib/auAirImportSmartFill'
import {
  advanceJobStatus,
  DEFAULT_JOB_STATUS,
  type ShipmentStatus,
} from '@/lib/jobStatus'

export type { ShipmentStatus } from '@/lib/jobStatus'

function lobCodeFromSpine(prefix: SpineLobPrefix): LobCode {
  if (prefix === 'AI') return 'air_import'
  if (prefix === 'AE') return 'air_export'
  if (prefix === 'OI') return 'sea_import'
  if (prefix === 'OE') return 'sea_export'
  return 'road_export'
}

/** Next Booking Ref ? commercial trail only; never equals Job No. */
function allocateBookingRef(existing: ShipmentRecord[]): string {
  const year = 2026
  let max = 100
  for (const s of existing) {
    const m = /^BK-(\d{4})-(\d+)$/.exec(s.bookingRef ?? '')
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]))
  }
  return `BK-${year}-${max + 1}`
}

/** Map Book Clearance step ? AU host facts (not N10). */
function auImportFromClearanceDraft(draft: BookingDraft): AuImportFields | undefined {
  if (draft.lobPrefix !== 'AI') return undefined
  const c = draft.clearance
  const route = `${draft.origin || '???'} ? ${draft.destination || '???'}`
  // Seed party/lane matches from booking shipment facts, then overlay clearance
  const seeded = auImportFromShipment({
    id: 'tmp',
    jobNo: '',
    lob: 'air_import',
    kind: 'direct',
    operateType: 'direct',
    status: 'Operating',
    customer: draft.customer || '',
    route,
    airline: draft.airline || '',
    hawb: draft.hawb,
    mawb: draft.mawb || draft.masterMawb,
    etd: draft.etd || '',
    eta: draft.eta || '',
    chargeableWt: draft.weightKg ? `${draft.weightKg} kg` : '',
    notes: draft.commodity || '',
    consolidationId: null,
  })
  return {
    ...seeded,
    ownerAbn: c.ownerAbn || seeded.ownerAbn,
    brokerRef: c.brokerRef || seeded.brokerRef,
    countryOfOrigin: c.countryOfOrigin || seeded.countryOfOrigin,
    commodityHs: c.commodityHs || seeded.commodityHs,
    freightTerm: c.freightTerm || seeded.freightTerm,
    biosecurityRisk: c.biosecurityRisk || seeded.biosecurityRisk,
    permitHint: c.permitHint || seeded.permitHint,
    dutyAmountEst: c.dutyAmountEst || seeded.dutyAmountEst,
    gstAmountEst: c.gstAmountEst || seeded.gstAmountEst,
    cargoDescription: draft.commodity || seeded.cargoDescription,
    airlineCode: draft.airline || seeded.airlineCode,
    pieces: draft.pieces ? Number(draft.pieces) || seeded.pieces : seeded.pieces,
    grossWeightKg: draft.weightKg ? Number(draft.weightKg) || seeded.grossWeightKg : seeded.grossWeightKg,
  }
}

export type ShipmentKind = 'direct' | 'house' | 'master'

/** Mock packing / cargo line under AWB tab (meeting nested-table pattern). */
export interface CargoLine {
  id: string
  pieces: number | ''
  description: string
  weightKg: number | ''
}

export interface ShipmentRecord {
  id: string
  /**
   * Operational Job No (e.g. SYD-2609-4096). Never reuse as Booking Ref / MAWB / HAWB.
   */
  jobNo: string
  /**
   * Commercial intake id from Book (e.g. BK-2026-101). Set only on Book ? Job promotion;
   * Jobs-native drafts have no bookingRef. Identity is decoupled from jobNo / MAWB / HAWB.
   */
  bookingRef?: string
  lob: LobCode
  kind: ShipmentKind
  /** Legacy OPERATE_TYPE mapping */
  operateType: OperateType
  /**
   * Legacy `jobState` English label (`SystemConstants.JOB_STATES`).
   * New files = Operating. Submit advances Pre Commit ? ? ? Verified.
   */
  status: ShipmentStatus
  customer: string
  route: string
  airline: string
  /** HBL / HAWB ? house or direct */
  hawb: string
  /** MBL / MAWB ? master or direct; houses copy from master */
  mawb: string
  etd: string
  eta: string
  chargeableWt: string
  notes: string
  consolidationId: string | null
  auImport?: AuImportFields
  cargoLines?: CargoLine[]
  /** Legacy advanced-search extras (mock MDM / Flash fields). */
  extras?: Record<string, string>
}

export interface ConsolidationRecord {
  id: string
  masterJobId: string
  masterJobNo: string
  mawb: string
  lob: LobCode
  operateType: 'console' | 'back_to_back'
  status: ShipmentStatus
  airline: string
  route: string
  etd: string
  eta: string
  houseIds: string[]
  notes: string
  /** Legacy / AU pack extras for console list search & columns */
  extras?: Record<string, string>
}

export type SplitResult =
  | { ok: true; consolidationId: string; masterId: string; houseIds: string[]; message: string }
  | { ok: false; message: string }

const SHIPMENTS: ShipmentRecord[] = [
  {
    id: '8801',
    jobNo: 'AE-8801A',
    lob: 'air_export',
    kind: 'house',
    operateType: 'console',
    status: 'Operating',
    customer: 'Acme Logistics',
    route: 'SYD ? LAX',
    airline: 'Qantas Freight',
    hawb: 'SYD-2608-00043',
    mawb: '081-55443322',
    etd: '12 Aug 14:20',
    eta: '12 Aug 11:05',
    chargeableWt: '1,240 kg',
    notes: 'House under console CON-2608-01',
    consolidationId: 'con-01',
  },
  {
    id: '8802',
    jobNo: 'AE-8802B',
    lob: 'air_export',
    kind: 'house',
    operateType: 'console',
    status: 'Operating',
    customer: 'Harbor Goods',
    route: 'SYD ? LAX',
    airline: 'Qantas Freight',
    hawb: 'SYD-2608-00044',
    mawb: '081-55443322',
    etd: '12 Aug 14:20',
    eta: '12 Aug 11:05',
    chargeableWt: '520 kg',
    notes: 'House under same master',
    consolidationId: 'con-01',
  },
  {
    id: '8800',
    jobNo: 'AE-8800Z',
    lob: 'air_export',
    kind: 'master',
    operateType: 'console',
    status: 'Operating',
    customer: '?',
    route: 'SYD ? LAX',
    airline: 'Qantas Freight',
    hawb: '',
    mawb: '081-55443322',
    etd: '12 Aug 14:20',
    eta: '12 Aug 11:05',
    chargeableWt: '1,760 kg',
    notes: 'Master job ? MAWB (MBL) only',
    consolidationId: 'con-01',
  },
  {
    id: '8804',
    jobNo: formatJobNo('air_export', '8804'),
    lob: 'air_export',
    kind: 'direct',
    operateType: 'direct',
    status: 'Operating',
    customer: 'Pacific Fresh',
    route: 'MEL ? SIN',
    airline: 'Singapore Airlines',
    hawb: 'MEL-2608-00088',
    mawb: '618-99887766',
    etd: '14 Aug 09:00',
    eta: '14 Aug 15:40',
    chargeableWt: '680 kg',
    notes: 'Direct shipment ? no console',
    consolidationId: null,
    extras: {
      shipper: 'Pacific Fresh Pty Ltd',
      consignee: 'Singapore Fresh Importers',
      polAgent: 'Melbourne Air Ops',
      destAgent: 'SIN Dest Agent',
      bookingAgent: 'SQ Booking Desk',
      pol: 'MEL',
      pod: 'SIN',
      flight: 'SQ228',
      destinationPlace: 'Singapore Hub',
      dateCreated: '10 Aug 2026',
      customsDate: '13 Aug 2026',
      atd: '14 Aug 09:12',
      cargoEn: 'Chilled produce',
      warehouseNo: 'WH-MEL-8804',
      incoTerm: 'CIP',
      customerRefNo: 'PF-EXP-8804',
      fileNo: 'AE-8804-F',
      opId: 'ops.mel',
      salesId: 'sales.au',
      opOffice: 'MEL',
      salesOffice: 'MEL',
      udf1: 'PERISHABLE',
    },
  },
  {
    id: '4096',
    jobNo: formatJobNo('air_import', '4096'),
    lob: 'air_import',
    kind: 'direct',
    operateType: 'direct',
    status: 'Pending',
    customer: 'Sydney Retail Group Pty Ltd',
    route: 'PVG ? SYD',
    airline: 'Qantas',
    hawb: '160-44112233',
    mawb: '999-55443322',
    etd: '28 Jul 18:00',
    eta: '01 Aug 06:30',
    chargeableWt: '800 kg',
    notes: 'Golden demo PVG?SYD ? direct ? can Split HBL/MBL',
    consolidationId: null,
    auImport: {
      customerId: 'cust-srg',
      ownerAbn: '52123456789',
      ownerContact: '+61 2 9000 1234 ? import@sydneyretail.au',
      ownerRef: 'SRG-IMP-2408',
      incoTerm: 'CIF',
      shipperId: 'ship-shanghai',
      consigneeId: 'cons-srg',
      notifyParty: '',
      laneId: 'pvg-syd',
      loadingPort: 'PVG',
      dischargingPort: 'SYD',
      destinationPort: 'SYD',
      airlineCode: 'QF',
      pieces: 6,
      grossWeightKg: 720,
      marksAndNumbers: 'CARTON 1-6 ? ELECTRONICS ? MADE IN CN',
      cargoDescription: 'Consumer electronics ? 6 cartons',
      countryOfOrigin: 'CN',
      commodityHs: '8471.30 (pending broker)',
      deliveryAddress: '12 George St, Sydney NSW 2000',
      freightTerm: 'prepaid',
      brokerRef: 'BRK-WA-4096',
      biosecurityRisk: 'none',
      permitHint: '',
      dutyAmountEst: 'AUD 320',
      gstAmountEst: 'AUD 672',
      invoiceTotal: 'AUD 6,400',
      overseasFreight: 'AUD 4,200',
      insurance: 'AUD 180',
      declarationId: null,
    },
    extras: {
      shipper: 'Shanghai Electronics Co',
      consignee: 'Sydney Retail Group Pty Ltd',
      notifyParty: 'Import desk ? SRG',
      customsBroker: 'Western AU Broker',
      polAgent: 'PVG Agent',
      destAgent: 'SYD Dest Agent',
      bookingAgent: 'QF Cargo',
      pol: 'PVG',
      pod: 'SYD',
      flight: 'QF130',
      dateCreated: '20 Jul 2026',
      customsDate: '29 Jul 2026',
      deliverDate: '02 Aug 2026',
      cargoEn: 'Consumer electronics ? 6 cartons',
      quantity: '6',
      weight: '720',
      volume: '4.2',
      incoTerm: 'CIF',
      customerRefNo: 'SRG-IMP-2408',
      opId: 'ops.syd',
      salesId: 'sales.au',
      csrId: 'customs.wa',
      opOffice: 'SYD',
      salesOffice: 'SYD',
      customerTier: 'Gold',
      udf1: 'DEMO-4096',
      marketPacks: 'GLOBAL ? AU',
      currency: 'AUD',
      homeCountry: 'AU',
      clearanceGate: 'held',
      moneyLock: 'locked',
      auBranch: 'SYD',
    },
  },
  {
    id: '8790',
    jobNo: formatJobNo('air_import', '8790'),
    lob: 'air_import',
    kind: 'direct',
    operateType: 'direct',
    status: 'Pending',
    customer: 'Sydney Pharma',
    route: 'HKG ? SYD',
    airline: 'Cathay Pacific',
    hawb: 'SYD-2607-00991',
    mawb: '160-11223344',
    etd: '10 Aug 22:10',
    eta: '11 Aug 05:55',
    chargeableWt: '420 kg',
    notes: 'Import hold on clearance ? direct',
    consolidationId: null,
    auImport: {
      customerId: 'cust-pharma',
      ownerAbn: '',
      ownerContact: '+61 2 9555 4400 ? qa@sydneypharma.au',
      ownerRef: 'SP-IMP-0810',
      incoTerm: 'CIF',
      shipperId: 'ship-hkg-pharma',
      consigneeId: 'cons-pharma',
      notifyParty: 'QA on arrival',
      laneId: 'hkg-syd',
      loadingPort: 'HKG',
      dischargingPort: 'SYD',
      destinationPort: 'SYD',
      airlineCode: 'CX',
      pieces: 2,
      grossWeightKg: 390,
      marksAndNumbers: 'PHARMA PALLETS 1-2 ? 2-8?C',
      cargoDescription: 'Pharma pallets ? Temp 2?8?C',
      countryOfOrigin: 'HK',
      commodityHs: '3004.90 (pharma ? broker confirm)',
      deliveryAddress: '45 Parramatta Rd, Homebush NSW 2140',
      freightTerm: 'prepaid',
      brokerRef: 'BRK-WA-8790',
      biosecurityRisk: 'daff_review',
      permitHint: 'DAFF inspection pending ? temp-controlled pharma',
      dutyAmountEst: 'AUD 560',
      gstAmountEst: 'AUD 1,176',
      invoiceTotal: 'AUD 11,200',
      overseasFreight: 'AUD 2,800',
      insurance: 'AUD 120',
      declarationId: null,
    },
    extras: {
      shipper: 'HKG Pharma Supply',
      consignee: 'Sydney Pharma',
      notifyParty: 'QA on arrival',
      customsBroker: 'Western AU Broker',
      pol: 'HKG',
      pod: 'SYD',
      flight: 'CX111',
      cargoEn: 'Pharma pallets ? Temp 2?8?C',
      quantity: '2',
      weight: '390',
      incoTerm: 'CIF',
      customerRefNo: 'SP-IMP-0810',
      customsStatus: 'Held',
      udf1: 'DAFF',
      marketPacks: 'GLOBAL ? AU',
      currency: 'AUD',
      homeCountry: 'AU',
      clearanceGate: 'held',
      moneyLock: 'locked',
      auBranch: 'SYD',
    },
  },
  {
    id: '8772',
    jobNo: formatJobNo('air_export', '8772'),
    lob: 'air_export',
    kind: 'direct',
    operateType: 'direct',
    status: 'Operating',
    customer: 'Blue Ocean Co',
    route: 'BNE ? LAX',
    airline: 'United Airlines',
    hawb: 'BNE-2607-00820',
    mawb: '016-44556677',
    etd: '08 Aug 11:30',
    eta: '08 Aug 08:15',
    chargeableWt: '2,100 kg',
    notes: 'Ready for charges',
    consolidationId: null,
  },
  // Pre-built AI console demo (already split)
  {
    id: '4100',
    jobNo: 'AI-4100Z',
    lob: 'air_import',
    kind: 'master',
    operateType: 'console',
    status: 'Operating',
    customer: '?',
    route: 'PVG ? MEL',
    airline: 'Qantas',
    hawb: '',
    mawb: '999-11002233',
    etd: '20 Aug 10:00',
    eta: '20 Aug 22:00',
    chargeableWt: '1,100 kg',
    notes: 'AI console master ? MBL only',
    consolidationId: 'con-ai-01',
  },
  {
    id: '4101',
    jobNo: 'AI-4100A',
    lob: 'air_import',
    kind: 'house',
    operateType: 'console',
    status: 'Operating',
    customer: 'Melbourne Retail Co',
    route: 'PVG ? MEL',
    airline: 'Qantas',
    hawb: '160-55001122',
    mawb: '999-11002233',
    etd: '20 Aug 10:00',
    eta: '20 Aug 22:00',
    chargeableWt: '640 kg',
    notes: 'House A ? own HBL',
    consolidationId: 'con-ai-01',
    auImport: {
      customerId: 'cust-srg',
      ownerAbn: '52123456789',
      ownerContact: '+61 3 9000 0001',
      ownerRef: 'MRC-IMP-01',
      incoTerm: 'CIF',
      shipperId: 'ship-shanghai',
      consigneeId: 'cons-srg',
      notifyParty: '',
      laneId: 'pvg-syd',
      loadingPort: 'PVG',
      dischargingPort: 'MEL',
      destinationPort: 'MEL',
      airlineCode: 'QF',
      pieces: 4,
      grossWeightKg: 600,
      marksAndNumbers: 'CARTON 1-4',
      cargoDescription: 'Retail goods',
      countryOfOrigin: 'CN',
      commodityHs: '8471.30',
      deliveryAddress: '88 Collins St, Melbourne VIC 3000',
      freightTerm: 'prepaid',
      brokerRef: 'BRK-WA-4101',
      biosecurityRisk: 'none',
      permitHint: '',
      dutyAmountEst: '',
      gstAmountEst: '',
      invoiceTotal: 'AUD 3,200',
      overseasFreight: 'AUD 2,100',
      insurance: 'AUD 90',
      declarationId: null,
    },
  },
  {
    id: '4102',
    jobNo: 'AI-4100B',
    lob: 'air_import',
    kind: 'house',
    operateType: 'console',
    status: 'Operating',
    customer: 'Vic Pharma',
    route: 'PVG ? MEL',
    airline: 'Qantas',
    hawb: '160-55001133',
    mawb: '999-11002233',
    etd: '20 Aug 10:00',
    eta: '20 Aug 22:00',
    chargeableWt: '460 kg',
    notes: 'House B ? own HBL',
    consolidationId: 'con-ai-01',
  },
]

const CONSOLIDATIONS: ConsolidationRecord[] = [
  {
    id: 'con-01',
    masterJobId: '8800',
    masterJobNo: 'AE-8800Z',
    mawb: '081-55443322',
    lob: 'air_export',
    operateType: 'console',
    status: 'Operating',
    airline: 'Qantas Freight',
    route: 'SYD ? LAX',
    etd: '12 Aug 14:20',
    eta: '12 Aug 11:05',
    houseIds: ['8801', '8802'],
    notes: 'AE console ? two houses under one MAWB',
    extras: {
      pol: 'SYD',
      pod: 'LAX',
      flight: 'QF11',
      airlineCode: 'QF',
      polAgent: 'SYD Export Ops',
      destAgent: 'LAX Dest Agent',
      bookingAgent: 'QF Cargo',
      pieces: '18',
      grossWeight: '2,400 kg',
      chargeableWt: '2,680 kg',
      volume: '12.1',
      fileNo: 'AE-CON-8800',
      opId: 'ops.syd',
      salesId: 'sales.au',
      opOffice: 'SYD',
      salesOffice: 'SYD',
      dateCreated: '08 Aug 2026',
      fileCutoff: '11 Aug 16:00',
      atd: '12 Aug 14:28',
      customsStatus: 'Cleared',
    },
  },
  {
    id: 'con-ai-01',
    masterJobId: '4100',
    masterJobNo: 'AI-4100Z',
    mawb: '999-11002233',
    lob: 'air_import',
    operateType: 'console',
    status: 'Operating',
    airline: 'Qantas',
    route: 'PVG ? MEL',
    etd: '20 Aug 10:00',
    eta: '20 Aug 22:00',
    houseIds: ['4101', '4102'],
    notes: 'AI console ? GLOBAL+AU pack ? master MAWB + house HAWBs',
    extras: {
      pol: 'PVG',
      pod: 'MEL',
      flight: 'QF129',
      airlineCode: 'QF',
      polAgent: 'PVG Agent',
      destAgent: 'MEL Dest Agent',
      bookingAgent: 'QF Cargo',
      customsBroker: 'Western AU Broker',
      pieces: '12',
      grossWeight: '1,840 kg',
      chargeableWt: '2,100 kg',
      volume: '8.4',
      dateCreated: '15 Aug 2026',
      ata: '20 Aug 22:18',
      customsStatus: 'Held',
      opId: 'ops.mel',
      salesId: 'sales.au',
      opOffice: 'MEL',
      salesOffice: 'SYD',
      marketPacks: 'GLOBAL ? AU',
      currency: 'AUD',
      homeCountry: 'AU',
      loadingPort: 'PVG',
      dischargingPort: 'MEL',
      destinationPort: 'MEL',
      brokerRef: 'BRK-WA-4100',
      biosecurityRisk: 'daff_review',
      clearanceGate: 'held',
      moneyLock: 'locked',
      gstHint: 'AUD GST',
      auBranch: 'MEL',
      udf1: 'DEMO-AI-CON',
    },
  },
]

let idSeq = 5000
let hawbSeq = 9000

function nextId(): string {
  idSeq += 1
  return String(idSeq)
}

export const useFreightStore = defineStore('freight', () => {
  const shipments = ref<ShipmentRecord[]>(SHIPMENTS.map((s) => ({ ...s })))
  const consolidations = ref<ConsolidationRecord[]>(CONSOLIDATIONS.map((c) => ({ ...c })))
  const mawbPool = ref<MawbPoolRow[]>(DEFAULT_MAWB_POOL.map((r) => ({ ...r })))
  const selectedShipmentId = ref<string | null>(null)
  const selectedConsolidationId = ref<string | null>('con-ai-01')
  const lastSplitMessage = ref<string | null>(null)

  const selectedShipment = computed(() =>
    selectedShipmentId.value
      ? shipments.value.find((s) => s.id === selectedShipmentId.value) ?? null
      : null,
  )

  const selectedConsolidation = computed(() =>
    selectedConsolidationId.value
      ? consolidations.value.find((c) => c.id === selectedConsolidationId.value) ?? null
      : null,
  )

  const housesForSelected = computed(() => {
    const c = selectedConsolidation.value
    if (!c) return []
    return shipments.value.filter((s) => c.houseIds.includes(s.id))
  })

  const masterForSelected = computed(() => {
    const c = selectedConsolidation.value
    if (!c) return null
    return shipments.value.find((s) => s.id === c.masterJobId) ?? null
  })

  const availableMawbs = computed(() => mawbPool.value.filter((r) => r.status === 'available'))

  function selectShipment(id: string | null) {
    selectedShipmentId.value = id
  }

  function selectConsolidation(id: string | null) {
    selectedConsolidationId.value = id
  }

  function updateShipment(id: string, patch: Partial<ShipmentRecord>) {
    const row = shipments.value.find((s) => s.id === id)
    if (!row) return null
    Object.assign(row, patch)
    return row
  }

  function syncConsoleFromMaster(conId: string) {
    const con = consolidations.value.find((c) => c.id === conId)
    if (!con) return
    const master = shipments.value.find((s) => s.id === con.masterJobId)
    if (!master) return
    con.mawb = master.mawb
    con.route = master.route
    con.airline = master.airline
    con.etd = master.etd
    con.eta = master.eta
    for (const hid of con.houseIds) {
      const h = shipments.value.find((s) => s.id === hid)
      if (!h) continue
      h.mawb = master.mawb
      h.route = master.route
      h.airline = master.airline
      h.etd = master.etd
      h.eta = master.eta
      const flight = master.extras?.flight
      if (flight) {
        h.extras = { ...(h.extras ?? {}), flight }
      }
    }
  }

  function updateConsolidation(id: string, patch: Partial<ConsolidationRecord>) {
    const row = consolidations.value.find((c) => c.id === id)
    if (!row) return null
    Object.assign(row, patch)
    if (patch.mawb || patch.route || patch.airline || patch.etd || patch.eta) {
      const master = shipments.value.find((s) => s.id === row.masterJobId)
      if (master) {
        if (patch.mawb) master.mawb = patch.mawb
        if (patch.route) master.route = patch.route
        if (patch.airline) master.airline = patch.airline
        if (patch.etd) master.etd = patch.etd
        if (patch.eta) master.eta = patch.eta
      }
      syncConsoleFromMaster(id)
    }
    return row
  }

  function allocateMawb(jobId: string, poolId: string): SplitResult {
    const job = shipments.value.find((s) => s.id === jobId)
    const pool = mawbPool.value.find((r) => r.id === poolId)
    if (!job) return { ok: false, message: 'Job not found' }
    if (!pool || pool.status !== 'available') return { ok: false, message: 'MAWB not available in pool' }
    if (!validateMawbMod7(pool.mawb)) {
      return { ok: false, message: `MAWB ${pool.mawb} failed mod-7 check` }
    }
    // release previous allocation for this job if any
    for (const r of mawbPool.value) {
      if (r.allocatedToJobId === jobId) {
        r.status = 'available'
        r.allocatedToJobId = null
      }
    }
    pool.status = 'allocated'
    pool.allocatedToJobId = jobId
    job.mawb = pool.mawb
    job.airline = pool.airline
    if (job.consolidationId) syncConsoleFromMaster(job.consolidationId)
    lastSplitMessage.value = `Allocated MAWB ${pool.mawb} to ${job.jobNo}`
    return { ok: true, consolidationId: job.consolidationId ?? '', masterId: jobId, houseIds: [], message: lastSplitMessage.value }
  }

  /**
   * Legacy newConsole: split a direct job into master (MBL) + first house (HBL).
   * Mode console = N houses allowed; back_to_back = exactly one house.
   */
  function createConsoleFromDirect(
    directId: string,
    mode: 'console' | 'back_to_back' = 'console',
    mawbPoolId?: string,
  ): SplitResult {
    const direct = shipments.value.find((s) => s.id === directId)
    if (!direct) return { ok: false, message: 'Shipment not found' }
    if (direct.kind !== 'direct' || direct.operateType !== 'direct') {
      return { ok: false, message: 'Only a Direct job can be split into master + house (HBL/MBL)' }
    }
    if (direct.consolidationId) return { ok: false, message: 'Already under a consolidation' }

    if (mawbPoolId) {
      const alloc = allocateMawb(directId, mawbPoolId)
      if (!alloc.ok) return alloc
    }
    if (!direct.mawb.trim()) {
      return { ok: false, message: 'Allocate a MAWB (MBL) from the pool before splitting' }
    }

    const seq = direct.id.replace(/\D/g, '') || direct.id
    const masterNo = masterJobNo(direct.lob, seq)
    const house1No = houseJobNo(masterNo, 0)
    const houseId = nextId()
    const conId = `con-${direct.lob === 'air_import' ? 'ai' : 'ae'}-${direct.id}`

    // Promote original job ? master (keeps MBL, clears HBL)
    const savedHawb = direct.hawb
    const savedCustomer = direct.customer
    const savedAu = direct.auImport ? { ...direct.auImport } : undefined
    const savedWt = direct.chargeableWt

    direct.kind = 'master'
    direct.operateType = mode
    direct.jobNo = masterNo
    direct.customer = '?'
    direct.hawb = ''
    direct.notes = `Master after ${mode === 'back_to_back' ? 'back-to-back' : 'console'} split ? MBL ${direct.mawb}`
    direct.consolidationId = conId
    direct.auImport = undefined

    // First house carries customer + HBL
    hawbSeq += 1
    const house: ShipmentRecord = {
      id: houseId,
      jobNo: house1No,
      lob: direct.lob,
      kind: 'house',
      operateType: mode,
      status: direct.status,
      customer: savedCustomer,
      route: direct.route,
      airline: direct.airline,
      hawb: savedHawb || nextHawb(direct.mawb.slice(0, 3), hawbSeq),
      mawb: direct.mawb,
      etd: direct.etd,
      eta: direct.eta,
      chargeableWt: savedWt,
      notes: 'House created by HBL/MBL split ? owns HBL; copies master MBL',
      consolidationId: conId,
      auImport: savedAu,
    }
    shipments.value.push(house)

    const con: ConsolidationRecord = {
      id: conId,
      masterJobId: direct.id,
      masterJobNo: masterNo,
      mawb: direct.mawb,
      lob: direct.lob,
      operateType: mode,
      status: direct.status,
      airline: direct.airline,
      route: direct.route,
      etd: direct.etd,
      eta: direct.eta,
      houseIds: [houseId],
      notes:
        mode === 'back_to_back'
          ? 'Back-to-back ? one master MBL + one house HBL'
          : 'Console ? master MBL + house HBLs',
    }
    consolidations.value.unshift(con)
    selectedConsolidationId.value = conId
    selectedShipmentId.value = houseId
    lastSplitMessage.value = `Split ${direct.id}: master ${masterNo} (MBL) + house ${house1No} (HBL)`
    return {
      ok: true,
      consolidationId: conId,
      masterId: direct.id,
      houseIds: [houseId],
      message: lastSplitMessage.value,
    }
  }

  /** Attach a new or existing direct job as a house under a console. */
  function attachHouse(
    consolidationId: string,
    opts?: { customer?: string; hawb?: string; fromDirectId?: string },
  ): SplitResult {
    const con = consolidations.value.find((c) => c.id === consolidationId)
    if (!con) return { ok: false, message: 'Consolidation not found' }
    if (con.operateType === 'back_to_back' && con.houseIds.length >= 1) {
      return { ok: false, message: 'Back-to-back allows only one house ? detach first or use Console mode' }
    }
    const master = shipments.value.find((s) => s.id === con.masterJobId)
    if (!master) return { ok: false, message: 'Master job missing' }

    if (opts?.fromDirectId) {
      const d = shipments.value.find((s) => s.id === opts.fromDirectId)
      if (!d) return { ok: false, message: 'Direct job not found' }
      if (d.kind !== 'direct' || d.consolidationId) {
        return { ok: false, message: 'Can only attach a free Direct job' }
      }
      if (d.lob !== con.lob) return { ok: false, message: 'Mode must match the consolidation' }
      const idx = con.houseIds.length
      d.kind = 'house'
      d.operateType = con.operateType
      d.jobNo = houseJobNo(con.masterJobNo, idx)
      d.mawb = master.mawb
      d.route = master.route
      d.airline = master.airline
      d.etd = master.etd
      d.eta = master.eta
      d.consolidationId = con.id
      if (!d.hawb.trim()) {
        hawbSeq += 1
        d.hawb = nextHawb(master.mawb.slice(0, 3), hawbSeq)
      }
      d.notes = `Attached to ${con.masterJobNo} ? HBL ${d.hawb}, MBL copied`
      con.houseIds.push(d.id)
      lastSplitMessage.value = `Attached ${d.jobNo} under ${con.masterJobNo}`
      return { ok: true, consolidationId: con.id, masterId: master.id, houseIds: [...con.houseIds], message: lastSplitMessage.value }
    }

    const idx = con.houseIds.length
    const houseId = nextId()
    hawbSeq += 1
    const house: ShipmentRecord = {
      id: houseId,
      jobNo: houseJobNo(con.masterJobNo, idx),
      lob: con.lob,
      kind: 'house',
      operateType: con.operateType,
      status: 'Operating',
      customer: opts?.customer?.trim() || `Customer ${idx + 1}`,
      route: master.route,
      airline: master.airline,
      hawb: opts?.hawb?.trim() || nextHawb(master.mawb.slice(0, 3), hawbSeq),
      mawb: master.mawb,
      etd: master.etd,
      eta: master.eta,
      chargeableWt: '',
      notes: 'New house attached ? own HBL; MBL from master',
      consolidationId: con.id,
    }
    shipments.value.push(house)
    con.houseIds.push(houseId)
    lastSplitMessage.value = `Added house ${house.jobNo} (HBL ${house.hawb}) under ${con.masterJobNo}`
    return {
      ok: true,
      consolidationId: con.id,
      masterId: master.id,
      houseIds: [...con.houseIds],
      message: lastSplitMessage.value,
    }
  }

  function detachHouse(houseId: string): SplitResult {
    const house = shipments.value.find((s) => s.id === houseId)
    if (!house || house.kind !== 'house' || !house.consolidationId) {
      return { ok: false, message: 'Not a house under consolidation' }
    }
    const con = consolidations.value.find((c) => c.id === house.consolidationId)
    if (!con) return { ok: false, message: 'Consolidation missing' }

    con.houseIds = con.houseIds.filter((id) => id !== houseId)
    house.kind = 'direct'
    house.operateType = 'direct'
    house.consolidationId = null
    house.jobNo = formatJobNo(house.lob, house.id)
    house.notes = `Detached from ${con.masterJobNo} ? now Direct (keeps HBL ${house.hawb})`
    lastSplitMessage.value = `Detached ${house.jobNo} from console`

    if (con.houseIds.length === 0) {
      // dissolve console ? master becomes direct again
      const master = shipments.value.find((s) => s.id === con.masterJobId)
      if (master) {
        master.kind = 'direct'
        master.operateType = 'direct'
        master.consolidationId = null
        master.jobNo = formatJobNo(master.lob, master.id)
        master.customer = house.customer
        master.hawb = house.hawb
        master.notes = 'Console dissolved ? last house detached; master restored to Direct'
        // release pool optional ? keep MBL on restored direct
        selectedShipmentId.value = master.id
      }
      consolidations.value = consolidations.value.filter((c) => c.id !== con.id)
      if (selectedConsolidationId.value === con.id) selectedConsolidationId.value = consolidations.value[0]?.id ?? null
      lastSplitMessage.value += ' ? console dissolved'
    }

    return {
      ok: true,
      consolidationId: con.houseIds.length ? con.id : '',
      masterId: con.masterJobId,
      houseIds: [...con.houseIds],
      message: lastSplitMessage.value,
    }
  }

  function generateHawb(houseId: string): SplitResult {
    const house = shipments.value.find((s) => s.id === houseId)
    if (!house) return { ok: false, message: 'Job not found' }
    if (house.kind === 'master') return { ok: false, message: 'Master holds MBL only ? generate HBL on a house' }
    hawbSeq += 1
    house.hawb = nextHawb(house.mawb.slice(0, 3) || '160', hawbSeq)
    lastSplitMessage.value = `Generated HBL ${house.hawb} on ${house.jobNo}`
    return { ok: true, consolidationId: house.consolidationId ?? '', masterId: '', houseIds: [houseId], message: lastSplitMessage.value }
  }

  function freeDirectsForAttach(lob: LobCode, excludeConId?: string) {
    return shipments.value.filter(
      (s) =>
        s.lob === lob &&
        s.kind === 'direct' &&
        s.operateType === 'direct' &&
        !s.consolidationId &&
        s.id !== excludeConId,
    )
  }

  /**
   * Persist Book wizard draft into freight store (mock SoR).
   * Direct ? one shipment; console / B2B ? master + houses + consolidation.
   */
  function createFromBookingDraft(draft: BookingDraft): {
    shipmentId: string
    consolidationId: string | null
  } {
    const lob = lobCodeFromSpine(draft.lobPrefix)
    const operateType = operateTypeFromStructure(draft.structure)
    const route = `${draft.origin || '???'} ? ${draft.destination || '???'}`
    const seq = String(9000 + shipments.value.length)
    const bookingRef = allocateBookingRef(shipments.value)
    const chargeNote = draft.charges
      .filter((c) => c.side === 'AR')
      .map((c) => `${c.code} ${c.amount}`)
      .join(' ? ')

    if (draft.structure === 'direct') {
      const id = `bk-${seq}`
      const row: ShipmentRecord = {
        id,
        jobNo: formatJobNo(lob, seq),
        bookingRef,
        lob,
        kind: 'direct',
        operateType: 'direct',
        status: 'Operating',
        customer: draft.customer || 'TBD',
        route,
        airline: draft.airline || '?',
        hawb: draft.hawb,
        mawb: draft.mawb || draft.masterMawb,
        etd: draft.etd || 'TBD',
        eta: draft.eta || 'TBD',
        chargeableWt: draft.weightKg ? `${draft.weightKg} kg` : '?',
        notes: [draft.commodity, chargeNote, draft.quoteNo ? `From ${draft.quoteNo}` : `From ${bookingRef}`]
          .filter(Boolean)
          .join(' ? '),
        consolidationId: null,
        auImport: auImportFromClearanceDraft(draft),
        cargoLines: [],
      }
      shipments.value.unshift(row)
      selectShipment(id)
      return { shipmentId: id, consolidationId: null }
    }

    const conId = `con-bk-${seq}`
    const masterId = `bk-m-${seq}`
    const masterNo = masterJobNo(lob, seq)
    const mawb = draft.masterMawb || draft.mawb || ''
    const master: ShipmentRecord = {
      id: masterId,
      jobNo: masterNo,
      bookingRef,
      lob,
      kind: 'master',
      operateType,
      status: 'Operating',
      customer: '?',
      route,
      airline: draft.airline || '?',
      hawb: '',
      mawb,
      etd: draft.etd || 'TBD',
      eta: draft.eta || 'TBD',
      chargeableWt: '?',
      notes: `Master ? ${draft.structure} ? ${bookingRef}`,
      consolidationId: conId,
      cargoLines: [],
    }

    const houseIds: string[] = []
    const n = draft.structure === 'back_to_back' ? 1 : Math.max(1, draft.houseCount)
    for (let i = 0; i < n; i++) {
      const hid = `bk-h-${seq}-${i + 1}`
      houseIds.push(hid)
      shipments.value.unshift({
        id: hid,
        jobNo: houseJobNo(masterNo, i),
        bookingRef,
        lob,
        kind: 'house',
        operateType,
        status: 'Operating',
        customer: draft.houseCustomers[i] || draft.customer || 'TBD',
        route,
        airline: draft.airline || '?',
        hawb: i === 0 ? draft.hawb : '',
        mawb,
        etd: draft.etd || 'TBD',
        eta: draft.eta || 'TBD',
        chargeableWt: draft.weightKg ? `${draft.weightKg} kg` : '?',
        notes: [chargeNote, bookingRef].filter(Boolean).join(' ? '),
        consolidationId: conId,
        auImport: i === 0 ? auImportFromClearanceDraft(draft) : undefined,
        cargoLines: [],
      })
    }

    shipments.value.unshift(master)
    consolidations.value.unshift({
      id: conId,
      masterJobId: masterId,
      masterJobNo: masterNo,
      mawb,
      lob,
      operateType: operateType === 'back_to_back' ? 'back_to_back' : 'console',
      status: 'Operating',
      airline: draft.airline || '?',
      route,
      etd: draft.etd || 'TBD',
      eta: draft.eta || 'TBD',
      houseIds,
      notes: draft.quoteNo ? `From ${draft.quoteNo}` : '',
    })
    selectConsolidation(conId)
    return { shipmentId: houseIds[0] ?? masterId, consolidationId: conId }
  }

  /** Front-end-only draft ? no store insert until saveShipment. Never a Booking Ref. */
  function buildLocalDraft(lob: LobCode): ShipmentRecord {
    return {
      id: '',
      jobNo: '(new)',
      lob,
      kind: 'direct',
      operateType: 'direct',
      status: DEFAULT_JOB_STATUS,
      customer: '',
      route: '',
      airline: '',
      hawb: '',
      mawb: '',
      etd: '',
      eta: '',
      chargeableWt: '',
      notes: '',
      consolidationId: null,
      auImport: lob === 'air_import' ? emptyAuImportFields() : undefined,
      cargoLines: [{ id: 'line-1', pieces: '', description: '', weightKg: '' }],
    }
  }

  /**
   * Persist create/edit. First save assigns id + jobNo.
   * Status stays legacy jobState (default Operating). Book owns bookingRef.
   */
  function saveShipment(row: ShipmentRecord): { ok: true; shipment: ShipmentRecord } | { ok: false; message: string } {
    if (!row.id) {
      const id = nextId()
      const seq = id
      const saved: ShipmentRecord = {
        ...row,
        id,
        jobNo: formatJobNo(row.lob, seq),
        status: row.status || DEFAULT_JOB_STATUS,
        bookingRef: undefined,
        cargoLines: row.cargoLines ? row.cargoLines.map((l) => ({ ...l })) : [],
        auImport: row.auImport ? { ...row.auImport } : undefined,
      }
      shipments.value.unshift(saved)
      selectShipment(saved.id)
      return { ok: true, shipment: { ...saved, auImport: saved.auImport ? { ...saved.auImport } : undefined } }
    }
    const existing = shipments.value.find((s) => s.id === row.id)
    if (!existing) return { ok: false, message: 'Job not found' }
    // Preserve bookingRef identity; never overwrite jobNo with booking refs
    const bookingRef = existing.bookingRef
    Object.assign(existing, {
      ...row,
      bookingRef,
      jobNo: existing.jobNo,
      cargoLines: row.cargoLines ? row.cargoLines.map((l) => ({ ...l })) : existing.cargoLines,
      auImport: row.auImport ? { ...row.auImport } : existing.auImport,
    })
    selectShipment(existing.id)
    return {
      ok: true,
      shipment: {
        ...existing,
        auImport: existing.auImport ? { ...existing.auImport } : undefined,
        cargoLines: existing.cargoLines ? existing.cargoLines.map((l) => ({ ...l })) : [],
      },
    }
  }

  /** Mock submit along legacy jobState path: Operating ? Pre Commit ? ? ? Verified. */
  function submitShipment(
    id: string,
  ): { ok: true; shipment: ShipmentRecord; message: string } | { ok: false; message: string } {
    const row = shipments.value.find((s) => s.id === id)
    if (!row) return { ok: false, message: 'Save the job before submit' }
    if (!row.customer.trim() || !row.route.trim()) {
      return { ok: false, message: 'Customer and route are required to submit' }
    }
    if (row.lob === 'air_import') {
      const abn = (row.auImport?.ownerAbn || '').replace(/\s/g, '')
      if (abn && !/^\d{11}$/.test(abn)) {
        return { ok: false, message: 'Owner ABN must be 11 digits before submit' }
      }
    }
    row.status = advanceJobStatus(row.status)
    return {
      ok: true,
      shipment: { ...row },
      message: `Submitted ${row.jobNo} ? status ${row.status}`,
    }
  }

  return {
    shipments,
    consolidations,
    mawbPool,
    availableMawbs,
    selectedShipmentId,
    selectedConsolidationId,
    selectedShipment,
    selectedConsolidation,
    housesForSelected,
    masterForSelected,
    lastSplitMessage,
    selectShipment,
    selectConsolidation,
    updateShipment,
    updateConsolidation,
    allocateMawb,
    createConsoleFromDirect,
    attachHouse,
    detachHouse,
    generateHawb,
    freeDirectsForAttach,
    syncConsoleFromMaster,
    createFromBookingDraft,
    buildLocalDraft,
    saveShipment,
    submitShipment,
  }
})
