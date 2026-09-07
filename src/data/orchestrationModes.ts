import type { SpineLobPrefix } from '@/types/spineLob'
import type { LobCode } from '@/lib/lob'

/** Transport mode card for New Shipment Wizard (concept → OS LOB map). */
export type TransportModeId = 'ftl' | 'ltl' | 'air' | 'ocean' | 'parcel' | 'rail'

export interface TransportModeOption {
  id: TransportModeId
  label: string
  description: string
  meta: string
  /** Estimated sell (AUD) from mock rate table */
  estimatedCost: number
  /** Midpoint delivery days for chart X */
  deliveryDaysMid: number
  deliveryLabel: string
  recommended?: boolean
  /** Maps to Create Job / spine LOB */
  spinePrefix: SpineLobPrefix
  /** Preferred freight LOB when booking */
  defaultLob: LobCode
  /** Chart point label */
  chartTag?: 'cheapest' | 'fastest' | 'balance'
}

export const TRANSPORT_MODES: TransportModeOption[] = [
  {
    id: 'ftl',
    label: 'Full Truckload (FTL)',
    description: 'Dedicated truck. Best for 10+ pallets or time-critical domestic moves.',
    meta: 'AVG 1–5 DAYS · HIGH CAPACITY',
    estimatedCost: 1200,
    deliveryDaysMid: 6,
    deliveryLabel: '5–7 Days',
    recommended: true,
    spinePrefix: 'TR',
    defaultLob: 'road_export',
    chartTag: 'balance',
  },
  {
    id: 'ltl',
    label: 'Less-Than-Truckload (LTL)',
    description: 'Share truck space with other shippers. Best for 1–10 pallets.',
    meta: 'AVG 2–5 DAYS · COST-EFFICIENT',
    estimatedCost: 680,
    deliveryDaysMid: 4,
    deliveryLabel: '2–5 Days',
    spinePrefix: 'TR',
    defaultLob: 'road_export',
  },
  {
    id: 'air',
    label: 'Air Freight',
    description: 'Fastest option for urgent or high-value goods. Premium pricing.',
    meta: 'AVG 1–3 DAYS · HIGHEST COST',
    estimatedCost: 2400,
    deliveryDaysMid: 2,
    deliveryLabel: '1–3 Days',
    spinePrefix: 'AE',
    defaultLob: 'air_export',
    chartTag: 'fastest',
  },
  {
    id: 'ocean',
    label: 'Ocean Freight',
    description: 'FCL/LCL for international bulk. Lowest cost per unit at volume.',
    meta: 'AVG 14–45 DAYS · LOWEST COST / UNIT',
    estimatedCost: 520,
    deliveryDaysMid: 28,
    deliveryLabel: '14–45 Days',
    spinePrefix: 'OE',
    defaultLob: 'sea_export',
    chartTag: 'cheapest',
  },
  {
    id: 'parcel',
    label: 'Parcel',
    description: 'Packages under 150 lb. Carrier networks for door-to-door smalls.',
    meta: 'AVG 1–7 DAYS · DOOR-TO-DOOR',
    estimatedCost: 180,
    deliveryDaysMid: 3,
    deliveryLabel: '1–7 Days',
    spinePrefix: 'TR',
    defaultLob: 'road_export',
  },
  {
    id: 'rail',
    label: 'Rail / International',
    description: 'Cost-effective long-haul. Lower carbon footprint than trucking.',
    meta: 'AVG 3–10 DAYS · LOW COST',
    estimatedCost: 890,
    deliveryDaysMid: 8,
    deliveryLabel: '3–10 Days',
    spinePrefix: 'TR',
    defaultLob: 'road_export',
  },
]

export const WIZARD_STEPS = [
  { id: 1, label: 'Transport Mode' },
  { id: 2, label: 'Origin & Destination' },
  { id: 3, label: 'Cargo Details' },
  { id: 4, label: 'Select Rate' },
  { id: 5, label: 'Review & Book' },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id']

/** Smooth curve anchors for Price vs Delivery Time (concept chart). */
export const PRICE_CURVE_POINTS: { days: number; price: number }[] = [
  { days: 1.5, price: 2400 },
  { days: 3, price: 1800 },
  { days: 6, price: 1200 },
  { days: 10, price: 900 },
  { days: 18, price: 650 },
  { days: 28, price: 520 },
]

export function modeById(id: TransportModeId): TransportModeOption {
  return TRANSPORT_MODES.find((m) => m.id === id) ?? TRANSPORT_MODES[0]
}
