import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  approveOsMdmParty,
  createOsMdmParty,
  searchOsMdm,
} from '@/api/client'
import type { MasterOption, QuickCreateCustomerInput } from '@/mdm/types'
import { pushRecentValue } from '@/mdm/search'
import {
  masterAirports,
  masterChargeCodes,
  masterCountries,
  masterCurrencies,
  masterAirlines,
  masterCustomers,
} from '@/mocks/fixtures/masters'

/**
 * Operational MDM store — UI cache over `/os/mdm/*`.
 * SoR remains legacy (via adapter). Do not treat this as a second MDM Admin.
 */
export const useMastersStore = defineStore('masters', () => {
  const draftCustomers = ref<MasterOption[]>([])
  const catalogLoaded = ref(false)
  const catalogCustomers = ref<MasterOption[]>([...masterCustomers])
  const loading = ref(false)

  const customers = computed((): MasterOption[] => [
    ...draftCustomers.value,
    ...catalogCustomers.value.filter(
      (c) => !draftCustomers.value.some((d) => d.value === c.value),
    ),
  ])

  const airports = computed(() => masterAirports)
  const countries = computed(() => masterCountries)
  const airlines = computed(() => masterAirlines)
  const chargeCodes = computed(() => masterChargeCodes)
  const currencies = computed(() => masterCurrencies)

  const pendingCustomers = computed(() =>
    draftCustomers.value.filter((c) => c.status === 'pending_approval'),
  )

  async function refreshCustomers(q = '') {
    loading.value = true
    try {
      const res = await searchOsMdm('customer', q)
      const items = res.items ?? []
      if (!q) {
        catalogCustomers.value = items.length ? items : [...masterCustomers]
        catalogLoaded.value = true
      }
      return items
    } catch {
      if (!catalogLoaded.value) catalogCustomers.value = [...masterCustomers]
      return customers.value
    } finally {
      loading.value = false
    }
  }

  async function search(kind: 'customer' | 'airport' | 'country' | 'airline' | 'charge' | 'currency', q: string) {
    try {
      const res = await searchOsMdm(kind, q)
      return res.items ?? []
    } catch {
      const fallback =
        kind === 'customer'
          ? customers.value
          : kind === 'airport'
            ? masterAirports
            : kind === 'country'
              ? masterCountries
              : kind === 'airline'
                ? masterAirlines
                : kind === 'charge'
                  ? masterChargeCodes
                  : masterCurrencies
      const n = q.trim().toLowerCase()
      if (!n) return fallback.slice(0, 12)
      return fallback
        .filter(
          (o) =>
            o.label.toLowerCase().includes(n) ||
            o.value.toLowerCase().includes(n) ||
            o.aliases?.some((a) => a.toLowerCase().includes(n)),
        )
        .slice(0, 12)
    }
  }

  async function createCustomerDraft(input: QuickCreateCustomerInput): Promise<MasterOption> {
    try {
      const opt = await createOsMdmParty(input)
      draftCustomers.value = [opt, ...draftCustomers.value.filter((c) => c.value !== opt.value)]
      pushRecentValue('customer', opt.value)
      return opt
    } catch {
      // Offline / MSW gap — local draft so quote UI still works
      const value = `DRAFT-${Date.now().toString(36).toUpperCase()}`
      const opt: MasterOption = {
        kind: 'customer',
        label: input.companyName.trim(),
        value,
        aliases: [input.companyName.trim()],
        meta: `${input.partnerRoles.join('+')} · ${input.countryLabel} · Pending Finance`,
        status: 'pending_approval',
        requestedBy: input.requestedBy,
        approverSeat: 'Finance',
      }
      draftCustomers.value = [opt, ...draftCustomers.value]
      pushRecentValue('customer', value)
      return opt
    }
  }

  async function approveCustomer(value: string) {
    try {
      await approveOsMdmParty(value)
    } catch {
      /* local approve fallback */
    }
    const hit = draftCustomers.value.find((c) => c.value === value)
    if (hit) {
      hit.status = 'active'
      hit.meta = hit.meta?.replace(' · Pending Finance', ' · Active') ?? 'Customer · Active'
    }
    const cat = catalogCustomers.value.find((c) => c.value === value)
    if (cat) {
      cat.status = 'active'
      cat.meta = cat.meta?.replace(' · Pending Finance', ' · Active') ?? cat.meta
    }
  }

  return {
    draftCustomers,
    customers,
    airports,
    countries,
    airlines,
    chargeCodes,
    currencies,
    pendingCustomers,
    loading,
    catalogLoaded,
    refreshCustomers,
    search,
    createCustomerDraft,
    approveCustomer,
  }
})
