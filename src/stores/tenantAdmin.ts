import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  HQ_COUNTRY_OPTIONS,
  packIdsForCountryCodes,
  COUNTRY_DEFAULT_CURRENCY,
} from '@/data/marketPacks'
import { OFFICE_OPTIONS } from '@/stores/userAdmin'
import { i18n } from '@/locales'

export type TenantLocale = 'en_US' | 'zh_CN'

export const TENANT_LOCALE_OPTIONS: { code: TenantLocale; label: string }[] = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'zh_CN', label: '中文 (简体)' },
]

export interface TenantBranch {
  officeCode: string
  name: string
  country: string
  inheritCountry: boolean
}

/**
 * Tenant Admin state — HQ + branches drive Required packs (not operator toolbar).
 * Syncs to marketPacks store on change.
 */
export const useTenantAdminStore = defineStore('tenantAdmin', () => {
  const tenantId = ref(import.meta.env.VITE_STAGE_TENANT_ID?.trim() || 'tnt-waltech')
  const legalName = ref('Waltech Logistics')
  const env = ref('h5-stage-db')
  const hqCountryCode = ref('AU')
  /** Legacy company id — synced from Echo session on login (Alice stub = 9001) */
  const companyId = ref('9001')
  /** Operator working office (legacy opOffice) — header context, not pack codes */
  const activeOfficeCode = ref('SYD')
  /** Tenant default UI locale — new users / templates; users override in shell */
  const defaultLocale = ref<TenantLocale>('en_US')
  const enabledLocales = ref<TenantLocale[]>(['en_US', 'zh_CN'])

  const branches = ref<TenantBranch[]>([
    { officeCode: 'SYD', name: 'Sydney HQ', country: 'AU', inheritCountry: true },
    { officeCode: 'MEL', name: 'Melbourne', country: 'AU', inheritCountry: true },
    { officeCode: 'LAX', name: 'Los Angeles', country: 'US', inheritCountry: false },
  ])

  const effectiveCountries = computed(() => {
    const codes = new Set<string>([hqCountryCode.value])
    for (const b of branches.value) {
      codes.add(b.inheritCountry ? hqCountryCode.value : b.country)
    }
    return [...codes]
  })

  /** GLOBAL + HQ overlay + branch overrides — not “HQ only hides other packs”. */
  const requiredPackIds = computed(() => packIdsForCountryCodes(effectiveCountries.value))

  const hqLabel = computed(
    () => HQ_COUNTRY_OPTIONS.find((o) => o.code === hqCountryCode.value)?.label ?? hqCountryCode.value,
  )

  const branchPackNotes = computed(() =>
    branches.value
      .filter((b) => !b.inheritCountry)
      .map((b) => `${b.officeCode} → ${b.country}`),
  )

  const currencyHints = computed(() =>
    effectiveCountries.value.map(
      (code) => `${code} · ${COUNTRY_DEFAULT_CURRENCY[code] ?? '—'}`,
    ),
  )

  const tenantPostureLabel = computed(() => requiredPackIds.value.join(' · '))

  const activeBranch = computed(
    () =>
      branches.value.find((b) => b.officeCode === activeOfficeCode.value) ??
      branches.value[0],
  )

  /** Operator header — legacy branch context (not pack symbols) */
  const operatorContextLabel = computed(() => {
    const b = activeBranch.value
    if (!b) return legalName.value
    return `${b.officeCode} · ${b.name}`
  })

  /** Tooltip / support — company + tenant id (legacy companyId) */
  const operatorContextDetail = computed(
    () => `${legalName.value} · ${companyId.value} · ${tenantId.value}`,
  )

  function setActiveOffice(officeCode: string) {
    if (branches.value.some((b) => b.officeCode === officeCode)) {
      activeOfficeCode.value = officeCode
    }
  }

  function setDefaultLocale(code: TenantLocale) {
    defaultLocale.value = code
    if (!enabledLocales.value.includes(code)) {
      enabledLocales.value = [...enabledLocales.value, code]
    }
    i18n.global.locale.value = code
  }

  function isLocaleEnabled(code: TenantLocale): boolean {
    return enabledLocales.value.includes(code)
  }

  function toggleEnabledLocale(code: TenantLocale) {
    if (enabledLocales.value.includes(code)) {
      if (code === defaultLocale.value) return
      enabledLocales.value = enabledLocales.value.filter((l) => l !== code)
    } else {
      enabledLocales.value = [...enabledLocales.value, code]
    }
  }

  function setHqCountry(code: string) {
    hqCountryCode.value = code
  }

  function toggleBranchInherit(officeCode: string) {
    const branch = branches.value.find((b) => b.officeCode === officeCode)
    if (!branch) return
    branch.inheritCountry = !branch.inheritCountry
    if (branch.inheritCountry) {
      branch.country = hqCountryCode.value
    }
  }

  function setBranchCountry(officeCode: string, country: string) {
    const branch = branches.value.find((b) => b.officeCode === officeCode)
    if (!branch) return
    branch.country = country
    branch.inheritCountry = false
  }

  return {
    tenantId,
    legalName,
    companyId,
    env,
    hqCountryCode,
    activeOfficeCode,
    defaultLocale,
    enabledLocales,
    branches,
    officeOptions: OFFICE_OPTIONS,
    effectiveCountries,
    requiredPackIds,
    hqLabel,
    branchPackNotes,
    currencyHints,
    tenantPostureLabel,
    activeBranch,
    operatorContextLabel,
    operatorContextDetail,
    setHqCountry,
    setActiveOffice,
    setDefaultLocale,
    isLocaleEnabled,
    toggleEnabledLocale,
    toggleBranchInherit,
    setBranchCountry,
  }
})

/** Call once from AdminStudioView to wire tenant → market pack locks. */
export function bindTenantToMarketPacks(
  tenant: ReturnType<typeof useTenantAdminStore>,
  market: { applyTenantPacks: (codes: string[], preferred?: string) => void },
) {
  watch(
    () => [...tenant.effectiveCountries],
    (codes) => {
      const preferred = packIdsForCountryCodes(codes).find((id) => id !== 'GLOBAL')
      market.applyTenantPacks(codes, preferred)
    },
    { immediate: true },
  )
}
