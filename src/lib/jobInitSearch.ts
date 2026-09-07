/**
 * Direct-booking init search — find existing job before create (dedupe).
 * Basic = single keyword (same rules as ⌘K). Advanced = structured ops identity fields.
 */
import type { OsSearchEntry } from '@/lib/searchIndex'
import { filterOsSearchIndex } from '@/lib/searchIndex'
import type { CreateJobLobPrefix } from '@/lib/createJobIntent'

export interface JobInitAdvancedCriteria {
  jobNo: string
  mawb: string
  hawb: string
  customer: string
  origin: string
  destination: string
  airline: string
  customerRef: string
  /** ISO date yyyy-mm-dd — soft match against lane/eta labels when present */
  etaFrom: string
  etaTo: string
}

export function emptyAdvancedCriteria(): JobInitAdvancedCriteria {
  return {
    jobNo: '',
    mawb: '',
    hawb: '',
    customer: '',
    origin: '',
    destination: '',
    airline: '',
    customerRef: '',
    etaFrom: '',
    etaTo: '',
  }
}

export function advancedCriteriaActive(c: JobInitAdvancedCriteria): boolean {
  return Object.values(c).some((v) => String(v).trim().length > 0)
}

function includesLoose(hay: string | null | undefined, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (!n) return true
  return (hay ?? '').toLowerCase().includes(n)
}

function portsFromLane(lane: string): { origin: string; destination: string } {
  const parts = lane.split(/\s*→\s*|\s*->\s*/)
  return {
    origin: (parts[0] ?? '').trim(),
    destination: (parts[1] ?? '').trim(),
  }
}

/** Filter index by LOB + basic query and/or advanced criteria. */
export function filterJobsForInit(
  entries: OsSearchEntry[],
  opts: {
    lobPrefix: CreateJobLobPrefix
    basicQuery: string
    advanced: JobInitAdvancedCriteria
    advancedOpen: boolean
  },
): OsSearchEntry[] {
  const lobNeedle = opts.lobPrefix.toLowerCase()
  let pool = entries.filter((e) => {
    const lob = e.lob.toLowerCase()
    return (
      lob === lobNeedle ||
      lob.includes(lobNeedle) ||
      (lobNeedle === 'ai' && (lob.includes('air import') || lob === 'ai')) ||
      (lobNeedle === 'ae' && (lob.includes('air export') || lob === 'ae'))
    )
  })

  // Quote drafts are not operational bookings
  pool = pool.filter((e) => e.shipmentId !== 8801 && Boolean(e.jobNo?.trim()))

  if (opts.advancedOpen && advancedCriteriaActive(opts.advanced)) {
    const a = opts.advanced
    pool = pool.filter((e) => {
      const ports = portsFromLane(e.lane)
      return (
        includesLoose(e.jobNo, a.jobNo) &&
        includesLoose(e.mawb, a.mawb) &&
        includesLoose(e.hawb, a.hawb) &&
        includesLoose(e.customer, a.customer) &&
        includesLoose(ports.origin || e.lane, a.origin) &&
        includesLoose(ports.destination || e.lane, a.destination) &&
        includesLoose(e.airline ?? e.lane, a.airline) &&
        includesLoose(e.customerRef ?? e.customer, a.customerRef) &&
        includesLoose(e.etaLabel ?? '', a.etaFrom) &&
        includesLoose(e.etaLabel ?? '', a.etaTo)
      )
    })
    return pool.slice(0, 20)
  }

  return filterOsSearchIndex(pool, opts.basicQuery).slice(0, 12)
}
