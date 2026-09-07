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
    title="Pending quotes"
    subtitle="Commercial offers open"
    size="md"
    accent="calm"
    :free="free"
    :clickable="clickable"
    @click="dash.openDrawer('bi-pending-quotes')"
  >
    <p class="font-mono text-[22px] font-bold text-foreground">{{ milestones.Quote }}</p>
    <p class="mt-1 text-[11px] text-muted-foreground">Offers awaiting convert</p>
    <div class="mt-3 space-y-1 text-[11px] text-muted-foreground">
      <div class="flex justify-between">
        <span>AE lanes</span>
        <span class="font-mono text-foreground">4</span>
      </div>
      <div class="flex justify-between">
        <span>AI lanes</span>
        <span class="font-mono text-foreground">3</span>
      </div>
    </div>
  </OsTile>
</template>
