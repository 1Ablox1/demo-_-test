import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  bindEchoAuth,
  echoLogin,
  echoLogout,
  echoPing,
} from '@/api/echo/client'
import { echoAuthMode, ECHO_SESSION_STORAGE_KEY } from '@/api/echo/authMode'
import type { OsSession } from '@/api/echo/types'
import { usesEchoReads } from '@/api/config'
import type { ActingRole } from '@/api/types'
import { useTasksStore } from '@/stores/tasks'
import { useTenantStore } from '@/stores/tenant'
import { useTenantAdminStore } from '@/stores/tenantAdmin'

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

/** Best-effort seat from Echo roleIntents (live mapping; seat switcher still demo SoD). */
function seatFromRoleIntents(intents: string[] | undefined): Seat | null {
  if (!intents?.length) return null
  const joined = intents.join(' ').toLowerCase()
  if (joined.includes('finance') || joined.includes('invoice')) return 'finance'
  if (joined.includes('sales') || joined.includes('quote')) return 'sales'
  if (joined.includes('admin')) return 'admin'
  if (joined.includes('ops') || joined.includes('air_import') || joined.includes('operations')) {
    return 'operations'
  }
  return null
}

function readStoredSession(): OsSession | null {
  try {
    const raw = sessionStorage.getItem(ECHO_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OsSession
    if (!parsed?.sessionId) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredSession(s: OsSession | null) {
  try {
    if (!s) sessionStorage.removeItem(ECHO_SESSION_STORAGE_KEY)
    else sessionStorage.setItem(ECHO_SESSION_STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* private mode */
  }
}

/** Pull sessionId from SSO callback URL (?sessionId=) — auth design §1.1 / §4.1 */
export function takeSessionIdFromUrl(): string | null {
  try {
    const url = new URL(window.location.href)
    const sid =
      url.searchParams.get('sessionId') ||
      url.searchParams.get('session_id') ||
      null
    if (!sid?.trim()) return null
    url.searchParams.delete('sessionId')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    return sid.trim()
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const tenant = useTenantStore()
  const session = ref<OsSession | null>(readStoredSession())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const echoReachable = ref<boolean | null>(null)
  const echoDetail = ref<string | null>(null)

  const seat = ref<Seat>('operations')
  const language = ref<'en' | 'zh'>('en')
  const prefsOpen = ref(false)
  const commandOpen = ref(false)

  const sessionId = computed(() => session.value?.sessionId ?? null)
  const isAuthenticated = computed(() => Boolean(session.value?.sessionId))
  const authMode = computed(() => echoAuthMode())

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

  function applySessionToTenant(s: OsSession) {
    try {
      const admin = useTenantAdminStore()
      if (s.companyId != null) admin.companyId = String(s.companyId)
      if (s.tenantId != null) admin.tenantId = String(s.tenantId)
      if (s.companyName?.trim()) admin.legalName = s.companyName.trim()
    } catch {
      /* pinia may not be ready */
    }
    const fromIntent = seatFromRoleIntents(s.roleIntents)
    if (fromIntent) setSeat(fromIntent)
  }

  function setSession(s: OsSession | null) {
    session.value = s
    writeStoredSession(s)
    if (s) applySessionToTenant(s)
  }

  async function probeEcho() {
    const ping = await echoPing()
    echoReachable.value = ping.ok
    echoDetail.value = ping.detail
    return ping
  }

  /** Stub Alice (or other stub user) when VITE_ECHO_AUTH_MODE=stub */
  async function loginStub(username = DEFAULT_USER) {
    return loginWithCredentials(username, '')
  }

  /** OS-branded password login → Echo → WallTech Auth */
  async function loginWithCredentials(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const s = await echoLogin({ username, password })
      setSession(s)
      try {
        const { useMastersStore } = await import('@/stores/masters')
        void useMastersStore().ensureEchoCatalog()
      } catch {
        /* masters optional at login */
      }
      return s
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Echo login failed'
      setSession(null)
      throw err
    } finally {
      loading.value = false
    }
  }

  /** Live path — POST { sessionId }; OS only validates (auth design §2) */
  async function loginWithSessionId(sid: string) {
    loading.value = true
    error.value = null
    try {
      const s = await echoLogin({ sessionId: sid })
      setSession(s)
      try {
        const { useMastersStore } = await import('@/stores/masters')
        void useMastersStore().ensureEchoCatalog()
      } catch {
        /* masters optional at login */
      }
      return s
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Echo session login failed'
      setSession(null)
      throw err
    } finally {
      loading.value = false
    }
  }

  /** @deprecated use loginWithCredentials */
  async function login(username = DEFAULT_USER) {
    if (echoAuthMode() === 'session') {
      throw new Error('Session auth mode — call loginWithSessionId(sessionId) after SSO')
    }
    return loginStub(username)
  }

  /**
   * Bootstrap hybrid/live:
   * 1) ?sessionId= from callback
   * 2) sessionStorage restore
   * 3) do NOT auto-login with password — user clicks Log in on /login
   */
  async function ensureSession() {
    if (!usesEchoReads()) return null

    const fromUrl = takeSessionIdFromUrl()
    if (fromUrl) {
      return loginWithSessionId(fromUrl)
    }

    if (session.value?.sessionId) {
      void probeEcho()
      return session.value
    }

    // password / stub / session: wait for explicit login page
    return null
  }

  async function logout() {
    try {
      if (session.value?.sessionId) await echoLogout()
    } finally {
      setSession(null)
      error.value = null
    }
  }

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
    echoReachable,
    echoDetail,
    sessionId,
    isAuthenticated,
    authMode,
    login,
    loginStub,
    loginWithCredentials,
    loginWithSessionId,
    ensureSession,
    logout,
    probeEcho,
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
