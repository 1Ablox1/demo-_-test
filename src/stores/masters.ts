import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { MasterOption, QuickCreateCustomerInput } from '@/mdm/types'
import { masterCustomers } from '@/mocks/fixtures/masters'
import { pushRecentValue } from '@/mdm/search'

function slugCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12)
  return `DRAFT-${base || 'CUST'}-${Date.now().toString(36).toUpperCase()}`
}

export const useMastersStore = defineStore('masters', () => {
  const draftCustomers = ref<MasterOption[]>([])

  const customers = computed((): MasterOption[] => [
    ...draftCustomers.value,
    ...masterCustomers,
  ])

  const pendingCustomers = computed(() =>
    draftCustomers.value.filter((c) => c.status === 'pending_approval'),
  )

  function createCustomerDraft(input: QuickCreateCustomerInput): MasterOption {
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
    draftCustomers.value = [opt, ...draftCustomers.value]
    pushRecentValue('customer', value)
    return opt
  }

  function approveCustomer(value: string) {
    const hit = draftCustomers.value.find((c) => c.value === value)
    if (!hit) return
    hit.status = 'active'
    hit.meta = hit.meta?.replace(' · Pending Finance', ' · Active') ?? 'Customer · Active'
  }

  return {
    draftCustomers,
    customers,
    pendingCustomers,
    createCustomerDraft,
    approveCustomer,
  }
})
