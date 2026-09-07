import type { ActingRole, JobContext, RaciMark } from '@/api/types'
import { L2_SEAT_LABELS, SEED_PEOPLE } from '@/lib/seedPeople'
import type { JobLifecycle, MilestoneId, OsGate, OsTask } from '@/os/types'

export interface JobOwnershipPerson {
  name: string
  seat: string
}

export interface JobOwnershipNext {
  taskTitle: string
  name?: string
  seat: string
  mark: 'R' | 'A'
}

/** Hugh L2/L3 ownership strip — same model language as Needs You */
export interface JobOwnershipStrip {
  currentNode: string
  handledBy: JobOwnershipPerson
  /** A stamp required before proceed — null when no open approval gate */
  approve: JobOwnershipPerson | null
  /** Open gate / blocker label */
  waitingOn: string | null
  /** One-step next desk after current clears */
  thenNext: JobOwnershipNext | null
  lastAction: string | null
}

const NODE_LABELS: Record<MilestoneId, string> = {
  quote: 'Quote & Booking',
  booking: 'Booking & AWB',
  documents: 'Customs & Export Docs',
  charges: 'Charges Accrual',
  invoice: 'Invoice & Close',
  history: 'POD · History',
}

const SEAT_LABELS = L2_SEAT_LABELS

const MILESTONE_ORDER: MilestoneId[] = [
  'quote',
  'booking',
  'documents',
  'charges',
  'invoice',
  'history',
]

function roleWithMark(
  marks: Record<ActingRole, RaciMark> | undefined,
  mark: RaciMark,
): ActingRole | null {
  if (!marks) return null
  const hit = (Object.entries(marks) as [ActingRole, RaciMark][]).find(([, m]) => m === mark)
  return hit?.[0] ?? null
}

function seatFor(role: ActingRole | null, fallback = 'Desk'): string {
  if (!role) return fallback
  return SEAT_LABELS[role]
}

function primaryOpenTask(life: JobLifecycle): OsTask | null {
  const ordered = tasksInSpineOrder(life)
  const open = ordered.filter((t) => t.status === 'open')
  const withROnCurrent = open.find(
    (t) => t.milestoneId === life.currentMilestoneId && roleWithMark(t.roleMarks, 'R'),
  )
  if (withROnCurrent) return withROnCurrent
  const withR = open.find((t) => roleWithMark(t.roleMarks, 'R'))
  if (withR) return withR
  return (
    open.find((t) => t.milestoneId === life.currentMilestoneId) ?? open[0] ?? null
  )
}

function primaryOpenGate(life: JobLifecycle): OsGate | null {
  const current = life.gates.find(
    (g) => g.status === 'open' && g.milestoneId === life.currentMilestoneId,
  )
  if (current) return current
  return life.gates.find((g) => g.status === 'open') ?? null
}

function tasksInSpineOrder(life: JobLifecycle): OsTask[] {
  const byId = new Map(life.tasks.map((t) => [t.id, t]))
  const ordered: OsTask[] = []
  for (const msId of MILESTONE_ORDER) {
    const ms = life.milestones.find((m) => m.id === msId)
    if (!ms) continue
    for (const tid of ms.taskIds) {
      const t = byId.get(tid)
      if (t) ordered.push(t)
    }
  }
  // Any tasks not listed on milestones
  for (const t of life.tasks) {
    if (!ordered.includes(t)) ordered.push(t)
  }
  return ordered
}

/** Next worker after current open task — prefer next blocked/open in spine order */
function resolveThenNext(life: JobLifecycle, current: OsTask | null): JobOwnershipNext | null {
  const ordered = tasksInSpineOrder(life)
  const startIdx = current ? ordered.findIndex((t) => t.id === current.id) : -1
  const candidates = ordered.filter((t, i) => {
    if (t.status === 'done') return false
    if (current && t.id === current.id) return false
    if (startIdx >= 0 && i <= startIdx) return false
    return t.status === 'blocked' || t.status === 'open'
  })
  const next = candidates[0]
  if (!next) return null

  const rRole = roleWithMark(next.roleMarks, 'R')
  const aRole = roleWithMark(next.roleMarks, 'A')

  // Next desk is A-stamp when no R on that task
  if (!rRole && aRole) {
    return {
      taskTitle: next.title,
      name: next.accountable,
      seat: seatFor(aRole, 'Accountable'),
      mark: 'A',
    }
  }

  return {
    taskTitle: next.title,
    name: next.responsible,
    seat: seatFor(rRole, 'Operations'),
    mark: 'R',
  }
}

function resolveApprove(
  gate: OsGate | null,
  task: OsTask | null,
  job: JobContext | null,
): JobOwnershipPerson | null {
  if (!gate) return null
  const aRole = roleWithMark(gate.roleMarks, 'A') ?? roleWithMark(task?.roleMarks, 'A')
  const seed = aRole ? SEED_PEOPLE[aRole] : null
  const name =
    task?.accountable ??
    job?.raci.accountable ??
    seed?.name ??
    (aRole ? SEAT_LABELS[aRole] : null)
  if (!name && !aRole) return null
  return {
    name: name ?? seatFor(aRole, 'Finance'),
    seat: seatFor(aRole, 'Finance'),
  }
}

function resolveLastAction(job: JobContext | null): string | null {
  const done = job?.timeline?.filter((t) => t.state === 'done') ?? []
  const last = done[done.length - 1]
  if (!last) return null
  return `${last.label} · ${last.date}`
}

/**
 * Build Hugh ownership strip from lifecycle (+ optional job context for RACI / last action).
 */
export function buildJobOwnershipStrip(
  life: JobLifecycle | null,
  job: JobContext | null,
): JobOwnershipStrip {
  if (!life) {
    return {
      currentNode: '—',
      handledBy: {
        name: job?.raci.responsible ?? '—',
        seat: 'Operations',
      },
      approve: job?.raci.accountable
        ? { name: job.raci.accountable, seat: 'Finance' }
        : null,
      waitingOn: null,
      thenNext: null,
      lastAction: resolveLastAction(job),
    }
  }

  const task = primaryOpenTask(life)
  const gate = primaryOpenGate(life)
  const rRole = roleWithMark(task?.roleMarks, 'R')

  const handledBy: JobOwnershipPerson = {
    name: task?.responsible ?? job?.raci.responsible ?? '—',
    seat: seatFor(rRole, 'Operations'),
  }

  return {
    currentNode: NODE_LABELS[life.currentMilestoneId] ?? life.currentMilestoneId,
    handledBy,
    approve: resolveApprove(gate, task, job),
    waitingOn: gate
      ? gate.title.length > 42
        ? `${gate.title.slice(0, 40)}…`
        : gate.title
      : null,
    thenNext: resolveThenNext(life, task),
    lastAction: resolveLastAction(job),
  }
}
