import { numberingMockDb } from '@/mocks/numberingStore'
import type { AssignJobNumbersRequest, AssignJobNumbersResponse } from '@/mdm/numberingTypes'
import type { MasterOption, QuickCreateCustomerInput } from '@/mdm/types'
import { adapterAudit } from '@/mock-stack/adapter/audit'
import { legacyBooking } from '@/mock-stack/legacy/booking'
import { legacyMdm, type MdmSearchKind } from '@/mock-stack/legacy/mdm'
import { setNumberingOverlay } from '@/mock-stack/runtime'

/**
 * ACL — Anti-Corruption Layer to legacy CargoWare (mock).
 * Control-plane calls this; UI never calls legacy directly.
 * Operational MDM: search / quick-create / approve only — not full Basic Information.
 */
export const cargowareAdapter = {
  searchMdm(query: string, kind: MdmSearchKind): MasterOption[] {
    const result = legacyMdm.searchPartners(query, kind)
    adapterAudit('mdm-service', 'searchPartners', { query, kind }, `${result.length} hits`)
    return result
  },

  createPartyDraft(input: QuickCreateCustomerInput): MasterOption {
    const result = legacyMdm.createPartyDraft(input)
    adapterAudit('mdm-service', 'createPartyDraft', input, result.value)
    return result
  },

  approveParty(value: string) {
    legacyMdm.approveParty(value)
    adapterAudit('mdm-service', 'approveParty', { value }, 'approved')
  },

  assignJobNumbers(req: AssignJobNumbersRequest): AssignJobNumbersResponse | { error: string; status: number } {
    const result = numberingMockDb.assignJobNumbers(req)
    if ('error' in result && typeof result.error === 'string') {
      adapterAudit('sys-service', 'assignJobNumbers', req, `error: ${result.error}`)
      return { error: result.error, status: result.status ?? 500 }
    }
    if (!('jobNo' in result)) {
      return { error: 'Unexpected response', status: 500 }
    }
    setNumberingOverlay(req.shipmentId, { jobNo: result.jobNo, hawb: result.hawb })
    legacyBooking.patchAirExportJob(req.shipmentId, {
      jobNo: result.jobNo,
      hawb: result.hawb,
      operateType: req.operateType === 'direct' ? 2 : 0,
      mblOnly: req.operateType === 'direct',
    })
    adapterAudit(
      'booking-service',
      'saveAirExportJob + ConfigDef numbering',
      req,
      `${result.jobNo} / hawb=${result.hawb ?? '—'}`,
    )
    return result
  },

  allocateMawb(jobId: string, jobNo: string, airlineId?: string) {
    const result = numberingMockDb.allocateMawb(jobId, jobNo, airlineId)
    if ('error' in result && typeof result.error === 'string') {
      adapterAudit('booking-service', 'allocateMAWB', { jobId, jobNo }, result.error)
      return { error: result.error, status: result.status ?? 409 }
    }
    const shipmentId = Number(jobId)
    if (Number.isFinite(shipmentId)) {
      legacyBooking.patchAirExportJob(shipmentId, { mawb: result.mawb.replace(/-/g, '') })
    }
    adapterAudit('booking-service', 'allocateMAWB', { jobId, jobNo }, result.mawb)
    return result
  },
}
