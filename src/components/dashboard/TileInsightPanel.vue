<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import FocusInsightWindow from '@/components/dashboard/FocusInsightWindow.vue'
import type { DashboardTileKind } from '@/data/dashboardMetrics'
import type { WorkbenchJob } from '@/data/workbench'
import { useDashboardStore } from '@/stores/dashboard'

const emit = defineEmits<{
  resolve: [job: WorkbenchJob]
  openJob: [job: WorkbenchJob]
  toast: [message: string, kind?: 'success' | 'info' | 'warn']
}>()

const dash = useDashboardStore()

const openIds = computed(() => dash.openDrawerIds as DashboardTileKind[])
const focusedId = computed(() => dash.drawerTileId as DashboardTileKind | null)

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !dash.drawerOpen) return
  if (dash.drawerTileId) dash.closeDrawer(dash.drawerTileId)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="openIds.length"
      class="pointer-events-none fixed inset-0 z-[200]"
      aria-live="polite"
    >
      <TransitionGroup name="insight-stack">
        <FocusInsightWindow
          v-for="id in openIds"
          :key="id"
          class="pointer-events-auto"
          :tile-id="id"
          :stack-index="dash.slotForDrawer(id)"
          :open-count="openIds.length"
          :focused="id === focusedId"
          @close="dash.closeDrawer(id)"
          @focus="dash.focusDrawer(id)"
          @resolve="emit('resolve', $event)"
          @open-job="emit('openJob', $event)"
          @toast="(msg, kind) => emit('toast', msg, kind)"
        />
      </TransitionGroup>

      <div
        v-if="openIds.length > 1"
        class="pointer-events-auto absolute bottom-4 left-1/2 z-[260] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#E4E7EC] bg-white/95 px-3 py-1.5 text-[11px] text-[#6B7280] shadow-md backdrop-blur-sm"
      >
        <span class="font-semibold text-[#1F2937]">{{ openIds.length }} / 4 panels</span>
        <span class="text-[#D1D5DB]">·</span>
        <span>Esc closes focused</span>
        <button
          type="button"
          class="ml-1 rounded-md border border-[#E4E7EC] px-2 py-0.5 text-[10px] font-semibold text-[#0F766E] hover:bg-[#E6F9F6]"
          @click="dash.closeAllDrawers()"
        >
          Close all
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.insight-stack-enter-active,
.insight-stack-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.insight-stack-enter-from,
.insight-stack-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
