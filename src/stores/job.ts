import { defineStore } from 'pinia'
import { ref } from 'vue'
import { clearJobClearance, fetchJobContext } from '@/api/client'
import type { JobContext } from '@/api/types'

export const useJobStore = defineStore('job', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const job = ref<JobContext | null>(null)

  async function load(shipmentId: number) {
    loading.value = true
    error.value = null
    // Keep prior job while switching tabs / reloading same id — avoids shell flash
    if (job.value?.shipmentId !== shipmentId) {
      job.value = null
    }
    try {
      job.value = await fetchJobContext(shipmentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load job'
      if (job.value?.shipmentId !== shipmentId) job.value = null
    } finally {
      loading.value = false
    }
  }

  async function clearClearance(shipmentId: number) {
    const updated = await clearJobClearance(shipmentId)
    job.value = updated
    return updated
  }

  function clear() {
    job.value = null
    error.value = null
  }

  return {
    loading,
    error,
    job,
    load,
    clearClearance,
    clear,
  }
})
