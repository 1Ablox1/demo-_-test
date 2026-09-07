export type CountryCode = 'AU' | 'US' | 'SG' | 'GB' | 'CA' | 'DE' | 'NZ'

export type BackendEnv = 'h5-stage-db' | 'h5-prod-db' | 'mock-local'

export type LocationKind = 'HQ' | 'BRANCH'

export type BranchStatus = 'active' | 'inactive'

/** Operating office — work is always scoped to the user's active branch. */
export interface TenantBranch {
  branchId: string
  officeCode: string
  /** Operator-facing branch name (not a city picker). */
  branchName: string
  /** City is address metadata for Admin / MDM — not the shell switcher label. */
  city: string
  /** When true, countryCode tracks tenant HQ country. */
  inheritCountry: boolean
  countryCode: CountryCode
  /** IANA timezone — defaults from country if omitted at create. */
  timezone: string
  status: BranchStatus
  /** Optional currency override; otherwise resolved from effective country schema. */
  currencyOverride?: string | null
}

export interface TenantRecord {
  tenantId: string
  name: string
  legalName: string
  /** Home domicile — admin-configured, singular. */
  hqCountryCode: CountryCode
  /** Which branch is the HQ office (must exist in branches). */
  hqBranchId: string
  /** Home currency code — usually from HQ country schema; stored for clarity. */
  homeCurrency: string
  branches: TenantBranch[]
}

/**
 * Runtime resolution for Book / Job / Needs You.
 * Fallback chain: branch override → HQ → system default.
 */
export interface ResolvedBranchContext {
  tenantId: string
  branchId: string
  officeCode: string
  branchName: string
  isHq: boolean
  countryCode: CountryCode
  inheritCountry: boolean
  timezone: string
  currency: string
  packId: string
  homeCurrency: string
  hqCountryCode: CountryCode
  hqBranchId: string
}

export interface RequestContext {
  env: BackendEnv
  tenantId: string
  branchId: string
  countryCode: string
  headers: Record<string, string>
  payload: {
    tenantId: string
    branchId: string
    countryCode: string
    env: BackendEnv
  }
}

export interface RecordedRequest {
  path: string
  method: string
  at: string
  context: RequestContext
  body?: unknown
}

export type FieldGroup = 'company' | 'tax' | 'customs' | 'banking' | 'permissions'

export type FieldKind = 'text' | 'toggle' | 'select'

export interface DynamicFieldDef {
  key: string
  label: string
  group: FieldGroup
  kind: FieldKind
  required: boolean
  placeholder?: string
  pattern?: string
  patternMessage?: string
  help?: string
  options?: { value: string; label: string }[]
}

export type FieldValue = string | boolean

export interface CountryFieldSchema {
  countryCode: CountryCode
  packId: string | null
  displayName: string
  currency: string
  taxLabel: string
  taxRate: number
  taxAppliesToInvoice: boolean
  fields: DynamicFieldDef[]
}

/** Default IANA timezone by country — used when adding a branch. */
export const DEFAULT_TZ_BY_COUNTRY: Record<CountryCode, string> = {
  AU: 'Australia/Sydney',
  US: 'America/Los_Angeles',
  SG: 'Asia/Singapore',
  GB: 'Europe/London',
  CA: 'America/Toronto',
  DE: 'Europe/Berlin',
  NZ: 'Pacific/Auckland',
}
