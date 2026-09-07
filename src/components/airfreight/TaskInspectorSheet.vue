<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Copy,
  Lock,
  PanelRight,
  ShieldCheck,
  UserCheck,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { GateChecklistItem, RaciMark, TaskItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { canApproveGate } from '@/lib/taskOwnership'
import { useGateChecklistStore } from '@/stores/gateChecklist'
import { useTasksStore } from '@/stores/tasks'

const props = defineProps<{
  open: boolean
  task: TaskItem | null
  mark: RaciMark | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  action: [task: TaskItem]
  approveGate: [task: TaskItem]
  refreshTask: [task: TaskItem]
}>()

const { t } = useI18n()
const router = useRouter()
const gateStore = useGateChecklistStore()
const tasksStore = useTasksStore()
const fulfilling = ref<string | null>(null)

const checklist = computed(() => props.task?.gateChecklist ?? [])

const opsRole = computed(
  () => tasksStore.role === 'operations' || tasksStore.role === 'admin',
)

const packBadge = computed(() => {
  if (!props.task) return ''
  return props.task.packVersion ?? `${props.task.pack} Pack`
})

const milestoneLabel = computed(() => {
  const id = props.task?.milestoneId
  if (!id) return null
  return t(`myTasks.milestone.${id}`)
})

const gateOpen = computed(() => Boolean(props.task?.approvalGate?.open))

const showApprove = computed(() =>
  props.task ? canApproveGate(props.task, props.mark) : false,
)

function onOpenChange(next: boolean) {
  emit('update:open', next)
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Copy failed')
  }
}

function openWorkspace() {
  if (!props.task) return
  if (props.task.jobNo === 'MDM-DRAFT') {
    emit('action', props.task)
    emit('update:open', false)
    return
  }
  void router.push({
    name: 'job-context',
    params: { shipmentId: String(props.task.shipmentId) },
  })
  emit('update:open', false)
}

function onApproveGate() {
  if (!props.task || !showApprove.value) return
  emit('approveGate', props.task)
}

async function onFulfilItem(item: GateChecklistItem) {
  if (!props.task?.gateId || fulfilling.value || item.met) return
  fulfilling.value = item.itemCode
  try {
    await gateStore.fulfil(props.task.shipmentId, props.task.gateId, item.itemCode)
    await tasksStore.load()
    toast.success(t('jobContext.clearanceGate.itemFulfilled', { name: item.itemName }))
    const refreshed = tasksStore.allDeskTasks.find((t) => t.id === props.task!.id)
    if (refreshed) emit('refreshTask', refreshed)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('jobContext.clearanceGate.fulfilFailed'))
  } finally {
    fulfilling.value = null
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="onOpenChange">
    <SheetContent side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <template v-if="task">
        <SheetHeader class="space-y-2 border-b border-border px-5 py-4 text-left">
          <div class="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle class="font-mono text-base tracking-tight">{{ task.jobNo }}</SheetTitle>
            <Badge variant="pack" class="rounded-md text-[10px]">{{ packBadge }}</Badge>
          </div>
          <SheetDescription class="text-sm font-medium text-foreground">
            {{ task.customer }}
          </SheetDescription>
        </SheetHeader>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <!-- Routing & reference -->
          <section class="space-y-2.5">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('myTasks.inspector.routing') }}
            </h3>
            <div class="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
              <div class="flex justify-between gap-2 py-1">
                <span class="text-muted-foreground">{{ t('myTasks.fields.lane') }}</span>
                <span class="font-medium">{{ task.lane }}</span>
              </div>
              <div class="flex items-center justify-between gap-2 py-1">
                <span class="text-muted-foreground">MAWB</span>
                <span class="flex items-center gap-1 font-mono">
                  {{ task.mawb ?? t('myTasks.fields.noAwb') }}
                  <Button
                    v-if="task.mawb"
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    @click="copyText(task.mawb!, 'MAWB')"
                  >
                    <Copy :size="12" :stroke-width="2" aria-hidden="true" />
                  </Button>
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 py-1">
                <span class="text-muted-foreground">HAWB</span>
                <span class="flex items-center gap-1 font-mono">
                  {{ task.hawb ?? t('myTasks.fields.noAwb') }}
                  <Button
                    v-if="task.hawb"
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    @click="copyText(task.hawb!, 'HAWB')"
                  >
                    <Copy :size="12" :stroke-width="2" aria-hidden="true" />
                  </Button>
                </span>
              </div>
              <Separator class="my-1.5" />
              <div class="flex justify-between gap-2 py-1">
                <span class="text-muted-foreground">{{ t('myTasks.inspector.flight') }}</span>
                <span class="font-medium">{{ task.flightLabel ?? '—' }}</span>
              </div>
              <div class="flex justify-between gap-2 py-1">
                <span class="text-muted-foreground">ETD</span>
                <span class="font-medium">{{ task.etdLabel }}</span>
              </div>
              <div class="flex justify-between gap-2 py-1">
                <span class="text-muted-foreground">ETA</span>
                <span class="font-medium">{{ task.etaLabel ?? '—' }}</span>
              </div>
            </div>
          </section>

          <!-- Compliance / hold -->
          <section class="space-y-2.5">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('myTasks.inspector.compliance') }}
            </h3>
            <div class="rounded-lg border border-border px-3 py-2.5 text-xs">
              <div class="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge v-if="milestoneLabel" variant="secondary" class="rounded-md text-[10px]">
                  {{ milestoneLabel }}
                </Badge>
                <Badge v-if="task.holdType || task.gateTitle" variant="gate" class="rounded-md text-[10px]">
                  {{ task.gateTitle ?? t(`exception.holdType.${task.holdType}`) }}
                </Badge>
                <Badge v-if="task.moneyRisk" variant="high" class="rounded-md text-[10px]">
                  {{ t('myTasks.chips.moneyRisk') }}
                </Badge>
              </div>
              <p class="leading-relaxed text-muted-foreground">
                {{
                  task.regulatoryReason ??
                  t('myTasks.inspector.noGateReason')
                }}
              </p>
              <div v-if="task.blockedActions?.length" class="mt-3 space-y-1.5">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {{ t('myTasks.inspector.blocked') }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <Badge
                    v-for="a in task.blockedActions"
                    :key="a"
                    variant="critical"
                    class="rounded-md text-[10px]"
                  >
                    {{ a }}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <!-- Gate checklist (Ops fulfil → Finance A) -->
          <section v-if="checklist.length" class="space-y-2.5">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('jobContext.clearanceGate.checklist') }}
            </h3>
            <ul class="space-y-1.5 rounded-lg border border-border px-3 py-2.5 text-xs">
              <li
                v-for="item in checklist"
                :key="item.itemCode"
                class="flex flex-wrap items-center justify-between gap-2 py-1"
              >
                <div class="flex min-w-0 items-start gap-2">
                  <CheckCircle2
                    v-if="item.met"
                    :size="14"
                    class="mt-0.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <Circle v-else :size="14" class="mt-0.5 shrink-0 text-muted-foreground" />
                  <span class="font-medium">{{ item.itemName }}</span>
                </div>
                <Button
                  v-if="!item.met && item.fulfilRole === 'operations'"
                  size="xs"
                  variant="outline"
                  :disabled="!opsRole || fulfilling === item.itemCode"
                  @click="onFulfilItem(item)"
                >
                  {{ t('jobContext.clearanceGate.confirm') }}
                </Button>
              </li>
            </ul>
          </section>

          <!-- Ownership & next step (Hugh R / A / then) -->
          <section class="space-y-2.5">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('myTasks.inspector.ownership') }}
            </h3>
            <div class="space-y-2.5">
              <!-- Now -->
              <div class="rounded-lg border border-border px-3 py-2.5 text-xs">
                <div class="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <UserCheck :size="12" :stroke-width="2" aria-hidden="true" />
                  {{ t('myTasks.inspector.now') }}
                </div>
                <div class="font-semibold text-foreground">{{ task.title }}</div>
                <div class="mt-2 flex items-start gap-2">
                  <Badge variant="raciR" class="h-5 w-5 justify-center rounded-md px-0 text-[10px]">
                    R
                  </Badge>
                  <div>
                    <div class="font-semibold">{{ task.responsible }}</div>
                    <div class="text-[11px] text-muted-foreground">
                      {{ task.responsibleTitle ?? t('myTasks.fields.responsible') }}
                    </div>
                  </div>
                </div>
                <div v-if="mark" class="mt-2 text-[11px] text-muted-foreground">
                  {{ t('myTasks.inspector.yourMark', { mark }) }}
                </div>
              </div>

              <!-- Approval gate (A open) -->
              <div
                v-if="gateOpen && task.approvalGate"
                class="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/30"
              >
                <div class="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                  <Lock :size="13" :stroke-width="2" aria-hidden="true" />
                  {{ t('myTasks.inspector.signoffRequired') }}
                </div>
                <p class="leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                  {{ task.approvalGate.reason }}
                </p>
                <div class="mt-2.5 flex items-start gap-2">
                  <Badge variant="raciA" class="h-5 w-5 justify-center rounded-md px-0 text-[10px]">
                    A
                  </Badge>
                  <div>
                    <div class="font-semibold text-foreground">
                      {{ task.approvalGate.approverName ?? task.accountable ?? task.approvalGate.approverSeat }}
                    </div>
                    <div class="text-[11px] text-muted-foreground">
                      {{ task.approvalGate.approverSeat }}
                    </div>
                  </div>
                </div>
                <Button
                  v-if="showApprove"
                  class="mt-3 w-full"
                  size="sm"
                  @click="onApproveGate"
                >
                  <ShieldCheck :size="14" :stroke-width="2" class="mr-1.5" aria-hidden="true" />
                  {{ t('myTasks.inspector.approveGate') }}
                </Button>
                <p
                  v-else
                  class="mt-2.5 text-[11px] text-muted-foreground"
                >
                  {{ t('myTasks.inspector.approveGateHint') }}
                </p>
              </div>

              <!-- Then next (one step) -->
              <div
                v-if="task.nextHandoff"
                class="rounded-lg border border-border px-3 py-2.5 text-xs"
              >
                <div class="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <ArrowRight :size="12" :stroke-width="2" aria-hidden="true" />
                  {{ t('myTasks.inspector.thenNext') }}
                </div>
                <div class="font-semibold text-foreground">{{ task.nextHandoff.taskTitle }}</div>
                <div class="mt-2 flex items-start gap-2">
                  <Badge
                    :variant="task.nextHandoff.mark === 'A' ? 'raciA' : 'raciR'"
                    class="h-5 w-5 justify-center rounded-md px-0 text-[10px]"
                  >
                    {{ task.nextHandoff.mark }}
                  </Badge>
                  <div>
                    <div class="font-semibold">
                      {{ task.nextHandoff.personName ?? task.nextHandoff.seat }}
                    </div>
                    <div class="text-[11px] text-muted-foreground">
                      {{ task.nextHandoff.seat }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <SheetFooter class="border-t border-border px-5 py-3.5 sm:flex-row sm:space-x-0">
          <Button class="w-full sm:w-auto" @click="openWorkspace">
            <PanelRight :size="14" :stroke-width="2" class="mr-1.5" aria-hidden="true" />
            {{ t('myTasks.inspector.openWorkspace') }}
          </Button>
        </SheetFooter>
      </template>
    </SheetContent>
  </Sheet>
</template>
