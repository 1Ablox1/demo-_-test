import type { RaciMark } from '@/types/raci'

/** Echo-aligned action tokens — gated by seat ∩ RACI ∩ job state. */
export type ActionToken =
  | 'create_quote'
  | 'save_draft'
  | 'convert'
  | 'fulfil'
  | 'stamp'
  | 'accrue'
  | 'approve'
  | 'issue_invoice'
  | 'open_job'

/** @deprecated Use ActionToken — kept for gradual migration. */
export type AllowedAction = ActionToken

export interface UserTaskRoleContext {
  role: string
  marks: RaciMark[]
  seat: string
}

export interface AllowedActionsResult {
  allowed: ActionToken[]
  /** Primary RACI mark driving the action panel badge. */
  primaryMark: RaciMark | null
  denyReasons: Partial<Record<ActionToken, string>>
}
