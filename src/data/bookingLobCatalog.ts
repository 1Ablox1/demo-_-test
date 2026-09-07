import type { SpineLobPrefix } from '@/types/spineLob'
import { SPINE_LOB_OPTIONS } from '@/types/spineLob'

/**
 * Expandable LOB catalog for Book entry — searchable list, not mode tiles.
 * Extra codes show how the picker scales; spine still maps to Echo prefixes.
 */
export interface BookingLobOption {
  prefix: SpineLobPrefix
  code: string
  label: string
  mode: 'Air' | 'Ocean' | 'Land' | 'Rail' | 'Parcel'
  keywords: string
  /** When true, shown as available Module-1 / demo spine LOB */
  spineReady: boolean
}

export const BOOKING_LOB_CATALOG: BookingLobOption[] = [
  {
    prefix: 'AI',
    code: 'AI',
    label: 'Air Import',
    mode: 'Air',
    keywords: 'air import inbound hawb mawb',
    spineReady: true,
  },
  {
    prefix: 'AE',
    code: 'AE',
    label: 'Air Export',
    mode: 'Air',
    keywords: 'air export outbound hawb mawb',
    spineReady: true,
  },
  {
    prefix: 'OI',
    code: 'OI',
    label: 'Ocean Import',
    mode: 'Ocean',
    keywords: 'sea ocean import fcl lcl hbl mbl',
    spineReady: true,
  },
  {
    prefix: 'OE',
    code: 'OE',
    label: 'Ocean Export',
    mode: 'Ocean',
    keywords: 'sea ocean export fcl lcl hbl mbl',
    spineReady: true,
  },
  {
    prefix: 'TR',
    code: 'TR',
    label: 'Trucking / Land',
    mode: 'Land',
    keywords: 'road truck ftl ltl domestic',
    spineReady: true,
  },
  {
    prefix: 'TR',
    code: 'RE',
    label: 'Rail Export',
    mode: 'Rail',
    keywords: 'rail export intermodal',
    spineReady: false,
  },
  {
    prefix: 'TR',
    code: 'RI',
    label: 'Rail Import',
    mode: 'Rail',
    keywords: 'rail import intermodal',
    spineReady: false,
  },
  {
    prefix: 'TR',
    code: 'PR',
    label: 'Parcel / Courier',
    mode: 'Parcel',
    keywords: 'parcel courier express smalls',
    spineReady: false,
  },
]

export function filterBookingLobs(query: string): BookingLobOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return BOOKING_LOB_CATALOG
  return BOOKING_LOB_CATALOG.filter(
    (l) =>
      l.code.toLowerCase().includes(q) ||
      l.label.toLowerCase().includes(q) ||
      l.mode.toLowerCase().includes(q) ||
      l.keywords.includes(q),
  )
}

export function groupBookingLobs(list: BookingLobOption[]) {
  const order = ['Air', 'Ocean', 'Land', 'Rail', 'Parcel'] as const
  return order
    .map((mode) => ({
      mode,
      items: list.filter((l) => l.mode === mode),
    }))
    .filter((g) => g.items.length > 0)
}

export function spineReadyPrefixes(): SpineLobPrefix[] {
  return SPINE_LOB_OPTIONS.map((o) => o.prefix)
}
