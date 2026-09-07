import { ofetch } from 'ofetch'
import { usesEchoGateWrites, usesEchoReads, usesMswMocks } from '@/api/config'
import {
  echoFetchAllowedActions,
  echoFetchDesk,
  echoFetchGate,
  echoFetchJob,
  echoFulfilGateItem,
  echoStampGate,
} from '@/api/echo/client'
import {
  applyClearanceToJobContext,
  clearanceFromEchoGate,
  mapEchoDeskToPayload,
  mapEchoGateToDetail,
  mapEchoJobToContext,
  mergeHybridDesk,
} from '@/lib/echoMappers'
import { mergeLifecycleAllowedActions } from '@/lib/allowedActionsBridge'
import { echoTaskCodeForGateId } from '@/lib/echoGateMap'
import { echoJobIdForShipment, isEchoWiredShipment } from '@/lib/echoJobMap'
import type {
  ActingRole,
  ChargesPayload,
  GateDetailPayload,
  InvoicePayload,
  JobContext,
  MyTasksPayload,
} from '@/api/types'
import type { AllowedActionsSource } from '@/lib/allowedActionsBridge'
import type { AllowedAction, JobLifecycle, MilestoneView } from '@/os/types'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const mockApi = ofetch.create({
  baseURL,
})

/** @deprecated use mockApi — kept for existing imports */
export const api = mockApi

export async function fetchMyTasks(): Promise<MyTasksPayload> {
  if (!usesEchoReads()) {
    return mockApi<MyTasksPayload>('/my-tasks')
  }
  const [echoDesk, mswDesk] = await Promise.all([
    echoFetchDesk().then(mapEchoDeskToPayload),
    mockApi<MyTasksPayload>('/my-tasks'),
  ])
  return mergeHybridDesk(echoDesk, mswDesk)
}

async function enrichClearanceFromEcho(
  ctx: JobContext,
  echoJobId: string,
  shipmentId: number,
): Promise<JobContext> {
  try {
    const gate = await echoFetchGate(echoJobId, '03-08')
    const clearance = clearanceFromEchoGate(gate)
    // Hybrid: Accrue/Invoice still use MSW — unlock when Echo gate already passed
    if (usesMswMocks() && clearance.status === 'cleared') {
      try {
        await mockApi(`/jobs/${shipmentId}/clearance/clear`, { method: 'POST' })
      } catch {
        /* already synced */
      }
    }
    let next = applyClearanceToJobContext(ctx, clearance)
    // Prefer MSW money progress (Accrue/Approve) over fixture “ready to accrue”
    if (usesMswMocks() && clearance.status === 'cleared') {
      try {
        const msw = await mockApi<JobContext>(`/jobs/${shipmentId}`)
        next = {
          ...next,
          nextAction: msw.nextAction ?? next.nextAction,
          summary: {
            ...next.summary,
            status: msw.summary?.status ?? next.summary.status,
          },
          documents: {
            ...next.documents,
            impact: msw.documents?.impact ?? next.documents.impact,
          },
          ops: {
            ...next.ops,
            moneyState: msw.ops?.moneyState ?? next.ops.moneyState,
            moneyAtRisk: msw.ops?.moneyAtRisk ?? next.ops.moneyAtRisk,
            holdType: msw.ops?.holdType,
            provisionalGp: msw.ops?.provisionalGp ?? next.ops.provisionalGp,
          },
        }
      } catch {
        /* MSW unavailable */
      }
    }
    return next
  } catch {
    // Echo down — prefer MSW runtime over held fixture overlay
    if (usesMswMocks()) {
      try {
        return await mockApi<JobContext>(`/jobs/${shipmentId}`)
      } catch {
        return ctx
      }
    }
    return ctx
  }
}

export async function fetchJobContext(shipmentId: number): Promise<JobContext> {
  const echoJobId = echoJobIdForShipment(shipmentId)
  if (usesEchoReads() && echoJobId) {
    const job = await echoFetchJob(echoJobId)
    const mapped = mapEchoJobToContext(job, shipmentId)
    return enrichClearanceFromEcho(mapped, echoJobId, shipmentId)
  }
  return mockApi<JobContext>(`/jobs/${shipmentId}`)
}

export async function fetchJobLifecycle(shipmentId: number, role: ActingRole) {
  // Keep MSW lifecycle gates in sync when Echo clearance already passed
  if (usesEchoReads() && isEchoWiredShipment(shipmentId) && usesMswMocks()) {
    const echoJobId = echoJobIdForShipment(shipmentId)
    if (echoJobId) {
      try {
        const gate = await echoFetchGate(echoJobId, '03-08')
        if (clearanceFromEchoGate(gate).status === 'cleared') {
          await mockApi(`/jobs/${shipmentId}/clearance/clear`, { method: 'POST' })
        }
      } catch {
        /* Echo unavailable */
      }
    }
  }

  const msw = await mockApi<{
    lifecycle: JobLifecycle
    milestones: MilestoneView[]
    allowedActions: AllowedAction[]
    moneyBlock: { blocked: boolean; message?: string }
  }>(`/jobs/${shipmentId}/lifecycle`, { query: { role } })

  let allowedActions = msw.allowedActions
  let allowedActionsSource: AllowedActionsSource = 'msw'

  const echoJobId = echoJobIdForShipment(shipmentId)
  if (usesEchoReads() && echoJobId) {
    try {
      const echoNodes = await echoFetchAllowedActions(echoJobId)
      const merged = mergeLifecycleAllowedActions(msw.allowedActions, echoNodes)
      allowedActions = merged.actions
      allowedActionsSource = merged.source
    } catch {
      /* Echo down — MSW / raciCompiler fallback */
    }
  }

  return {
    ...msw,
    allowedActions,
    allowedActionsSource,
  }
}

export function clearJobGate(shipmentId: number, gateId: string) {
  return mockApi<{ lifecycle: JobLifecycle; milestones: MilestoneView[] }>(
    `/jobs/${shipmentId}/gates/${gateId}/clear`,
    { method: 'POST' },
  )
}

export function completeJobTask(shipmentId: number, taskId: string) {
  return mockApi<{ lifecycle: JobLifecycle; milestones: MilestoneView[] }>(
    `/jobs/${shipmentId}/tasks/${taskId}/complete`,
    { method: 'POST' },
  )
}

export function clearJobClearance(shipmentId: number) {
  return mockApi<JobContext>(`/jobs/${shipmentId}/clearance/clear`, { method: 'POST' })
}

function echoGateTarget(shipmentId: number, gateId: string): { jobId: string; taskCode: string } | null {
  if (!usesEchoGateWrites() || !isEchoWiredShipment(shipmentId)) return null
  const jobId = echoJobIdForShipment(shipmentId)
  const taskCode = echoTaskCodeForGateId(gateId)
  if (!jobId || !taskCode) return null
  return { jobId, taskCode }
}

export async function fetchGateDetail(
  shipmentId: number,
  gateId: string,
): Promise<GateDetailPayload> {
  const target = echoGateTarget(shipmentId, gateId)
  if (target) {
    const gate = await echoFetchGate(target.jobId, target.taskCode)
    return mapEchoGateToDetail(gate, gateId)
  }
  return mockApi<GateDetailPayload>(`/jobs/${shipmentId}/gates/${gateId}`)
}

export async function fulfilGateItem(
  shipmentId: number,
  gateId: string,
  itemCode: string,
): Promise<GateDetailPayload> {
  const target = echoGateTarget(shipmentId, gateId)
  if (target) {
    await echoFulfilGateItem(target.jobId, target.taskCode, itemCode)
    const gate = await echoFetchGate(target.jobId, target.taskCode)
    return mapEchoGateToDetail(gate, gateId)
  }
  return mockApi<GateDetailPayload>(`/jobs/${shipmentId}/gates/${gateId}/fulfil`, {
    method: 'POST',
    body: { itemCode },
  })
}

export async function stampGateRelease(shipmentId: number, gateId: string) {
  const target = echoGateTarget(shipmentId, gateId)
  if (target) {
    await echoStampGate(target.jobId, target.taskCode)
    // Keep MSW money fixtures in sync (hybrid still uses MSW for accrue/approve)
    try {
      await mockApi(`/jobs/${shipmentId}/clearance/clear`, { method: 'POST' })
    } catch {
      /* fixture may already be cleared */
    }
    const [gate, job] = await Promise.all([
      echoFetchGate(target.jobId, target.taskCode),
      fetchJobContext(shipmentId),
    ])
    const life = await mockApi<{
      lifecycle: JobLifecycle
      milestones: MilestoneView[]
      allowedActions: AllowedAction[]
      moneyBlock: { blocked: boolean; message?: string }
    }>(`/jobs/${shipmentId}/lifecycle`, { query: { role: 'finance' } })
    return {
      gate: mapEchoGateToDetail(gate, gateId),
      job,
      lifecycle: life.lifecycle,
      milestones: life.milestones,
    }
  }
  return mockApi<{
    gate: GateDetailPayload
    job: JobContext
    lifecycle: JobLifecycle
    milestones: MilestoneView[]
  }>(`/jobs/${shipmentId}/gates/${gateId}/stamp`, { method: 'POST' })
}

/** Optional: pull Echo allowed-actions for debugging / future desk CTAs */
export async function fetchEchoAllowedActions(shipmentId: number) {
  const jobId = echoJobIdForShipment(shipmentId)
  if (!jobId || !usesEchoReads()) return []
  return echoFetchAllowedActions(jobId)
}

export async function fetchCharges(shipmentId: number) {
  // Ensure MSW money unlock if Echo clearance already stamped (hybrid)
  if (usesEchoReads() && isEchoWiredShipment(shipmentId)) {
    const echoJobId = echoJobIdForShipment(shipmentId)
    if (echoJobId) {
      try {
        const gate = await echoFetchGate(echoJobId, '03-08')
        const clearance = clearanceFromEchoGate(gate)
        if (clearance.status === 'cleared' && usesMswMocks()) {
          await mockApi(`/jobs/${shipmentId}/clearance/clear`, { method: 'POST' })
        }
      } catch {
        /* Echo unavailable — MSW charges as-is */
      }
    }
  }
  return mockApi<ChargesPayload>(`/jobs/${shipmentId}/charges`)
}

export function accrueCharges(shipmentId: number) {
  return mockApi<ChargesPayload>(`/jobs/${shipmentId}/charges/accrue`, { method: 'POST' })
}

export function approveCharges(shipmentId: number) {
  return mockApi<ChargesPayload>(`/jobs/${shipmentId}/charges/approve`, { method: 'POST' })
}

export function fetchInvoice(shipmentId: number) {
  return mockApi<InvoicePayload>(`/jobs/${shipmentId}/invoice`)
}

export function issueInvoice(shipmentId: number) {
  return mockApi<InvoicePayload>(`/jobs/${shipmentId}/invoice/issue`, { method: 'POST' })
}

export function markInvoicePaid(shipmentId: number) {
  return mockApi<InvoicePayload>(`/jobs/${shipmentId}/invoice/paid`, { method: 'POST' })
}

/** Numbering Policy + MAWB mock APIs (control-plane shape) */
export function fetchNumberingPolicies(query?: { type?: string; officeId?: string }) {
  return mockApi<{ items: import('@/mdm/numberingTypes').NumberingPolicy[] }>(
    '/os/numbering-policies',
    { query },
  )
}

export function updateNumberingPolicy(
  id: string,
  body: Partial<import('@/mdm/numberingTypes').NumberingPolicy>,
) {
  return mockApi<import('@/mdm/numberingTypes').NumberingPolicy>(`/os/numbering-policies/${id}`, {
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
  return mockApi<{ number: string; note?: string }>('/os/numbering/preview', {
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
  return mockApi<{
    number: string
    policyId: string
    policyVersion: number
  }>('/os/numbering/generate', { method: 'POST', body })
}

export function fetchNumberingAudits() {
  return mockApi<{ items: import('@/mdm/numberingTypes').GeneratedNumberAudit[] }>(
    '/os/numbering/audits',
  )
}

export function fetchMawbAirlines() {
  return mockApi<{ items: import('@/mdm/numberingTypes').MockAirline[] }>('/os/mawb/airlines')
}

export function fetchMawbPools() {
  return mockApi<{
    items: Array<import('@/mdm/numberingTypes').MawbPool & { available: number; allocated: number }>
  }>('/os/mawb/pools')
}

export function allocateMawb(body: { jobId: string; jobNo: string; airlineId?: string }) {
  return mockApi<{ mawb: string; poolId: string }>('/os/mawb/allocate', { method: 'POST', body })
}

export function validateMawb(body: { mawb: string; airlineId?: string }) {
  return mockApi<{ valid: boolean; normalized?: string; message?: string }>('/os/mawb/validate', {
    method: 'POST',
    body,
  })
}

export function resetNumberingMock() {
  return mockApi('/os/numbering/reset-mock', { method: 'POST' })
}

/** Operational MDM — control-plane → adapter → legacy mdm-service (mock or live). */
export type OsMdmSearchKind =
  | 'customer'
  | 'airport'
  | 'country'
  | 'airline'
  | 'charge'
  | 'currency'

export function searchOsMdm(kind: OsMdmSearchKind, q = '') {
  return mockApi<{ items: import('@/mdm/types').MasterOption[] }>('/os/mdm/search', {
    query: { kind, q },
  })
}

export function createOsMdmParty(body: import('@/mdm/types').QuickCreateCustomerInput) {
  return mockApi<import('@/mdm/types').MasterOption>('/os/mdm/parties', {
    method: 'POST',
    body,
  })
}

export function approveOsMdmParty(value: string) {
  return mockApi<{ ok: boolean }>(`/os/mdm/parties/${encodeURIComponent(value)}/approve`, {
    method: 'POST',
  })
}

/** Whether MSW should intercept /api (mock + hybrid money path). */
export function shouldStartMsw(): boolean {
  return usesMswMocks()
}
