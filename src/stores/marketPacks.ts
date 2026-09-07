import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import baselineRaciCatalog from '@/data/raciCatalog'
import {
  CORRIDOR_SCENARIOS,
  MARKET_PACK_REGISTRY,
  overlayPacks,
  PACK_ORDER,
  packIdsForCountryCodes,
  type MarketPackManifest,
} from '@/data/marketPacks'

export const useMarketPackStore = defineStore('marketPacks', () => {
  const enabledIds = ref<string[]>(['GLOBAL', 'AU'])
  const lockedIds = ref<string[]>(['GLOBAL', 'AU'])
  const selectedPackId = ref('AU')
  const corridorId = ref(CORRIDOR_SCENARIOS[1]?.id ?? 'au-import-air')
  const toolsOpen = ref(false)

  const selectedPack = computed(
    () => MARKET_PACK_REGISTRY[selectedPackId.value] ?? MARKET_PACK_REGISTRY.GLOBAL,
  )

  function isEnabled(id: string): boolean {
    return enabledIds.value.includes(id)
  }

  function isLocked(id: string): boolean {
    return lockedIds.value.includes(id)
  }

  function togglePack(id: string) {
    if (isLocked(id)) return
    if (enabledIds.value.includes(id)) {
      enabledIds.value = enabledIds.value.filter((x) => x !== id)
    } else {
      enabledIds.value = [...enabledIds.value, id]
    }
  }

  /** Replace enabled packs with GLOBAL + overlays required by HQ/branch countries. */
  function applyTenantPacks(countryCodes: string[], preferredPackId?: string) {
    const required = packIdsForCountryCodes(countryCodes)
    const prevEnabled = new Set(enabledIds.value)
    lockedIds.value = required

    const next = new Set(required)
    for (const id of prevEnabled) {
      if (!required.includes(id) && MARKET_PACK_REGISTRY[id]) {
        next.add(id)
      }
    }
    enabledIds.value = PACK_ORDER.filter((id) => next.has(id))

    const preferred =
      preferredPackId && required.includes(preferredPackId) ? preferredPackId : undefined
    const overlay = preferred ?? required.find((id) => id !== 'GLOBAL')
    selectedPackId.value = overlay ?? 'GLOBAL'
  }

  function selectPack(id: string) {
    selectedPackId.value = id
  }

  const corridor = computed(
    () => CORRIDOR_SCENARIOS.find((c) => c.id === corridorId.value) ?? CORRIDOR_SCENARIOS[0],
  )

  const corridorWouldFire = computed(() => {
    const c = corridor.value
    if (!c) return { missing: [] as string[], covered: false }
    const missing = c.packIds.filter((id) => id !== 'GLOBAL' && !enabledIds.value.includes(id))
    return { missing, covered: missing.length === 0 }
  })

  return {
    enabledIds,
    lockedIds,
    selectedPackId,
    corridorId,
    toolsOpen,
    overlays: overlayPacks(),
    allPacks: Object.values(MARKET_PACK_REGISTRY) as MarketPackManifest[],
    selectedPack,
    corridor,
    corridorWouldFire,
    isEnabled,
    isLocked,
    togglePack,
    applyTenantPacks,
    selectPack,
    catalogTaskCount: baselineRaciCatalog.tasks.length,
  }
})
