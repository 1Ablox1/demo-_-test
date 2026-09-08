<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellClickedEvent,
  type CellContextMenuEvent,
  type ColDef,
  type ColumnMovedEvent,
  type GridApi,
  type GridReadyEvent,
  type ICellRendererParams,
  type RowClickedEvent,
  type RowDoubleClickedEvent,
  type SelectionChangedEvent,
  type SortChangedEvent,
} from 'ag-grid-community'
import { Columns3, Filter, Plus, Search, SlidersHorizontal, X } from '@lucide/vue'
import TableBulkActionBar from '@/components/grid/TableBulkActionBar.vue'
import TableRowContextMenu, {
  type TableContextAction,
} from '@/components/grid/TableRowContextMenu.vue'
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
import {
  copyText,
  isDraftStatus,
  rowActionsCellHtml,
} from '@/lib/tableRowActions'

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
  create: []
  toast: [message: string, kind?: 'success' | 'info' | 'warn']
}>()

const quick = ref('')
const advancedOpen = ref(false)
const columnsOpen = ref(false)
const sortHint = ref('')
const selectedCount = ref(0)
const selectedRows = ref<ConsolidationRecord[]>([])

const ctxOpen = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxRow = ref<ConsolidationRecord | null>(null)

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

const columnDefs = computed<ColDef<ConsolidationRecord>[]>(() => {
  const dataCols = layout.value.visibleColumnIds
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
        valueGetter: (p: { data?: ConsolidationRecord }) =>
          p.data ? consoleCellTextForField(p.data, f) : '',
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
    })

  const actionsCol: ColDef<ConsolidationRecord> = {
    colId: '_actions',
    headerName: '',
    width: 96,
    maxWidth: 96,
    pinned: 'right',
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: 'os-row-actions-cell',
    cellRenderer: (p: ICellRendererParams<ConsolidationRecord>) =>
      p.data ? rowActionsCellHtml(p.data.id) : '',
  }

  return [...dataCols, actionsCol]
})

const defaultColDef: ColDef = {
  ...GRID_HEADER_DEFAULTS,
  resizable: true,
  suppressHeaderMenuButton: true,
  sortable: true,
  suppressMovable: false,
}

const advCount = computed(() => activeConsoleAdvancedCount(layout.value.advanced))
const canDeleteCtx = computed(() => isDraftStatus(ctxRow.value?.status))

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

function onColumnMoved(e: ColumnMovedEvent<ConsolidationRecord>) {
  if (!e.finished) return
  const ordered = e.api
    .getColumnState()
    .map((c) => c.colId)
    .filter(
      (id): id is string =>
        !!id && id !== '_actions' && layout.value.visibleColumnIds.includes(id),
    )
  if (!ordered.length) return
  const prev = layout.value.visibleColumnIds
  if (prev.length === ordered.length && prev.every((id, i) => id === ordered[i])) return
  layout.value = { ...layout.value, visibleColumnIds: ordered }
}

function onSelectionChanged(e: SelectionChangedEvent<ConsolidationRecord>) {
  const rows = e.api.getSelectedRows()
  selectedRows.value = rows
  selectedCount.value = rows.length
}

function onRowClicked(e: RowClickedEvent<ConsolidationRecord>) {
  if (didDrag.value) return
  const t = e.event?.target as HTMLElement | null
  if (t?.closest?.('.ag-checkbox-input, .ag-selection-checkbox, [data-row-action]')) return
}

function onRowDoubleClicked(e: RowDoubleClickedEvent<ConsolidationRecord>) {
  if (didDrag.value) return
  const t = e.event?.target as HTMLElement | null
  if (t?.closest?.('.ag-checkbox-input, .ag-selection-checkbox, [data-row-action]')) return
  if (e.data?.id) emit('open', e.data.id)
}

function openContextAt(row: ConsolidationRecord, clientX: number, clientY: number) {
  ctxRow.value = row
  const pad = 8
  ctxX.value = Math.min(clientX, window.innerWidth - 220)
  ctxY.value = Math.min(clientY, window.innerHeight - 180)
  if (ctxX.value < pad) ctxX.value = pad
  if (ctxY.value < pad) ctxY.value = pad
  ctxOpen.value = true
}

function onCellContextMenu(e: CellContextMenuEvent<ConsolidationRecord>) {
  e.event?.preventDefault?.()
  if (!e.data) return
  const ev = e.event as MouseEvent | undefined
  openContextAt(e.data, ev?.clientX ?? 0, ev?.clientY ?? 0)
}

function onCellClicked(e: CellClickedEvent<ConsolidationRecord>) {
  const t = e.event?.target as HTMLElement | null
  const btn = t?.closest?.('[data-row-action]') as HTMLElement | null
  if (!btn || !e.data) return
  e.event?.stopPropagation?.()
  const action = btn.getAttribute('data-row-action')
  if (action === 'edit') {
    emit('open', e.data.id)
    return
  }
  if (action === 'copy') {
    void copyConsoleCodes(e.data)
    return
  }
  if (action === 'more') {
    const rect = btn.getBoundingClientRect()
    openContextAt(e.data, rect.left, rect.bottom + 4)
  }
}

async function copyConsoleCodes(row: ConsolidationRecord) {
  const text = [row.masterJobNo, row.mawb, row.airline].filter(Boolean).join(' · ')
  const ok = await copyText(text)
  emit('toast', ok ? `Copied ${text}` : 'Copy failed', ok ? 'success' : 'warn')
}

function onContextAction(action: TableContextAction) {
  const row = ctxRow.value
  ctxOpen.value = false
  if (!row) return
  if (action === 'edit') emit('open', row.id)
  else if (action === 'copy') void copyConsoleCodes(row)
  else if (action === 'duplicate') {
    emit('toast', `Duplicated console draft from ${row.masterJobNo} (mock)`, 'info')
  } else if (action === 'delete') {
    if (!isDraftStatus(row.status)) {
      emit('toast', 'Delete Line only when status is Draft', 'warn')
      return
    }
    emit('toast', `Delete Line blocked in mock — ${row.masterJobNo}`, 'warn')
  }
}

function deselectAll() {
  gridApi.value?.deselectAll()
  selectedRows.value = []
  selectedCount.value = 0
}

async function bulkCopyCodes() {
  const lines = selectedRows.value.map((r) =>
    [r.masterJobNo, r.mawb].filter(Boolean).join(' · '),
  )
  const ok = await copyText(lines.join('\n'))
  emit('toast', ok ? `Copied ${lines.length} code(s)` : 'Copy failed', ok ? 'success' : 'warn')
}

function bulkAccrue() {
  emit('toast', `Accrue Selected · ${selectedCount.value} consoles (legacy batch mock)`, 'info')
}

function bulkPost() {
  emit('toast', `Post / Batch Update · ${selectedCount.value} consoles (legacy PUT mock)`, 'info')
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

/** Turn off active advanced filters (keeps quick search / column sort). */
function cancelAdvancedSearch() {
  if (!advCount.value && !advancedOpen.value) return
  clearAdvanced()
  advancedOpen.value = false
}

function onAdvancedClick() {
  advancedOpen.value = true
}

function onAdvancedDblClick() {
  if (advCount.value) cancelAdvancedSearch()
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
          Double-click a row to edit · right-click for actions · drag headers to reorder · click headers
          to sort
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono text-[11px] text-slate-400">
          {{ filteredRows.length }} / {{ rows.length }}
        </span>
        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-semibold text-white hover:bg-teal-700"
          @click="emit('create')"
        >
          <Plus :size="14" />
          New console
        </button>
      </div>
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
      <div
        class="inline-flex h-8 items-center overflow-hidden rounded-md border"
        :class="advCount ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white'"
      >
        <button
          type="button"
          class="flex h-full items-center gap-1.5 px-3 text-[12px] font-semibold hover:bg-slate-50/80"
          :class="advCount ? 'text-teal-900' : 'text-slate-800'"
          :title="
            advCount
              ? 'Open advanced search · double-click to clear filters'
              : 'Open advanced search'
          "
          @click="onAdvancedClick"
          @dblclick.prevent="onAdvancedDblClick"
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
          v-if="advCount"
          type="button"
          class="flex h-full items-center border-l border-teal-200 px-2 text-teal-800 hover:bg-teal-100"
          title="Cancel advanced search"
          aria-label="Cancel advanced search"
          @click="cancelAdvancedSearch"
        >
          <X :size="14" />
        </button>
      </div>
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
        :row-height="36"
        :header-height="32"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: false,
        }"
        :suppress-cell-focus="true"
        :suppress-movable-columns="false"
        :prevent-default-on-context-menu="true"
        :get-row-id="(p) => p.data.id"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
        @column-moved="onColumnMoved"
        @selection-changed="onSelectionChanged"
        @row-clicked="onRowClicked"
        @row-double-clicked="onRowDoubleClicked"
        @cell-clicked="onCellClicked"
        @cell-context-menu="onCellContextMenu"
      />
    </div>

    <TableBulkActionBar
      :count="selectedCount"
      @accrue="bulkAccrue"
      @post="bulkPost"
      @copy-codes="bulkCopyCodes"
      @deselect="deselectAll"
    />

    <TableRowContextMenu
      :open="ctxOpen"
      :x="ctxX"
      :y="ctxY"
      :can-delete="canDeleteCtx"
      :entity-label="ctxRow?.masterJobNo"
      @close="ctxOpen = false"
      @action="onContextAction"
    />

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
/* Typography: header+cells 12px · header 600 · cells 400 · actions 11px · row 36 / header 32 */
.console-ag-grid {
  --ag-font-family: var(--font-sans), 'Inter', system-ui, sans-serif;
  --ag-font-size: 12px;
  --ag-header-font-size: 12px;
  --ag-header-font-weight: 600;
  --ag-border-color: #e2e8f0;
  --ag-header-background-color: #f8fafc;
  --ag-odd-row-background-color: #ffffff;
  --ag-row-hover-color: #ccfbf1;
  --ag-selected-row-background-color: #99f6e4;
  --ag-range-selection-border-color: #0f766e;
  font-family: var(--font-sans), 'Inter', system-ui, sans-serif;
  font-size: 12px;
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
.console-ag-grid :deep(.ag-row-selected::before) {
  content: none;
}
.console-ag-grid :deep(.ag-header-cell-label) {
  cursor: grab;
  overflow: visible;
}
.console-ag-grid :deep(.ag-header-cell-text) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
  line-height: 1.25;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}
.console-ag-grid :deep(.ag-cell) {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
}
.console-ag-grid :deep(.ag-cell.font-mono),
.console-ag-grid :deep(.font-mono) {
  font-size: 12px;
  font-weight: 400;
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
.console-ag-grid :deep(.os-row-actions-cell) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.console-ag-grid :deep(.os-row-actions) {
  display: none;
  align-items: center;
  gap: 2px;
}
.console-ag-grid :deep(.ag-row-hover .os-row-actions),
.console-ag-grid :deep(.ag-row-selected .os-row-actions) {
  display: inline-flex;
}
.console-ag-grid :deep(.os-row-action) {
  display: inline-flex;
  height: 24px;
  min-width: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  cursor: pointer;
}
.console-ag-grid :deep(.os-row-action:hover) {
  background: #ccfbf1;
}
</style>
