<script setup lang="ts">
import { ArrowRight, ArrowLeftRight } from '@lucide/vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { useDashboardStore } from '@/stores/dashboard'

defineProps<{
  free?: boolean
  draggable?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{ dragStart: [e: PointerEvent] }>()

const dash = useDashboardStore()

const handoffs = [
  { from: 'Sales quote', to: 'Ops booking', count: 2, state: 'ready' },
  { from: 'Ops docs', to: 'Finance charges', count: 1, state: 'blocked' },
  { from: 'Finance approve', to: 'Invoice issue', count: 1, state: 'ready' },
]
</script>

<template>
  <OsTile
    title="Next steps"
    subtitle="Who picks up the job next"
    size="md"
    :accent="handoffs.some((h) => h.state === 'blocked') ? 'warn' : 'default'"
    :pulse="handoffs.some((h) => h.state === 'blocked')"
    :free="free"
    :draggable="draggable"
    :clickable="clickable"
    @click="dash.openDrawer('handoff')"
    @drag-start="emit('dragStart', $event)"
  >
    <ul class="space-y-2">
      <li
        v-for="(h, i) in handoffs"
        :key="i"
        class="flex items-center gap-2 text-[11px]"
      >
        <ArrowLeftRight :size="12" :stroke-width="1.75" class="shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1 truncate text-muted-foreground">
          {{ h.from }}
          <ArrowRight :size="10" class="mx-0.5 inline text-primary" />
          {{ h.to }}
        </span>
        <span
          class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
          :class="h.state === 'blocked' ? 'bg-amber-100 text-amber-900' : 'bg-primary-tint text-primary'"
        >
          {{ h.count }}
        </span>
      </li>
    </ul>
  </OsTile>
</template>
