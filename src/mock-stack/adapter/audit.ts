import type { LegacyService } from '@/mock-stack/legacy/types'

export interface AdapterAuditEntry {
  id: string
  at: string
  service: LegacyService
  method: string
  request: unknown
  responseSummary: string
}

const MAX = 80
const log: AdapterAuditEntry[] = []

export function adapterAudit(
  service: LegacyService,
  method: string,
  request: unknown,
  responseSummary: string,
) {
  log.unshift({
    id: `acl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    service,
    method,
    request,
    responseSummary,
  })
  if (log.length > MAX) log.length = MAX
}

export function getAdapterAuditLog(limit = 40) {
  return log.slice(0, limit)
}

export function clearAdapterAuditLog() {
  log.length = 0
}
