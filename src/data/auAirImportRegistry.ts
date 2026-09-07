import type { AuImportLane, AuImportParty } from '@/types/auAirImport'

/** MDM-style parties — picking one inherits contact, ref pattern, delivery. */
export const AU_PARTIES: AuImportParty[] = [
  {
    id: 'cust-srg',
    name: 'Sydney Retail Group Pty Ltd',
    abnHint: 'ABN 52 123 456 789',
    abn: '52123456789',
    contact: '+61 2 9000 1234 · import@sydneyretail.au',
    defaultRefPrefix: 'SRG-IMP',
    defaultDelivery: '12 George St, Sydney NSW 2000',
    role: 'customer',
  },
  {
    id: 'cust-pharma',
    name: 'Sydney Pharma',
    abnHint: 'ABN pending MDM',
    contact: '+61 2 9555 4400 · qa@sydneypharma.au',
    defaultRefPrefix: 'SP-IMP',
    defaultDelivery: '45 Parramatta Rd, Homebush NSW 2140',
    role: 'customer',
  },
  {
    id: 'ship-shanghai',
    name: 'Shanghai Components Co.',
    abnHint: 'CN exporter',
    contact: 'export@shcomp.cn · +86 21 5555 0100',
    defaultRefPrefix: 'SHC',
    role: 'shipper',
  },
  {
    id: 'ship-hkg-pharma',
    name: 'HKG Pharma Ltd',
    abnHint: 'HK shipper',
    contact: 'ops@hkgpharma.hk',
    defaultRefPrefix: 'HKG',
    role: 'shipper',
  },
  {
    id: 'cons-srg',
    name: 'Sydney Retail Group Pty Ltd',
    abnHint: 'Same as owner',
    contact: '+61 2 9000 1234',
    defaultRefPrefix: 'SRG',
    defaultDelivery: '12 George St, Sydney NSW 2000',
    role: 'consignee',
  },
  {
    id: 'cons-pharma',
    name: 'Sydney Pharma',
    abnHint: 'Importer of record',
    contact: '+61 2 9555 4400',
    defaultRefPrefix: 'SP',
    defaultDelivery: '45 Parramatta Rd, Homebush NSW 2140',
    role: 'consignee',
  },
]

/** Trade lanes — picking one inherits ports, airline, typical dates & money hints. */
export const AU_LANES: AuImportLane[] = [
  {
    id: 'pvg-syd',
    label: 'PVG → SYD (electronics)',
    routeDisplay: 'PVG ✈ SYD',
    defaultCountryOfOrigin: 'CN',
    defaultCommodityHs: '8471.30 (pending broker)',
    defaultBiosecurityRisk: 'none',
    loadingPort: 'PVG',
    dischargingPort: 'SYD',
    destinationPort: 'SYD',
    airlineCode: 'QF',
    airlineName: 'Qantas',
    typicalEtd: '28 Jul 18:00',
    typicalEta: '01 Aug 06:30',
    typicalFreightAud: '4,200',
    typicalInsuranceAud: '180',
  },
  {
    id: 'hkg-syd',
    label: 'HKG → SYD (pharma)',
    routeDisplay: 'HKG ✈ SYD',
    defaultCountryOfOrigin: 'HK',
    defaultCommodityHs: '3004.90 (pharma — broker confirm)',
    defaultBiosecurityRisk: 'daff_review',
    loadingPort: 'HKG',
    dischargingPort: 'SYD',
    destinationPort: 'SYD',
    airlineCode: 'CX',
    airlineName: 'Cathay Pacific',
    typicalEtd: '10 Aug 22:10',
    typicalEta: '11 Aug 05:55',
    typicalFreightAud: '2,800',
    typicalInsuranceAud: '120',
  },
  {
    id: 'sin-mel',
    label: 'SIN → MEL (general)',
    routeDisplay: 'SIN ✈ MEL',
    defaultCountryOfOrigin: 'SG',
    defaultCommodityHs: '',
    defaultBiosecurityRisk: 'none',
    loadingPort: 'SIN',
    dischargingPort: 'MEL',
    destinationPort: 'MEL',
    airlineCode: 'SQ',
    airlineName: 'Singapore Airlines',
    typicalEtd: '14 Aug 09:00',
    typicalEta: '14 Aug 18:40',
    typicalFreightAud: '3,100',
    typicalInsuranceAud: '95',
  },
]

export const AU_AIRLINE_OPTIONS = [
  { value: 'QF', label: 'QF · Qantas' },
  { value: 'CX', label: 'CX · Cathay Pacific' },
  { value: 'SQ', label: 'SQ · Singapore Airlines' },
  { value: 'UA', label: 'UA · United' },
]

export function partyById(id: string): AuImportParty | undefined {
  return AU_PARTIES.find((p) => p.id === id)
}

export function laneById(id: string): AuImportLane | undefined {
  return AU_LANES.find((l) => l.id === id)
}

export const AU_BIOSECURITY_OPTIONS = [
  { value: 'none', label: 'No DAFF flag' },
  { value: 'daff_review', label: 'DAFF review likely' },
  { value: 'permit_required', label: 'Permit / treatment may apply' },
]

export const AU_FREIGHT_TERM_OPTIONS = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'collect', label: 'Collect' },
]

export const AU_ORIGIN_COUNTRIES = [
  { value: 'CN', label: 'CN · China' },
  { value: 'HK', label: 'HK · Hong Kong' },
  { value: 'SG', label: 'SG · Singapore' },
  { value: 'US', label: 'US · United States' },
  { value: 'JP', label: 'JP · Japan' },
]

export function partiesForRole(role: AuImportParty['role']): AuImportParty[] {
  return AU_PARTIES.filter((p) => p.role === role)
}
