import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Seat } from '@/stores/auth'
import { useAuthStore } from '@/stores/auth'
import {
  defaultVisibleForSeat,
  isTileChoosable,
  BLOCK_CATALOG,
} from '@/lib/dashboardRoleCatalog'
import type { ExceptionSignal } from '@/data/dashboardMetrics'
import type { ExceptionFilterId } from '@/lib/exceptionDesk'
import {
  GRID_COLS,
  TIER_SIZE,
  TILE_PACK_PRIORITY,
  dimsForTier,
  findOpenSlot,
  legacySizeFromTier,
  packTiles,
  packTilesScatter,
  tierFromLegacySize,
  type GridRect,
  type TileTier,
} from '@/lib/dashboardGrid'

export type TileKind =
  | 'bi-milestones'
  | 'bi-uninvoiced'
  | 'bi-pending-quotes'
  | 'bi-legacy-embed'
  | 'workload'
  | 'exceptions'
  | 'milestone-quote'
  | 'milestone-booking'
  | 'milestone-docs'
  | 'milestone-charges'
  | 'milestone-invoice'
  | 'queue-todo'
  | 'queue-approvals'
  | 'queue-following'
  | 'handoff'

export type LayoutStyle = 'neat' | 'scatter'

/** Legacy size token — maps to fixed grid tiers (compact → hero). */
export type TileSize = 'sm' | 'md' | 'lg' | 'wide'

/** Grid cell size for each size token (12-column board). */
export const SIZE_GRID: Record<TileSize, { w: number; h: number }> = {
  sm: dimsForTier('compact'),
  md: dimsForTier('medium'),
  lg: dimsForTier('large'),
  wide: dimsForTier('hero'),
}

export interface DashboardTileConfig {
  id: TileKind
  label: string
  size: TileSize
  tier: TileTier
  visible: boolean
  alertThreshold: number
  x: number
  y: number
  w: number
  h: number
}

export interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  static?: boolean
}

/** Command-center BI blocks (Dashboard look) + deeper spine tiles for Workbench. */
const DEFAULT_TILES: Omit<DashboardTileConfig, 'x' | 'y' | 'w' | 'h' | 'tier'>[] = [
  { id: 'bi-milestones', label: 'Cargo milestones', size: 'md', visible: true, alertThreshold: 0 },
  { id: 'bi-uninvoiced', label: 'Uninvoiced charges', size: 'md', visible: true, alertThreshold: 0 },
  { id: 'bi-pending-quotes', label: 'Pending quotes', size: 'md', visible: true, alertThreshold: 0 },
  {
    id: 'bi-legacy-embed',
    label: 'Legacy BI analysis',
    size: 'wide',
    visible: true,
    alertThreshold: 0,
  },
  { id: 'exceptions', label: 'Alert summary', size: 'lg', visible: true, alertThreshold: 1 },
  { id: 'workload', label: 'My workload', size: 'md', visible: true, alertThreshold: 0 },
  { id: 'milestone-quote', label: 'Quote stage', size: 'sm', visible: false, alertThreshold: 0 },
  { id: 'milestone-booking', label: 'Booking stage', size: 'sm', visible: false, alertThreshold: 0 },
  { id: 'milestone-docs', label: 'Docs stage', size: 'sm', visible: false, alertThreshold: 0 },
  { id: 'milestone-charges', label: 'Charges stage', size: 'sm', visible: false, alertThreshold: 0 },
  { id: 'milestone-invoice', label: 'Invoice stage', size: 'sm', visible: false, alertThreshold: 0 },
  { id: 'queue-todo', label: 'My tasks', size: 'md', visible: false, alertThreshold: 0 },
  { id: 'queue-approvals', label: 'To approve', size: 'md', visible: false, alertThreshold: 0 },
  { id: 'queue-following', label: 'Watching', size: 'md', visible: false, alertThreshold: 0 },
  { id: 'handoff', label: 'Next steps', size: 'md', visible: false, alertThreshold: 0 },
]

const STORAGE_KEY = (seat: Seat) => `os-dashboard-grid-v6-${seat}`

function tileWithTier(
  base: Omit<DashboardTileConfig, 'x' | 'y' | 'w' | 'h' | 'tier'>,
  rect?: GridRect,
): DashboardTileConfig {
  const tier = tierFromLegacySize(base.size)
  const dims = dimsForTier(tier)
  return {
    ...base,
    tier,
    size: legacySizeFromTier(tier),
    x: rect?.x ?? 0,
    y: rect?.y ?? 0,
    w: rect?.w ?? dims.w,
    h: rect?.h ?? dims.h,
  }
}

function withPackedGrid(
  base: Omit<DashboardTileConfig, 'x' | 'y' | 'w' | 'h' | 'tier'>[],
  visibleIds: TileKind[],
): DashboardTileConfig[] {
  const visible = base.filter((t) => visibleIds.includes(t.id))
  const packed = packTiles(
    visible.map((t) => ({
      id: t.id,
      tier: tierFromLegacySize(t.size),
    })),
  )
  const byId = new Map(packed.map((r) => [r.id, r]))
  return base.map((t) =>
    tileWithTier(
      { ...t, visible: visibleIds.includes(t.id) },
      byId.get(t.id),
    ),
  )
}

function looksLikePixelLayout(t: Partial<DashboardTileConfig>): boolean {
  return (t.w ?? 0) > GRID_COLS || (t.h ?? 0) > 24
}

function normalizeTile(raw: Partial<DashboardTileConfig> & { id: TileKind }): DashboardTileConfig {
  const fallback = DEFAULT_TILES.find((t) => t.id === raw.id) ?? DEFAULT_TILES[0]
  const tier = (raw.tier ?? tierFromLegacySize((raw.size ?? fallback.size) as TileSize)) as TileTier
  const dims = dimsForTier(tier)
  const stale = looksLikePixelLayout(raw)
  return {
    id: raw.id,
    label: fallback.label,
    size: legacySizeFromTier(tier),
    tier,
    visible: raw.visible ?? true,
    alertThreshold: raw.alertThreshold ?? fallback.alertThreshold,
    x: !stale && typeof raw.x === 'number' ? raw.x : 0,
    y: !stale && typeof raw.y === 'number' ? raw.y : 0,
    w: !stale && typeof raw.w === 'number' ? raw.w : dims.w,
    h: !stale && typeof raw.h === 'number' ? raw.h : dims.h,
  }
}

function defaultLayout(seat: Seat): DashboardTileConfig[] {
  return withPackedGrid(DEFAULT_TILES, defaultVisibleForSeat(seat))
}

function loadLayout(seat: Seat): DashboardTileConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(seat))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardTileConfig>[]
      if (Array.isArray(parsed) && parsed.length) {
        const byId = new Map(parsed.filter((t) => t?.id).map((t) => [t.id as TileKind, t]))
        return DEFAULT_TILES.map((def) => {
          const merged = normalizeTile({ ...def, ...(byId.get(def.id) ?? {}) })
          // Enforce role palette: non-choosable blocks stay off
          if (!isTileChoosable(seat, merged.id)) {
            merged.visible = false
          }
          return merged
        })
      }
    }
  } catch {
    /* ignore */
  }
  return defaultLayout(seat)
}

function placedRects(tiles: DashboardTileConfig[]): GridRect[] {
  return tiles
    .filter((t) => t.visible)
    .map((t) => ({ id: t.id, x: t.x, y: t.y, w: t.w, h: t.h }))
}

export const useDashboardStore = defineStore('dashboard', () => {
  const auth = useAuthStore()
  const tiles = ref<DashboardTileConfig[]>(loadLayout(auth.seat))
  const customizerOpen = ref(false)
  const expandedTileId = ref<TileKind | null>(null)
  /** Multiple focus panels can stay open at once (click more tiles). */
  const openDrawerIds = ref<TileKind[]>([])
  /** Stable corner slot 0–3 per open panel — must not change on focus/click. */
  const drawerSlotById = ref<Partial<Record<TileKind, number>>>({})
  /** Which panel is on top (z-order / Esc target) — independent of corner slot. */
  const focusedDrawerId = ref<TileKind | null>(null)
  const arrangeMode = ref(false)
  const draggingId = ref<TileKind | null>(null)
  /** Ignore tile clicks briefly after a drag so drop does not open the drawer. */
  const clickGuardUntil = ref(0)
  /** Focus Needs You exception desk from BI tiles (My tasks / Alerts). */
  const needsYouFocus = ref<{ tab: 'tasks' | 'approvals' | 'watching'; nonce: number } | null>(null)
  /** Optional KPI filter overlay on the Needs You AG Grid. */
  const activeFilterTile = ref<ExceptionFilterId | null>(null)

  function toggleExceptionFilter(id: ExceptionFilterId) {
    activeFilterTile.value = activeFilterTile.value === id ? null : id
  }

  function clearExceptionFilter() {
    activeFilterTile.value = null
  }

  function focusNeedsYouDesk(tab: 'tasks' | 'approvals' | 'watching' = 'tasks') {
    closeAllDrawers()
    clearExceptionFilter()
    needsYouFocus.value = { tab, nonce: Date.now() }
  }

  /** Default Auto-fit style — neat pack, or organic scatter. */
  const layoutStyle = ref<LayoutStyle>(
    (localStorage.getItem('os-dash-layout-style') as LayoutStyle | null) ?? 'neat',
  )

  const drawerOpen = computed(() => openDrawerIds.value.length > 0)
  /** Focused panel for Esc / chrome — not array order (corners stay fixed). */
  const drawerTileId = computed(
    () => focusedDrawerId.value ?? openDrawerIds.value[openDrawerIds.value.length - 1] ?? null,
  )

  const signalSensitivity = ref<Record<ExceptionSignal, number>>({
    burn_down: 1,
    time_up: 1,
    early_warning: 2,
    discrepancy: 1,
    abnormal_pattern: 2,
  })

  const visibleTiles = computed(() =>
    tiles.value.filter((t) => t.visible && isTileChoosable(auth.seat, t.id)),
  )

  /** Blocks this seat may toggle in Workbench Edit blocks. */
  const choosableTileConfigs = computed(() =>
    tiles.value.filter((t) => isTileChoosable(auth.seat, t.id)),
  )

  const gridLayout = computed<GridLayoutItem[]>({
    get: () =>
      visibleTiles.value.map((t) => ({
        i: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        static: !arrangeMode.value,
      })),
    set: (next) => {
      applyGridLayout(next)
    },
  })

  watch(
    () => auth.seat,
    (seat) => {
      tiles.value = loadLayout(seat)
    },
  )

  function persist() {
    localStorage.setItem(STORAGE_KEY(auth.seat), JSON.stringify(tiles.value))
  }

  /** Full repack of visible blocks — neat (default) or scatter (random valid slots). */
  function repackVisible(style?: LayoutStyle) {
    const mode = style ?? layoutStyle.value
    layoutStyle.value = mode
    localStorage.setItem('os-dash-layout-style', mode)
    const visible = tiles.value.filter((t) => t.visible)
    const input = visible.map((t) => ({
      id: t.id,
      tier: t.tier,
      priority: TILE_PACK_PRIORITY[t.id],
    }))
    const packed = mode === 'scatter' ? packTilesScatter(input) : packTiles(input)
    const byId = new Map(packed.map((r) => [r.id, r]))
    for (const t of tiles.value) {
      const rect = byId.get(t.id)
      if (!rect || !t.visible) continue
      t.x = rect.x
      t.y = rect.y
      t.w = rect.w
      t.h = rect.h
    }
    persist()
  }

  function setLayoutStyle(style: LayoutStyle) {
    layoutStyle.value = style
    localStorage.setItem('os-dash-layout-style', style)
    repackVisible(style)
  }

  function applyGridLayout(next: { i: string | number; x: number; y: number; w: number; h: number }[]) {
    for (const item of next) {
      const t = tiles.value.find((x) => x.id === String(item.i))
      if (!t) continue
      t.x = item.x
      t.y = item.y
      t.w = item.w
      t.h = item.h
    }
    persist()
  }

  function toggleTile(id: TileKind) {
    if (!isTileChoosable(auth.seat, id)) return
    const t = tiles.value.find((x) => x.id === id)
    if (!t) return
    t.visible = !t.visible
    if (t.visible) {
      const others = placedRects(tiles.value.filter((x) => x.id !== id))
      const spot = findOpenSlot(t.w, t.h, others)
      t.x = spot.x
      t.y = spot.y
    } else {
      repackVisible()
    }
    persist()
  }

  function setTileSize(id: TileKind, size: TileSize) {
    const t = tiles.value.find((x) => x.id === id)
    if (!t) return
    const tier = tierFromLegacySize(size)
    t.size = size
    t.tier = tier
    const dims = dimsForTier(tier)
    t.w = dims.w
    t.h = dims.h
    if (t.visible) {
      const others = placedRects(tiles.value.filter((x) => x.id !== id))
      const spot = findOpenSlot(t.w, t.h, others)
      t.x = spot.x
      t.y = spot.y
    }
    persist()
  }

  function resetToRoleDefault() {
    localStorage.removeItem(STORAGE_KEY(auth.seat))
    tiles.value = defaultLayout(auth.seat)
  }

  function armClickGuard(ms = 450) {
    clickGuardUntil.value = Date.now() + ms
  }

  /** Four corner slots: top-left · top-right · bottom-left · bottom-right */
  const MAX_OPEN_DRAWERS = 4

  function firstFreeSlot(): number | null {
    const used = new Set(
      Object.values(drawerSlotById.value).filter((n): n is number => typeof n === 'number'),
    )
    for (let i = 0; i < MAX_OPEN_DRAWERS; i++) {
      if (!used.has(i)) return i
    }
    return null
  }

  function releaseSlot(id: TileKind) {
    if (drawerSlotById.value[id] == null) return
    const next = { ...drawerSlotById.value }
    delete next[id]
    drawerSlotById.value = next
  }

  function openDrawer(id: TileKind) {
    // Moving blocks: never open the side list
    if (arrangeMode.value) return
    if (draggingId.value) return
    if (Date.now() < clickGuardUntil.value) return

    if (openDrawerIds.value.includes(id)) {
      // Already open — raise focus only; keep corner slot
      focusedDrawerId.value = id
      return
    }

    let slot = firstFreeSlot()
    let nextIds = [...openDrawerIds.value]

    if (slot == null) {
      // At cap — evict oldest, reuse its corner
      const oldest = nextIds[0]
      if (!oldest) return
      slot = drawerSlotById.value[oldest] ?? 0
      releaseSlot(oldest)
      nextIds = nextIds.slice(1)
    }

    drawerSlotById.value = { ...drawerSlotById.value, [id]: slot }
    openDrawerIds.value = [...nextIds, id]
    focusedDrawerId.value = id
  }

  function closeDrawer(id?: TileKind | null) {
    if (id == null) {
      openDrawerIds.value = []
      drawerSlotById.value = {}
      focusedDrawerId.value = null
      return
    }
    openDrawerIds.value = openDrawerIds.value.filter((x) => x !== id)
    releaseSlot(id)
    if (focusedDrawerId.value === id) {
      focusedDrawerId.value = openDrawerIds.value[openDrawerIds.value.length - 1] ?? null
    }
  }

  function closeAllDrawers() {
    openDrawerIds.value = []
    drawerSlotById.value = {}
    focusedDrawerId.value = null
  }

  /** Raise z-order only — never move the panel to another corner. */
  function focusDrawer(id: TileKind) {
    if (!openDrawerIds.value.includes(id)) return
    focusedDrawerId.value = id
  }

  function slotForDrawer(id: TileKind): number {
    return drawerSlotById.value[id] ?? 0
  }

  function toggleExpand(id: TileKind) {
    expandedTileId.value = expandedTileId.value === id ? null : id
  }

  return {
    tiles,
    visibleTiles,
    choosableTileConfigs,
    gridLayout,
    customizerOpen,
    expandedTileId,
    drawerOpen,
    drawerTileId,
    openDrawerIds,
    drawerSlotById,
    focusedDrawerId,
    arrangeMode,
    draggingId,
    clickGuardUntil,
    layoutStyle,
    signalSensitivity,
    activeFilterTile,
    needsYouFocus,
    toggleExceptionFilter,
    clearExceptionFilter,
    focusNeedsYouDesk,
    toggleTile,
    setTileSize,
    applyGridLayout,
    repackVisible,
    setLayoutStyle,
    resetToRoleDefault,
    openDrawer,
    closeDrawer,
    closeAllDrawers,
    focusDrawer,
    slotForDrawer,
    toggleExpand,
    armClickGuard,
    persist,
    isTileChoosable: (id: TileKind) => isTileChoosable(auth.seat, id),
    blockHint: (id: TileKind) => BLOCK_CATALOG[id]?.hint ?? '',
    TIER_SIZE,
  }
})
