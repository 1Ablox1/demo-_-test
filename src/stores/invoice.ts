import { defineStore } from 'pinia'
import { toast as sonnerToast } from 'vue-sonner'
import { computed, ref } from 'vue'
import { fetchInvoice, issueInvoice, markInvoicePaid } from '@/api/client'
import type { InvoicePayload } from '@/api/types'
import { useTasksStore } from '@/stores/tasks'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useJobStore } from '@/stores/job'

export const useInvoiceStore = defineStore('invoice', () => {
  const loading = ref(false)
  const acting = ref(false)
  const error = ref<string | null>(null)
  const payload = ref<InvoicePayload | null>(null)

  const tasksStore = useTasksStore()
  const role = computed(() => tasksStore.role)

  const blockersOpen = computed(
    () => payload.value?.blockers.filter((b) => !b.cleared) ?? [],
  )

  const canIssue = computed(() => {
    if (!payload.value) return false
    if (payload.value.state !== 'draft' && payload.value.state !== 'ready') return false
    if (blockersOpen.value.length > 0) return false
    return role.value === 'finance' || role.value === 'admin'
  })

  const canMarkPaid = computed(() => {
    if (!payload.value) return false
    if (payload.value.state !== 'issued' && payload.value.state !== 'part_paid') return false
    return role.value === 'finance' || role.value === 'admin'
  })

  async function refreshSpine(shipmentId: number) {
    await useLifecycleStore().load(shipmentId)
    await useJobStore().load(shipmentId)
    await tasksStore.load()
  }

  async function load(shipmentId: number) {
    loading.value = true
    error.value = null
    payload.value = null
    try {
      payload.value = await fetchInvoice(shipmentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load invoice'
    } finally {
      loading.value = false
    }
  }

  async function issue() {
    if (!payload.value || !canIssue.value) return
    acting.value = true
    try {
      const shipmentId = payload.value.shipmentId
      payload.value = await issueInvoice(shipmentId)
      await refreshSpine(shipmentId)
      sonnerToast.message(`Invoice ${payload.value.invoiceNo} issued`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Issue failed'
    } finally {
      acting.value = false
    }
  }

  async function markPaid() {
    if (!payload.value || !canMarkPaid.value) return
    acting.value = true
    try {
      const shipmentId = payload.value.shipmentId
      payload.value = await markInvoicePaid(shipmentId)
      await refreshSpine(shipmentId)
      sonnerToast.message('Payment recorded (mock)')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Payment update failed'
    } finally {
      acting.value = false
    }
  }

  function clear() {
    payload.value = null
    error.value = null
  }

  return {
    loading,
    acting,
    error,
    payload,
    role,
    blockersOpen,
    canIssue,
    canMarkPaid,
    load,
    issue,
    markPaid,
    clear,
  }
})
