<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Lock, MessageSquare, Send } from '@lucide/vue'
import type { AuImportStepId } from '@/types/auAirImport'
import type { Seat } from '@/stores/auth'
import { GATE_META, OPS_GATE_STEPS } from '@/lib/jobGateLadder'
import { useJobHandoffStore } from '@/stores/jobHandoff'
import { operatorLabel } from '@/data/seatOperators'

const props = defineProps<{
  shipmentId: string
  jobNo: string
  customer: string
  route: string
  lobPrefix: 'AI' | 'AE' | 'OI' | 'OE' | 'TR'
  seat: Seat
  /** Whether the current guided step's required fields are complete */
  currentComplete: boolean
}>()

const emit = defineEmits<{
  advanced: [step: AuImportStepId]
  handedOff: []
  financeDone: []
}>()

const handoff = useJobHandoffStore()
const noteOpen = ref(false)
const noteDraft = ref('')
const flash = ref('')

const state = computed(() => handoff.ensure(props.shipmentId, props.jobNo))
const meta = computed(() => GATE_META[state.value.currentStep])
const isOps = computed(() => state.value.phase === 'ops')
const isFinance = computed(() => state.value.phase === 'finance')
const isDone = computed(() => state.value.phase === 'done')
const atLastOps = computed(
  () => isOps.value && state.value.currentStep === OPS_GATE_STEPS[OPS_GATE_STEPS.length - 1],
)
const canWork =
  computed(() => {
    if (props.seat === 'admin') return true
    if (isOps.value) return props.seat === 'operations' || props.seat === 'sales'
    if (isFinance.value) return props.seat === 'finance'
    return false
  })

const waitingBanner = computed(() => {
  if (isOps.value) return null
  if (isFinance.value && (props.seat === 'operations' || props.seat === 'sales')) {
    return {
      title: 'Waiting on Finance',
      body: state.value.handoffNote
        ? `Your remark: “${state.value.handoffNote}”`
        : 'Duty / GST stamp is with Finance.',
      who: operatorLabel('financeLead'),
    }
  }
  if (isDone.value) {
    return {
      title: 'File gates complete',
      body: 'Ops and Finance ladders are closed for this file.',
      who: null as string | null,
    }
  }
  return null
})

function onNext() {
  flash.value = ''
  if (!canWork.value) {
    flash.value = 'Wrong seat for this gate'
    return
  }
  if (isFinance.value) {
    if (!props.currentComplete) {
      flash.value = 'Complete money fields before stamp'
      return
    }
    const r = handoff.completeFinance(props.shipmentId)
    flash.value = r.message
    if (r.ok) emit('financeDone')
    return
  }
  const r = handoff.advanceOps(props.shipmentId, props.currentComplete)
  flash.value = r.message
  if (r.ok) {
    const s = handoff.get(props.shipmentId)
    if (s) emit('advanced', s.currentStep)
  }
}

function openHandOff() {
  if (!props.currentComplete) {
    flash.value = 'Complete Customs entry before handoff'
    return
  }
  noteDraft.value = state.value.handoffNote || ''
  noteOpen.value = true
}

function confirmHandOff() {
  const r = handoff.handOffToFinance(props.shipmentId, {
    jobNo: props.jobNo,
    customer: props.customer,
    route: props.route,
    lobPrefix: props.lobPrefix,
    note: noteDraft.value,
    bySeat: props.seat,
    currentComplete: props.currentComplete,
  })
  flash.value = r.message
  if (r.ok) {
    noteOpen.value = false
    emit('handedOff')
  }
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="waitingBanner"
      class="os-panel flex flex-wrap items-start justify-between gap-2 border-amber-200 bg-amber-50/80 px-3 py-2.5"
    >
      <div class="flex gap-2">
        <Lock :size="14" class="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <div class="text-[11px] font-bold text-amber-900">{{ waitingBanner.title }}</div>
          <p class="text-[11px] text-amber-800/90">{{ waitingBanner.body }}</p>
          <p v-if="waitingBanner.who" class="mt-0.5 text-[10px] font-medium text-amber-700">
            Accountable: {{ waitingBanner.who }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-else-if="canWork"
      class="os-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            class="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-800"
          >
            {{ meta.raci }} · {{ isFinance ? 'Finance' : 'Ops' }}
          </span>
          <span class="text-[12px] font-semibold text-foreground">{{ meta.title }}</span>
        </div>
        <p class="mt-0.5 text-[11px] text-muted-foreground">{{ meta.blurb }}</p>
        <p v-if="flash" class="mt-1 text-[11px] font-medium text-teal-700">{{ flash }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="atLastOps"
          type="button"
          class="flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800"
          :disabled="!currentComplete"
          @click="openHandOff"
        >
          <Send :size="13" />
          Hand off to Finance
        </button>
        <button
          v-else
          type="button"
          class="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
          :disabled="!currentComplete"
          @click="onNext"
        >
          {{ isFinance ? 'Stamp & complete' : 'Next' }}
          <ArrowRight :size="12" />
        </button>
      </div>
    </div>

    <div
      v-else-if="isFinance && seat !== 'finance'"
      class="os-panel px-3 py-2 text-[11px] text-muted-foreground"
    >
      Switch to Finance seat to work money / stamp fields.
    </div>

    <!-- Hand-off remark dialog -->
    <div
      v-if="noteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      @click.self="noteOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
        <div class="mb-2 flex items-center gap-2">
          <MessageSquare :size="16" class="text-teal-700" />
          <h3 class="text-[14px] font-bold text-foreground">Hand off to Finance</h3>
        </div>
        <p class="mb-3 text-[12px] text-muted-foreground">
          Ops work stops here. Finance gets a Needs You approval with your remark — you do not fill
          their fields.
        </p>
        <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Remark for Finance
        </label>
        <textarea
          v-model="noteDraft"
          rows="3"
          class="mb-3 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[12px] outline-none focus:border-teal-400"
          placeholder="e.g. Broker ref ready · DAFF low risk · please stamp duty/GST"
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="h-8 rounded-md border border-border px-3 text-[11px] font-medium hover:bg-muted"
            @click="noteOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="h-8 rounded-md bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800"
            @click="confirmHandOff"
          >
            Send to Finance
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
