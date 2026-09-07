<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ExternalLink, BarChart3 } from '@lucide/vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import {
  getBiDashboardList,
  primaryBoardForSeat,
  type BiDashboardVO,
} from '@/lib/biDashboardApi'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

defineProps<{
  free?: boolean
  clickable?: boolean
}>()

const auth = useAuthStore()
const tenant = useTenantStore()

const loading = ref(true)
const error = ref<string | null>(null)
const boards = ref<BiDashboardVO[]>([])
const selectedId = ref<string | null>(null)

const selected = computed(
  () => boards.value.find((b) => b.id === selectedId.value) ?? boards.value[0] ?? null,
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const list = await getBiDashboardList({
      tenantId: tenant.tenant.tenantId,
      branchId: tenant.activeBranchId,
      showAll: auth.seat === 'admin',
      seat: auth.seat,
    })
    boards.value = list
    const primary = primaryBoardForSeat(list, auth.seat)
    selectedId.value = primary?.id ?? list[0]?.id ?? null
    if (!list.length) {
      error.value = 'No BI boards for this tenant / seat (provisioning empty)'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'BI list failed'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [auth.seat, tenant.activeBranchId], load)
</script>

<template>
  <OsTile
    title="Legacy BI analysis"
    :subtitle="selected?.name ?? 'Metabase embed · tenant-scoped'"
    size="wide"
    accent="calm"
    :free="free"
    :clickable="false"
  >
    <div class="flex h-full min-h-0 flex-col gap-2">
      <div v-if="boards.length > 1" class="flex flex-wrap gap-1">
        <button
          v-for="b in boards"
          :key="b.id"
          type="button"
          class="rounded-md border px-2 py-0.5 text-[10px] font-semibold"
          :class="
            selectedId === b.id
              ? 'border-primary bg-primary-tint text-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          "
          @click.stop="selectedId = b.id"
        >
          {{ b.name.split('·')[0]?.trim() ?? b.name }}
        </button>
      </div>

      <div
        v-if="loading"
        class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[11px] text-muted-foreground"
      >
        Loading BI dashboards…
      </div>

      <div
        v-else-if="error"
        class="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 text-center"
      >
        <BarChart3 :size="18" class="text-amber-700" />
        <p class="text-[11px] font-medium text-amber-900">{{ error }}</p>
      </div>

      <div
        v-else
        class="relative flex min-h-[140px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-slate-50"
      >
        <!-- Mock frame: real build uses <iframe :src="selected.url" /> -->
        <div class="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <BarChart3 :size="22" class="text-primary" />
          <p class="text-[12px] font-bold text-foreground">{{ selected?.name }}</p>
          <p class="max-w-sm text-[10px] leading-relaxed text-muted-foreground">
            Seam: GET /bi/dashboard/list → signed Metabase embed URL. JWT signed in BFF
            (<code class="font-mono">bi.secretKey</code> never in Vue). iframe loads
            <span class="font-mono">/embed/dashboard/{'{jwt}'}</span>.
          </p>
          <p class="font-mono text-[9px] text-slate-400 break-all">
            {{ selected?.url?.slice(0, 96) }}…
          </p>
        </div>
        <a
          v-if="selected?.url && !selected.url.startsWith('about:')"
          :href="selected.url"
          target="_blank"
          rel="noopener"
          class="absolute right-2 top-2 flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open
          <ExternalLink :size="11" />
        </a>
      </div>
    </div>
  </OsTile>
</template>
