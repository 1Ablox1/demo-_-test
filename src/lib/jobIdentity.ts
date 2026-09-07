import type { LineOfBusiness, JobLob, JobIdentity } from '@/api/types'

/** LOB → job id prefix (mandatory on all desk / job surfaces). */
export const LOB_PREFIX: Record<LineOfBusiness, string> = {
  air_export: 'AE',
  air_import: 'AI',
  sea_export: 'SE',
  sea_import: 'SI',
  road_export: 'RE',
  road_import: 'RI',
}

export function lobPrefix(lob: LineOfBusiness): string {
  return LOB_PREFIX[lob]
}

/** Map short JobLob prefix (AI, AE, …) to LineOfBusiness slug for formatJobNo. */
export function lineOfBusinessFromJobLob(lob: JobLob | undefined): LineOfBusiness {
  switch (lob) {
    case 'AI':
      return 'air_import'
    case 'AE':
      return 'air_export'
    case 'SE':
      return 'sea_export'
    case 'SI':
      return 'sea_import'
    case 'RE':
      return 'road_export'
    case 'RI':
      return 'road_import'
    default:
      return 'air_import'
  }
}

/** e.g. formatJobNo('air_export', 1024) → 'AE-1024' — MSW fallback only; prefer identity.jobNo */
export function formatJobNo(lob: LineOfBusiness, shipmentId: number | string): string {
  return `${lobPrefix(lob)}-${shipmentId}`
}

export type JobNoSource = {
  identity?: JobIdentity | null
  lob?: JobLob | LineOfBusiness
  shipmentId?: number | string
}

/**
 * Display job number — legacy first (JOB_NO from API), never invent when identity is present but empty.
 * Used on all operator surfaces (desk, job shell, charges).
 */
export function displayJobNo(source: JobNoSource): string {
  const fromIdentity = source.identity?.jobNo?.trim()
  if (fromIdentity) return fromIdentity

  if (source.identity && !fromIdentity) return '—'

  const lobSlug =
    typeof source.lob === 'string' && source.lob.includes('_')
      ? (source.lob as LineOfBusiness)
      : lineOfBusinessFromJobLob(source.lob as JobLob | undefined)

  if (source.shipmentId != null && source.shipmentId !== '') {
    return formatJobNo(lobSlug, source.shipmentId)
  }

  return '—'
}

/** Parse LOB from legacy JOB_NO (AI20260101001) or mock prefix (AI-4096). */
export function lobFromJobNo(jobNo: string): LineOfBusiness {
  const trimmed = jobNo.trim()
  const legacy = trimmed.match(/^([A-Z]{2})\d/)
  if (legacy) {
    return lineOfBusinessFromJobLob(legacy[1] as JobLob)
  }
  const prefix = trimmed.split('-')[0]?.toUpperCase()
  switch (prefix) {
    case 'AE':
      return 'air_export'
    case 'AI':
      return 'air_import'
    case 'SE':
      return 'sea_export'
    case 'SI':
      return 'sea_import'
    case 'RE':
      return 'road_export'
    case 'RI':
      return 'road_import'
    default:
      return 'air_export'
  }
}
