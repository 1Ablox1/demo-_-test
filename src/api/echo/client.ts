import { ofetch } from 'ofetch'
import type {
  OsAirImportJob,
  OsDeskPayload,
  OsFulfilResponse,
  OsGateState,
  OsNodeActions,
  OsNodeTransitionResponse,
  OsResult,
  OsSession,
} from '@/api/echo/types'
import { osResultOk } from '@/api/echo/types'
import { echoAuthMode } from '@/api/echo/authMode'

let tokenGetter: () => string | null = () => null

export function bindEchoAuth(getter: () => string | null) {
  tokenGetter = getter
}

const echoBase = import.meta.env.VITE_ECHO_BASE_URL || '/api/echo'

export const echoApi = ofetch.create({
  baseURL: echoBase,
  onRequest({ options }) {
    const token = tokenGetter()
    if (!token) return
    const headers = new Headers(options.headers as HeadersInit)
    // Auth design §4.1 — Bearer mode is the FE main path
    headers.set('Authorization', `Bearer ${token}`)
    options.headers = headers
  },
})

async function unwrap<T>(path: string, opts?: Record<string, unknown>): Promise<T> {
  try {
    const res = await echoApi<OsResult<T>>(path, opts)
    if (!osResultOk(res)) {
      throw new Error(res?.message || `Echo request failed: ${path}`)
    }
    return res.data
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : undefined
    if (status === 502 || status === 503 || status === 504) {
      throw new Error(
        'Echo control-plane unreachable (502). Start it: cd Echo-cargowareos-backend\\cargowareos-backend; .\\run.ps1 start',
      )
    }
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      throw new Error(
        'Cannot reach Echo via /api/echo — is Vite proxy up and control-plane on :9100?',
      )
    }
    throw err
  }
}

/**
 * Credentials login — OS UI → Echo POST /os/auth/login { username, password }.
 * Echo/adapter talks to WallTech Auth; browser never sees LoginServlet.
 */
export function echoLoginCredentials(username: string, password: string) {
  return unwrap<OsSession>('/os/auth/login', {
    method: 'POST',
    body: { username: username.trim(), password },
  })
}

/** @deprecated alias — stub with empty password */
export function echoLoginStub(username: string) {
  return echoLoginCredentials(username, '')
}

/** Live validate-only — POST { sessionId } */
export function echoLoginWithSession(sessionId: string) {
  const sid = sessionId.trim()
  if (!sid) throw new Error('sessionId is required')
  return unwrap<OsSession>('/os/auth/login', {
    method: 'POST',
    body: { sessionId: sid },
  })
}

export function echoLogin(input: {
  username?: string
  password?: string
  sessionId?: string
}) {
  if (input.sessionId || echoAuthMode() === 'session') {
    return echoLoginWithSession(input.sessionId || '')
  }
  return echoLoginCredentials(input.username || 'alice', input.password ?? '')
}

export function echoLogout() {
  return unwrap<unknown>('/os/auth/logout', { method: 'POST' }).catch(() => null)
}

/** Soft connectivity check (no auth required on some Echo builds — still try Bearer). */
export async function echoPing(): Promise<{ ok: boolean; detail: string }> {
  try {
    await echoApi('/os/desk')
    return { ok: true, detail: 'Echo /os/desk reachable' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: msg }
  }
}

export function echoFetchDesk() {
  return unwrap<OsDeskPayload>('/os/desk')
}

export function echoFetchJob(jobId: string) {
  return unwrap<OsAirImportJob>(`/os/air-import/jobs/${encodeURIComponent(jobId)}`)
}

export function echoFetchNodes(jobId: string) {
  return unwrap<unknown[]>(`/os/air-import/jobs/${encodeURIComponent(jobId)}/nodes`)
}

export function echoFetchAllowedActions(jobId: string) {
  return unwrap<OsNodeActions[]>(
    `/os/air-import/jobs/${encodeURIComponent(jobId)}/allowed-actions`,
  )
}

export function echoFetchGate(jobId: string, taskCode: string) {
  return unwrap<OsGateState & { checklistItems?: OsGateState['checklist'] }>(
    `/os/air-import/jobs/${encodeURIComponent(jobId)}/nodes/${encodeURIComponent(taskCode)}/gate`,
  ).then((gate) => ({
    ...gate,
    // Docs sometimes say checklistItems; Java VO uses checklist
    checklist: gate.checklist?.length ? gate.checklist : (gate.checklistItems ?? []),
  }))
}

export function echoFulfilGateItem(jobId: string, taskCode: string, itemCode: string) {
  return unwrap<OsFulfilResponse>(
    `/os/air-import/jobs/${encodeURIComponent(jobId)}/nodes/${encodeURIComponent(taskCode)}/fulfil`,
    { method: 'POST', body: { itemCode } },
  )
}

export function echoStampGate(jobId: string, taskCode: string) {
  return unwrap<OsNodeTransitionResponse>(
    `/os/air-import/jobs/${encodeURIComponent(jobId)}/nodes/${encodeURIComponent(taskCode)}/gate`,
    { method: 'POST', body: {} },
  )
}
