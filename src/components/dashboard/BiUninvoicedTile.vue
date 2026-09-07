<script setup lang="ts">
import { computed } from 'vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { milestoneCounts } from '@/data/dashboardMetrics'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

defineProps<{
  free?: boolean
  clickable?: boolean
}>()

const auth = useAuthStore()
const dash = useDashboardStore()
const milestones = computed(() => milestoneCounts(auth.seat))
</script>

<template>
  <OsTile
    title="Uninvoiced charges"
    subtitle="Money waiting to bill"
    size="md"
    accent="warn"
    :free="free"
    :clickable="clickable"
    @click="dash.openDrawer('bi-uninvoiced')"
  >
    <p class="font-mono text-[22px] font-bold text-foreground">AUD 284,120</p>
    <p class="mt-1 text-[11px] text-muted-foreground">
      {{ milestones.Charges }} jobs awaiting invoice
    </p>
    <div class="mt-3">
      <span class="os-badge os-badge--amber">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" />
        3 overdue
      </span>
    </div>
  </OsTile>
</template>
