<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { LayoutGrid, Shuffle, LayoutTemplate } from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer.vue'
import DashboardGrid from '@/components/dashboard/DashboardGrid.vue'
import TileInsightPanel from '@/components/dashboard/TileInsightPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore, type LayoutStyle } from '@/stores/dashboard'

const auth = useAuthStore()
const dash = useDashboardStore()
const fitOpen = ref(false)

function applyFit(style: LayoutStyle) {
  dash.setLayoutStyle(style)
  fitOpen.value = false
  dash.arrangeMode = true
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (dash.drawerOpen) dash.closeAllDrawers()
    fitOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  dash.arrangeMode = true
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  dash.arrangeMode = false
})
</script>

<template>
  <AppShell>
    <div class="os-bi-studio min-h-[calc(100vh-7rem)]">
      <main class="mx-auto max-w-[1280px] px-6 py-6">
        <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="os-micro-label text-slate-400">Admin · BI builder</p>
            <h1 class="text-[20px] font-bold tracking-tight text-slate-100">Workbench (BI)</h1>
            <p class="mt-1 max-w-xl text-[13px] text-slate-400">
              Arrange the Operational & BI blocks for {{ auth.seatLabel }}.
              Live layout appears on Dashboard under Needs You.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="os-bi-btn"
              :class="dash.arrangeMode ? 'os-bi-btn--active' : ''"
              @click="dash.arrangeMode = !dash.arrangeMode"
            >
              {{ dash.arrangeMode ? 'Move on' : 'Move off' }}
            </button>
            <div class="relative">
              <button type="button" class="os-bi-btn" @click="fitOpen = !fitOpen">
                <Shuffle :size="14" />
                Auto-fit
              </button>
              <div v-if="fitOpen" class="os-bi-dropdown">
                <button type="button" class="os-bi-dropdown__item" @click="applyFit('neat')">
                  <LayoutTemplate :size="14" class="text-teal-400" />
                  Neat pack
                </button>
                <button type="button" class="os-bi-dropdown__item" @click="applyFit('scatter')">
                  <Shuffle :size="14" class="text-amber-400" />
                  Scatter
                </button>
              </div>
            </div>
            <button type="button" class="os-bi-btn os-bi-btn--primary" @click="dash.customizerOpen = true">
              <LayoutGrid :size="14" />
              Edit blocks
            </button>
          </div>
        </header>

        <DashboardGrid />
      </main>
    </div>
    <TileInsightPanel />
    <DashboardCustomizer />
  </AppShell>
</template>
