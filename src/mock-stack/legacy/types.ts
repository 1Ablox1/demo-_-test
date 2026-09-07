/** Simulated legacy CargoWare DTOs (Zuul / microservice shapes). */

export type LegacyService =
  | 'booking-service'
  | 'act-service'
  | 'mdm-service'
  | 'sys-service'
  | 'price-service'

export interface LegacyAirExportJob {
  uuid: string
  jobNo: string
  hawb: string | null
  mawb: string | null
  operateType: number
  mblOnly: boolean
  customerName: string
  lane: string
  opOffice: string
}

export interface LegacyPartyDraft {
  uuid: string
  companyName: string
  countryCode: string
  partnerRoles: string[]
  creditMode: string
  status: 'pending_approval' | 'active'
  requestedBy: string
  createdAt: string
}
