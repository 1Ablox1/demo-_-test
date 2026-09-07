/**
 * Seat permissions — delegates to raciCompiler when lifecycle tasks are available,
 * with Hugh-aligned fallbacks for create flows without a loaded job.
 */
import type { ActingRole } from '@/api/types'
import type { MilestoneId } from '@/os/types'
import type { OsGate, OsTask } from '@/os/types'
import {
  canApproveLifecycleGate,
  canConvertQuoteFromLifecycle,
  canEditOperationalFromLifecycle,
  canEditQuoteFromLifecycle,
  canExecuteLifecycleTask,
  findLifecycleTask,
  MODULE1_LIFECYCLE_TASKS,
} from '@/lib/raciCompiler'

export type { MilestoneId }

// ── Fallbacks when no lifecycle context (desk / route guards) ───────────────

export function canCreateQuote(role: ActingRole): boolean {
  return role === 'sales' || role === 'operations'
}

export function canInitializeBooking(role: ActingRole): boolean {
  return role === 'operations'
}

export function canOpenCreateJobModal(role: ActingRole): boolean {
  return canCreateQuote(role) || canInitializeBooking(role)
}

export function isQuoteReadOnlySeat(role: ActingRole): boolean {
  return role === 'finance' || role === 'admin'
}

export function canApproveCharges(role: ActingRole): boolean {
  return role === 'finance' || role === 'admin'
}

export function canIssueInvoice(role: ActingRole): boolean {
  return role === 'finance' || role === 'admin'
}

export function isQuotePhase(milestoneId: MilestoneId): boolean {
  return milestoneId === 'quote'
}

export function isOperationalPhase(milestoneId: MilestoneId): boolean {
  return milestoneId !== 'quote'
}

// ── Lifecycle-compiled permissions (Hugh strategy) ───────────────────────

export interface LifecyclePermissionContext {
  milestoneId: MilestoneId
  tasks: OsTask[]
  gates?: OsGate[]
}

export function canEditQuoteForm(
  role: ActingRole,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (ctx) {
    return canEditQuoteFromLifecycle(role, ctx.milestoneId, ctx.tasks)
  }
  return canCreateQuote(role)
}

export function canConvertQuoteToBooking(
  role: ActingRole,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (ctx) {
    return canConvertQuoteFromLifecycle(role, ctx.tasks)
  }
  return role === 'operations'
}

export function canSendQuote(role: ActingRole, ctx?: LifecyclePermissionContext): boolean {
  return canEditQuoteForm(role, ctx)
}

export function canEditOperationalJob(
  role: ActingRole,
  _milestoneId: MilestoneId,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (ctx) {
    return canEditOperationalFromLifecycle(role, ctx.milestoneId, ctx.tasks)
  }
  return role === 'operations' || role === 'admin'
}

export function isSalesHandoffReadOnly(
  role: ActingRole,
  milestoneId: MilestoneId,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (role !== 'sales' || isQuotePhase(milestoneId)) return false
  if (ctx) {
    return !canEditOperationalFromLifecycle(role, milestoneId, ctx.tasks)
  }
  return isOperationalPhase(milestoneId)
}

export function canAccrueCharges(
  role: ActingRole,
  milestoneId: MilestoneId,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (!isOperationalPhase(milestoneId)) return false
  if (ctx) {
    const accrue = findLifecycleTask(ctx.tasks, MODULE1_LIFECYCLE_TASKS.accrue)
    if (accrue) return canExecuteLifecycleTask(role, accrue)
  }
  return role === 'operations' || role === 'admin'
}

export function canApproveChargesOnJob(
  role: ActingRole,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (ctx) {
    const approve = findLifecycleTask(ctx.tasks, MODULE1_LIFECYCLE_TASKS.approveCharges)
    if (approve) return canExecuteLifecycleTask(role, approve)
    const gate = ctx.gates?.find((g) => g.id.includes('charges'))
    if (gate) return canApproveLifecycleGate(role, gate)
  }
  return canApproveCharges(role)
}

export function isJobWorkspaceReadOnly(
  role: ActingRole,
  milestoneId: MilestoneId,
  ctx?: LifecyclePermissionContext,
): boolean {
  if (isQuotePhase(milestoneId)) return isQuoteReadOnlySeat(role)
  if (role === 'finance') return true
  if (isSalesHandoffReadOnly(role, milestoneId, ctx)) return true
  return false
}

export function readOnlySeatLabel(
  role: ActingRole,
  locale: 'en' | 'zh' = 'en',
  milestoneId: MilestoneId = 'quote',
  ctx?: LifecyclePermissionContext,
): string | null {
  if (isSalesHandoffReadOnly(role, milestoneId, ctx)) {
    return locale === 'zh'
      ? '销售 — 已交操作（RACI 咨询/知情）'
      : 'Sales — handed off (RACI Consulted/Informed)'
  }
  if (role === 'finance') {
    return locale === 'zh' ? '财务 — 只读' : 'Finance — read-only'
  }
  if (role === 'admin' && isQuotePhase(milestoneId)) {
    return locale === 'zh' ? '管理员 — 只读' : 'Admin — read-only'
  }
  return null
}

export type CreateFlowSeat = 'create_job' | 'create_quote' | 'initialize_booking'

export function seatAllowsCreateFlow(seat: CreateFlowSeat, role: ActingRole): boolean {
  switch (seat) {
    case 'create_quote':
      return canCreateQuote(role) || isQuoteReadOnlySeat(role)
    case 'create_job':
      return canOpenCreateJobModal(role)
    case 'initialize_booking':
      return canInitializeBooking(role)
    default:
      return true
  }
}
