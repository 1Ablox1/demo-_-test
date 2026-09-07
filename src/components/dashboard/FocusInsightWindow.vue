<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { GripVertical, Scaling, X } from '@lucide/vue'
import ExceptionDeskTable from '@/components/dashboard/ExceptionDeskTable.vue'
import {
  insightBlurb,
  workbenchJobsForTile,
  workloadSummary,
  type DashboardTileKind,
} from '@/data/dashboardMetrics'
import type { WorkbenchJob } from '@/data/workbench'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

type DockCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const CORNERS: DockCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

const MIN_W = 280
const MIN_H = 220
/** Default popup table size (exact product dimension). */
const PANEL_W = 751
const PANEL_H = 349
const GAP = 10
const CHROME_TOP_FALLBACK = 88
const BOTTOM_CHIP = 52

const props = defineProps<{
  tileId: DashboardTileKind
  /** 0–3 maps to top-left → top-right → bottom-left → bottom-right */
  stackIndex: number
  focused: boolean
  /** How many panels are open (for layout). */
  openCount: number
}>()

const emit = defineEmits<{
  close: []
  focus: []
  resolve: [job: WorkbenchJob]
  openJob: [job: WorkbenchJob]
  toast: [message: string, kind?: 'success' | 'info' | 'warn']
}>()

const auth = useAuthStore()
const dash = useDashboardStore()

const title = computed(
  () => dash.tiles.find((x) => x.id === props.tileId)?.label ?? 'Focus',
)

const jobs = computed(() => workbenchJobsForTile(auth.seat, props.tileId))
const blurb = computed(() => insightBlurb(props.tileId, jobs.value.length))

const corner = computed<DockCorner>(() => CORNERS[props.stackIndex % 4]!)

const panelPos = ref({ x: GAP, y: CHROME_TOP_FALLBACK + GAP })
const panelSize = ref({ w: PANEL_W, h: PANEL_H })
const userSized = ref(false)

const dragging = ref(false)
const resizing = ref(false)
let dragOrigin = { mx: 0, my: 0, x: 0, y: 0 }
let resizeOrigin = { mx: 0, my: 0, w: 0, h: 0, x: 0, y: 0, corner: 'top-right' as DockCorner }

function chromeBottom(): number {
  const shell = document.querySelector('[data-sticky-region="global-shell"]')
  if (shell instanceof HTMLElement) {
    return Math.ceil(shell.getBoundingClientRect().bottom)
  }
  return CHROME_TOP_FALLBACK
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Fixed 751×349 panels docked to the four corners (clamped on tiny viewports). */
function placeDefault() {
  const top = chromeBottom() + GAP
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = clamp(PANEL_W, MIN_W, Math.max(MIN_W, vw - GAP * 2))
  const h = clamp(PANEL_H, MIN_H, Math.max(MIN_H, vh - top - BOTTOM_CHIP - GAP))

  const qi = props.stackIndex % 4
  const col = qi % 2
  const row = Math.floor(qi / 2)

  const x = col === 0 ? GAP : Math.max(GAP, vw - w - GAP)
  const y = row === 0 ? top : Math.max(top, vh - BOTTOM_CHIP - h - GAP)

  panelSize.value = { w, h }
  panelPos.value = { x, y }
  userSized.value = false
}

watch(
  () => [props.stackIndex, props.openCount] as const,
  () => {
    if (!userSized.value) placeDefault()
  },
)

onMounted(() => {
  placeDefault()
  window.addEventListener('resize', onWinResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onWinResize)
})

function onWinResize() {
  if (userSized.value) return
  placeDefault()
}

function onDragStart(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  dragging.value = true
  dragOrigin = { mx: e.clientX, my: e.clientY, x: panelPos.value.x, y: panelPos.value.y }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  emit('focus')
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  userSized.value = true
  const vw = window.innerWidth
  const vh = window.innerHeight
  const top = chromeBottom()
  panelPos.value = {
    x: clamp(dragOrigin.x + (e.clientX - dragOrigin.mx), 8, vw - panelSize.value.w - 8),
    y: clamp(dragOrigin.y + (e.clientY - dragOrigin.my), top, vh - 80),
  }
}

function onDragEnd() {
  dragging.value = false
}

function onResizeStart(e: PointerEvent) {
  resizing.value = true
  userSized.value = true
  resizeOrigin = {
    mx: e.clientX,
    my: e.clientY,
    w: panelSize.value.w,
    h: panelSize.value.h,
    x: panelPos.value.x,
    y: panelPos.value.y,
    corner: corner.value,
  }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  emit('focus')
}

function onResizeMove(e: PointerEvent) {
  if (!resizing.value) return
  const dx = e.clientX - resizeOrigin.mx
  const dy = e.clientY - resizeOrigin.my
  const vw = window.innerWidth
  const vh = window.innerHeight
  const top = chromeBottom()
  const c = resizeOrigin.corner

  // Grow/shrink from the inner corner handle
  if (c === 'top-left' || c === 'bottom-left') {
    panelSize.value.w = clamp(resizeOrigin.w + dx, MIN_W, vw - resizeOrigin.x - 8)
  } else {
    const nextW = clamp(resizeOrigin.w - dx, MIN_W, resizeOrigin.x + resizeOrigin.w - 8)
    panelSize.value.w = nextW
    panelPos.value.x = resizeOrigin.x + (resizeOrigin.w - nextW)
  }

  if (c === 'top-left' || c === 'top-right') {
    panelSize.value.h = clamp(resizeOrigin.h + dy, MIN_H, vh - resizeOrigin.y - 8)
  } else {
    const nextH = clamp(resizeOrigin.h - dy, MIN_H, resizeOrigin.y + resizeOrigin.h - top)
    panelSize.value.h = nextH
    panelPos.value.y = resizeOrigin.y + (resizeOrigin.h - nextH)
  }
}

function onResizeEnd() {
  resizing.value = false
}

function onSelect(job: WorkbenchJob) {
  // Row click / hover edit → same as Resolve: open the operation (no side drawer)
  emit('resolve', job)
  emit('close')
}

function onAction(job: WorkbenchJob) {
  emit('resolve', job)
  emit('close')
}

function onOpenJob(job: WorkbenchJob) {
  // Emit navigate first — closing the panel unmounts this window and can drop the event
  emit('openJob', job)
  emit('close')
}

const zIndex = computed(() => {
  // Focused panel always on top; otherwise order of open list only for tie-break
  const base = 200 + props.stackIndex
  return props.focused ? base + 40 : base
})
const showWorkload = computed(() => props.tileId === 'workload')

const resizeCornerClass = computed(() => {
  switch (corner.value) {
    case 'top-left':
      return 'insight-resize--br'
    case 'top-right':
      return 'insight-resize--bl'
    case 'bottom-left':
      return 'insight-resize--tr'
    case 'bottom-right':
      return 'insight-resize--tl'
  }
})
</script>

<template>
  <div
    class="insight-panel pointer-events-auto absolute flex flex-col overflow-hidden rounded-[14px] border border-[#E4E7EC] bg-white shadow-[0_20px_56px_rgba(31,41,55,0.22)]"
    role="dialog"
    aria-modal="false"
    :aria-label="title"
    :class="{
      'insight-panel--dragging': dragging || resizing,
      'insight-panel--focused': focused,
    }"
    :style="{
      left: `${panelPos.x}px`,
      top: `${panelPos.y}px`,
      width: `${panelSize.w}px`,
      height: `${panelSize.h}px`,
      zIndex,
    }"
    @mousedown="emit('focus')"
    @click.stop
  >
    <header
      class="insight-drag relative flex shrink-0 cursor-grab items-start justify-between gap-3 border-b border-[#F3F4F6] px-4 py-3 active:cursor-grabbing"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >
      <div class="flex min-w-0 items-start gap-2">
        <GripVertical :size="16" class="mt-1 shrink-0 text-[#9CA3AF]" aria-hidden="true" />
        <div class="min-w-0">
          <h2 class="text-[16px] font-semibold tracking-tight text-[#1F2937]">{{ title }}</h2>
          <p class="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">{{ blurb }}</p>
        </div>
      </div>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#6B7280] hover:bg-[#F9FAFB]"
        aria-label="Close"
        @click="emit('close')"
      >
        <X :size="16" :stroke-width="1.75" />
      </button>
    </header>

    <div
      v-if="showWorkload"
      class="grid shrink-0 grid-cols-4 gap-2 border-b border-[#F3F4F6] bg-white px-4 py-2.5"
    >
      <div class="text-center">
        <div class="font-mono text-[15px] font-bold text-[#1F2937]">
          {{ workloadSummary(auth.seat).total }}
        </div>
        <div class="text-[10px] text-[#9CA3AF]">Total</div>
      </div>
      <div class="text-center">
        <div class="font-mono text-[15px] font-bold text-[#1F2937]">
          {{ workloadSummary(auth.seat).todo }}
        </div>
        <div class="text-[10px] text-[#9CA3AF]">Tasks</div>
      </div>
      <div class="text-center">
        <div class="font-mono text-[15px] font-bold text-[#1F2937]">
          {{ workloadSummary(auth.seat).approvals }}
        </div>
        <div class="text-[10px] text-[#9CA3AF]">Approvals</div>
      </div>
      <div class="text-center">
        <div class="font-mono text-[15px] font-bold text-[#DC2626]">
          {{ workloadSummary(auth.seat).high }}
        </div>
        <div class="text-[10px] text-[#9CA3AF]">High</div>
      </div>
    </div>

    <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ExceptionDeskTable
        class="min-h-0 flex-1"
        :jobs="jobs"
        title="Jobs"
        :subtitle="`${jobs.length} rows`"
        embedded
        @select="onSelect"
        @action="onAction"
        @open-job="onOpenJob"
        @toast="(msg, kind) => emit('toast', msg, kind)"
      />
    </div>

    <footer
      class="relative flex shrink-0 items-center justify-between gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-4 py-2 text-[11px] text-[#9CA3AF]"
    >
      <span>Drag · Esc closes focused</span>
      <span class="font-mono text-[10px]">
        {{ Math.round(panelSize.w) }}×{{ Math.round(panelSize.h) }}
      </span>
    </footer>

    <button
      type="button"
      class="insight-resize"
      :class="resizeCornerClass"
      title="Resize panel"
      aria-label="Resize panel"
      @pointerdown="onResizeStart"
      @pointermove="onResizeMove"
      @pointerup="onResizeEnd"
      @pointercancel="onResizeEnd"
    >
      <Scaling :size="14" :stroke-width="2" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.insight-panel--dragging {
  user-select: none;
}
.insight-panel--focused {
  box-shadow:
    0 20px 56px rgba(31, 41, 55, 0.22),
    0 0 0 1px color-mix(in srgb, #14b8a6 35%, transparent);
}

.insight-resize {
  position: absolute;
  z-index: 5;
  display: flex;
  height: 1.75rem;
  width: 1.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, #14b8a6 40%, #e4e7ec);
  border-radius: 0.5rem;
  background: #fff;
  color: #0f766e;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.12);
}
.insight-resize:hover,
.insight-resize:focus-visible {
  background: #e6f9f6;
}
.insight-resize--br {
  right: 0.5rem;
  bottom: 0.5rem;
  cursor: nwse-resize;
}
.insight-resize--bl {
  left: 0.5rem;
  bottom: 0.5rem;
  cursor: nesw-resize;
}
.insight-resize--tr {
  right: 0.5rem;
  top: 0.5rem;
  cursor: nesw-resize;
}
.insight-resize--tl {
  left: 0.5rem;
  top: 0.5rem;
  cursor: nwse-resize;
}
</style>
