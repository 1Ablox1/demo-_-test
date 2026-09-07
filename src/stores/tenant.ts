import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  emptyValuesForSchema,
  resolveFieldSchema,
  validateSchema,
} from '@/data/countryFieldSchemas'
import { packIdForCountry, packIdsForCountryCodes } from '@/data/marketPacks'
import { envFetch, lastRequest, recentRequests, setActiveLocation } from '@/lib/apiAdapter'
import { DEFAULT_BACKEND_ENV } from '@/lib/env'
import { useMarketPackStore } from '@/stores/marketPacks'
import type {
  BackendEnv,
  CountryCode,
  FieldValue,
  ResolvedBranchContext,
  TenantBranch,
  TenantRecord,
} from '@/types/tenant'
import { DEFAULT_TZ_BY_COUNTRY } from '@/types/tenant'

const WALTECH: TenantRecord = {
  tenantId: 'tnt-waltech',
  name: 'Waltech Logistics',
  legalName: 'Waltech Logistics Pty Ltd',
  hqCountryCode: 'AU',
  hqBranchId: 'br-hq-syd',
  homeCurrency: 'AUD',
  branches: [
    {
      branchId: 'br-hq-syd',
      officeCode: 'SYD',
      branchName: 'Sydney HQ',
      city: 'Sydney',
      inheritCountry: true,
      countryCode: 'AU',
      timezone: 'Australia/Sydney',
      status: 'active',
    },
    {
      branchId: 'br-mel',
      officeCode: 'MEL',
      branchName: 'Melbourne Branch',
      city: 'Melbourne',
      inheritCountry: true,
      countryCode: 'AU',
      timezone: 'Australia/Melbourne',
      status: 'active',
    },
    {
      branchId: 'br-sin',
      officeCode: 'SIN',
      branchName: 'Singapore Branch',
      city: 'Singapore',
      inheritCountry: false,
      countryCode: 'SG',
      timezone: 'Asia/Singapore',
      status: 'active',
    },
    {
      branchId: 'br-lax',
      officeCode: 'LAX',
      branchName: 'Los Angeles Branch',
      city: 'Los Angeles',
      inheritCountry: false,
      countryCode: 'US',
      timezone: 'America/Los_Angeles',
      status: 'active',
    },
  ],
}

const SEED_VALUES: Record<string, Record<string, FieldValue>> = {
  AU: {
    legalName: 'Waltech Logistics Pty Ltd',
    abn: '51824753556',
    gstRegistered: true,
    icsClientId: 'WALTECH01',
    bsb: '062-000',
    accountNumber: '12345678',
    accountName: 'Waltech Logistics Pty Ltd',
    icsFilerRole: 'broker',
  },
  US: {
    legalName: 'Waltech Logistics Inc.',
    ein: '12-3456789',
    aceAccount: 'WALTECH-ACE',
    aesFilerId: '12-3456789',
    routingNumber: '021000021',
    accountNumber: '987654321',
    accountName: 'Waltech Logistics Inc.',
    aesFilerType: 'forwarding_agent',
  },
  SG: {
    legalName: 'Waltech Logistics Pte Ltd',
    uen: '201234567A',
    gstRegistered: true,
    tradenetDa: 'DA-WALTECH',
    bankCode: '7171',
    accountNumber: '001234567',
    accountName: 'Waltech Logistics Pte Ltd',
    declaringAgentRole: 'da',
  },
}

function cloneTenant(src: TenantRecord): TenantRecord {
  return {
    ...src,
    branches: src.branches.map((b) => ({ ...b })),
  }
}

function schemaCurrency(country: CountryCode): string {
  return resolveFieldSchema(country).currency
}

export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref<TenantRecord>(cloneTenant(WALTECH))
  const env = ref<BackendEnv>(DEFAULT_BACKEND_ENV)
  const activeBranchId = ref(WALTECH.hqBranchId)
  const editingScope = ref<'hq' | string>('hq')
  const profileByCountry = ref<Record<string, Record<string, FieldValue>>>(
    structuredClone(SEED_VALUES),
  )
  const lastPackSync = ref('')
  const hydrated = ref(false)

  const hqCountryCode = computed(() => tenant.value.hqCountryCode)

  const hqBranch = computed(
    () =>
      tenant.value.branches.find((b) => b.branchId === tenant.value.hqBranchId) ??
      tenant.value.branches[0],
  )

  const activeBranch = computed(
    () =>
      tenant.value.branches.find((b) => b.branchId === activeBranchId.value) ??
      hqBranch.value,
  )

  function effectiveCountry(branch: TenantBranch): CountryCode {
    return branch.inheritCountry ? tenant.value.hqCountryCode : branch.countryCode
  }

  /** Fallback: branch currency override → country schema → HQ home currency. */
  function resolveCurrency(branch: TenantBranch): string {
    if (branch.currencyOverride) return branch.currencyOverride
    const country = effectiveCountry(branch)
    return schemaCurrency(country) || tenant.value.homeCurrency || 'AUD'
  }

  const activeCountryCode = computed(() =>
    activeBranch.value ? effectiveCountry(activeBranch.value) : tenant.value.hqCountryCode,
  )

  const locationCountries = computed(() => {
    const codes = new Set<CountryCode>([tenant.value.hqCountryCode])
    for (const branch of tenant.value.branches) {
      if (branch.status === 'inactive') continue
      codes.add(effectiveCountry(branch))
    }
    return [...codes]
  })

  const requiredPackIds = computed(() => packIdsForCountryCodes(locationCountries.value))

  const editingCountryCode = computed<CountryCode>(() => {
    if (editingScope.value === 'hq') return tenant.value.hqCountryCode
    const branch = tenant.value.branches.find((b) => b.branchId === editingScope.value)
    return branch ? effectiveCountry(branch) : tenant.value.hqCountryCode
  })

  const activeSchema = computed(() => resolveFieldSchema(activeCountryCode.value))
  const editingSchema = computed(() => resolveFieldSchema(editingCountryCode.value))

  const editingValues = computed(() => {
    const code = editingCountryCode.value
    const schema = editingSchema.value
    const stored = profileByCountry.value[code] ?? {}
    return { ...emptyValuesForSchema(schema), ...stored }
  })

  const editingErrors = computed(() => validateSchema(editingSchema.value, editingValues.value))

  const officeOptions = computed(() =>
    tenant.value.branches
      .filter((b) => b.status === 'active')
      .map((b) => {
        const country = effectiveCountry(b)
        const isHq = b.branchId === tenant.value.hqBranchId
        return {
          id: b.officeCode,
          label: isHq
            ? `${b.officeCode} · ${b.branchName} · HQ`
            : `${b.officeCode} · ${b.branchName}`,
          branchId: b.branchId,
          countryCode: country,
          isHq,
          timezone: b.timezone,
        }
      }),
  )

  const activeOfficeLabel = computed(() => {
    const b = activeBranch.value
    if (!b) return ''
    const hq = b.branchId === tenant.value.hqBranchId ? ' · HQ' : ''
    return `${b.officeCode} · ${b.branchName}${hq}`
  })

  const activeOfficeCode = computed(() => activeBranch.value?.officeCode ?? 'SYD')

  /** Resolved runtime context for the active branch (Book / Job / Needs You). */
  const activeContext = computed((): ResolvedBranchContext => {
    const branch = activeBranch.value!
    const country = effectiveCountry(branch)
    const pack = packIdForCountry(country) ?? 'GLOBAL'
    return {
      tenantId: tenant.value.tenantId,
      branchId: branch.branchId,
      officeCode: branch.officeCode,
      branchName: branch.branchName,
      isHq: branch.branchId === tenant.value.hqBranchId,
      countryCode: country,
      inheritCountry: branch.inheritCountry,
      timezone: branch.timezone || DEFAULT_TZ_BY_COUNTRY[country],
      currency: resolveCurrency(branch),
      packId: pack,
      homeCurrency: tenant.value.homeCurrency,
      hqCountryCode: tenant.value.hqCountryCode,
      hqBranchId: tenant.value.hqBranchId,
    }
  })

  function syncAdapter() {
    const branch = activeBranch.value
    setActiveLocation({
      tenantId: tenant.value.tenantId,
      branchId: branch?.branchId ?? tenant.value.hqBranchId,
      countryCode: activeCountryCode.value,
      env: env.value,
    })
  }

  function applyPacks(reason: string) {
    const packs = useMarketPackStore()
    packs.applyTenantPacks(
      locationCountries.value,
      packIdForCountry(tenant.value.hqCountryCode) ?? 'GLOBAL',
    )
    lastPackSync.value = reason
    syncAdapter()
    void envFetch('/config/market-packs', {
      method: 'PUT',
      body: {
        tenantId: tenant.value.tenantId,
        branchId: activeBranchId.value,
        countryCodes: locationCountries.value,
        packIds: requiredPackIds.value,
        hqCountryCode: tenant.value.hqCountryCode,
        hqBranchId: tenant.value.hqBranchId,
      },
    })
  }

  function hydrate() {
    if (hydrated.value) return
    hydrated.value = true
    tenant.value.homeCurrency = schemaCurrency(tenant.value.hqCountryCode)
    syncAdapter()
    applyPacks(
      `HQ ${tenant.value.hqCountryCode} · home ${tenant.value.homeCurrency} · loaded packs for ${tenant.value.name}`,
    )
  }

  function setEnv(next: BackendEnv) {
    env.value = next
    syncAdapter()
    void envFetch('/config/env', { method: 'PUT', body: { env: next } })
  }

  function setActiveBranch(branchId: string) {
    const branch = tenant.value.branches.find((b) => b.branchId === branchId)
    if (!branch || branch.status === 'inactive') return
    activeBranchId.value = branchId
    syncAdapter()
    void envFetch(`/branches/${branchId}/context`, { method: 'GET' })
  }

  function setActiveBranchByOffice(officeCode: string) {
    const branch = tenant.value.branches.find((b) => b.officeCode === officeCode)
    if (branch) setActiveBranch(branch.branchId)
  }

  function setActiveBranchByLabel(label: string) {
    const match = officeOptions.value.find((o) => o.label === label || o.label.startsWith(label))
    if (match) setActiveBranch(match.branchId)
  }

  function setEditingScope(scope: 'hq' | string) {
    editingScope.value = scope
  }

  function setHqCountry(countryCode: CountryCode) {
    tenant.value.hqCountryCode = countryCode
    tenant.value.homeCurrency = schemaCurrency(countryCode)
    tenant.value.branches = tenant.value.branches.map((b) =>
      b.inheritCountry
        ? {
            ...b,
            countryCode,
            timezone: b.timezone || DEFAULT_TZ_BY_COUNTRY[countryCode],
          }
        : b,
    )
    editingScope.value = 'hq'
    const pack = resolveFieldSchema(countryCode).packId ?? 'GLOBAL'
    applyPacks(`HQ country → ${countryCode} (${tenant.value.homeCurrency}). Loaded ${pack}.`)
  }

  /** Designate which branch is the tenant HQ office (must already exist). */
  function setHqBranch(branchId: string) {
    const branch = tenant.value.branches.find((b) => b.branchId === branchId)
    if (!branch) return
    tenant.value.hqBranchId = branchId
    // HQ office adopts HQ country (inherit) unless admin later overrides
    tenant.value.branches = tenant.value.branches.map((b) =>
      b.branchId === branchId
        ? {
            ...b,
            inheritCountry: true,
            countryCode: tenant.value.hqCountryCode,
            timezone: b.timezone || DEFAULT_TZ_BY_COUNTRY[tenant.value.hqCountryCode],
            status: 'active',
          }
        : b,
    )
    editingScope.value = branchId
    applyPacks(
      `${branch.officeCode} is now HQ · domicile ${tenant.value.hqCountryCode} · ${tenant.value.homeCurrency}`,
    )
    void envFetch('/config/hq-branch', {
      method: 'PUT',
      body: {
        tenantId: tenant.value.tenantId,
        hqBranchId: branchId,
        hqCountryCode: tenant.value.hqCountryCode,
      },
    })
  }

  function setBranchInherit(branchId: string, inherit: boolean) {
    tenant.value.branches = tenant.value.branches.map((b) => {
      if (b.branchId !== branchId) return b
      return {
        ...b,
        inheritCountry: inherit,
        countryCode: inherit ? tenant.value.hqCountryCode : b.countryCode,
      }
    })
    const branch = tenant.value.branches.find((b) => b.branchId === branchId)
    const code = branch ? effectiveCountry(branch) : tenant.value.hqCountryCode
    applyPacks(
      inherit
        ? `${branch?.officeCode ?? 'Branch'} now inherits HQ (${tenant.value.hqCountryCode})`
        : `${branch?.officeCode ?? 'Branch'} location set to ${code}`,
    )
  }

  function setBranchCountry(branchId: string, countryCode: CountryCode) {
    tenant.value.branches = tenant.value.branches.map((b) =>
      b.branchId === branchId
        ? {
            ...b,
            inheritCountry: false,
            countryCode,
            timezone: DEFAULT_TZ_BY_COUNTRY[countryCode],
          }
        : b,
    )
    editingScope.value = branchId
    const pack = resolveFieldSchema(countryCode).packId ?? 'GLOBAL'
    const office =
      tenant.value.branches.find((b) => b.branchId === branchId)?.officeCode ?? 'Branch'
    applyPacks(`${office} country → ${countryCode}. Loaded ${pack} Market Pack rules.`)
  }

  function setBranchStatus(branchId: string, status: TenantBranch['status']) {
    if (branchId === tenant.value.hqBranchId && status === 'inactive') return
    tenant.value.branches = tenant.value.branches.map((b) =>
      b.branchId === branchId ? { ...b, status } : b,
    )
    if (status === 'inactive' && activeBranchId.value === branchId) {
      setActiveBranch(tenant.value.hqBranchId)
    }
    applyPacks(
      status === 'inactive'
        ? `Branch deactivated — packs refreshed`
        : `Branch reactivated — packs refreshed`,
    )
  }

  function addBranch(input: {
    officeCode: string
    branchName: string
    city: string
    countryCode: CountryCode
    inheritCountry?: boolean
  }) {
    const code = input.officeCode.trim().toUpperCase().slice(0, 4)
    if (!code || tenant.value.branches.some((b) => b.officeCode === code)) return null
    const inherit = input.inheritCountry ?? input.countryCode === tenant.value.hqCountryCode
    const country = inherit ? tenant.value.hqCountryCode : input.countryCode
    const branch: TenantBranch = {
      branchId: `br-${code.toLowerCase()}-${Date.now().toString(36)}`,
      officeCode: code,
      branchName: input.branchName.trim() || `${code} Branch`,
      city: input.city.trim() || code,
      inheritCountry: inherit,
      countryCode: country,
      timezone: DEFAULT_TZ_BY_COUNTRY[country],
      status: 'active',
    }
    tenant.value.branches = [...tenant.value.branches, branch]
    editingScope.value = branch.branchId
    applyPacks(`Added ${branch.officeCode} · ${effectiveCountry(branch)}`)
    void envFetch('/branches', {
      method: 'POST',
      body: { tenantId: tenant.value.tenantId, branch },
    })
    return branch
  }

  function setFieldValue(key: string, value: FieldValue) {
    const code = editingCountryCode.value
    const current = profileByCountry.value[code] ?? emptyValuesForSchema(editingSchema.value)
    profileByCountry.value = {
      ...profileByCountry.value,
      [code]: { ...current, [key]: value },
    }
  }

  async function saveProfile() {
    const { context } = await envFetch('/mdm/company-profile', {
      method: 'PUT',
      body: {
        tenantId: tenant.value.tenantId,
        branchId: editingScope.value === 'hq' ? tenant.value.hqBranchId : editingScope.value,
        countryCode: editingCountryCode.value,
        values: editingValues.value,
        hqBranchId: tenant.value.hqBranchId,
        hqCountryCode: tenant.value.hqCountryCode,
      },
    })
    return context
  }

  hydrate()

  return {
    tenant,
    env,
    activeBranchId,
    editingScope,
    lastPackSync,
    hqCountryCode,
    hqBranch,
    activeBranch,
    activeCountryCode,
    activeContext,
    locationCountries,
    requiredPackIds,
    editingCountryCode,
    activeSchema,
    editingSchema,
    editingValues,
    editingErrors,
    officeOptions,
    activeOfficeLabel,
    activeOfficeCode,
    lastRequest,
    recentRequests,
    effectiveCountry,
    resolveCurrency,
    setEnv,
    setActiveBranch,
    setActiveBranchByOffice,
    setActiveBranchByLabel,
    setEditingScope,
    setHqCountry,
    setHqBranch,
    setBranchInherit,
    setBranchCountry,
    setBranchStatus,
    addBranch,
    setFieldValue,
    saveProfile,
    hydrate,
  }
})
