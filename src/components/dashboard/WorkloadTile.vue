<script setup lang="ts">
import { computed } from 'vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { workloadSummary, tasksForTile } from '@/data/dashboardMetrics'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

defineProps<{
  free?: boolean
  draggable?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{ dragStart: [e: PointerEvent] }>()

const auth = useAuthStore()
const dash = useDashboardStore()

const summary = computed(() => workloadSummary(auth.seat))
const peeks = computed(() => tasksForTile(auth.seat, 'workload').slice(0, 3))

const bars = computed(() => [
  { label: 'My tasks', value: summary.value.todo, max: Math.max(summary.value.total, 1) },
  { label: 'To approve', value: summary.value.approvals, max: Math.max(summary.value.total, 1) },
  { label: 'Watching', value: summary.value.following, max: Math.max(summary.value.total, 1) },
])
</script>

<template>
  <OsTile
    title="My workload"
    :subtitle="`${auth.seatLabel} · ${summary.total} items · ${summary.high} high priority`"
    size="md"
    accent="calm"
    :free="free"
    :draggable="draggable"
    :clickable="clickable"
    @click="dash.openDrawer('workload')"
    @drag-start="emit('dragStart', $event)"
  >
    <div class="flex flex-1 flex-col gap-3">
      <div class="flex flex-wrap items-end gap-6">
        <div class="flex items-baseline gap-3">
          <span class="font-mono text-[36px] font-bold leading-none text-foreground">
            {{ summary.total }}
          </span>
          <span class="text-[12px] text-muted-foreground">need action</span>
        </div>
        <div class="flex min-w-[180px] flex-1 flex-col gap-2">
          <div v-for="b in bars" :key="b.label" class="space-y-0.5">
            <div class="flex justify-between text-[10px] text-muted-foreground">
              <span>{{ b.label }}</span>
              <span class="font-mono font-semibold text-foreground">{{ b.value }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all duration-500"
                :style="{ width: `${(b.value / b.max) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </div>
      <ul v-if="peeks.length" class="space-y-1 border-t border-border/70 pt-2">
        <li
          v-for="p in peeks"
          :key="p.id"
          class="flex items-center justify-between gap-2 text-[11px]"
        >
          <span class="min-w-0 truncate font-medium text-foreground">{{ p.title }}</span>
          <span class="shrink-0 font-mono text-[10px] text-muted-foreground">
            {{ p.jobNo }} · {{ p.route }}
          </span>
        </li>
      </ul>
    </div>
  </OsTile>
</template>
