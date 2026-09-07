<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Flame, Clock, AlertTriangle, GitCompare, TrendingUp } from '@lucide/vue'
import type { Component } from 'vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import {
  EXCEPTION_SIGNAL_META,
  signalCounts,
  type ExceptionSignal,
} from '@/data/dashboardMetrics'
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

const counts = computed(() => signalCounts(auth.seat))

const icons: Record<ExceptionSignal, Component> = {
  burn_down: Flame,
  time_up: Clock,
  early_warning: AlertTriangle,
  discrepancy: GitCompare,
  abnormal_pattern: TrendingUp,
}

const activeSignals = computed(() =>
  (Object.keys(counts.value) as ExceptionSignal[]).filter(
    (s) => counts.value[s] >= dash.signalSensitivity[s],
  ),
)

const totalActive = computed(() => activeSignals.value.reduce((n, s) => n + counts.value[s], 0))
</script>

<template>
  <OsTile
    title="Alert summary"
    subtitle="See what needs attention first"
    size="lg"
    :accent="totalActive > 0 ? 'critical' : 'calm'"
    :pulse="totalActive > 0"
    :clickable="clickable"
    :free="free"
    :draggable="draggable"
    @click="dash.openDrawer('exceptions')"
    @drag-start="emit('dragStart', $event)"
  >
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="signal in (Object.keys(EXCEPTION_SIGNAL_META) as ExceptionSignal[])"
        :key="signal"
        class="rounded-lg border px-2.5 py-2 transition"
        :class="
          counts[signal] >= dash.signalSensitivity[signal]
            ? 'border-warning/40 bg-amber-50/80'
            : 'border-border/60 bg-muted/30'
        "
      >
        <div class="flex items-center gap-1.5">
          <component
            :is="icons[signal]"
            :size="12"
            :stroke-width="1.75"
            class="shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span class="text-[10px] font-semibold text-foreground">
            {{ EXCEPTION_SIGNAL_META[signal].label }}
          </span>
        </div>
        <div class="mt-1 font-mono text-[18px] font-bold leading-none text-foreground">
          {{ counts[signal] }}
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{{ totalActive }} alerts for you</span>
        <span class="flex items-center gap-0.5 font-medium text-primary">
          Focus jobs
          <ArrowRight :size="11" :stroke-width="2" aria-hidden="true" />
        </span>
      </div>
    </template>
  </OsTile>
</template>
