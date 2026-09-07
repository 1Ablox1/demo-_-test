import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { bindEchoAuth, echoLogin } from '@/api/echo/client'
import type { OsSession } from '@/api/echo/types'
import { usesEchoReads } from '@/api/config'
import type { ActingRole } from '@/api/types'
import { useTasksStore } from '@/stores/tasks'
import { useTenantStore } from '@/stores/tenant'

const DEFAULT_USER = import.meta.env.VITE_ECHO_LOGIN_USER?.trim() || 'alice'

export type Seat = 'sales' | 'operations' | 'finance' | 'admin'

export const SEAT_LABELS: Record<Seat, string> = {
  sales: 'Sales',
  operations: 'Operations',
  finance: 'Finance',
  admin: 'Admin',
}

/** Demo persona user id per OS seat — drives RACI allowed-actions in the shell mock. */
export const PERSONA_USER_BY_SEAT: Record<Seat, string> = {
  sales: 'usr-2',
  operations: 'usr-1',
  finance: 'usr-3',
  admin: 'usr-1',
}

function seatFromActingRole(role: ActingRole): Seat {
  if (role === 'sales' || role === 'operations' || role === 'finance' || role === 'admin') return role
  return 'operations'
}

export const useAuthStore = defineStore('auth', () => {
  const tenant = useTenantStore()
  const session = ref<OsSession | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const seat = ref<Seat>('operations')
  const language = ref<'en' | 'zh'>('en')
  const prefsOpen = ref(false)
  const commandOpen = ref(false)

  const sessionId = computed(() => session.value?.sessionId ?? null)
  const isAuthenticated = computed(() => Boolean(session.value?.sessionId))

  const office = computed({
    get: () => tenant.activeOfficeLabel,
    set: (label: string) => tenant.setActiveBranchByLabel(label),
  })

  const isAdmin = computed(() => seat.value === 'admin')
  const seatLabel = computed(() => SEAT_LABELS[seat.value])
  const personaUserId = computed(() => PERSONA_USER_BY_SEAT[seat.value])

  bindEchoAuth(() => session.value?.sessionId ?? null)

  function syncSeatToTasks(next: Seat) {
    try {
      useTasksStore().role = next as ActingRole
    } catch {
      /* pinia may not be ready during early import */
    }
  }

  function setSeat(next: Seat) {
    seat.value = next
    syncSeatToTasks(next)
  }

  function openPrefs() {
    prefsOpen.value = true
  }

  function closePrefs() {
    prefsOpen.value = false
  }

  function toggleCommand(force?: boolean) {
    commandOpen.value = force ?? !commandOpen.value
  }

  async function login(username = DEFAULT_USER) {
    loading.value = true
    error.value = null
    try {
      session.value = await echoLogin(username)
      return session.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Echo login failed'
      session.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureSession() {
    if (!usesEchoReads()) return null
    if (session.value?.sessionId) return session.value
    return login()
  }

  function logout() {
    session.value = null
    error.value = null
  }

  // Keep Module 1 SoD in sync if role is changed elsewhere
  watch(
    () => {
      try {
        return useTasksStore().role
      } catch {
        return null
      }
    },
    (role) => {
      if (!role) return
      const mapped = seatFromActingRole(role)
      if (mapped !== seat.value) seat.value = mapped
    },
  )

  syncSeatToTasks(seat.value)

  return {
    session,
    loading,
    error,
    sessionId,
    isAuthenticated,
    login,
    ensureSession,
    logout,
    seat,
    office,
    language,
    prefsOpen,
    commandOpen,
    isAdmin,
    seatLabel,
    personaUserId,
    setSeat,
    openPrefs,
    closePrefs,
    toggleCommand,
  }
})
