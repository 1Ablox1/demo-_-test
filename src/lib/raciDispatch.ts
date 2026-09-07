import baselineRaciCatalog, { type NormalizedRaciTask } from '@/lib/raciCatalog'
import type { RaciMark, TaskHandoff, UserAccount } from '@/types/raci'

type ResolveSeat = (roleName: string, taskId?: string) => string
type GetUsersForRole = (roleName: string) => UserAccount[]

/** Demo mapping: shell job id → Hugh catalog task id */
export const JOB_ACTIVE_TASK_MAP: Record<string, string> = {
  '8801': '02-08', // Export customs / AES
  '8804': '02-04', // Airline booking
  '8790': '03-08', // Import clearance holds
  '8772': '11-04', // Margin check before invoice
}

export function getNextCatalogTask(taskId: string): NormalizedRaciTask | null {
  const task = baselineRaciCatalog.getTask(taskId)
  if (!task) return null

  const inProcess = baselineRaciCatalog
    .tasksOf(task.process)
    .sort((a, b) => a.seq - b.seq)
  const idx = inProcess.findIndex((t) => t.id === taskId)
  if (idx >= 0 && idx < inProcess.length - 1) return inProcess[idx + 1] ?? null

  const procIdx = baselineRaciCatalog.processes.indexOf(task.process)
  if (procIdx >= 0 && procIdx < baselineRaciCatalog.processes.length - 1) {
    const nextProc = baselineRaciCatalog.processes[procIdx + 1]
    const first = baselineRaciCatalog.tasksOf(nextProc).sort((a, b) => a.seq - b.seq)[0]
    return first ?? null
  }
  return null
}

function findRoleWithMark(
  task: NormalizedRaciTask,
  marks: RaciMark[],
): string | null {
  for (const [role, roleMarks] of Object.entries(task.assignments)) {
    if (roleMarks.some((m) => marks.includes(m))) return role
  }
  return null
}

function formatUserList(users: UserAccount[]): string {
  const live = users.filter((u) => u.status !== 'SUSPENDED')
  if (!live.length) return 'Unassigned'
  return live.map((u) => u.name.split(' ')[0]).join(', ')
}

export function computeTaskHandoff(
  currentTaskId: string,
  resolveSeat: ResolveSeat,
  getUsersForRole: GetUsersForRole,
): TaskHandoff {
  const current = baselineRaciCatalog.getTask(currentTaskId)
  const next = getNextCatalogTask(currentTaskId)

  if (!current) {
    return {
      currentTaskId,
      currentTaskTitle: 'Unknown task',
      nextTaskId: null,
      nextTaskTitle: null,
      accountableRole: null,
      accountableSeat: null,
      accountableUsers: [],
      responsibleRole: null,
      responsibleSeat: null,
      responsibleUsers: [],
      label: '—',
    }
  }

  const accountableRole = next ? findRoleWithMark(next, ['A']) : null
  const responsibleRole = next ? findRoleWithMark(next, ['R']) : accountableRole

  const accountableSeat = accountableRole
    ? resolveSeat(accountableRole, next?.id)
    : null
  const responsibleSeat = responsibleRole
    ? resolveSeat(responsibleRole, next?.id)
    : null

  const accountableUsers = (accountableRole ? getUsersForRole(accountableRole) : []).filter(
    (u) => u.status !== 'SUSPENDED',
  )
  const responsibleUsers = (responsibleRole ? getUsersForRole(responsibleRole) : []).filter(
    (u) => u.status !== 'SUSPENDED',
  )

  let label = 'File complete'
  if (next) {
    const targetRole = responsibleRole ?? accountableRole ?? 'Next desk'
    const targetUsers = responsibleUsers.length ? responsibleUsers : accountableUsers
    label = `${next.title} → ${targetRole} (${formatUserList(targetUsers)})`
  }

  return {
    currentTaskId: current.id,
    currentTaskTitle: current.title,
    nextTaskId: next?.id ?? null,
    nextTaskTitle: next?.title ?? null,
    accountableRole,
    accountableSeat,
    accountableUsers,
    responsibleRole,
    responsibleSeat,
    responsibleUsers,
    label,
  }
}

export function getPrimaryOwnerForTask(
  taskId: string,
  resolveSeat: ResolveSeat,
  getUsersForRole: GetUsersForRole,
): string {
  const task = baselineRaciCatalog.getTask(taskId)
  if (!task) return 'Unassigned'

  const rRole = findRoleWithMark(task, ['R'])
  const aRole = findRoleWithMark(task, ['A'])
  const role = rRole ?? aRole
  if (!role) return 'Unassigned'

  const users = getUsersForRole(role).filter((u) => u.status !== 'SUSPENDED')
  const seat = resolveSeat(role, taskId)
  if (users.length) return `${seat} — ${users.map((u) => u.name).join(', ')}`
  return `${seat} — Unassigned`
}
