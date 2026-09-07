/**
 * Map an exception-desk / Needs You row to the surface where the operator
 * finishes the work — never a side drawer.
 */
import type { RouteLocationRaw } from 'vue-router'
import { deskCtaLabel } from '@/lib/actionLabels'
import { airFromLobCode } from '@/lib/airWorkspace'
import { jobNoToId } from '@/lib/lob'
import type { WorkbenchJob } from '@/data/workbench'
import type { ShipmentRecord } from '@/stores/freight'
import type { SpineLobPrefix } from '@/types/spineLob'

/** Demo workbench ids → live freight / job-store ids when Job No does not match. */
const JOB_ID_ALIASES: Record<string, string> = {
  'job-1024': '8801',
  'job-2048': '8772',
  'job-3056': '8790',
  'job-4072': '4096',
  'job-5099': '8800',
  'job-6110': '4100',
  'job-8801': '8801',
}

export type ExceptionOp =
  | 'customs'
  | 'flight'
  | 'delivery'
  | 'charges'
  | 'invoice'
  | 'documents'
  | 'booking'
  | 'operate'

export function exceptionOperation(job: WorkbenchJob): ExceptionOp {
  const title = job.title.toLowerCase()
  const cta = deskCtaLabel(job).toLowerCase()
  const blob = `${title} ${cta} ${job.why.toLowerCase()}`

  if (
    blob.includes('invoice') ||
    cta.includes('approve') ||
    job.tab === 'approvals'
  ) {
    return 'invoice'
  }
  if (
    blob.includes('uninvoiced') ||
    blob.includes('accrue') ||
    blob.includes('money lock') ||
    blob.includes('d/o') ||
    blob.includes('delivery order') ||
    cta.includes('release')
  ) {
    return 'charges'
  }
  if (
    blob.includes('customs') ||
    blob.includes('declaration') ||
    blob.includes('clearance') ||
    cta.includes('customs') ||
    (job.hasGate && job.raci === 'A')
  ) {
    return 'customs'
  }
  if (blob.includes('quote') || blob.includes('convert') || cta.includes('convert')) {
    return 'booking'
  }
  if (
    blob.includes('schedule') ||
    blob.includes('carrier') ||
    blob.includes('flight') ||
    blob.includes('etd') ||
    blob.includes('eta')
  ) {
    return 'flight'
  }
  if (blob.includes('delivery') || blob.includes('pod')) {
    return 'delivery'
  }
  if (job.hasGate || blob.includes('document') || blob.includes('aes')) {
    return 'documents'
  }
  return 'operate'
}

function lobMatchesShipment(lob: SpineLobPrefix, ship: ShipmentRecord): boolean {
  if (lob === 'AI') return ship.lob === 'air_import'
  if (lob === 'AE') return ship.lob === 'air_export'
  return false
}

/** Resolve a workbench row to a navigable shipment / job id. */
export function resolveShipmentIdForException(
  job: WorkbenchJob,
  shipments: ShipmentRecord[],
  knownJobIds: string[],
): string | null {
  const jobNo = job.jobNo?.trim() ?? ''
  const digits =
    jobNoToId(jobNo) ||
    String(job.jobId ?? '')
      .replace(/^job-/i, '')
      .replace(/\D/g, '') ||
    ''

  const byJobId =
    shipments.find((s) => s.id === job.jobId) ??
    shipments.find((s) => s.id === JOB_ID_ALIASES[job.jobId])
  if (byJobId) return byJobId.id

  const byJobNo = shipments.find((s) => s.jobNo === jobNo)
  if (byJobNo) return byJobNo.id

  if (digits) {
    const byDigits =
      shipments.find((s) => s.id === digits || jobNoToId(s.jobNo) === digits) ??
      (knownJobIds.includes(digits) ? digits : null)
    if (byDigits) return typeof byDigits === 'string' ? byDigits : byDigits.id
  }

  const alias = JOB_ID_ALIASES[job.jobId]
  if (alias) {
    if (shipments.some((s) => s.id === alias) || knownJobIds.includes(alias)) return alias
  }

  const byLob = shipments.find((s) => lobMatchesShipment(job.lobPrefix, s))
  if (byLob) return byLob.id

  return knownJobIds[0] ?? shipments[0]?.id ?? null
}

function airQuery(job: WorkbenchJob, shipments: ShipmentRecord[], id: string) {
  const ship = shipments.find((s) => s.id === id)
  const air = ship ? airFromLobCode(ship.lob) : job.lobPrefix === 'AI' || job.lobPrefix === 'AE' ? job.lobPrefix : undefined
  return air ? { lob: air } : {}
}

/** Router location for “Resolve” — opens the operation surface directly. */
export function routeForExceptionResolve(
  job: WorkbenchJob,
  shipments: ShipmentRecord[],
  knownJobIds: string[],
): RouteLocationRaw | null {
  const op = exceptionOperation(job)
  const id = resolveShipmentIdForException(job, shipments, knownJobIds)
  if (!id && op !== 'booking') return null

  const lobQ =
    job.lobPrefix === 'AI' || job.lobPrefix === 'AE' ? { lob: job.lobPrefix } : {}

  if (op === 'booking') {
    return {
      name: 'orchestrate',
      query: { ...lobQ, from: 'exception-resolve' },
    }
  }

  if (!id) return null
  const air = airQuery(job, shipments, id)

  // Module 1 western job workspace — prefer /jobs/:id over shell shipment form
  switch (op) {
    case 'invoice':
      return { name: 'job-invoice', params: { shipmentId: id }, query: air }
    case 'charges':
      return { name: 'job-charges', params: { shipmentId: id }, query: air }
    case 'documents':
    case 'customs':
    case 'flight':
    case 'delivery':
    case 'operate':
    default:
      return { name: 'job-context', params: { shipmentId: id }, query: air }
  }
}
