<script setup lang="ts">
import { Plane } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { WorkboardJob } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { formatJobNo } from '@/lib/jobIdentity'

const props = defineProps<{
  jobs: WorkboardJob[]
  jobNoFor?: (job: WorkboardJob) => string
}>()

const emit = defineEmits<{
  selectJob: [job: WorkboardJob]
}>()

const { t } = useI18n()

function displayNo(job: WorkboardJob) {
  return props.jobNoFor?.(job) ?? formatJobNo('air_export', job.shipmentId)
}

function statusVariant(status?: string): 'critical' | 'high' | 'normal' | 'pack' {
  if (!status) return 'pack'
  const s = status.toLowerCase()
  if (s.includes('exception') || s.includes('customs')) return 'critical'
  if (
    s.includes('approval') ||
    s.includes('invoice') ||
    s.includes('pending') ||
    s.includes('variance')
  )
    return 'high'
  if (s.includes('transit') || s.includes('deliver') || s.includes('posted')) return 'normal'
  return 'pack'
}
</script>

<template>
  <aside
    class="sticky top-[60px] w-[220px] shrink-0 self-start overflow-hidden rounded-lg border border-border bg-card"
  >
    <div class="flex items-center justify-between border-b border-border px-3 py-2">
      <span class="flex items-center gap-1.5 text-[11px] font-semibold">
        <Plane :size="12" :stroke-width="1.75" class="text-primary" aria-hidden="true" />
        {{ t('myTasks.workboard') }}
      </span>
      <Badge variant="secondary" class="h-5 rounded-md px-1.5 text-[10px]">{{ jobs.length }}</Badge>
    </div>
    <button
      v-for="(job, i) in jobs"
      :key="job.id"
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition hover:bg-muted/50"
      :class="i < jobs.length - 1 ? 'border-b border-border/60' : ''"
      @click="emit('selectJob', job)"
    >
      <div class="min-w-0">
        <div class="font-mono text-[11px] font-semibold">{{ displayNo(job) }}</div>
        <div class="truncate text-[10px] text-muted-foreground">{{ job.route ?? '—' }}</div>
      </div>
      <Badge
        :variant="statusVariant(job.status ?? job.label)"
        class="h-5 shrink-0 rounded-md px-1.5 text-[9px]"
      >
        {{ job.status ?? job.label }}
      </Badge>
    </button>
  </aside>
</template>
