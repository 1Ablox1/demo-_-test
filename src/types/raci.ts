export type RaciMark = 'R' | 'A' | 'C' | 'I'
export type CompanyTier = 'SMALL_1_10' | 'MID_11_50' | 'ENTERPRISE_50_PLUS'

export type UserStatus = 'ACTIVE' | 'DRAFT_PENDING' | 'SUSPENDED'

/** RACI runtime user — identity synced from userAdmin store. */
export interface RaciUser {
  id: string
  name: string
  email: string
  status: UserStatus
  avatarUrl?: string
}

/** @deprecated use RaciUser */
export type UserAccount = RaciUser

export interface TaskHandoff {
  currentTaskId: string
  currentTaskTitle: string
  nextTaskId: string | null
  nextTaskTitle: string | null
  accountableRole: string | null
  accountableSeat: string | null
  accountableUsers: UserAccount[]
  responsibleRole: string | null
  responsibleSeat: string | null
  responsibleUsers: UserAccount[]
  label: string
}

export interface RoleMappingRow {
  role: string
  seat: string
  users: UserAccount[]
  userCount: number
}
