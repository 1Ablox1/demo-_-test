/**
 * P0 Market Pack manifests — GLOBAL + AU + US (western-ui scope).
 * Standards link to M·G·T gates/tasks; they do not replace GLOBAL milestones.
 * @see docs/MARKET-PACKS-GUIDE.md
 */

import baselineRaciCatalog from '@/data/raciCatalog'

export type RegionGroup = 'GLOBAL' | 'AMER' | 'APAC'

export interface RegulatoryStandard {
  id: string
  code: string
  title: string
  authority: string
  whyWeCare: string
  officialUrl: string
  linkedTaskIds: string[]
}

export interface SampleGate {
  gateId: string
  label: string
  reason: string
  blockedActions: string[]
  responsibleRole: string
  linkedTaskId: string
}

export interface MarketPackManifest {
  id: string
  name: string
  regionGroup: RegionGroup
  sopVersion: string
  summary: string
  appliesWhen: string
  standards: RegulatoryStandard[]
  sampleGates: SampleGate[]
  requires: string[]
}

export interface CorridorScenario {
  id: string
  label: string
  jobHint: string
  packIds: string[]
  taskId: string
}

export const MARKET_PACK_REGISTRY: Record<string, MarketPackManifest> = {
  GLOBAL: {
    id: 'GLOBAL',
    name: 'Universal freight core spine',
    regionGroup: 'GLOBAL',
    sopVersion: 'v2.4.1',
    summary:
      'Mandatory Quote-to-Cash constitution: IATA/CASS, MAWB/HAWB, sanctions pre-screen, Documents-before-Charges. Geo packs stack on this spine — they never replace it.',
    appliesWhen: 'Always. GLOBAL cannot be disabled.',
    standards: [
      {
        id: 'MGT',
        code: 'M·G·T',
        title: 'GLOBAL milestones',
        authority: 'CargoWare OS constitution',
        whyWeCare: 'Quote → Booking → Documents → Charges → Invoice is country-agnostic. Packs inject gates inside milestones.',
        officialUrl: 'https://example.com/docs/global-spine',
        linkedTaskIds: ['11-01', '02-09'],
      },
      {
        id: 'SANCTIONS',
        code: 'Sanctions',
        title: 'Party pre-screen gate',
        authority: 'Tenant compliance policy',
        whyWeCare: '01-03 blocks quote acceptance until parties are cleared.',
        officialUrl: 'https://www.iata.org/en/programs/workgroups/cargo/',
        linkedTaskIds: ['01-03'],
      },
    ],
    sampleGates: [
      {
        gateId: 'gate-docs-before-charges',
        label: 'Documents before Charges',
        reason: 'Core Q2C money gate — accrue waits on document clearance.',
        blockedActions: ['Accrue Charges'],
        responsibleRole: 'Air Export',
        linkedTaskId: '11-01',
      },
    ],
    requires: [],
  },
  AU: {
    id: 'AU',
    name: 'Australia overlay',
    regionGroup: 'APAC',
    sopVersion: 'v1.3.2',
    summary:
      'OS operate now: clearance chip, GST hints, biosecurity holds, money lock when held. Deep ICS/N10 filing = Ctrl-X later.',
    appliesWhen: 'Australian import or export, or AU GST treatment on the file.',
    standards: [
      {
        id: 'AU-CLEARANCE',
        code: 'Clearance chip',
        title: 'Import clearance status (OS operate)',
        authority: 'ABF / biosecurity posture',
        whyWeCare: 'Status-only clearance chip on job Local Frame — not deep ICS client in OS.',
        officialUrl: 'https://www.abf.gov.au/help-and-support/ics/integrated-cargo-system-(ics)',
        linkedTaskIds: ['03-08', '03-03'],
      },
      {
        id: 'AU-GST',
        code: 'GST / ATO',
        title: 'GST on importations',
        authority: 'ATO / ABF',
        whyWeCare: 'GST treatment before accrual; company ABN/GST fields live on Tenant Admin.',
        officialUrl: 'https://www.ato.gov.au/',
        linkedTaskIds: ['03-05', '08-09', '11-01'],
      },
      {
        id: 'AU-BIO',
        code: 'Biosecurity',
        title: 'Biosecurity / DAFF holds',
        authority: 'DAFF',
        whyWeCare: 'Hold chips under Documents milestone until release.',
        officialUrl: 'https://www.abf.gov.au/',
        linkedTaskIds: ['03-03', '03-08'],
      },
    ],
    sampleGates: [
      {
        gateId: 'gate-au-clearance-held',
        label: 'AU Import Clearance Chip — Held',
        reason: 'Clearance not granted. Accrue and approve stay locked until hold clears.',
        blockedActions: ['Accrue Charges', 'Approve Charges'],
        responsibleRole: 'Air Import',
        linkedTaskId: '03-08',
      },
    ],
    requires: ['GLOBAL'],
  },
  US: {
    id: 'US',
    name: 'United States overlay',
    regionGroup: 'AMER',
    sopVersion: 'v1.8.0',
    summary:
      'Corridor overlay: AES/EEI filing gate under Documents. Required when LAX branch or US export lane is live.',
    appliesWhen: 'US origin or destination, or US filing required on the lane.',
    standards: [
      {
        id: 'US-AES',
        code: 'AES / EEI',
        title: 'Automated Export System',
        authority: 'U.S. Census / CBP',
        whyWeCare: 'ITN / EEI proof before carrier departure; blocks money when missing.',
        officialUrl: 'https://www.census.gov/foreign-trade/aes/index.html',
        linkedTaskIds: ['02-08', '08-10'],
      },
    ],
    sampleGates: [
      {
        gateId: 'gate-us-aes',
        label: 'AES Export Filing Missing',
        reason: 'No ITN on file for US export.',
        blockedActions: ['Accrue Charges', 'Approve Charges'],
        responsibleRole: 'Air Export',
        linkedTaskId: '02-08',
      },
    ],
    requires: ['GLOBAL'],
  },
}

export const PACK_ORDER = ['GLOBAL', 'US', 'AU'] as const

export const COUNTRY_TO_PACK: Record<string, string> = {
  US: 'US',
  AU: 'AU',
}

export function packIdForCountry(countryCode: string): string | null {
  const packId = COUNTRY_TO_PACK[countryCode.toUpperCase()]
  return packId && MARKET_PACK_REGISTRY[packId] ? packId : null
}

export function packIdsForCountryCodes(countryCodes: string[]): string[] {
  const overlays = new Set<string>()
  for (const code of countryCodes) {
    const packId = packIdForCountry(code)
    if (packId) overlays.add(packId)
  }
  return PACK_ORDER.filter((id) => id === 'GLOBAL' || overlays.has(id))
}

export function listPacks(): MarketPackManifest[] {
  return PACK_ORDER.map((id) => MARKET_PACK_REGISTRY[id]).filter(Boolean)
}

export function overlayPacks(): MarketPackManifest[] {
  return listPacks().filter((p) => p.id !== 'GLOBAL')
}

export function linkedTaskIdsForPack(pack: MarketPackManifest): string[] {
  const ids = new Set<string>()
  for (const s of pack.standards) {
    for (const id of s.linkedTaskIds) ids.add(id)
  }
  for (const g of pack.sampleGates) ids.add(g.linkedTaskId)
  return [...ids].filter((id) => baselineRaciCatalog.getTask(id))
}

export const CORRIDOR_SCENARIOS: CorridorScenario[] = [
  {
    id: 'us-export-air',
    label: 'US export · Air',
    jobHint: 'AE-8801 · task 02-08',
    packIds: ['GLOBAL', 'US'],
    taskId: '02-08',
  },
  {
    id: 'au-import-air',
    label: 'AU import · Air',
    jobHint: 'AI-8790 · task 03-08',
    packIds: ['GLOBAL', 'AU'],
    taskId: '03-08',
  },
]

export const HQ_COUNTRY_OPTIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'SG', label: 'Singapore' },
  { code: 'UK', label: 'United Kingdom' },
] as const

export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  AU: 'AUD',
  US: 'USD',
  SG: 'SGD',
  UK: 'GBP',
}
