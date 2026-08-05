<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import ExceptionDrawer from '@/components/airfreight/ExceptionDrawer.vue'
import JobNavStrip from '@/components/airfreight/JobNavStrip.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import { useLifecycleStore } from '@/stores/lifecycle'
import type { MilestoneId } from '@/os/types'

const route = useRoute()
const router = useRouter()
const life = useLifecycleStore()
const { t } = useI18n()

const shipmentId = computed(() => Number(route.params.shipmentId))
const selected = ref<MilestoneId>('documents')
const drawerOpen = ref(false)

watch(
  shipmentId,
  (id) => {
    if (Number.isFinite(id)) void life.load(id)
  },
  { immediate: true },
)

watch(
  () => life.lifecycle?.currentMilestoneId,
  (id) => {
    if (id) selected.value = id
  },
)

onMounted(() => {
  if (Number.isFinite(shipmentId.value)) void life.load(shipmentId.value)
})

onUnmounted(() => life.clear())

const steps = computed(() =>
  (life.milestones.length
    ? life.milestones
    : []
  ).map((m) => ({
    id: m.id,
    label: t(`spine.steps.${m.id}`),
    state: m.status,
    openGates: m.openGateIds.length,
    openTasks: m.openTaskIds.length,
  })),
)

const currentMs = computed(() =>
  life.lifecycle?.milestones.find((m) => m.id === selected.value),
)

const gatesHere = computed(() =>
  life.lifecycle?.gates.filter((g) => g.milestoneId === selected.value) ?? [],
)

const tasksHere = computed(() =>
  life.lifecycle?.tasks.filter((t) => t.milestoneId === selected.value) ?? [],
)

function selectStep(id: MilestoneId, locked: boolean) {
  if (locked) return
  if (id === 'charges') {
    void router.push({ name: 'job-charges', params: { shipmentId: String(shipmentId.value) } })
    return
  }
  if (id === 'invoice') {
    void router.push({ name: 'job-invoice', params: { shipmentId: String(shipmentId.value) } })
    return
  }
  if (id === 'quote' && shipmentId.value === 8801) {
    if (life.role === 'sales' || life.role === 'operations') {
      void router.push({ name: 'create-quote' })
    }
    return
  }
  selected.value = id
}

async function onClearGate(gateId: string) {
  await life.clearGate(gateId)
}

async function onCompleteTask(taskId: string) {
  await life.completeTask(taskId)
}

const holdType = computed(() => {
  const g = life.openGates[0]
  if (!g || g.holdType === 'none' || g.holdType === 'margin') return 'docs'
  return g.holdType
})
</script>

<template>
  <AppShell>
    <div class="flex h-[calc(100vh-52px)] flex-col">
      <div class="border-b border-border bg-white px-6 py-2.5">
        <JobNavStrip :shipment-id="shipmentId" current="timeline" compact />
        <div class="mt-1 flex flex-wrap items-center gap-2 px-1 pb-1">
          <Badge variant="pack">{{ t('spine.mgtBadge') }}</Badge>
          <span class="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {{ t('spine.export') }}
          </span>
          <span class="text-[11px] text-muted-foreground">{{ t('spine.stepperHint') }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="(s, i) in steps"
            :key="s.id"
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
            :class="{
              'bg-primary-tint text-primary': s.state === 'current',
              'text-emerald-700': s.state === 'done',
              'text-muted-foreground': s.state === 'pending',
              'cursor-not-allowed text-red-400': s.state === 'locked',
            }"
            :title="
              s.state === 'locked'
                ? t('spine.stepLocked')
                : s.id === 'charges' || s.id === 'invoice'
                  ? t('spine.stepOpensPage')
                  : t('spine.stepSelect')
            "
            @click="selectStep(s.id, s.state === 'locked')"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
              :class="{
                'bg-primary text-white': s.state === 'current',
                'bg-emerald-100 text-emerald-700': s.state === 'done',
                'bg-zinc-100': s.state === 'pending',
                'bg-red-50 text-red-500': s.state === 'locked',
              }"
              >{{ s.state === 'done' ? '✓' : i + 1 }}</span
            >
            {{ s.label }}
            <span
              v-if="s.state === 'locked'"
              class="rounded bg-red-50 px-1 text-[9px] text-red-600"
              >HOLD</span
            >
            <span
              v-else-if="s.openGates"
              class="rounded bg-amber-50 px-1 text-[9px] text-amber-700"
              >{{ s.openGates }}G</span
            >
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div v-if="life.loading" class="text-sm text-muted-foreground">
          {{ t('spine.loadingLife') }}
        </div>
        <div
          v-else-if="life.error"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ life.error }}
        </div>
        <template v-else-if="life.lifecycle">
          <div
            v-if="life.moneyBlock?.blocked"
            class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900"
          >
            <div class="font-semibold">{{ t('spine.gateBlocksMoney') }}</div>
            <div class="mt-0.5 text-xs">{{ life.moneyBlock.message }}</div>
          </div>

          <!-- Gates for this milestone -->
          <div class="mb-3 overflow-hidden rounded-[10px] border border-border bg-white">
            <div
              class="border-b border-border px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground"
            >
              {{ t('spine.gatesTitle') }} · {{ currentMs?.label }}
            </div>
            <div v-if="!gatesHere.length" class="px-4 py-3 text-[12px] text-muted-foreground">
              {{ t('spine.noGates') }}
            </div>
            <div
              v-for="g in gatesHere"
              :key="g.id"
              class="border-b border-zinc-50 px-4 py-3 last:border-0"
            >
              <div class="flex flex-wrap items-center gap-2">
                <Badge :variant="g.status === 'open' ? 'critical' : 'normal'">{{
                  g.status === 'open' ? t('spine.gateOpen') : t('spine.gateCleared')
                }}</Badge>
                <span class="text-[13px] font-semibold">{{ g.title }}</span>
              </div>
              <div class="mt-1 text-[11px] text-muted-foreground">
                <span class="font-medium text-zinc-700">{{ t('spine.trigger') }}:</span>
                {{ g.trigger }}
              </div>
              <div class="mt-1 text-[11px]">
                <span class="font-medium text-muted-foreground">{{ t('spine.data') }}:</span>
                {{ g.dataRequired.join(' · ') }}
              </div>
              <div class="mt-1 text-[11px]">
                <span class="font-medium text-muted-foreground">{{ t('spine.output') }}:</span>
                {{ g.output }}
              </div>
              <Button
                v-if="g.status === 'open'"
                size="sm"
                class="mt-2"
                @click="onClearGate(g.id)"
              >
                {{ t('spine.clearGate') }}
              </Button>
            </div>
          </div>

          <!-- Tasks for this milestone -->
          <div class="mb-3 overflow-hidden rounded-[10px] border border-border bg-white">
            <div
              class="border-b border-border px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground"
            >
              {{ t('spine.tasksTitle') }}
            </div>
            <div v-if="!tasksHere.length" class="px-4 py-3 text-[12px] text-muted-foreground">
              {{ t('spine.noTasks') }}
            </div>
            <div
              v-for="task in tasksHere"
              :key="task.id"
              class="border-b border-zinc-50 px-4 py-3 last:border-0"
            >
              <div class="flex flex-wrap items-center gap-2">
                <Badge
                  :variant="
                    task.status === 'done'
                      ? 'normal'
                      : task.status === 'blocked'
                        ? 'secondary'
                        : 'high'
                  "
                  >{{ task.status }}</Badge
                >
                <span class="text-[13px] font-semibold">{{ task.title }}</span>
              </div>
              <div class="mt-1 text-[11px] text-muted-foreground">
                <span class="font-medium text-zinc-700">{{ t('spine.trigger') }}:</span>
                {{ task.trigger }}
              </div>
              <div class="mt-1 text-[11px]">
                <span class="font-medium text-muted-foreground">{{ t('spine.data') }}:</span>
                {{ task.dataRequired.join(' · ') }}
              </div>
              <div class="mt-1 text-[11px]">
                <span class="font-medium text-muted-foreground">{{ t('spine.output') }}:</span>
                {{ task.output }}
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button
                  v-if="task.status === 'open'"
                  size="sm"
                  variant="outline"
                  @click="onCompleteTask(task.id)"
                >
                  {{ task.primaryCta }}
                </Button>
                <Button
                  v-if="task.status === 'open' && task.approveCta"
                  size="sm"
                  @click="onCompleteTask(task.id)"
                >
                  {{ task.approveCta }}
                </Button>
              </div>
            </div>
          </div>

          <div class="text-[11px] text-muted-foreground">{{ t('spine.mgtHint') }}</div>
        </template>
      </div>

      <div
        class="flex flex-wrap items-center gap-2 border-t border-border bg-white px-6 py-3"
      >
        <div class="mr-auto text-[12px] text-muted-foreground">
          <span class="font-semibold text-foreground">{{ t('spine.osRecommends') }}</span>
          {{
            life.openTasks[0]?.title ??
            life.openGates[0]?.title ??
            t('spine.stepPlaceholder')
          }}
        </div>
        <Button variant="outline" @click="drawerOpen = true">{{
          t('spine.viewExceptions')
        }}</Button>
        <Button
          :disabled="selected === 'charges' && life.moneyBlock?.blocked"
          @click="selectStep(selected, false)"
        >
          {{ t(`spine.cta.${selected}`) }}
        </Button>
      </div>
    </div>

    <ExceptionDrawer
      v-model:open="drawerOpen"
      :role="life.role"
      :shipment-id="String(shipmentId)"
      :hold-type="holdType"
      @close="drawerOpen = false"
    />
  </AppShell>
</template>
