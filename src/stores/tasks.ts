import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchMyTasks } from '@/api/client'
import type {
  ActingRole,
  DeskQueue,
  MarketPack,
  MyTasksPayload,
  RaciMark,
  TaskItem,
  WorkboardJob,
} from '@/api/types'
import { queueForMark } from '@/api/types'
import { useMastersStore } from '@/stores/masters'

function pendingCustomerApprovals(): TaskItem[] {
  const masters = useMastersStore()
  return masters.pendingCustomers.map((c) => ({
    id: `mdm-approve-${c.value}`,
    priority: 'high' as const,
    title: `Approve new customer · ${c.label}`,
    shipmentId: 8801,
    jobNo: 'MDM-DRAFT',
    pack: 'GLOBAL' as const,
    roleMarks: {
      operations: 'I' as const,
      sales: 'C' as const,
      finance: 'A' as const,
      admin: 'A' as const,
    },
    nodeType: 'task' as const,
    responsible: c.requestedBy ?? 'Sales',
    accountable: 'Finance',
    dueLabel: 'Credit / master activation',
    why: 'Quick-created on quote — pending Finance (A) before Active in MDM',
    hawb: null,
    mawb: null,
    lane: '—',
    customer: c.label,
    cutoffLabel: 'Approve to activate',
    etdLabel: '—',
    primaryCta: 'Review customer',
    approveCta: 'Approve customer',
    trigger: 'In-flow quick create',
    dataRequired: ['Company name', 'Country', 'Partner role(s)', 'Contact', 'Credit posture'],
    output: 'Customer Active in catalog (adapter → mdm-service)',
  }))
}

export const useTasksStore = defineStore('tasks', () => {
  const role = ref<ActingRole>('operations')
  const activePack = ref<MarketPack>('GLOBAL')
  const activeQueue = ref<DeskQueue>('myTasks')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const payload = ref<MyTasksPayload | null>(null)

  const summary = computed(() => payload.value?.summary ?? {
    exceptions: 0,
    activeJobs: 0,
    priorityCounts: { critical: 0, high: 0, medium: 0 },
  })

  const workboard = computed<WorkboardJob[]>(() => payload.value?.workboard ?? [])

  function markFor(task: TaskItem): RaciMark {
    return task.roleMarks[role.value]
  }

  function packMatch(task: TaskItem) {
    if (activePack.value === 'GLOBAL') return true
    return task.pack === activePack.value
  }

  const packFiltered = computed(() =>
    [...(payload.value?.tasks ?? []), ...pendingCustomerApprovals()].filter(packMatch),
  )

  const desk = computed(() => {
    const myTasks: TaskItem[] = []
    const myApprovals: TaskItem[] = []
    const myWatch: TaskItem[] = []

    for (const task of packFiltered.value) {
      const mark = markFor(task)
      const queue = queueForMark(mark)
      if (queue === 'myTasks') myTasks.push(task)
      else if (queue === 'myApprovals') myApprovals.push(task)
      else myWatch.push(task)
    }

    return { myTasks, myApprovals, myWatch }
  })

  const queueCounts = computed(() => ({
    myTasks: desk.value.myTasks.length,
    myApprovals: desk.value.myApprovals.length,
    myWatch: desk.value.myWatch.length,
  }))

  const visibleTasks = computed(() => desk.value[activeQueue.value])

  async function load() {
    loading.value = true
    error.value = null
    try {
      payload.value = await fetchMyTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tasks'
      payload.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    role,
    activePack,
    activeQueue,
    loading,
    error,
    summary,
    workboard,
    desk,
    queueCounts,
    visibleTasks,
    markFor,
    load,
  }
})
