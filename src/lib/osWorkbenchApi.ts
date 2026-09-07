import type { BookingEntryPath } from '@/types/bookingWizard'
import type { SpineLobPrefix } from '@/types/spineLob'

/** Execution workspace — maps to Echo create-intent endpoints (mock seam). */
export type ExecutionType = 'quote' | 'booking'

export interface CreateJobIntent {
  executionType: ExecutionType
  lobPrefix: SpineLobPrefix
}

/** Query seam into Book (`/orchestrate`) — single create path for Needs You + Book. */
export interface BookCreateQuery {
  create: '1'
  /** Optional intent prefill for Start Booking modal */
  path?: BookingEntryPath
  lob?: SpineLobPrefix
  /** Provenance for idle banner */
  from?: 'needs-you' | 'quote-new' | 'job-new'
}

export interface CreateJobRouteTarget {
  name: 'orchestrate'
  query: BookCreateQuery
}

/**
 * Thin routing seam — create always lands in Book.
 * Future: POST /os/jobs/intent → redirect URL from control plane.
 */
export function routeForCreateJob(intent: CreateJobIntent): CreateJobRouteTarget {
  return {
    name: 'orchestrate',
    query: {
      create: '1',
      path: intent.executionType === 'quote' ? 'from_quote' : 'direct',
      lob: intent.lobPrefix,
    },
  }
}

/** Needs You / desk header CTA — open Book start modal with no prefills. */
export function routeForNewBooking(from: BookCreateQuery['from'] = 'needs-you'): CreateJobRouteTarget {
  return {
    name: 'orchestrate',
    query: { create: '1', from },
  }
}

export function parseBookCreateQuery(query: Record<string, unknown>): {
  open: boolean
  entryPath?: BookingEntryPath
  lobPrefix?: SpineLobPrefix
  from?: BookCreateQuery['from']
} {
  const create = query.create === '1' || query.create === 1 || query.start === '1'
  const pathRaw = typeof query.path === 'string' ? query.path : ''
  const entryPath =
    pathRaw === 'from_quote' || pathRaw === 'direct' ? (pathRaw as BookingEntryPath) : undefined
  const lobRaw = typeof query.lob === 'string' ? query.lob.toUpperCase() : ''
  const lobPrefix = isSpineLob(lobRaw) ? lobRaw : undefined
  const fromRaw = typeof query.from === 'string' ? query.from : undefined
  const from =
    fromRaw === 'needs-you' || fromRaw === 'quote-new' || fromRaw === 'job-new' ? fromRaw : undefined
  return { open: !!create, entryPath, lobPrefix, from }
}

function isSpineLob(v: string): v is SpineLobPrefix {
  return ['AE', 'AI', 'OE', 'OI', 'TR'].includes(v)
}
