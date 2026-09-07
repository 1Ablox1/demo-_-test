import { jobContextByShipment } from '@/mocks/fixtures/jobs'
import type { LegacyAirExportJob } from '@/mock-stack/legacy/types'
import { getLife, getNumberingOverlay } from '@/mock-stack/runtime'

const legacyJobs: Record<number, LegacyAirExportJob> = {}

function seedFromFixture(shipmentId: number): LegacyAirExportJob | null {
  const life = getLife(shipmentId)
  const ctx = jobContextByShipment[shipmentId]
  if (!life && !ctx) return null
  const nums = getNumberingOverlay(shipmentId)
  return {
    uuid: ctx?.identity?.jobId ?? `legacy-job-${shipmentId}`,
    jobNo: nums?.jobNo ?? ctx?.identity?.jobNo?.trim() ?? life?.jobNo ?? '—',
    hawb: nums?.hawb ?? life?.hawb ?? ctx?.ops.hawb ?? null,
    mawb: life?.mawb ?? ctx?.ops.mawb ?? null,
    operateType: 0,
    mblOnly: false,
    customerName: life?.customer ?? ctx?.summary.customer ?? '—',
    lane: life?.lane ?? ctx?.summary.route ?? '—',
    opOffice: 'STO',
  }
}

export const legacyBooking = {
  getAirExportJob(shipmentId: number): LegacyAirExportJob | null {
    if (!legacyJobs[shipmentId]) {
      const seeded = seedFromFixture(shipmentId)
      if (!seeded) return null
      legacyJobs[shipmentId] = seeded
    }
    const nums = getNumberingOverlay(shipmentId)
    if (nums) {
      legacyJobs[shipmentId].jobNo = nums.jobNo
      legacyJobs[shipmentId].hawb = nums.hawb
    }
    return legacyJobs[shipmentId]
  },

  patchAirExportJob(
    shipmentId: number,
    patch: Partial<Pick<LegacyAirExportJob, 'jobNo' | 'hawb' | 'mawb' | 'operateType' | 'mblOnly'>>,
  ): LegacyAirExportJob | null {
    const job = this.getAirExportJob(shipmentId)
    if (!job) return null
    Object.assign(job, patch)
    if (patch.operateType === 2) {
      job.mblOnly = true
      job.hawb = null
    }
    return job
  },
}
