import type { ConsolidationRecord } from '@/stores/freight'
import {
  CONSOLE_GRID_FIELDS,
  columnableConsoleFields,
  consoleGridFieldById,
  defaultVisibleConsoleColumnIds,
  searchableConsoleFields,
} from '@/data/consoleGridCatalog'
import type { GridField } from '@/data/gridFieldTypes'

export type ConsoleAdvancedFilters = Record<string, string>

export interface ConsoleGridLayoutState {
  visibleColumnIds: string[]
  advanced: ConsoleAdvancedFilters
}

const STORAGE_KEY = 'cw-os-console-grid-layout-v1'

export function emptyConsoleAdvancedFilters(lobKey = 'ALL'): ConsoleAdvancedFilters {
  const o: ConsoleAdvancedFilters = {}
  for (const f of searchableConsoleFields(lobKey)) {
    o[f.id] = ''
  }
  return o
}

export function defaultConsoleLayoutState(lobKey = 'ALL'): ConsoleGridLayoutState {
  return {
    visibleColumnIds: defaultVisibleConsoleColumnIds(),
    advanced: emptyConsoleAdvancedFilters(lobKey),
  }
}

export function loadConsoleLayoutState(lobKey: string): ConsoleGridLayoutState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${lobKey}`)
    if (!raw) return defaultConsoleLayoutState(lobKey)
    const parsed = JSON.parse(raw) as Partial<ConsoleGridLayoutState>
    const base = defaultConsoleLayoutState(lobKey)
    const allowed = new Set(columnableConsoleFields(lobKey).map((f) => f.id))
    return {
      visibleColumnIds:
        parsed.visibleColumnIds?.filter((id) => allowed.has(id)) ?? base.visibleColumnIds,
      advanced: { ...emptyConsoleAdvancedFilters(lobKey), ...(parsed.advanced ?? {}) },
    }
  } catch {
    return defaultConsoleLayoutState(lobKey)
  }
}

export function saveConsoleLayoutState(lobKey: string, state: ConsoleGridLayoutState) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY}:${lobKey}`,
      JSON.stringify({
        visibleColumnIds: state.visibleColumnIds,
        advanced: state.advanced,
      }),
    )
  } catch {
    /* ignore */
  }
}

function readFromSource(
  row: ConsolidationRecord,
  field: string,
  source: NonNullable<GridField['valueSource']>,
): string {
  if (source === 'row') {
    if (field === 'houseCount') return String(row.houseIds?.length ?? 0)
    const direct = (row as unknown as Record<string, unknown>)[field]
    return direct != null && String(direct).trim() !== '' ? String(direct) : ''
  }
  if (source === 'extras') {
    const extra = row.extras?.[field]
    return extra != null && String(extra).trim() !== '' ? String(extra) : ''
  }
  return ''
}

export function consoleCellTextForField(row: ConsolidationRecord, meta: GridField): string {
  if (meta.field === 'houseCount' || meta.id === 'houseCount') {
    return String(row.houseIds?.length ?? 0)
  }
  const preferred = meta.valueSource
  const order: Array<'row' | 'extras'> = preferred === 'extras' ? ['extras', 'row'] : ['row', 'extras']
  for (const source of order) {
    const text = readFromSource(row, meta.field, source)
    if (text) return text
  }
  const byId = row.extras?.[meta.id]
  if (byId != null && String(byId).trim() !== '') return String(byId)
  return ''
}

export function applyConsoleGridQuery(
  rows: ConsolidationRecord[],
  opts: { quick: string; advanced: ConsoleAdvancedFilters },
): ConsolidationRecord[] {
  const q = opts.quick.trim().toLowerCase()
  return rows.filter((row) => {
    if (q) {
      const hay = [
        row.masterJobNo,
        row.mawb,
        row.route,
        row.airline,
        row.notes,
        row.status,
        ...Object.values(row.extras ?? {}),
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    for (const [fieldId, value] of Object.entries(opts.advanced)) {
      const needle = value.trim().toLowerCase()
      if (!needle) continue
      const meta = consoleGridFieldById(fieldId)
      const cell = (meta ? consoleCellTextForField(row, meta) : '').toLowerCase()
      if (!cell.includes(needle)) return false
    }
    return true
  })
}

export function activeConsoleAdvancedCount(advanced: ConsoleAdvancedFilters): number {
  return Object.values(advanced).filter((v) => v.trim()).length
}

void CONSOLE_GRID_FIELDS
