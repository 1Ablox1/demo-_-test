<script setup lang="ts">
import { computed } from 'vue'
import OsTile from '@/components/dashboard/OsTile.vue'
import { GLOBAL_MILESTONES, milestoneCounts } from '@/data/dashboardMetrics'
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
    title="Cargo milestones"
    subtitle="Jobs by spine stage"
    size="md"
    accent="calm"
    :free="free"
    :clickable="clickable"
    @click="dash.openDrawer('bi-milestones')"
  >
    <ul class="space-y-0.5">
      <li
        v-for="m in GLOBAL_MILESTONES"
        :key="m"
        class="flex h-8 items-center justify-between rounded-md px-1.5 hover:bg-muted/50"
      >
        <span class="text-[12px] text-foreground">{{ m }}</span>
        <span class="font-mono text-[12px] font-bold text-primary">{{ milestones[m] }}</span>
      </li>
    </ul>
  </OsTile>
</template>
