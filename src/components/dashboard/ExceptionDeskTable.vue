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
  type ICellRendererParams,
  type RowClickedEvent,
  type RowDoubleClickedEvent,
  type SelectionChangedEvent,
  type SortChangedEvent,
} from 'ag-grid-community'
import { Columns3, Search } from '@lucide/vue'
import type { WorkbenchJob } from '@/data/workbench'
import {
  billsLine,
  defaultActionLabel,
  EXCEPTION_DESK_GROUPS,
  exceptionCellText,
  exceptionDeskColumnableFields,
  exceptionDeskFieldById,
  exceptionSortValue,
  formatMoneyRisk,
  loadExceptionDeskColumns,
  modeBadge,
  saveExceptionDeskColumns,
  severityRailColor,
  slaCountdown,
} from '@/data/exceptionDeskGridCatalog'
import { sortExceptionsByImportance } from '@/lib/exceptionDesk'
import ListColumnPicker from '@/components/grid/ListColumnPicker.vue'
import TableBulkActionBar from '@/components/grid/TableBulkActionBar.vue'
import { useHorizontalDragScroll } from '@/composables/useHorizontalDragScroll'
import { GRID_HEADER_DEFAULTS, sizeColForHeader } from '@/lib/gridHeader'
import { copyText } from '@/lib/tableRowActions'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

const props = withDefaults(
  defineProps<{
    jobs: WorkbenchJob[]
    filterLabel?: string | null
    title?: string
    subtitle?: string
    embedded?: boolean
  }>(),
  {
    title: 'Exception Desk',
    subtitle: '',
    embedded: false,
  },
)

const emit = defineEmits<{
  select: [job: WorkbenchJob]
  action: [job: WorkbenchJob]
  openJob: [job: WorkbenchJob]
  clearFilter: []
  toast: [message: string, kind?: 'success' | 'info' | 'warn']
}>()

const gridApi = ref<GridApi<WorkbenchJob> | null>(null)
const gridHost = ref<HTMLElement | null>(null)
const { didDrag, bindFromRoot } = useHorizontalDragScroll(gridHost)

const quick = ref('')
const columnsOpen = ref(false)
const sortHint = ref('')
const visibleColumnIds = ref(loadExceptionDeskColumns())
const selectedCount = ref(0)
const selectedRows = ref<WorkbenchJob[]>([])

watch(
  visibleColumnIds,
  (ids) => saveExceptionDeskColumns(ids),
  { deep: true },
)

const filteredJobs = computed(() => {
  const q = quick.value.trim().toLowerCase()
  const base = sortExceptionsByImportance(props.jobs)
  if (!q) return base
  return base.filter((j) => {
    const hay = [
      j.jobNo,
      j.title,
      j.customer,
      j.route,
      j.priority,
      j.lobPrefix,
      j.responsible,
      j.why,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const columnFields = computed(() => exceptionDeskColumnableFields())

const columnDefs = computed<ColDef<WorkbenchJob>[]>(() => {
  const rail: ColDef<WorkbenchJob> = {
    colId: 'rail',
    headerName: '',
    width: 8,
    maxWidth: 8,
    minWidth: 8,
    pinned: 'left',
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: 'ex-rail-cell',
    cellRenderer: (p: ICellRendererParams<WorkbenchJob>) => {
      if (!p.data) return ''
      const color = severityRailColor(p.data.priority)
      return `<span class="ex-severity-rail" style="background:${color}" title="${p.data.priority}"></span>`
    },
  }

  const cols = visibleColumnIds.value
    .map((id) => exceptionDeskFieldById(id))
    .filter((f): f is NonNullable<typeof f> => !!f && f.columnable)
    .sort((a, b) => {
      // Resolve always last (pinned right)
      if (a.id === 'action') return 1
      if (b.id === 'action') return -1
      return 0
    })
    .map((f): ColDef<WorkbenchJob> => {
      const size = sizeColForHeader(f.label, f.width ?? 140)
      const base: ColDef<WorkbenchJob> = {
        colId: f.id,
        headerName: f.label,
        headerTooltip: f.label,
        width: size.width,
        minWidth: size.minWidth,
        sortable: f.sortable !== false,
        sortingOrder: ['asc', 'desc', null] as ('asc' | 'desc' | null)[],
        filter: false,
        cellClass: f.mono ? 'font-mono text-[12px]' : 'text-[12px]',
        valueGetter: (p) => (p.data ? exceptionCellText(p.data, f.id) : ''),
        comparator: (_a, _b, nodeA, nodeB) => {
          const ja = nodeA?.data
          const jb = nodeB?.data
          if (!ja || !jb) return 0
          const va = exceptionSortValue(ja, f.id)
          const vb = exceptionSortValue(jb, f.id)
          if (typeof va === 'number' && typeof vb === 'number') return va - vb
          return String(va).localeCompare(String(vb), undefined, { numeric: true })
        },
      }

      if (f.id === 'mode') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          return `<span class="ex-mode-pill">${modeBadge(p.data.lobPrefix).label}</span>`
        }
      } else if (f.id === 'severity') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          const pri = p.data.priority
          const color = severityRailColor(pri)
          return `<span class="ex-sev-pill" style="border-color:${color};color:${color}">${pri}</span>`
        }
      } else if (f.id === 'job') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          const bills = billsLine(p.data)
          return `<div class="ex-job-cell">
            <button type="button" class="ex-job-link font-mono" data-open-job="${p.data.id}">${p.data.jobNo}</button>
            <div class="ex-job-bills font-mono">${bills}</div>
          </div>`
        }
        base.onCellClicked = (e) => {
          const t = e.event?.target as HTMLElement | null
          if (t?.closest?.('[data-open-job]') && e.data) {
            e.event?.stopPropagation?.()
            emit('openJob', e.data)
          }
        }
      } else if (f.id === 'title') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          const gate = p.data.hasGate
            ? `<span class="os-micro-badge os-micro-badge--amber">[GATE]</span>`
            : ''
          return `<div class="ex-title-cell"><div class="ex-title-text">${p.data.title}</div>${gate}</div>`
        }
      } else if (f.id === 'customer') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          return `<div><div class="ex-cust">${p.data.customer}</div></div>`
        }
      } else if (f.id === 'sla') {
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          const text = slaCountdown(p.data.due, p.data.priority)
          const urgent = p.data.due === '4h' || p.data.priority === 'Critical'
          const cls = urgent
            ? 'os-micro-badge os-micro-badge--amber'
            : 'os-micro-badge os-micro-badge--slate'
          return `<span class="${cls}">${text}</span>`
        }
      } else if (f.id === 'money') {
        base.cellClass = 'font-mono text-right text-[12px]'
        base.headerClass = 'ag-right-aligned-header'
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          const m = formatMoneyRisk(p.data?.moneyRisk)
          if (!m) return `<span class="text-slate-300">—</span>`
          return `<span class="font-mono text-[12px] font-semibold text-red-700">${m}</span>`
        }
      } else if (f.id === 'action') {
        base.sortable = false
        base.pinned = 'right'
        base.suppressMovable = true
        base.resizable = false
        base.width = Math.max(size.width, 128)
        base.minWidth = 120
        base.maxWidth = 160
        base.cellClass = 'ex-action-cell'
        base.cellRenderer = (p: ICellRendererParams<WorkbenchJob>) => {
          if (!p.data) return ''
          const label = p.data.actionLabel ?? defaultActionLabel(p.data)
          return `<button type="button" class="ex-resolve-btn" data-resolve="${p.data.id}">Resolve ↗</button>
            <div class="ex-resolve-hint">${label}</div>`
        }
        base.onCellClicked = (e) => {
          const t = e.event?.target as HTMLElement | null
          if (t?.closest?.('[data-resolve]') && e.data) {
            e.event?.stopPropagation?.()
            emit('action', e.data)
          }
        }
      }

      return base
    })

  return [rail, ...cols]
})

const defaultColDef: ColDef = {
  ...GRID_HEADER_DEFAULTS,
  resizable: true,
  suppressHeaderMenuButton: true,
  sortable: true,
  suppressMovable: false,
}

function onGridReady(e: GridReadyEvent<WorkbenchJob>) {
  gridApi.value = e.api
  requestAnimationFrame(() => bindFromRoot())
}

function onSortChanged(e: SortChangedEvent<WorkbenchJob>) {
  const model = e.api.getColumnState().filter((c) => c.sort != null && c.colId !== 'rail')
  sortHint.value = model
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((c) => {
      const label = exceptionDeskFieldById(c.colId ?? '')?.label ?? c.colId
      return `${label} ${c.sort === 'asc' ? '↑' : '↓'}`
    })
    .join(' · ')
}

function onColumnMoved(e: ColumnMovedEvent<WorkbenchJob>) {
  if (!e.finished) return
  const ordered = e.api
    .getColumnState()
    .map((c) => c.colId)
    .filter(
      (id): id is string =>
        !!id && id !== 'rail' && id !== 'action' && visibleColumnIds.value.includes(id),
    )
  if (!ordered.length) return
  // Keep Resolve pinned last in saved order
  const next = visibleColumnIds.value.includes('action') ? [...ordered, 'action'] : ordered
  if (
    next.length === visibleColumnIds.value.length &&
    next.every((id, i) => id === visibleColumnIds.value[i])
  ) {
    return
  }
  visibleColumnIds.value = next
}

function onRowClicked(e: RowClickedEvent<WorkbenchJob>) {
  if (didDrag.value) return
  const t = e.event?.target as HTMLElement | null
  if (t?.closest?.('.ag-checkbox-input, .ag-selection-checkbox, [data-resolve]')) {
    return
  }
  if (t?.closest?.('[data-open-job]')) {
    if (e.data) emit('openJob', e.data)
    return
  }
  if (e.data) emit('select', e.data)
}

function onRowDblClicked(e: RowDoubleClickedEvent<WorkbenchJob>) {
  if (didDrag.value) return
  const t = e.event?.target as HTMLElement | null
  if (t?.closest?.('.ag-checkbox-input, .ag-selection-checkbox, [data-resolve]')) {
    return
  }
  if (e.data) emit('openJob', e.data)
}

function onSelectionChanged(e: SelectionChangedEvent<WorkbenchJob>) {
  const rows = e.api.getSelectedRows()
  selectedRows.value = rows
  selectedCount.value = rows.length
}

function formatHouseBillSafe(job: WorkbenchJob) {
  return job.houseBill ? String(job.houseBill) : ''
}
function formatMasterBillSafe(job: WorkbenchJob) {
  return job.masterBill ? String(job.masterBill) : ''
}

function deselectAll() {
  gridApi.value?.deselectAll()
  selectedRows.value = []
  selectedCount.value = 0
}

async function bulkCopyCodes() {
  const lines = selectedRows.value.map((j) =>
    [j.jobNo, formatHouseBillSafe(j), formatMasterBillSafe(j)].filter(Boolean).join(' · '),
  )
  const ok = await copyText(lines.join('\n'))
  emit('toast', ok ? `Copied ${lines.length} code(s)` : 'Copy failed', ok ? 'success' : 'warn')
}

function bulkAccrue() {
  emit('toast', `Accrue Selected · ${selectedCount.value} (legacy batch mock)`, 'info')
}

function bulkPost() {
  emit('toast', `Post / Batch Update · ${selectedCount.value} (legacy PUT mock)`, 'info')
}

function getRowId(p: { data: WorkbenchJob }) {
  return p.data.id
}

function setVisibleColumns(ids: string[]) {
  visibleColumnIds.value = ids.length ? ids : loadExceptionDeskColumns()
}

function clearSort() {
  gridApi.value?.applyColumnState({ defaultState: { sort: null } })
  sortHint.value = ''
}
</script>

<template>
  <section
    class="flex min-h-0 flex-1 flex-col overflow-hidden"
    :class="embedded ? '' : 'os-panel'"
  >
    <div
      class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2"
      :class="embedded ? 'border-[#F3F4F6] bg-[#F9FAFB]' : ''"
    >
      <div class="min-w-0">
        <h2 class="text-[13px] font-bold text-foreground">{{ title }}</h2>
        <p class="text-[11px] text-muted-foreground">
          <template v-if="subtitle">{{ subtitle }}</template>
          <template v-else>
            {{ filteredJobs.length }} jobs · double-click row to open job · drag to scroll · click headers to sort
          </template>
          <template v-if="filterLabel">
            · filter
            <span class="font-semibold text-teal-800">{{ filterLabel }}</span>
          </template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <div class="relative">
          <Search
            :size="13"
            class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="quick"
            type="search"
            placeholder="Filter rows…"
            class="h-8 w-[140px] rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[12px] outline-none focus:border-teal-400 sm:w-[160px]"
          />
        </div>
        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-semibold hover:bg-slate-50"
          @click="columnsOpen = true"
        >
          <Columns3 :size="14" />
          Columns
        </button>
        <button
          v-if="filterLabel"
          type="button"
          class="h-8 rounded-md border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
          @click="emit('clearFilter')"
        >
          Clear filter
        </button>
      </div>
    </div>

    <div
      v-if="sortHint"
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600"
    >
      <span class="font-semibold text-slate-500">Sort:</span>
      <span class="font-mono">{{ sortHint }}</span>
      <button type="button" class="text-teal-700 hover:underline" @click="clearSort">
        Reset sort
      </button>
    </div>

    <div ref="gridHost" class="ag-theme-quartz ex-ag-grid min-h-[200px] flex-1 px-2 pb-2 pt-1">
      <AgGridVue
        class="h-full w-full"
        :row-data="filteredJobs"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :row-height="36"
        :header-height="32"
        :animate-rows="true"
        :always-multi-sort="true"
        :suppress-cell-focus="true"
        :suppress-movable-columns="false"
        :prevent-default-on-context-menu="false"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: false,
        }"
        :get-row-id="getRowId"
        @grid-ready="onGridReady"
        @sort-changed="onSortChanged"
        @column-moved="onColumnMoved"
        @selection-changed="onSelectionChanged"
        @row-clicked="onRowClicked"
        @row-double-clicked="onRowDblClicked"
      />
      <p
        v-if="!filteredJobs.length"
        class="pointer-events-none absolute inset-x-0 top-24 text-center text-[13px] text-muted-foreground"
      >
        No jobs match this block.
      </p>
    </div>

    <TableBulkActionBar
      :count="selectedCount"
      @accrue="bulkAccrue"
      @post="bulkPost"
      @copy-codes="bulkCopyCodes"
      @deselect="deselectAll"
    />

    <ListColumnPicker
      :open="columnsOpen"
      :fields="columnFields"
      :groups="EXCEPTION_DESK_GROUPS"
      :model-value="visibleColumnIds"
      subtitle="Add or hide columns · same pattern as Jobs"
      @close="columnsOpen = false"
      @update:model-value="setVisibleColumns"
    />
  </section>
</template>

<style scoped>
.ex-ag-grid {
  position: relative;
  --ag-font-family: inherit;
  --ag-font-size: 12px;
  --ag-border-color: #e2e8f0;
  --ag-header-background-color: #f8fafc;
  --ag-row-hover-color: #ccfbf1;
  --ag-selected-row-background-color: #99f6e4;
}
.ex-ag-grid :deep(.ag-root-wrapper) {
  border-radius: 8px;
  overflow: hidden;
}
.ex-ag-grid :deep(.ag-row) {
  cursor: pointer;
}
.ex-ag-grid :deep(.ag-header-cell-label) {
  font-weight: 700;
}
.ex-ag-grid.h-drag-scroll :deep(.ag-center-cols-viewport),
.ex-ag-grid.h-drag-scroll :deep(.ag-body-viewport) {
  cursor: grab;
}
.ex-ag-grid.is-h-dragging,
.ex-ag-grid.is-h-dragging :deep(.ag-center-cols-viewport),
.ex-ag-grid.is-h-dragging :deep(.ag-body-viewport),
.ex-ag-grid.is-h-dragging :deep(.ag-row) {
  cursor: grabbing !important;
  user-select: none;
}
.ex-ag-grid :deep(.ex-rail-cell) {
  padding: 0 !important;
}
.ex-ag-grid :deep(.ex-severity-rail) {
  display: block;
  width: 4px;
  height: 100%;
  min-height: 36px;
  border-radius: 0 2px 2px 0;
}
.ex-ag-grid :deep(.ex-mode-pill) {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.ex-ag-grid :deep(.ex-sev-pill) {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid;
  background: #fff;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.ex-ag-grid :deep(.ex-job-link) {
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ex-ag-grid :deep(.ex-job-bills) {
  font-size: 10px;
  color: #64748b;
  margin-top: 1px;
}
.ex-ag-grid :deep(.ex-title-text) {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}
.ex-ag-grid :deep(.ex-cust) {
  font-size: 12px;
  font-weight: 500;
}
.ex-ag-grid :deep(.ex-resolve-btn) {
  display: inline-flex;
  height: 28px;
  align-items: center;
  border-radius: 6px;
  border: 1px solid #99f6e4;
  background: #f0fdfa;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  cursor: pointer;
}
.ex-ag-grid :deep(.ex-resolve-btn:hover) {
  background: #ccfbf1;
}
.ex-ag-grid :deep(.ex-resolve-hint) {
  margin-top: 2px;
  font-size: 9px;
  color: #94a3b8;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ex-ag-grid :deep(.ex-action-cell) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}
.ex-ag-grid.h-drag-scroll :deep(.ag-center-cols-viewport),
.ex-ag-grid.h-drag-scroll :deep(.ag-body-viewport) {
  cursor: grab;
}
.ex-ag-grid.is-h-dragging,
.ex-ag-grid.is-h-dragging :deep(.ag-center-cols-viewport),
.ex-ag-grid.is-h-dragging :deep(.ag-body-viewport),
.ex-ag-grid.is-h-dragging :deep(.ag-row) {
  cursor: grabbing !important;
  user-select: none;
}
</style>
