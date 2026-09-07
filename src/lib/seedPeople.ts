import type { ActingRole } from '@/api/types'

/**
 * Shell seed cast — aligned with docs/OS-SHELL-USER-ROLES-GUIDE.md
 * Identity (Users) ≠ L0 function ≠ L2 dispatch seat.
 */
export const SEED_PEOPLE = {
  operations: {
    id: 'user-sarah',
    name: 'Sarah Jenkins',
    shortName: 'Sarah',
    /** L0 functions (Seats & RACI) */
    l0: ['Air Export', 'Air Import'] as const,
    l2: 'operations' as const,
  },
  sales: {
    id: 'user-alex',
    name: 'Alex Rivera',
    shortName: 'Alex',
    l0: ['Pricing'] as const,
    l2: 'sales' as const,
  },
  finance: {
    id: 'user-marcello',
    name: 'Marcello Vance',
    shortName: 'Marcello',
    l0: ['Billing'] as const,
    l2: 'finance' as const,
  },
  admin: {
    id: 'user-admin',
    name: 'Admin',
    shortName: 'Admin',
    l0: [] as const,
    l2: 'admin' as const,
  },
} as const

/** L2 dispatch seat labels (Hugh desk language) */
export const L2_SEAT_LABELS: Record<ActingRole, string> = {
  operations: 'Operations',
  sales: 'Sales',
  finance: 'Finance',
  admin: 'Admin',
}

export function personForSeat(seat: ActingRole) {
  return SEED_PEOPLE[seat]
}

export function l2Label(seat: ActingRole): string {
  return L2_SEAT_LABELS[seat]
}

/** Dense chip / strip: "Sarah · Operations" */
export function ownershipLabel(name: string, seat: string): string {
  return `${name} · ${seat}`
}

/** Prefer first name on h-11 chips; full name in tooltip */
export function chipPersonLabel(personName?: string, seat?: string): string {
  if (personName) {
    const first = personName.trim().split(/\s+/)[0]
    return first
  }
  return seat ?? '—'
}
