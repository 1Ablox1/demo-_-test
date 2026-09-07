import type { ShipmentRecord } from '@/stores/freight'
import {
  JOB_GRID_FIELDS,
  columnableFields,
  defaultVisibleColumnIds,
  jobGridFieldById,
  searchableFieldsForLob,
  type JobGridField,
} from '@/data/jobGridCatalog'

export type SortDir = 'asc' | 'desc'

export interface JobSortLevel {
  fieldId: string
  dir: SortDir
}

export type JobAdvancedFilters = Record<string, string>

export interface JobGridLayoutState {
  visibleColumnIds: string[]
  sorts: JobSortLevel[]
  advanced: JobAdvancedFilters
}

const STORAGE_KEY = 'cw-os-job-grid-layout-v2'

export function emptyAdvancedFilters(lobKey = 'ALL'): JobAdvancedFilters {
  const o: JobAdvancedFilters = {}
  for (const f of searchableFieldsForLob(lobKey)) {
    o[f.id] = ''
  }
  return o
}

export function defaultLayoutState(lobKey = 'ALL'): JobGridLayoutState {
  return {
    visibleColumnIds: defaultVisibleColumnIds(),
    sorts: [],
    advanced: emptyAdvancedFilters(lobKey),
  }
}

export function loadLayoutState(lobKey: string): JobGridLayoutState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${lobKey}`)
    if (!raw) return defaultLayoutState(lobKey)
    const parsed = JSON.parse(raw) as Partial<JobGridLayoutState>
    const base = defaultLayoutState(lobKey)
    const allowed = new Set(columnableFields(lobKey).map((f) => f.id))
    return {
      visibleColumnIds:
        parsed.visibleColumnIds?.filter((id) => allowed.has(id)) ?? base.visibleColumnIds,
      sorts: [],
      advanced: { ...emptyAdvancedFilters(lobKey), ...(parsed.advanced ?? {}) },
    }
  } catch {
    return defaultLayoutState(lobKey)
  }
}

export function saveLayoutState(lobKey: string, state: JobGridLayoutState) {
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
  row: ShipmentRecord,
  field: string,
  source: NonNullable<JobGridField['valueSource']>,
): string {
  if (source === 'row') {
    const direct = (row as unknown as Record<string, unknown>)[field]
    return direct != null && String(direct).trim() !== '' ? String(direct) : ''
  }
  if (source === 'extras') {
    const extra = row.extras?.[field]
    return extra != null && String(extra).trim() !== '' ? String(extra) : ''
  }
  const au = row.auImport as unknown as Record<string, unknown> | undefined
  const v = au?.[field]
  return v != null && String(v).trim() !== '' ? String(v) : ''
}

/** Resolve display/search text for a catalog field on a job row. */
export function cellTextForField(row: ShipmentRecord, meta: JobGridField): string {
  const preferred = meta.valueSource
  const order: Array<'row' | 'extras' | 'auImport'> = preferred
    ? [preferred, 'row', 'extras', 'auImport'].filter(
        (s, i, a): s is 'row' | 'extras' | 'auImport' => a.indexOf(s) === i,
      )
    : ['row', 'extras', 'auImport']

  for (const source of order) {
    const text = readFromSource(row, meta.field, source)
    if (text) return text
  }
  const byId = row.extras?.[meta.id]
  if (byId != null && String(byId).trim() !== '') return String(byId)
  return ''
}

export function cellText(row: ShipmentRecord, fieldId: string): string {
  const meta = jobGridFieldById(fieldId)
  if (meta) return cellTextForField(row, meta)
  const direct = (row as unknown as Record<string, unknown>)[fieldId]
  if (direct != null && String(direct).trim() !== '') return String(direct)
  const extra = row.extras?.[fieldId]
  if (extra != null && String(extra).trim() !== '') return String(extra)
  return ''
}

export function applyJobGridQuery(
  rows: ShipmentRecord[],
  opts: {
    quick: string
    advanced: JobAdvancedFilters
  },
): ShipmentRecord[] {
  const q = opts.quick.trim().toLowerCase()
  return rows.filter((row) => {
    if (q) {
      const hay = [
        row.jobNo,
        row.customer,
        row.hawb,
        row.mawb,
        row.route,
        row.airline,
        row.notes,
        ...Object.values(row.extras ?? {}),
        row.auImport?.ownerAbn,
        row.auImport?.brokerRef,
        row.auImport?.ownerRef,
        row.auImport?.cargoDescription,
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    for (const [fieldId, value] of Object.entries(opts.advanced)) {
      const needle = value.trim().toLowerCase()
      if (!needle) continue
      const cell = cellText(row, fieldId).toLowerCase()
      if (!cell.includes(needle)) return false
    }
    return true
  })
}

export function activeAdvancedCount(advanced: JobAdvancedFilters): number {
  return Object.values(advanced).filter((v) => v.trim()).length
}

/** Keep TS happy — catalog still exported for older callers. */
void JOB_GRID_FIELDS
