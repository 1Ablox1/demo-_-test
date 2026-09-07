import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import baselineRaciCatalog, { P0_L0_ROLES, type P0L0Role, type RaciMark } from '@/data/raciCatalog'
import { SEED_PEOPLE } from '@/lib/seedPeople'
import { useUserAdminStore, type UserAccountProfile } from '@/stores/userAdmin'

export { P0_L0_ROLES as L0_FUNCTIONS }
export type { P0L0Role as L0Function, RaciMark }

/** Align with shell-mock tier keys — maps L0 → L2 dispatch seat. */
export type CompanyTier = 'SMALL_1_10' | 'MID_11_50' | 'ENTERPRISE_50_PLUS'

export const TIER_LABELS: Record<CompanyTier, string> = {
  SMALL_1_10: 'Small (1–10)',
  MID_11_50: 'Mid (11–50)',
  ENTERPRISE_50_PLUS: 'Enterprise (50+)',
}

const TIER_DEFAULT_MAPPINGS: Record<CompanyTier, Record<P0L0Role, string>> = {
  SMALL_1_10: {
    'Air Export': 'OPERATIONS',
    'Air Import': 'OPERATIONS',
    Pricing: 'SALES',
    Billing: 'FINANCE',
  },
  MID_11_50: {
    'Air Export': 'OPERATIONS',
    'Air Import': 'OPERATIONS',
    Pricing: 'SALES',
    Billing: 'FINANCE',
  },
  ENTERPRISE_50_PLUS: {
    'Air Export': 'Air Export',
    'Air Import': 'Air Import',
    Pricing: 'Pricing',
    Billing: 'Billing',
  },
}

export interface RoleMappingRow {
  role: P0L0Role
  seat: string
  users: UserAccountProfile[]
  userCount: number
}

function seedAssignments(): Record<P0L0Role, string[]> {
  return {
    'Air Export': [SEED_PEOPLE.operations.id],
    'Air Import': [SEED_PEOPLE.operations.id],
    Pricing: [SEED_PEOPLE.sales.id],
    Billing: [SEED_PEOPLE.finance.id],
  }
}

/**
 * Seats & RACI — only place to assign L0 functional roles.
 * Identity lives in userAdmin; this store never duplicates invite/SSO.
 * @see docs/OS-SHELL-USER-ROLES-GUIDE.md
 */
export const useRaciConfigStore = defineStore('raciConfig', () => {
  const companyTier = ref<CompanyTier>('MID_11_50')
  const roleUserAssignments = ref<Record<P0L0Role, string[]>>(seedAssignments())

  const selectedMatrixTaskId = ref<string | null>('03-08')
  const selectedProcess = ref<string>(baselineRaciCatalog.processes[2] ?? '')

  function setCompanyTier(tier: CompanyTier) {
    companyTier.value = tier
  }

  function resolveEffectiveSeat(role: P0L0Role): string {
    return TIER_DEFAULT_MAPPINGS[companyTier.value][role] ?? role
  }

  function getUsersForRole(role: P0L0Role): UserAccountProfile[] {
    const userAdmin = useUserAdminStore()
    const userIds = roleUserAssignments.value[role] ?? []
    return userAdmin.users.filter((u) => userIds.includes(u.id) && u.status !== 'SUSPENDED')
  }

  function getRolesForUser(userId: string): P0L0Role[] {
    return P0_L0_ROLES.filter((role) => roleUserAssignments.value[role].includes(userId))
  }

  function assignUserToRole(role: P0L0Role, userId: string) {
    useUserAdminStore().getUser(userId) // ensure exists
    const current = roleUserAssignments.value[role] ?? []
    if (current.includes(userId)) return
    roleUserAssignments.value = {
      ...roleUserAssignments.value,
      [role]: [...current, userId],
    }
  }

  function removeUserFromRole(role: P0L0Role, userId: string) {
    roleUserAssignments.value = {
      ...roleUserAssignments.value,
      [role]: roleUserAssignments.value[role].filter((id) => id !== userId),
    }
  }

  /** @deprecated use assignUserToRole / removeUserFromRole */
  function toggleAssign(role: P0L0Role, userId: string) {
    if (roleUserAssignments.value[role].includes(userId)) removeUserFromRole(role, userId)
    else assignUserToRole(role, userId)
  }

  function assigneesForRole(role: P0L0Role): string[] {
    return roleUserAssignments.value[role]
  }

  function ensureUserKnown(userId: string) {
    void userId
  }

  function resetToDefaults() {
    roleUserAssignments.value = seedAssignments()
  }

  function openMatrixTask(taskId: string) {
    selectedMatrixTaskId.value = taskId
    const task = baselineRaciCatalog.getTask(taskId)
    if (task) selectedProcess.value = task.process
  }

  const catalogTaskCount = computed(() => baselineRaciCatalog.tasks.length)
  const catalogProcessCount = computed(() => baselineRaciCatalog.processes.length)

  const roleMappingRows = computed((): RoleMappingRow[] =>
    P0_L0_ROLES.map((role) => {
      const assigned = getUsersForRole(role)
      return {
        role,
        seat: resolveEffectiveSeat(role),
        users: assigned,
        userCount: assigned.length,
      }
    }),
  )

  const selectedMatrixTask = computed(() =>
    selectedMatrixTaskId.value ? baselineRaciCatalog.getTask(selectedMatrixTaskId.value) : null,
  )

  const processTasks = computed(() =>
    baselineRaciCatalog.tasksOf(selectedProcess.value),
  )

  const unassignedKnownCount = computed(() => {
    const userAdmin = useUserAdminStore()
    return userAdmin.users.filter((u) => getRolesForUser(u.id).length === 0).length
  })

  return {
    companyTier,
    roleUserAssignments,
    selectedMatrixTaskId,
    selectedProcess,
    catalogTaskCount,
    catalogProcessCount,
    roleMappingRows,
    selectedMatrixTask,
    processTasks,
    unassignedKnownCount,
    setCompanyTier,
    resolveEffectiveSeat,
    getUsersForRole,
    getRolesForUser,
    assignUserToRole,
    removeUserFromRole,
    toggleAssign,
    assigneesForRole,
    ensureUserKnown,
    resetToDefaults,
    openMatrixTask,
  }
})
