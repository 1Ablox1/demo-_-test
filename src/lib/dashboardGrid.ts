import type { TileKind } from '@/stores/dashboard'

/** Standard 12-column bento board (matches Grid Layout Plus default). */
export const GRID_COLS = 12

/**
 * Fixed size tiers — chosen so a full admin board packs without gaps:
 * My work 8×4 + Alerts 4×4 (top), four milestones 3×3 (full row),
 * three queues 4×4 (full row), Next steps 4×4.
 */
export type TileTier = 'hero' | 'large' | 'medium' | 'compact'

export const TIER_SIZE: Record<TileTier, { w: number; h: number; label: string }> = {
  hero: { w: 8, h: 4, label: 'Hero (8×4)' },
  large: { w: 4, h: 4, label: 'Large (4×4)' },
  medium: { w: 4, h: 4, label: 'Medium (4×4)' },
  compact: { w: 3, h: 3, label: 'Compact (3×3)' },
}

/** Default tier per block type. */
export const TILE_DEFAULT_TIER: Record<TileKind, TileTier> = {
  'bi-milestones': 'medium',
  'bi-uninvoiced': 'medium',
  'bi-pending-quotes': 'medium',
  'bi-legacy-embed': 'hero',
  workload: 'medium',
  exceptions: 'large',
  'milestone-quote': 'compact',
  'milestone-booking': 'compact',
  'milestone-docs': 'compact',
  'milestone-charges': 'compact',
  'milestone-invoice': 'compact',
  'queue-todo': 'medium',
  'queue-approvals': 'medium',
  'queue-following': 'medium',
  handoff: 'medium',
}

/** Pack order — command-center BI first, then deep tiles. */
export const TILE_PACK_PRIORITY: Record<TileKind, number> = {
  'bi-legacy-embed': 0,
  'bi-milestones': 1,
  'bi-uninvoiced': 2,
  'bi-pending-quotes': 3,
  exceptions: 4,
  workload: 5,
  'milestone-quote': 10,
  'milestone-booking': 11,
  'milestone-docs': 12,
  'milestone-charges': 13,
  'milestone-invoice': 14,
  'queue-todo': 20,
  'queue-approvals': 21,
  'queue-following': 22,
  handoff: 30,
}

export interface GridRect {
  id: TileKind
  x: number
  y: number
  w: number
  h: number
}

export interface PackInput {
  id: TileKind
  tier: TileTier
  priority?: number
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function canPlace(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: GridRect[],
  cols: number,
): boolean {
  if (x + w > cols) return false
  for (const p of placed) {
    if (rectsOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) return false
  }
  return true
}

/** First-fit top-left slot on the board. */
export function findOpenSlot(
  w: number,
  h: number,
  placed: GridRect[],
  cols = GRID_COLS,
): { x: number; y: number } {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x <= cols - w; x++) {
      if (canPlace(x, y, w, h, placed, cols)) return { x, y }
    }
  }
  return { x: 0, y: 0 }
}

/** Pack visible blocks into a clean grid using fixed tiers and priority order. */
export function packTiles(items: PackInput[], cols = GRID_COLS): GridRect[] {
  const sorted = [...items].sort(
    (a, b) =>
      (a.priority ?? TILE_PACK_PRIORITY[a.id]) - (b.priority ?? TILE_PACK_PRIORITY[b.id]),
  )
  const placed: GridRect[] = []

  for (const item of sorted) {
    const { w, h } = TIER_SIZE[item.tier]
    const spot = findOpenSlot(w, h, placed, cols)
    placed.push({ id: item.id, x: spot.x, y: spot.y, w, h })
  }

  return placed
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/**
 * Organic scatter: same fixed sizes, shuffled order, random valid slots
 * with a slight bias toward the top of the board so it feels lively but readable.
 */
export function packTilesScatter(items: PackInput[], cols = GRID_COLS, seed?: number): GridRect[] {
  let s = seed ?? (Date.now() % 1_000_000)
  const rng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }

  const shuffled = [...items]
  shuffleInPlace(shuffled, rng)
  const placed: GridRect[] = []

  for (const item of shuffled) {
    const { w, h } = TIER_SIZE[item.tier]
    const candidates: { x: number; y: number; score: number }[] = []
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x <= cols - w; x++) {
        if (!canPlace(x, y, w, h, placed, cols)) continue
        // Prefer upper board + a bit of randomness
        const score = y * 3 + Math.abs(x - cols / 2) * 0.2 + rng() * 8
        candidates.push({ x, y, score })
      }
    }
    if (!candidates.length) {
      const spot = findOpenSlot(w, h, placed, cols)
      placed.push({ id: item.id, x: spot.x, y: spot.y, w, h })
      continue
    }
    candidates.sort((a, b) => a.score - b.score)
    // Pick among the best ~30% randomly
    const pool = candidates.slice(0, Math.max(3, Math.ceil(candidates.length * 0.3)))
    const pick = pool[Math.floor(rng() * pool.length)]!
    placed.push({ id: item.id, x: pick.x, y: pick.y, w, h })
  }

  return placed
}

export function tierForKind(id: TileKind, tierOverride?: TileTier): TileTier {
  return tierOverride ?? TILE_DEFAULT_TIER[id]
}

export function dimsForTier(tier: TileTier): { w: number; h: number } {
  const { w, h } = TIER_SIZE[tier]
  return { w, h }
}

export type LegacyTileSize = 'sm' | 'md' | 'lg' | 'wide'

export const LEGACY_SIZE_TO_TIER: Record<LegacyTileSize, TileTier> = {
  sm: 'compact',
  md: 'medium',
  lg: 'large',
  wide: 'hero',
}

export const TIER_TO_LEGACY_SIZE: Record<TileTier, LegacyTileSize> = {
  compact: 'sm',
  medium: 'md',
  large: 'lg',
  hero: 'wide',
}

export function tierFromLegacySize(size: LegacyTileSize): TileTier {
  return LEGACY_SIZE_TO_TIER[size]
}

export function legacySizeFromTier(tier: TileTier): LegacyTileSize {
  return TIER_TO_LEGACY_SIZE[tier]
}
