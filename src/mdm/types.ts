/** Operational MDM pick — user sees label; value is business key for adapter/legacy. */
export type MasterKind =
  | 'customer'
  | 'country'
  | 'airport'
  | 'port'
  | 'airline'
  | 'currency'
  | 'charge'

export type MasterApprovalStatus = 'active' | 'pending_approval' | 'rejected'

export interface MasterOption {
  /** Human-readable name shown in the field */
  label: string
  /** Business key stored internally (ISO, IATA, company code) — never a UUID in UI */
  value: string
  kind: MasterKind
  /** Extra search tokens: USA, America, city names, abbreviations */
  aliases?: string[]
  /** Optional secondary line in the list (e.g. city / country) */
  meta?: string
  status?: MasterApprovalStatus
  requestedBy?: string
  approverSeat?: string
}

export type MasterSelection = Pick<
  MasterOption,
  'label' | 'value' | 'kind' | 'status' | 'requestedBy' | 'approverSeat'
> | null

export interface QuickCreateCustomerInput {
  companyName: string
  countryValue: string
  countryLabel: string
  /** Legacy partner role flags — at least one (customer, shipper, agent, …) */
  partnerRoles: string[]
  contactName: string
  contactEmail: string
  /** Credit posture for Finance A — not full legacy credit tab */
  creditMode: 'cash_only' | 'request_terms' | 'hold_finance'
  contactPhone?: string
  address?: string
  city?: string
  taxId?: string
  creditLimit?: string
  creditCurrency?: string
  paymentTermsDays?: string
  salesOwner?: string
  requestedBy: string
}

