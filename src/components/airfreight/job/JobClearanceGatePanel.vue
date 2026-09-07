<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { CheckCircle2, Circle, Lock, ShieldCheck } from '@lucide/vue'
import type { GateChecklistItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'
import { clearanceBlocksMoney } from '@/lib/moneyGates'
import { useGateChecklistStore } from '@/stores/gateChecklist'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useTasksStore } from '@/stores/tasks'

const props = defineProps<{
  shipmentId: number
  gateId?: string
}>()

const { t } = useI18n()
const gateStore = useGateChecklistStore()
const tasks = useTasksStore()
const jobStore = useJobStore()
const life = useLifecycleStore()

const gateId = computed(() => props.gateId ?? AU_CLEARANCE_GATE_ID)
const fulfilling = ref<string | null>(null)
const stamping = ref(false)

const detail = computed(() => gateStore.detail)
const items = computed(() => detail.value?.items ?? [])

const showPanel = computed(() => {
  const job = jobStore.job
  if (!job || job.shipmentId !== props.shipmentId) return false
  return clearanceBlocksMoney(job.clearance) && detail.value?.status === 'open'
})

const opsRole = computed(
  () => tasks.role === 'operations' || tasks.role === 'admin',
)
const financeRole = computed(
  () => tasks.role === 'finance' || tasks.role === 'admin',
)

const canStamp = computed(() => Boolean(detail.value?.canStamp))

async function reload() {
  await gateStore.load(props.shipmentId, gateId.value)
}

watch(
  () => props.shipmentId,
  (id) => {
    if (id) void reload()
  },
)

onMounted(() => {
  void reload()
})

function itemLabel(item: GateChecklistItem) {
  if (item.fulfilRole === 'auto') {
    return t('jobContext.clearanceGate.autoVerified')
  }
  return t('jobContext.clearanceGate.opsFulfil')
}

async function onFulfil(item: GateChecklistItem) {
  if (fulfilling.value || item.met || item.fulfilRole !== 'operations') return
  if (!opsRole.value) {
    toast.error(t('jobContext.clearanceGate.opsOnly'))
    return
  }
  fulfilling.value = item.itemCode
  try {
    await gateStore.fulfil(props.shipmentId, gateId.value, item.itemCode)
    toast.success(t('jobContext.clearanceGate.itemFulfilled', { name: item.itemName }))
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('jobContext.clearanceGate.fulfilFailed'))
  } finally {
    fulfilling.value = null
  }
}

async function onStamp() {
  if (stamping.value || !canStamp.value) return
  if (!financeRole.value) {
    toast.error(t('jobContext.clearanceGate.financeOnly'))
    return
  }
  stamping.value = true
  try {
    await gateStore.stamp(props.shipmentId, gateId.value)
    await life.load(props.shipmentId)
    await jobStore.load(props.shipmentId)
    toast.success(t('jobContext.clearance.clearedToast'))
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('jobContext.clearanceGate.stampFailed'))
  } finally {
    stamping.value = false
  }
}
</script>

<template>
  <section
    v-if="showPanel"
    id="clearance-gate-panel"
    class="rounded-[10px] border border-amber-200 bg-amber-50/60 px-4 py-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
  >
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="flex items-center gap-2">
          <Lock :size="14" :stroke-width="2" class="text-amber-700 dark:text-amber-300" />
          <h2 class="text-[13px] font-semibold text-amber-950 dark:text-amber-100">
            {{ detail?.title ?? t('jobContext.clearanceGate.title') }}
          </h2>
          <Badge variant="critical" class="h-5 rounded-md px-1.5 text-[10px]">
            {{ t('jobContext.clearanceGate.checklist') }}
          </Badge>
        </div>
        <p class="mt-1 text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-100/70">
          {{ t('jobContext.clearanceGate.hint') }}
        </p>
      </div>
    </div>

    <ul class="space-y-2">
      <li
        v-for="item in items"
        :key="item.itemCode"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-xs dark:border-amber-900/30 dark:bg-background/60"
      >
        <div class="flex min-w-0 items-start gap-2">
          <CheckCircle2
            v-if="item.met"
            :size="16"
            :stroke-width="2"
            class="mt-0.5 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <Circle
            v-else
            :size="16"
            :stroke-width="2"
            class="mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <div class="font-medium text-foreground">{{ item.itemName }}</div>
            <div class="text-[10px] text-muted-foreground">
              {{ itemLabel(item) }}
              <template v-if="item.met && item.metBy">
                · {{ item.metBy }}
                <template v-if="item.metAt"> · {{ item.metAt }}</template>
              </template>
            </div>
          </div>
        </div>
        <Button
          v-if="!item.met && item.fulfilRole === 'operations'"
          size="sm"
          variant="outline"
          class="h-7 shrink-0 text-[11px]"
          :disabled="!opsRole || fulfilling === item.itemCode"
          @click="onFulfil(item)"
        >
          {{ t('jobContext.clearanceGate.confirm') }}
        </Button>
      </li>
    </ul>

    <div
      v-if="canStamp"
      class="mt-3 rounded-lg border border-amber-200 bg-amber-100/50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <p class="text-[11px] font-medium text-amber-950 dark:text-amber-100">
        {{ t('jobContext.clearanceGate.stampRequired') }}
      </p>
      <p class="mt-1 text-[10px] text-muted-foreground">
        {{ detail?.approverName ?? detail?.approverSeat }} ·
        {{ t('myTasks.inspector.signoffRequired') }}
      </p>
      <Button
        class="mt-2.5 w-full sm:w-auto"
        size="sm"
        :disabled="!financeRole || stamping"
        @click="onStamp"
      >
        <ShieldCheck :size="14" :stroke-width="2" class="mr-1.5" aria-hidden="true" />
        {{ t('jobContext.clearanceGate.stampAction') }}
      </Button>
      <p v-if="!financeRole" class="mt-2 text-[10px] text-muted-foreground">
        {{ t('jobContext.clearanceGate.financeOnly') }}
      </p>
    </div>

    <p
      v-else-if="items.some((i) => !i.met && i.fulfilRole === 'operations')"
      class="mt-3 text-[11px] text-muted-foreground"
    >
      {{ t('jobContext.clearanceGate.opsPending') }}
    </p>
  </section>
</template>
