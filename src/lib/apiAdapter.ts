import { DEFAULT_BACKEND_ENV } from '@/lib/env'
import type { BackendEnv, RecordedRequest, RequestContext } from '@/types/tenant'

export interface ActiveLocation {
  tenantId: string
  branchId: string
  countryCode: string
  env: BackendEnv
}

let activeLocation: ActiveLocation = {
  tenantId: 'tnt-waltech',
  branchId: 'br-hq-syd',
  countryCode: 'AU',
  env: DEFAULT_BACKEND_ENV,
}

const requestLog: RecordedRequest[] = []

export function setActiveLocation(next: ActiveLocation) {
  activeLocation = { ...next }
}

export function getActiveLocation(): ActiveLocation {
  return { ...activeLocation }
}

export function buildRequestContext(override?: Partial<ActiveLocation>): RequestContext {
  const loc = { ...activeLocation, ...override }
  return {
    env: loc.env,
    tenantId: loc.tenantId,
    branchId: loc.branchId,
    countryCode: loc.countryCode,
    headers: {
      'X-Tenant-Id': loc.tenantId,
      'X-Branch-Id': loc.branchId,
      'X-Country-Code': loc.countryCode,
      'X-Env': loc.env,
      'X-Legacy-Datasource': loc.env,
    },
    payload: {
      tenantId: loc.tenantId,
      branchId: loc.branchId,
      countryCode: loc.countryCode,
      env: loc.env,
    },
  }
}

export function lastRequest(): RecordedRequest | null {
  return requestLog[0] ?? null
}

export function recentRequests(limit = 8): RecordedRequest[] {
  return requestLog.slice(0, limit)
}

function record(path: string, method: string, body?: unknown): RequestContext {
  const context = buildRequestContext()
  requestLog.unshift({
    path,
    method,
    at: new Date().toISOString(),
    context,
    body,
  })
  if (requestLog.length > 40) requestLog.pop()
  return context
}

/**
 * Mock data fetcher aligned with legacy H5 env params.
 * Every call stamps tenantId / branchId on headers and payload keys.
 */
export async function envFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; data?: T },
): Promise<{ data: T; context: RequestContext }> {
  const method = options?.method ?? 'GET'
  const context = record(path, method, options?.body)
  return { data: (options?.data ?? ({} as T)), context }
}

export function withTenantPayload<T extends Record<string, unknown>>(
  payload: T,
): T & RequestContext['payload'] {
  return { ...payload, ...buildRequestContext().payload }
}
