<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import BookingIcon from '@/components/icons/BookingIcon.vue'
import OrchestrationKpiStrip from '@/components/orchestration/OrchestrationKpiStrip.vue'
import ShipmentWizardStepper from '@/components/orchestration/ShipmentWizardStepper.vue'
import StartBookingModal, {
  type StartBookingPrefills,
  type StartBookingResult,
} from '@/components/orchestration/StartBookingModal.vue'
import BookingShipmentStep from '@/components/orchestration/BookingShipmentStep.vue'
import BookingBillingStep from '@/components/orchestration/BookingBillingStep.vue'
import BookingConsolidationStep from '@/components/orchestration/BookingConsolidationStep.vue'
import BookingReviewStep from '@/components/orchestration/BookingReviewStep.vue'
import { seedDraftFromEntry } from '@/lib/bookingInherit'
import { computeOrchestrationKpis } from '@/lib/orchestrationKpis'
import { parseBookCreateQuery } from '@/lib/osWorkbenchApi'
import { airDirectionFromQuery, airLabel, type AirDirection } from '@/lib/airWorkspace'
import {
  emptyBookingDraft,
  wizardStepsFor,
  type BookingDraft,
  type BookingWizardStepId,
} from '@/types/bookingWizard'
import { useFreightStore } from '@/stores/freight'
import { useJobHandoffStore } from '@/stores/jobHandoff'
import BookingClearanceStep from '@/components/orchestration/BookingClearanceStep.vue'
import BranchContextChip from '@/components/tenant/BranchContextChip.vue'

const route = useRoute()
const router = useRouter()
const freight = useFreightStore()
const jobHandoff = useJobHandoffStore()

const modalOpen = ref(false)
const modalPrefills = ref<StartBookingPrefills | null>(null)
const handoffFrom = ref<'needs-you' | 'quote-new' | 'job-new' | null>(null)
const active = ref(false)
const draft = ref<BookingDraft>(emptyBookingDraft({ entryPath: 'direct', lobPrefix: 'AI', structure: 'direct' }))
const stepId = ref<BookingWizardStepId>('shipment')
const showPulse = ref(false)

const workspaceAir = computed<AirDirection | null>(() =>
  airDirectionFromQuery(route.query as Record<string, unknown>),
)

const workspaceTitle = computed(() =>
  workspaceAir.value ? `${airLabel(workspaceAir.value)} · Book` : 'New booking',
)

const workspaceHint = computed(() =>
  workspaceAir.value
    ? `Create ${airLabel(workspaceAir.value)} files only — Consoles and Jobs stay scoped to this direction.`
    : 'Hierarchical create: Intent → Shipment → Clearance (Air Import) → Billing → Review. Files open under the active branch context.',
)

const kpis = computed(() => computeOrchestrationKpis(freight.shipments))
const steps = computed(() => wizardStepsFor(draft.value.structure, draft.value.lobPrefix))

const canNext = computed(() => {
  if (stepId.value === 'shipment') {
    return !!(draft.value.customer && draft.value.origin && draft.value.destination)
  }
  if (stepId.value === 'clearance') {
    // Essentials: 11-digit ABN — progressive gate for AU AI
    return /^\d{11}$/.test(draft.value.clearance.ownerAbn.replace(/\s/g, ''))
  }
  if (stepId.value === 'billing') return draft.value.charges.length > 0
  if (stepId.value === 'consolidation') {
    return !!(draft.value.masterMawb || draft.value.mawb)
  }
  return true
})

const handoffBanner = computed(() => {
  if (active.value || !handoffFrom.value) return null
  if (handoffFrom.value === 'needs-you') {
    return 'Opened from Needs You — finish the booking here, then work the job.'
  }
  if (handoffFrom.value === 'quote-new') {
    return 'Quote create now runs through Book — pick intent and continue.'
  }
  return 'Direct booking create now runs through Book — pick intent and continue.'
})

function stepIndex(id: BookingWizardStepId) {
  return steps.value.findIndex((s) => s.id === id)
}

function goNext() {
  const i = stepIndex(stepId.value)
  if (i < 0 || i >= steps.value.length - 1) return
  if (!canNext.value) return
  stepId.value = steps.value[i + 1]!.id
}

function goBack() {
  const i = stepIndex(stepId.value)
  if (i <= 0) return
  stepId.value = steps.value[i - 1]!.id
}

function jump(id: BookingWizardStepId) {
  if (steps.value.some((s) => s.id === id)) stepId.value = id
}

function onStart(result: StartBookingResult) {
  draft.value = seedDraftFromEntry({
    entryPath: result.entryPath,
    lobPrefix: result.lobPrefix,
    structure: result.structure,
    quoteId: result.quoteId,
  })
  stepId.value = 'shipment'
  active.value = true
  modalOpen.value = false
  handoffFrom.value = null
  modalPrefills.value = null
}

function resetWizard() {
  const lob = workspaceAir.value ?? 'AI'
  active.value = false
  draft.value = emptyBookingDraft({ entryPath: 'direct', lobPrefix: lob, structure: 'direct' })
  stepId.value = 'shipment'
}

function openStartModal(prefills: StartBookingPrefills | null = null, keepHandoff = false) {
  if (!keepHandoff) handoffFrom.value = null
  const lob = prefills?.lobPrefix ?? workspaceAir.value ?? undefined
  modalPrefills.value = lob ? { ...prefills, lobPrefix: lob } : prefills
  modalOpen.value = true
}

function createFile() {
  const created = freight.createFromBookingDraft(draft.value)
  const ship = freight.shipments.find((s) => s.id === created.shipmentId)
  if (ship) jobHandoff.startFromCreate(ship.id, ship.jobNo)
  const lob = draft.value.lobPrefix === 'AE' || draft.value.lobPrefix === 'AI' ? draft.value.lobPrefix : workspaceAir.value
  // Book submit → western job workspace (Module 1 ladder)
  void router.push({
    name: 'job-context',
    params: { shipmentId: created.shipmentId },
    query: {
      focus: '1',
      ...(lob ? { lob } : {}),
      ...(ship?.bookingRef ? { bookingRef: ship.bookingRef } : {}),
    },
  })
}

function consumeCreateQuery() {
  const parsed = parseBookCreateQuery(route.query as Record<string, unknown>)
  const keepLob = parsed.lobPrefix ?? workspaceAir.value

  if (!parsed.open) return

  handoffFrom.value = parsed.from ?? null
  openStartModal(
    parsed.entryPath || parsed.lobPrefix || keepLob
      ? { entryPath: parsed.entryPath, lobPrefix: parsed.lobPrefix ?? keepLob ?? undefined }
      : null,
    true,
  )

  // Clear create query so refresh / back doesn't re-open the modal; keep workspace lob
  void router.replace({
    name: 'orchestrate',
    query: keepLob ? { lob: keepLob } : {},
  })
}

watch(
  () => route.fullPath,
  () => consumeCreateQuery(),
  { immediate: true },
)
</script>

<template>
  <AppShell>
    <div class="orch-page mx-auto max-w-[1100px] px-6 py-5">
      <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            CargoWare OS · {{ workspaceAir ? airLabel(workspaceAir) : 'Book' }}
          </p>
          <h1 class="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900">
            {{ workspaceTitle }}
          </h1>
          <p class="mt-1 max-w-xl text-[13px] text-slate-500">
            {{ workspaceHint }}
          </p>
          <div class="mt-2">
            <BranchContextChip />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="active"
            type="button"
            class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            @click="resetWizard"
          >
            Cancel draft booking
          </button>
          <button
            type="button"
            class="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--orch-accent)] px-4 text-[12px] font-bold text-white shadow-sm hover:opacity-95"
            @click="openStartModal(null)"
          >
            <BookingIcon :size="15" tone="light" />
            {{ active ? 'Restart' : 'New booking' }}
          </button>
        </div>
      </header>

      <div
        v-if="handoffBanner"
        class="mb-4 rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2.5 text-[12px] text-teal-900"
      >
        {{ handoffBanner }}
      </div>

      <!-- Portfolio pulse — disclosed on demand (not always on) -->
      <div class="mb-5">
        <button
          type="button"
          class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600"
          @click="showPulse = !showPulse"
        >
          {{ showPulse ? '▾' : '▸' }} Portfolio pulse
        </button>
        <OrchestrationKpiStrip v-if="showPulse" :kpis="kpis" />
      </div>

      <!-- Idle: hierarchical user story -->
      <section v-if="!active" class="orch-panel space-y-4 p-6">
        <h2 class="text-[16px] font-bold text-slate-900">Book → work the job</h2>
        <p class="text-[13px] text-slate-500">
          Needs You is the inbox. Book is the only place that creates the file — start here or from
          the Needs You header CTA.
        </p>
        <ol class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li class="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-700">01</div>
            <div class="mt-1 text-[13px] font-bold text-slate-900">Start</div>
            <p class="mt-1 text-[12px] text-slate-500">
              Quote or direct · Mode · Direct / Console / B2B.
            </p>
          </li>
          <li class="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-700">02</div>
            <div class="mt-1 text-[13px] font-bold text-slate-900">Shipment</div>
            <p class="mt-1 text-[12px] text-slate-500">
              Parties, route, cargo, AWB — essentials only.
            </p>
          </li>
          <li class="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
            <div class="text-[10px] font-bold uppercase tracking-wider text-teal-800">03</div>
            <div class="mt-1 text-[13px] font-bold text-slate-900">Clearance (AI)</div>
            <p class="mt-1 text-[12px] text-slate-500">
              ABN · broker · DAFF · RACI next task — not N10.
            </p>
          </li>
          <li class="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-700">04</div>
            <div class="mt-1 text-[13px] font-bold text-slate-900">Create → Job</div>
            <p class="mt-1 text-[12px] text-slate-500">
              Billing · review · open Job and deepen handoff.
            </p>
          </li>
        </ol>
        <button
          type="button"
          class="orch-btn-primary inline-flex items-center gap-2"
          @click="openStartModal(null)"
        >
          <BookingIcon :size="15" tone="light" />
          Start booking
          <ArrowRight :size="15" />
        </button>
      </section>

      <!-- Active wizard — Draft Booking (commercial intake; Job No assigned on submit) -->
      <template v-else>
        <div
          class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
        >
          <span class="os-badge os-badge--amber font-mono">DRAFT BOOKING</span>
          <span class="text-[12px] text-amber-950/80">
            Commercial intake only — submit assigns a distinct Job No and opens Jobs. Booking Ref
            stays separate from Job No / MAWB / HAWB.
          </span>
        </div>
        <div class="orch-wizard-shell mb-5">
          <ShipmentWizardStepper v-model:step-id="stepId" :steps="steps" />
        </div>

        <section class="orch-panel p-5">
          <BookingShipmentStep
            v-if="stepId === 'shipment'"
            :draft="draft"
            @update:draft="draft = $event"
            @jump="jump"
          />
          <BookingClearanceStep
            v-else-if="stepId === 'clearance'"
            :draft="draft"
            @update:draft="draft = $event"
            @jump="jump"
          />
          <BookingBillingStep
            v-else-if="stepId === 'billing'"
            :draft="draft"
            @update:draft="draft = $event"
            @jump="jump"
          />
          <BookingConsolidationStep
            v-else-if="stepId === 'consolidation'"
            :draft="draft"
            @update:draft="draft = $event"
            @jump="jump"
          />
          <BookingReviewStep v-else :draft="draft" />

          <div class="mt-6 flex justify-between border-t border-slate-100 pt-4">
            <button type="button" class="orch-btn-ghost" :disabled="stepIndex(stepId) === 0" @click="goBack">
              Back
            </button>
            <button
              v-if="stepId !== 'review'"
              type="button"
              class="orch-btn-primary"
              :disabled="!canNext"
              @click="goNext"
            >
              Next
              <ArrowRight :size="15" />
            </button>
            <button v-else type="button" class="orch-btn-primary" @click="createFile">
              Create file
              <ArrowRight :size="15" />
            </button>
          </div>
        </section>
      </template>

      <StartBookingModal
        :open="modalOpen"
        :prefills="modalPrefills"
        @close="modalOpen = false"
        @start="onStart"
      />
    </div>
  </AppShell>
</template>

<style scoped>
.orch-page {
  /* Navy — aligned with OS shell (#0f172a / #1e293b), not orange */
  --orch-accent: #1e293b;
  --orch-accent-tint: #f1f5f9;
}

.orch-page :deep(.orch-kpi-strip) {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .orch-page :deep(.orch-kpi-strip) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.orch-page :deep(.orch-kpi-card) {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 1rem 1.1rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.orch-page :deep(.orch-kpi-card__value) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
}

.orch-wizard-shell {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.85rem 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.orch-page :deep(.orch-stepper) {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  overflow-x: auto;
}

.orch-page :deep(.orch-stepper__item) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0.25rem;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.orch-page :deep(.orch-stepper__item--active) {
  color: var(--orch-accent);
}

.orch-page :deep(.orch-stepper__item--done) {
  color: #059669;
}

.orch-page :deep(.orch-stepper__num) {
  display: flex;
  height: 1.75rem;
  width: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 2px solid #e2e8f0;
  font-size: 11px;
  font-weight: 700;
}

.orch-page :deep(.orch-stepper__item--active .orch-stepper__num) {
  border-color: var(--orch-accent);
  background: var(--orch-accent);
  color: #fff;
}

.orch-page :deep(.orch-stepper__item--done .orch-stepper__num) {
  border-color: #059669;
  background: #ecfdf5;
  color: #059669;
}

.orch-page :deep(.orch-stepper__line) {
  height: 2px;
  flex: 1;
  min-width: 1.5rem;
  background: #e2e8f0;
}

.orch-panel {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.orch-btn-primary {
  display: inline-flex;
  height: 2.5rem;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  background: var(--orch-accent);
  padding: 0 1.1rem;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  border: 0;
  cursor: pointer;
}

.orch-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.orch-btn-ghost {
  height: 2.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0 1rem;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.orch-btn-ghost:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
