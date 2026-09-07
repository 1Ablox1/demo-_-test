<script setup lang="ts">
import type { OrchestrationKpi } from '@/lib/orchestrationKpis'

defineProps<{
  kpis: OrchestrationKpi[]
}>()
</script>

<template>
  <div class="orch-kpi-strip">
    <div v-for="k in kpis" :key="k.id" class="orch-kpi-card">
      <div class="orch-kpi-card__value">
        <span class="font-mono text-[22px] font-bold tracking-tight text-slate-900">{{
          k.value
        }}</span>
        <span class="text-[13px] font-medium text-slate-500">{{ k.label }}</span>
      </div>
      <p
        class="mt-2 text-[11px] font-medium"
        :class="{
          'text-emerald-600': k.tone === 'up',
          'text-amber-600': k.tone === 'warn',
          'text-slate-500': k.tone === 'neutral',
        }"
      >
        {{ k.trend }}
      </p>
    </div>
  </div>
</template>
