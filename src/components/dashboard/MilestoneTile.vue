<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { milestoneCounts, tasksForTile, type GlobalMilestone } from '@/data/dashboardMetrics'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore, type TileKind } from '@/stores/dashboard'

const props = defineProps<{
  milestone: GlobalMilestone
  tileId: TileKind
  free?: boolean
  draggable?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{ dragStart: [e: PointerEvent] }>()

const auth = useAuthStore()
const dash = useDashboardStore()

const count = computed(() => milestoneCounts(auth.seat)[props.milestone])
const peek = computed(() => tasksForTile(auth.seat, props.tileId)[0] ?? null)

const stageHint: Record<GlobalMilestone, string> = {
  Quote: 'Quote stage',
  Booking: 'Booking stage',
  Docs: 'Docs & checks',
  Charges: 'Charges stage',
  Invoice: 'Invoice stage',
}
</script>

<template>
  <OsTile
    :title="milestone"
    :subtitle="stageHint[milestone]"
    size="sm"
    :accent="count > 0 ? 'warn' : 'calm'"
    :pulse="count > 1"
    :free="free"
    :draggable="draggable"
    :clickable="clickable"
    @click="dash.openDrawer(tileId)"
    @drag-start="emit('dragStart', $event)"
  >
    <div class="flex flex-1 flex-col justify-end gap-1">
      <div class="font-mono text-[28px] font-bold leading-none tracking-tight text-foreground">
        {{ count }}
      </div>
      <p v-if="peek" class="truncate font-mono text-[9px] text-muted-foreground">
        {{ peek.jobNo }} · {{ peek.route }}
      </p>
      <p v-else class="text-[10px] text-muted-foreground">jobs here</p>
    </div>
    <template #footer>
      <span class="flex items-center gap-0.5 text-[10px] font-medium text-primary">
        Focus jobs
        <ArrowRight :size="10" :stroke-width="2" aria-hidden="true" />
      </span>
    </template>
  </OsTile>
</template>
