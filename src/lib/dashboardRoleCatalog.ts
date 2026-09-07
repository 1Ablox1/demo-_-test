import type { Seat } from '@/stores/auth'
import type { TileKind } from '@/stores/dashboard'

/**
 * Smart Workbench catalog — which OS blocks each seat may choose.
 * Layout preference is per-seat (localStorage); choosable set is product doctrine.
 * Legacy Metabase boards arrive separately via GET /bi/dashboard/list (tenant-gated).
 */
export type BlockSource = 'os' | 'legacy_bi'

export interface BlockCatalogEntry {
  id: TileKind
  source: BlockSource
  /** Short hint in Edit blocks */
  hint: string
}

/** Full OS block definitions (labels live on DEFAULT_TILES in the store). */
export const BLOCK_CATALOG: Record<TileKind, BlockCatalogEntry> = {
  'bi-milestones': { id: 'bi-milestones', source: 'os', hint: 'Spine stage funnel' },
  'bi-uninvoiced': { id: 'bi-uninvoiced', source: 'os', hint: 'Money waiting to bill' },
  'bi-pending-quotes': { id: 'bi-pending-quotes', source: 'os', hint: 'Open commercial offers' },
  workload: { id: 'workload', source: 'os', hint: 'Your open desk items' },
  exceptions: { id: 'exceptions', source: 'os', hint: 'SLA / signal summary' },
  'milestone-quote': { id: 'milestone-quote', source: 'os', hint: 'Quote stage detail' },
  'milestone-booking': { id: 'milestone-booking', source: 'os', hint: 'Booking stage detail' },
  'milestone-docs': { id: 'milestone-docs', source: 'os', hint: 'Docs / gates stage' },
  'milestone-charges': { id: 'milestone-charges', source: 'os', hint: 'Charges stage' },
  'milestone-invoice': { id: 'milestone-invoice', source: 'os', hint: 'Invoice stage' },
  'queue-todo': { id: 'queue-todo', source: 'os', hint: 'R — To Do queue' },
  'queue-approvals': { id: 'queue-approvals', source: 'os', hint: 'A — Approvals queue' },
  'queue-following': { id: 'queue-following', source: 'os', hint: 'C/I — Following' },
  handoff: { id: 'handoff', source: 'os', hint: 'Next handoff strip' },
  'bi-legacy-embed': {
    id: 'bi-legacy-embed',
    source: 'legacy_bi',
    hint: 'Metabase embed from tenant BI API',
  },
}

/**
 * Palette each seat may turn on in Workbench.
 * Admin sees all. Others get role-relevant OS blocks + legacy BI when tenant allows.
 */
export const SEAT_CHOOSABLE: Record<Seat, TileKind[]> = {
  sales: [
    'bi-pending-quotes',
    'bi-milestones',
    'exceptions',
    'workload',
    'queue-todo',
    'queue-following',
    'milestone-quote',
    'milestone-booking',
    'handoff',
    'bi-legacy-embed',
  ],
  operations: [
    'bi-milestones',
    'bi-uninvoiced',
    'exceptions',
    'workload',
    'queue-todo',
    'milestone-docs',
    'milestone-booking',
    'milestone-charges',
    'handoff',
    'bi-legacy-embed',
  ],
  finance: [
    'bi-uninvoiced',
    'exceptions',
    'workload',
    'queue-approvals',
    'milestone-charges',
    'milestone-invoice',
    'bi-milestones',
    'bi-legacy-embed',
  ],
  admin: Object.keys(BLOCK_CATALOG) as TileKind[],
}

/** Default visible set when seat has no saved layout. */
export const SEAT_DEFAULT_VISIBLE: Record<Seat, TileKind[]> = {
  sales: ['bi-pending-quotes', 'bi-milestones', 'exceptions', 'workload', 'bi-legacy-embed'],
  operations: [
    'bi-milestones',
    'bi-uninvoiced',
    'exceptions',
    'workload',
    'bi-legacy-embed',
  ],
  finance: [
    'bi-uninvoiced',
    'exceptions',
    'queue-approvals',
    'milestone-charges',
    'bi-legacy-embed',
  ],
  admin: [
    'bi-milestones',
    'bi-uninvoiced',
    'bi-pending-quotes',
    'exceptions',
    'workload',
    'bi-legacy-embed',
  ],
}

export function isTileChoosable(seat: Seat, id: TileKind): boolean {
  return SEAT_CHOOSABLE[seat].includes(id)
}

export function choosableTiles(seat: Seat): TileKind[] {
  return SEAT_CHOOSABLE[seat]
}

export function defaultVisibleForSeat(seat: Seat): TileKind[] {
  return SEAT_DEFAULT_VISIBLE[seat]
}
