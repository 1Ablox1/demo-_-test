import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  clearJobGate,
  completeJobTask,
  fetchJobLifecycle,
} from '@/api/client'
import type { AllowedActionsSource } from '@/lib/allowedActionsBridge'
import type { AllowedAction, JobLifecycle, MilestoneView } from '@/os/types'
import { useJobStore } from '@/stores/job'
import { useTasksStore } from '@/stores/tasks'

export const useLifecycleStore = defineStore('lifecycle', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lifecycle = ref<JobLifecycle | null>(null)
  const milestones = ref<MilestoneView[]>([])
  const allowedActions = ref<AllowedAction[]>([])
  const allowedActionsSource = ref<AllowedActionsSource>('msw')
  const moneyBlock = ref<{ blocked: boolean; message?: string } | null>(null)

  const tasksStore = useTasksStore()
  const role = computed(() => tasksStore.role)

  const openGates = computed(
    () => lifecycle.value?.gates.filter((g) => g.status === 'open') ?? [],
  )
  const openTasks = computed(
    () => lifecycle.value?.tasks.filter((t) => t.status === 'open') ?? [],
  )

  async function load(shipmentId: number) {
    loading.value = true
    error.value = null
    try {
      const data = await fetchJobLifecycle(shipmentId, role.value)
      lifecycle.value = data.lifecycle
      milestones.value = data.milestones
      allowedActions.value = data.allowedActions
      allowedActionsSource.value = data.allowedActionsSource ?? 'msw'
      moneyBlock.value = data.moneyBlock
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load lifecycle'
      if (lifecycle.value?.shipmentId !== shipmentId) {
        lifecycle.value = null
        milestones.value = []
        allowedActions.value = []
        allowedActionsSource.value = 'msw'
        moneyBlock.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function clearGate(gateId: string) {
    if (!lifecycle.value) return
    const shipmentId = lifecycle.value.shipmentId
    const data = await clearJobGate(shipmentId, gateId)
    lifecycle.value = data.lifecycle
    milestones.value = data.milestones
    await load(shipmentId)
    await tasksStore.load()
    await useJobStore().load(shipmentId)
  }

  async function completeTask(taskId: string) {
    if (!lifecycle.value) return
    const shipmentId = lifecycle.value.shipmentId
    const data = await completeJobTask(shipmentId, taskId)
    lifecycle.value = data.lifecycle
    milestones.value = data.milestones
    await load(shipmentId)
    await tasksStore.load()
    await useJobStore().load(shipmentId)
  }

  function clear() {
    lifecycle.value = null
    milestones.value = []
    allowedActions.value = []
    allowedActionsSource.value = 'msw'
    moneyBlock.value = null
    error.value = null
  }

  return {
    loading,
    error,
    lifecycle,
    milestones,
    allowedActions,
    allowedActionsSource,
    moneyBlock,
    openGates,
    openTasks,
    role,
    load,
    clearGate,
    completeTask,
    clear,
  }
})
