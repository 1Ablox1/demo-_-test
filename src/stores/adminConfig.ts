import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type AdminToggleKey =
  | 'autoGates'
  | 'raciEnforce'
  | 'marginAlerts'
  | 'agentQuote'
  | 'agentDocs'
  | 'agentMarginGuard'
  | 'agentChargeDraft'
  | 'agentGateWatch'

/**
 * Admin Studio knobs — shared so L2 / AF-05 respect suggest-only workers.
 */
export const useAdminConfigStore = defineStore('adminConfig', () => {
  const autoGates = ref(true)
  const raciEnforce = ref(true)
  const marginAlerts = ref(true)
  const agentQuote = ref(true)
  const agentDocs = ref(false)
  const agentMarginGuard = ref(true)
  const agentChargeDraft = ref(true)
  const agentGateWatch = ref(true)

  const workersEnabled = computed(() => ({
    quoteAssist: agentQuote.value,
    docIngest: agentDocs.value,
    marginGuard: marginAlerts.value && agentMarginGuard.value,
    chargeDraft: agentChargeDraft.value,
    gateWatch: autoGates.value && agentGateWatch.value,
  }))

  function flip(key: AdminToggleKey) {
    switch (key) {
      case 'autoGates':
        autoGates.value = !autoGates.value
        break
      case 'raciEnforce':
        raciEnforce.value = !raciEnforce.value
        break
      case 'marginAlerts':
        marginAlerts.value = !marginAlerts.value
        break
      case 'agentQuote':
        agentQuote.value = !agentQuote.value
        break
      case 'agentDocs':
        agentDocs.value = !agentDocs.value
        break
      case 'agentMarginGuard':
        agentMarginGuard.value = !agentMarginGuard.value
        break
      case 'agentChargeDraft':
        agentChargeDraft.value = !agentChargeDraft.value
        break
      case 'agentGateWatch':
        agentGateWatch.value = !agentGateWatch.value
        break
    }
  }

  return {
    autoGates,
    raciEnforce,
    marginAlerts,
    agentQuote,
    agentDocs,
    agentMarginGuard,
    agentChargeDraft,
    agentGateWatch,
    workersEnabled,
    flip,
  }
})
