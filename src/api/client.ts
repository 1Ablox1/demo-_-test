import { ofetch } from 'ofetch'
import type {
  ActingRole,
  ChargesPayload,
  InvoicePayload,
  JobContext,
  MyTasksPayload,
} from '@/api/types'
import type { AllowedAction, JobLifecycle, MilestoneView } from '@/os/types'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = ofetch.create({
  baseURL,
})

export function fetchMyTasks() {
  return api<MyTasksPayload>('/my-tasks')
}

export function fetchJobContext(shipmentId: number) {
  return api<JobContext>(`/jobs/${shipmentId}`)
}

export function fetchJobLifecycle(shipmentId: number, role: ActingRole) {
  return api<{
    lifecycle: JobLifecycle
    milestones: MilestoneView[]
    allowedActions: AllowedAction[]
    moneyBlock: { blocked: boolean; message?: string }
  }>(`/jobs/${shipmentId}/lifecycle`, { query: { role } })
}

export function clearJobGate(shipmentId: number, gateId: string) {
  return api<{ lifecycle: JobLifecycle; milestones: MilestoneView[] }>(
    `/jobs/${shipmentId}/gates/${gateId}/clear`,
    { method: 'POST' },
  )
}

export function completeJobTask(shipmentId: number, taskId: string) {
  return api<{ lifecycle: JobLifecycle; milestones: MilestoneView[] }>(
    `/jobs/${shipmentId}/tasks/${taskId}/complete`,
    { method: 'POST' },
  )
}

export function fetchCharges(shipmentId: number) {
  return api<ChargesPayload>(`/jobs/${shipmentId}/charges`)
}

export function accrueCharges(shipmentId: number) {
  return api<ChargesPayload>(`/jobs/${shipmentId}/charges/accrue`, { method: 'POST' })
}

export function approveCharges(shipmentId: number) {
  return api<ChargesPayload>(`/jobs/${shipmentId}/charges/approve`, { method: 'POST' })
}

export function fetchInvoice(shipmentId: number) {
  return api<InvoicePayload>(`/jobs/${shipmentId}/invoice`)
}

export function issueInvoice(shipmentId: number) {
  return api<InvoicePayload>(`/jobs/${shipmentId}/invoice/issue`, { method: 'POST' })
}

export function markInvoicePaid(shipmentId: number) {
  return api<InvoicePayload>(`/jobs/${shipmentId}/invoice/paid`, { method: 'POST' })
}

/** Numbering Policy + MAWB mock APIs (control-plane shape) */
export function fetchNumberingPolicies(query?: { type?: string; officeId?: string }) {
  return api<{ items: import('@/mdm/numberingTypes').NumberingPolicy[] }>(
    '/os/numbering-policies',
    { query },
  )
}

export function updateNumberingPolicy(
  id: string,
  body: Partial<import('@/mdm/numberingTypes').NumberingPolicy>,
) {
  return api<import('@/mdm/numberingTypes').NumberingPolicy>(`/os/numbering-policies/${id}`, {
    method: 'PUT',
    body,
  })
}

export function previewNumbering(body: {
  type: string
  officeId?: string
  template?: string
  mode?: string
}) {
  return api<{ number: string; note?: string }>('/os/numbering/preview', {
    method: 'POST',
    body,
  })
}

export function generateNumbering(body: {
  type: string
  officeId: string
  entityType?: string
  entityId?: string
}) {
  return api<{
    number: string
    policyId: string
    policyVersion: number
  }>('/os/numbering/generate', { method: 'POST', body })
}

export function fetchNumberingAudits() {
  return api<{ items: import('@/mdm/numberingTypes').GeneratedNumberAudit[] }>(
    '/os/numbering/audits',
  )
}

export function fetchMawbAirlines() {
  return api<{ items: import('@/mdm/numberingTypes').MockAirline[] }>('/os/mawb/airlines')
}

export function fetchMawbPools() {
  return api<{
    items: Array<import('@/mdm/numberingTypes').MawbPool & { available: number; allocated: number }>
  }>('/os/mawb/pools')
}

export function allocateMawb(body: { jobId: string; jobNo: string; airlineId?: string }) {
  return api<{ mawb: string; poolId: string }>('/os/mawb/allocate', { method: 'POST', body })
}

export function validateMawb(body: { mawb: string; airlineId?: string }) {
  return api<{ valid: boolean; normalized?: string; message?: string }>('/os/mawb/validate', {
    method: 'POST',
    body,
  })
}

export function resetNumberingMock() {
  return api('/os/numbering/reset-mock', { method: 'POST' })
}
