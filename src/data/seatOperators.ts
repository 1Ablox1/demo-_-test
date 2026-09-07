/**
 * Named seat operators — distinct people per seat / lifecycle gate
 * so RACI never looks like one person doing every step.
 */

export type SeatKey = 'sales' | 'operations' | 'finance' | 'customs' | 'delivery' | 'admin'

export interface SeatOperator {
  id: string
  /** Display name */
  name: string
  /** Short seat label */
  seat: string
  seatKey: SeatKey
  /** "Import Air Ops — Priya N." */
  label: string
}

function op(
  id: string,
  name: string,
  seat: string,
  seatKey: SeatKey,
): SeatOperator {
  return { id, name, seat, seatKey, label: `${seat} — ${name}` }
}

/** Roster used across Book, Job spine, Needs You, focus panels. */
export const SEAT_OPERATORS = {
  /** Sales / quote */
  salesLead: op('op-mei', 'Mei Chen', 'Sales', 'sales'),
  salesAssist: op('op-jordan', 'Jordan Lee', 'Sales CS', 'sales'),
  /** Export / booking ops */
  bookingOps: op('op-alex', 'Alex Rivera', 'Export Air Ops', 'operations'),
  /** Import clearance (AU) — different from booking */
  customsOps: op('op-priya', 'Priya Nair', 'Import Air Ops', 'customs'),
  /** Broker liaison (consulted) */
  brokerDesk: op('op-tom', 'Tom Walsh', 'Customs Broker', 'customs'),
  /** Flight / uplift */
  flightDesk: op('op-sam', 'Sam Okonkwo', 'Airline Desk', 'operations'),
  /** Terminal / arrival */
  arrivalDesk: op('op-hana', 'Hana Park', 'Terminal Ops', 'operations'),
  /** Last mile */
  deliveryDesk: op('op-luis', 'Luis Ortega', 'Delivery Coord', 'delivery'),
  /** Finance accountable for money / clearance stamp */
  financeLead: op('op-claire', 'Claire Nguyen', 'Finance', 'finance'),
  financeAp: op('op-devon', 'Devon Brooks', 'AP Desk', 'finance'),
  /** Invoice / collections */
  invoiceDesk: op('op-rita', 'Rita Gomez', 'Billing', 'finance'),
} as const

export type OperatorId = keyof typeof SEAT_OPERATORS

/** Lifecycle spine: each node a different person + RACI mark. */
export const LIFECYCLE_RACI: Record<
  'booking' | 'flight' | 'customs' | 'arrival' | 'delivery',
  { operator: OperatorId; raci: 'R' | 'A' | 'C' | 'I'; accountable?: OperatorId }
> = {
  booking: { operator: 'bookingOps', raci: 'R', accountable: 'salesLead' },
  flight: { operator: 'flightDesk', raci: 'R', accountable: 'bookingOps' },
  customs: { operator: 'customsOps', raci: 'R', accountable: 'financeLead' },
  arrival: { operator: 'arrivalDesk', raci: 'R', accountable: 'customsOps' },
  delivery: { operator: 'deliveryDesk', raci: 'R', accountable: 'arrivalDesk' },
}

export function operatorLabel(id: OperatorId): string {
  return SEAT_OPERATORS[id].label
}

export function operatorName(id: OperatorId): string {
  return SEAT_OPERATORS[id].name
}

export function operatorSeat(id: OperatorId): string {
  return SEAT_OPERATORS[id].seat
}

/** Desk labels for focus “who did / next” with named people. */
export function priorDeskNamed(milestone: string): string {
  const map: Record<string, OperatorId> = {
    Quote: 'salesAssist',
    Booking: 'salesLead',
    Docs: 'bookingOps',
    Charges: 'customsOps',
    Invoice: 'financeAp',
  }
  const id = map[milestone] ?? 'bookingOps'
  const o = SEAT_OPERATORS[id]
  return `${o.label} · done`
}

export function nextDeskNamed(milestone: string): string {
  const map: Record<string, OperatorId> = {
    Quote: 'bookingOps',
    Booking: 'customsOps',
    Docs: 'financeAp',
    Charges: 'invoiceDesk',
    Invoice: 'financeLead',
  }
  const id = map[milestone] ?? 'arrivalDesk'
  const o = SEAT_OPERATORS[id]
  return `${o.label} · waiting`
}

export function workingNowNamed(handledBy: string, seatLabel: string): string {
  const byName: Record<string, OperatorId> = {
    'Mei Chen': 'salesLead',
    'Jordan Lee': 'salesAssist',
    'Alex Rivera': 'bookingOps',
    'Priya Nair': 'customsOps',
    'Tom Walsh': 'brokerDesk',
    'Sam Okonkwo': 'flightDesk',
    'Hana Park': 'arrivalDesk',
    'Luis Ortega': 'deliveryDesk',
    'Claire Nguyen': 'financeLead',
    'Devon Brooks': 'financeAp',
    'Rita Gomez': 'invoiceDesk',
  }
  if (byName[handledBy]) return SEAT_OPERATORS[byName[handledBy]].label

  const bySeat: Record<string, OperatorId> = {
    Sales: 'salesLead',
    Ops: 'customsOps',
    Operations: 'customsOps',
    Finance: 'financeAp',
  }
  const id = bySeat[handledBy] ?? bySeat[seatLabel] ?? 'bookingOps'
  return SEAT_OPERATORS[id].label
}
