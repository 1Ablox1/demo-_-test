<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Check, FileText, Sparkles, TriangleAlert } from '@lucide/vue'
import type { JobClearance, JobDocuments, JobMoneyState } from '@/api/types'
import type { OsGate } from '@/os/types'
import { AU_CLEARANCE_GATE_ID } from '@/lib/gateChecklist'
import { clearanceBlocksMoney } from '@/lib/moneyGates'

const props = defineProps<{
  nextAction: string
  actionDetail?: string | null
  ctaLabel: string
  completed?: boolean
  gates: OsGate[]
  documents: JobDocuments | null
  clearance?: JobClearance | null
  /** Where the primary CTA will take the user */
  ctaHint?: string | null
  moneyState?: JobMoneyState | null
}>()

const emit = defineEmits<{
  action: []
}>()

type CheckState = 'done' | 'warn' | 'idle'

const clearanceHeld = computed(() => clearanceBlocksMoney(props.clearance ?? undefined))

/** Active holds shown in the amber card — hide AU clearance once Echo/chip is Cleared */
const activeHolds = computed(() => {
  const open = props.gates.filter((g) => g.status === 'open')
  if (!clearanceHeld.value) {
    return open.filter((g) => g.id !== AU_CLEARANCE_GATE_ID)
  }
  return open
})

const checks = computed(() => {
  const rows: { state: CheckState; label: string }[] = []

  if (props.clearance) {
    if (props.clearance.status === 'cleared') {
      rows.push({ state: 'done', label: 'AU import clearance — Cleared' })
    } else if (clearanceHeld.value) {
      rows.push({
        state: 'warn',
        label: props.clearance.blockers?.[0]?.label
          ? `AU clearance — ${props.clearance.blockers[0].label}`
          : 'AU import clearance — held',
      })
    } else {
      rows.push({ state: 'idle', label: 'AU import clearance' })
    }
  }

  const docs = props.documents
  if (docs) {
    for (const d of docs.done.slice(0, 3)) {
      rows.push({ state: 'done', label: d })
    }
    for (const m of docs.missing) {
      rows.push({ state: 'warn', label: `${m} — missing` })
    }
  }

  if (!clearanceHeld.value) {
    if (
      props.moneyState === 'provisioned' ||
      props.moneyState === 'charges_approved' ||
      props.moneyState === 'invoiced' ||
      props.moneyState === 'part_invoiced'
    ) {
      rows.push({ state: 'done', label: 'Charges accrued' })
    } else {
      rows.push({ state: 'idle', label: 'Charges accrued (next)' })
    }
    if (
      props.moneyState === 'charges_approved' ||
      props.moneyState === 'invoiced' ||
      props.moneyState === 'part_invoiced'
    ) {
      rows.push({ state: 'done', label: 'Charges approved (Finance)' })
    } else if (props.moneyState === 'provisioned') {
      rows.push({ state: 'warn', label: 'Charges approve — Finance A next' })
    }
    if (props.moneyState === 'invoiced' || props.moneyState === 'part_invoiced') {
      rows.push({ state: 'done', label: 'Invoice issued' })
    } else if (props.moneyState === 'charges_approved') {
      rows.push({ state: 'idle', label: 'Invoice issued (next)' })
    } else {
      rows.push({ state: 'idle', label: 'Invoice issued' })
    }
  } else {
    rows.push({ state: 'idle', label: 'Charges / Invoice (locked until Cleared)' })
  }

  return rows.slice(0, 6)
})

const progressPct = computed(() => {
  if (props.moneyState === 'invoiced' || props.moneyState === 'part_invoiced') return 100
  if (props.moneyState === 'charges_approved') return 85
  if (props.moneyState === 'provisioned') return 70
  if (props.clearance?.status === 'cleared') return 55
  if (clearanceHeld.value) return 35
  const docs = props.documents
  if (!docs || docs.total <= 0) return 40
  return Math.min(50, Math.round((docs.completed / docs.total) * 50))
})

const progressTone = computed(() =>
  progressPct.value >= 100 ? 'bg-[#10B981]' : clearanceHeld.value ? 'bg-[#F59E0B]' : 'bg-[#0D9488]',
)

const gateCount = computed(() => activeHolds.value.length)

const actionTitle = computed(() => {
  if (props.completed) return 'Task completed — continue on Charges when ready'
  return props.nextAction
})

const actionBody = computed(() => {
  if (props.completed) {
    return 'Clearance is synced. Use Charges to Accrue, then Invoice after Finance approve.'
  }
  if (props.actionDetail) return props.actionDetail
  if (clearanceHeld.value) {
    return 'Complete the clearance checklist and Finance stamp before Charges and Invoice unlock.'
  }
  return 'Clearance Cleared — open Charges to Accrue, then Invoice after Finance approve.'
})
</script>

<template>
  <div class="flex w-[360px] shrink-0 flex-col gap-3.5">
    <!-- Card 1: Next Action -->
    <div
      class="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      :class="completed ? 'border-t-[3px] border-t-[#10B981]' : 'border-t-[3px] border-t-[#0D9488]'"
    >
      <div class="px-4 pb-3 pt-3.5">
        <div class="mb-2 flex items-center gap-1.5">
          <Sparkles
            :size="13"
            :stroke-width="1.75"
            class="shrink-0 text-[#0D9488]"
            aria-hidden="true"
          />
          <span
            class="text-[10px] font-bold uppercase tracking-[0.07em] text-[#0D9488]"
            >Action Required by You</span
          >
          <span
            class="ml-auto rounded-[10px] bg-[#0F172A] px-1.5 py-px text-[9px] font-bold tracking-wide text-white"
            >R</span
          >
        </div>

        <p class="mb-1.5 text-[13px] font-semibold leading-snug text-[#0F172A]">
          {{ actionTitle }}
        </p>
        <p class="mb-1.5 text-[11px] leading-relaxed text-[#64748B]">
          {{ actionBody }}
        </p>
        <p v-if="ctaHint && !completed" class="mb-3.5 text-[10px] font-medium text-[#0D9488]">
          {{ ctaHint }}
        </p>
        <div v-else class="mb-3.5" />

        <button
          type="button"
          class="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border-0 text-[12px] font-bold text-white transition cursor-pointer"
          :class="completed ? 'bg-[#10B981] hover:opacity-95' : 'bg-[#0D9488] hover:opacity-95'"
          @click="emit('action')"
        >
          <template v-if="completed">
            <Check :size="13" :stroke-width="2.5" class="shrink-0 text-white" aria-hidden="true" />
            Done — open Charges next
          </template>
          <template v-else>
            {{ ctaLabel }}
            <ArrowRight
              :size="13"
              :stroke-width="1.75"
              class="shrink-0 text-white"
              aria-hidden="true"
            />
          </template>
        </button>
      </div>
    </div>

    <!-- Card 2: Gate Holds -->
    <div
      class="overflow-hidden rounded-[10px] border border-[#E2E8F0] border-t-[3px] border-t-[#F59E0B] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <div class="px-4 pb-3.5 pt-3">
        <div class="mb-2.5 flex items-center gap-1.5">
          <TriangleAlert
            :size="13"
            :stroke-width="1.75"
            class="shrink-0 text-[#F59E0B]"
            aria-hidden="true"
          />
          <span
            class="text-[10px] font-bold uppercase tracking-[0.07em] text-[#B45309]"
            >Active Gate Holds</span
          >
          <span
            v-if="gateCount"
            class="ml-auto rounded-[10px] bg-[#F59E0B] px-1.5 py-px text-[9px] font-bold text-white"
            >{{ gateCount }}</span
          >
        </div>

        <div v-if="activeHolds.length" class="flex flex-col gap-2">
          <div
            v-for="(g, i) in activeHolds"
            :key="g.id"
            class="rounded-lg border border-[#FCD34D] bg-[rgba(245,158,11,0.06)] px-3 py-2.5"
          >
            <div class="mb-1 flex items-center gap-1.5">
              <span class="font-mono text-[10px] font-bold text-[#B45309]"
                >Gate {{ String(i + 1).padStart(2, '0') }}</span
              >
              <span class="text-[11px] font-semibold text-[#B45309]">{{ g.title }}</span>
            </div>
            <p class="mb-1.5 text-[11px] text-[#92400E]">{{ g.trigger }}</p>
            <span
              class="inline-block rounded-[10px] border border-[#FCD34D] bg-[#FFFBEB] px-1.5 py-px text-[10px] font-semibold text-[#92400E]"
            >
              ↳ {{ g.output }}
            </span>
          </div>
        </div>
        <p v-else class="text-[12px] text-[#059669]">
          No active gate holds — Charges and Invoice are unlocked.
        </p>
      </div>
    </div>

    <!-- Card 3: Compliance & Docs -->
    <div
      class="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <div class="px-4 pb-3.5 pt-3">
        <div class="mb-2.5 flex items-center gap-1.5">
          <FileText
            :size="13"
            :stroke-width="1.75"
            class="shrink-0 text-[#64748B]"
            aria-hidden="true"
          />
          <span
            class="text-[10px] font-bold uppercase tracking-[0.07em] text-[#64748B]"
            >Compliance & Documents</span
          >
          <span
            v-if="documents"
            class="ml-auto font-mono text-[10px] font-semibold"
            :class="progressPct >= 100 ? 'text-[#059669]' : 'text-[#B45309]'"
          >
            {{ documents.completed }} / {{ documents.total }}
          </span>
        </div>

        <div class="mb-2.5 h-[3px] overflow-hidden rounded-sm bg-[#E2E8F0]">
          <div
            class="h-full rounded-sm transition-all"
            :class="progressTone"
            :style="{ width: `${progressPct}%` }"
          />
        </div>

        <div>
          <div
            v-for="(c, i) in checks"
            :key="i"
            class="flex items-center gap-2 border-b border-[#E2E8F0] py-1.5 last:border-0"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-extrabold"
              :class="{
                'border-[#6EE7B7] bg-[#ECFDF5] text-[#10B981]': c.state === 'done',
                'border-[#FCD34D] bg-[#FFFBEB] text-[#F59E0B]': c.state === 'warn',
                'border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8]': c.state === 'idle',
              }"
            >
              <Check
                v-if="c.state === 'done'"
                :size="10"
                :stroke-width="2.5"
                class="text-[#10B981]"
                aria-hidden="true"
              />
              <TriangleAlert
                v-else-if="c.state === 'warn'"
                :size="10"
                :stroke-width="2"
                class="text-[#F59E0B]"
                aria-hidden="true"
              />
            </span>
            <span
              class="text-[12px]"
              :class="{
                'text-[#0F172A]': c.state === 'done',
                'font-semibold text-[#B45309]': c.state === 'warn',
                'text-[#64748B]': c.state === 'idle',
              }"
            >
              {{ c.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
