import type { Seat } from '@/stores/auth'
import type { ActionToken, AllowedActionsResult, UserTaskRoleContext } from '@/types/governance'
import type { RaciMark } from '@/types/raci'

/** Dispatch seats reachable per logged-in OS seat (trial scope). */
export const SEAT_DISPATCH_ACCESS: Record<Seat, string[]> = {
  sales: ['SALES'],
  operations: ['OPERATIONS', 'CS_DESK', 'CUSTOMS_DESK'],
  finance: ['FINANCE'],
  admin: ['ADMIN', 'OPERATIONS', 'SALES', 'FINANCE', 'CS_DESK', 'CUSTOMS_DESK'],
}

export interface AllowedActionsInput {
  authSeat: Seat
  roleContexts: UserTaskRoleContext[]
  activeGateHold: string | null
  moneyBlocked: boolean
  moneyState: 'draft' | 'accrued' | 'approved'
  taskCompleted?: boolean
}

function seatMatchesAuth(authSeat: Seat, dispatchSeat: string): boolean {
  return SEAT_DISPATCH_ACCESS[authSeat].includes(dispatchSeat)
}

function accessibleContexts(
  authSeat: Seat,
  roleContexts: UserTaskRoleContext[],
): UserTaskRoleContext[] {
  return roleContexts.filter((rc) => seatMatchesAuth(authSeat, rc.seat))
}

function unionMarks(contexts: UserTaskRoleContext[]): Set<RaciMark> {
  const marks = new Set<RaciMark>()
  for (const ctx of contexts) {
    for (const m of ctx.marks) marks.add(m)
  }
  return marks
}

function primaryMark(marks: Set<RaciMark>): RaciMark | null {
  if (marks.has('R')) return 'R'
  if (marks.has('A')) return 'A'
  if (marks.has('C')) return 'C'
  if (marks.has('I')) return 'I'
  return null
}

/**
 * allowed = seat ∩ RACI ∩ jobState (per RACI-MATRIX-COMPLETE-GUIDE §11)
 * Tokens align with Echo Module 1 minimal button map.
 */
export function computeAllowedActions(input: AllowedActionsInput): AllowedActionsResult {
  const {
    authSeat,
    roleContexts,
    activeGateHold,
    moneyBlocked,
    moneyState,
    taskCompleted = false,
  } = input

  const accessible = accessibleContexts(authSeat, roleContexts)
  const marks = unionMarks(accessible)
  const allowed: ActionToken[] = []
  const denyReasons: Partial<Record<ActionToken, string>> = {}

  // Ops (R): complete checklist item
  if (marks.has('R') && !taskCompleted) {
    if (moneyBlocked) {
      denyReasons.fulfil = 'A hold is open — release clearance before you complete this task'
    } else {
      allowed.push('fulfil')
    }
  } else if (!marks.has('R')) {
    denyReasons.fulfil = 'This task is not yours to do'
  }

  // Finance (A): release clearance on active gate
  if (marks.has('A') && activeGateHold) {
    allowed.push('stamp')
  } else if (activeGateHold && !marks.has('A')) {
    denyReasons.stamp = 'Only the approver can release this clearance'
  }

  // Sales / Ops: save draft (secondary — always available when seat can edit)
  if (authSeat === 'sales' || authSeat === 'operations' || authSeat === 'admin') {
    allowed.push('save_draft')
  }

  // Ops: accrue charges when money unlocked
  if (authSeat === 'operations' || authSeat === 'admin') {
    if (!moneyBlocked && moneyState === 'draft') {
      allowed.push('accrue')
    } else if (moneyBlocked) {
      denyReasons.accrue = 'Money is locked while a hold is open'
    }
  }

  // Finance: approve + issue invoice
  if (authSeat === 'finance' || authSeat === 'admin') {
    if (!moneyBlocked && (moneyState === 'accrued' || moneyState === 'draft')) {
      allowed.push('approve')
    } else if (moneyBlocked) {
      denyReasons.approve = 'Money is locked while a hold is open'
    }
    if (!moneyBlocked && moneyState === 'approved') {
      allowed.push('issue_invoice')
    }
  }

  // Navigation — always readable
  allowed.push('open_job')

  return {
    allowed,
    primaryMark: primaryMark(marks),
    denyReasons,
  }
}

export function isActionAllowed(result: AllowedActionsResult, action: ActionToken | string): boolean {
  const normalized =
    action in result.allowed
      ? (action as ActionToken)
      : (['fulfil', 'stamp', 'accrue', 'approve'].find(
          (t) =>
            (action === 'complete_task' && t === 'fulfil') ||
            (action === 'clear_gate' && t === 'stamp') ||
            (action === 'accrue_charges' && t === 'accrue') ||
            (action === 'approve_charges' && t === 'approve'),
        ) as ActionToken | undefined)

  if (!normalized) return result.allowed.includes(action as ActionToken)
  return result.allowed.includes(normalized)
}
