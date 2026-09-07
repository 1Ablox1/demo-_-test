<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { LOB_CATALOG } from '@/lib/lob'
import { tasksForSeat, type TaskWithSignal } from '@/data/dashboardMetrics'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore, type TileKind } from '@/stores/dashboard'
import type { TaskTab } from '@/data/fixtures'

const props = defineProps<{
  tab: TaskTab
  tileId: TileKind
  title: string
  raciHint: string
  free?: boolean
  draggable?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{ dragStart: [e: PointerEvent] }>()

const auth = useAuthStore()
const dash = useDashboardStore()

const tasks = computed(() => tasksForSeat(auth.seat, props.tab))
const top = computed(() => tasks.value.slice(0, 3))
const expanded = computed(() => dash.expandedTileId === props.tileId)

function onTileClick() {
  dash.openDrawer(props.tileId)
}

function urgencyDot(u: TaskWithSignal['urgency']) {
  if (u === 'high') return 'bg-warning'
  if (u === 'medium') return 'bg-brand-blue'
  return 'bg-muted-foreground/40'
}
</script>

<template>
  <OsTile
    :title="title"
    :subtitle="`${raciHint} · ${tasks.length} in queue`"
    size="md"
    :accent="tasks.some((t) => t.urgency === 'high') ? 'warn' : 'default'"
    :pulse="tasks.some((t) => t.urgency === 'high')"
    expandable
    :expanded="expanded"
    :free="free"
    :draggable="draggable"
    :clickable="clickable"
    @click="onTileClick"
    @expand="dash.toggleExpand(tileId)"
    @drag-start="emit('dragStart', $event)"
  >
    <ul class="space-y-2">
      <li
        v-for="row in top"
        :key="row.id"
        class="flex items-start gap-2 rounded-md border border-transparent px-1 py-0.5"
      >
        <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" :class="urgencyDot(row.urgency)" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12px] font-medium text-foreground">{{ row.title }}</div>
          <div class="truncate font-mono text-[10px] text-muted-foreground">
            {{ row.jobNo }} · {{ row.route }} · {{ LOB_CATALOG[row.lob].prefix }}
          </div>
        </div>
      </li>
      <li v-if="!top.length" class="text-[12px] text-muted-foreground">Queue clear</li>
    </ul>

    <div
      v-if="expanded && top.length"
      class="mt-2 space-y-1.5 border-t border-border/80 pt-2"
    >
      <p class="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        More details
      </p>
      <div
        v-for="row in top"
        :key="`${row.id}-sec`"
        class="rounded-md bg-muted/40 px-2 py-1.5"
      >
        <div class="font-mono text-[10px] font-semibold text-primary">{{ row.jobNo }}</div>
        <div
          v-for="f in row.secondary"
          :key="f.label"
          class="flex justify-between gap-2 text-[10px] text-muted-foreground"
        >
          <span>{{ f.label }}</span>
          <span class="truncate text-foreground">{{ f.value }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="flex items-center gap-0.5 text-[10px] font-medium text-primary">
        Focus jobs
        <ArrowRight :size="10" :stroke-width="2" aria-hidden="true" />
      </span>
    </template>
  </OsTile>
</template>
