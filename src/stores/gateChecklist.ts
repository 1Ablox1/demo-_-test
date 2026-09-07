import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchGateDetail,
  fulfilGateItem,
  stampGateRelease,
} from '@/api/client'
import type { GateDetailPayload } from '@/api/types'
import { useChargesStore } from '@/stores/charges'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useTasksStore } from '@/stores/tasks'

export const useGateChecklistStore = defineStore('gateChecklist', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const detail = ref<GateDetailPayload | null>(null)

  async function load(shipmentId: number, gateId: string) {
    loading.value = true
    error.value = null
    try {
      detail.value = await fetchGateDetail(shipmentId, gateId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load gate'
      detail.value = null
    } finally {
      loading.value = false
    }
  }

  async function fulfil(shipmentId: number, gateId: string, itemCode: string) {
    detail.value = await fulfilGateItem(shipmentId, gateId, itemCode)
    await useTasksStore().load()
    return detail.value
  }

  async function stamp(shipmentId: number, gateId: string) {
    const result = await stampGateRelease(shipmentId, gateId)
    detail.value = result.gate
    await useLifecycleStore().load(shipmentId)
    await useJobStore().load(shipmentId)
    await useTasksStore().load()
    const charges = useChargesStore()
    if (charges.payload?.shipmentId === shipmentId) {
      await charges.load(shipmentId)
    }
    return result
  }

  function clear() {
    detail.value = null
    error.value = null
  }

  return { loading, error, detail, load, fulfil, stamp, clear }
})
