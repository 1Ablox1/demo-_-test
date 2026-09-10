import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  approveOsMdmParty,
  createOsMdmParty,
  searchOsMdm,
} from '@/api/client'
import { usesEchoReads } from '@/api/config'
import {
  countriesFromAirports,
  echoFetchAirlines,
  echoFetchCatalog,
  echoFetchCompanies,
  echoFetchCurrencies,
  echoFetchDepartments,
  echoFetchOffices,
  echoFetchPorts,
  echoFetchUsers,
  echoSearchCompanies,
  partiesWithRole,
  type PartyRole,
} from '@/api/echo/reference'
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
 * Operational MDM store.
 * hybrid/live → Echo `/os/reference/*` (stage MDM only).
 * mock → fixture masters via MSW.
 */
export const useMastersStore = defineStore('masters', () => {
  const echo = usesEchoReads()
  const draftCustomers = ref<MasterOption[]>([])
  const catalogLoaded = ref(false)
  const catalogParties = ref<MasterOption[]>(echo ? [] : [...masterCustomers])
  const catalogAirports = ref<MasterOption[]>(echo ? [] : [...masterAirports])
  const catalogAirlines = ref<MasterOption[]>(echo ? [] : [...masterAirlines])
  const catalogCurrencies = ref<MasterOption[]>(echo ? [] : [...masterCurrencies])
  const catalogCountries = ref<MasterOption[]>(echo ? [] : [...masterCountries])
  const catalogCharges = ref<MasterOption[]>(echo ? [] : [...masterChargeCodes])
  const catalogOffices = ref<MasterOption[]>([])
  const catalogDepartments = ref<MasterOption[]>([])
  const catalogOpsUsers = ref<MasterOption[]>([])
  const catalogSalesUsers = ref<MasterOption[]>([])
  const catalogIncoterms = ref<MasterOption[]>([])
  const catalogFreightTerms = ref<MasterOption[]>([])
  const catalogPaymentTerms = ref<MasterOption[]>([])
  const catalogPacking = ref<MasterOption[]>([])
  const catalogCargoTypes = ref<MasterOption[]>([])
  const loading = ref(false)
  let bootstrapPromise: Promise<void> | null = null

  const customers = computed(() => [
    ...draftCustomers.value,
    ...partiesWithRole(catalogParties.value, 'customer').filter(
      (c) => !draftCustomers.value.some((d) => d.value === c.value),
    ),
  ])
  const shippers = computed(() => partiesWithRole(catalogParties.value, 'shipper'))
  const consignees = computed(() => partiesWithRole(catalogParties.value, 'consignee'))
  const notifyParties = computed(() => partiesWithRole(catalogParties.value, 'notify'))
  const agents = computed(() => partiesWithRole(catalogParties.value, 'agent'))
  const bookingAgents = computed(() => partiesWithRole(catalogParties.value, 'bookingAgent'))
  const brokers = computed(() => partiesWithRole(catalogParties.value, 'customsBroker'))

  /** Fallback: if role flags empty on stage, show full party list for that picker. */
  function partyOptions(_role: PartyRole, preferred: MasterOption[]): MasterOption[] {
    if (preferred.length) return preferred
    if (!echo) return preferred
    return catalogParties.value
  }

  const airports = computed(() => catalogAirports.value)
  const countries = computed(() => catalogCountries.value)
  const airlines = computed(() =>
    catalogAirlines.value.length
      ? catalogAirlines.value
      : partiesWithRole(catalogParties.value, 'airline'),
  )
  const chargeCodes = computed(() => catalogCharges.value)
  const currencies = computed(() => catalogCurrencies.value)
  const offices = computed(() => catalogOffices.value)
  const departments = computed(() => catalogDepartments.value)
  const opsUsers = computed(() => catalogOpsUsers.value)
  const salesUsers = computed(() => catalogSalesUsers.value)
  const incoterms = computed(() => catalogIncoterms.value)
  const freightTerms = computed(() => catalogFreightTerms.value)
  const paymentTerms = computed(() => catalogPaymentTerms.value)
  const packingOptions = computed(() => catalogPacking.value)
  const cargoTypes = computed(() => catalogCargoTypes.value)

  const pendingCustomers = computed(() =>
    draftCustomers.value.filter((c) => c.status === 'pending_approval'),
  )

  const frequentCustomerValues = computed(() => customers.value.slice(0, 8).map((c) => c.value))
  const frequentAirportValues = computed(() => {
    const prefer = ['PVG', 'SYD', 'LAX', 'SIN', 'MEL', 'HKG']
    const have = new Set(catalogAirports.value.map((a) => a.value))
    const fromPrefer = prefer.filter((c) => have.has(c))
    return fromPrefer.length ? fromPrefer : catalogAirports.value.slice(0, 6).map((a) => a.value)
  })
  const frequentCountryValues = computed(() => {
    const prefer = ['AU', 'CN', 'US', 'GB', 'DE', 'SG']
    const have = new Set(catalogCountries.value.map((c) => c.value))
    const fromPrefer = prefer.filter((c) => have.has(c))
    return fromPrefer.length ? fromPrefer : catalogCountries.value.slice(0, 6).map((c) => c.value)
  })

  async function ensureEchoCatalog() {
    if (!echo || catalogLoaded.value) return
    if (bootstrapPromise) return bootstrapPromise
    bootstrapPromise = (async () => {
      loading.value = true
      try {
        const [
          ports,
          airlinesLive,
          companies,
          currenciesLive,
          officesLive,
          departmentsLive,
          ops,
          sales,
        ] = await Promise.all([
          echoFetchPorts(),
          echoFetchAirlines(),
          echoFetchCompanies(),
          echoFetchCurrencies(),
          echoFetchOffices(),
          echoFetchDepartments(),
          echoFetchUsers('op'),
          echoFetchUsers('sales'),
        ])
        catalogAirports.value = ports
        catalogAirlines.value = airlinesLive
        catalogParties.value = companies
        catalogCurrencies.value = currenciesLive
        catalogCountries.value = countriesFromAirports(ports)
        catalogOffices.value = officesLive
        catalogDepartments.value = departmentsLive
        catalogOpsUsers.value = ops
        catalogSalesUsers.value = sales
        catalogCharges.value = []

        // Named catalogs — best-effort (empty if stage cache name differs)
        const [incos, freight, payment, packing, cargo] = await Promise.all([
          echoFetchCatalog('IncoTerm', 'incoterm').catch(() => [] as MasterOption[]),
          echoFetchCatalog('ShippingTerm', 'freight_term').catch(() => [] as MasterOption[]),
          echoFetchCatalog('PaymentTerm', 'payment_term').catch(() => [] as MasterOption[]),
          echoFetchCatalog('Packing', 'packing').catch(() => [] as MasterOption[]),
          echoFetchCatalog('CargoType', 'cargo_type').catch(() => [] as MasterOption[]),
        ])
        catalogIncoterms.value = incos.length
          ? incos
          : ['EXW', 'FCA', 'FOB', 'CIF', 'CIP', 'DAP', 'DDP'].map((c) => ({
              kind: 'incoterm' as const,
              label: c,
              value: c,
              status: 'active' as const,
            }))
        catalogFreightTerms.value = freight.length
          ? freight
          : ['PP', 'CC'].map((c) => ({
              kind: 'freight_term' as const,
              label: c === 'PP' ? 'Prepaid' : 'Collect',
              value: c,
              status: 'active' as const,
            }))
        catalogPaymentTerms.value = payment
        catalogPacking.value = packing
        catalogCargoTypes.value = cargo
        catalogLoaded.value = true
      } finally {
        loading.value = false
      }
    })().finally(() => {
      bootstrapPromise = null
    })
    return bootstrapPromise
  }

  function filterLocal(list: MasterOption[], q: string, limit = 40) {
    const n = q.trim().toLowerCase()
    if (!n) return list.slice(0, limit)
    return list
      .filter(
        (o) =>
          o.label.toLowerCase().includes(n) ||
          o.value.toLowerCase().includes(n) ||
          o.aliases?.some((a) => a.toLowerCase().includes(n)) ||
          o.meta?.toLowerCase().includes(n),
      )
      .slice(0, limit)
  }

  async function refreshCustomers(q = '') {
    loading.value = true
    try {
      if (echo) {
        await ensureEchoCatalog()
        if (q.trim()) {
          return echoSearchCompanies(q, 'customer')
        }
        return partyOptions('customer', customers.value)
      }
      const res = await searchOsMdm('customer', q)
      const items = res.items ?? []
      if (!q) {
        catalogParties.value = items
        catalogLoaded.value = true
      }
      return items
    } catch {
      if (!echo && !catalogLoaded.value) catalogParties.value = [...masterCustomers]
      return customers.value
    } finally {
      loading.value = false
    }
  }

  async function searchParty(role: PartyRole, q: string) {
    if (echo) {
      await ensureEchoCatalog()
      if (q.trim()) return echoSearchCompanies(q, role)
      const preferred =
        role === 'customer'
          ? customers.value
          : role === 'shipper'
            ? shippers.value
            : role === 'consignee'
              ? consignees.value
              : role === 'notify'
                ? notifyParties.value
                : role === 'airline'
                  ? airlines.value
                  : role === 'bookingAgent'
                    ? bookingAgents.value
                    : role === 'customsBroker'
                      ? brokers.value
                      : agents.value
      return filterLocal(partyOptions(role, preferred), q)
    }
    return filterLocal(customers.value, q)
  }

  async function search(
    kind: 'customer' | 'airport' | 'country' | 'airline' | 'charge' | 'currency',
    q: string,
  ) {
    try {
      if (echo) {
        await ensureEchoCatalog()
        if (kind === 'customer' || kind === 'airline') return searchParty(kind, q)
        if (kind === 'airport') return filterLocal(catalogAirports.value, q)
        if (kind === 'country') return filterLocal(catalogCountries.value, q)
        if (kind === 'currency') return filterLocal(catalogCurrencies.value, q)
        return []
      }
      const res = await searchOsMdm(kind, q)
      return res.items ?? []
    } catch {
      if (echo) return []
      return filterLocal(
        kind === 'customer'
          ? customers.value
          : kind === 'airport'
            ? catalogAirports.value
            : kind === 'country'
              ? catalogCountries.value
              : kind === 'airline'
                ? catalogAirlines.value
                : kind === 'charge'
                  ? catalogCharges.value
                  : catalogCurrencies.value,
        q,
        12,
      )
    }
  }

  function departmentsForOffice(office: MasterOption | null | undefined) {
    if (!office) return catalogDepartments.value
    const uuid = office.meta
    if (!uuid) return catalogDepartments.value
    const filtered = catalogDepartments.value.filter((d) => d.meta === uuid)
    return filtered.length ? filtered : catalogDepartments.value
  }

  async function createCustomerDraft(input: QuickCreateCustomerInput): Promise<MasterOption> {
    try {
      const opt = await createOsMdmParty(input)
      draftCustomers.value = [opt, ...draftCustomers.value.filter((c) => c.value !== opt.value)]
      pushRecentValue('customer', opt.value)
      return opt
    } catch {
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
  }

  return {
    draftCustomers,
    customers,
    shippers,
    consignees,
    notifyParties,
    agents,
    bookingAgents,
    brokers,
    airports,
    countries,
    airlines,
    chargeCodes,
    currencies,
    offices,
    departments,
    opsUsers,
    salesUsers,
    incoterms,
    freightTerms,
    paymentTerms,
    packingOptions,
    cargoTypes,
    pendingCustomers,
    loading,
    catalogLoaded,
    frequentCustomerValues,
    frequentAirportValues,
    frequentCountryValues,
    partyOptions,
    departmentsForOffice,
    ensureEchoCatalog,
    refreshCustomers,
    searchParty,
    search,
    createCustomerDraft,
    approveCustomer,
  }
})
