/**
 * Legacy advanced-search dropdown options (Flash AE 空运订舱 / AI 400).
 * Fields that were FIELD_DROP_DOWN_LIST, MULTI_DROP_DOWN, CHECKBOX, RADIO,
 * TRADETERMS, CUSTOMERTYPE, or office/airport/airline pickers.
 */

export type SelectOpt = { value: string; label: string }

export const YES_NO: SelectOpt[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]

export const SHOW_HIDE: SelectOpt[] = [
  { value: 'Y', label: 'Show' },
  { value: 'N', label: 'Hide' },
]

/** AirExportConstants.BUSINESS_MODELS */
export const SERVICE_TYPES: SelectOpt[] = [
  { value: 'console', label: 'Console' },
  { value: 'direct', label: 'Direct' },
  { value: 'back_to_back', label: 'Back To Back' },
]

/**
 * Legacy `SystemConstants.JOB_STATES` / `JobStatus` English labels
 * (cargoware-h5 SystemConstants.js · JobStatus.java).
 * Values are display English names — same strings operators see in Flash/H5.
 */
export const JOB_STATUS: SelectOpt[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Operating', label: 'Operating' },
  { value: 'Pre Commit', label: 'Pre Commit' },
  { value: 'Committing', label: 'Committing' },
  { value: 'Committed', label: 'Committed' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Shut Out', label: 'Shut Out' },
  { value: 'Reject', label: 'Reject' },
]

/** Primary list filter set — matches `SystemConstants.JOB_STATES` Set order. */
export const JOB_STATUS_LIST: SelectOpt[] = [
  { value: 'Operating', label: 'Operating' },
  { value: 'Pre Commit', label: 'Pre Commit' },
  { value: 'Committing', label: 'Committing' },
  { value: 'Committed', label: 'Committed' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Shut Out', label: 'Shut Out' },
]

/** SystemConstants.CARGO_SOURCES */
export const CARGO_SOURCES: SelectOpt[] = [
  { value: 'NC', label: 'Nominated' },
  { value: 'SC', label: 'Free Hand' },
]

/** SeaExportConstants.AUDIT_STATES_LIST */
export const AUDIT_STATES: SelectOpt[] = [
  { value: 'not', label: 'Not audited' },
  { value: 'wait', label: 'Pending' },
  { value: 'agree', label: 'Approved' },
  { value: 'refuse', label: 'Rejected' },
]

/** SystemConstants.PROTOCOL_TYPES / AirExportConstants.PROTOCOL_TYPES */
export const PROTOCOL_TYPES: SelectOpt[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'floating', label: 'Floating' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'casebycase', label: 'Case by case' },
  { value: 'markup', label: 'Markup' },
]

/** AirExportConstants.CUSTOM_CLAIMS — Customs Declaration Way */
export const CUSTOMS_WAYS: SelectOpt[] = [
  { value: '0', label: 'Customer Declaration' },
  { value: '1', label: 'Delegation Declaration' },
  { value: '2', label: 'Self Declaration' },
  { value: '3', label: 'Self Operation' },
  { value: '4', label: 'Self Declaration Manifest' },
]

/** AirExportConstants.CUSTOM_CLAIMS2 — Customs Declaration Type */
export const CUSTOMS_TYPES: SelectOpt[] = [
  { value: '0', label: 'Seal declaration' },
  { value: '1', label: 'Non-seal declaration' },
  { value: '2', label: 'Paperless' },
  { value: '3', label: 'Personal effects' },
  { value: '4', label: 'Repair goods' },
  { value: '5', label: 'Buy declaration' },
  { value: '6', label: '9610 declaration' },
  { value: '7', label: 'Express declaration' },
  { value: '8', label: 'Document declaration' },
  { value: '9', label: 'Clearance integration' },
]

/** SystemConstants.DECLARE_CUSTOMS_STATE — simplified English set for mock */
export const CUSTOMS_DECLARE_STATES: SelectOpt[] = [
  { value: 'empty', label: 'Empty' },
  { value: 'YLR', label: 'Declared' },
  { value: 'YLD', label: 'Released' },
  { value: 'Held', label: 'Held' },
  { value: 'Cleared', label: 'Cleared' },
  { value: 'Rejected', label: 'Rejected' },
]

/** FIELD_TRADETERMS2 */
export const INCO_TERMS: SelectOpt[] = [
  { value: 'EXW', label: 'EXW' },
  { value: 'FOB', label: 'FOB' },
  { value: 'CIF', label: 'CIF' },
  { value: 'CFR', label: 'CFR' },
  { value: 'CIP', label: 'CIP' },
  { value: 'DAP', label: 'DAP' },
  { value: 'DDP', label: 'DDP' },
]

/** FIELD_CUSTOMERTYPE / customer level */
export const CUSTOMER_TIERS: SelectOpt[] = [
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Direct', label: 'Direct customer' },
  { value: 'Peer', label: 'Peer booking' },
]

/** FIELD_CUTOM_JOB_TYPE — demo customized BIZ types */
export const CUSTOM_JOB_TYPES: SelectOpt[] = [
  { value: 'Retail', label: 'Retail' },
  { value: 'Pharma', label: 'Pharma' },
  { value: 'Perishable', label: 'Perishable' },
  { value: 'General', label: 'General' },
]

/** AirExport service products / sale product */
export const SALE_PRODUCTS: SelectOpt[] = [
  { value: 'SX', label: 'Retail Sales' },
  { value: 'BJ', label: 'Charter Flight' },
  { value: 'BB', label: 'Block Space Booking' },
  { value: 'BL', label: 'Volume Commitment' },
  { value: 'DCZ', label: 'Agency Operation' },
  { value: 'FD', label: 'Release Order' },
  { value: 'PER', label: 'Perishable' },
  { value: 'QT', label: 'Others' },
]

export const FULL_OR_INSIDE: SelectOpt[] = [
  { value: 'Full', label: 'Full' },
  { value: 'Inside', label: 'Inside' },
]

/** FIELD_AIRPORT — AU / common demo airports */
export const AIRPORTS: SelectOpt[] = [
  { value: 'SYD', label: 'SYD — Sydney' },
  { value: 'MEL', label: 'MEL — Melbourne' },
  { value: 'BNE', label: 'BNE — Brisbane' },
  { value: 'PER', label: 'PER — Perth' },
  { value: 'ADL', label: 'ADL — Adelaide' },
  { value: 'PVG', label: 'PVG — Shanghai Pudong' },
  { value: 'HKG', label: 'HKG — Hong Kong' },
  { value: 'SIN', label: 'SIN — Singapore' },
  { value: 'LAX', label: 'LAX — Los Angeles' },
  { value: 'NRT', label: 'NRT — Tokyo Narita' },
]

/** FIELD_AIR_COMPANY */
export const AIRLINES: SelectOpt[] = [
  { value: 'Qantas', label: 'Qantas' },
  { value: 'Qantas Freight', label: 'Qantas Freight' },
  { value: 'Cathay Pacific', label: 'Cathay Pacific' },
  { value: 'Singapore Airlines', label: 'Singapore Airlines' },
  { value: 'United Airlines', label: 'United Airlines' },
  { value: 'China Eastern', label: 'China Eastern' },
]

export const AIRLINE_CODES: SelectOpt[] = [
  { value: 'QF', label: 'QF — Qantas' },
  { value: 'CX', label: 'CX — Cathay' },
  { value: 'SQ', label: 'SQ — Singapore Airlines' },
  { value: 'UA', label: 'UA — United' },
  { value: 'MU', label: 'MU — China Eastern' },
]

/** FIELD_OP_OFFICE / FIELD_SALES_OFFICE — AU branches */
export const BRANCHES: SelectOpt[] = [
  { value: 'SYD', label: 'SYD' },
  { value: 'MEL', label: 'MEL' },
  { value: 'BNE', label: 'BNE' },
  { value: 'PER', label: 'PER' },
]

/** FIELD_DEPARTMENT */
export const DEPARTMENTS: SelectOpt[] = [
  { value: 'Air Import Ops', label: 'Air Import Ops' },
  { value: 'Air Export Ops', label: 'Air Export Ops' },
  { value: 'Sydney Sales', label: 'Sydney Sales' },
  { value: 'Melbourne Sales', label: 'Melbourne Sales' },
  { value: 'Customs', label: 'Customs' },
]

/** FIELD_USER role pickers — demo operators */
export const USERS_OPS: SelectOpt[] = [
  { value: 'ops.syd', label: 'ops.syd' },
  { value: 'ops.mel', label: 'ops.mel' },
  { value: 'priya.ops', label: 'Priya (Ops)' },
]

export const USERS_SALES: SelectOpt[] = [
  { value: 'sales.au', label: 'sales.au' },
  { value: 'alex.sales', label: 'Alex (Sales)' },
]

export const USERS_CSR: SelectOpt[] = [
  { value: 'customs.wa', label: 'customs.wa' },
  { value: 'csr.syd', label: 'csr.syd' },
]

export const USERS_GENERIC: SelectOpt[] = [
  { value: 'ops.syd', label: 'ops.syd' },
  { value: 'ops.mel', label: 'ops.mel' },
  { value: 'sales.au', label: 'sales.au' },
  { value: 'docs.syd', label: 'docs.syd' },
  { value: 'jordan.lee', label: 'jordan.lee' },
]

export const FREIGHT_TERMS: SelectOpt[] = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'collect', label: 'Collect' },
]

export const BIOSECURITY: SelectOpt[] = [
  { value: 'none', label: 'None' },
  { value: 'daff_review', label: 'DAFF review' },
  { value: 'permit_required', label: 'Permit required' },
]

export const CLEARANCE_GATES: SelectOpt[] = [
  { value: 'open', label: 'Open' },
  { value: 'held', label: 'Held' },
  { value: 'cleared', label: 'Cleared' },
]

export const MONEY_LOCKS: SelectOpt[] = [
  { value: 'locked', label: 'Locked' },
  { value: 'unlocked', label: 'Unlocked' },
]

export const MARKET_PACKS: SelectOpt[] = [
  { value: 'GLOBAL · AU', label: 'GLOBAL · AU' },
  { value: 'GLOBAL', label: 'GLOBAL' },
  { value: 'GLOBAL · AU · US', label: 'GLOBAL · AU · US' },
]

export const CURRENCIES: SelectOpt[] = [
  { value: 'AUD', label: 'AUD' },
  { value: 'USD', label: 'USD' },
  { value: 'CNY', label: 'CNY' },
  { value: 'EUR', label: 'EUR' },
]

export const HOME_COUNTRIES: SelectOpt[] = [
  { value: 'AU', label: 'AU' },
  { value: 'CN', label: 'CN' },
  { value: 'US', label: 'US' },
]

/**
 * Map catalog field id → select options for fields that are always dropdowns in legacy AS.
 */
export const LEGACY_SELECT_BY_FIELD_ID: Record<string, SelectOpt[]> = {
  // —— Static dropdown / checkbox / radio / tradeterms (AE 空运订舱 + AI 400) ——
  operateType: SERVICE_TYPES,
  status: JOB_STATUS,
  cargoSource: CARGO_SOURCES,
  manageAuditStatus: AUDIT_STATES,
  protocolType: PROTOCOL_TYPES,
  customsWay: CUSTOMS_WAYS,
  customsType: CUSTOMS_TYPES,
  customsStatus: CUSTOMS_DECLARE_STATES,
  shutOut: YES_NO,
  provisioned: YES_NO,
  relevantJob: SHOW_HIDE,
  contractSigned: YES_NO,
  customerTier: CUSTOMER_TIERS,
  customJobType: CUSTOM_JOB_TYPES,
  incoTerm: INCO_TERMS,
  auIncoTerm: INCO_TERMS,
  ifPushSop: YES_NO,
  ifPushSopQ: YES_NO,
  ifPushSopM: YES_NO,
  ifPushSopZ: YES_NO,
  saleProductCode: SALE_PRODUCTS,
  fullOrInside: FULL_OR_INSIDE,

  // —— Airport / airline / office pickers (legacy FIELD_AIRPORT / AIR_COMPANY / OFFICE) ——
  pol: AIRPORTS,
  pod: AIRPORTS,
  airline: AIRLINES,
  airlineCode: AIRLINE_CODES,
  auAirlineCode: AIRLINE_CODES,
  auLoadingPort: AIRPORTS,
  auDischargingPort: AIRPORTS,
  auDestinationPort: AIRPORTS,
  opOffice: BRANCHES,
  salesOffice: BRANCHES,
  auBranch: BRANCHES,
  opDepartment: DEPARTMENTS,
  salesDept: DEPARTMENTS,

  // —— Role users (FIELD_USER) ——
  opId: USERS_OPS,
  salesId: USERS_SALES,
  csrId: USERS_CSR,
  planner: USERS_GENERIC,
  dcId: USERS_GENERIC,
  siteOp: USERS_GENERIC,
  overseaOp: USERS_GENERIC,
  preverifier: USERS_GENERIC,
  createdBy: USERS_GENERIC,
  cargoSalesId: USERS_SALES,

  // —— AU market pack ——
  auFreightTerm: FREIGHT_TERMS,
  auBiosecurityRisk: BIOSECURITY,
  auClearanceGate: CLEARANCE_GATES,
  auMoneyLock: MONEY_LOCKS,
  auMarketPacks: MARKET_PACKS,
  auMarketPack: MARKET_PACKS,
  auCurrency: CURRENCIES,
  auHomeCountry: HOME_COUNTRIES,

  // —— Console consol type ——
  // (operateType already covered)
}

export function applyLegacySelectOptions<T extends { id: string; searchType?: string; searchOptions?: SelectOpt[] }>(
  fields: T[],
): T[] {
  return fields.map((field) => {
    const opts = LEGACY_SELECT_BY_FIELD_ID[field.id]
    if (!opts?.length) return field
    return {
      ...field,
      searchType: 'select' as const,
      searchOptions: opts,
    }
  })
}
