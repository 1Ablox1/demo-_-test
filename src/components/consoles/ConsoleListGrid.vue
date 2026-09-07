<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ColumnMovedEvent,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
  type SortChangedEvent,
} from 'ag-grid-community'
import { Columns3, Filter, Search, SlidersHorizontal } from '@lucide/vue'
import type { ConsolidationRecord } from '@/stores/freight'
import {
  CONSOLE_GRID_GROUPS,
  CONSOLE_SEARCH_EXAMPLES,
  columnableConsoleFields,
  consoleGridFieldById,
  searchableConsoleFields,
} from '@/data/consoleGridCatalog'
import {
  activeConsoleAdvancedCount,
  applyConsoleGridQuery,
  consoleCellTextForField,
  emptyConsoleAdvancedFilters,
  loadConsoleLayoutState,
  saveConsoleLayoutState,
  type ConsoleAdvancedFilters,
} from '@/lib/consoleGridLayout'
import ListAdvancedSearchDrawer from '@/components/grid/ListAdvancedSearchDrawer.vue'
import ListColumnPicker from '@/components/grid/ListColumnPicker.vue'
import { BADGE_FIELD_IDS, badgeHtml } from '@/lib/gridStatusBadge'
import { GRID_HEADER_DEFAULTS, sizeColForHeader } from '@/lib/gridHeader'
import { useHorizontalDragScroll } from '@/composables/useHorizontalDragScroll'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

const props = defineProps<{
  rows: ConsolidationRecord[]
  lobKey: string
  title: string
}>()

const emit = defineEmits<{
  open: [id: string]
}>()

const quick = ref('')
const advancedOpen = ref(false)
const columnsOpen = ref(false)
const sortHint = ref('')

const layout = ref(loadConsoleLayoutState(props.lobKey))
const gridApi = ref<GridApi<ConsolidationRecord> | null>(null)
const gridHost = ref<HTMLElement | null>(null)
const { didDrag, bindFromRoot } = useHorizontalDragScroll(gridHost)

watch(
  () => props.lobKey,
  (key) => {
    layout.value = loadConsoleLayoutState(key)
  },
)

watch(
  layout,
  (v) => saveConsoleLayoutState(props.lobKey, v),
  { deep: true },
)

const searchableFields = computed(() => searchableConsoleFields(props.lobKey))
const columnFields = computed(() => columnableConsoleFields(props.lobKey))

const lobLabel = computed(() =>
  props.lobKey === 'AE' ? 'Air Export' : props.lobKey === 'AI' ? 'Air Import' : 'Air',
)

const filteredRows = computed(() =>
  applyConsoleGridQuery(props.rows, {
    quick: quick.value,
    advanced: layout.value.advanced,
  }),
)

const columnDefs = computed<ColDef<ConsolidationRecord>[]>(() =>
  layout.value.visibleColumnIds
    .map((id) => consoleGridFieldById(id))
    .filter((f): f is NonNullable<typeof f> => !!f && f.columnable)
    .map((f) => {
      const size = sizeColForHeader(f.label, f.width ?? 140)
      return {
      colId: f.id,
      headerName: f.label,
      headerTooltip: f.label,
      width: size.width,
      minWidth: size.minWidth,
      sortable: true,
      sortingOrder: ['asc', 'desc', null] as ('asc' | 'desc' | null)[],
      filter: false,
      cellClass: f.mono ? 'font-mono text-[12px]' : 'text-[12px]',
      valueGetter: (p) => (p.data ? consoleCellTextForField(p.data, f) : ''),
      comparator: (a: unknown, b: unknown) => {
        if (f.id === 'houseCount' || f.id === 'grossWeight' || f.id === 'chargeableWt') {
          const an = Number(String(a ?? '').replace(/[^\d.]/g, '')) || 0
          const bn = Number(String(b ?? '').replace(/[^\d.]/g, '')) || 0
          return an - bn
        }
        return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
      },
      ...(BADGE_FIELD_IDS.has(f.id)
        ? {
            cellRenderer: (p: { value: unknown }) => badgeHtml(f.id, p.value),
          }
        : {
            valueFormatter: (p: { value: unknown }) => {
              const v = p.value
              if (v == null || v === '') return '—'
              if (f.id === 'operateType') {
                if (v === 'back_to_back') return 'Back to Back'
                if (v === 'console') return 'Console'
              }
              return String(v)
            },
          }),
    }
    }),
)

const defaultColDef: ColDef = {
  ...GRID_HEADER_DEFAULTS,
  resizable: true,
  suppressHeaderMenuButton: true,
  sortable: true,
  suppressMovable: false,
}

const advCount = computed(() => activeConsoleAdvancedCount(layout.value.advanced))

function onGridReady(e: GridReadyEvent<ConsolidationRecord>) {
  gridApi.value = e.api
  requestAnimationFrame(() => bindFromRoot())
}

function onSortChanged(e: SortChangedEvent<ConsolidationRecord>) {
  const model = e.api.getColumnState().filter((c) => c.sort != null)
  sortHint.value = model
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((c) => {
      const label = consoleGridFieldById(c.colId ?? '')?.label ?? c.colId
      return `${label} ${c.sort === 'asc' ? '↑' : '↓'}`
    })
    .join(' · ')
}

/** Persist left/right drag reorder of headers. */
function onColumnMoved(e: ColumnMovedEvent<ConsolidationRecord>) {
  if (!e.finished) return
  const ordered = e.api
    .getColumnState()
    .map((c) => c.colId)
    .filter((id): id is string => !!id && layout.value.visibleColumnIds.includes(id))
  if (!ordered.length) return
  const prev = layout.value.visibleColumnIds
  if (prev.length === ordered.length && prev.every((id, i) => id === ordered[i])) return
  layout.value = { ...layout.value, visibleColumnIds: ordered }
}

function onRowClicked(e: RowClickedEvent<ConsolidationRecord>) {
  if (didDrag.value) return
  if (e.data?.id) emit('open', e.data.id)
}

function setVisibleColumns(ids: string[]) {
  layout.value = { ...layout.value, visibleColumnIds: ids }
}

function setAdvanced(advanced: ConsoleAdvancedFilters) {
  layout.value = { ...layout.value, advanced }
}

function clearAdvanced() {
  layout.value = {
    ...layout.value,
    advanced: emptyConsoleAdvancedFilters(props.lobKey),
  }
}

function clearSort() {
  gridApi.value?.applyColumnState({ defaultState: { sort: null } })
  sortHint.value = ''
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {{ title }} · Consoles
        </p>
        <h1 class="text-[18px] font-bold tracking-tight text-slate-900">Console list</h1>
        <p class="mt-0.5 text-[12px] text-muted-foreground">
          Drag headers to reorder · drag rows left/right to scroll · click headers to sort · open a row for master & houses
        </p>
      </div>
      <span class="font-mono text-[11px] text-slate-400">
        {{ filteredRows.length }} / {{ rows.length }}
      </span>
    </header>

    <div class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-5 py-2">
      <div class="relative min-w-[220px] flex-1">
        <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="quick"
          type="search"
          placeholder="Quick search — console, MAWB, airline, route…"
          class="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none focus:border-teal-500"
        />
      </div>
      <kbd
        class="hidden h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 font-mono text-[10px] text-slate-500 sm:inline-flex"
        title="Command palette"
      >
        ⌘K
      </kbd>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12px] font-semibold hover:bg-slate-50"
        :class="advCount ? 'border-teal-300 bg-teal-50 text-teal-900' : ''"
        @click="advancedOpen = true"
      >
        <SlidersHorizontal :size="14" />
        Advanced
        <span
          v-if="advCount"
          class="rounded-full bg-teal-700 px-1.5 text-[10px] font-bold text-white"
        >
          {{ advCount }}
        </span>
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12px] font-semibold hover:bg-slate-50"
        @click="columnsOpen = true"
      >
        <Columns3 :size="14" />
        Columns
      </button>
      <button
        v-if="advCount || quick || sortHint"
        type="button"
        class="flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
        @click="quick = ''; clearAdvanced(); clearSort()"
      >
        <Filter :size="12" />
        Clear
      </button>
    </div>

    <div
      v-if="sortHint"
      class="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50 px-5 py-1.5 text-[11px] text-slate-600"
    >
      <span class="font-semibold text-slate-500">Sort:</span>
      <span class="font-mono">{{ sortHint }}</span>
      <button type="button" class="text-teal-700 hover:underline" @click="clearSort">Reset sort</button>
    </div>

    <div
      v-if="advCount"
      class="flex flex-wrap gap-1.5 border-b border-border bg-teal-50/40 px-5 py-1.5"
    >
      <span
        v-for="(val, key) in layout.advanced"
        :key="key"
        v-show="String(val).trim()"
        class="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-2 py-0.5 text-[10px] font-medium text-teal-900"
      >
        {{ consoleGridFieldById(String(key))?.label ?? key }}: {{ val }}
      </span>
    </div>

    <div ref="gridHost" class="ag-theme-quartz console-ag-grid min-h-0 flex-1 px-3 pb-3 pt-2">
      <AgGridVue
        class="h-full w-full"
        :row-data="filteredRows"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :always-multi-sort="true"
        :animate-rows="true"
        :row-height="32"
        :header-height="32"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :suppress-cell-focus="true"
        :suppress-movable-columns="false"
        :get-row-id="(p) => p.data.id"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
        @column-moved="onColumnMoved"
        @row-clicked="onRowClicked"
      />
    </div>

    <ListAdvancedSearchDrawer
      :open="advancedOpen"
      :fields="searchableFields"
      :groups="CONSOLE_GRID_GROUPS"
      :examples="CONSOLE_SEARCH_EXAMPLES"
      :model-value="layout.advanced"
      :pins-key="`consoles:${lobKey}`"
      :subtitle="`Legacy + AU pack · ${searchableFields.length} fields · ${lobLabel}`"
      @close="advancedOpen = false"
      @update:model-value="setAdvanced"
    />
    <ListColumnPicker
      :open="columnsOpen"
      :fields="columnFields"
      :groups="CONSOLE_GRID_GROUPS"
      :model-value="layout.visibleColumnIds"
      :subtitle="`Add or hide · ${columnFields.length} · ${lobLabel}`"
      @close="columnsOpen = false"
      @update:model-value="setVisibleColumns"
    />
  </div>
</template>

<style scoped>
.console-ag-grid {
  --ag-font-family: inherit;
  --ag-font-size: 12px;
  --ag-border-color: #e2e8f0;
  --ag-header-background-color: #f8fafc;
  --ag-odd-row-background-color: #ffffff;
  --ag-row-hover-color: #ccfbf1;
  --ag-selected-row-background-color: #99f6e4;
  --ag-range-selection-border-color: #0f766e;
}
.console-ag-grid :deep(.ag-root-wrapper) {
  border-radius: 8px;
  overflow: hidden;
}
.console-ag-grid :deep(.ag-row) {
  cursor: pointer;
}
.console-ag-grid :deep(.ag-row-selected) {
  background-color: #99f6e4 !important;
  box-shadow: inset 3px 0 0 #0f766e;
}
.console-ag-grid :deep(.ag-header-cell-label) {
  cursor: grab;
}
.console-ag-grid :deep(.ag-header-cell-moving .ag-header-cell-label) {
  cursor: grabbing;
}
.console-ag-grid.h-drag-scroll :deep(.ag-center-cols-viewport),
.console-ag-grid.h-drag-scroll :deep(.ag-body-viewport) {
  cursor: grab;
}
.console-ag-grid.is-h-dragging,
.console-ag-grid.is-h-dragging :deep(.ag-center-cols-viewport),
.console-ag-grid.is-h-dragging :deep(.ag-body-viewport),
.console-ag-grid.is-h-dragging :deep(.ag-row) {
  cursor: grabbing !important;
  user-select: none;
}
</style>
