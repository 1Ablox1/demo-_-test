import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SEED_PEOPLE } from '@/lib/seedPeople'
import { useRaciConfigStore } from '@/stores/raciConfig'

export type AuthProvider = 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'LOCAL_LEGACY'
export type UserStatus = 'ACTIVE' | 'DRAFT_PENDING' | 'SUSPENDED'

/** Shared admin copy — keep identical to Seats & RACI panel headers. */
export const ADMIN_ROLE_COLUMN = 'Functional role (L0)'
export const ADMIN_SEAT_COLUMN = 'Dispatch seat (L2)'

export interface UserAccountProfile {
  id: string
  name: string
  email: string
  provider: AuthProvider
  status: UserStatus
  defaultOfficeId: string
  legacyUserId?: string
  createdAt: string
}

export const PROVIDER_LABELS: Record<AuthProvider, string> = {
  MICROSOFT_365: 'Microsoft 365 / Entra ID',
  GOOGLE_WORKSPACE: 'Google Workspace',
  LOCAL_LEGACY: 'Local (legacy)',
}

/** Tenant offices — same SYD / MEL / LAX posture as Tenant panel. */
export const OFFICE_OPTIONS = [
  { id: 'SYD', label: 'SYD — Sydney HQ' },
  { id: 'MEL', label: 'MEL — Melbourne' },
  { id: 'LAX', label: 'LAX — Los Angeles' },
] as const

const SEED_PROFILES: UserAccountProfile[] = [
  {
    id: SEED_PEOPLE.operations.id,
    name: SEED_PEOPLE.operations.name,
    email: 's.jenkins@waltech.example',
    provider: 'MICROSOFT_365',
    status: 'ACTIVE',
    defaultOfficeId: 'SYD',
    legacyUserId: '8821',
    createdAt: '2026-01-15',
  },
  {
    id: SEED_PEOPLE.sales.id,
    name: SEED_PEOPLE.sales.name,
    email: 'a.rivera@waltech.example',
    provider: 'MICROSOFT_365',
    status: 'ACTIVE',
    defaultOfficeId: 'SYD',
    legacyUserId: '8822',
    createdAt: '2026-02-01',
  },
  {
    id: SEED_PEOPLE.finance.id,
    name: SEED_PEOPLE.finance.name,
    email: 'm.vance@waltech.example',
    provider: 'MICROSOFT_365',
    status: 'ACTIVE',
    defaultOfficeId: 'SYD',
    legacyUserId: '8823',
    createdAt: '2026-02-10',
  },
]

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

/**
 * Users & Accounts — identity provisioning only.
 * L0 roles live exclusively on Seats & RACI (`raciConfig`).
 * @see docs/OS-SHELL-USER-ROLES-GUIDE.md
 */
export const useUserAdminStore = defineStore('userAdmin', () => {
  const users = ref<UserAccountProfile[]>(SEED_PROFILES.map((u) => ({ ...u })))

  const activeCount = computed(() => users.value.filter((u) => u.status === 'ACTIVE').length)
  const pendingCount = computed(() => users.value.filter((u) => u.status === 'DRAFT_PENDING').length)
  const ssoLinkedCount = computed(
    () => users.value.filter((u) => u.provider !== 'LOCAL_LEGACY').length,
  )

  /** Identity-only invite — role assignment happens exclusively on Seats & RACI. */
  function inviteUser(name: string, email: string, defaultOfficeId: string): UserAccountProfile {
    const existing = users.value.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (existing) return existing

    const newUser: UserAccountProfile = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      provider: 'MICROSOFT_365',
      status: 'DRAFT_PENDING',
      defaultOfficeId,
      createdAt: todayIsoDate(),
    }
    users.value = [...users.value, newUser]
    useRaciConfigStore().ensureUserKnown(newUser.id)
    return newUser
  }

  function updateUserStatus(userId: string, status: UserStatus) {
    users.value = users.value.map((u) => (u.id === userId ? { ...u, status } : u))
  }

  function updateUserProfile(
    userId: string,
    patch: Partial<Pick<UserAccountProfile, 'defaultOfficeId' | 'legacyUserId'>>,
  ) {
    users.value = users.value.map((u) => (u.id === userId ? { ...u, ...patch } : u))
  }

  function linkLegacyUser(userId: string, legacyUserId: string) {
    updateUserProfile(userId, { legacyUserId: legacyUserId.trim() || undefined })
  }

  function getUser(userId: string) {
    return users.value.find((u) => u.id === userId)
  }

  return {
    users,
    activeCount,
    pendingCount,
    ssoLinkedCount,
    inviteUser,
    updateUserStatus,
    updateUserProfile,
    linkLegacyUser,
    getUser,
  }
})
