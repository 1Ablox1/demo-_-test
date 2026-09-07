<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, TriangleAlert } from '@lucide/vue'
import type { JobContext } from '@/api/types'
import type { MilestoneId, MilestoneView, OsGate } from '@/os/types'

const props = defineProps<{
  milestones: MilestoneView[]
  gates: OsGate[]
  job: JobContext | null
  currentMilestoneId?: MilestoneId
}>()

const emit = defineEmits<{
  clearGate: [gateId: string]
  selectMilestone: [id: MilestoneId]
}>()

type NodeState = 'done' | 'current' | 'blocked' | 'pending'

const expanded = ref<string | null>(null)

watch(
  () => props.currentMilestoneId,
  (id) => {
    if (id) expanded.value = id
  },
  { immediate: true },
)

const blockedGateCount = computed(
  () => props.gates.filter((g) => g.status === 'open').length,
)

const nodes = computed(() =>
  props.milestones.map((m) => {
    const openGates = props.gates.filter(
      (g) => g.milestoneId === m.id && g.status === 'open',
    )
    let state: NodeState = 'pending'
    if (m.status === 'done') state = 'done'
    else if (m.status === 'current') state = openGates.length ? 'current' : 'current'
    else if (m.status === 'locked' || openGates.length) state = 'blocked'
    else if (m.status === 'pending') state = 'pending'

    const gate = openGates[0]
    return {
      id: m.id,
      label: m.label,
      date:
        m.status === 'current' ? 'Today' : m.status === 'done' ? 'Done' : 'Pending',
      state,
      detail:
        m.status === 'current'
          ? (props.job?.nextAction ?? 'Active node — operator action required.')
          : m.status === 'locked'
            ? 'Blocked until prior gate clears.'
            : m.status === 'done'
              ? 'Milestone complete.'
              : 'Awaiting unlock.',
      gate: gate
        ? {
            id: gate.id,
            label: gate.title,
            status: 'blocked' as const,
            detail: gate.trigger,
            taskCta: props.job?.nextAction,
          }
        : undefined,
    }
  }),
)

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
  emit('selectMilestone', id as MilestoneId)
}

function dotClass(state: NodeState) {
  if (state === 'done') return 'bg-[#ECFDF5]'
  if (state === 'current') return 'bg-[#F0FDFA] shadow-[0_0_0_3px_#99F6E4]'
  if (state === 'blocked') return 'bg-[#FFFBEB] shadow-[0_0_0_3px_#FCD34D]'
  return 'bg-[#F1F5F9]'
}

function labelColor(state: NodeState) {
  if (state === 'done') return 'text-[#10B981]'
  if (state === 'current') return 'text-[#0D9488]'
  if (state === 'blocked') return 'text-[#F59E0B]'
  return 'text-[#94A3B8]'
}

function lineColor(state: NodeState) {
  if (state === 'done') return 'bg-[#6EE7B7]'
  if (state === 'current') return 'bg-[#99F6E4]'
  return 'bg-[#E2E8F0]'
}
</script>

<template>
  <div
    class="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
  >
    <div
      class="flex items-center justify-between border-b border-[#E2E8F0] px-[18px] pb-2.5 pt-3.5"
    >
      <div>
        <div class="text-[13px] font-bold tracking-tight text-[#0F172A]">
          Milestone · Gate · Task
        </div>
        <div class="mt-0.5 text-[11px] text-[#64748B]">
          Live operational spine — click any node to expand
        </div>
      </div>
      <span
        v-if="blockedGateCount"
        class="inline-flex items-center gap-1.5 rounded-full border border-[#FCD34D] bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#B45309]"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        {{ blockedGateCount }} Gate{{ blockedGateCount === 1 ? '' : 's' }} Blocked
      </span>
    </div>

    <div class="px-[18px] py-4">
      <div v-for="(m, idx) in nodes" :key="m.id" class="flex gap-3.5">
        <div class="flex w-6 shrink-0 flex-col items-center">
          <button
            type="button"
            class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-0 transition"
            :class="dotClass(m.state)"
            @click="toggle(m.id)"
          >
            <Check
              v-if="m.state === 'done'"
              :size="11"
              :stroke-width="2.5"
              class="text-[#10B981]"
              aria-hidden="true"
            />
            <TriangleAlert
              v-else-if="m.state === 'blocked'"
              :size="11"
              :stroke-width="2"
              class="text-[#B45309]"
              aria-hidden="true"
            />
            <span
              v-else-if="m.state === 'current'"
              class="h-2 w-2 rounded-full bg-[#0D9488] animate-os-pulse"
            />
            <span
              v-else
              class="h-1.5 w-1.5 rounded-full bg-[#94A3B8] opacity-50"
            />
          </button>
          <div
            v-if="idx < nodes.length - 1"
            class="my-0.5 w-0.5 flex-1 rounded-sm"
            :class="lineColor(m.state)"
            style="min-height: 20px"
          />
        </div>

        <div class="min-w-0 flex-1" :class="idx < nodes.length - 1 ? 'pb-4' : ''">
          <button
            type="button"
            class="flex w-full items-center justify-between border-0 bg-transparent p-0 text-left"
            @click="toggle(m.id)"
          >
            <div class="flex items-center gap-2">
              <span
                class="text-[13px]"
                :class="[
                  labelColor(m.state),
                  m.state === 'current' ? 'font-bold' : 'font-semibold',
                ]"
              >
                {{ m.label }}
              </span>
              <span
                v-if="m.state === 'current'"
                class="rounded-[10px] border border-[#99F6E4] bg-[#F0FDFA] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#0D9488]"
              >
                LIVE
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] text-[#94A3B8]">{{ m.date }}</span>
              <ChevronDown
                :size="12"
                :stroke-width="2"
                class="text-[#94A3B8] transition-transform duration-150"
                :class="expanded === m.id ? 'rotate-180' : ''"
                aria-hidden="true"
              />
            </div>
          </button>

          <div v-if="expanded === m.id" class="mt-2">
            <p class="mb-0 text-[11px] text-[#64748B]" :class="m.gate ? 'mb-2.5' : ''">
              {{ m.detail }}
            </p>

            <div
              v-if="m.gate"
              class="mt-0.5 rounded-lg border px-3.5 py-2.5"
              :class="
                m.gate.status === 'blocked'
                  ? 'border-[#FCD34D] bg-[#FFFBEB]'
                  : 'border-[#6EE7B7] bg-[#ECFDF5]'
              "
            >
              <div class="mb-1 flex items-center justify-between">
                <span
                  class="text-[11px] font-bold"
                  :class="
                    m.gate.status === 'blocked' ? 'text-[#B45309]' : 'text-[#065F46]'
                  "
                >
                  {{ m.gate.status === 'blocked' ? '⛔' : '✓' }} {{ m.gate.label }}
                </span>
                <span
                  class="rounded-[10px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                  :class="m.gate.status === 'blocked' ? 'bg-[#F59E0B]' : 'bg-[#10B981]'"
                >
                  {{ m.gate.status === 'blocked' ? 'BLOCKED' : 'CLEARED' }}
                </span>
              </div>
              <p
                class="m-0 text-[11px]"
                :class="
                  m.gate.status === 'blocked' ? 'text-[#92400E]' : 'text-[#065F46]'
                "
              >
                {{ m.gate.detail }}
              </p>
              <button
                v-if="m.gate.status === 'blocked'"
                type="button"
                class="mt-2 rounded-md bg-[#0D9488] px-2.5 py-1 text-[11px] font-semibold text-white"
                @click="emit('clearGate', m.gate.id)"
              >
                Clear gate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
