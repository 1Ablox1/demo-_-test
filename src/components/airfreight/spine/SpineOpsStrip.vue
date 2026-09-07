<script setup lang="ts">
import { computed } from 'vue'
import type { JobContext } from '@/api/types'

const props = defineProps<{
  job: JobContext
}>()

const gpRaw = computed(() => {
  const raw = (props.job.ops.marginPct ?? '').replace('%', '').replace('→', '').trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
})

const gpAccent = computed<'green' | 'amber' | 'red'>(() => {
  if (gpRaw.value == null) return 'amber'
  if (gpRaw.value >= 18) return 'green'
  if (gpRaw.value >= 12) return 'amber'
  return 'red'
})

const gpClasses = computed(() => {
  const a = gpAccent.value
  if (a === 'green') return 'border-emerald-200 bg-emerald-100 text-emerald-900'
  if (a === 'amber') return 'border-amber-200 bg-amber-100/80 text-amber-900'
  return 'border-red-200 bg-red-100 text-red-900'
})
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-zinc-50">
    <div class="flex flex-wrap items-center gap-2 border-b border-border bg-white px-3 py-2.5">
      <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AWBs</span>
      <span
        v-for="[type, val] in [
          ['HAWB', job.ops.hawb],
          ['MAWB', job.ops.mawb],
        ]"
        :key="type"
        class="flex items-center gap-1.5 rounded-[5px] border border-border bg-zinc-100 px-2 py-1"
      >
        <span class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{{
          type
        }}</span>
        <span class="font-mono text-[12px] font-semibold" :class="val ? 'text-zinc-800' : 'text-zinc-400'">
          {{ val ?? '—' }}
        </span>
      </span>
    </div>

    <div class="grid grid-cols-4 border-b border-border">
      <div class="border-r border-border px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Carrier</div>
        <div class="text-[13px] font-semibold text-zinc-800">
          {{ job.ops.airline.replace(/ — .*/, '') }}
        </div>
      </div>
      <div class="border-r border-border px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pieces</div>
        <div class="font-mono text-[13px] font-semibold text-zinc-800">{{ job.ops.pieces }}</div>
      </div>
      <div class="border-r border-border px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gross Wt</div>
        <div class="font-mono text-[13px] font-semibold text-zinc-800">
          {{ job.ops.grossWeightKg.toLocaleString() }} kg
        </div>
      </div>
      <div class="px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Charg Wt</div>
        <div class="font-mono text-[13px] font-semibold text-zinc-800">
          {{ job.ops.chargeableWeightKg.toLocaleString() }} kg
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3">
      <div class="border-r border-border px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sell</div>
        <div class="font-mono text-[13px] font-semibold text-zinc-800">{{ job.ops.sellAmount }}</div>
      </div>
      <div class="border-r border-border px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</div>
        <div class="font-mono text-[13px] font-semibold text-zinc-800">
          {{ job.ops.costAmount.replace(' actual', '') }}
        </div>
      </div>
      <div class="px-3 py-2.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GP</div>
        <span
          class="inline-flex items-center rounded-[5px] border px-1.5 py-0.5 text-[11px] font-bold"
          :class="gpClasses"
        >
          GP {{ gpRaw != null ? `${gpRaw.toFixed(1)}%` : job.ops.marginPct }}
        </span>
      </div>
    </div>
  </div>
</template>
