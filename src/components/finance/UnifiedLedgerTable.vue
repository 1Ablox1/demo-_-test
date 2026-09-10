<script setup lang="ts">
/**
 * Shared Unified Ledger table (shell JobChargesView / portfolio parity).
 * Pairs AP + AR by charge code — STATUS · AP/COST · CHARGE · AR/SELL · MARGIN.
 */
import { computed, ref, watch } from 'vue'
import {
  filterLedgerRows,
  formatLedgerMoney,
  ledgerChipCounts,
  ledgerRowStatus,
  ledgerStatusClass,
  type LedgerFilter,
  type UnifiedLedgerRow,
} from '@/lib/unifiedLedger'

export interface LedgerDisplayRow extends UnifiedLedgerRow {
  jobId?: string
  jobNo?: string
  customer?: string
}

const props = withDefaults(
  defineProps<{
    rows: LedgerDisplayRow[]
    showJob?: boolean
    currencyFallback?: string
    initialFilter?: LedgerFilter
    /** Controlled filter (parent owns chips) — omit for internal chips */
    filter?: LedgerFilter | null
    showChips?: boolean
    readOnly?: boolean
    /** Highlight selected charge code */
    selectedCode?: string | null
    /**
     * `console-ap` — shell JobChargesView parity: keep full paired rows + AR·SELL column;
     * AR amounts are muted (hint only; edit blocked in parent drawer).
     */
    moneyScope?: 'full' | 'console-ap'
  }>(),
  {
    showJob: false,
    currencyFallback: 'AUD',
    initialFilter: 'all',
    filter: null,
    showChips: true,
    readOnly: false,
    selectedCode: null,
    moneyScope: 'full',
  },
)

const emit = defineEmits<{
  select: [row: LedgerDisplayRow]
  'update:filter': [filter: LedgerFilter]
  openJob: [jobId: string]
}>()

const internalFilter = ref<LedgerFilter>(props.initialFilter)

watch(
  () => props.initialFilter,
  (f) => {
    if (props.filter == null) internalFilter.value = f
  },
)

const activeFilter = computed<LedgerFilter>(() => props.filter ?? internalFilter.value)

function setFilter(f: LedgerFilter) {
  if (props.filter == null) internalFilter.value = f
  emit('update:filter', f)
}

/** Shell console-ap keeps all paired rows (AR is hint-only, not filtered away). */
const visibleRows = computed(
  () => filterLedgerRows(props.rows, activeFilter.value) as LedgerDisplayRow[],
)
const chipCounts = computed(() => ledgerChipCounts(props.rows))

const gridCols = computed(() => {
  if (props.readOnly && props.showJob) return '100px 90px 1fr 150px 1fr 72px'
  if (props.readOnly) return '90px 1fr 150px 1fr 72px'
  if (props.showJob) return '32px 100px 90px 1fr 150px 1fr 72px 24px'
  return '32px 90px 1fr 150px 1fr 72px 24px'
})

const chipLabels: Partial<Record<LedgerFilter, string>> = {
  all: 'All',
  open: 'Open',
  variance: 'Variance',
  posted: 'Posted',
}

function money(n: number | null | undefined, currency?: string) {
  return formatLedgerMoney(n, currency ?? props.currencyFallback)
}

function apFace(row: LedgerDisplayRow) {
  return row.ap?.actualAmount ?? row.apAmount
}

function rowKey(row: LedgerDisplayRow) {
  return row.jobId ? `${row.jobId}:${row.code}` : row.code
}

const checked = ref<Set<string>>(new Set())

function isChecked(row: LedgerDisplayRow) {
  return checked.value.has(rowKey(row))
}

function toggleRow(row: LedgerDisplayRow) {
  const key = rowKey(row)
  const next = new Set(checked.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  checked.value = next
}

function selectRow(row: LedgerDisplayRow) {
  emit('select', row)
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="showChips" class="flex flex-wrap gap-1.5">
      <button
        v-for="f in (['all', 'open', 'variance', 'posted'] as LedgerFilter[])"
        :key="f"
        type="button"
        class="flex items-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-xs font-medium transition"
        :class="
          activeFilter === f
            ? 'border-teal-600 bg-teal-50 text-teal-800'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        "
        @click="setFilter(f)"
      >
        {{ chipLabels[f] }}
        <span
          class="min-w-4 rounded-full px-1 text-center text-[10px] font-bold"
          :class="activeFilter === f ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'"
        >
          {{ chipCounts[f] ?? 0 }}
        </span>
      </button>
    </div>

    <div
      role="grid"
      aria-label="Unified AP/AR charge ledger"
      class="overflow-hidden rounded-[10px] border border-slate-200 bg-white"
    >
      <div
        role="row"
        class="grid items-center gap-0 border-b border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[10px] font-bold tracking-wide text-slate-400"
        :style="{ gridTemplateColumns: gridCols }"
      >
        <span v-if="!readOnly" role="columnheader" />
        <span v-if="showJob" role="columnheader">JOB</span>
        <span role="columnheader">STATUS</span>
        <span role="columnheader">AP · COST</span>
        <span role="columnheader" class="text-center">CHARGE</span>
        <span role="columnheader" class="text-right">AR · SELL</span>
        <span role="columnheader" class="text-right">MARGIN</span>
        <span v-if="!readOnly" role="columnheader" />
      </div>

      <div
        v-for="(row, i) in visibleRows"
        :key="rowKey(row)"
        role="row"
        tabindex="0"
        class="grid items-center gap-0 px-3.5 py-2 outline-none transition-colors"
        :style="{ gridTemplateColumns: gridCols }"
        :class="[
          readOnly ? 'cursor-default' : 'cursor-pointer',
          i < visibleRows.length - 1 ? 'border-b border-slate-100' : '',
          !readOnly && (selectedCode === row.code || selectedCode === rowKey(row))
            ? 'border-l-[3px] border-l-teal-600 bg-teal-50/60'
            : !readOnly && isChecked(row)
              ? 'border-l-[3px] border-l-teal-300 bg-teal-50/30'
              : 'border-l-[3px] border-l-transparent hover:bg-slate-50',
        ]"
        @click="!readOnly && selectRow(row)"
        @dblclick="!readOnly && row.jobId && emit('openJob', row.jobId)"
      >
        <div
          v-if="!readOnly"
          role="gridcell"
          class="flex items-center justify-center"
          @click.stop="toggleRow(row)"
        >
          <input
            type="checkbox"
            class="h-3.5 w-3.5 cursor-pointer accent-teal-700"
            :checked="isChecked(row)"
            :aria-label="`Select ${row.code}`"
            @click.stop="toggleRow(row)"
          />
        </div>

        <div v-if="showJob" role="gridcell" class="min-w-0 pr-1">
          <div class="truncate font-mono text-[11px] font-bold text-slate-800">{{ row.jobNo }}</div>
          <div class="truncate text-[10px] text-slate-400">{{ row.customer }}</div>
        </div>

        <div role="gridcell">
          <span
            class="inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
            :class="ledgerStatusClass(ledgerRowStatus(row))"
          >
            {{ ledgerRowStatus(row).toUpperCase() }}
          </span>
        </div>

        <div role="gridcell">
          <div class="text-[13px] font-semibold text-slate-900">
            <template v-if="row.ap">
              {{ money(apFace(row), row.currency) }}
              <span
                v-if="row.cafApplied"
                class="ml-1 rounded bg-teal-50 px-1 text-[10px] font-bold text-teal-700"
                >+CAF</span
              >
            </template>
            <span v-else class="text-amber-700">No cost</span>
          </div>
          <div v-if="row.ap?.partyName" class="truncate text-[10px] text-slate-400">
            {{ row.ap.partyName }}
          </div>
          <div
            v-if="row.varianceFlagged && row.costVariance != null"
            class="text-[10px] font-semibold text-amber-700"
          >
            Var {{ money(row.costVariance, row.currency) }}
          </div>
        </div>

        <div role="gridcell" class="text-center">
          <div class="flex items-center justify-center gap-1.5">
            <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
              {{ row.code }}
            </span>
            <span
              class="rounded border px-1.5 py-px text-[10px] font-semibold tracking-wide"
              :class="
                row.oversea
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              "
            >
              {{ row.oversea ? 'INT' : 'DOM' }}
            </span>
          </div>
          <div class="mt-0.5 truncate text-[11px] text-slate-500">{{ row.label }}</div>
          <div
            v-if="row.matchState !== 'matched'"
            class="mt-0.5 text-[9px] font-bold uppercase text-amber-600"
          >
            {{ row.matchState === 'ap_only' ? 'AP only' : 'AR only' }}
          </div>
        </div>

        <div role="gridcell" class="text-right">
          <div
            class="text-[13px] font-semibold"
            :class="moneyScope === 'console-ap' ? 'text-slate-500' : 'text-slate-900'"
          >
            <template v-if="row.ar">{{ money(row.arAmount, row.currency) }}</template>
            <span v-else class="text-amber-700">No sell</span>
          </div>
          <div v-if="row.ar?.partyName" class="truncate text-[10px] text-slate-400">
            {{ row.ar.partyName }}
          </div>
        </div>

        <div role="gridcell" class="text-right">
          <span
            v-if="row.marginPct != null && row.matchState === 'matched'"
            class="rounded-[5px] border px-1.5 py-0.5 text-xs font-semibold"
            :class="
              row.marginPct < 8
                ? 'border-amber-200 bg-amber-50 text-amber-600'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600'
            "
          >
            {{ row.marginPct.toFixed(1) }}%
          </span>
          <span v-else class="text-[11px] text-slate-400">—</span>
        </div>

        <div v-if="!readOnly" role="gridcell" class="text-center text-slate-300">···</div>
      </div>

      <div v-if="!visibleRows.length" class="px-4 py-8 text-center text-[13px] text-slate-400">
        No charge lines for this filter.
      </div>
    </div>
  </div>
</template>
