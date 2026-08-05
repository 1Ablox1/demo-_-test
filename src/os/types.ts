/**
 * Hugh-aligned OS lifecycle: Milestone → Gate → Task
 * Full model for air Q2C vertical slice (not partial labels).
 */
import type { ActingRole, MarketPack, RaciMark, TaskPriority } from '@/api/types'

export type MilestoneId =
  | 'quote'
  | 'booking'
  | 'documents'
  | 'charges'
  | 'invoice'
  | 'history'

export type MilestoneStatus = 'locked' | 'pending' | 'current' | 'done'

export type GateStatus = 'open' | 'cleared'

export type OsTaskStatus = 'open' | 'done' | 'blocked'

export interface OsGate {
  id: string
  milestoneId: MilestoneId
  /** Hugh-style: when this gate matters */
  trigger: string
  /** Checklist / data required to clear */
  dataRequired: string[]
  /** What clearing produces */
  output: string
  status: GateStatus
  /** Hold family for UI language */
  holdType: 'customs' | 'docs' | 'invoice' | 'margin' | 'none'
  roleMarks: Record<ActingRole, RaciMark>
  title: string
}

export interface OsTask {
  id: string
  milestoneId: MilestoneId
  /** Optional gate this task clears or is blocked by */
  gateId?: string
  title: string
  /** Hugh TRIGGER — when task appears */
  trigger: string
  /** Hugh DATA — must be present to complete */
  dataRequired: string[]
  /** Hugh OUTPUT — definition of done */
  output: string
  status: OsTaskStatus
  priority: TaskPriority
  roleMarks: Record<ActingRole, RaciMark>
  responsible: string
  accountable?: string
  primaryCta: string
  approveCta?: string
  why: string
  cutoffLabel: string
}

export interface OsMilestone {
  id: MilestoneId
  label: string
  /** Order in spine */
  order: number
  /** Gates that must be cleared before this milestone can complete / next unlocks */
  gateIds: string[]
  taskIds: string[]
}

export interface JobLifecycle {
  shipmentId: number
  jobNo: string
  pack: MarketPack
  customer: string
  lane: string
  hawb: string | null
  mawb: string | null
  etdLabel: string
  /** Current milestone focus */
  currentMilestoneId: MilestoneId
  milestones: OsMilestone[]
  gates: OsGate[]
  tasks: OsTask[]
}

export interface MilestoneView {
  id: MilestoneId
  label: string
  status: MilestoneStatus
  openGateIds: string[]
  openTaskIds: string[]
}

export interface AllowedAction {
  id: string
  label: string
  enabled: boolean
  reason?: string
}
