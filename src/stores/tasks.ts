import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchMyTasks } from '@/api/client'
import type {
  ActingRole,
  DeskQueue,
  MyTasksPayload,
  RaciMark,
  TaskItem,
  WorkboardJob,
} from '@/api/types'
import { queueForMark } from '@/api/types'
import { filterTasksByQuery } from '@/lib/searchIndex'
import { useMastersStore } from '@/stores/masters'
import { useOsSearchStore } from '@/stores/osSearch'

function pendingCustomerApprovals(): TaskItem[] {
  const masters = useMastersStore()
  return masters.pendingCustomers.map((c) => ({
    id: `mdm-approve-${c.value}`,
    priority: 'high' as const,
    title: `Approve new customer · ${c.label}`,
    shipmentId: 8801,
    lob: 'air_export' as const,
    jobNo: 'MDM-DRAFT',
    pack: 'GLOBAL' as const,
    packVersion: 'GLOBAL Pack v1.4.2',
    roleMarks: {
      operations: 'I' as const,
      sales: 'C' as const,
      finance: 'A' as const,
      admin: 'A' as const,
    },
    nodeType: 'task' as const,
    responsible: c.requestedBy ?? 'Alex Rivera',
    responsibleTitle: 'Pricing',
    accountable: 'Marcello Vance',
    accountableTitle: 'Finance',
    dueLabel: 'Credit / master activation',
    why: 'Approve new customer for MDM',
    hawb: null,
    mawb: null,
    lane: '—',
    customer: c.label,
    cutoffLabel: 'Approve to activate',
    cutoffKind: 'MDM Approve',
    cutoffAt: 'ASAP',
    etdLabel: '—',
    primaryCta: 'Review customer',
    approveCta: 'Approve customer',
    milestoneId: 'quote',
    trigger: 'In-flow quick create',
    dataRequired: ['Company name', 'Country', 'Partner role(s)', 'Contact', 'Credit posture'],
    output: 'Customer Active in catalog (adapter → mdm-service)',
    approvalGate: {
      open: true,
      approverSeat: 'Finance',
      approverName: 'Marcello Vance',
      reason: 'New customer credit / master activation — Finance A must approve before catalog use.',
    },
    nextHandoff: {
      taskTitle: 'Complete quote weight / FOB',
      seat: 'Sales',
      personName: 'Alex Rivera',
      mark: 'R',
    },
  }))
}

export const useTasksStore = defineStore('tasks', () => {
  const role = ref<ActingRole>('operations')
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

  const allDeskTasks = computed(() =>
    [...(payload.value?.tasks ?? []), ...pendingCustomerApprovals()],
  )

  const deskFilterQuery = computed(() => useOsSearchStore().deskFilter)

  const filteredTasks = computed(() =>
    filterTasksByQuery(allDeskTasks.value, deskFilterQuery.value),
  )

  const desk = computed(() => {
    const myTasks: TaskItem[] = []
    const myApprovals: TaskItem[] = []
    const myWatch: TaskItem[] = []

    for (const task of filteredTasks.value) {
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

  const tasks = computed(() => filteredTasks.value)

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
    activeQueue,
    loading,
    error,
    summary,
    workboard,
    desk,
    queueCounts,
    visibleTasks,
    tasks,
    allDeskTasks,
    markFor,
    load,
  }
})
