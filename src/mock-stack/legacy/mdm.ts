import {
  masterAirlines,
  masterAirports,
  masterChargeCodes,
  masterCountries,
  masterCurrencies,
  masterCustomers,
} from '@/mocks/fixtures/masters'
import type { MasterKind, MasterOption, QuickCreateCustomerInput } from '@/mdm/types'
import type { LegacyPartyDraft } from '@/mock-stack/legacy/types'

const pendingParties: LegacyPartyDraft[] = []
const activeDrafts: MasterOption[] = []

export type MdmSearchKind = Extract<
  MasterKind,
  'customer' | 'airport' | 'country' | 'airline' | 'charge' | 'currency'
>

function slugCode(name: string) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12)
  return `DRAFT-${base || 'CUST'}-${Date.now().toString(36).toUpperCase()}`
}

function poolFor(kind: MdmSearchKind): MasterOption[] {
  switch (kind) {
    case 'customer':
      return [...activeDrafts, ...masterCustomers]
    case 'airport':
      return masterAirports
    case 'country':
      return masterCountries
    case 'airline':
      return masterAirlines
    case 'charge':
      return masterChargeCodes
    case 'currency':
      return masterCurrencies
  }
}

/**
 * Mock legacy mdm-service — SoR stand-in.
 * Production: adapter calls real mdm-service; this file goes away.
 */
export const legacyMdm = {
  searchPartners(query: string, kind: MdmSearchKind): MasterOption[] {
    const q = query.trim().toLowerCase()
    const pool = poolFor(kind)
    if (!q) return pool.slice(0, 12)
    return pool
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          o.aliases?.some((a) => a.toLowerCase().includes(q)),
      )
      .slice(0, 12)
  },

  createPartyDraft(input: QuickCreateCustomerInput): MasterOption {
    const value = slugCode(input.companyName)
    const roles = input.partnerRoles.join('+')
    const credit =
      input.creditMode === 'cash_only'
        ? 'Cash only'
        : input.creditMode === 'request_terms'
          ? 'Terms requested'
          : 'Credit hold'
    const opt: MasterOption = {
      kind: 'customer',
      label: input.companyName.trim(),
      value,
      aliases: [input.companyName.trim()],
      meta: `${roles} · ${input.countryLabel} · ${credit} · Pending Finance`,
      status: 'pending_approval',
      requestedBy: input.requestedBy,
      approverSeat: 'Finance',
    }
    activeDrafts.unshift(opt)
    pendingParties.unshift({
      uuid: `party-${value}`,
      companyName: input.companyName.trim(),
      countryCode: input.countryValue,
      partnerRoles: input.partnerRoles,
      creditMode: input.creditMode,
      status: 'pending_approval',
      requestedBy: input.requestedBy,
      createdAt: new Date().toISOString(),
    })
    return opt
  },

  listPendingParties() {
    return [...pendingParties]
  },

  listActiveDrafts() {
    return [...activeDrafts]
  },

  approveParty(value: string) {
    const hit = activeDrafts.find((c) => c.value === value)
    if (hit) {
      hit.status = 'active'
      hit.meta = hit.meta?.replace(' · Pending Finance', ' · Active') ?? 'Customer · Active'
    }
    const p = pendingParties.find((x) => x.uuid === `party-${value}`)
    if (p) p.status = 'active'
  },
}
