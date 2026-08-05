import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchJobContext } from '@/api/client'
import type { JobContext } from '@/api/types'

export const useJobStore = defineStore('job', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const job = ref<JobContext | null>(null)

  async function load(shipmentId: number) {
    loading.value = true
    error.value = null
    job.value = null
    try {
      job.value = await fetchJobContext(shipmentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load job'
    } finally {
      loading.value = false
    }
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
    clear,
  }
})
