<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/airfreight/AppShell.vue'
import ExceptionDrawer from '@/components/airfreight/ExceptionDrawer.vue'
import JobNavStrip from '@/components/airfreight/JobNavStrip.vue'
import Badge from '@/components/ui/Badge.vue'
import { useJobStore } from '@/stores/job'
import { useTasksStore } from '@/stores/tasks'
import { useAdminConfigStore } from '@/stores/adminConfig'
import type { ComplianceLight, HoldType } from '@/api/types'

const route = useRoute()
const router = useRouter()
const store = useJobStore()
const tasksStore = useTasksStore()
const admin = useAdminConfigStore()
const { t } = useI18n()

const drawerOpen = ref(false)
const summaryOpen = ref(true)
/** Next Action hover → glow Timeline tab */
const navGlow = ref<'timeline' | null>(null)

const shipmentId = computed(() => Number(route.params.shipmentId))

const holdType = computed<HoldType>(() => store.job?.ops.holdType ?? 'customs')

async function loadJob() {
  if (!Number.isFinite(shipmentId.value) || shipmentId.value <= 0) {
    store.clear()
    return
  }
  await store.load(shipmentId.value)
}

onMounted(() => {
  void loadJob()
})

watch(shipmentId, () => {
  void loadJob()
})

function lightStatus(light: ComplianceLight): 'ok' | 'warn' | 'pending' {
  if (light === 'ok') return 'ok'
  if (light === 'warn') return 'warn'
  return 'pending'
}

function lightDot(status: 'ok' | 'warn' | 'pending') {
  if (status === 'ok') return 'bg-emerald-600 shadow-[0_0_0_3px_#D1FAE5]'
  if (status === 'warn') return 'bg-amber-600 shadow-[0_0_0_3px_#FEF3C7]'
  return 'bg-zinc-300'
}

function awbLine(hawb: string | null, mawb: string | null) {
  if (!hawb && !mawb) return t('myTasks.fields.noAwb')
  const parts: string[] = []
  parts.push(hawb ? `HAWB ${hawb}` : 'HAWB —')
  parts.push(mawb ? `MAWB ${mawb}` : 'MAWB —')
  return parts.join(' · ')
}

function openSpine() {
  void router.push({
    name: 'job-spine',
    params: { shipmentId: String(shipmentId.value) },
  })
}

function openCharges() {
  if (chargesLocked.value) return
  void router.push({
    name: 'job-charges',
    params: { shipmentId: String(shipmentId.value) },
  })
}

function openInvoice() {
  if (invoiceLocked.value) return
  void router.push({
    name: 'job-invoice',
    params: { shipmentId: String(shipmentId.value) },
  })
}

const issueCount = computed(() => {
  if (!store.job) return 0
  let n = 0
  if (store.job.compliance.customs === 'warn') n++
  if (store.job.compliance.documents === 'warn') n++
  if (store.job.compliance.invoice === 'warn') n++
  return n
})

/** Docs / customs hold blocks money pages until checklist clears */
const chargesLocked = computed(() => {
  if (!store.job) return false
  const hold = store.job.ops.holdType
  if (hold === 'customs' || hold === 'docs') return true
  if (store.job.compliance.customs === 'warn') return true
  if (store.job.compliance.documents === 'warn') return true
  if (store.job.documents.missing.length > 0) return true
  return false
})

const invoiceLocked = computed(() => {
  if (!store.job) return false
  if (chargesLocked.value) return true
  if (store.job.ops.holdType === 'invoice') return true
  return false
})

/** OS is pointing operators at Timeline while a hold/next-action is open */
const osPulse = computed(() => issueCount.value > 0 || Boolean(store.job?.nextAction))

function onNextActionEnter() {
  navGlow.value = 'timeline'
}

function onNextActionLeave() {
  navGlow.value = null
}

const workerHints = computed(() => {
  if (!store.job) return [] as { id: string; text: string }[]
  const out: { id: string; text: string }[] = []
  const w = admin.workersEnabled
  if (w.gateWatch && issueCount.value > 0) {
    out.push({ id: 'gate', text: t('jobContext.worker.gateWatch') })
  }
  if (w.quoteAssist && store.job.pack === 'GLOBAL') {
    out.push({ id: 'quote', text: t('jobContext.worker.quoteAssist') })
  }
  if (w.marginGuard && store.job.compliance.invoice === 'warn') {
    out.push({ id: 'margin', text: t('jobContext.worker.marginGuard') })
  }
  return out
})
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-[1100px] px-6 pb-12">
      <JobNavStrip
        :shipment-id="shipmentId"
        current="overview"
        :os-suggest="true"
        :os-pulse="osPulse"
        :glow-tab="navGlow"
        :charges-locked="chargesLocked"
        :invoice-locked="invoiceLocked"
      />

      <div v-if="store.loading" class="text-sm text-muted-foreground">
        {{ t('jobContext.loading') }}
      </div>

      <div
        v-else-if="store.error"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ store.error }}
      </div>

      <template v-else-if="store.job">
        <!-- Ops truth strip — always visible -->
        <div
          class="mb-3 grid grid-cols-2 overflow-hidden rounded-[10px] border border-border bg-white sm:grid-cols-4 lg:grid-cols-8"
        >
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.route').toUpperCase() }}
            </div>
            <div class="text-[13px] font-semibold">{{ store.job.summary.route }}</div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.status').toUpperCase() }}
            </div>
            <div class="text-[13px] font-semibold text-amber-700">{{ store.job.summary.status }}</div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.customer').toUpperCase() }}
            </div>
            <div class="truncate text-[13px] font-semibold" :title="store.job.summary.customer">
              {{ store.job.summary.customer }}
            </div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.airline').toUpperCase() }}
            </div>
            <div class="truncate text-[13px] font-semibold" :title="store.job.ops.airline">
              {{ store.job.ops.airline }}
            </div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.sla').toUpperCase() }}
            </div>
            <div class="text-[12px] font-semibold text-red-700">{{ store.job.ops.slaLabel }}</div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              ETD / ETA
            </div>
            <div class="text-[12px] font-semibold">
              {{ store.job.ops.etdLabel.replace('ETD ', '') }} ·
              {{ store.job.ops.etaLabel.replace('ETA ', '') }}
            </div>
          </div>
          <div class="border-b border-border p-3 sm:border-r lg:border-b-0">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.sell').toUpperCase() }}
            </div>
            <div class="text-[13px] font-semibold">{{ store.job.ops.sellAmount }}</div>
          </div>
          <div class="p-3 sm:border-r lg:border-b-0 lg:border-r">
            <div class="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
              {{ t('jobContext.fields.cost').toUpperCase() }}
            </div>
            <div class="text-[13px] font-semibold">{{ store.job.ops.costAmount }}</div>
          </div>
        </div>

        <div
          v-if="store.job.ops.provisionalGp"
          class="mb-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-primary/25 bg-primary-tint px-4 py-2 text-xs"
        >
          <span class="font-semibold text-primary">
            {{ t('jobContext.fields.provisionalGp') }}: {{ store.job.ops.provisionalGp }}
          </span>
          <Badge v-if="store.job.ops.moneyState" variant="pack">{{
            store.job.ops.moneyState
          }}</Badge>
          <button
            v-if="!chargesLocked"
            type="button"
            class="ml-auto text-xs font-medium text-primary"
            @click="openCharges"
          >
            {{ t('jobContext.openCharges') }} →
          </button>
          <button
            v-if="!invoiceLocked"
            type="button"
            class="text-xs font-medium text-primary"
            :class="chargesLocked ? 'ml-auto' : ''"
            @click="openInvoice"
          >
            {{ t('jobContext.openInvoice') }} →
          </button>
        </div>

        <!-- AWB + weight + money at risk -->
        <div
          class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-border bg-white px-4 py-2.5 text-xs"
        >
          <div>
            <span class="mr-1.5 text-muted-foreground">{{ t('jobContext.fields.awb') }}</span>
            <span class="font-mono font-medium">{{
              awbLine(store.job.ops.hawb, store.job.ops.mawb)
            }}</span>
          </div>
          <div>
            <span class="mr-1.5 text-muted-foreground">{{ t('jobContext.fields.pieces') }}</span>
            <span class="font-semibold">{{ store.job.ops.pieces }}</span>
          </div>
          <div>
            <span class="mr-1.5 text-muted-foreground">{{ t('jobContext.fields.gw') }}</span>
            <span class="font-semibold">{{ store.job.ops.grossWeightKg }} kg</span>
          </div>
          <div>
            <span class="mr-1.5 text-muted-foreground">{{ t('jobContext.fields.cw') }}</span>
            <span class="font-semibold">{{ store.job.ops.chargeableWeightKg }} kg</span>
          </div>
          <div>
            <span class="mr-1.5 text-muted-foreground">{{ t('jobContext.fields.margin') }}</span>
            <span class="font-semibold text-emerald-700">{{ store.job.ops.marginPct }}</span>
          </div>
          <div class="rounded bg-red-50 px-2 py-0.5 font-medium text-red-700">
            {{ t('jobContext.fields.atRisk') }}: {{ store.job.ops.moneyAtRisk }}
          </div>
        </div>

        <!-- Compliance -->
        <div
          class="mb-4 flex flex-wrap items-center gap-5 rounded-[10px] border border-border bg-white px-4 py-2.5"
        >
          <span class="mr-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
            {{ t('jobContext.complianceLabel') }}
          </span>
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              :class="lightDot(lightStatus(store.job.compliance.customs))"
            />
            <span class="text-xs font-medium text-muted-foreground">{{
              t('jobContext.compliance.customs')
            }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              :class="lightDot(lightStatus(store.job.compliance.documents))"
            />
            <span class="text-xs font-medium text-muted-foreground">{{
              t('jobContext.compliance.documents')
            }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              :class="lightDot(lightStatus(store.job.compliance.invoice))"
            />
            <span class="text-xs font-medium text-muted-foreground">{{
              t('jobContext.compliance.invoice')
            }}</span>
          </div>
          <div class="flex-1" />
          <button
            type="button"
            class="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-amber-700"
            @click="drawerOpen = true"
          >
            {{ issueCount }} {{ t('jobContext.issues') }} ›
          </button>
        </div>

        <!-- Three panels (structure unchanged) -->
        <div class="mb-5 grid gap-3.5 md:grid-cols-3">
          <div class="overflow-hidden rounded-[10px] border border-border bg-white">
            <button
              type="button"
              class="flex w-full items-center justify-between px-4 py-3"
              :class="summaryOpen ? 'border-b border-border' : ''"
              @click="summaryOpen = !summaryOpen"
            >
              <span class="text-[13px] font-semibold">{{ t('jobContext.summary') }}</span>
              <span class="text-muted-foreground">{{ summaryOpen ? '−' : '+' }}</span>
            </button>
            <div v-if="summaryOpen" class="flex flex-col gap-1.5 px-4 py-2.5 text-xs">
              <div class="flex gap-2">
                <span class="w-[88px] shrink-0 text-muted-foreground">{{
                  t('jobContext.fields.customer')
                }}</span>
                <span class="font-medium">{{ store.job.summary.customer }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-[88px] shrink-0 text-muted-foreground">{{
                  t('jobContext.fields.route')
                }}</span>
                <span class="font-medium">{{ store.job.summary.route }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-[88px] shrink-0 text-muted-foreground">{{
                  t('jobContext.fields.airline')
                }}</span>
                <span class="font-medium">{{ store.job.ops.airline }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-[88px] shrink-0 text-muted-foreground">{{
                  t('jobContext.fields.priority')
                }}</span>
                <span class="font-medium">{{ store.job.summary.priority }}</span>
              </div>
            </div>
            <div v-else class="px-4 py-2">
              <span class="text-xs text-muted-foreground">
                {{ store.job.summary.route }} · {{ store.job.summary.status }}
              </span>
            </div>
          </div>

          <div class="overflow-hidden rounded-[10px] border border-border bg-white">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <span class="text-[13px] font-semibold">{{ t('jobContext.documents') }}</span>
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">
                {{ store.job.documents.completed }} / {{ store.job.documents.total }}
              </span>
            </div>
            <div class="flex flex-col gap-1.5 px-4 py-2.5">
              <div
                v-for="item in store.job.documents.done"
                :key="item"
                class="flex items-center gap-1.5 text-xs text-zinc-700"
              >
                <span class="text-emerald-600">✓</span>{{ item }}
              </div>
              <div
                v-for="item in store.job.documents.missing"
                :key="item"
                class="text-xs"
              >
                <div class="flex items-center gap-1.5 font-medium text-amber-600">
                  <span>○</span>{{ item }}
                </div>
                <div class="ml-5 mt-0.5 text-[11px] text-amber-700">
                  ↳ {{ store.job.documents.impact }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex flex-col rounded-[10px] border border-border bg-white transition duration-200"
            :class="navGlow === 'timeline' ? 'border-primary/40 shadow-[0_0_0_1px_rgba(46,196,182,0.25)]' : ''"
            @mouseenter="onNextActionEnter"
            @mouseleave="onNextActionLeave"
            @focusin="onNextActionEnter"
            @focusout="onNextActionLeave"
          >
            <div class="flex flex-1 flex-col gap-2.5 p-4">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-semibold">{{ t('jobContext.nextAction') }}</span>
                <span
                  class="rounded bg-primary-tint px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary"
                >
                  {{ t('jobContext.suggested') }}
                </span>
              </div>
              <div>
                <p class="text-[14px] font-semibold leading-snug text-zinc-900">
                  {{ store.job.nextAction }}
                </p>
                <p
                  v-if="store.job.documents.impact"
                  class="mt-1 text-[12px] leading-relaxed text-muted-foreground"
                >
                  {{ store.job.documents.impact }}
                </p>
              </div>
              <div
                v-for="hint in workerHints"
                :key="hint.id"
                class="rounded-md border border-primary/20 bg-primary-tint px-2.5 py-1.5 text-[11px] text-teal-900"
              >
                <span class="font-semibold">{{ t('jobContext.worker.osLabel') }}</span>
                {{ hint.text }}
                <span class="text-muted-foreground"> — {{ t('jobContext.worker.suggestOnly') }}</span>
              </div>
              <div
                v-if="chargesLocked || invoiceLocked"
                class="flex items-start gap-1.5 rounded-md border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800"
              >
                <span class="shrink-0" aria-hidden="true">⚠</span>
                <span>{{ t('jobContext.holdActive') }}</span>
              </div>
            </div>

            <!-- Lightweight Navigate to → chips (mirrors real tabs) -->
            <div
              class="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-2.5"
            >
              <span class="text-[11px] font-medium text-muted-foreground">
                {{ t('jobContext.navigateTo') }} →
              </span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary-tint px-2.5 py-1 text-[11px] font-semibold text-teal-800 transition hover:border-primary hover:bg-primary/15"
                :title="t('nav.dest.timeline')"
                @click="openSpine"
              >
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                {{ t('nav.pages.timeline') }}
              </button>
              <button
                v-if="!chargesLocked"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-primary/40 hover:bg-primary-tint hover:text-teal-800"
                :title="t('nav.dest.charges')"
                @click="openCharges"
              >
                {{ t('nav.pages.charges') }}
              </button>
              <button
                v-else
                type="button"
                class="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-400"
                :title="t('nav.lockedHint')"
                disabled
                aria-disabled="true"
              >
                <svg
                  class="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                {{ t('nav.pages.charges') }}
              </button>
              <button
                v-if="!invoiceLocked"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-primary/40 hover:bg-primary-tint hover:text-teal-800"
                :title="t('nav.dest.invoice')"
                @click="openInvoice"
              >
                {{ t('nav.pages.invoice') }}
              </button>
              <button
                v-else
                type="button"
                class="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-400"
                :title="t('nav.lockedHint')"
                disabled
                aria-disabled="true"
              >
                <svg
                  class="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                {{ t('nav.pages.invoice') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="mb-3.5 rounded-[10px] border border-border bg-white px-5 py-4">
          <div class="mb-4 text-xs font-semibold tracking-wide text-muted-foreground">
            {{ t('jobContext.timeline').toUpperCase() }}
          </div>
          <div class="flex items-center">
            <div
              v-for="(step, i) in store.job.timeline"
              :key="step.label"
              class="flex flex-1 items-center"
            >
              <div class="flex flex-col items-center gap-1">
                <div
                  class="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold"
                  :class="{
                    'border-primary bg-primary text-white': step.state === 'done',
                    'border-amber-500 bg-amber-50 text-amber-600': step.state === 'current',
                    'border-border bg-muted text-muted-foreground': step.state === 'pending',
                  }"
                >
                  {{ step.state === 'done' ? '✓' : i + 1 }}
                </div>
                <span
                  class="text-[10px] font-medium"
                  :class="{
                    'text-emerald-600': step.state === 'done',
                    'text-amber-600': step.state === 'current',
                    'text-muted-foreground': step.state === 'pending',
                  }"
                >
                  {{ step.label }}
                </span>
              </div>
              <div
                v-if="i < store.job.timeline.length - 1"
                class="mb-3.5 h-0.5 flex-1"
                :class="step.state === 'done' ? 'bg-primary' : 'bg-border'"
              />
            </div>
          </div>
        </div>

        <!-- People -->
        <div class="overflow-hidden rounded-[10px] border border-border bg-white">
          <div
            class="border-b border-border px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground"
          >
            {{ t('jobContext.peopleRaci').toUpperCase() }}
          </div>
          <div class="flex items-center gap-3 border-b border-zinc-50 px-4 py-2.5">
            <Badge variant="raciR" class="h-[22px] w-[22px] justify-center px-0">R</Badge>
            <div class="flex-1">
              <div class="text-[13px] font-medium">{{ store.job.raci.responsible }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('myTasks.fields.responsible') }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 px-4 py-2.5">
            <Badge variant="raciA" class="h-[22px] w-[22px] justify-center px-0">A</Badge>
            <div class="flex-1">
              <div class="text-[13px] font-medium">{{ store.job.raci.accountable }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('myTasks.fields.accountable') }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <ExceptionDrawer
      :open="drawerOpen"
      :role="tasksStore.role"
      :shipment-id="String(shipmentId)"
      :hold-type="holdType"
      @close="drawerOpen = false"
    />
  </AppShell>
</template>
