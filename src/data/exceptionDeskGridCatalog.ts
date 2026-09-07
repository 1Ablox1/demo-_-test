/**
 * Column catalog for Dashboard block popup tables (Exception Desk).
 * Same GridField shape as Jobs so ListColumnPicker can be reused.
 */
import {
  gridFieldFactory,
  type GridField,
  type GridFieldGroupMeta,
} from '@/data/gridFieldTypes'
import type { WorkbenchJob } from '@/data/workbench'
import {
  defaultActionLabel,
  formatMoneyRisk,
  modeBadge,
  severityIndex,
  severityRailColor,
  slaCountdown,
} from '@/lib/exceptionDesk'
import { formatHouseBill, formatMasterBill, houseBillLabel, masterBillLabel } from '@/lib/shellJobIdentity'

export const EXCEPTION_DESK_GROUPS: GridFieldGroupMeta[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'ops', label: 'Exception & SLA' },
  { id: 'parties', label: 'Parties & lane' },
  { id: 'money', label: 'Money' },
  { id: 'org', label: 'Ownership' },
]

const f = gridFieldFactory

export const EXCEPTION_DESK_FIELDS: GridField[] = [
  f({
    id: 'mode',
    label: 'Mode',
    group: 'identity',
    field: 'lobPrefix',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    width: 88,
  }),
  f({
    id: 'severity',
    label: 'Severity',
    group: 'ops',
    field: 'priority',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    width: 100,
  }),
  f({
    id: 'job',
    label: 'Job ID & Bills',
    group: 'identity',
    field: 'jobNo',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    mono: true,
    width: 200,
  }),
  f({
    id: 'title',
    label: 'Exception',
    group: 'ops',
    field: 'title',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    width: 220,
  }),
  f({
    id: 'customer',
    label: 'Customer',
    group: 'parties',
    field: 'customer',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    width: 140,
  }),
  f({
    id: 'route',
    label: 'Lane',
    group: 'parties',
    field: 'route',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    mono: true,
    width: 120,
  }),
  f({
    id: 'sla',
    label: 'SLA',
    group: 'ops',
    field: 'due',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    width: 130,
  }),
  f({
    id: 'money',
    label: 'Money Risk',
    group: 'money',
    field: 'moneyRisk',
    columnable: true,
    sortable: true,
    defaultVisible: true,
    mono: true,
    width: 110,
  }),
  f({
    id: 'responsible',
    label: 'Responsible',
    group: 'org',
    field: 'responsible',
    columnable: true,
    sortable: true,
    defaultVisible: false,
    width: 120,
  }),
  f({
    id: 'accountable',
    label: 'Accountable',
    group: 'org',
    field: 'accountable',
    columnable: true,
    sortable: true,
    defaultVisible: false,
    width: 120,
  }),
  f({
    id: 'raci',
    label: 'RACI',
    group: 'org',
    field: 'raci',
    columnable: true,
    sortable: true,
    defaultVisible: false,
    width: 72,
  }),
  f({
    id: 'jobType',
    label: 'Job type',
    group: 'identity',
    field: 'jobType',
    columnable: true,
    sortable: true,
    defaultVisible: false,
    width: 120,
  }),
  f({
    id: 'why',
    label: 'Why',
    group: 'ops',
    field: 'why',
    columnable: true,
    sortable: false,
    defaultVisible: false,
    width: 180,
  }),
  f({
    id: 'action',
    label: 'Action',
    group: 'ops',
    field: 'actionLabel',
    columnable: true,
    sortable: false,
    defaultVisible: true,
    width: 128,
  }),
]

export function exceptionDeskFieldById(id: string): GridField | undefined {
  return EXCEPTION_DESK_FIELDS.find((x) => x.id === id)
}

export function exceptionDeskColumnableFields(): GridField[] {
  return EXCEPTION_DESK_FIELDS.filter((x) => x.columnable)
}

export function defaultExceptionDeskColumnIds(): string[] {
  return EXCEPTION_DESK_FIELDS.filter((x) => x.defaultVisible && x.columnable).map((x) => x.id)
}

const LAYOUT_KEY = 'os-exception-desk-columns-v1'

export function loadExceptionDeskColumns(): string[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return defaultExceptionDeskColumnIds()
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed) || !parsed.length) return defaultExceptionDeskColumnIds()
    const known = new Set(EXCEPTION_DESK_FIELDS.map((f) => f.id))
    const ids = parsed.filter((id) => known.has(id))
    return ids.length ? ids : defaultExceptionDeskColumnIds()
  } catch {
    return defaultExceptionDeskColumnIds()
  }
}

export function saveExceptionDeskColumns(ids: string[]) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(ids))
}

export function billsLine(job: WorkbenchJob): string {
  const master = formatMasterBill(job.masterBill)
  const house = formatHouseBill(job.houseBill)
  const mLabel = masterBillLabel(job.lobPrefix)
  const hLabel = houseBillLabel(job.lobPrefix)
  if (house === 'DIRECT / NONE') return `${mLabel} ${master}`
  return `${mLabel} ${master} · ${hLabel} ${house}`
}

/** Plain-text cell value for sort / filter. */
export function exceptionCellText(job: WorkbenchJob, fieldId: string): string {
  switch (fieldId) {
    case 'mode':
      return modeBadge(job.lobPrefix).label
    case 'severity':
      return job.priority
    case 'job':
      return job.jobNo
    case 'title':
      return job.title
    case 'customer':
      return job.customer
    case 'route':
      return job.route
    case 'sla':
      return slaCountdown(job.due, job.priority)
    case 'money':
      return formatMoneyRisk(job.moneyRisk) || '0'
    case 'responsible':
      return job.responsible
    case 'accountable':
      return job.accountable
    case 'raci':
      return job.raci
    case 'jobType':
      return job.jobType
    case 'why':
      return job.why
    case 'action':
      return job.actionLabel ?? defaultActionLabel(job)
    default:
      return ''
  }
}

export function exceptionSortValue(job: WorkbenchJob, fieldId: string): string | number {
  if (fieldId === 'severity') return severityIndex(job.priority)
  if (fieldId === 'money') return job.moneyRisk ?? 0
  if (fieldId === 'sla') {
    if (job.due === '4h') return 0
    if (job.due === 'Today') return 1
    if (job.due === 'Tomorrow') return 2
    return 3
  }
  return exceptionCellText(job, fieldId)
}

export { severityRailColor, modeBadge, formatMoneyRisk, defaultActionLabel, slaCountdown }
