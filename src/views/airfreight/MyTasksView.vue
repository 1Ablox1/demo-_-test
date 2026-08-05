<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { DeskQueue, TaskItem, WorkboardJob } from '@/api/types'
import AppShell from '@/components/airfreight/AppShell.vue'
import CreateQuoteModal from '@/components/airfreight/CreateQuoteModal.vue'
import ExceptionDrawer from '@/components/airfreight/ExceptionDrawer.vue'
import TaskCard from '@/components/airfreight/TaskCard.vue'
import TaskRow from '@/components/airfreight/TaskRow.vue'
import WorkboardPanel from '@/components/airfreight/WorkboardPanel.vue'
import Badge from '@/components/ui/Badge.vue'
import { destinationForTask } from '@/lib/navDestinations'
import { useMastersStore } from '@/stores/masters'
import { useTasksStore } from '@/stores/tasks'

type DeskViewMode = 'list' | 'cards'

const store = useTasksStore()
const masters = useMastersStore()
const router = useRouter()
const { t } = useI18n()
const drawerOpen = ref(false)
const quoteOpen = ref(false)
/** Dense list is default for Western ops trust; cards remain available. */
const viewMode = ref<DeskViewMode>('list')

/** ACT-02: Sales + Ops are R on create quote — Finance/Admin do not get the CTA */
const canCreateQuote = computed(
  () => store.role === 'sales' || store.role === 'operations',
)

const tabs: { id: DeskQueue; labelKey: string; marker: string }[] = [
  { id: 'myTasks', labelKey: 'myTasks.queues.myTasks', marker: 'R' },
  { id: 'myApprovals', labelKey: 'myTasks.queues.myApprovals', marker: 'A' },
  { id: 'myWatch', labelKey: 'myTasks.queues.myWatch', marker: 'C/I' },
]

onMounted(() => {
  void store.load()
})

function goToJob(shipmentId: number) {
  if (shipmentId === 8801) {
    if (canCreateQuote.value) {
      quoteOpen.value = true
      return
    }
    void router.push({ name: 'job-context', params: { shipmentId: '8801' } })
    return
  }
  void router.push({ name: 'job-context', params: { shipmentId: String(shipmentId) } })
}

function onAction(task: TaskItem) {
  const dest = destinationForTask(task, canCreateQuote.value)
  if (dest === 'mdm-approve') {
    const value = task.id.replace('mdm-approve-', '')
    masters.approveCustomer(value)
    return
  }
  if (dest === 'create-quote') {
    quoteOpen.value = true
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

function onSelectJob(job: WorkboardJob) {
  goToJob(job.shipmentId)
}

function createQuote() {
  if (!canCreateQuote.value) return
  quoteOpen.value = true
}
</script>

<template>
  <AppShell>
    <div class="mx-auto flex max-w-[1380px] items-start gap-5 px-6 py-6">
      <section class="min-w-0 flex-1">
        <div class="mb-5">
          <div class="mb-2 flex flex-wrap items-baseline gap-3.5">
            <h1 class="text-[22px] font-semibold tracking-tight">{{ t('myTasks.title') }}</h1>
            <span class="text-[13px] text-muted-foreground">
              {{
                t('myTasks.todaySummary', {
                  exceptions: store.summary.exceptions,
                  jobs: store.summary.activeJobs,
                })
              }}
            </span>
            <button
              v-if="canCreateQuote"
              type="button"
              class="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-500"
              :title="`${t('myTasks.createQuoteHint')} · ${t('nav.dest.createQuote')}`"
              @click="createQuote"
            >
              {{ t('myTasks.createQuote') }}
            </button>
          </div>
          <p class="mb-2 text-[11px] text-muted-foreground">{{ t('myTasks.navLegend') }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="critical">
              <span class="h-1.5 w-1.5 rounded-full bg-red-600" />
              {{ t('myTasks.priority.critical') }}
            </Badge>
            <span class="min-w-2 text-xs text-muted-foreground">{{
              store.summary.priorityCounts.critical
            }}</span>
            <Badge variant="high">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-600" />
              {{ t('myTasks.priority.high') }}
            </Badge>
            <span class="min-w-2 text-xs text-muted-foreground">{{
              store.summary.priorityCounts.high
            }}</span>
            <Badge variant="medium">
              <span class="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {{ t('myTasks.priority.medium') }}
            </Badge>
            <span class="text-xs text-muted-foreground">{{
              store.summary.priorityCounts.medium
            }}</span>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border">
          <div class="flex">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2 text-[13px] font-medium transition"
              :class="
                store.activeQueue === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="store.activeQueue = tab.id"
            >
              <span
                class="text-[10px] font-normal text-muted-foreground"
                :title="`RACI ${tab.marker}`"
              >
                {{ tab.marker }}
              </span>
              {{ t(tab.labelKey) }}
              <span
                class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                :class="
                  store.activeQueue === tab.id
                    ? 'bg-primary-tint text-primary'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ store.queueCounts[tab.id] }}
              </span>
            </button>
          </div>

          <div class="flex shrink-0 gap-1 pb-2">
            <button
              type="button"
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition"
              :class="
                viewMode === 'list'
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              @click="viewMode = 'list'"
            >
              {{ t('myTasks.viewMode.list') }}
            </button>
            <button
              type="button"
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition"
              :class="
                viewMode === 'cards'
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              @click="viewMode = 'cards'"
            >
              {{ t('myTasks.viewMode.cards') }}
            </button>
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
          v-else-if="store.visibleTasks.length && viewMode === 'list'"
          class="overflow-hidden rounded-[10px] border border-border bg-white"
        >
          <div
            class="hidden border-b border-border bg-zinc-50 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,280px)_160px_170px_minmax(0,1fr)] sm:gap-3"
          >
            <span>{{ t('myTasks.fields.jobNo') }} / AWB</span>
            <span>{{ t('myTasks.fields.lane') }}</span>
            <span>{{ t('myTasks.fields.cutoff') }}</span>
            <span>{{ t('myTasks.fields.why') }}</span>
          </div>
          <TaskRow
            v-for="task in store.visibleTasks"
            :key="task.id"
            :task="task"
            :mark="store.markFor(task)"
            @action="onAction"
            @exception="drawerOpen = true"
          />
        </div>

        <div
          v-else-if="store.visibleTasks.length && viewMode === 'cards'"
          class="grid grid-cols-[repeat(auto-fill,minmax(295px,1fr))] gap-3.5"
        >
          <TaskCard
            v-for="task in store.visibleTasks"
            :key="task.id"
            :task="task"
            :mark="store.markFor(task)"
            @action="onAction"
            @exception="drawerOpen = true"
          />
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
        >
          <div class="text-[15px] font-semibold text-zinc-700">
            {{ t(`myTasks.emptyQueue.${store.activeQueue}`) }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ store.summary.activeJobs }} {{ t('myTasks.workboardActiveJobs').toLowerCase() }}
          </div>
        </div>
      </section>

      <WorkboardPanel :jobs="store.workboard" @select-job="onSelectJob" />
    </div>

    <ExceptionDrawer
      :open="drawerOpen"
      :role="store.role"
      shipment-id="1024"
      @close="drawerOpen = false"
    />

    <CreateQuoteModal :open="quoteOpen" @close="quoteOpen = false" />
  </AppShell>
</template>
