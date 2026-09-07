<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Settings2 } from '@lucide/vue'
import AppShell from '@/components/AppShell.vue'
import BookingIcon from '@/components/icons/BookingIcon.vue'
import DashboardGrid from '@/components/dashboard/DashboardGrid.vue'
import TileInsightPanel from '@/components/dashboard/TileInsightPanel.vue'
import BranchContextChip from '@/components/tenant/BranchContextChip.vue'
import OsToast from '@/components/ui/OsToast.vue'
import type { WorkbenchJob } from '@/data/workbench'
import { routeForNewBooking } from '@/lib/osWorkbenchApi'
import { routeForExceptionResolve, resolveShipmentIdForException } from '@/lib/resolveException'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore, type TileKind } from '@/stores/dashboard'
import { useFreightStore } from '@/stores/freight'
import { useShellJobStore } from '@/stores/shellJob'
import { jobNoToId } from '@/lib/lob'
import { airFromLobCode } from '@/lib/airWorkspace'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const dash = useDashboardStore()
const freight = useFreightStore()
const jobStore = useShellJobStore()

const toastRef = ref<{ show: (msg: string, kind?: 'success' | 'info' | 'warn') => void } | null>(null)

function showToast(msg: string, kind?: 'success' | 'info' | 'warn') {
  toastRef.value?.show(msg, kind)
}

function knownJobIds() {
  return Object.keys(jobStore.JOBS)
}

/** Open Jobs workspace for a desk / block-table row (Job No link / double-click). */
function openJob(job: WorkbenchJob) {
  dash.closeAllDrawers()

  const id =
    resolveShipmentIdForException(job, freight.shipments, knownJobIds()) ||
    jobNoToId(job.jobNo?.trim() ?? '') ||
    knownJobIds()[0]
  if (!id) return

  const ship = freight.shipments.find((s) => s.id === id)
  const air =
    (ship ? airFromLobCode(ship.lob) : null) ||
    (job.lobPrefix === 'AE' || job.lobPrefix === 'AI' ? job.lobPrefix : undefined)

  void router.push({
    name: 'job-context',
    params: { shipmentId: id },
    query: air ? { lob: air } : {},
  })
}

/** Resolve → jump straight into the operation (no side drawer). */
function onResolveJob(job: WorkbenchJob) {
  dash.closeAllDrawers()
  const target = routeForExceptionResolve(job, freight.shipments, knownJobIds())
  if (!target) {
    showToast('No matching job file for this exception', 'warn')
    return
  }
  void router.push(target)
}

function goCustomize() {
  void router.push({ name: 'bi-workbench' })
}

function startBooking() {
  const target = routeForNewBooking('needs-you')
  void router.push({ name: target.name, query: { ...target.query } })
}

/** Deep link /my-tasks → open matching BI block table. */
function applyRouteDeskIntent() {
  const q = String(route.query.desk ?? route.query.focus ?? '').toLowerCase()
  let tile: TileKind | null = null
  if (q === 'approvals' || q === 'approve') tile = 'queue-approvals'
  else if (q === 'watching' || q === 'following') tile = 'queue-following'
  else if (q === 'alerts' || q === 'alert') tile = 'exceptions'
  else if (q === 'tasks' || q === 'todo' || route.hash === '#needs-you') tile = 'queue-todo'
  if (tile) dash.openDrawer(tile)
}

watch(
  () => [route.query.desk, route.query.focus, route.hash] as const,
  () => applyRouteDeskIntent(),
  { immediate: true },
)

onMounted(() => {
  dash.arrangeMode = false
  applyRouteDeskIntent()
})

onUnmounted(() => {
  dash.closeAllDrawers()
})
</script>

<template>
  <AppShell>
    <main class="mx-auto w-full max-w-[1280px] px-6 py-6">
      <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            CargoWare OS · Home
          </p>
          <h1 class="mt-0.5 text-[20px] font-bold tracking-tight text-foreground">Dashboard</h1>
          <p class="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Operational &amp; BI blocks for {{ auth.seatLabel }}. Click a block to open its job table.
          </p>
          <div class="mt-2">
            <BranchContextChip />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            @click="goCustomize"
          >
            <Settings2 :size="14" />
            Customize in Workbench
          </button>
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-bold text-white shadow-sm"
            @click="startBooking"
          >
            <BookingIcon :size="16" tone="light" />
            New booking
          </button>
        </div>
      </header>

      <section aria-label="Operational and BI">
        <div class="mb-3">
          <h2 class="text-[13px] font-bold text-foreground">Operational &amp; BI</h2>
          <p class="text-[11px] text-muted-foreground">
            Click any block to open its job table. Arrange layout in Workbench.
          </p>
        </div>
        <DashboardGrid />
      </section>
    </main>

    <TileInsightPanel @resolve="onResolveJob" @open-job="openJob" @toast="showToast" />
    <OsToast ref="toastRef" />
  </AppShell>
</template>
