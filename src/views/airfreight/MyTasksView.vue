<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { DeskQueue, TaskItem, WorkboardJob } from '@/api/types'
import AppShell from '@/components/airfreight/AppShell.vue'
import NeedsYouTable from '@/components/airfreight/NeedsYouTable.vue'
import TaskCard from '@/components/airfreight/TaskCard.vue'
import TaskInspectorSheet from '@/components/airfreight/TaskInspectorSheet.vue'
import WorkboardPanel from '@/components/airfreight/WorkboardPanel.vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSeatPermissions } from '@/composables/useSeatPermissions'
import { QUOTE_STAGE_SHIPMENT_ID } from '@/lib/createJobIntent'
import { formatJobNo } from '@/lib/jobIdentity'
import { destinationForTask } from '@/lib/navDestinations'
import { useMastersStore } from '@/stores/masters'
import { useOsSearchStore } from '@/stores/osSearch'
import { useTasksStore } from '@/stores/tasks'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'
import { useGateChecklistStore } from '@/stores/gateChecklist'
import { toast } from 'vue-sonner'
type DeskViewMode = 'list' | 'cards'

const store = useTasksStore()
const search = useOsSearchStore()
const masters = useMastersStore()
const router = useRouter()
const route = useRoute()
const gateStore = useGateChecklistStore()
const { t } = useI18n()
const { canOpenCreateJob } = useSeatPermissions()

const inspectorOpen = ref(false)
const selectedTask = ref<TaskItem | null>(null)
const viewMode = ref<DeskViewMode>('list')

const activeQueue = computed({
  get: () => store.activeQueue,
  set: (id: string | number) => {
    store.activeQueue = String(id) as DeskQueue
  },
})

const selectedMark = computed(() =>
  selectedTask.value ? store.markFor(selectedTask.value) : null,
)

const tabs: { id: DeskQueue; labelKey: string; marker: string }[] = [
  { id: 'myTasks', labelKey: 'myTasks.queues.myTasks', marker: 'R' },
  { id: 'myApprovals', labelKey: 'myTasks.queues.myApprovals', marker: 'A' },
  { id: 'myWatch', labelKey: 'myTasks.queues.myWatch', marker: 'C/I' },
]

onMounted(() => {
  void store.load()
})

watch(
  () => route.query.denied,
  (denied) => {
    if (denied === 'create_job' || denied === 'initialize_booking') {
      toast.error(t('createJob.forbidden'))
    } else if (denied === 'create_quote') {
      toast.error(t('quote.forbidden'))
    }
    if (denied) {
      void router.replace({ name: 'my-tasks' })
    }
  },
  { immediate: true },
)

function openQuoteForm(lob = 'AI') {
  void router.push({ name: 'create-quote', query: { lob } })
}

function goToJob(shipmentId: number) {
  if (shipmentId === QUOTE_STAGE_SHIPMENT_ID) {
    openQuoteForm('AI')
    return
  }
  void router.push({ name: 'job-context', params: { shipmentId: String(shipmentId) } })
}

function onAction(task: TaskItem) {
  const dest = destinationForTask(task)
  if (dest === 'mdm-approve') {
    const value = task.id.replace('mdm-approve-', '')
    void masters.approveCustomer(value)
    return
  }
  if (dest === 'create-quote') {
    openQuoteForm('AI')
    return
  }
  if (dest === 'job-charges') {
    void router.push({
      name: 'job-charges',
      params: { shipmentId: String(task.shipmentId) },
    })
    return
  }
  if (dest === 'job-invoice') {
    void router.push({
      name: 'job-invoice',
      params: { shipmentId: String(task.shipmentId) },
    })
    return
  }
  goToJob(task.shipmentId)
}

function onInspect(task: TaskItem) {
  selectedTask.value = task
  inspectorOpen.value = true
}

async function onApproveGate(task: TaskItem) {
  if (task.id.startsWith('mdm-approve-')) {
    if (task.approvalGate) {
      task.approvalGate.open = false
    }
    toast.success(t('myTasks.inspector.gateApproved'))
    selectedTask.value = {
      ...task,
      approvalGate: task.approvalGate ? { ...task.approvalGate, open: false } : undefined,
    }
    return
  }

  const gateId = task.gateId ?? AU_CLEARANCE_GATE_ID
  if (
    gateId === AU_CLEARANCE_GATE_ID ||
    task.id === 'task-4096-clear-clearance' ||
    task.id === `gate-card-${AU_CLEARANCE_GATE_ID}`
  ) {
    try {
      await gateStore.stamp(task.shipmentId, gateId)
      await store.load()
      toast.success(t('myTasks.inspector.gateApproved'))
      selectedTask.value = {
        ...task,
        approvalGate: task.approvalGate ? { ...task.approvalGate, open: false } : undefined,
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('jobContext.clearanceGate.stampFailed'))
    }
    return
  }

  if (task.approvalGate) {
    task.approvalGate.open = false
  }
  toast.success(t('myTasks.inspector.gateApproved'))
  selectedTask.value = {
    ...task,
    approvalGate: task.approvalGate ? { ...task.approvalGate, open: false } : undefined,
  }
}

function onSelectJob(job: WorkboardJob) {
  const related = store.visibleTasks.find((t) => t.shipmentId === job.shipmentId)
  if (related) {
    onInspect(related)
    return
  }
  goToJob(job.shipmentId)
}

function createJob() {
  if (!canOpenCreateJob.value) return
  void router.push({ name: 'create-job' })
}

function workboardJobNo(job: WorkboardJob) {
  const related = store.tasks.find((t) => t.shipmentId === job.shipmentId)
  if (related) return related.jobNo
  return formatJobNo('air_export', job.shipmentId)
}
</script>

<template>
  <AppShell>
    <div class="h-full overflow-y-auto">
    <div class="mx-auto flex max-w-[1440px] items-start gap-4 px-5 py-4">
      <section class="min-w-0 flex-1">
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 class="text-lg font-semibold tracking-tight">{{ t('myTasks.title') }}</h1>
          <span class="text-[12px] text-muted-foreground">
            {{
              t('myTasks.todaySummary', {
                exceptions: store.summary.exceptions,
                jobs: store.summary.activeJobs,
              })
            }}
          </span>
          <Separator orientation="vertical" class="hidden h-4 sm:block" />
          <div class="flex flex-wrap items-center gap-1.5">
            <Badge variant="critical" class="h-5 gap-1 rounded-md px-1.5 text-[10px]">
              <span class="h-1.5 w-1.5 rounded-full bg-red-600" />
              {{ store.summary.priorityCounts.critical }} {{ t('myTasks.priority.critical') }}
            </Badge>
            <Badge variant="high" class="h-5 gap-1 rounded-md px-1.5 text-[10px]">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-600" />
              {{ store.summary.priorityCounts.high }} {{ t('myTasks.priority.high') }}
            </Badge>
            <Badge variant="medium" class="h-5 gap-1 rounded-md px-1.5 text-[10px]">
              <span class="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {{ store.summary.priorityCounts.medium }} {{ t('myTasks.priority.medium') }}
            </Badge>
          </div>
          <Button
            v-if="canOpenCreateJob"
            size="sm"
            class="ml-auto gap-1.5 font-bold"
            :title="t('createJob.hint')"
            @click="createJob"
          >
            <Plus :size="16" :stroke-width="2.5" />
            {{ t('createJob.cta') }}
          </Button>
        </div>

        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border">
          <Tabs v-model="activeQueue" class="min-w-0 flex-1">
            <TabsList
              variant="line"
              class="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0"
            >
              <TabsTrigger
                v-for="tab in tabs"
                :key="tab.id"
                :value="tab.id"
                class="rounded-none border-b-2 border-transparent px-3 py-2 text-[13px] data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <span class="mr-1.5 text-[10px] text-muted-foreground">{{ tab.marker }}</span>
                {{ t(tab.labelKey) }}
                <span
                  class="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                  :class="
                    store.activeQueue === tab.id
                      ? 'bg-primary-tint text-primary'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ store.queueCounts[tab.id] }}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div class="flex shrink-0 items-center gap-2 pb-2">
            <Input
              v-model="search.deskFilter"
              class="h-8 w-[180px] text-[12px] lg:w-[220px]"
              :placeholder="t('shell.deskFilterPlaceholder')"
            />
            <Button
              size="xs"
              :variant="viewMode === 'list' ? 'secondary' : 'ghost'"
              :class="viewMode === 'list' ? 'bg-primary-tint text-primary' : ''"
              @click="viewMode = 'list'"
            >
              {{ t('myTasks.viewMode.list') }}
            </Button>
            <Button
              size="xs"
              :variant="viewMode === 'cards' ? 'secondary' : 'ghost'"
              :class="viewMode === 'cards' ? 'bg-primary-tint text-primary' : ''"
              @click="viewMode = 'cards'"
            >
              {{ t('myTasks.viewMode.cards') }}
            </Button>
          </div>
        </div>

        <div v-if="store.loading" class="text-sm text-muted-foreground">Loading…</div>
        <div
          v-else-if="store.error"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ store.error }}
        </div>

        <div
          v-else-if="!store.visibleTasks.length && search.deskFilter.trim()"
          class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
        >
          {{ t('shell.noMatches') }}
        </div>

        <NeedsYouTable
          v-else-if="store.visibleTasks.length && viewMode === 'list'"
          :tasks="store.visibleTasks"
          :selected-id="selectedTask?.id"
          @action="onAction"
          @inspect="onInspect"
        />

        <div
          v-else-if="store.visibleTasks.length && viewMode === 'cards'"
          class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3"
        >
          <TaskCard
            v-for="task in store.visibleTasks"
            :key="task.id"
            :task="task"
            :mark="store.markFor(task)"
            @action="onAction"
            @exception="onInspect"
          />
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
        >
          <div class="text-[14px] font-semibold">
            {{ t(`myTasks.emptyQueue.${store.activeQueue}`) }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ store.summary.activeJobs }} {{ t('myTasks.workboardActiveJobs').toLowerCase() }}
          </div>
        </div>
      </section>

      <WorkboardPanel
        :jobs="store.workboard"
        :job-no-for="workboardJobNo"
        @select-job="onSelectJob"
      />
    </div>

    <TaskInspectorSheet
      v-model:open="inspectorOpen"
      :task="selectedTask"
      :mark="selectedMark"
      @action="onAction"
      @approve-gate="onApproveGate"
      @refresh-task="(t) => { selectedTask = t }"
    />

    </div>
  </AppShell>
</template>
