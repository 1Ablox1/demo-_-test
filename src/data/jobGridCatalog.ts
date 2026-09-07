/** Job list field catalog — columns + full legacy advanced search (AE 900 / AI 400). */

import { applyLegacySelectOptions } from '@/data/legacySearchOptions'

export type JobGridFieldGroup =
  | 'identity'
  | 'parties'
  | 'agents'
  | 'awb'
  | 'route'
  | 'dates'
  | 'cargo'
  | 'money'
  | 'ops'
  | 'org'
  | 'au'
  | 'custom'

export type JobGridLob = 'AI' | 'AE' | 'ALL'

/** Where the grid reads the cell value from. */
export type JobGridValueSource = 'row' | 'extras' | 'auImport'

export interface JobGridField {
  id: string
  label: string
  group: JobGridFieldGroup
  /** Default visible on Jobs list */
  defaultVisible: boolean
  /** Appears in Columns picker / grid */
  columnable: boolean
  searchable: boolean
  sortable: boolean
  /** Property key on row / extras / auImport */
  field: string
  /** Prefer this source first (still falls back) */
  valueSource?: JobGridValueSource
  mono?: boolean
  width?: number
  searchHint?: string
  searchType?: 'text' | 'select'
  searchOptions?: { value: string; label: string }[]
  /** Which LOB includes this field (columns + advanced search) */
  lobs?: JobGridLob[]
}

export const JOB_GRID_GROUPS: { id: JobGridFieldGroup; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'parties', label: 'Parties' },
  { id: 'agents', label: 'Agents' },
  { id: 'awb', label: 'AWB' },
  { id: 'route', label: 'Route / flight' },
  { id: 'dates', label: 'Dates' },
  { id: 'cargo', label: 'Cargo' },
  { id: 'money', label: 'Money / weight' },
  { id: 'ops', label: 'Ops / status' },
  { id: 'org', label: 'Office / roles' },
  { id: 'au', label: 'AU Market Pack' },
  { id: 'custom', label: 'Custom / flags' },
]

function f(
  partial: Omit<JobGridField, 'columnable' | 'sortable' | 'defaultVisible' | 'searchable'> &
    Partial<Pick<JobGridField, 'columnable' | 'sortable' | 'defaultVisible' | 'searchable'>>,
): JobGridField {
  return {
    columnable: false,
    sortable: false,
    defaultVisible: false,
    searchable: true,
    lobs: ['ALL'],
    ...partial,
  }
}

/** Grid-capable core + legacy AE/AI advanced search catalog (Flash modules 900 / 400). */
const JOB_GRID_FIELDS_RAW: JobGridField[] = [
  // —— Core grid columns ——
  f({
    id: 'jobNo',
    label: 'Job No',
    group: 'identity',
    field: 'jobNo',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    mono: true,
    width: 130,
    searchHint: 'AI-4096',
  }),
  f({
    id: 'kind',
    label: 'Job Type',
    group: 'identity',
    field: 'kind',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    width: 100,
    searchType: 'select',
    searchOptions: [
      { value: 'direct', label: 'Direct' },
      { value: 'house', label: 'House' },
      { value: 'master', label: 'Master' },
    ],
  }),
  f({
    id: 'status',
    label: 'Status',
    group: 'ops',
    field: 'status',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    width: 110,
    searchType: 'select',
    searchOptions: [
      { value: 'Pending', label: 'Pending' },
      { value: 'Operating', label: 'Operating' },
      { value: 'Pre Commit', label: 'Pre Commit' },
      { value: 'Committing', label: 'Committing' },
      { value: 'Committed', label: 'Committed' },
      { value: 'Verified', label: 'Verified' },
      { value: 'Shut Out', label: 'Shut Out' },
      { value: 'Reject', label: 'Reject' },
    ],
  }),
  f({
    id: 'customer',
    label: 'Customer',
    group: 'parties',
    field: 'customer',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    width: 180,
  }),
  f({
    id: 'hawb',
    label: 'HAWB',
    group: 'awb',
    field: 'hawb',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    mono: true,
    width: 140,
  }),
  f({
    id: 'mawb',
    label: 'MAWB',
    group: 'awb',
    field: 'mawb',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    mono: true,
    width: 140,
  }),
  f({
    id: 'route',
    label: 'Route',
    group: 'route',
    field: 'route',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    mono: true,
    width: 150,
  }),
  f({
    id: 'airline',
    label: 'Airline',
    group: 'route',
    field: 'airline',
    columnable: true,
    sortable: true,
    width: 140,
  }),
  f({
    id: 'etd',
    label: 'ETD',
    group: 'dates',
    field: 'etd',
    defaultVisible: true,
    columnable: true,
    sortable: true,
    mono: true,
    width: 120,
  }),
  f({
    id: 'eta',
    label: 'ETA',
    group: 'dates',
    field: 'eta',
    columnable: true,
    sortable: true,
    mono: true,
    width: 120,
  }),
  f({
    id: 'chargeableWt',
    label: 'Chargeable Weight',
    group: 'money',
    field: 'chargeableWt',
    columnable: true,
    sortable: true,
    mono: true,
    width: 130,
  }),
  f({
    id: 'operateType',
    label: 'Service',
    group: 'ops',
    field: 'operateType',
    columnable: true,
    sortable: true,
    width: 120,
    searchType: 'select',
    searchOptions: [
      { value: 'direct', label: 'Direct' },
      { value: 'console', label: 'Console' },
      { value: 'back_to_back', label: 'Back to Back' },
    ],
  }),
  f({
    id: 'notes',
    label: 'Notes',
    group: 'ops',
    field: 'notes',
    columnable: true,
    width: 200,
  }),

  // —— Optional columns (legacy + ops) ——
  f({
    id: 'shipper',
    label: 'Shipper',
    group: 'parties',
    field: 'shipper',
    columnable: true,
    sortable: true,
    width: 160,
    lobs: ['ALL'],
  }),
  f({
    id: 'consignee',
    label: 'Consignee',
    group: 'parties',
    field: 'consignee',
    columnable: true,
    sortable: true,
    width: 160,
    lobs: ['ALL'],
  }),
  f({
    id: 'notifyParty',
    label: 'Notify party',
    group: 'parties',
    field: 'notifyParty',
    columnable: true,
    sortable: true,
    width: 150,
    lobs: ['AI'],
  }),
  f({ id: 'shipperByCompany', label: 'Shipper By Company', group: 'parties', field: 'shipperByCompany', columnable: true, lobs: ['AE'] }),
  f({ id: 'consigneeByCompany', label: 'Consignee By Company', group: 'parties', field: 'consigneeByCompany', columnable: true, lobs: ['AE'] }),
  f({
    id: 'customsBroker',
    label: 'Customs Broker',
    group: 'parties',
    field: 'customsBroker',
    columnable: true,
    sortable: true,
    width: 150,
    lobs: ['AI'],
  }),
  f({ id: 'polAgent', label: 'POL Agent', group: 'agents', field: 'polAgent', columnable: true, lobs: ['ALL'] }),
  f({ id: 'nominatedAgent', label: 'Nominated Agent', group: 'agents', field: 'nominatedAgent', columnable: true, lobs: ['ALL'] }),
  f({ id: 'destAgent', label: 'Dest. Agent', group: 'agents', field: 'destAgent', columnable: true, lobs: ['ALL'] }),
  f({ id: 'bookingAgent', label: 'Booking Agent', group: 'agents', field: 'bookingAgent', columnable: true, lobs: ['ALL'] }),

  f({ id: 'pol', label: 'POL', group: 'route', field: 'pol', columnable: true, sortable: true, mono: true, width: 80, lobs: ['ALL'] }),
  f({ id: 'pod', label: 'Port of Dest.', group: 'route', field: 'pod', columnable: true, sortable: true, mono: true, width: 90, lobs: ['ALL'] }),
  f({ id: 'flight', label: 'Flight', group: 'route', field: 'flight', columnable: true, sortable: true, mono: true, width: 100, lobs: ['ALL'] }),
  f({ id: 'destinationPlace', label: 'Delivery place', group: 'route', field: 'destinationPlace', columnable: true, lobs: ['AE'] }),

  f({ id: 'dateCreated', label: 'Create Date', group: 'dates', field: 'dateCreated', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'customsDate', label: 'OP Date', group: 'dates', field: 'customsDate', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'preverifyDate', label: 'Pre-audit Time', group: 'dates', field: 'preverifyDate', columnable: true, lobs: ['AE'] }),
  f({ id: 'atd', label: 'ATD', group: 'dates', field: 'atd', columnable: true, sortable: true, mono: true, lobs: ['AE'] }),
  f({ id: 'deliverDate', label: 'Date Of Delivery', group: 'dates', field: 'deliverDate', columnable: true, sortable: true, lobs: ['AI'] }),
  f({ id: 'transDate', label: 'D/O Date', group: 'dates', field: 'transDate', columnable: true, sortable: true, lobs: ['AI'] }),
  f({ id: 'actualShippingTime', label: 'Actual delivery time', group: 'dates', field: 'actualShippingTime', columnable: true, lobs: ['AE'] }),
  f({ id: 'fileCutoff', label: 'DOC Cut Off', group: 'dates', field: 'fileCutoff', columnable: true, lobs: ['AE'] }),
  f({ id: 'stuffingDate', label: 'Stuffing Date', group: 'dates', field: 'stuffingDate', columnable: true, lobs: ['AE'] }),

  f({ id: 'cargoCn', label: 'Commodity description (CN)', group: 'cargo', field: 'cargoCn', columnable: true, width: 180, lobs: ['ALL'] }),
  f({ id: 'cargoEn', label: 'Commodity description (EN)', group: 'cargo', field: 'cargoEn', columnable: true, sortable: true, width: 180, lobs: ['ALL'] }),
  f({ id: 'quantity', label: 'Quantity', group: 'cargo', field: 'quantity', columnable: true, sortable: true, mono: true, width: 90, lobs: ['AI'] }),
  f({ id: 'weight', label: 'Weight', group: 'cargo', field: 'weight', columnable: true, sortable: true, mono: true, width: 90, lobs: ['AI'] }),
  f({ id: 'volume', label: 'Volume', group: 'cargo', field: 'volume', columnable: true, sortable: true, mono: true, width: 90, lobs: ['AI'] }),
  f({ id: 'warehouseNo', label: 'Warehouse No', group: 'cargo', field: 'warehouseNo', columnable: true, mono: true, lobs: ['AE'] }),
  f({
    id: 'incoTerm',
    label: 'Trade Terms',
    group: 'cargo',
    field: 'incoTerm',
    columnable: true,
    sortable: true,
    width: 100,
    valueSource: 'auImport',
    lobs: ['ALL'],
  }),

  f({ id: 'customerRefNo', label: 'Customer Reference', group: 'ops', field: 'customerRefNo', columnable: true, sortable: true, width: 140, lobs: ['ALL'] }),
  f({ id: 'pono', label: 'Project No.', group: 'ops', field: 'pono', columnable: true, lobs: ['ALL'] }),
  f({ id: 'fileNo', label: 'File No', group: 'ops', field: 'fileNo', columnable: true, mono: true, lobs: ['AE'] }),
  f({ id: 'relatedJob2', label: 'First Leg No', group: 'ops', field: 'relatedJob2', columnable: true, lobs: ['AE'] }),
  f({ id: 'shutOut', label: 'Shut Out', group: 'ops', field: 'shutOut', columnable: true, lobs: ['AE'] }),
  f({ id: 'customsStatus', label: 'Customs Status', group: 'ops', field: 'customsStatus', columnable: true, sortable: true, lobs: ['AE'] }),
  f({ id: 'customsWay', label: 'Customs Way', group: 'ops', field: 'customsWay', columnable: true, lobs: ['AE'] }),
  f({ id: 'customsType', label: 'Customs Type', group: 'ops', field: 'customsType', columnable: true, lobs: ['AE'] }),
  f({ id: 'protocolType', label: 'Agreement Type', group: 'ops', field: 'protocolType', columnable: true, lobs: ['AE'] }),
  f({ id: 'provisioned', label: 'Accrued', group: 'ops', field: 'provisioned', columnable: true, lobs: ['ALL'] }),
  f({ id: 'relevantJob', label: 'Relevant Job', group: 'ops', field: 'relevantJob', columnable: true, lobs: ['ALL'] }),
  f({ id: 'manageAuditStatus', label: 'Profit Review Status', group: 'ops', field: 'manageAuditStatus', columnable: true, lobs: ['ALL'] }),
  f({ id: 'customJobType', label: 'Customized BIZ Type', group: 'ops', field: 'customJobType', columnable: true, lobs: ['ALL'] }),
  f({ id: 'cargoSource', label: 'Source Of Freight', group: 'ops', field: 'cargoSource', columnable: true, lobs: ['ALL'] }),

  f({ id: 'opDepartment', label: 'Operation Department', group: 'org', field: 'opDepartment', columnable: true, lobs: ['ALL'] }),
  f({ id: 'salesDept', label: 'Sales Department', group: 'org', field: 'salesDept', columnable: true, lobs: ['ALL'] }),
  f({ id: 'opId', label: 'Operation', group: 'org', field: 'opId', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'salesId', label: 'Sales', group: 'org', field: 'salesId', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'csrId', label: 'Customs Service', group: 'org', field: 'csrId', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'planner', label: 'Line Manager', group: 'org', field: 'planner', columnable: true, lobs: ['ALL'] }),
  f({ id: 'dcId', label: 'Documentation', group: 'org', field: 'dcId', columnable: true, lobs: ['ALL'] }),
  f({ id: 'siteOp', label: 'Spot Operation', group: 'org', field: 'siteOp', columnable: true, lobs: ['AE'] }),
  f({ id: 'overseaOp', label: 'Oversea Operation', group: 'org', field: 'overseaOp', columnable: true, lobs: ['ALL'] }),
  f({ id: 'preverifier', label: 'Pre-audit PIC', group: 'org', field: 'preverifier', columnable: true, lobs: ['AE'] }),
  f({ id: 'createdBy', label: 'Creator', group: 'org', field: 'createdBy', columnable: true, lobs: ['AE'] }),
  f({ id: 'opOffice', label: 'OP CMP', group: 'org', field: 'opOffice', columnable: true, mono: true, lobs: ['ALL'] }),
  f({ id: 'salesOffice', label: 'Sales CMP', group: 'org', field: 'salesOffice', columnable: true, mono: true, lobs: ['ALL'] }),
  f({ id: 'cargoSalesId', label: 'Sales for Order', group: 'org', field: 'cargoSalesId', columnable: true, lobs: ['ALL'] }),

  // —— AU Market Pack host facts (scenario pack / clearance desk) ——
  f({
    id: 'auMarketPacks',
    label: 'Market Packs',
    group: 'au',
    field: 'marketPacks',
    valueSource: 'extras',
    columnable: true,
    sortable: true,
    width: 130,
    searchHint: 'GLOBAL · AU',
    lobs: ['AI'],
  }),
  f({
    id: 'auCurrency',
    label: 'Currency',
    group: 'au',
    field: 'currency',
    valueSource: 'extras',
    columnable: true,
    mono: true,
    width: 90,
    searchHint: 'AUD',
    lobs: ['AI'],
  }),
  f({
    id: 'auHomeCountry',
    label: 'Home Country',
    group: 'au',
    field: 'homeCountry',
    valueSource: 'extras',
    columnable: true,
    mono: true,
    width: 100,
    searchHint: 'AU',
    lobs: ['AI'],
  }),
  f({
    id: 'auClearanceGate',
    label: 'Clearance Gate',
    group: 'au',
    field: 'clearanceGate',
    valueSource: 'extras',
    columnable: true,
    sortable: true,
    width: 120,
    searchType: 'select',
    searchOptions: [
      { value: 'open', label: 'Open' },
      { value: 'held', label: 'Held' },
      { value: 'cleared', label: 'Cleared' },
    ],
    lobs: ['AI'],
  }),
  f({
    id: 'auMoneyLock',
    label: 'Money Lock',
    group: 'au',
    field: 'moneyLock',
    valueSource: 'extras',
    columnable: true,
    sortable: true,
    width: 110,
    searchType: 'select',
    searchOptions: [
      { value: 'locked', label: 'Locked' },
      { value: 'unlocked', label: 'Unlocked' },
    ],
    lobs: ['AI'],
  }),
  f({
    id: 'auBranch',
    label: 'AU Branch',
    group: 'au',
    field: 'auBranch',
    valueSource: 'extras',
    columnable: true,
    sortable: true,
    mono: true,
    width: 100,
    searchHint: 'SYD / MEL',
    lobs: ['AI'],
  }),
  f({
    id: 'auOwnerAbn',
    label: 'Owner ABN',
    group: 'au',
    field: 'ownerAbn',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    searchable: true,
    mono: true,
    width: 130,
    searchHint: '11 digits',
    lobs: ['AI'],
  }),
  f({
    id: 'auOwnerRef',
    label: 'Owner reference',
    group: 'au',
    field: 'ownerRef',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    width: 130,
    lobs: ['AI'],
  }),
  f({
    id: 'auOwnerContact',
    label: 'Owner contact',
    group: 'au',
    field: 'ownerContact',
    valueSource: 'auImport',
    columnable: true,
    width: 180,
    lobs: ['AI'],
  }),
  f({
    id: 'auIncoTerm',
    label: 'Incoterm (AU)',
    group: 'au',
    field: 'incoTerm',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    width: 100,
    lobs: ['AI'],
  }),
  f({
    id: 'auLoadingPort',
    label: 'Loading port',
    group: 'au',
    field: 'loadingPort',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 90,
    lobs: ['AI'],
  }),
  f({
    id: 'auDischargingPort',
    label: 'Discharging port',
    group: 'au',
    field: 'dischargingPort',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 110,
    lobs: ['AI'],
  }),
  f({
    id: 'auDestinationPort',
    label: 'Destination port',
    group: 'au',
    field: 'destinationPort',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 110,
    lobs: ['AI'],
  }),
  f({
    id: 'auAirlineCode',
    label: 'Airline code',
    group: 'au',
    field: 'airlineCode',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 90,
    lobs: ['AI'],
  }),
  f({
    id: 'auPieces',
    label: 'Pieces',
    group: 'au',
    field: 'pieces',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 80,
    lobs: ['AI'],
  }),
  f({
    id: 'auGrossWeightKg',
    label: 'Gross wt (kg)',
    group: 'au',
    field: 'grossWeightKg',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 100,
    lobs: ['AI'],
  }),
  f({
    id: 'auCargoDescription',
    label: 'Cargo description',
    group: 'au',
    field: 'cargoDescription',
    valueSource: 'auImport',
    columnable: true,
    width: 200,
    lobs: ['AI'],
  }),
  f({
    id: 'auMarksAndNumbers',
    label: 'Marks & numbers',
    group: 'au',
    field: 'marksAndNumbers',
    valueSource: 'auImport',
    columnable: true,
    width: 180,
    lobs: ['AI'],
  }),
  f({
    id: 'auCountryOfOrigin',
    label: 'Country of origin',
    group: 'au',
    field: 'countryOfOrigin',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 100,
    lobs: ['AI'],
  }),
  f({
    id: 'auCommodityHs',
    label: 'HS / tariff hint',
    group: 'au',
    field: 'commodityHs',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 140,
    lobs: ['AI'],
  }),
  f({
    id: 'auDeliveryAddress',
    label: 'Delivery address',
    group: 'au',
    field: 'deliveryAddress',
    valueSource: 'auImport',
    columnable: true,
    width: 200,
    lobs: ['AI'],
  }),
  f({
    id: 'auFreightTerm',
    label: 'Freight term',
    group: 'au',
    field: 'freightTerm',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    width: 110,
    searchType: 'select',
    searchOptions: [
      { value: 'prepaid', label: 'Prepaid' },
      { value: 'collect', label: 'Collect' },
    ],
    lobs: ['AI'],
  }),
  f({
    id: 'auBrokerRef',
    label: 'Broker reference',
    group: 'au',
    field: 'brokerRef',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    mono: true,
    width: 130,
    lobs: ['AI'],
  }),
  f({
    id: 'auBiosecurityRisk',
    label: 'DAFF / biosecurity',
    group: 'au',
    field: 'biosecurityRisk',
    valueSource: 'auImport',
    columnable: true,
    sortable: true,
    width: 130,
    searchType: 'select',
    searchOptions: [
      { value: 'none', label: 'None' },
      { value: 'daff_review', label: 'DAFF review' },
      { value: 'permit_required', label: 'Permit required' },
    ],
    lobs: ['AI'],
  }),
  f({
    id: 'auPermitHint',
    label: 'Permit / DAFF hint',
    group: 'au',
    field: 'permitHint',
    valueSource: 'auImport',
    columnable: true,
    width: 180,
    lobs: ['AI'],
  }),
  f({
    id: 'auDutyAmountEst',
    label: 'Duty estimate',
    group: 'au',
    field: 'dutyAmountEst',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 110,
    lobs: ['AI'],
  }),
  f({
    id: 'auGstAmountEst',
    label: 'GST estimate',
    group: 'au',
    field: 'gstAmountEst',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 110,
    lobs: ['AI'],
  }),
  f({
    id: 'auInvoiceTotal',
    label: 'Invoice total',
    group: 'au',
    field: 'invoiceTotal',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 120,
    lobs: ['AI'],
  }),
  f({
    id: 'auOverseasFreight',
    label: 'Overseas freight',
    group: 'au',
    field: 'overseasFreight',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 120,
    lobs: ['AI'],
  }),
  f({
    id: 'auInsurance',
    label: 'Insurance',
    group: 'au',
    field: 'insurance',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 100,
    lobs: ['AI'],
  }),
  f({
    id: 'auDeclarationId',
    label: 'Declaration ID',
    group: 'au',
    field: 'declarationId',
    valueSource: 'auImport',
    columnable: true,
    mono: true,
    width: 120,
    lobs: ['AI'],
  }),

  // —— Custom / flags / H5 patches ——
  f({ id: 'customerTier', label: 'Customer Tier', group: 'custom', field: 'customerTier', columnable: true, sortable: true, lobs: ['ALL'] }),
  f({ id: 'contractSigned', label: 'Contract Signed', group: 'custom', field: 'contractSigned', columnable: true, lobs: ['ALL'] }),
  f({ id: 'udf1', label: 'User Defined Field 1', group: 'custom', field: 'udf1', columnable: true, lobs: ['ALL'] }),
  f({ id: 'udf2', label: 'User Defined Field 2', group: 'custom', field: 'udf2', columnable: true, lobs: ['ALL'] }),
  f({ id: 'udf3', label: 'User Defined Field 3', group: 'custom', field: 'udf3', columnable: true, lobs: ['ALL'] }),
  f({ id: 'udf4', label: 'User Defined Field 4', group: 'custom', field: 'udf4', columnable: true, lobs: ['ALL'] }),
  f({ id: 'ifPushSop', label: 'Principal Unit SOP Receiver', group: 'custom', field: 'ifPushSop', columnable: true, lobs: ['ALL'] }),
  f({ id: 'ifPushSopQ', label: 'POL agent SOP Receiver', group: 'custom', field: 'ifPushSopQ', columnable: true, lobs: ['AE'] }),
  f({ id: 'ifPushSopM', label: 'POD agency SOP Receiver', group: 'custom', field: 'ifPushSopM', columnable: true, lobs: ['AI'] }),
  f({ id: 'ifPushSopZ', label: 'Designated Freight Agent SOP Receiver', group: 'custom', field: 'ifPushSopZ', columnable: true, lobs: ['AI'] }),
  f({ id: 'cooperateBranch', label: 'Cooperative branch', group: 'custom', field: 'cooperateBranch', columnable: true, lobs: ['ALL'] }),
  f({ id: 'cooperateBizType', label: 'Collaboration business type', group: 'custom', field: 'cooperateBizType', columnable: true, lobs: ['ALL'] }),
  f({ id: 'cooperateCreated', label: 'Collaboration task creation time', group: 'custom', field: 'cooperateCreated', columnable: true, lobs: ['ALL'] }),
  f({ id: 'bpmProcessNo', label: 'Approval serial number', group: 'custom', field: 'bpmProcessNo', columnable: true, lobs: ['ALL'] }),
  f({ id: 'saleProductCode', label: 'Allow Sale Product', group: 'custom', field: 'saleProductCode', columnable: true, lobs: ['AE'] }),
  f({ id: 'fullOrInside', label: 'Full Or Inside', group: 'custom', field: 'fullOrInside', columnable: true, lobs: ['AE'] }),
]

/** Apply legacy dropdown types (Flash DROP_DOWN / CHECKBOX / RADIO / pickers). */
export const JOB_GRID_FIELDS: JobGridField[] = applyLegacySelectOptions(JOB_GRID_FIELDS_RAW)

export function jobGridFieldById(id: string): JobGridField | undefined {
  return JOB_GRID_FIELDS.find((x) => x.id === id)
}

export function defaultVisibleColumnIds(): string[] {
  return JOB_GRID_FIELDS.filter((x) => x.defaultVisible).map((x) => x.id)
}

function matchesLob(field: JobGridField, lobKey: string): boolean {
  const lob = lobKey === 'AE' || lobKey === 'AI' ? lobKey : 'ALL'
  const scopes = field.lobs ?? ['ALL']
  return scopes.includes('ALL') || scopes.includes(lob as JobGridLob)
}

export function columnableFields(lobKey = 'ALL'): JobGridField[] {
  return JOB_GRID_FIELDS.filter((x) => x.columnable && matchesLob(x, lobKey))
}

export function searchableFieldsForLob(lobKey: string): JobGridField[] {
  return JOB_GRID_FIELDS.filter((x) => x.searchable && matchesLob(x, lobKey))
}

export function sortableFields(): JobGridField[] {
  return JOB_GRID_FIELDS.filter((x) => x.sortable)
}
