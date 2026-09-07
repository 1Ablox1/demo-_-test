import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { WORKBENCH_JOBS, type WorkbenchJob } from '@/data/workbench'
import type { Seat } from '@/stores/auth'
import { SEAT_LABELS } from '@/stores/auth'
import { operatorName } from '@/data/seatOperators'
import type { SpineLobPrefix } from '@/types/spineLob'

export const useNeedsYouStore = defineStore('needsYou', () => {
  const dynamicTasks = ref<WorkbenchJob[]>([])

  const allJobs = computed(() => [...dynamicTasks.value, ...WORKBENCH_JOBS])

  function pushHandoffTask(input: {
    shipmentId: string
    jobNo: string
    customer: string
    route: string
    lobPrefix: SpineLobPrefix
    note: string
    fromSeat: Seat
    toSeat: Seat
  }) {
    const id = `task-handoff-${input.shipmentId}`
    // Replace prior handoff for same file
    dynamicTasks.value = dynamicTasks.value.filter((t) => t.id !== id)
    const fromLabel = SEAT_LABELS[input.fromSeat]
    const task: WorkbenchJob = {
      id,
      jobId: input.shipmentId,
      lobPrefix: input.lobPrefix,
      jobNo: input.jobNo,
      masterBill: null,
      houseBill: null,
      priority: 'High',
      raci: input.toSeat === 'finance' ? 'A' : 'R',
      hasGate: true,
      title: 'Ops handed off — review duty/GST & stamp',
      route: input.route,
      jobType: 'Air Import',
      pack: 'GLOBAL',
      packExtra: 'AU',
      moneyRisk: 0,
      severityIndex: 1,
      responsible: operatorName('customsOps'),
      accountable: operatorName('financeLead'),
      due: 'Today',
      why: `${fromLabel} finished operate gates. Remark: ${input.note}`,
      tab: 'approvals',
      customer: input.customer,
      actionLabel: 'Open job · stamp',
    }
    dynamicTasks.value = [task, ...dynamicTasks.value]
  }

  function dismiss(taskId: string) {
    dynamicTasks.value = dynamicTasks.value.filter((t) => t.id !== taskId)
  }

  return {
    dynamicTasks,
    allJobs,
    pushHandoffTask,
    dismiss,
  }
})
