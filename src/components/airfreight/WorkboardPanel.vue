<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { WorkboardJob } from '@/api/types'

defineProps<{
  jobs: WorkboardJob[]
}>()

const emit = defineEmits<{
  selectJob: [job: WorkboardJob]
}>()

const { t } = useI18n()

function statusColor(status?: string) {
  if (!status) return '#6B7280'
  const s = status.toLowerCase()
  if (s.includes('exception') || s.includes('customs')) return '#DC2626'
  if (s.includes('approval') || s.includes('invoice') || s.includes('pending')) return '#D97706'
  if (s.includes('transit') || s.includes('deliver')) return '#059669'
  if (s.includes('book') || s.includes('document')) return '#CA8A04'
  return '#6B7280'
}
</script>

<template>
  <aside
    class="sticky top-[68px] w-[232px] shrink-0 self-start overflow-hidden rounded-[10px] border border-border bg-white"
  >
    <div class="flex items-center justify-between border-b border-border px-3.5 py-2.5">
      <span class="text-xs font-semibold">✈ {{ t('myTasks.workboard') }}</span>
      <span class="rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{{ jobs.length }}</span>
    </div>
    <button
      v-for="(job, i) in jobs"
      :key="job.id"
      type="button"
      class="flex w-full items-center justify-between px-3.5 py-2 text-left transition hover:bg-zinc-50"
      :class="i < jobs.length - 1 ? 'border-b border-zinc-50' : ''"
      @click="emit('selectJob', job)"
    >
      <div>
        <div class="text-xs font-medium">#{{ job.shipmentId }}</div>
        <div class="mt-0.5 text-[11px] text-muted-foreground">{{ job.route ?? '—' }}</div>
      </div>
      <span
        class="rounded px-1.5 py-0.5 text-[11px] font-medium"
        :style="{
          color: statusColor(job.status ?? job.label),
          backgroundColor: statusColor(job.status ?? job.label) + '1A',
        }"
      >
        {{ job.status ?? job.label }}
      </span>
    </button>
  </aside>
</template>
