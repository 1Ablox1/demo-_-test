<script setup lang="ts">
import type { ComplianceLight, JobContext } from '@/api/types'

defineProps<{
  job: JobContext
}>()

function pillClass(state: ComplianceLight) {
  if (state === 'ok') return 'border-emerald-200 bg-emerald-100 text-emerald-900'
  if (state === 'warn') return 'border-amber-200 bg-amber-100/80 text-amber-900'
  return 'border-zinc-200 bg-zinc-100 text-zinc-600'
}

function pillIcon(state: ComplianceLight) {
  if (state === 'ok') return '✓'
  if (state === 'warn') return '⚠'
  return '·'
}
</script>

<template>
  <div
    class="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-white px-4 py-2.5"
  >
    <span class="mr-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      Compliance
    </span>
    <div
      v-for="item in [
        { label: 'Customs', state: job.compliance.customs },
        { label: 'Documents', state: job.compliance.documents },
        { label: 'Invoice', state: job.compliance.invoice },
      ]"
      :key="item.label"
      class="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
      :class="pillClass(item.state)"
    >
      <span class="text-[11px]">{{ pillIcon(item.state) }}</span>
      <span class="text-[11px] font-medium">{{ item.label }}</span>
    </div>
    <div class="flex-1" />
    <span class="text-[10px] font-medium text-muted-foreground">
      {{ job.summary.customer }} · {{ job.summary.route }}
    </span>
    <span class="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-teal-900">
      {{ job.pack }}
    </span>
  </div>
</template>
