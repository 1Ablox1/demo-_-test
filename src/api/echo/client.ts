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
    headers.set('Authorization', `Bearer ${token}`)
    options.headers = headers
  },
})

async function unwrap<T>(path: string, opts?: Record<string, unknown>): Promise<T> {
  const res = await echoApi<OsResult<T>>(path, opts)
  if (!res?.ok) {
    throw new Error(res?.message || `Echo request failed: ${path}`)
  }
  return res.data
}

export function echoLogin(username: string) {
  return unwrap<OsSession>('/os/auth/login', {
    method: 'POST',
    body: { username, password: '' },
  })
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
  return unwrap<OsGateState>(
    `/os/air-import/jobs/${encodeURIComponent(jobId)}/nodes/${encodeURIComponent(taskCode)}/gate`,
  )
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
