<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { operatorLabel } from '@/data/seatOperators'

export type HandoffNodeId =
  | 'booking'
  | 'flight'
  | 'customs'
  | 'arrival'
  | 'delivery'

export type HandoffNodeState = 'done' | 'active' | 'pending' | 'held'

export interface HandoffNode {
  id: HandoffNodeId
  label: string
  short: string
  state: HandoffNodeState
  owner: string
  raci: 'R' | 'A' | 'C' | 'I'
  sla: string
  section?: string
}

const props = withDefaults(
  defineProps<{
    nodes?: HandoffNode[]
    activeId?: HandoffNodeId | null
  }>(),
  {
    nodes: undefined,
    activeId: null,
  },
)

const emit = defineEmits<{
  select: [node: HandoffNode]
}>()

const hoverId = ref<HandoffNodeId | null>(null)

const defaultNodes: HandoffNode[] = [
  {
    id: 'booking',
    label: 'Booking',
    short: '1. Booking',
    state: 'done',
    owner: operatorLabel('bookingOps'),
    raci: 'R',
    sla: 'SLA met',
    section: 'split',
  },
  {
    id: 'flight',
    label: 'Flight Departure',
    short: '2. Flight Departure',
    state: 'done',
    owner: operatorLabel('flightDesk'),
    raci: 'R',
    sla: 'Departed on time',
    section: 'route',
  },
  {
    id: 'customs',
    label: 'Customs Entry',
    short: '3. Customs Entry',
    state: 'held',
    owner: operatorLabel('customsOps'),
    raci: 'R',
    sla: '4h 12m remaining',
    section: 'customs_handoff',
  },
  {
    id: 'arrival',
    label: 'Cargo Arrival',
    short: '4. Cargo Arrival',
    state: 'active',
    owner: operatorLabel('arrivalDesk'),
    raci: 'R',
    sla: 'ETA window open',
    section: 'awb_cargo',
  },
  {
    id: 'delivery',
    label: 'Final Delivery',
    short: '5. Final Delivery',
    state: 'pending',
    owner: operatorLabel('deliveryDesk'),
    raci: 'R',
    sla: 'Not started',
    section: 'parties_delivery',
  },
]

const list = computed(() => props.nodes ?? defaultNodes)

function stateClass(s: HandoffNodeState) {
  if (s === 'done') return 'os-badge--green'
  if (s === 'active') return 'os-badge--teal'
  if (s === 'held') return 'os-badge--amber'
  return 'os-badge--slate'
}

function stateLabel(s: HandoffNodeState) {
  if (s === 'done') return 'Done'
  if (s === 'active') return 'Active'
  if (s === 'held') return 'Held'
  return 'Pending'
}

function raciClass(m: string) {
  if (m === 'R') return 'border-sky-300 bg-sky-50 text-sky-800'
  if (m === 'A') return 'border-violet-300 bg-violet-50 text-violet-800'
  if (m === 'C') return 'border-amber-300 bg-amber-50 text-amber-900'
  return 'border-slate-300 bg-slate-50 text-slate-600'
}
</script>

<template>
  <div class="job-handoff-spine shrink-0 border-b border-border bg-card px-3 py-2" data-sticky-region="handoff-spine">
    <div class="mb-1.5 flex items-center justify-between">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Lifecycle handoff
      </span>
      <span class="text-[10px] text-muted-foreground">Hover for SLA · click to jump</span>
    </div>
    <ol class="flex flex-wrap items-stretch gap-1">
      <li
        v-for="(node, i) in list"
        :key="node.id"
        class="relative flex min-w-0 flex-1 items-center gap-1"
      >
        <button
          type="button"
          class="handoff-node group relative flex w-full min-w-[120px] flex-col gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors"
          :class="[
            props.activeId === node.id || hoverId === node.id
              ? 'border-teal-300 bg-primary-tint/50'
              : 'border-border bg-white hover:border-slate-300 hover:bg-slate-50',
          ]"
          @mouseenter="hoverId = node.id"
          @mouseleave="hoverId = null"
          @focus="hoverId = node.id"
          @blur="hoverId = null"
          @click="emit('select', node)"
        >
          <div class="flex items-center justify-between gap-1">
            <span class="truncate text-[11px] font-semibold text-foreground">{{ node.short }}</span>
            <span class="os-badge shrink-0" :class="stateClass(node.state)">
              <span
                class="inline-block h-1.5 w-1.5 rounded-full"
                :class="{
                  'bg-emerald-600': node.state === 'done',
                  'bg-teal-600': node.state === 'active',
                  'bg-amber-600': node.state === 'held',
                  'bg-slate-400': node.state === 'pending',
                }"
              />
              {{ stateLabel(node.state) }}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold"
              :class="raciClass(node.raci)"
            >
              {{ node.raci }}
            </span>
            <span class="truncate text-[10px] text-muted-foreground">{{ node.owner }}</span>
          </div>

          <!-- Hover popover -->
          <div
            v-show="hoverId === node.id"
            class="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-border bg-white p-2.5 shadow-lg"
          >
            <div class="text-[11px] font-semibold text-foreground">{{ node.label }}</div>
            <div class="mt-1 text-[10px] text-muted-foreground">Owner · {{ node.owner }}</div>
            <div class="mt-1 text-[10px] text-slate-500">
              <template v-if="node.id === 'booking'">A · Mei Chen (Sales)</template>
              <template v-else-if="node.id === 'flight'">A · Alex Rivera (Export Air Ops)</template>
              <template v-else-if="node.id === 'customs'">A · Claire Nguyen (Finance)</template>
              <template v-else-if="node.id === 'arrival'">A · Priya Nair (Import Air Ops)</template>
              <template v-else>A · Hana Park (Terminal Ops)</template>
            </div>
            <div class="mt-1.5 flex items-center justify-between">
              <span class="text-[10px] font-medium text-slate-600">SLA</span>
              <span class="font-mono text-[10px] font-semibold text-teal-800">{{ node.sla }}</span>
            </div>
            <div class="mt-1 text-[10px] text-slate-400">RACI {{ node.raci }} · click to open section</div>
          </div>
        </button>
        <ChevronRight
          v-if="i < list.length - 1"
          :size="14"
          class="hidden shrink-0 text-slate-300 sm:block"
          aria-hidden="true"
        />
      </li>
    </ol>
  </div>
</template>
