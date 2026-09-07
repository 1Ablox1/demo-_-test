<script setup lang="ts">
import type { JobContext } from '@/api/types'

const props = defineProps<{
  job: JobContext
}>()

const isWarnStatus = () => {
  const s = props.job.summary.status.toLowerCase()
  return s.includes('hold') || s.includes('gate') || s.includes('block') || s.includes('clearance')
}
</script>

<template>
  <!-- Essentials only — money & cargo details live in chunks below -->
  <div
    class="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border bg-card shadow-sm sm:grid-cols-3 lg:grid-cols-5"
  >
    <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
      <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        Route
      </div>
      <div class="font-mono text-[13px] font-semibold text-foreground">{{ job.summary.route }}</div>
    </div>

    <div
      class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0"
      :class="isWarnStatus() ? 'bg-amber-50/80 dark:bg-amber-950/20' : ''"
    >
      <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        Status
      </div>
      <div
        class="text-[13px]"
        :class="isWarnStatus() ? 'font-bold text-amber-800 dark:text-amber-200' : 'font-semibold text-foreground'"
      >
        {{ job.summary.status }}
      </div>
    </div>

    <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
      <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        Customer
      </div>
      <div class="truncate text-[13px] font-semibold text-foreground" :title="job.summary.customer">
        {{ job.summary.customer }}
      </div>
    </div>

    <div class="border-b border-border px-3.5 py-2.5 sm:border-r lg:border-b-0">
      <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        ETD · ETA
      </div>
      <div class="font-mono text-[12px] font-semibold text-foreground">
        {{ job.ops.etdLabel.replace(/^ETD\s*/i, '') }}
        ·
        {{ job.ops.etaLabel.replace(/^ETA\s*/i, '') }}
      </div>
    </div>

    <div class="px-3.5 py-2.5 col-span-2 sm:col-span-1">
      <div class="mb-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        Cutoff
      </div>
      <div class="truncate text-[12px] font-semibold text-foreground" :title="job.ops.slaLabel">
        {{ job.ops.slaLabel }}
      </div>
    </div>
  </div>
</template>
