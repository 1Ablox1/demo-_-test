import type { JobContext, JobIdentity } from '@/api/types'

/**
 * Canonical mock identities — legacy-shaped (Echo / OMS_JOB.JOB_NO).
 * Single source of truth while MSW is active; P1-A wire replaces with live API.
 */
export const MOCK_JOB_IDENTITIES: Record<number, JobIdentity> = {
  1024: {
    jobId: 'legacy-uuid-ai-1024',
    jobNo: 'AI20260715001',
    lob: 'AI',
    mbl: '999-12345675',
    hbl: '180-58439211',
  },
  2048: {
    jobId: 'legacy-uuid-ae-2048',
    jobNo: 'AE20260720001',
    lob: 'AE',
    mbl: '125-99887766',
    hbl: '180-58439211',
  },
  3056: {
    jobId: 'legacy-uuid-ae-3056',
    jobNo: 'AE20260722001',
    lob: 'AE',
    mbl: '176-44556677',
    hbl: '180-77665544',
  },
  /** Module 1 golden — maps to Echo `poc-job-001` at wire time */
  4096: {
    jobId: 'poc-job-001',
    jobNo: 'AI20260101001',
    lob: 'AI',
    mbl: '999-55443322',
    hbl: '160-44112233',
  },
  /** Module 1 AI quote draft — converts to 4096-class booking (no JOB_NO until convert) */
  8801: {
    jobId: 'draft-quote-ai-8801',
    jobNo: '',
    lob: 'AI',
    mbl: null,
    hbl: null,
  },
}

export function mockIdentityForShipment(shipmentId: number): JobIdentity {
  return (
    MOCK_JOB_IDENTITIES[shipmentId] ?? {
      jobId: `mock-${shipmentId}`,
      jobNo: '',
      lob: 'AE',
    }
  )
}

export function legacyJobNoForShipment(shipmentId: number): string {
  return mockIdentityForShipment(shipmentId).jobNo.trim()
}

/** Attach identity + lob from canonical map (MSW enrichment). */
export function enrichJobContext(job: JobContext): JobContext {
  const identity = mockIdentityForShipment(job.shipmentId)
  return {
    ...job,
    identity,
    lob: job.lob ?? identity.lob,
  }
}
