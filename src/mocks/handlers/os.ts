import { http, HttpResponse } from 'msw'
import { getAdapterAuditLog } from '@/mock-stack/adapter/audit'
import { controlPlane } from '@/mock-stack/control-plane'
import type { ActingRole } from '@/api/types'
import type { QuickCreateCustomerInput } from '@/mdm/types'

function isApiError(r: unknown): r is { error: string; status: number } {
  return (
    typeof r === 'object' &&
    r !== null &&
    'error' in r &&
    typeof (r as { error: unknown }).error === 'string' &&
    'status' in r &&
    typeof (r as { status: unknown }).status === 'number'
  )
}

function err(result: { error: string; status: number }) {
  return HttpResponse.json({ message: result.error }, { status: result.status })
}

/** Canonical OS control-plane routes (UI → only this layer). */
export const osHandlers = [
  http.get('/api/os/health', () => HttpResponse.json(controlPlane.health())),

  http.get('/api/os/_debug/adapter-log', () =>
    HttpResponse.json({ items: getAdapterAuditLog() }),
  ),

  http.get('/api/os/desks', () => HttpResponse.json(controlPlane.getDesk())),

  http.get('/api/os/jobs/:shipmentId', ({ params }) => {
    const shipmentId = Number(params.shipmentId)
    const result = controlPlane.getJobContext(shipmentId)
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.get('/api/os/jobs/:shipmentId/lifecycle', ({ params, request }) => {
    const shipmentId = Number(params.shipmentId)
    const url = new URL(request.url)
    const role = (url.searchParams.get('role') || 'operations') as ActingRole
    const result = controlPlane.getLifecycle(shipmentId, role)
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.get('/api/os/jobs/:shipmentId/guidance', ({ params, request }) => {
    const shipmentId = Number(params.shipmentId)
    const url = new URL(request.url)
    const role = (url.searchParams.get('role') || 'operations') as ActingRole
    const workers = {
      quoteAssist: url.searchParams.get('quoteAssist') === '1',
      marginGuard: url.searchParams.get('marginGuard') === '1',
      chargeDraft: url.searchParams.get('chargeDraft') === '1',
      gateWatch: url.searchParams.get('gateWatch') === '1',
    }
    return HttpResponse.json({
      items: controlPlane.getGuidance(shipmentId, role, workers),
    })
  }),

  http.post('/api/os/jobs/:shipmentId/gates/:gateId/clear', ({ params }) => {
    const result = controlPlane.clearGate(
      Number(params.shipmentId),
      String(params.gateId),
    )
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/jobs/:shipmentId/tasks/:taskId/complete', ({ params }) => {
    const result = controlPlane.completeTask(
      Number(params.shipmentId),
      String(params.taskId),
    )
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.get('/api/os/jobs/:shipmentId/charges', ({ params }) => {
    const result = controlPlane.getCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/jobs/:shipmentId/charges/accrue', ({ params }) => {
    const result = controlPlane.accrueCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/jobs/:shipmentId/charges/approve', ({ params }) => {
    const result = controlPlane.approveCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.get('/api/os/jobs/:shipmentId/invoice', ({ params }) => {
    const result = controlPlane.getInvoice(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/jobs/:shipmentId/invoice/issue', ({ params }) => {
    const result = controlPlane.issueInvoice(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/jobs/:shipmentId/invoice/paid', ({ params }) => {
    const result = controlPlane.markInvoicePaid(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  // MDM via adapter (Operational MDM — not full Basic Information)
  http.get('/api/os/mdm/search', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    const kind = (url.searchParams.get('kind') ?? 'customer') as
      | 'customer'
      | 'airport'
      | 'country'
      | 'airline'
      | 'charge'
      | 'currency'
    return HttpResponse.json({
      items: controlPlane.adapter.searchMdm(q, kind),
    })
  }),

  http.post('/api/os/mdm/parties', async ({ request }) => {
    const body = (await request.json()) as QuickCreateCustomerInput
    const party = controlPlane.adapter.createPartyDraft(body)
    return HttpResponse.json(party)
  }),

  http.post('/api/os/mdm/parties/:value/approve', ({ params }) => {
    controlPlane.adapter.approveParty(String(params.value))
    return HttpResponse.json({ ok: true })
  }),

  // Numbering
  http.get('/api/os/numbering-policies', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') ?? undefined
    const officeId = url.searchParams.get('officeId') ?? undefined
    return HttpResponse.json({
      items: controlPlane.numbering.listPolicies(type, officeId),
    })
  }),

  http.get('/api/os/numbering-policies/:id', ({ params }) => {
    const p = controlPlane.numbering.getPolicy(String(params.id))
    if (!p) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(p)
  }),

  http.put('/api/os/numbering-policies/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const p = controlPlane.numbering.updatePolicy(String(params.id), body as never)
    if (!p) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(p)
  }),

  http.post('/api/os/numbering/preview', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(controlPlane.numbering.preview(body as never))
  }),

  http.post('/api/os/numbering/generate', async ({ request }) => {
    const body = await request.json()
    const result = controlPlane.numbering.generate(body as never)
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/numbering/assign-job', async ({ request }) => {
    const body = await request.json()
    const result = controlPlane.adapter.assignJobNumbers(body as never)
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.get('/api/os/numbering/audits', () =>
    HttpResponse.json({ items: controlPlane.numbering.listAudits() }),
  ),

  http.post('/api/os/numbering/reset-mock', () =>
    HttpResponse.json(controlPlane.numbering.reset()),
  ),

  http.get('/api/os/mawb/airlines', () =>
    HttpResponse.json({ items: controlPlane.numbering.listAirlines() }),
  ),

  http.get('/api/os/mawb/pools', () =>
    HttpResponse.json({ items: controlPlane.numbering.listPools() }),
  ),

  http.post('/api/os/mawb/allocate', async ({ request }) => {
    const body = (await request.json()) as {
      jobId: string
      jobNo: string
      airlineId?: string
    }
    const result = controlPlane.adapter.allocateMawb(
      body.jobId,
      body.jobNo,
      body.airlineId,
    )
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),

  http.post('/api/os/mawb/validate', async ({ request }) => {
    const body = (await request.json()) as { mawb: string; airlineId?: string }
    const result = controlPlane.numbering.validateMawb(body.mawb, body.airlineId)
    if (!result.ok) {
      return HttpResponse.json({ valid: false, message: result.reason }, { status: 400 })
    }
    return HttpResponse.json({ valid: true, normalized: result.normalized })
  }),
]

/** Legacy path aliases — delegate to same control-plane (migration shim). */
export const legacyAliasHandlers = [
  http.get('/api/my-tasks', () => HttpResponse.json(controlPlane.getDesk())),
  http.get('/api/jobs/:shipmentId', ({ params }) => {
    const result = controlPlane.getJobContext(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.get('/api/jobs/:shipmentId/lifecycle', ({ params, request }) => {
    const url = new URL(request.url)
    const role = (url.searchParams.get('role') || 'operations') as ActingRole
    const result = controlPlane.getLifecycle(Number(params.shipmentId), role)
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/gates/:gateId/clear', ({ params }) => {
    const result = controlPlane.clearGate(
      Number(params.shipmentId),
      String(params.gateId),
    )
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/tasks/:taskId/complete', ({ params }) => {
    const result = controlPlane.completeTask(
      Number(params.shipmentId),
      String(params.taskId),
    )
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.get('/api/jobs/:shipmentId/charges', ({ params }) => {
    const result = controlPlane.getCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/charges/accrue', ({ params }) => {
    const result = controlPlane.accrueCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/charges/approve', ({ params }) => {
    const result = controlPlane.approveCharges(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.get('/api/jobs/:shipmentId/invoice', ({ params }) => {
    const result = controlPlane.getInvoice(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/invoice/issue', ({ params }) => {
    const result = controlPlane.issueInvoice(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
  http.post('/api/jobs/:shipmentId/invoice/paid', ({ params }) => {
    const result = controlPlane.markInvoicePaid(Number(params.shipmentId))
    if (isApiError(result)) return err(result)
    return HttpResponse.json(result)
  }),
]
