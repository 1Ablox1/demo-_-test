<script setup lang="ts">
import { computed } from 'vue'
import {
  EXCEPTION_FILTERS,
  countForFilter,
  sumUninvoiced,
  type ExceptionFilterId,
} from '@/lib/exceptionDesk'
import type { WorkbenchJob } from '@/data/workbench'
import { useDashboardStore } from '@/stores/dashboard'

const props = defineProps<{
  jobs: WorkbenchJob[]
}>()

const dash = useDashboardStore()

const cards = computed(() =>
  EXCEPTION_FILTERS.map((f) => {
    const count =
      f.id === 'uninvoiced'
        ? sumUninvoiced(props.jobs)
        : countForFilter(props.jobs, f.id)
    const active = dash.activeFilterTile === f.id
    return { ...f, count, active }
  }),
)

function displayValue(id: ExceptionFilterId, count: number): string {
  if (id === 'uninvoiced') {
    if (count <= 0) return '$0'
    return `$${count.toLocaleString('en-US')}`
  }
  return String(count)
}

function iconFor(id: ExceptionFilterId): string {
  if (id === 'critical-holds') return '🚨'
  if (id === 'warnings-sla') return '⚠️'
  if (id === 'air') return '✈️'
  if (id === 'ocean-land') return '🚢'
  return '💰'
}

function onTile(id: ExceptionFilterId) {
  dash.toggleExceptionFilter(id)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
    <button
      v-for="c in cards"
      :key="c.id"
      type="button"
      class="os-cmd-tile text-left"
      :class="[`os-cmd-tile--${c.accent}`, c.active ? 'os-cmd-tile--active' : '']"
      :aria-pressed="c.active"
      :title="c.active ? `Clear filter: ${c.label}` : `Filter: ${c.hint}`"
      @click="onTile(c.id)"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="text-[16px] leading-none" aria-hidden="true">{{ iconFor(c.id) }}</span>
        <span
          v-if="c.active"
          class="rounded bg-white/80 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-700"
        >
          Filter on
        </span>
      </div>
      <div class="mt-2 font-mono text-[22px] font-bold leading-none tracking-tight">
        {{ displayValue(c.id, c.count) }}
      </div>
      <div class="mt-1.5 text-[11px] font-semibold leading-snug">{{ c.label }}</div>
      <div class="mt-0.5 text-[10px] opacity-70">{{ c.hint }}</div>
    </button>
  </div>
</template>
