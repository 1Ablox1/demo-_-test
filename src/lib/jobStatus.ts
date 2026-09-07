/**
 * Legacy job state (`jobState`) — aligned with CargoWare
 * `SystemConstants.JOB_STATES` / `JobStatus` English names.
 *
 * Codes (backend): Pending=-1, Operating=0, Committed=1, Verified=2,
 * Shut Out=3, Pre Commit=11, Reject=12, Committing=13.
 */
export type ShipmentStatus =
  | 'Pending'
  | 'Operating'
  | 'Pre Commit'
  | 'Committing'
  | 'Committed'
  | 'Verified'
  | 'Shut Out'
  | 'Reject'

export {
  JOB_STATUS,
  JOB_STATUS_LIST,
} from '@/data/legacySearchOptions'

/** New / unsaved jobs start as Operating (正操作) — same as legacy create. */
export const DEFAULT_JOB_STATUS: ShipmentStatus = 'Operating'

/** Advance along the legacy submit / audit path (mock). */
export function advanceJobStatus(current: ShipmentStatus): ShipmentStatus {
  switch (current) {
    case 'Pending':
    case 'Reject':
      return 'Operating'
    case 'Operating':
      return 'Pre Commit'
    case 'Pre Commit':
      return 'Committing'
    case 'Committing':
      return 'Committed'
    case 'Committed':
      return 'Verified'
    case 'Verified':
    case 'Shut Out':
      return current
    default:
      return 'Operating'
  }
}

export function isTerminalJobStatus(s: ShipmentStatus): boolean {
  return s === 'Verified' || s === 'Shut Out'
}

/** Gate / review style states operators treat as blocked. */
export function isBlockedJobStatus(s: ShipmentStatus): boolean {
  return s === 'Pending' || s === 'Reject' || s === 'Shut Out'
}
