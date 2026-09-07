<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GridLayout } from 'grid-layout-plus'
import type { LayoutItem } from 'grid-layout-plus'
import ExceptionSignalsTile from '@/components/dashboard/ExceptionSignalsTile.vue'
import HandoffTile from '@/components/dashboard/HandoffTile.vue'
import MilestoneTile from '@/components/dashboard/MilestoneTile.vue'
import QueueTile from '@/components/dashboard/QueueTile.vue'
import WorkloadTile from '@/components/dashboard/WorkloadTile.vue'
import BiMilestonesTile from '@/components/dashboard/BiMilestonesTile.vue'
import BiUninvoicedTile from '@/components/dashboard/BiUninvoicedTile.vue'
import BiPendingQuotesTile from '@/components/dashboard/BiPendingQuotesTile.vue'
import BiLegacyEmbedTile from '@/components/dashboard/BiLegacyEmbedTile.vue'
import { useDashboardStore, type TileKind } from '@/stores/dashboard'

const dash = useDashboardStore()

/** Local layout so the grid can animate mid-drag, then we save. */
const layout = ref<LayoutItem[]>(dash.gridLayout.map((i) => ({ ...i })))

const visibleIds = computed(() => new Set(dash.visibleTiles.map((t) => t.id)))
const tilesClickable = computed(() => !dash.arrangeMode)

function syncFromStore() {
  layout.value = dash.gridLayout.map((i) => ({ ...i }))
}

watch(
  () =>
    [
      dash.visibleTiles.map((t) => `${t.id}:${t.x}:${t.y}:${t.w}:${t.h}:${t.visible}`).join('|'),
      dash.arrangeMode,
    ] as const,
  () => {
    if (!dash.draggingId) syncFromStore()
  },
)

watch(
  () => dash.arrangeMode,
  (on) => {
    if (on) dash.closeAllDrawers()
  },
)

function onLayoutUpdated(next: LayoutItem[]) {
  layout.value = next.map((i) => ({ ...i }))
  dash.applyGridLayout(next)
}

function onMove(i: string | number) {
  dash.draggingId = String(i) as TileKind
  dash.closeAllDrawers()
}

function onMoved() {
  dash.armClickGuard(500)
  // Keep guard active slightly longer than the synthetic click after drop
  requestAnimationFrame(() => {
    dash.draggingId = null
  })
}

function show(id: TileKind) {
  return visibleIds.value.has(id)
}
</script>

<template>
  <div class="os-smart-grid overflow-hidden rounded-[12px] border border-[#E4E7EC] bg-white p-3">
    <GridLayout
      v-if="layout.length"
      v-model:layout="layout"
      :col-num="12"
      :row-height="56"
      :margin="[10, 10]"
      :is-draggable="dash.arrangeMode"
      :is-resizable="false"
      vertical-compact
      use-css-transforms
      :use-style-cursor="true"
      class="os-vgl"
      @layout-updated="onLayoutUpdated"
      @move="onMove"
      @moved="onMoved"
      @resize="onMove"
      @resized="onMoved"
    >
      <template #item="{ item }">
        <div
          class="os-grid-item h-full w-full"
          :class="[
            dash.draggingId === item.i ? 'os-grid-item--active' : '',
            dash.arrangeMode ? 'os-grid-item--arrange' : '',
          ]"
        >
          <BiLegacyEmbedTile
            v-if="item.i === 'bi-legacy-embed' && show('bi-legacy-embed')"
            free
          />
          <BiMilestonesTile
            v-else-if="item.i === 'bi-milestones' && show('bi-milestones')"
            free
            :clickable="tilesClickable"
          />
          <BiUninvoicedTile
            v-else-if="item.i === 'bi-uninvoiced' && show('bi-uninvoiced')"
            free
            :clickable="tilesClickable"
          />
          <BiPendingQuotesTile
            v-else-if="item.i === 'bi-pending-quotes' && show('bi-pending-quotes')"
            free
            :clickable="tilesClickable"
          />
          <WorkloadTile
            v-else-if="item.i === 'workload' && show('workload')"
            free
            :clickable="tilesClickable"
          />
          <ExceptionSignalsTile
            v-else-if="item.i === 'exceptions' && show('exceptions')"
            free
            :clickable="tilesClickable"
          />
          <MilestoneTile
            v-else-if="item.i === 'milestone-quote' && show('milestone-quote')"
            free
            :clickable="tilesClickable"
            milestone="Quote"
            tile-id="milestone-quote"
          />
          <MilestoneTile
            v-else-if="item.i === 'milestone-booking' && show('milestone-booking')"
            free
            :clickable="tilesClickable"
            milestone="Booking"
            tile-id="milestone-booking"
          />
          <MilestoneTile
            v-else-if="item.i === 'milestone-docs' && show('milestone-docs')"
            free
            :clickable="tilesClickable"
            milestone="Docs"
            tile-id="milestone-docs"
          />
          <MilestoneTile
            v-else-if="item.i === 'milestone-charges' && show('milestone-charges')"
            free
            :clickable="tilesClickable"
            milestone="Charges"
            tile-id="milestone-charges"
          />
          <MilestoneTile
            v-else-if="item.i === 'milestone-invoice' && show('milestone-invoice')"
            free
            :clickable="tilesClickable"
            milestone="Invoice"
            tile-id="milestone-invoice"
          />
          <QueueTile
            v-else-if="item.i === 'queue-todo' && show('queue-todo')"
            free
            :clickable="tilesClickable"
            tab="todo"
            tile-id="queue-todo"
            title="My tasks"
            raci-hint="Things for you to do"
          />
          <QueueTile
            v-else-if="item.i === 'queue-approvals' && show('queue-approvals')"
            free
            :clickable="tilesClickable"
            tab="approvals"
            tile-id="queue-approvals"
            title="To approve"
            raci-hint="Waiting for your OK"
          />
          <QueueTile
            v-else-if="item.i === 'queue-following' && show('queue-following')"
            free
            :clickable="tilesClickable"
            tab="following"
            tile-id="queue-following"
            title="Watching"
            raci-hint="Keep an eye on these"
          />
          <HandoffTile
            v-else-if="item.i === 'handoff' && show('handoff')"
            free
            :clickable="tilesClickable"
          />
        </div>
      </template>
    </GridLayout>

    <p
      v-else
      class="flex min-h-[200px] items-center justify-center text-[13px] text-muted-foreground"
    >
      No blocks shown — open Edit blocks to turn some on.
    </p>
  </div>
</template>

<style scoped>
.os-smart-grid {
  min-height: 0;
}

.os-vgl :deep(.vgl-layout) {
  --vgl-placeholder-bg: #14b8a6;
  --vgl-placeholder-opacity: 16%;
  --vgl-item-dragging-opacity: 96%;
  min-height: 0 !important;
}

.os-vgl :deep(.vgl-item) {
  transition: box-shadow 0.15s ease;
}

.os-vgl :deep(.vgl-item--dragging) {
  z-index: 30;
  box-shadow: 0 12px 28px rgba(26, 35, 46, 0.14);
}

.os-vgl :deep(.vgl-item--placeholder) {
  background: color-mix(in srgb, #14b8a6 14%, transparent) !important;
  border: 1px dashed color-mix(in srgb, #14b8a6 50%, #e4e7ec);
  border-radius: 10px;
  opacity: 1;
}

.os-grid-item {
  height: 100%;
  width: 100%;
}

.os-grid-item--arrange {
  cursor: grab;
}

.os-grid-item--arrange:active {
  cursor: grabbing;
}

.os-grid-item :deep(.os-tile) {
  height: 100%;
  width: 100%;
  box-shadow: none;
}

.os-grid-item--active :deep(.os-tile) {
  border-color: color-mix(in srgb, #14b8a6 55%, #e4e7ec);
}
</style>
