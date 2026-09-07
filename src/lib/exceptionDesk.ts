/**
 * Exception desk helpers — severity sort, mode badges, tile filters.
 */
import type { Priority } from '@/lib/designTokens'
import { deskCtaLabel } from '@/lib/actionLabels'
import type { WorkbenchJob } from '@/data/workbench'
import type { SpineLobPrefix } from '@/types/spineLob'

/** KPI filter chips on the command-center board. */
export type ExceptionFilterId =
  | 'critical-holds'
  | 'warnings-sla'
  | 'air'
  | 'ocean-land'
  | 'uninvoiced'

export const EXCEPTION_FILTERS: {
  id: ExceptionFilterId
  label: string
  accent: 'critical' | 'warn' | 'air' | 'ocean' | 'money'
  hint: string
}[] = [
  { id: 'critical-holds', label: 'Critical Holds', accent: 'critical', hint: 'Gate / critical exceptions' },
  { id: 'warnings-sla', label: 'Warnings / SLA', accent: 'warn', hint: 'High & Medium with tight SLA' },
  { id: 'air', label: 'Air Import / Export', accent: 'air', hint: 'AI · AE only' },
  { id: 'ocean-land', label: 'Ocean / Land', accent: 'ocean', hint: 'OI · OE · TR' },
  { id: 'uninvoiced', label: 'Uninvoiced Charges', accent: 'money', hint: 'Money risk > 0' },
]

/** Critical=0 … Normal/Low=3 — sort ascending = High→Low importance. */
export function severityIndex(priority: Priority): number {
  switch (priority) {
    case 'Critical':
      return 0
    case 'High':
      return 1
    case 'Medium':
      return 2
    case 'Normal':
    default:
      return 3
  }
}

/** Spec rail colors: Critical red, High amber, Normal blue. */
export function severityRailColor(priority: Priority): string {
  if (priority === 'Critical') return '#EF4444'
  if (priority === 'High') return '#F59E0B'
  return '#3B82F6'
}

export function modeBadge(lob: SpineLobPrefix): { icon: string; tag: string; label: string } {
  switch (lob) {
    case 'AI':
      return { icon: '✈️', tag: 'AI', label: '✈️ AI' }
    case 'AE':
      return { icon: '✈️', tag: 'AE', label: '✈️ AE' }
    case 'OI':
      return { icon: '🚢', tag: 'OI', label: '🚢 OI' }
    case 'OE':
      return { icon: '🚢', tag: 'OE', label: '🚢 OE' }
    case 'TR':
      return { icon: '🚛', tag: 'RD', label: '🚛 RD' }
    default:
      return { icon: '📦', tag: lob, label: lob }
  }
}

/** SLA urgency weight — lower = more urgent (sort after severity). */
export function slaUrgency(due: string): number {
  if (due === '4h' || due.includes('h')) return 0
  if (due === 'Today') return 1
  if (due === 'Tomorrow') return 2
  return 3
}

export function sortExceptionsByImportance(jobs: WorkbenchJob[]): WorkbenchJob[] {
  return [...jobs].sort((a, b) => {
    const s = severityIndex(a.priority) - severityIndex(b.priority)
    if (s !== 0) return s
    const u = slaUrgency(a.due) - slaUrgency(b.due)
    if (u !== 0) return u
    return a.jobNo.localeCompare(b.jobNo)
  })
}

export function matchesExceptionFilter(job: WorkbenchJob, filter: ExceptionFilterId | null): boolean {
  if (!filter) return true
  switch (filter) {
    case 'critical-holds':
      return job.priority === 'Critical' || (job.hasGate && job.priority === 'High')
    case 'warnings-sla':
      return (
        (job.priority === 'High' || job.priority === 'Medium') &&
        (job.due === '4h' || job.due === 'Today' || job.due === 'Tomorrow')
      )
    case 'air':
      return job.lobPrefix === 'AI' || job.lobPrefix === 'AE'
    case 'ocean-land':
      return job.lobPrefix === 'OI' || job.lobPrefix === 'OE' || job.lobPrefix === 'TR'
    case 'uninvoiced':
      return (job.moneyRisk ?? 0) > 0
    default:
      return true
  }
}

export function countForFilter(jobs: WorkbenchJob[], filter: ExceptionFilterId): number {
  return jobs.filter((j) => matchesExceptionFilter(j, filter)).length
}

export function sumUninvoiced(jobs: WorkbenchJob[]): number {
  return jobs.reduce((n, j) => n + (j.moneyRisk ?? 0), 0)
}

/** SLA display string for exception desk rows. */
export function slaCountdown(due: string, priority: Priority): string {
  if (due === '4h') return '⚠️ 4h left'
  if (due === 'Today') return priority === 'Critical' ? '⚠️ 2h 15m left' : '⚠️ Today'
  if (due === 'Tomorrow') return '⏱ Tomorrow'
  return `⏱ ${due}`
}

export function defaultActionLabel(job: WorkbenchJob): string {
  return deskCtaLabel(job)
}

export function formatMoneyRisk(amount: number | undefined): string {
  if (amount == null || amount <= 0) return ''
  return `$${amount.toLocaleString('en-US')}`
}
