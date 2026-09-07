import { FAKE_TASKS, type DeskTask, type Seat, type TaskTab } from '@/data/fixtures'
import type { WorkbenchJob } from '@/data/workbench'
import { LOB_CATALOG, type LobCode } from '@/lib/lob'
import type { Priority } from '@/lib/designTokens'
import type { SpineLobPrefix } from '@/types/spineLob'

/** Alert types shown on the dashboard. */
export type ExceptionSignal =
  | 'burn_down'
  | 'time_up'
  | 'early_warning'
  | 'discrepancy'
  | 'abnormal_pattern'

export const EXCEPTION_SIGNAL_META: Record<
  ExceptionSignal,
  { label: string; hint: string; tone: 'critical' | 'warn' | 'info' }
> = {
  burn_down: {
    label: 'Almost late',
    hint: 'Time is running out — please act soon',
    tone: 'critical',
  },
  time_up: {
    label: 'Late',
    hint: 'Past the due time',
    tone: 'critical',
  },
  early_warning: {
    label: 'Watch soon',
    hint: 'May need attention within a day',
    tone: 'warn',
  },
  discrepancy: {
    label: 'Mismatch',
    hint: 'Numbers or docs do not match',
    tone: 'warn',
  },
  abnormal_pattern: {
    label: 'Unusual',
    hint: 'Looks different from the usual pattern',
    tone: 'info',
  },
}

export const GLOBAL_MILESTONES = ['Quote', 'Booking', 'Docs', 'Charges', 'Invoice'] as const
export type GlobalMilestone = (typeof GLOBAL_MILESTONES)[number]

export interface TaskWithSignal extends DeskTask {
  signal: ExceptionSignal
  slaHoursLeft: number
  route: string
  secondary: { label: string; value: string }[]
}

const JOB_ROUTES: Record<string, string> = {
  '8801': 'SYD → LAX',
  '8804': 'MEL → LAX',
  '8790': 'PVG → SYD',
  '8772': 'BNE → LAX',
}

function routeForJobNo(jobNo: string): string {
  const id = jobNo.match(/(\d{4})$/)?.[1] ?? ''
  return JOB_ROUTES[id] ?? '— → —'
}

/** Add alert labels to desk tasks for dashboard tiles. */
export function enrichTasks(tasks: DeskTask[]): TaskWithSignal[] {
  const signalById: Record<string, ExceptionSignal> = {
    t1: 'discrepancy',
    t2: 'early_warning',
    t3: 'burn_down',
    t4: 'abnormal_pattern',
    t5: 'time_up',
    t6: 'early_warning',
    t7: 'burn_down',
  }
  const slaById: Record<string, number> = {
    t1: 6,
    t2: 18,
    t3: 2,
    t4: 4,
    t5: 0,
    t6: 36,
    t7: 5,
  }
  return tasks.map((t) => {
    const route = routeForJobNo(t.jobNo)
    return {
      ...t,
      signal: signalById[t.id] ?? 'early_warning',
      slaHoursLeft: slaById[t.id] ?? 12,
      route,
      secondary: [
        { label: 'Owner', value: t.handledBy },
        {
          label: 'Queue',
          value: t.tab === 'todo' ? 'My tasks' : t.tab === 'approvals' ? 'To approve' : 'Watching',
        },
        { label: 'Route', value: route },
        { label: 'Mode', value: LOB_CATALOG[t.lob].label },
        { label: 'Customer ref', value: `${t.customer.slice(0, 3).toUpperCase()}-${t.id}` },
      ],
    }
  })
}

export type DashboardTileKind =
  | 'bi-milestones'
  | 'bi-uninvoiced'
  | 'bi-pending-quotes'
  | 'bi-legacy-embed'
  | 'workload'
  | 'exceptions'
  | 'milestone-quote'
  | 'milestone-booking'
  | 'milestone-docs'
  | 'milestone-charges'
  | 'milestone-invoice'
  | 'queue-todo'
  | 'queue-approvals'
  | 'queue-following'
  | 'handoff'

/** Map fixture LOB → Spine prefix used by mode badges. */
export function spinePrefixFromLob(lob: LobCode): SpineLobPrefix {
  switch (lob) {
    case 'air_import':
      return 'AI'
    case 'air_export':
      return 'AE'
    case 'sea_import':
      return 'OI'
    case 'sea_export':
      return 'OE'
    case 'road_export':
    case 'road_import':
      return 'TR'
    default:
      return 'AE'
  }
}

function priorityFromUrgency(u: DeskTask['urgency']): Priority {
  if (u === 'high') return 'High'
  if (u === 'medium') return 'Medium'
  return 'Normal'
}

function dueFromSla(hours: number): string {
  if (hours <= 0) return '4h'
  if (hours <= 4) return '4h'
  if (hours <= 12) return 'Today'
  if (hours <= 36) return 'Tomorrow'
  return 'This week'
}

/** Convert tile task rows into Exception Desk jobs (Mode + Severity). */
export function workbenchJobsForTile(seat: Seat, tileId: DashboardTileKind): WorkbenchJob[] {
  return tasksForTile(seat, tileId).map((t) => ({
    id: `tile-${tileId}-${t.id}`,
    jobId: t.jobNo.replace(/^[A-Z]+-?/i, '') || t.id,
    lobPrefix: spinePrefixFromLob(t.lob),
    jobNo: t.jobNo,
    masterBill: null,
    houseBill: null,
    priority: priorityFromUrgency(t.urgency),
    raci: t.tab === 'approvals' ? 'A' : t.tab === 'todo' ? 'R' : 'C',
    hasGate: t.signal === 'burn_down' || t.signal === 'time_up',
    title: t.title,
    route: t.route,
    jobType: LOB_CATALOG[t.lob].label,
    pack: 'AU',
    responsible: t.handledBy,
    accountable: t.handledBy,
    due: dueFromSla(t.slaHoursLeft),
    why: EXCEPTION_SIGNAL_META[t.signal].hint,
    tab: t.tab === 'approvals' ? 'approvals' : t.tab === 'following' ? 'watching' : 'tasks',
    customer: t.customer,
    moneyRisk: t.milestone === 'Charges' || t.milestone === 'Invoice' ? 1200 : 0,
  }))
}

export function tasksForTile(seat: Seat, tileId: DashboardTileKind): TaskWithSignal[] {
  if (tileId === 'bi-legacy-embed') return []
  if (tileId === 'queue-todo') return tasksForSeat(seat, 'todo')
  if (tileId === 'queue-approvals') return tasksForSeat(seat, 'approvals')
  if (tileId === 'queue-following') return tasksForSeat(seat, 'following')
  if (tileId.startsWith('milestone-')) {
    const ms = tileId.replace('milestone-', '')
    const label = ms.charAt(0).toUpperCase() + ms.slice(1)
    return tasksForSeat(seat).filter((t) => t.milestone.toLowerCase() === label.toLowerCase())
  }
  if (tileId === 'bi-milestones') return tasksForSeat(seat)
  if (tileId === 'bi-uninvoiced' || tileId === 'milestone-charges') {
    return tasksForSeat(seat).filter((t) => t.milestone === 'Charges' || t.milestone === 'Invoice')
  }
  if (tileId === 'bi-pending-quotes') {
    return tasksForSeat(seat).filter((t) => t.milestone === 'Quote')
  }
  if (tileId === 'exceptions') {
    return tasksForSeat(seat).filter(
      (t) => t.signal === 'burn_down' || t.signal === 'time_up' || t.urgency === 'high',
    )
  }
  if (tileId === 'handoff') {
    return tasksForSeat(seat).filter((t) => t.tab === 'todo' || t.tab === 'approvals')
  }
  return tasksForSeat(seat)
}

export function insightBlurb(tileId: DashboardTileKind, count: number): string {
  if (tileId === 'workload') return `${count} open items across your queues — pick a job to act.`
  if (tileId === 'exceptions') return `${count} jobs flashing risk — triage the hottest first.`
  if (tileId === 'bi-milestones') return `${count} jobs across cargo milestones.`
  if (tileId === 'bi-uninvoiced') return `${count} jobs with money waiting to invoice.`
  if (tileId === 'bi-pending-quotes') return `${count} commercial offers still open.`
  if (tileId.startsWith('milestone-')) return `${count} jobs sitting on this milestone gate.`
  if (tileId.startsWith('queue-')) return `${count} jobs in this queue for your seat.`
  if (tileId === 'handoff') return `${count} jobs waiting on the next desk handoff.`
  return `${count} related jobs.`
}

export function tasksForSeat(seat: Seat, tab?: TaskTab): TaskWithSignal[] {
  const base = FAKE_TASKS.filter((t) => seat === 'admin' || t.seat === seat)
  const filtered = tab ? base.filter((t) => t.tab === tab) : base
  return enrichTasks(filtered)
}

export function milestoneCounts(seat: Seat): Record<GlobalMilestone, number> {
  const tasks = tasksForSeat(seat)
  const counts = Object.fromEntries(GLOBAL_MILESTONES.map((m) => [m, 0])) as Record<
    GlobalMilestone,
    number
  >
  for (const t of tasks) {
    const key = t.milestone as GlobalMilestone
    if (key in counts) counts[key] += 1
  }
  return counts
}

export function signalCounts(seat: Seat): Record<ExceptionSignal, number> {
  const tasks = tasksForSeat(seat)
  return tasks.reduce(
    (acc, t) => {
      acc[t.signal] += 1
      return acc
    },
    {
      burn_down: 0,
      time_up: 0,
      early_warning: 0,
      discrepancy: 0,
      abnormal_pattern: 0,
    } as Record<ExceptionSignal, number>,
  )
}

export function workloadSummary(seat: Seat) {
  const todo = tasksForSeat(seat, 'todo').length
  const approvals = tasksForSeat(seat, 'approvals').length
  const following = tasksForSeat(seat, 'following').length
  const high = tasksForSeat(seat).filter((t) => t.urgency === 'high').length
  return { todo, approvals, following, high, total: todo + approvals + following }
}
