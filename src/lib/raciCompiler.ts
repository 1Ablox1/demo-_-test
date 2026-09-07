/**
 * Hugh operating-model compiler (v8) — runtime permission surface for Module 1.
 *
 * Authoring model (compiler HTML):
 *   R  = Responsible — executes (My Tasks)
 *   A  = Approval authority — signs gate (Approvals)
 *   C  = Contributes — consulted (Watching); named action, not full execute
 *   I  = Informed — read-only (Watching)
 *
 * UI maps 18 compiler roles → 4 L0 seats (sales · operations · finance · admin).
 * Task/gate objects carry `roleMarks` per seat; this module compiles marks → capabilities.
 */
import type { ActingRole, RaciMark } from '@/api/types'
import type { MilestoneId } from '@/os/types'
import type { OsGate, OsTask } from '@/os/types'

/** Module 1 ↔ Hugh Universal quote process (compiler task IDs). */
export const COMPILER_TASK_MAP = {
  createQuote: '01-08', // Quotation issued / customer acceptance
  opsReadiness: '01-11', // Ops accepts operational readiness (convert handoff)
  convertBooking: 'ACT-04', // Convert quote → booking (RACI.md)
  captureAwb: '02-04', // Airline booking confirmation
  accrueCharges: '11-03', // Carrier invoice / cost accrual
} as const

export const MODULE1_LIFECYCLE_TASKS = {
  createQuote: 'task-8801-create-quote',
  convertBooking: 'task-8801-convert',
  clearance: 'task-4096-clear-clearance',
  accrue: 'task-4096-accrue',
  approveCharges: 'task-4096-approve-charges',
  issueInvoice: 'task-4096-issue',
} as const

export function markForSeat(
  roleMarks: Partial<Record<ActingRole, RaciMark>> | undefined,
  role: ActingRole,
): RaciMark {
  return roleMarks?.[role] ?? 'I'
}

export function deskQueueForMark(mark: RaciMark): 'myTasks' | 'myApprovals' | 'myWatch' {
  if (mark === 'R') return 'myTasks'
  if (mark === 'A') return 'myApprovals'
  return 'myWatch'
}

/** Hugh `executors(task)` — R (RA deferred until full matrix). */
export function canExecuteByMark(mark: RaciMark): boolean {
  return mark === 'R'
}

export function canApproveByMark(mark: RaciMark): boolean {
  return mark === 'A'
}

export function canContributeByMark(mark: RaciMark): boolean {
  return mark === 'C'
}

export function isInformedByMark(mark: RaciMark): boolean {
  return mark === 'I'
}

export function findLifecycleTask(
  tasks: OsTask[] | undefined,
  taskId: string,
): OsTask | undefined {
  return tasks?.find((t) => t.id === taskId)
}

export function canExecuteLifecycleTask(
  role: ActingRole,
  task: OsTask | null | undefined,
  opts?: { allowBlocked?: boolean },
): boolean {
  if (!task || task.status === 'done') return false
  if (task.status === 'blocked' && !opts?.allowBlocked) return false
  return canExecuteByMark(markForSeat(task.roleMarks, role))
}

export function canApproveLifecycleGate(
  role: ActingRole,
  gate: OsGate | null | undefined,
): boolean {
  if (!gate || gate.status !== 'open') return false
  return canApproveByMark(markForSeat(gate.roleMarks, role))
}

/**
 * Quote commercial form — Hugh ACT-02 / compiler 01-08.
 * Edit while quote milestone and seat is R on the open create-quote task.
 */
export function canEditQuoteFromLifecycle(
  role: ActingRole,
  milestoneId: MilestoneId,
  tasks: OsTask[],
): boolean {
  if (milestoneId !== 'quote') return false
  const createTask =
    findLifecycleTask(tasks, MODULE1_LIFECYCLE_TASKS.createQuote) ??
    tasks.find(
      (t) =>
        t.milestoneId === 'quote' &&
        t.status === 'open' &&
        (t.id.includes('create-quote') || t.primaryCta?.toLowerCase().includes('create quote')),
    )
  if (!createTask) {
    return role === 'sales' || role === 'operations'
  }
  return canExecuteLifecycleTask(role, createTask)
}

/**
 * Convert quote → booking — Hugh ACT-04 / compiler 01-11 (ops readiness).
 * Sales is C on convert task: may view, cannot execute convert.
 */
export function canConvertQuoteFromLifecycle(
  role: ActingRole,
  tasks: OsTask[],
): boolean {
  const convertTask = findLifecycleTask(tasks, MODULE1_LIFECYCLE_TASKS.convertBooking)
  if (convertTask) {
    return canExecuteLifecycleTask(role, convertTask)
  }
  return role === 'operations'
}

/** Post-handoff operational job — seat must be R on an open non-quote task. */
export function canEditOperationalFromLifecycle(
  role: ActingRole,
  milestoneId: MilestoneId,
  tasks: OsTask[],
): boolean {
  if (milestoneId === 'quote') return false
  if (role === 'admin') return true
  return tasks.some(
    (t) =>
      t.milestoneId !== 'quote' &&
      t.status === 'open' &&
      canExecuteByMark(markForSeat(t.roleMarks, role)),
  )
}

export function isSalesConsultedOnConvert(
  role: ActingRole,
  tasks: OsTask[],
): boolean {
  if (role !== 'sales') return false
  const convertTask = findLifecycleTask(tasks, MODULE1_LIFECYCLE_TASKS.convertBooking)
  if (!convertTask) return false
  return canContributeByMark(markForSeat(convertTask.roleMarks, role))
}

export function readOnlyReasonFromMark(
  mark: RaciMark,
  locale: 'en' | 'zh' = 'en',
): string {
  const en: Record<RaciMark, string> = {
    R: '',
    A: 'Approval seat — use Approvals queue',
    C: 'Consulted — view and advise; Operations executes',
    I: 'Informed — view only',
  }
  const zh: Record<RaciMark, string> = {
    R: '',
    A: '审批台席 — 请在本台席审批',
    C: '咨询方 — 可查看与建议；操作执行',
    I: '知情 — 仅可查看',
  }
  return (locale === 'zh' ? zh : en)[mark]
}
